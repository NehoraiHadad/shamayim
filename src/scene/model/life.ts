//# allFunctionsCalledOnLoad
import { seeded } from '../../data/landmarks/hash'
import { skyDirection } from '../../world/lifeSchedule'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { flightInView, highPoses, LIFE_START, LOW_SPRITE_PX, lowPoses, poseTrack, RAD, trackBaseAlpha } from './lifeTracks'
import { contrailLayer } from './contrail'
import { skyAt, skyGeom, type SkyGeom } from './sky'
import { tangentScale } from './tangent'
import { mixRgb } from './tone'
import type { LayerDesc, LayerOf, LifeClock, Pt, RGB, SceneBox } from './types'

/*
 * The sky's life (C10) as layers, from the world's `life` at the shown minute (`world/lifeSchedule.ts`: every object an
 * event on its own path in time): flocks of birds (a strip of wing beats and wheeling),
 * aircraft (airliners at cruise with the contrail the Schmidt–Appleman criterion gives them, the approach and departure
 * traffic of the airports within reach), and the meteors of a shower night. A flock or a plane is painted once round its
 * own middle and laid where its path has brought it (`placed`), so a scrub moves it without a repaint; it is hidden by the land
 * it is behind and laid in front of the land it is nearer than (`placedInDepth`).
 */

export const q = (v: number, step: number) => Math.round(v / step)
/** Tones in 1/24 steps: a scrub within the hour does not repaint a flock's strip for a shade no one sees. */
export const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 24))

/** One crest per world and box (the night sky, the optics, the meteors and the life all ask for it). */
const CRESTS = new WeakMap<WorldState, { key: string; at: (x: number) => number }>()

/**
 * Where the land's top stands at a sky x (sky px): the ridges, and the place's own ground where it rises over them, laid
 * down once in whole px columns (the land's polylines rasterised), so a look-up is an array read.
 */
export function crestOf(world: WorldState, box: SceneBox, geom: SkyGeom): (x: number) => number {
  const key = `${box.width}:${box.landTop}:${geom.width}:${geom.left}`
  const hit = CRESTS.get(world)
  if (hit?.key === key) return hit.at
  const ridges = [world.terrain.near.points, world.terrain.far.points, ...(world.terrain.back ? [world.terrain.back.points] : [])]
    .filter((p) => p.length > 1)
  const own = world.place3.kind === 'outside' && world.place3.land?.top.length ? [world.place3.land.top] : []
  const cols = new Float32Array(Math.ceil(geom.width) + 2).fill(Infinity)
  for (const line of [...ridges, ...own]) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1]
      const x0 = geom.left + Math.min(ax, bx) * geom.s, x1 = geom.left + Math.max(ax, bx) * geom.s
      for (let c = Math.max(0, Math.floor(x0)); c <= Math.min(cols.length - 1, Math.ceil(x1)); c++) {
        const t = x1 > x0 ? Math.min(1, Math.max(0, (c - x0) / (x1 - x0))) : 0
        const y = box.landTop + (ax <= bx ? ay + (by - ay) * t : by + (ay - by) * t)
        if (y < cols[c]) cols[c] = y
      }
    }
  }
  // Columns past the land's ends take its end's height; with no land at all, eye level.
  const eye = box.landTop + world.relief.horizonY
  let first = cols.findIndex(Number.isFinite)
  if (first < 0) { cols.fill(eye); first = 0 }
  for (let c = 0; c < first; c++) cols[c] = cols[first]
  for (let c = 1; c < cols.length; c++) if (!Number.isFinite(cols[c])) cols[c] = cols[c - 1]
  const at = (x: number) => cols[Math.max(0, Math.min(cols.length - 1, Math.round(x)))]
  CRESTS.set(world, { key, at })
  return at
}

/**
 * The land's drawn top at a sky x (sky px), over the ridges and whatever stands on them (C10): the outside view's boxes,
 * towers and trees, the marks' glyphs, as the land layers of the model place them. What flies in the sky keeps above it.
 */
export function landTopOf(world: WorldState, box: SceneBox, geom: SkyGeom, land: readonly LayerDesc[] = []): (x: number) => number {
  const crest = crestOf(world, box, geom)
  if (!land.length) return crest
  // A scrub keeps the place's layers' forms (their keys): the profile is laid down again only when one of them changes.
  const key = `${world.keys.terrain}|${world.keys.place}|${geom.width}:${geom.left}:${box.landTop}|${land.map((l) => l.key).join('|')}`
  if (LAND_TOP?.key === key) return LAND_TOP.at
  const at = landTop(box, geom, crest, land)
  LAND_TOP = { key, at }
  return at
}

/** The last land profile laid down (one entry: a scrub asks for the same place again and again). */
let LAND_TOP: { key: string; at: (x: number) => number } | null = null

function landTop(box: SceneBox, geom: SkyGeom, crest: (x: number) => number, land: readonly LayerDesc[]): (x: number) => number {
  const left = box.landLeft ?? 0
  const cols = new Float32Array(Math.ceil(geom.width) + 2)
  for (let i = 0; i < cols.length; i++) cols[i] = crest(i)
  const raise = (x0: number, x1: number, top: number) => {
    const a = Math.max(0, Math.floor(left + x0)), b = Math.min(cols.length - 1, Math.ceil(left + x1))
    const y = box.landTop + top
    for (let i = a; i <= b; i++) if (y < cols[i]) cols[i] = y
  }
  for (const layer of land) {
    if (layer.kind === 'outside') {
      for (const it of layer.items) {
        if (it.kind === 'box') raise(it.x - it.w / 2, it.x + it.w / 2, it.top)
        else if (it.kind === 'tower') raise(it.x - it.w / 2, it.x + it.w / 2, it.base - it.h)
        else if (it.kind === 'tree') raise(it.tree.x - it.tree.w / 2, it.tree.x + it.tree.w / 2, it.tree.base - it.tree.h)
        else raise(it.glyph.x - it.glyph.w / 2, it.glyph.x + it.glyph.w / 2, it.glyph.base - it.glyph.h * it.glyph.scale)
      }
    } else if (layer.kind === 'marks') {
      for (const g of layer.glyphs) raise(g.x - g.w / 2, g.x + g.w / 2, g.base - g.h * g.scale)
    }
  }
  return (x: number) => cols[Math.max(0, Math.min(cols.length - 1, Math.round(x)))]
}


/* In front of the land, or behind it. */

/** The near and far land's distance (km) at each scene px (at 375), per world: what an object in the sky is in front of. */
const LAND_KM = new WeakMap<WorldState, { near: Float32Array; far: Float32Array }>()

function kmCols(points: readonly Pt[], km: readonly number[]): Float32Array {
  const cols = new Float32Array(SCENE_W + 1).fill(Infinity)
  if (!points.length) return cols
  let j = 0
  for (let c = 0; c <= SCENE_W; c++) {
    while (j < points.length - 1 && points[j + 1][0] < c) j++
    const a = points[j], b = points[Math.min(points.length - 1, j + 1)]
    cols[c] = Math.abs(b[0] - c) < Math.abs(a[0] - c) ? km[Math.min(points.length - 1, j + 1)] ?? Infinity : km[j] ?? Infinity
  }
  return cols
}

/**
 * Where an object `km` away at sky x (px) stands among the land layers: in front of all of it (`near`), in front of the far
 * land but behind the near (`far`), or behind the land (null): decided by its distance against the land's at that x.
 */
export function inFrontOf(world: WorldState, geom: SkyGeom, x: number, km: number): 'near' | 'far' | null {
  let cols = LAND_KM.get(world)
  if (!cols) {
    cols = { near: kmCols(world.terrain.near.points, world.terrain.near.distanceKm), far: kmCols(world.terrain.far.points, world.terrain.far.distanceKm) }
    LAND_KM.set(world, cols)
  }
  const c = Math.max(0, Math.min(SCENE_W, Math.round((x - geom.left) / geom.s)))
  return km < cols.near[c] ? 'near' : km < cols.far[c] ? 'far' : null
}

/** On the land surface: in front of everything there (over the place, its marks and near water), or between the far and near land. */
const FRONT_Z = { near: 40.5, far: 18 } as const

/**
 * An object of the sky laid where it truly stands in depth (the owner's reports of 2026-11-20): on the sky surface, where
 * the land drawn over it hides it; and, when no land truly stands in its line of sight (`blockedKm` null: `flightTerrain.ts`),
 * it is nearer than the land drawn at its x (`inFrontOf`) and it reaches down into the land's figure, a copy on the land
 * surface in front of that land (the sky copy laid only over the figure's top, so nothing is laid twice): nearer than the
 * near land, over everything there; nearer than the far land only, between the far and near land. So it is hidden only by
 * land between it and the eye: the ground truly in its line of sight, or what is drawn nearer than it (rows, towers).
 */
export function placedInDepth<L extends LayerOf<'birds'> | LayerOf<'aircraft'>>(world: WorldState, box: SceneBox, geom: SkyGeom, layer: L, km: number,
  blockedKm: number | null | undefined): L[] {
  const lay = layer.placed!
  if (world.terrain.status !== 'ready') return [layer]
  const bottom = lay.y + (layer.bounds.y + layer.bounds.h) * lay.scale
  if (bottom <= box.landTop) return [layer]
  // Land truly in its line of sight hides it, wherever the figure's crest is; else it is in front of the land drawn
  // farther than it (the land drawn nearer, the place's rows and towers, stands between).
  const front = blockedKm == null ? inFrontOf(world, geom, lay.x, km) : null
  if (!front) return [layer]
  return [{ ...layer, placed: { ...lay, above: box.landTop } },
    { ...layer, id: `${layer.id}.front`, surface: 'land', z: FRONT_Z[front], placed: { ...lay, x: lay.x - geom.left, y: lay.y - box.landTop } }]
}

/* Aircraft and contrails. */

export { skyDirection }

/** Airliners on the dome and their wind-carried contrails. */
export function contrailLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), life: LifeClock = LIFE_START): LayerDesc10[] {
  const out: LayerDesc10[] = []
  if (!world.life.aircraft.high.length) return out
  const sky = skyAt(world, box, true)
  const sunAlt = world.bodies.sun.altitude
  const lightAt = mixRgb(world.light.colour, [1, 1, 1], smoothstep(2, 15, sunAlt) * 0.7)
  const shown = smoothstep(-4.5, -1.5, sunAlt)
  if (shown < 0.01) return out
  const k = Math.max(0.85, Math.min(1.3, geom.s))
  for (const plane of world.life.aircraft.high) {
    const trail = contrailLayer(world, box, geom, plane, life, lightAt, shown)
    if (trail) out.push(trail)
    if (!plane.plane) continue
    const poses = highPoses(geom, plane, plane.plane, shown), head = poses[0]
    const behind = sky(head.altitude)
    const lit = mixRgb(lightAt, [1, 1, 1], 0.2)
    const body = mixRgb([0.5, 0.52, 0.56], behind, 0.35)
    const shortPx = plane.persists ? 0 : (plane.shortKm / head.km) / RAD * tangentScale(world, geom, head.altitude)
    const layer = aircraftLayer(box, geom, `aircraft.high.${plane.id}`, 6.15, 3.2 * k, body, lit, 0, false, shortPx,
      mixRgb(lightAt, behind, 0.1), plane.seed, poses, life)
    if (flightInView(poses, layer.bounds, geom.width, box.skyHeight)) out.push(layer)
  }
  return out
}

type LayerDesc10 = LayerOf<'contrail'> | LayerOf<'aircraft'>

/** Aircraft are painted facing right at a reference size; their exact heading and scale are laid by the compositor. */
function aircraftLayer(box: SceneBox, geom: SkyGeom, id: string, z: number, size: number, rgb: RGB, lit: RGB,
  lights: number, landing: boolean, trail: number, trailRgb: RGB, seed: number, poses: ReturnType<typeof lowPoses>, life: LifeClock): LayerOf<'aircraft'> {
  const trailPx = 0.2 * q(trail, 0.2)
  const reach = Math.ceil(Math.max(size * 2 + 4, trailPx + size + 3) + (lights ? 5 : 0))
  const bounds = { x: -reach, y: -reach, w: 2 * reach + 1, h: 2 * reach + 1 }
  const frames = lights > 0 ? { count: 10, fps: 10 } : undefined
  return {
    kind: 'aircraft', id, surface: 'sky', z, x: 0, y: 0, angle: 0, size, rgb, lit, lights, landing, trail: trailPx, trailRgb, seed, bounds,
    placed: { ...poses[0], alpha: trackBaseAlpha(poses[0]) },
    animated: { mode: frames ? 'frames' : 'settle', frames, flight: poseTrack(poses, life, geom.azimuthRange) },
    key: layerKey(id, skyBoxKey(box), q(size, 0.2), tone(rgb), tone(lit), q(lights, 1 / 24), landing, q(trailPx, 0.2), tone(trailRgb)),
  }
}

/** Airport movements as they climb out of the haze or sink into it on approach. */
export function lowPlaneLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), life: LifeClock = LIFE_START): LayerOf<'aircraft'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'aircraft'>[] = []
  for (const plane of world.life.aircraft.low) {
    const poses = lowPoses(world, geom, plane), { km, altitude } = poses[0]
    const fade = Math.min(0.8, world.air.fade(km)), behind = sky(altitude)
    const body = mixRgb(mixRgb([0.82, 0.84, 0.88], world.light.ambient, 0.4), behind, fade)
    const lit = mixRgb(mixRgb([1, 1, 1], world.light.colour, 0.3), behind, fade)
    const lights = smoothstep(0.2, 0.7, world.night.dark)
    const layer = aircraftLayer(box, geom, `aircraft.low.${plane.id}`, 9.4, LOW_SPRITE_PX, body, lit, lights, plane.kind === 'arrive',
      0, body, plane.seed, poses, life)
    if (flightInView(poses, layer.bounds, geom.width, Math.max(box.skyHeight, box.landTop + box.landHeight))) {
      out.push(...placedInDepth(world, box, geom, layer, km, plane.blockedKm))
    }
  }
  return out
}

/* Meteors. */

/**
 * The meteors of the next minutes on a shower night (sky): streaks pointing away from the radiant, each at its own moment of
 * the night's schedule (`flashes`), each timed on the scene's timeline.
 */
export function meteorLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), life: LifeClock = LIFE_START): LayerOf<'meteor'>[] {
  const m = world.life.meteors
  if (!m) return []
  const crest = crestOf(world, box, geom)
  const out: LayerOf<'meteor'>[] = []
  for (const flash of m.flashes) {
    const r = seeded(flash.seed)
    const x = 20 + r() * (geom.width - 40)
    const y = 20 + r() * (geom.horizon - 70)
    if (y > crest(x) - 20) continue
    const radiant = flash.radiant ?? m.radiant
    const speed = flash.speed ?? m.speed
    const rx = geom.x(radiant.azimuth), ry = geom.dome(radiant.altitude)
    // Away from the radiant (a long streak far from it, short near it), as long as its speed carries it.
    const dx = x - rx, dy = y - ry, d = Math.hypot(dx, dy) || 1
    const len = Math.min(70, (10 + 0.25 * d) * (0.6 + 0.5 * (speed / 70)) * (0.6 + 0.6 * r())) * Math.max(0.85, geom.s)
    const x1 = x + (dx / d) * len, y1 = y + (dy / d) * len
    const pad = 4
    const bounds = { x: Math.floor(Math.min(x, x1)) - pad, y: Math.floor(Math.min(y, y1)) - pad, w: Math.ceil(Math.abs(x1 - x)) + 2 * pad,
      h: Math.ceil(Math.abs(y1 - y)) + 2 * pad }
    const id = `meteor.${flash.id}`
    const pulse = { first: flash.inS - life.sinceS + life.laidAt, look: 'meteor' as const }
    const rgb: RGB = speed > 55 ? [0.86, 0.93, 1] : [1, 0.95, 0.82]
    out.push({ kind: 'meteor', id, surface: 'sky', z: 2.4, x0: x, y0: y, x1, y1,
      width: 1.1 * Math.max(0.85, geom.s), rgb, bounds, animated: { mode: 'settle', pulse },
      key: layerKey(id, skyBoxKey(box)) })
  }
  return out
}
