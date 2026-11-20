//# allFunctionsCalledOnLoad
import { seeded } from '../../data/landmarks/hash'
import { lateral } from '../../domain/camera'
import type { BirdKind, Flock, HighPlane, LowPlane } from '../../world/life'
import { METEOR_WINDOW_S, skyDirection } from '../../world/lifeSchedule'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { skyAt, skyGeom, type SkyGeom } from './sky'
import { gnomonic, tangentFrame, tangentScale, type TangentFrame } from './tangent'
import { mixRgb } from './tone'
import type { BirdDesc, LayerDesc, LayerOf, Lay, Pt, RGB, SceneBox, Track } from './types'

/*
 * The sky's life (C10) as layers, from the world's `life` at the shown minute (`world/lifeSchedule.ts`: every object an
 * event on its own path in time): flocks of birds (a strip of wing beats and wheeling, a slow sway round their place),
 * aircraft (airliners at cruise with the contrail the Schmidt–Appleman criterion gives them, the approach and departure
 * traffic of the airports within reach), and the meteors of a shower night. A flock or a plane is painted once round its
 * own middle and laid where its path has brought it (`placed`), so a scrub moves it without a repaint; it is hidden by the land
 * it is behind and laid in front of the land it is nearer than (`placedInDepth`).
 */

const RAD = Math.PI / 180
const q = (v: number, step: number) => Math.round(v / step)
/** Tones in 1/24 steps: a scrub within the hour does not repaint a flock's strip for a shade no one sees. */
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 24))

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
 * An object of the sky laid where it truly stands in depth (the owner's report of 2026-11-20): on the sky surface, where the
 * land drawn over it hides it; and, when it is nearer than the land under it and reaches down into the land's figure, a
 * copy on the land surface in front of that land (the sky copy laid only over the figure's top, so nothing is laid twice).
 */
function placedInDepth<L extends LayerOf<'birds'> | LayerOf<'aircraft'>>(world: WorldState, box: SceneBox, geom: SkyGeom, layer: L, km: number): L[] {
  const lay = layer.placed!
  if (world.terrain.status !== 'ready') return [layer]
  const bottom = lay.y + (layer.bounds.y + layer.bounds.h) * lay.scale
  if (bottom <= box.landTop) return [layer]
  const front = inFrontOf(world, geom, lay.x, km)
  if (!front) return [layer]
  return [{ ...layer, placed: { ...lay, above: box.landTop } },
    { ...layer, id: `${layer.id}.front`, surface: 'land', z: FRONT_Z[front], placed: { ...lay, x: lay.x - geom.left, y: lay.y - box.landTop } }]
}

/* Birds. */

interface KindLook {
  /** Strip: frames a second and how many; wing beats a second; share of the time on held wings. */
  fps: number
  count: number
  flap: number
  soar: number
  /** Wingspan (px at the reference width). */
  span: number
  /** How a bird moves within the flock: its loop's size (px) and the flock's spread (px). */
  loop: [number, number]
  spread: [number, number]
}

const LOOKS: Record<BirdKind, KindLook> = {
  stork: { fps: 3, count: 24, flap: 0, soar: 1, span: 8, loop: [5, 12], spread: [26, 16] },
  crane: { fps: 12, count: 12, flap: 2, soar: 0.2, span: 6.5, loop: [0.6, 0.5], spread: [0, 0] },
  swift: { fps: 15, count: 30, flap: 7.5, soar: 0.45, span: 4.5, loop: [9, 6], spread: [22, 12] },
  gull: { fps: 12, count: 24, flap: 2.5, soar: 0.5, span: 7, loop: [3, 2], spread: [26, 8] },
  raptor: { fps: 2, count: 24, flap: 0, soar: 1, span: 10, loop: [12, 8], spread: [16, 6] },
  crow: { fps: 12, count: 12, flap: 3, soar: 0, span: 6, loop: [0.5, 0.6], spread: [16, 5] },
  pigeon: { fps: 12, count: 24, flap: 5, soar: 0.15, span: 4.2, loop: [8, 4], spread: [16, 7] },
  bat: { fps: 12, count: 24, flap: 5, soar: 0, span: 4, loop: [8, 6], spread: [24, 10] },
}

/** The birds of a flock in its sprite (centred on 0, 0): a kettle, a V or a line, a loose party, a wheeling flock. */
function flockBirds(flock: Flock, look: KindLook, k: number): BirdDesc[] {
  const r = seeded(flock.seed)
  const out: BirdDesc[] = []
  const n = flock.count
  for (let i = 0; i < n; i++) {
    const size = look.span * k * (0.85 + 0.3 * r())
    if (flock.kind === 'crane') {
      // A V (or a ragged line) trailing back from its leader, its arms ~35° apart on screen.
      const arm = i === 0 ? 0 : i % 2 ? 1 : -1, rank = Math.ceil(i / 2)
      const line = r() < 0.3
      out.push({ x: -rank * 3.4 * k, y: line ? rank * 0.5 * k * arm : arm * rank * 1.8 * k, rx: look.loop[0] * k, ry: look.loop[1] * k, turn: 1, lag: r(),
        size, beat: (rank * 0.08) % 1 })
      continue
    }
    // The rest: spread round the middle, more of them near it; each round its own small loop.
    const a = r() * 2 * Math.PI, d = Math.sqrt(r())
    const sameWay = flock.kind === 'stork' || flock.kind === 'raptor' || flock.kind === 'pigeon'
    out.push({ x: Math.cos(a) * d * look.spread[0] * k, y: Math.sin(a) * d * look.spread[1] * k * (flock.kind === 'stork' ? 1.6 : 1),
      rx: look.loop[0] * k * (0.6 + 0.4 * r()), ry: look.loop[1] * k * (0.6 + 0.4 * r()), turn: sameWay ? 1 : r() < 0.5 ? 1 : -1,
      lag: flock.kind === 'pigeon' ? 0.06 * r() : r(), size, beat: r() })
  }
  return out
}

/** The slow sway of a flock round its place (s a cycle): its drift is a loop, never a way of its own across the scrub. */
export const SWAY_S = 24

/**
 * The flocks under way at the shown minute (sky; over the land they are nearer than): each painted once round its own
 * middle at its full size (its closest distance), and laid at composite time where its path has brought it, smaller and
 * fainter by its distance (`placed`); its wing beats and wheeling on a strip, a slow sway round its place.
 */
export function birdLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'birds'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'birds'>[] = []
  const k = Math.max(0.85, Math.min(1.4, geom.s))
  for (const flock of world.life.birds) {
    const look = LOOKS[flock.kind]
    const birds = flockBirds(flock, look, k)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const b of birds) {
      x0 = Math.min(x0, b.x - b.rx - b.size); x1 = Math.max(x1, b.x + b.rx + b.size)
      y0 = Math.min(y0, b.y - b.ry - b.size); y1 = Math.max(y1, b.y + b.ry + b.size)
    }
    const scale = Math.min(1, flock.nearM / flock.distanceM)
    // Through the air: the haze takes it as it goes (from its own haze at its closest), and its session's ends.
    const nearFade = world.air.fade(flock.nearM / 1000), farFade = world.air.fade(flock.distanceM / 1000)
    const alpha = flock.fade * Math.min(1, (1 - farFade) / Math.max(0.05, 1 - nearFade))
    const x = geom.x(flock.azimuth), y = geom.y(flock.altitude)
    if (alpha < 0.01 || x + x1 * scale < -4 || x + x0 * scale > geom.width + 4 || y + y1 * scale < -4) continue
    const bounds = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0) + 2, h: Math.ceil(y1 - y0) + 2 }
    // Their tones at their closest: dark against the sky, hazed by that distance; the pale parts in the sky's light, lit by the sun.
    const behind = sky(flock.altitude)
    const ink: RGB = flock.kind === 'bat' ? [0.08, 0.07, 0.08] : [0.13, 0.13, 0.15]
    const rgb = mixRgb(ink, behind, Math.min(0.75, nearFade + 0.12))
    const direct = world.light.source === 'sun' ? world.light.direct : 0
    const pale = mixRgb(mixRgb([0.95, 0.95, 0.93], world.light.ambient, 0.35), world.light.colour, 0.25 * direct)
    const lit = mixRgb(pale, behind, Math.min(0.75, nearFade))
    const heading: -1 | 1 = lateral(flock.headingDeg, world.camera) >= 0 ? 1 : -1
    const flapHz = look.flap ? Math.max(1, Math.round(look.flap * (look.count / look.fps))) / (look.count / look.fps) : 0
    // The sway: a slow ellipse round its place, a few px along its way.
    const a = Math.min(5, 0.2 * look.spread[0] + 1) * k
    const sway: Track = { path: [[0, 0], [a, -0.3 * a], [0, -0.5 * a], [-a, -0.2 * a], [0, 0]], step: SWAY_S / 4, cycle: SWAY_S, at: 0 }
    const id = `birds.${flock.id}`
    const layer: LayerOf<'birds'> = {
      kind: 'birds', id, surface: 'sky', z: 9.5, bird: flock.kind, birds, loop: look.count / look.fps, flap: flapHz,
      soar: look.soar, rgb, lit, litA: direct, heading, seed: flock.seed, bounds, placed: { x, y, scale, alpha },
      animated: { mode: 'frames', frames: { count: look.count, fps: look.fps }, flight: sway },
      key: layerKey(id, skyBoxKey(box), flock.kind, flock.seed, heading, bounds.x, bounds.y, bounds.w, bounds.h, tone(rgb), tone(lit), q(direct, 0.25)),
    }
    out.push(...placedInDepth(world, box, geom, layer, flock.distanceM / 1000))
  }
  return out
}

/* Aircraft and contrails. */

export { skyDirection }

type SkyPoint = { x: number; y: number; km: number; altitude: number }

/**
 * The frame a contrail is drawn in (C10 fix): tangent to the sky at `centre`, anchored where the high cloud is drawn there
 * (on the dome), at the sky's px per degree across at that height. A trail is a straight line in space (its puffs laid
 * along the plane's track and carried by one wind), so on the sky a great circle: gnomonic in this frame it is straight.
 */
function trailFrame(world: WorldState, geom: SkyGeom, centre: { azimuth: number; altitude: number }): TangentFrame {
  return tangentFrame(centre, [geom.x(centre.azimuth), geom.dome(centre.altitude)], tangentScale(world, geom, centre.altitude), world.camera.handed)
}

/** The middle of the stretch of directions that is up in the view, where an old trail's frame is centred; null if none. */
function middleInView(geom: SkyGeom, dirs: { azimuth: number; altitude: number }[]) {
  let best: number[] = [], cur: number[] = []
  dirs.forEach((d, i) => {
    if (d.altitude > 3 && Math.abs(geom.x(d.azimuth) - geom.width / 2) < geom.width * 0.6) cur.push(i)
    else { if (cur.length > best.length) best = cur; cur = [] }
  })
  if (cur.length > best.length) best = cur
  return best.length ? dirs[best[Math.floor(best.length / 2)]] : null
}

/** An airliner far off fades into the air before its crossing ends (km over the ground). */
const cruiseFar = (km: number) => 1 - smoothstep(70, 140, km)

/**
 * The contrails and the airliners at cruise (sky, at the high cloud's level), at the shown minute: each plane where its
 * crossing has brought it, its trail grown behind it puff by puff, each puff spread and faded by its own age and carried
 * by the upper wind since it was laid; an old trail stays after its plane has gone, fading out by age.
 */
export function contrailLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerDesc10[] {
  const { aircraft } = world.life
  const out: LayerDesc10[] = []
  if (!aircraft.high.length) return out
  const sky = skyAt(world, box)
  const sunAlt = world.bodies.sun.altitude
  // A trail is lit by the sun at its height until ~4° after sunset (pink then), else the sky's grey.
  const lightAt = mixRgb(world.light.colour, [1, 1, 1], smoothstep(2, 15, sunAlt) * 0.7)
  const shown = smoothstep(-4.5, -1.5, sunAlt)
  if (shown <= 0.01) return out
  // In the frame and over the eye's horizon; where the land stands in front, it hides the plane and its trail (drawn over them).
  const visible = (p: SkyPoint | null): p is SkyPoint => !!p && p.x > -60 && p.x < geom.width + 60 && p.y < geom.horizon && p.y > -40
  const k = Math.max(0.85, Math.min(1.3, geom.s))
  aircraft.high.forEach((plane: HighPlane) => {
    const headDir = plane.plane ? skyDirection(plane.plane.e, plane.plane.n, plane.plane.up) : null
    const dirs = plane.trail.map((p) => skyDirection(p.e, p.n, p.up))
    const centre = headDir && headDir.altitude > 1 ? headDir : middleInView(geom, dirs)
    if (!centre) return
    // The plane's own frame while it flies (it stands at its true place, its trail straight behind it), else the trail's middle.
    const frame = trailFrame(world, geom, centre)
    if (plane.persists && plane.trail.length > 1) {
      const pts = dirs.map((d): SkyPoint | null => {
        const p = gnomonic(frame, d)
        return p ? { x: p[0], y: p[1], km: d.km, altitude: d.altitude } : null
      })
      const runs: number[][] = [[]]
      pts.forEach((p, i) => (visible(p) ? runs.at(-1)!.push(i) : runs.at(-1)!.length && runs.push([])))
      const run = runs.sort((a, b) => b.length - a.length)[0]
      if (run && run.length > 1) {
        const at = (i: number) => pts[i]!
        const points: Pt[] = run.map((i) => [at(i).x, at(i).y])
        const age = (i: number) => Math.min(1, plane.trail[i].ageS / plane.lifeS)
        // Width on screen: its true width at its distance in the frame's px a degree, never under a hairline.
        const widths = run.map((i) => Math.max(0.6, Math.min(10, ((40 + (plane.spreadM - 40) * age(i)) / (at(i).km * 1000)) / RAD * frame.k * 1.4)))
        // Thin and bright when fresh, spreading and fading by age; far off, into the air.
        const alphas = run.map((i) => (0.62 - 0.3 * age(i)) * (1 - smoothstep(0.55, 1, age(i))) * shown * (1 - 0.6 * world.air.fade(at(i).km * 0.35)) *
          smoothstep(0.5, 4, at(i).altitude) * cruiseFar(Math.hypot(plane.trail[i].e, plane.trail[i].n)))
        const lumps = run.map((i) => 0.9 + 0.2 * ((plane.trail[i].seed >>> 0) % 1000) / 1000)
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
        points.forEach(([x, y], j) => { x0 = Math.min(x0, x - widths[j]); x1 = Math.max(x1, x + widths[j]); y0 = Math.min(y0, y - widths[j]); y1 = Math.max(y1, y + widths[j]) })
        const mid = at(run[Math.floor(run.length / 2)])
        const rgb = mixRgb(lightAt, sky(mid.altitude), 0.15)
        const shade = mixRgb(sky(mid.altitude), [0.55, 0.58, 0.66], 0.3)
        const id = `contrail.${plane.id}`
        if (alphas.some((a) => a > 0.01)) {
          out.push({ kind: 'contrail', id, surface: 'sky', z: 6.1, soft: true, points, widths, alphas, lumps, rgb, shade, seed: plane.seed,
            bounds: { x: Math.floor(x0) - 2, y: Math.floor(y0) - 2, w: Math.ceil(x1 - x0) + 5, h: Math.ceil(y1 - y0) + 5 },
            key: layerKey(id, skyBoxKey(box, true), points.map(([x, y]) => [q(x, 0.5), q(y, 0.5)]), widths.map((w) => q(w, 0.25)),
              alphas.map((a) => q(a, 0.03)), tone(rgb), tone(shade)) })
        }
      }
    }
    if (!plane.plane || !headDir || headDir.altitude < 1) return
    const head = { x: frame.at[0], y: frame.at[1], km: headDir.km, altitude: headDir.altitude }
    if (!visible(head)) return
    // Its way on the sky: the next half minute of its track, in its frame.
    const h = plane.headingDeg * RAD, ahead = (plane.speedMs * 30) / 1000
    const next = gnomonic(frame, skyDirection(plane.plane.e + ahead * Math.sin(h), plane.plane.n + ahead * Math.cos(h), plane.plane.up))
    const angle = next ? Math.atan2(next[1] - head.y, next[0] - head.x) : 0
    const lit = mixRgb(lightAt, [1, 1, 1], 0.2)
    const body = mixRgb([0.5, 0.52, 0.56], sky(head.altitude), 0.35)
    // The short trail of a non-persistent contrail: px behind the plane (its km at the plane's distance), fresh and thin.
    const shortPx = plane.persists ? 0 : (plane.shortKm / head.km) / RAD * frame.k
    const alpha = shown * cruiseFar(Math.hypot(plane.plane.e, plane.plane.n))
    if (alpha > 0.01) {
      out.push(aircraftLayer(box, `aircraft.high.${plane.id}`, 6.15, angle, 3.2 * k, body, lit, 0, false, shortPx, mixRgb(lightAt, sky(head.altitude), 0.1),
        plane.seed, { x: head.x, y: head.y, scale: 1, alpha }))
    }
  })
  return out
}

type LayerDesc10 = LayerOf<'contrail'> | LayerOf<'aircraft'>

/** A plane's sprite (painted round 0, 0), laid at `placed`; by night a strip for its strobes and beacon. */
function aircraftLayer(box: SceneBox, id: string, z: number, angle: number, size: number, rgb: RGB, lit: RGB,
  lights: number, landing: boolean, trail: number, trailRgb: RGB, seed: number, placed: Lay): LayerOf<'aircraft'> {
  const reach = Math.max(size * 2 + 4, trail + size + 3) + (lights ? 5 : 0)
  const bounds = { x: -Math.ceil(reach), y: -Math.ceil(reach), w: 2 * Math.ceil(reach) + 1, h: 2 * Math.ceil(reach) + 1 }
  // By night a strip for the strobes and the beacon (their own rhythms over one second); by day none.
  const frames = lights > 0 ? { count: 10, fps: 10 } : undefined
  return {
    kind: 'aircraft', id, surface: 'sky', z, x: 0, y: 0, angle, size, rgb, lit, lights, landing, trail, trailRgb, seed, bounds, placed,
    ...(frames ? { animated: { mode: 'frames' as const, frames } } : {}),
    key: layerKey(id, skyBoxKey(box), bounds.w, q(angle, 0.05), q(size, 0.2), tone(rgb), tone(lit), q(lights, 0.1), landing, q(trail, 0.5),
      tone(trailRgb)),
  }
}

/** Near the field a movement shows over this long of its flight (s): lifting out of the land's haze, or sinking into it. */
const NEAR_FIELD_S = 300

/**
 * The approach and departure traffic of the airports within reach at the shown minute: each movement where its glide or
 * climb has brought it, from far off (small, faint) to the field or out to the distance; behind the land it is nearer
 * than nothing of, in front of the land it is nearer than.
 */
export function lowPlaneLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'aircraft'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'aircraft'>[] = []
  const night = world.night.dark
  for (const plane of world.life.aircraft.low as LowPlane[]) {
    const d = skyDirection(plane.at.e, plane.at.n, plane.at.up), n = skyDirection(plane.ahead.e, plane.ahead.n, plane.ahead.up)
    const x = geom.x(d.azimuth), y = geom.y(d.altitude)
    if (x < -10 || x > geom.width + 10) continue
    // Close enough to make out (by night its lights carry farther): it fades into the air before that, never cut.
    const reach = night > 0.5 ? 50 : plane.light ? 18 : 45
    // Low over the field it is in the ground's haze among the land's own things: it climbs out of it, or sinks into it on
    // its approach, over the minutes its climb or glide takes through the lowest air (by its own vertical speed), never
    // cut on the runway. The far end of its path is beyond its reach: it has shrunk into the distance before it ends.
    const vertical = plane.speedMs * Math.max(0.02, plane.overFieldM / Math.max(500, plane.fieldKm * 1000))
    const alpha = (1 - smoothstep(0.2 * reach, reach, d.km)) * smoothstep(0, NEAR_FIELD_S * vertical, plane.overFieldM) *
      smoothstep(0, 0.25 * plane.pathKm, plane.pathKm - plane.fieldKm)
    if (alpha < 0.01) continue
    const angle = Math.atan2(geom.y(n.altitude) - y, geom.x(n.azimuth) - x)
    // Its size: a jet's 35 m (a light plane's 11 m) at its distance, drawn a little larger than true to be seen, 2.5–9 px.
    const span = plane.light ? 11 : 35
    const size = Math.max(2.5, Math.min(9, (span / (d.km * 1000)) / RAD * world.camera.pxPerDeg * geom.s * 9))
    const fade = world.air.fade(d.km)
    const body = mixRgb(mixRgb([0.82, 0.84, 0.88], world.light.ambient, 0.4), sky(d.altitude), Math.min(0.8, fade))
    const lit = mixRgb(mixRgb([1, 1, 1], world.light.colour, 0.3), sky(d.altitude), Math.min(0.8, fade))
    const lights = smoothstep(0.2, 0.7, night)
    const layer = aircraftLayer(box, `aircraft.low.${plane.id}`, 9.4, angle, size, body, lit, lights, plane.kind === 'arrive', 0, body, plane.seed,
      { x, y, scale: 1, alpha })
    out.push(...placedInDepth(world, box, geom, layer, d.km))
  }
  return out
}

/* Meteors. */

/**
 * The meteors of the next minutes on a shower night (sky): streaks pointing away from the radiant, each at its own moment of
 * the night's schedule (`flashes`), laid as one flash that far into the composite loop. They are brief by nature: tied to
 * the shown minute, never to the hour.
 */
export function meteorLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'meteor'>[] {
  const m = world.life.meteors
  if (!m) return []
  const crest = crestOf(world, box, geom)
  const rx = geom.x(m.radiant.azimuth), ry = geom.dome(m.radiant.altitude)
  const out: LayerOf<'meteor'>[] = []
  for (const flash of m.flashes) {
    const r = seeded(flash.seed)
    const x = 20 + r() * (geom.width - 40)
    const y = 20 + r() * (geom.horizon - 70)
    if (y > crest(x) - 20) continue
    // Away from the radiant (a long streak far from it, short near it), as long as its speed carries it.
    const dx = x - rx, dy = y - ry, d = Math.hypot(dx, dy) || 1
    const len = Math.min(70, (10 + 0.25 * d) * (0.6 + 0.5 * (m.speed / 70)) * (0.6 + 0.6 * r())) * Math.max(0.85, geom.s)
    const x1 = x + (dx / d) * len, y1 = y + (dy / d) * len
    const pad = 4
    const bounds = { x: Math.floor(Math.min(x, x1)) - pad, y: Math.floor(Math.min(y, y1)) - pad, w: Math.ceil(Math.abs(x1 - x)) + 2 * pad,
      h: Math.ceil(Math.abs(y1 - y)) + 2 * pad }
    const id = `meteor.${flash.id}`
    const pulse = { seed: flash.seed, first: flash.inS, every: [1e9, 1e9] as [number, number], look: 'meteor' as const, cycle: METEOR_WINDOW_S }
    const rgb: RGB = m.speed > 55 ? [0.86, 0.93, 1] : [1, 0.95, 0.82]
    out.push({ kind: 'meteor', id, surface: 'sky', z: 2.4, x0: x, y0: y, x1, y1,
      width: 1.1 * Math.max(0.85, geom.s), rgb, bounds, animated: { mode: 'settle', pulse },
      key: layerKey(id, skyBoxKey(box), bounds.x, bounds.y, bounds.w, bounds.h, q(x1, 0.5), q(y1, 0.5), tone(rgb)) })
  }
  return out
}
