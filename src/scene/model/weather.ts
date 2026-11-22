//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { RainCell, WorldState } from '../../world/types'
import { fallingOf } from './falling'
import { landBoxKey, layerKey, skyBoxKey } from './keys'
import { aerialFor, hazeOf } from './planeLight'
import { coversOf, skyAt, skyGeom, type SkyGeom } from './sky'
import { mistLayers } from './mist'
import { rayLayersOf } from './rays'
import { mixRgb } from './tone'
import type { Box, FallingCloud, FallMark, LayerDesc, LayerOf, Plume, Precip, Pt, RGB, SceneBox, Sheen,
  ShaftDesc } from './types'

export { mistiness, mistLayers } from './mist'

/*
 * The weather (stage C7, docs/design/CANVAS-SCENE-PLAN.md §4), from the one world state:
 * - rain and snow fall only from the banks the world makes rain or snow (`world.rain.cells`, `world.snowfall.cells`), at
 *   their true azimuths: a curtain under each far bank down to the horizon, falling streaks (or flakes) inside it, and
 *   round the eye the near rain under the raining banks overhead; all slanted by the one wind and drifting with the cloud
 *   layer that makes them. When none of those banks is in view, a heavy bank with its curtain stands cut by the frame's
 *   edge on the side the rain truly lies (the true-scene plan's edge mark);
 * - the ground's sheen after rain (`world.ground.wet`), the darkening being the planes' own (C2);
 * - mist and fog lying level in the low ground, the valleys first, from `world.air.mist` (`mist.ts`);
 * - dust grains (`air.dustWeight`) and wind streaks in a gale;
 * - crepuscular rays from a low sun behind broken cloud;
 * - chimney smoke and cooling-tower steam from the marks that have them, carried by the wind.
 * Animation is laid at composite time (`anim.ts`): falling tiles moved as patterns, drifting tiles, strips of frames.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]
const q = (v: number, step: number) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))
/** A tile's size in CSS px that is a whole number of device px (a pattern repeats on its device size). */
const whole = (px: number, dpr: number) => Math.max(1, Math.round(px * dpr)) / dpr

/**
 * A weather layer of the land that is all light (mist, smoke, sheen: their colours follow the hour): its form is only its
 * place, so a scrub repaints the light canvas alone, as the water's and the far towns' (§1d).
 */
const lightPart = (key: string, tint: RGB) => ({ key, blend: 'source-over' as const, tint, faces: [] })

/** A bank this high on the dome (deg) or higher rains round the eye (near rain); lower ones are far curtains. */
export const NEAR_ALT = 30

/** What falls, from which banks, with its intensity and opacity as the rate eases in. */
interface PrecipState { precip: Precip; cells: RainCell[]; strength: number; slant: number; opacity: number }

export function precipOf(world: WorldState, precip: Precip = world.rain?.cells.length ? 'rain' : 'snow'): PrecipState | null {
  if (precip === 'rain' && world.rain?.cells.length) {
    const { cells, slant, rateMmH } = world.rain
    return { precip, cells, slant, strength: clamp01(0.15 + Math.sqrt(rateMmH) / 2.6), opacity: smoothstep(0, 0.2, rateMmH) }
  }
  if (precip === 'snow' && world.snowfall?.cells.length) {
    const { cells, slant, amount } = world.snowfall
    return { precip, cells, slant, strength: clamp01(0.2 + amount), opacity: smoothstep(0, 0.2, amount) }
  }
  return null
}

/** The copy of a band x (every `period`) nearest `ref`. */
const nearest = (x: number, ref: number, period: number) => x + Math.round((ref - x) / period) * period

/** Whether a bank stands in the view (its nearest copy round the band overlaps the figure). */
export function inView(geom: SkyGeom, box: SceneBox, b: { x: number; w: number }) {
  const mid = geom.left + box.width / 2
  return Math.abs(nearest(b.x, mid, geom.period) - mid) < box.width / 2 + b.w * 0.3
}

/** The curtain under a far bank: from inside its base to the ground at the horizon, the foot carried downwind. */
function shaftOf(world: WorldState, geom: SkyGeom, b: FallingCloud, p: PrecipState, horizonSky: RGB): ShaftDesc {
  const top = b.y - b.h * 0.2
  const bottom = geom.horizon + 2
  const lean = Math.tan(p.slant) * (bottom - top) * (p.precip === 'snow' ? 0.6 : 1)
  const far = world.air.fade(b.distanceKm)
  const rgb = p.precip === 'rain' ? mixRgb(mixRgb(b.shade, b.body, 0.3), horizonSky, 0.25 + 0.5 * far)
    : mixRgb(mixRgb(b.body, WHITE, 0.25 * (1 - world.night.dark)), horizonSky, 0.3 + 0.5 * far)
  const alpha = (p.precip === 'rain' ? 0.3 + 0.38 * p.strength : 0.22 + 0.3 * p.strength) * (1 - 0.65 * far) * b.alpha * p.opacity
  return { id: b.id, x: b.x, top, bottom, w: b.w * 0.62, lean, rgb, alpha, seed: b.seed }
}

/** The falling tile: rain streaks along the slant, or snow flakes, seeded, wrapping across the tile's edges. */
function tileMarks(seed: string, p: PrecipState, w: number, h: number, near: boolean): FallMark[] {
  const r = seeded(hashId(seed))
  const area = w * h
  const count = Math.round((p.precip === 'rain' ? (near ? 14 : 22) : (near ? 9 : 20)) * area / 4096 * (0.45 + 0.55 * p.strength))
  return Array.from({ length: count }, () => {
    const x = r() * w, y = r() * h, v = r()
    return p.precip === 'rain'
      ? { x, y, len: (near ? 9 : 4.5) + (near ? 9 : 4) * v, r: 0, alpha: 0.45 + 0.55 * r() }
      // Flakes: most small and dim (farther off), a few large and bright (close by).
      : { x, y, len: 0, r: (near ? 0.5 : 0.4) + (near ? 1.5 : 0.4) * v ** 3, alpha: 0.3 + 0.7 * v ** 1.5 * (0.6 + 0.4 * r()) }
  })
}

/** A column (or curtain) as a polygon: `w` wide at `top`, the same width at `bottom`, its foot `lean` px downwind. */
const column = (x: number, top: number, bottom: number, w: number, lean: number): Pt[] =>
  [[x - w / 2, top], [x + w / 2, top], [x + w / 2 + lean, bottom], [x - w / 2 + lean, bottom]]

/**
 * Rain or snow from the world's falling banks (sky): the far banks' curtains and the streaks falling in them, the near
 * rain under the banks overhead (sky and land), or the edge mark when no falling bank is in view.
 */
export function precipLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)):
  LayerDesc[] {
  return (['rain', 'snow'] as const).flatMap((phase) => {
    const p = precipOf(world, phase)
    return p ? precipLayersFor(world, box, geom, p) : []
  })
}

function precipLayersFor(world: WorldState, box: SceneBox, geom: SkyGeom, p: PrecipState):
  LayerDesc[] {
  const id = (base: string) => p.precip === 'snow' ? base + '.snow' : base
  const found = fallingOf(world, box, geom, p.precip)
  if (!found) return []
  const { cells: banks, z, speed } = found
  const out: LayerDesc[] = []
  const sky = skyAt(world, box)
  const horizonSky = sky(2)
  const dark = world.night.dark
  const drift = Math.abs(speed) > 0.01 ? { speed, period: geom.period } : {}
  const tilt = Math.tan(p.slant)
  const slantKey = q(p.slant, 0.01)

  const seen = banks.filter((f) => inView(geom, box, f))
  if (!seen.length) {
    const edge = edgeMark(world, box, geom, banks, p, horizonSky)
    return edge ? [{ ...edge, id: id(edge.id) }] : []
  }

  // Far curtains, under the banks low on the dome, on the band (they drift with their layer).
  const far = banks.filter((f) => f.altitude < NEAR_ALT)
  if (far.length) {
    const shafts = far.map((f) => shaftOf(world, geom, f, p, horizonSky))
    const top = Math.max(0, Math.floor(Math.min(...shafts.map((s) => s.top)) - 2))
    const bottom = Math.min(box.skyHeight, Math.ceil(geom.horizon + 4))
    out.push({ kind: 'shafts', id: id('shafts'), surface: 'sky', z: z - 0.5, soft: true, precip: p.precip, shafts, period: geom.period,
      bounds: { x: 0, y: top, w: geom.period, h: Math.max(1, bottom - top) },
      animated: 'speed' in drift ? { mode: 'drift', ...drift } : undefined,
      key: layerKey('shafts', p.precip, skyBoxKey(box, true), geom.period, slantKey,
        shafts.map((s) => [s.id, q(s.x, 0.5), q(s.top, 0.5), q(s.w, 0.5), q(s.lean, 0.5), tone(s.rgb), q(s.alpha, 0.02)])) })
    // The streaks falling inside them: a small tile moved as a pattern over each curtain's core.
    const tw = whole(40, box.dpr), th = whole(56, box.dpr)
    const rgb = p.precip === 'rain' ? mixRgb(horizonSky, WHITE, 0.25 * (1 - dark)) : mixRgb(horizonSky, WHITE, 0.6 * (1 - 0.6 * dark))
    const fallV = p.precip === 'rain' ? 80 + 60 * p.strength : 10 + 6 * p.strength
    out.push({ kind: 'fall', id: id('fall.far'), surface: 'sky', z: z - 0.4, precip: p.precip, slant: tilt, rgb,
      marks: tileMarks(`${world.place.id}:fall.far:${p.precip}`, p, tw, th, false), bounds: { x: 0, y: 0, w: tw, h: th },
      animated: { mode: 'fall', ...drift, fall: { vx: fallV * tilt, vy: fallV,
        areas: shafts.flatMap((s) => [column(s.x, s.top + 4, s.bottom, s.w * 0.8, s.lean), column(s.x, s.top + 10, s.bottom, s.w * 0.45, s.lean)]),
        alphas: shafts.flatMap((s) => [Math.min(1, 1.2 * s.alpha), Math.min(1, 1.2 * s.alpha)]),
        ...(p.precip === 'snow' ? { sway: 1.5, swayPeriod: 4 } : {}) } },
      key: layerKey('fall.far', p.precip, skyBoxKey(box), tw, th, slantKey, q(p.strength, 0.05), tone(rgb)) })
  }

  // Near rain: under the banks overhead, in front of everything, from the bank's base down past the land.
  const near = seen.filter((f) => f.altitude >= NEAR_ALT)
  if (near.length) {
    const tw = whole(64, box.dpr), th = whole(96, box.dpr)
    const rgb = p.precip === 'rain' ? mixRgb(sky(20), WHITE, 0.45 * (1 - dark)) : mixRgb(sky(20), WHITE, 0.85 * (1 - 0.7 * dark))
    const fallV = p.precip === 'rain' ? 420 + 260 * p.strength : 30 + 16 * p.strength
    const marks = tileMarks(`${world.place.id}:fall.near:${p.precip}`, p, tw, th, true)
    const alphaOf = (s: number) => (p.precip === 'rain' ? 0.16 + 0.34 * p.strength : 0.4 + 0.45 * p.strength) * s * p.opacity
    const bottom = box.skyHeight + box.landHeight
    // Nested columns, each with its own marks (the compositor offsets the pattern per area): the rain thickens toward the
    // bank's middle and thins out to its edges and its top, with no line where it stops.
    const columns = near.flatMap((f) => {
      const top = f.y - f.h * 0.2
      const lean = tilt * (bottom - top) * 0.35
      return [[1.3, 0, 0.5], [1, 10, 0.55], [0.7, 22, 0.6], [0.42, 36, 0.6]].map(([k, dy, a]) =>
        ({ x: f.x, top: top + dy, w: f.w * k, lean, a: a * f.share }))
    })
    const fall = (surface: 'sky' | 'land') => {
      const dy = surface === 'land' ? box.landTop : 0
      const dx = surface === 'land' ? geom.left : 0
      return { vx: fallV * tilt, vy: fallV, areas: columns.map((c) => column(c.x - dx, c.top - dy, bottom - dy, c.w, c.lean)),
        alphas: columns.map((c) => alphaOf(c.a)), ...(p.precip === 'snow' ? { sway: 3, swayPeriod: 3.2 } : {}) }
    }
    const common = { kind: 'fall' as const, precip: p.precip, slant: tilt, rgb, marks, bounds: { x: 0, y: 0, w: tw, h: th } }
    const key = (id: string) => layerKey(id, p.precip, tw, th, slantKey, q(p.strength, 0.05), tone(rgb), box.dpr)
    out.push({ ...common, id: id('fall.near'), surface: 'sky', z: 11, animated: { mode: 'fall', ...drift, fall: fall('sky') }, key: key('fall.near') })
    out.push({ ...common, id: id('fall.land'), surface: 'land', z: 60, animated: { mode: 'fall', ...drift, fall: fall('land') }, key: key('fall.land') })
  }
  return out
}

/**
 * The edge mark (true-scene plan): it rains or snows, but none of the banks it falls from is in view. A heavy bank with
 * its curtain, cut by the frame's edge on the side the nearest of them truly lies, low over the horizon: the rain is
 * there, out of the frame. Static (it marks a direction, not a cloud's place on the band).
 */
function edgeMark(world: WorldState, box: SceneBox, geom: SkyGeom, banks: readonly FallingCloud[], p: PrecipState, horizonSky: RGB): LayerOf<'edge'> | null {
  const mid = geom.left + box.width / 2
  const nearestBank = banks.map((f) => ({ f, x: nearest(f.x, mid, geom.period) }))
    .sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0]
  if (!nearestBank) return null
  const side = nearestBank.x < mid ? 'left' : 'right'
  const b = nearestBank.f
  const w = Math.min(box.width * 0.36, Math.max(70, b.w * 0.9))
  const h = Math.max(18, Math.min(34, w * 0.3))
  // The bank stands clear over the land at that edge (the highest crest under it), its curtain falling behind the ridge.
  const sx = box.width / SCENE_W
  const xs = Array.from({ length: 9 }, (_, i) => (side === 'left' ? i : SCENE_W - i) * (w / sx / 8))
  const crest = Math.min(geom.horizon, ...[world.terrain.near.points, world.terrain.far.points].filter((pts) => pts.length)
    .flatMap((pts) => xs.map((x) => box.landTop + crestAt(pts, x))))
  const y = crest - 12 - 0.3 * h
  const x = side === 'left' ? geom.left : geom.left + box.width
  const lean = Math.tan(p.slant) * (geom.horizon - y) * (p.precip === 'snow' ? 0.6 : 1)
  // A mark, not a far cloud faded into the haze: a heavy shower cloud's own grey, darker under, in the hour's light.
  const dark = world.night.dark
  const heavy: RGB = p.precip === 'rain' ? [0.36, 0.4, 0.46] : [0.62, 0.66, 0.72]
  const body = mixRgb(mixRgb(b.shade, heavy, 0.6), [0.08, 0.1, 0.14], 0.6 * dark)
  const shade = mixRgb(body, [0.12, 0.14, 0.18], 0.35)
  const curtain = mixRgb(shade, horizonSky, p.precip === 'rain' ? 0.2 : 0.3)
  const pad = Math.abs(lean) + 8
  const x0 = Math.max(0, Math.floor(side === 'left' ? x - 2 : x - w - pad))
  const x1 = Math.min(geom.width, Math.ceil(side === 'left' ? x + w + pad : x + 2))
  const top = Math.max(0, Math.floor(y - h * 1.6))
  const bottom = Math.min(box.skyHeight, Math.ceil(geom.horizon + 3))
  const alpha = (0.85 + 0.15 * p.strength) * p.opacity * nearestBank.f.share
  return { kind: 'edge', id: 'edge', surface: 'sky', z: 8.5, soft: true, precip: p.precip, side, x, y, w, h,
    body, shade, curtain, alpha, lean, seed: b.seed,
    bounds: { x: x0, y: top, w: Math.max(1, x1 - x0), h: Math.max(1, bottom - top) },
    key: layerKey('edge', p.precip, skyBoxKey(box, true), side, q(x, 0.5), q(y, 0.5), q(w, 0.5), q(lean, 0.5), tone(body), tone(shade),
      tone(curtain), q(alpha, 0.02)) }
}

/** The crest's y (land px) at a reference x, from a plane's points. */
function crestAt(points: readonly Pt[], x: number): number {
  if (!points.length) return 0
  let i = 1
  while (i < points.length - 1 && points[i][0] < x) i++
  const [x0, y0] = points[i - 1], [x1, y1] = points[i]
  const t = x1 === x0 ? 0 : clamp01((x - x0) / (x1 - x0))
  return y0 + (y1 - y0) * t
}

/**
 * Dust drifts over the land and the low sky. In a gale (≥ 10 m/s) the sky's wind streaks fade as the dust fades in.
 * Each tile keeps its pattern and drift as its opacity changes.
 */
export function grainLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'grains'>[] {
  const dustWeight = world.air.dustWeight
  const galeWeight = world.wind.ms >= 10 ? 1 - dustWeight : 0
  if (dustWeight === 0 && galeWeight === 0) return []
  const across = world.wind.across
  const dir = Math.abs(across) > 0.05 ? Math.sign(across) : 1
  const sx = box.width / SCENE_W
  const dark = world.night.dark
  const out: LayerOf<'grains'>[] = []
  const add = (dust: boolean, weight: number) => {
    if (weight === 0) return
    const speed = dir * (dust ? 6 + 4 * world.wind.ms : 25 + 6 * world.wind.ms) * sx
    const period = whole(dust ? 120 : 260, box.dpr)
    const opacity = weight * (1 - 0.6 * dark)
    const rgb = dust ? mixRgb(hazeOf(world), [0.85, 0.72, 0.5], 0.35 * (1 - dark))
      : mixRgb(skyAt(world, box)(10), WHITE, 0.5 * (1 - dark))
    const marks = (id: string, h: number, n: number): FallMark[] => {
      const r = seeded(hashId(`${world.place.id}:${id}`))
      return Array.from({ length: n }, () => ({ x: r() * period, y: r() * h, len: dust ? 1 + 3 * r() : 18 + 40 * r(), r: dust ? 0.4 + 0.5 * r() : 0.5,
        alpha: (dust ? 0.12 + 0.18 * r() : 0.04 + 0.07 * r()) * opacity }))
    }
    const id = dust ? 'grains.sky' : 'grains.gale'
    const skyTop = Math.max(0, Math.floor(geom.horizon - (dust ? 110 : 200)))
    const skyH = Math.max(1, Math.ceil((dust ? box.skyHeight : geom.horizon - 10) - skyTop))
    const toneKey = [tone(rgb), Math.round(opacity * 255)]
    out.push({ kind: 'grains', id, surface: 'sky', z: 10.5, soft: true, rgb, marks: marks('grains.sky', skyH, dust ? 70 : 12),
      bounds: { x: 0, y: skyTop, w: period, h: skyH }, animated: { mode: 'drift', speed, period },
      key: layerKey(id, skyBoxKey(box, true), period, skyTop, skyH, toneKey) })
    if (dust) {
      out.push({ kind: 'grains', id: 'grains.land', surface: 'land', z: 50, soft: true, rgb, marks: marks('grains.land', box.landHeight, 60),
        bounds: { x: 0, y: 0, w: period, h: box.landHeight }, animated: { mode: 'drift', speed: speed * 1.4, period },
        key: layerKey('grains.land', landBoxKey(box, true), period, toneKey) })
    }
  }
  add(false, galeWeight)
  add(true, dustWeight)
  return out
}

/**
 * How broken the cloud is for rays (0–1): low and mid cloud with gaps to cast the shadows, and the sky as a whole not
 * closed (the high deck too: under a full veil there are no gaps for the light).
 */
export function brokenness(world: WorldState): number {
  const { low, mid, high } = coversOf(world)
  const u = 1 - (1 - low) * (1 - mid)
  const all = 1 - (1 - u) * (1 - high)
  return smoothstep(0.18, 0.4, u) * (1 - smoothstep(0.78, 0.93, all))
}

/** Smoke and steam: a strip this many frames, at this rate (a 1 s loop). */
const SMOKE_FRAMES = { count: 8, fps: 8 }

/**
 * Chimney smoke and cooling-tower steam (land): a plume from each such mark's top, carried downwind by the one wind
 * (rising straight in a calm, laid over in a gale), in the light and the air at its distance; puffs rising along it in
 * a strip of frames. One layer for the far marks, one for the near (over the portrait).
 */
export function smokeLayers(world: WorldState, box: SceneBox): LayerOf<'smoke'>[] {
  const sx = box.width / SCENE_W
  const stacks = world.marks.filter((m) => m.glyphKind === 'chimney' || m.glyphKind === 'cooling')
  if (!stacks.length) return []
  const aerial = aerialFor(world)
  const dark = world.night.dark
  const sky = skyAt(world, box)
  const blow = clamp01(world.wind.ms / 12)
  const across = world.wind.across
  const out: LayerOf<'smoke'>[] = []
  for (const [id, z, marks] of [['smoke.far', 17.5, stacks.filter((m) => m.plane !== 'near')], ['smoke.near', 40.5, stacks.filter((m) => m.plane === 'near')]] as const) {
    if (!marks.length) continue
    const plumes: Plume[] = marks.map((m) => {
      const steam = m.glyphKind === 'cooling'
      const height = m.h * m.scale
      const len = (steam ? 16 : 12) + height * 0.9
      const own = steam ? mixRgb(sky(6), [0.94, 0.95, 0.97], 0.65 * (1 - dark)) : mixRgb(sky(6), [0.42, 0.42, 0.44], 0.55)
      const lit = mixRgb(own, world.light.colour, 0.55 * world.light.direct * (1 - dark))
      return {
        x: m.x * sx + (steam ? 0 : height * 0.08), y: m.base - height * (steam ? 0.97 : 1),
        dx: across * len * (0.25 + 1.6 * blow), dy: -len * (1 - 0.65 * blow),
        r0: steam ? Math.max(1.2, m.w * 0.18) : 0.6, r1: (steam ? 5 : 3) + len * 0.18,
        rgb: aerial(own, m.km), lit: aerial(lit, m.km), alpha: (steam ? 0.75 : 0.55) * (1 - 0.5 * world.air.fade(m.km)),
        puffs: steam ? 9 : 8, seed: hashId(`${m.id}:smoke`),
      }
    })
    const pad = 3
    const left = Math.min(...plumes.map((p) => Math.min(p.x, p.x + p.dx) - p.r1 - pad))
    const right = Math.max(...plumes.map((p) => Math.max(p.x, p.x + p.dx) + p.r1 + pad))
    const top = Math.min(...plumes.map((p) => p.y + p.dy - p.r1 - pad))
    const bottom = Math.max(...plumes.map((p) => p.y + p.r0 + pad))
    const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(box.width, Math.ceil(right))
    const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(box.landHeight, Math.ceil(bottom))
    if (x1 <= x0 || y1 <= y0) continue
    out.push({ kind: 'smoke', id, surface: 'land', z, plumes, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      animated: { mode: 'frames', frames: SMOKE_FRAMES },
      key: layerKey(id, landBoxKey(box), x0, y0, x1, y1),
      light: lightPart(layerKey(id, 'light', plumes.map((p) => [q(p.x, 0.25), q(p.y, 0.25), q(p.dx, 0.25), q(p.dy, 0.25), q(p.r0, 0.1),
        q(p.r1, 0.25), tone(p.rgb), tone(p.lit), q(p.alpha, 0.02), p.puffs, p.seed])), plumes[0].rgb) })
  }
  return out
}

/**
 * The wet ground's sheen (land, after rain: `ground.wet`): short level strokes over the near ridge's face where wet rock,
 * roads and flats send back the sky above them, stronger the wetter, the brighter the sky; out of the text zones.
 */
export function sheenLayer(world: WorldState, box: SceneBox, clear: readonly Box[]): LayerOf<'sheen'> | null {
  const wet = world.ground.wet
  if (wet < 0.12 || (world.snow && world.snow.amount > 0.3)) return null
  const sx = box.width / SCENE_W
  const dark = world.night.dark
  const sky = skyAt(world, box)
  const rgb = mixRgb(sky(18), WHITE, 0.3 * (1 - dark))
  const bright = (1 - 0.8 * dark) * (0.6 + 0.4 * (1 - world.light.direct * 0.3))
  const r = seeded(hashId(`${world.place.id}:sheen`))
  const strokes: Sheen[] = []
  const n = Math.round(70 * wet)
  for (let i = 0; i < n * 3 && strokes.length < n; i++) {
    const xr = r() * SCENE_W
    const crest = crestAt(world.terrain.near.points, xr)
    const v = r(), w = (3 + 9 * r()) * sx
    if (crest >= box.landHeight - 4) continue
    const y = crest + (box.landHeight - crest) * (0.3 + 0.68 * v)
    const x = xr * sx - w / 2
    if (clear.some((b) => x < b.x + b.w && x + w > b.x && y > b.y - 1 && y < b.y + b.h + 1)) continue
    strokes.push({ x, y, w, alpha: wet * bright * (0.1 + 0.2 * r()) * (0.5 + 0.5 * v) })
  }
  if (!strokes.length) return null
  return { kind: 'sheen', id: 'sheen', surface: 'land', z: 31, strokes, rgb,
    bounds: { x: 0, y: 0, w: box.width, h: box.landHeight },
    key: layerKey('sheen', landBoxKey(box)),
    light: lightPart(layerKey('sheen', 'light', world.keys.terrain, q(wet, 0.05), tone(rgb), q(bright, 0.05),
      clear.map((b) => [b.x, b.y, b.w, b.h])), rgb) }
}

/** Every weather layer of the scene (C7), on both surfaces. */
export function weatherLayers(world: WorldState, box: SceneBox, clear: readonly Box[],
  geom: SkyGeom = skyGeom(world, box)): LayerDesc[] {
  const rays = rayLayersOf(world, box, geom)
  const sheen = sheenLayer(world, box, clear)
  return [...precipLayers(world, box, geom), ...rays, ...mistLayers(world, box), ...grainLayers(world, box, geom),
    ...smokeLayers(world, box), ...(sheen ? [sheen] : [])]
}

