import { hashId } from '../../data/landmarks/hash'
import { ridgeLightSamples, smoothstep, type RidgeSample } from '../../world/ridgeLighting'
import { groundAt as lineAt } from '../../world/sceneLight'
import { SCENE_W } from '../../world/sceneBox'
import { shadowRuns } from '../../world/shadowRuns'
import type { Plane, RGB, WorldState } from '../../world/types'
import { fractal } from '../paint/core'
import { landBoxKey, layerKey } from './keys'
import { darken, labOf, lightness, mixRgb, rgbOf, rgbOfLab } from './tone'
import type { Face, PlaneLight, Pt, Rim, SceneBox, SnowCap, Wash } from './types'

type PlaneName = 'back' | 'far' | 'near'

/** How far toward the air's colour a plane at the visibility goes (the rest is the crest's own dark against the sky). */
const AERIAL = 0.88
/** Depth (px) of the lit and shaded bands below a crest. */
const DEPTH: Record<PlaneName, number> = { back: 7, far: 9, near: 16 }
/** Floor shadow: how deep below the ground surface it reads, and the narrowest run drawn (px). */
const FLOOR_DEPTH = 16
const MIN_RUN = 12
/** The colour of shade lit only by the sky (as the SVG's floor shadow, #1A2458). */
const SKY_SHADE: RGB = [0x1a / 255, 0x24 / 255, 0x58 / 255]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The air's colour a plane fades toward with distance: the sky at the horizon (night-aware, from the light's palette),
 * tinted by the air itself by day (dust tan, rain grey-blue).
 */
export function hazeOf(world: WorldState): RGB {
  const { palette } = world.light
  const sky = mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.45)
  return mixRgb(sky, world.air.haze, 0.3 * (1 - world.night.dark))
}

/**
 * The ground's tone at a distance (km): the near ridge's own dark (the light's palette) carried toward the air by aerial
 * perspective (`air.fade`, Koschmieder from the visibility), darker and a little richer when the ground is wet.
 */
export function toneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  return toneFor(world, haze)(km)
}

/** `toneAt` for one world and air, its colours converted once (a plane asks for a tone every ~16 px). */
function toneFor(world: WorldState, haze: RGB): (km: number) => RGB {
  const base = labOf(rgbOf(world.light.palette.ridgeNear)), air = labOf(haze)
  const wet = world.ground.wet, k = 1 - 0.16 * wet, chroma = 1 + 0.2 * wet
  return (km) => {
    const t = AERIAL * world.air.fade(km) ** 2
    return rgbOfLab({ l: (base.l + (air.l - base.l) * t) * k, a: (base.a + (air.a - base.a) * t) * chroma,
      b: (base.b + (air.b - base.b) * t) * chroma })
  }
}

/** Mixes `from` toward `to` by `t`, but no lighter than `cap` (Oklab lightness), so a lit crest keeps clear of the sky. */
function capped(from: RGB, to: RGB, t: number, cap: number): RGB {
  let mixed = mixRgb(from, to, t)
  if (lightness(mixed) <= cap) return mixed
  let lo = 0, hi = t
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    if (lightness(mixRgb(from, to, mid)) <= cap) lo = mid
    else hi = mid
  }
  mixed = mixRgb(from, to, lo)
  return mixed
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

/**
 * Runs of consecutive samples where `depth` is over a hair, as washes hanging from the crest. The samples are every
 * other crest point (`full`); each run takes the crest points between them too (depth halfway), so a wash's top is the
 * plane's own edge and it needs no clip.
 */
function washes(samples: RidgeSample[], full: readonly Pt[], depthOf: (s: RidgeSample, i: number) => number, sx: number,
  rgb: RGB, alpha: number): Wash[] {
  const out: Wash[] = []
  if (alpha <= 0.01) return out
  let top: Pt[] = [], depth: number[] = []
  const flush = () => {
    if (top.length >= 2 && Math.max(...depth) > 0.6) out.push({ top, depth, rgb, alpha })
    top = []; depth = []
  }
  let last = -1, lastDepth = 0
  for (const [i, s] of samples.entries()) {
    const d = depthOf(s, i)
    const index = Math.min(full.length - 1, i * 2)
    if (d > 0.15) {
      if (top.length && index - last === 2) {
        const [mx, my] = full[last + 1]
        top.push([mx * sx, my]); depth.push((d + lastDepth) / 2)
      }
      top.push([full[index][0] * sx, full[index][1]]); depth.push(d)
      last = index; lastDepth = d
    } else flush()
  }
  flush()
  return out
}

/** Caps each depth by its distance from the band's ends, so a band tapers to a point (as the SVG's lit bands do). */
function taper(samples: RidgeSample[], depth: number[]) {
  const pass = (order: number[]) => {
    let reach = 0
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      depth[i] = Math.min(depth[i], reach)
      const next = order[k + 1]
      reach = next === undefined ? 0 : depth[i] + 0.25 * Math.abs(samples[next].x - samples[i].x)
    }
  }
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

/**
 * The light part of a plane (§1d's scrub split): every colour of the plane after light, haze and wet ground, and the
 * shapes the light makes on it. Rules, for every place alike:
 * - **tone** by each direction's distance along the crest (`toneAt`, aerial perspective), darker when the ground is wet;
 * - **lit and shaded faces** below the crest from the true light (`light.ray`, the sun's or the moon's side and height,
 *   `ridgeLightSamples`): faces turned to it take a band of the light's colour (no lighter than the sky behind allows),
 *   faces turned away and ground in another ridge's shadow sink toward sky-lit shade; strength by `light.direct`;
 * - **the floor shadow**: ground in the shadow of the land toward a low sun (`shadowRuns`);
 * - **the crest rim** where the crest turns to the light, brighter toward a low sun;
 * - **snow** above the snow line (`terrain.snowEdge`), lit like the land;
 * - **lift**: the side the small things of the ground (scrub, gully lips) catch the light on.
 */
export function planeLight(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, k: number): PlaneLight {
  const { light } = world
  const { palette } = light
  const sx = box.width / SCENE_W
  const haze = hazeOf(world)
  const tone = toneFor(world, haze)

  // Aerial perspective along the crest, a stop every ~16 px, by each direction's distance smoothed over ~25 px: where a
  // nearer hill takes over from a farther one inside one plane, the tone turns over a stretch, not at a seam.
  const kms = plane.hazeKm ?? plane.distanceKm
  const every = Math.max(1, Math.round(plane.points.length / 24))
  const tones: [number, RGB][] = plane.points.flatMap(([x], i): [number, RGB][] =>
    i % every === 0 || i === plane.points.length - 1 ? [[x * sx, tone(kms[i])]] : [])
  const tint = tone(median(plane.distanceKm))
  // The light's colour on the land: the sun's (after air mass) through the sky's horizon, warmer toward a low sun.
  const sky = rgbOf(palette.horizon)
  const warm = 1 - smoothstep(4, 18, light.altitude)
  const lightTint = mixRgb(mixRgb(sky, light.colour, 0.55), rgbOf(palette.accent), light.source === 'sun' ? warm * 0.4 : 0)
  const cap = Math.min(lightness(tint) + (name === 'near' ? 0.12 : 0.1), lightness(sky) - 0.05)
  const strength = clamp01(light.direct * 1.3)

  let shade: Wash[] = [], lit: Wash[] = [], rims: Rim[] = []
  const faces: Face[] = []
  if (light.ray && strength > 0.02) {
    const depth = DEPTH[name]
    // Every other crest point (~3.7 px apart) is enough for the bands and keeps a scrub frame cheap.
    const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
    const samples = ridgeLightSamples(crest, { ray: light.ray, noonWeight: light.noonWeight, depth })
    const litTone = capped(tint, lightTint, 0.6, cap)
    // A plane behind the near ridge shows only where it rises over it: no band, no rim where it is hidden.
    const shows = samples.map((s) => name === 'near' || s.y < lineAt(world.terrain.near.points, s.x) - 0.5)
    lit = washes(samples, plane.points, (s, i) => (shows[i] ? s.amount : 0), sx, litTone, Math.min(0.9, 0.2 + 0.75 * strength) * k)
    // Shade: faces turned away from the light, and ground in the shadow of land toward it.
    const away = samples.map((s) => depth * Math.max(Math.max(0, -s.facing) * (1 - light.noonWeight) * 1.2,
      s.clearance < 0 ? 0.7 : 0))
    taper(samples, away)
    const shadeTone = mixRgb(darken(tint, 0.7), SKY_SHADE, 0.2)
    shade = washes(samples, plane.points, (_, i) => (shows[i] ? away[i] : 0), sx, shadeTone, 0.6 * strength * k)
    // The rim: the crest where it turns to the light; brighter within reach of a low sun (`rimX`).
    const rimTone = capped(tint, mixRgb(lightTint, [1, 1, 1], 0.2), 0.9, lightness(sky) - 0.03)
    const low = 1 - smoothstep(6, 15, light.altitude)
    const levels = [0.18, 0.32, 0.5]
    const runs: Pt[][][] = levels.map(() => [])
    let current: { level: number; pts: Pt[] } | null = null
    for (const [i, s] of samples.entries()) {
      if (!shows[i]) {
        if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
        current = null
        continue
      }
      const near = light.rimX !== null && Math.abs(s.x - light.rimX) < 70 ? low : 0
      const a = s.clearance > 0 ? Math.min(0.6, Math.max(0, s.facing) * 0.7 * strength * (1 + near)) * k : 0
      const level = a < 0.08 ? -1 : levels.findLastIndex((l) => a >= l * 0.8)
      if (current && current.level !== level) { if (current.pts.length >= 2) runs[current.level].push(current.pts); current = null }
      if (level >= 0) {
        current ??= { level: Math.max(0, level), pts: [] }
        current.pts.push([s.x * sx, s.y + 0.35])
      }
    }
    if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
    rims = runs.flatMap((paths, i) => paths.map((points) => ({ points, rgb: rimTone, alpha: levels[i] })))
    // The ridge's shadow on the floor, the near plane only (the far plane's floor is hidden behind it).
    if (name === 'near' && light.source === 'sun') {
      for (const [a, b] of shadowRuns(crest, light.ray).filter(([a, b]) => b - a >= MIN_RUN)) {
        const xs = Array.from({ length: Math.round((b - a) / 3) + 1 }, (_, i) => a + i * 3)
        const top = xs.map((x): Pt => [x * sx, lineAt(plane.points, x) - 2])
        const bottom = [...xs].reverse().map((x): Pt => [x * sx, lineAt(plane.points, x) + FLOOR_DEPTH])
        faces.push({ points: [...top, ...bottom], rgb: SKY_SHADE, alpha: 0.3 * light.direct, soft: 4 })
      }
    }
  }

  const snow = snowOf(world, box, name, light.ray ? strength : 0, lightTint)
  // Under snow the crest catches the light on the snow: its rim is the snow's, lit.
  if (snow) rims = rims.map((rim) => ({ ...rim, rgb: mixRgb(snow.rgb, [1, 1, 1], 0.4) }))
  const lift = light.side && strength > 0.06
    ? { dx: light.side === 'left' ? -1 : 1, dy: -0.7, rgb: capped(tint, mixRgb(lightTint, [1, 1, 1], 0.35), 0.85, cap + 0.06),
      alpha: Math.min(0.6, 0.12 + 0.6 * strength) * k }
    : null
  // The key names everything these pixels come from: the light, the air, the ground, the night, the snow, the land and
  // the box (hashing the inputs, not the shapes made from them, keeps a scrub frame cheap).
  const key = layerKey('plane.light', name, world.keys.terrain, world.keys.light, world.keys.air, world.keys.ground,
    world.keys.night, world.snow, landBoxKey(box))
  return { key, blend: 'overlay', tint, tones, shade, lit, faces, rims, snow, lift }
}

/** Snow above the snow line (`terrain.snowEdge`), its lower edge ragged by seeded displacement (no filter). */
function snowOf(world: WorldState, box: SceneBox, name: PlaneName, strength: number, lightTint: RGB): SnowCap | null {
  const { snow, terrain, light } = world
  if (!snow || name === 'back' || !terrain.snowEdge) return null
  const edge = terrain.snowEdge(name, snow.lineM)
  // An edge above the crest is a ray with no snow; one under the box is snow down to the foot.
  const crest = terrain[name].points
  if (!edge.length || edge.every(([x, y]) => y < lineAt(crest, x) - 1)) return null
  const sx = box.width / SCENE_W
  const seed = hashId(`${world.place.id}:${name}:snow`)
  const ragged = edge.map(([x, y]): Pt => [x * sx, Math.min(box.landHeight + 6, y) + (fractal(seed, x, y, 0.05, 0.05, 2) - 0.5) * 9])
  const white: RGB = [0.95, 0.96, 0.98]
  const rgb = light.source === 'sky' || light.source === 'moon' && strength < 0.2
    ? mixRgb(white, rgbOf(light.palette.mid), 0.35 + 0.4 * world.night.dark)
    : mixRgb(white, lightTint, 0.2 + 0.2 * (1 - strength))
  // Snow fades with distance like the land under it (aerial perspective), so a far snowy ridge stands apart from a near one.
  const km = median(terrain[name].distanceKm)
  return { edge: ragged, rgb: mixRgb(rgb, hazeOf(world), AERIAL * world.air.fade(km) ** 2), alpha: 0.55 + 0.4 * snow.amount }
}
