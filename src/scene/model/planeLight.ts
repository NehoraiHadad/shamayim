//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import { ridgeLightSamples, smoothstep, type RidgeSample } from '../../world/ridgeLighting'
import { SHADING } from '../../world/livingLight'
import { groundAt as lineAt } from '../../world/sceneLight'
import { SCENE_W } from '../../world/sceneBox'
import { shadowRuns } from '../../world/shadowRuns'
import type { Plane, RGB, WorldState } from '../../world/types'
import { fractal } from '../paint/core'
import { landBoxKey, layerKey } from './keys'
import { nearGroundTone } from './landColour'
import { darken, labOf, lightness, mixRgb, rgbOf, rgbOfLab } from './tone'
import type { Face, PlaneLight, Pt, Rim, SceneBox, SnowCap, Wash } from './types'

type PlaneName = 'back' | 'far' | 'near'

/** How far toward the air's colour a plane at the visibility goes (the rest is the crest's own dark against the sky). */
const AERIAL = 0.88
/** Oklab lightness of the clear-day ridge anchor (`SKY_THEMES.clearDay.ridgeNear` `#2E3B4E`), used to scale ambient mood dimming. */
const DAY_RIDGE_L = 0.351
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

export interface LandVeil { rgb: RGB; alpha: number }

/** Ambient mood & wet-ground veil (`source-over` onto the light-free land form), continuous across day/twilight/night/rain. */
export function moodVeilOf(world: WorldState): LandVeil {
  const wet = world.ground.wet
  const raw = rgbOf(world.light.palette.ridgeNear)
  const rgb = wet > 0 ? darken(raw, 1 - 0.24 * wet, 1 + 0.2 * wet) : raw
  const ratio = clamp01(lightness(rgb) / DAY_RIDGE_L)
  const dim = clamp01(1 - ratio ** 2.2)
  return { rgb, alpha: clamp01(Math.max(dim, 0.86 * world.night.dark)) }
}

/** Exact `source-over` composition of aerial haze (`t`) over the ambient mood veil (`mood`). */
function veilOfHaze(world: WorldState, haze: RGB): (t: number) => LandVeil {
  const mood = moodVeilOf(world)
  return (t) => {
    const a = clamp01(t + mood.alpha * (1 - t))
    if (a <= 1e-5) return { rgb: haze, alpha: 0 }
    const m = mood.alpha * (1 - t)
    return {
      rgb: [(haze[0] * t + mood.rgb[0] * m) / a, (haze[1] * t + mood.rgb[1] * m) / a, (haze[2] * t + mood.rgb[2] * m) / a],
      alpha: a,
    }
  }
}

/** Applies a `source-over` veil onto a light-free land tone (matches Canvas 2D compositing of `light` over `form`). */
export function applyVeil(base: RGB, veil: LandVeil): RGB {
  const a = veil.alpha, inv = 1 - a
  return [base[0] * inv + veil.rgb[0] * a, base[1] * inv + veil.rgb[1] * a, base[2] * inv + veil.rgb[2] * a]
}

/**
 * The ground's tone at a distance (km): the place's living-land base tone carried through the scene's ambient mood,
 * wet-ground darkening and Koschmieder aerial perspective (`air.fade`) toward the air.
 */
export function toneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  return applyVeil(nearGroundTone(world), veilOfHaze(world, haze)(hazeAt(world, km)))
}

/**
 * Land-independent ambient ridge tone at distance `km` (palette + wet + aerial haze): used while the land is not
 * known yet (`loading.ts`) so loading mist and forming lines keep identical keys before and through arrival.
 */
export function ambientToneAt(world: WorldState, km: number, haze = hazeOf(world)): RGB {
  const wet = world.ground.wet
  const raw = rgbOf(world.light.palette.ridgeNear)
  const near = wet > 0 ? darken(raw, 1 - 0.24 * wet, 1 + 0.2 * wet) : raw
  return mixRgb(near, haze, hazeAt(world, km))
}

/** How far toward the air the ground at a distance (km) goes: `AERIAL · fade(km)²`. */
const hazeAt = (world: WorldState, km: number) => AERIAL * world.air.fade(km) ** 2

/** The source-over mood + aerial haze veil at distance `km` (shared by planes and outside ground). */
export function veilAt(world: WorldState, km: number, haze = hazeOf(world)): LandVeil {
  return veilOfHaze(world, haze)(hazeAt(world, km))
}

/** The most the air's share in a plane's tone changes a px across (reference width): a jump spreads over ≥ 1/this px. */
export const HAZE_SLOPE = 0.006

/**
 * The air's share along a crest, continuous across a jump in distance (a nearer hill taking over from a farther one):
 * no steeper than `HAZE_SLOPE` a px, whatever the air. The mean of the lowest and the highest curve within that slope
 * of the shares (two passes each way), so where the shares already change gently they are kept as they are, and a jump
 * turns over a stretch as wide as the jump is deep: a few px in a clear air, a hundred in a fog.
 */
export function hazeAlong(xs: readonly number[], shares: readonly number[], slope = HAZE_SLOPE): number[] {
  const n = shares.length
  const low = [...shares], high = [...shares]
  for (let i = 1; i < n; i++) {
    const d = slope * Math.abs(xs[i] - xs[i - 1])
    low[i] = Math.min(low[i], low[i - 1] + d)
    high[i] = Math.max(high[i], high[i - 1] - d)
  }
  for (let i = n - 2; i >= 0; i--) {
    const d = slope * Math.abs(xs[i + 1] - xs[i])
    low[i] = Math.min(low[i], low[i + 1] + d)
    high[i] = Math.max(high[i], high[i + 1] - d)
  }
  return low.map((v, i) => (v + high[i]) / 2)
}

/**
 * Aerial perspective for anything on the land (water, far towns): its own colour carried toward the air by the same rule
 * as the ground (`AERIAL · fade(km)²`, Koschmieder from the visibility), so everything at one distance fades alike.
 */
export function aerialFor(world: WorldState, haze = hazeOf(world)): (rgb: RGB, km: number) => RGB {
  const air = labOf(haze)
  return (rgb, km) => {
    const t = AERIAL * world.air.fade(km) ** 2
    const own = labOf(rgb)
    return rgbOfLab({ l: own.l + (air.l - own.l) * t, a: own.a + (air.a - own.a) * t, b: own.b + (air.b - own.b) * t })
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
export function planeLight(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, k: number, base = nearGroundTone(world)): PlaneLight {
  const { light } = world
  const { palette } = light
  const sx = box.width / SCENE_W
  const haze = hazeOf(world)

  // Aerial perspective along the crest, a stop every ~16 px, by each direction's distance smoothed over ~25 px, its air
  // no steeper across than `HAZE_SLOPE` (`hazeAlong`): where a nearer hill takes over from a farther one inside one plane,
  // the tone turns over a stretch, not at a seam, and the thicker the air the wider that stretch (a fog's is ~100 px).
  const kms = plane.hazeKm ?? plane.distanceKm
  const shares = hazeAlong(plane.points.map(([x]) => x), kms.map((km) => hazeAt(world, km)))
  const veilOf = veilOfHaze(world, haze)
  const every = Math.max(1, Math.round(plane.points.length / 24))
  const veil: [number, RGB, number][] = []
  const tones: [number, RGB][] = []
  plane.points.forEach(([x], i) => {
    if (i % every === 0 || i === plane.points.length - 1) {
      const v = veilOf(shares[i])
      veil.push([x * sx, v.rgb, v.alpha])
      tones.push([x * sx, applyVeil(base, v)])
    }
  })
  const tint = applyVeil(base, veilOf(hazeAt(world, median(plane.distanceKm))))
  const sky = rgbOf(palette.horizon)
  const lightTint = lightTintOf(world)
  const cap = Math.min(lightness(tint) + (name === 'near' ? 0.12 : 0.1), lightness(sky) - 0.05)
  const strength = clamp01(light.direct * 1.3)

  let shade: Wash[] = [], lit: Wash[] = [], rims: Rim[] = []
  const faces: Face[] = []
  // The living light: the bands come in with the direct share from nothing (no floor at their first minute).
  const fadeIn = smoothstep(SHADING[0] * 1.3, SHADING[1] * 0.5, strength)
  if (light.ray && fadeIn > 0) {
    const depth = DEPTH[name]
    // Every other crest point (~3.7 px apart) is enough for the bands and keeps a scrub frame cheap.
    const crest = plane.points.filter((_, i) => i % 2 === 0 || i === plane.points.length - 1)
    const samples = ridgeLightSamples(crest, { ray: light.ray, noonWeight: light.noonWeight, depth })
    const litTone = capped(tint, lightTint, 0.6, cap)
    // A plane behind the near ridge shows only where it rises over it: no band, no rim where it is hidden.
    const shows = samples.map((s) => name === 'near' || s.y < lineAt(world.terrain.near.points, s.x) - 0.5)
    lit = washes(samples, plane.points, (s, i) => (shows[i] ? s.amount : 0), sx, litTone, Math.min(0.9, 0.2 + 0.75 * strength) * fadeIn * k)
    // Shade: faces turned away from the light, and ground in the shadow of land toward it.
    const away = samples.map((s) => depth * Math.max(Math.max(0, -s.facing) * (1 - light.noonWeight) * 1.2,
      s.clearance < 0 ? 0.7 : 0))
    taper(samples, away)
    const shadeTone = mixRgb(darken(tint, 0.7), SKY_SHADE, 0.2)
    shade = washes(samples, plane.points, (_, i) => (shows[i] ? away[i] : 0), sx, shadeTone, 0.6 * strength * fadeIn * k)
    // The rim: the crest where it turns to the light; brighter within reach of a low sun (`rimX`).
    const rimTone = capped(tint, mixRgb(lightTint, [1, 1, 1], 0.2), 0.9, lightness(sky) - 0.03)
    const low = 1 - smoothstep(6, 15, light.altitude)
    // Five levels (it was three): a rim's alpha steps by under 0.13 as the light turns.
    const levels = [0.12, 0.2, 0.3, 0.4, 0.5]
    const runs: Pt[][][] = levels.map(() => [])
    let current: { level: number; pts: Pt[] } | null = null
    for (const [i, s] of samples.entries()) {
      if (!shows[i]) {
        if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
        current = null
        continue
      }
      const near = light.rimX !== null && Math.abs(s.x - light.rimX) < 70 ? low : 0
      const a = s.clearance > 0 ? Math.min(0.6, Math.max(0, s.facing) * 0.7 * strength * fadeIn * (1 + near)) * k : 0
      const level = a < 0.06 ? -1 : levels.findLastIndex((l) => a >= l * 0.8)
      if (current && current.level !== level) { if (current.pts.length >= 2) runs[current.level].push(current.pts); current = null }
      if (level >= 0) {
        current ??= { level: Math.max(0, level), pts: [] }
        current.pts.push([s.x * sx, s.y + 0.35])
      }
    }
    if (current && current.pts.length >= 2) runs[current.level].push(current.pts)
    rims = runs.flatMap((paths, i) => paths.map((points) => ({ points, rgb: rimTone, alpha: levels[i] })))
    // The ridge's shadow on the floor, the near plane only (the far plane's floor is hidden behind it).
    if (name === 'near' && light.shares.sun > 0.002) {
      for (const [a, b] of shadowRuns(crest, light.ray).filter(([a, b]) => b - a >= MIN_RUN)) {
        const xs = Array.from({ length: Math.round((b - a) / 3) + 1 }, (_, i) => a + i * 3)
        const top = xs.map((x): Pt => [x * sx, lineAt(plane.points, x) - 2])
        const bottom = [...xs].reverse().map((x): Pt => [x * sx, lineAt(plane.points, x) + FLOOR_DEPTH])
        faces.push({ points: [...top, ...bottom], rgb: SKY_SHADE, alpha: 0.3 * light.shares.sun * fadeIn, soft: 4 })
      }
    }
  }

  const snow = snowOf(world, box, name, light.ray ? strength : 0, lightTint)
  // Under snow the crest catches the light on the snow: its rim is the snow's, lit.
  if (snow) rims = rims.map((rim) => ({ ...rim, rgb: mixRgb(snow.rgb, [1, 1, 1], 0.4) }))
  // The side the small things of the ground catch the light on: toward the light's side, eased through straight ahead,
  // coming in with the direct share.
  const sideOf = Math.max(-1, Math.min(1, light.dir.across / 0.25))
  const lift = fadeIn > 0 && Math.abs(sideOf) > 0.02
    ? { dx: sideOf, dy: -0.7, rgb: capped(tint, mixRgb(lightTint, [1, 1, 1], 0.35), 0.85, cap + 0.06),
      alpha: Math.min(0.6, 0.12 + 0.6 * strength) * fadeIn * Math.min(1, Math.abs(sideOf) * 2) * k }
    : null
  // The key names everything these pixels come from: the light, the air, the ground, the night, the snow, the land and
  // the box (hashing the inputs, not the shapes made from them, keeps a scrub frame cheap).
  const key = layerKey('plane.light', name, world.keys.terrain, world.keys.light, world.keys.air, world.keys.ground,
    world.keys.night, world.keys.land, world.snow, landBoxKey(box))
  return { key, blend: 'source-over', tint, tones, veil, shade, lit, faces, rims, snow, lift }
}

/** Snow above the snow line (`terrain.snowEdge`), its lower edge ragged by seeded displacement (no filter). */
function snowOf(world: WorldState, box: SceneBox, name: PlaneName, strength: number, lightTint: RGB): SnowCap | null {
  const { snow, terrain } = world
  if (!snow || name === 'back' || !terrain.snowEdge) return null
  const edge = terrain.snowEdge(name, snow.lineM)
  // An edge above the crest is a ray with no snow; one under the box is snow down to the foot.
  const crest = terrain[name].points
  if (!edge.length || edge.every(([x, y]) => y < lineAt(crest, x) - 1)) return null
  const sx = box.width / SCENE_W
  const seed = hashId(`${world.place.id}:${name}:snow`)
  const ragged = edge.map(([x, y]): Pt => [x * sx, Math.min(box.landHeight + 6, y) + (fractal(seed, x, y, 0.05, 0.05, 2) - 0.5) * 9])
  // Snow fades with distance like the land under it (aerial perspective), so a far snowy ridge stands apart from a near one.
  return { edge: ragged, ...snowLook(world, median(terrain[name].distanceKm), strength, lightTint) }
}

/** Lying snow's colour and cover at a distance (km), lit as the land: by the light's colour and share, hazed by the air. */
function snowLook(world: WorldState, km: number, strength: number, lightTint: RGB): { rgb: RGB; alpha: number } {
  const { light } = world
  const white: RGB = [0.95, 0.96, 0.98]
  // The sky's tone with no direct light, the light's as it comes (the moon's only once it is strong): eased, never a switch.
  const sky = mixRgb(white, rgbOf(light.palette.mid), 0.35 + 0.4 * world.night.dark)
  const lit = mixRgb(white, lightTint, 0.2 + 0.2 * (1 - strength))
  const rgb = mixRgb(sky, lit, light.source === 'moon' ? smoothstep(0.1, 0.3, strength) : smoothstep(0, 0.12, strength))
  return { rgb: mixRgb(rgb, hazeOf(world), AERIAL * world.air.fade(km) ** 2), alpha: 0.55 + 0.4 * (world.snow?.amount ?? 0) }
}

/**
 * Lying snow on any ground at a distance (km) as the planes take it (C9): the same light and haze, so the place's own
 * ground seen from outside whitens with the ridge under it. Null with no snow lying.
 */
export function snowOnGround(world: WorldState, km: number): { rgb: RGB; alpha: number } | null {
  if (!world.snow) return null
  const { light } = world
  return snowLook(world, km, light.ray ? clamp01(light.direct * 1.3) : 0, lightTintOf(world))
}

/** The light's colour on the land: the sun's (after air mass) through the sky's horizon, warmer toward a low sun. */
function lightTintOf(world: WorldState): RGB {
  const { light } = world
  const warm = 1 - smoothstep(4, 18, light.altitude)
  return mixRgb(mixRgb(rgbOf(light.palette.horizon), light.colour, 0.55), rgbOf(light.palette.accent), warm * 0.4 * smoothstep(0, 0.1, light.shares.sun))
}
