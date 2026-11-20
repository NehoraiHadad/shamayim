//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { lateral } from '../../domain/camera'
import type { BirdKind, Flock, LowPlane, TrackLine } from '../../world/life'
import { smoothstep } from '../../world/ridgeLighting'
import { apparentAltitude } from '../../world/skyProjection'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { skyAt, skyGeom, type SkyGeom } from './sky'
import { gnomonic, tangentFrame, tangentScale, type TangentFrame } from './tangent'
import { mixRgb } from './tone'
import type { BirdDesc, LayerDesc, LayerOf, Pt, RGB, SceneBox, Track } from './types'

/*
 * The sky's life (C10) as layers, from the world's `life`: flocks of birds (a strip of wing beats and wheeling, flown across
 * on a track at their true angular speed), aircraft (airliners at cruise with the contrail the Schmidt–Appleman criterion
 * gives them, the approach and departure traffic of the airports within reach), and the meteors of a shower night. All on
 * the sky surface, only where they stand over the land; every motion is laid at composite time.
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

/** Screen px a second (across) of something moving `speedMs` toward `headingDeg`, `distanceM` away. */
const acrossSpeed = (world: WorldState, geom: SkyGeom, headingDeg: number, speedMs: number, distanceM: number) =>
  (lateral(headingDeg, world.camera) * speedMs / distanceM) / RAD * world.camera.pxPerDeg * geom.s

/**
 * A crossing of the sky surface (C10): the layer (its bounds at phase 0) flown across at `vx`, `vy` px/s from where it
 * enters to where it leaves, then a pause of `gap` s before the next pass. Null when it hardly moves.
 */
export function crossing(bounds: { x: number; y: number; w: number; h: number }, width: number, vx: number, vy: number, gap: number): Track | null {
  if (Math.abs(vx) < 0.02) return null
  const enter = vx > 0 ? -(bounds.x + bounds.w) : width - bounds.x
  const leave = vx > 0 ? width - bounds.x : -(bounds.x + bounds.w)
  const dur = (leave - enter) / vx
  const at = -enter / vx
  return { path: [[enter, (enter / vx) * vy], [leave, (leave / vx) * vy]], step: dur, cycle: dur + gap, at }
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

/** The flocks of the hour as layers (sky, over the clouds below them, never under the land's line). */
export function birdLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), crest = crestOf(world, box, geom)): LayerOf<'birds'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'birds'>[] = []
  const k = Math.max(0.85, Math.min(1.4, geom.s))
  world.life.birds.forEach((flock, i) => {
    const look = LOOKS[flock.kind]
    const birds = flockBirds(flock, look, k)
    let cx = geom.x(flock.azimuth), cy = geom.y(flock.altitude)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const b of birds) {
      x0 = Math.min(x0, b.x - b.rx - b.size); x1 = Math.max(x1, b.x + b.rx + b.size)
      y0 = Math.min(y0, b.y - b.ry - b.size); y1 = Math.max(y1, b.y + b.ry + b.size)
    }
    if (cx + x1 < 0 || cx + x0 > geom.width) cx = geom.width / 2
    // Over the land's line (a few px clear of it) and under the sky's top.
    let lowest = Infinity
    for (let x = cx + x0 - 2; x <= cx + x1 + 2; x += 2) lowest = Math.min(lowest, crest(x))
    lowest -= 6
    if (cy + y1 > lowest) cy = lowest - y1
    if (cy + y0 < 4) cy = 4 - y0
    const bounds = { x: Math.floor(cx + x0), y: Math.floor(cy + y0), w: Math.ceil(x1 - x0) + 2, h: Math.ceil(y1 - y0) + 2 }
    // In the surface's px, as every layer is painted (the cache translates by its bounds).
    const placed = birds.map((b) => ({ ...b, x: b.x + cx, y: b.y + cy }))
    // Their tones: dark against the sky, hazed by their distance; the pale parts in the sky's light, lit by the sun.
    const fade = world.air.fade(flock.distanceM / 1000)
    const behind = sky(flock.altitude)
    const ink: RGB = flock.kind === 'bat' ? [0.08, 0.07, 0.08] : [0.13, 0.13, 0.15]
    const rgb = mixRgb(ink, behind, Math.min(0.75, fade + 0.12))
    const direct = world.light.source === 'sun' ? world.light.direct : 0
    const pale = mixRgb(mixRgb([0.95, 0.95, 0.93], world.light.ambient, 0.35), world.light.colour, 0.25 * direct)
    const lit = mixRgb(pale, behind, Math.min(0.75, fade))
    const vx = acrossSpeed(world, geom, flock.headingDeg, flock.speedMs, flock.distanceM)
    const flapHz = look.flap ? Math.max(1, Math.round(look.flap * (look.count / look.fps))) / (look.count / look.fps) : 0
    const r = seeded(flock.seed ^ 0x5bd1)
    const track = crossing(bounds, geom.width, vx, 0, 30 + 150 * r() * (1 - flock.score * 0.6))
    const id = `birds.${i}`
    out.push({
      kind: 'birds', id, surface: 'sky', z: 9.5 + i * 0.01, bird: flock.kind, birds: placed, loop: look.count / look.fps, flap: flapHz,
      soar: look.soar, rgb, lit, litA: direct, heading: vx >= 0 ? 1 : -1, seed: flock.seed, bounds,
      animated: { mode: 'frames', frames: { count: look.count, fps: look.fps }, ...(track ? { flight: track } : {}) },
      key: layerKey(id, skyBoxKey(box), flock.kind, flock.seed, bounds.x, bounds.y, bounds.w, bounds.h, tone(rgb), tone(lit), q(direct, 0.25),
        track && [q(track.path[0][0], 0.5), q(track.path[1][0], 0.5), q(track.step, 1), q(track.cycle, 1), q(track.at, 0.5)]),
    })
  })
  return out
}

/* Aircraft and contrails. */

/** Az/alt (deg) of a point east `e`, north `n` (km) and `upM` above the eye: the Earth's curve and refraction counted. */
export function skyDirection(e: number, n: number, upM: number): { azimuth: number; altitude: number; km: number } {
  const km = Math.hypot(e, n)
  // The curve's drop (m) over the distance, less the seventh refraction gives back.
  const drop = ((km * 1000) ** 2 / (2 * 6_371_000)) * (1 - 0.13)
  const altitude = Math.atan2(upM - drop, km * 1000) / RAD
  return { azimuth: ((Math.atan2(e, n) / RAD) % 360 + 360) % 360, altitude: apparentAltitude(altitude), km: Math.hypot(km, upM / 1000) }
}

/** Directions of a track every `stepKm` from `from` to `to` (km along it). */
function trackDirs(track: TrackLine, from: number, to: number, stepKm: number) {
  const h = track.headingDeg * RAD
  const n = Math.max(1, Math.ceil(Math.abs(to - from) / stepKm))
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = from + ((to - from) * i) / n
    return skyDirection(track.e + s * Math.sin(h), track.n + s * Math.cos(h), track.heightM)
  })
}

type SkyPoint = { x: number; y: number; km: number; altitude: number }

/**
 * The frame a contrail is drawn in (C10 fix): tangent to the sky at `centre`, anchored where the high cloud is drawn there
 * (on the dome), at the sky's px per degree across at that height. A trail is a straight line in space, so on the sky a
 * great circle: gnomonic in this frame it is straight (the earth's curve bends it a little), never an arch or a hook.
 */
function trailFrame(world: WorldState, geom: SkyGeom, centre: { azimuth: number; altitude: number }): TangentFrame {
  return tangentFrame(centre, [geom.x(centre.azimuth), geom.dome(centre.altitude)], tangentScale(world, geom, centre.altitude), world.camera.handed)
}

/** A track's directions in a frame (null past its reach). */
const inFrame = (frame: TangentFrame, dirs: ReturnType<typeof trackDirs>): (SkyPoint | null)[] => dirs.map((d) => {
  const p = gnomonic(frame, d)
  return p ? { x: p[0], y: p[1], km: d.km, altitude: d.altitude } : null
})

/** The middle of the stretch of a track that is up in the view (its true place), where its frame is centred; null if none. */
function middleInView(geom: SkyGeom, dirs: ReturnType<typeof trackDirs>) {
  let best: number[] = [], cur: number[] = []
  dirs.forEach((d, i) => {
    if (d.altitude > 3 && Math.abs(geom.x(d.azimuth) - geom.width / 2) < geom.width * 0.6) cur.push(i)
    else { if (cur.length > best.length) best = cur; cur = [] }
  })
  if (cur.length > best.length) best = cur
  return best.length ? dirs[best[Math.floor(best.length / 2)]] : null
}

/** The most trails (persisting, or old and spread) drawn at once. */
export const MAX_TRAILS = 4

/** The contrails and the airliners at cruise (sky, at the high cloud's level). */
export function contrailLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), crest = crestOf(world, box, geom)): LayerDesc10[] {
  const { aircraft } = world.life
  const out: LayerDesc10[] = []
  if (!aircraft.high.length && !aircraft.old.length) return out
  const sky = skyAt(world, box)
  const sunAlt = world.bodies.sun.altitude
  // A trail is lit by the sun at its height until ~4° after sunset (pink then), else the sky's grey.
  const lightAt = mixRgb(world.light.colour, [1, 1, 1], smoothstep(2, 15, sunAlt) * 0.7)
  const shown = smoothstep(-4.5, -1.5, sunAlt)
  const drift = aircraft.drift * geom.s
  const visible = (p: SkyPoint | null): p is SkyPoint => !!p && p.x > -60 && p.x < geom.width + 60 && p.y < crest(p.x) - 1 && p.y > -40
  /** `ends`: which ends of the drawn run fade out (the old end of a live trail, both ends of an old one). */
  const trail = (id: string, frame: TangentFrame, pts: (SkyPoint | null)[], widthM: (i: number) => number, alpha: (i: number) => number,
    ends: 'none' | 'both', seed: number, anim: LayerOf<'contrail'>['animated']) => {
    const runs: number[][] = [[]]
    pts.forEach((p, i) => (visible(p) ? runs.at(-1)!.push(i) : runs.at(-1)!.length && runs.push([])))
    const run = runs.sort((a, b) => b.length - a.length)[0]
    if (!run || run.length < 2) return null
    const at = (i: number) => pts[i]!
    const points: Pt[] = run.map((i) => [at(i).x, at(i).y])
    // Width on screen: its true width at its distance in the frame's px a degree, never under a hairline.
    const widths = run.map((i) => Math.max(0.6, Math.min(10, (widthM(i) / (at(i).km * 1000)) / RAD * frame.k * 1.4)))
    const taper = (j: number) => {
      const f = j / (run.length - 1)
      return ends === 'both' ? smoothstep(0, 0.22, f) * smoothstep(0, 0.22, 1 - f) : 1
    }
    const alphas = run.map((i, j) => alpha(i) * taper(j) * shown * (1 - 0.6 * world.air.fade(at(i).km * 0.35)) * smoothstep(0.5, 4, at(i).altitude))
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    points.forEach(([x, y], j) => { x0 = Math.min(x0, x - widths[j]); x1 = Math.max(x1, x + widths[j]); y0 = Math.min(y0, y - widths[j]); y1 = Math.max(y1, y + widths[j]) })
    const mid = at(run[Math.floor(run.length / 2)])
    const rgb = mixRgb(lightAt, sky(mid.altitude), 0.15)
    const shade = mixRgb(sky(mid.altitude), [0.55, 0.58, 0.66], 0.3)
    const bounds = { x: Math.floor(x0) - 2, y: Math.floor(y0) - 2, w: Math.ceil(x1 - x0) + 5, h: Math.ceil(y1 - y0) + 5 }
    return { kind: 'contrail' as const, id, surface: 'sky' as const, z: 6.1, soft: true, points, widths, alphas, rgb, shade, seed, bounds, animated: anim,
      key: layerKey(id, skyBoxKey(box, true), points.map(([x, y]) => [q(x, 1), q(y, 1)]), widths.map((w) => q(w, 0.25)),
        alphas.map((a) => q(a, 0.06)), tone(rgb), tone(shade), anim && JSON.stringify(anim).length) }
  }
  const persists = aircraft.cruise.persists
  // At most a few trails at once: the live ones first, then the old ones.
  let trails = 0
  aircraft.high.forEach((plane, i) => {
    const headDir = trackDirs(plane.track, plane.atKm, plane.atKm + 0.01, 1)[0]
    if (headDir.altitude < 1) return
    // The plane's own frame: tangent at the plane, so it stands at its true place with its trail straight behind it.
    const frame = trailFrame(world, geom, headDir)
    const head = { x: frame.at[0], y: frame.at[1], km: headDir.km, altitude: headDir.altitude }
    if (!visible(head)) return
    // The plane's way across the sky over the next minutes: its track, a point every 30 s, while it stays in view.
    const stepS = 30, toKm = plane.speedMs * stepS / 1000
    const ahead = inFrame(frame, trackDirs(plane.track, plane.atKm, plane.atKm + 40 * toKm, toKm))
    const path: Pt[] = []
    for (const p of ahead) {
      if (!p) break
      path.push([p.x - head.x, p.y - head.y])
      if (!visible(p)) break
    }
    if (path.length < 2) return
    const n = path.length - 1
    const flight: Track = { path, step: stepS, cycle: n * stepS + 60, at: 0 }
    const k = Math.max(0.85, Math.min(1.3, geom.s))
    const size = 3.2 * k
    const angle = Math.atan2(path[1][1], path[1][0])
    const lit = mixRgb(lightAt, [1, 1, 1], 0.2)
    const body = mixRgb([0.5, 0.52, 0.56], sky(head.altitude), 0.35)
    if (persists && trails < MAX_TRAILS) {
      // The long trail behind it, laid as the plane goes (its wake), spreading toward its old end.
      const from = plane.atKm - plane.trailKm, to = plane.atKm + n * toKm
      const pts = inFrame(frame, trackDirs(plane.track, from, to, 3))
      const tailP = inFrame(frame, trackDirs(plane.track, from, from + 0.01, 1))[0]
      const along = (j: number) => from + j * ((to - from) / (pts.length - 1))
      const age = (j: number) => Math.max(0, plane.atKm - along(j))
      const layer = trail(`contrail.${i}`, frame, pts, (j) => 40 + plane.spreadM * Math.min(1, age(j) / plane.trailKm),
        // Fading out over its oldest quarter (its age along it, not where the view cuts it).
        (j) => (0.62 - 0.3 * Math.min(1, age(j) / plane.trailKm)) * (1 - smoothstep(0.7, 1, age(j) / plane.trailKm)), 'none', plane.seed,
        { mode: 'settle', wake: { ...flight, tail: Math.max(-60, Math.min(geom.width + 60, tailP ? tailP.x : head.x - Math.sign(path[1][0]) * geom.width)), head: head.x } })
      if (layer) { out.push(layer); trails++ }
    }
    // The short trail of a non-persistent contrail: px behind the plane (its km at the plane's distance), fresh and thin.
    const shortPx = persists ? 0 : (plane.trailKm / head.km) / RAD * frame.k
    out.push(aircraftLayer(box, `aircraft.high.${i}`, 6.15, head.x, head.y, angle, size, body, lit, 0, false, shortPx,
      mixRgb(lightAt, sky(head.altitude), 0.1), plane.seed, flight))
  })
  aircraft.old.forEach((t, i) => {
    if (trails >= MAX_TRAILS) return
    const dirs = trackDirs(t.track, t.track.from, t.track.to, 3)
    const centre = middleInView(geom, dirs)
    if (!centre) return
    const frame = trailFrame(world, geom, centre)
    const pts = inFrame(frame, dirs)
    const layer = trail(`contrail.old.${i}`, frame, pts, () => t.spreadM, () => 0.3, 'both', t.seed,
      drift ? { mode: 'drift', speed: drift, period: geom.period } : undefined)
    if (layer) { out.push(layer); trails++ }
  })
  return out
}

type LayerDesc10 = LayerOf<'contrail'> | LayerOf<'aircraft'>

function aircraftLayer(box: SceneBox, id: string, z: number, x: number, y: number, angle: number, size: number, rgb: RGB, lit: RGB,
  lights: number, landing: boolean, trail: number, trailRgb: RGB, seed: number, flight: Track | null): LayerOf<'aircraft'> {
  const reach = Math.max(size * 2 + 4, trail + size + 3) + (lights ? 5 : 0)
  const bounds = { x: Math.floor(x - reach), y: Math.floor(y - reach), w: Math.ceil(2 * reach) + 1, h: Math.ceil(2 * reach) + 1 }
  // By night a strip for the strobes and the beacon (their own rhythms over one second); by day none.
  const frames = lights > 0 ? { count: 10, fps: 10 } : undefined
  return {
    kind: 'aircraft', id, surface: 'sky', z, x, y, angle, size, rgb, lit, lights, landing, trail, trailRgb, seed, bounds,
    ...(flight || frames ? { animated: { mode: frames ? 'frames' as const : 'settle' as const, ...(frames ? { frames } : {}), ...(flight ? { flight } : {}) } } : {}),
    key: layerKey(id, skyBoxKey(box), bounds.x, bounds.y, bounds.w, q(angle, 0.05), q(size, 0.2), tone(rgb), tone(lit), q(lights, 0.1), landing, q(trail, 0.5),
      tone(trailRgb), flight && [flight.path.length, q(flight.step, 0.1), q(flight.cycle, 1), q(flight.at, 0.5)]),
  }
}

/** The approach and departure traffic near the airports within reach, where its path shows over the land. */
export function lowPlaneLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box), crest = crestOf(world, box, geom)): LayerOf<'aircraft'>[] {
  const sky = skyAt(world, box)
  const out: LayerOf<'aircraft'>[] = []
  const night = world.night.dark
  world.life.aircraft.low.forEach((plane: LowPlane, i) => {
    const pts = plane.path.map((p) => {
      const d = skyDirection(p.e, p.n, p.up)
      return { x: geom.x(d.azimuth), y: geom.y(d.altitude), km: d.km, altitude: d.altitude }
    })
    // The longest run of the path in view, over the land, close enough to make out (by night its lights carry farther).
    const reach = night > 0.5 ? 40 : plane.light ? 9 : 25
    const ok = (p: (typeof pts)[number]) => p.x > 2 && p.x < geom.width - 2 && p.y < crest(p.x) - 2 && p.km < reach
    let best: number[] = [], cur: number[] = []
    pts.forEach((p, j) => { if (ok(p)) { cur.push(j) } else { if (cur.length > best.length) best = cur; cur = [] } })
    if (cur.length > best.length) best = cur
    if (best.length < 2) return
    // Arrivals fly in toward the field (down the path's points), departures out.
    const run = plane.kind === 'arrive' ? [...best].reverse() : best
    const at = run[Math.min(run.length - 1, Math.floor(plane.at0 * (run.length - 1)))]
    const p0 = pts[at]
    const stepS = 500 / plane.speedMs
    const path: Pt[] = run.map((j) => [pts[j].x - p0.x, pts[j].y - p0.y])
    const atS = run.indexOf(at) * stepS
    const flight: Track = { path, step: stepS, cycle: Math.max((path.length - 1) * stepS + 5, plane.everyS), at: atS }
    const next = pts[run[Math.min(run.length - 1, run.indexOf(at) + 1)]], prev = pts[run[Math.max(0, run.indexOf(at) - 1)]]
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x)
    // Its size: a jet's 35 m (a light plane's 11 m) at its distance, drawn a little larger than true to be seen, 2.5–9 px.
    const span = plane.light ? 11 : 35
    const size = Math.max(2.5, Math.min(9, (span / (p0.km * 1000)) / RAD * world.camera.pxPerDeg * geom.s * 9))
    const fade = world.air.fade(p0.km)
    const body = mixRgb(mixRgb([0.82, 0.84, 0.88], world.light.ambient, 0.4), sky(p0.altitude), Math.min(0.8, fade))
    const lit = mixRgb(mixRgb([1, 1, 1], world.light.colour, 0.3), sky(p0.altitude), Math.min(0.8, fade))
    const lights = smoothstep(0.2, 0.7, night)
    out.push(aircraftLayer(box, `aircraft.low.${i}`, 9.4, p0.x, p0.y, angle, size, body, lit, lights, plane.kind === 'arrive', 0, body,
      plane.seed, flight))
  })
  return out
}

/* Meteors. */

/** How many meteor layers a shower night keeps: each its own spot, its own seeded schedule. */
const METEOR_SPOTS = 6
/** The share of the sky a meteor seen over the scene falls in (the sky surface's dome over the land). */
const SKY_SHARE = 0.3

/** The meteors of a shower night (sky): streaks pointing away from the radiant, each at its own seeded moments. */
export function meteorLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'meteor'>[] {
  const m = world.life.meteors
  if (!m) return []
  const crest = crestOf(world, box, geom)
  const rx = geom.x(m.radiant.azimuth), ry = geom.dome(m.radiant.altitude)
  // Seconds between meteors in view, then per spot.
  const mean = 3600 / Math.max(0.5, m.perHour * SKY_SHARE)
  const out: LayerOf<'meteor'>[] = []
  const r = seeded(hashId(`${world.place.id}:meteors:${world.at.slice(0, 13)}`))
  for (let i = 0; i < METEOR_SPOTS; i++) {
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
    const id = `meteor.${i}`
    const each = mean * METEOR_SPOTS
    const pulse = { seed: hashId(`${id}:${world.place.id}:${world.at.slice(0, 13)}`), first: r() * each, every: [0.4 * each, 1.6 * each] as [number, number],
      look: 'meteor' as const, cycle: Math.max(600, 6 * each) }
    const rgb: RGB = m.speed > 55 ? [0.86, 0.93, 1] : [1, 0.95, 0.82]
    out.push({ kind: 'meteor', id, surface: 'sky', z: 2.4, x0: x, y0: y, x1, y1,
      width: 1.1 * Math.max(0.85, geom.s), rgb, bounds, animated: { mode: 'settle', pulse },
      key: layerKey(id, skyBoxKey(box), bounds.x, bounds.y, bounds.w, bounds.h, q(x1, 0.5), q(y1, 0.5), tone(rgb)) })
  }
  return out
}
