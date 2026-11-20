//# allFunctionsCalledOnLoad
import { BOW, HALO_DEG, onCircle } from '../../world/optics'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { crestOf } from './life'
import { skyGeom, type SkyGeom } from './sky'
import type { ArcDesc, LayerOf, Pt, RGB, SceneBox } from './types'

/*
 * The sky's optics (C10) as layers: the rainbow round the antisolar point and the 22° halo with its sun dogs round the sun,
 * each circle traced on the sky (spherical, `onCircle`) and projected through the bodies' own scale, so the bow and the ring
 * stand where the sun's geometry puts them.
 */

const q = (v: number, step: number) => Math.round(v / step)

/** The primary's bands from outside in (red at 42.3° … violet at 40.6°); the secondary's reversed and wider. */
const SPECTRUM: [number, RGB][] = [
  [0, [0.95, 0.25, 0.2]], [0.2, [1, 0.55, 0.15]], [0.38, [1, 0.88, 0.25]], [0.56, [0.35, 0.8, 0.35]], [0.76, [0.3, 0.5, 0.95]], [1, [0.55, 0.35, 0.85]],
]

/** Points of a circle of `radius` (deg) round a centre, every 2°, projected; null where it is under the land or off the sky. */
function circle(geom: SkyGeom, crest: (x: number) => number, centre: { azimuth: number; altitude: number }, radius: number) {
  const out: ({ p: Pt; alt: number } | null)[] = []
  for (let t = -180; t <= 180; t += 2) {
    const d = onCircle(centre, radius, (t * Math.PI) / 180)
    const p: Pt = [geom.x(d.azimuth), geom.y(d.altitude)]
    out.push(d.altitude > -0.5 && p[1] < crest(p[0]) + 2 && p[0] > -2 && p[0] < geom.width + 2 ? { p, alt: d.altitude } : null)
  }
  return out
}

/** The longest unbroken stretch of a traced circle. */
function longest<T>(pts: (T | null)[]): T[] {
  let best: T[] = [], cur: T[] = []
  for (const p of [...pts, null]) {
    if (p) cur.push(p)
    else { if (cur.length > best.length) best = cur; cur = [] }
  }
  return best
}

const inRange = (az: number, from: number, to: number) => {
  const a = ((az - from) % 360 + 360) % 360, span = ((to - from) % 360 + 360) % 360
  return a <= span
}

/** The rainbow (sky, over the clouds the rain falls from): primary and secondary, brighter where the rain is. */
export function rainbowLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'bow'> | null {
  const bow = world.optics.rainbow
  if (!bow) return null
  const crest = crestOf(world, box, geom)
  const rainAt = (az: number) => {
    let best = bow.around
    for (const r of bow.rain) {
      // The rain's own span, feathered ~10° either side.
      const d = inRange(az, r.from, r.to) ? 0 : Math.min(Math.abs(((az - r.from) % 360 + 540) % 360 - 180), Math.abs(((az - r.to) % 360 + 540) % 360 - 180))
      best = Math.max(best, 1 - smoothstep(0, 12, d))
    }
    return best
  }
  const arcs: ArcDesc[] = []
  const band = (inner: number, outer: number, strength: number, reversed: boolean) => {
    const n = SPECTRUM.length
    SPECTRUM.forEach(([f, rgb], i) => {
      const radius = reversed ? inner + (outer - inner) * f : outer - (outer - inner) * f
      const run = longest(circle(geom, crest, bow.antisolar, radius))
      if (run.length < 3) return
      const pxPerDeg = world.camera.pxPerDeg * geom.s
      arcs.push({ points: run.map((r) => r.p), rgb, width: Math.max(0.9, ((outer - inner) / n) * pxPerDeg * 1.6),
        // Fading into the rain's foot near the ground, and where there is no rain.
        alphas: run.map((r) => strength * rainAt(azimuthOf(world, geom, r.p[0])) * (0.35 + 0.65 * smoothstep(0, 6, r.alt)) * (i === 0 || i === n - 1 ? 0.7 : 1)) })
    })
  }
  band(BOW.primary[0], BOW.primary[1], 0.5 * bow.strength, false)
  if (bow.secondary > 0.03) band(BOW.secondary[0], BOW.secondary[1], 0.5 * bow.secondary, true)
  if (!arcs.length) return null
  // Inside the primary the sky is brighter (the drops' light at every angle under 42°).
  const inner = longest(circle(geom, crest, bow.antisolar, 36)).map((r) => r.p)
  return bowLayer('rainbow', world, box, geom, arcs, [], inner.length > 2 ? { points: inner, alpha: 0.12 * bow.strength } : null, 8.7)
}

/** The 22° halo and the sun dogs (sky, in the high cloud). */
export function haloLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'bow'> | null {
  const halo = world.optics.halo
  if (!halo) return null
  const crest = crestOf(world, box, geom)
  const sun = world.bodies.sun
  // The ring is centred on the sun as drawn: its traced points carried by the drawn disc's offset from the projected one.
  const dx = geom.left + sun.x * geom.s - geom.x(sun.azimuth), dy = box.landTop + sun.y - geom.y(Math.max(-1, sun.altitude))
  const ring = (radius: number) => longest(circle(geom, crest, halo.sun, radius)).map((r): { p: Pt; alt: number } => ({ p: [r.p[0] + dx, r.p[1] + dy], alt: r.alt }))
  const arcs: ArcDesc[] = []
  // Red on the inside edge, a whitish band outward, fading.
  const bands: [number, RGB, number][] = [[HALO_DEG - 0.4, [1, 0.62, 0.45], 0.5], [HALO_DEG, [1, 0.9, 0.78], 0.6], [HALO_DEG + 0.8, [0.92, 0.95, 1], 0.35]]
  for (const [radius, rgb, a] of bands) {
    const run = ring(radius)
    if (run.length < 3) continue
    arcs.push({ points: run.map((r) => r.p), rgb, width: 1.6 * Math.max(0.85, geom.s), alphas: run.map((r) => a * halo.strength * 0.3 * smoothstep(-0.5, 4, r.alt)) })
  }
  const dogs: { x: number; y: number; r: number; alpha: number }[] = []
  if (halo.dogs > 0.04 && halo.dogOffset !== null) {
    for (const side of [-1, 1]) {
      const x = geom.x(halo.sun.azimuth + side * halo.dogOffset) + dx, y = geom.y(halo.sun.altitude) + dy
      if (y < crest(x) - 2 && x > -10 && x < geom.width + 10) dogs.push({ x, y, r: 4.5 * Math.max(0.85, geom.s), alpha: 0.75 * halo.dogs })
    }
  }
  if (!arcs.length && !dogs.length) return null
  return bowLayer('halo', world, box, geom, arcs, dogs, null, 6.2)
}

function bowLayer(look: 'rainbow' | 'halo', world: WorldState, box: SceneBox, geom: SkyGeom, arcs: ArcDesc[], dogs: LayerOf<'bow'>['dogs'],
  inner: LayerOf<'bow'>['inner'], z: number): LayerOf<'bow'> {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  const grow = (x: number, y: number, r: number) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r) }
  for (const a of arcs) for (const [x, y] of a.points) grow(x, y, a.width + 2)
  for (const d of dogs) grow(d.x, d.y, d.r * 3)
  if (inner) for (const [x, y] of inner.points) grow(x, y, 2)
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0))
  x1 = Math.min(geom.width, Math.ceil(x1)); y1 = Math.min(box.skyHeight, Math.ceil(y1))
  const bounds = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
  const id = `bow.${look}`
  return {
    kind: 'bow', id, surface: 'sky', z, soft: true, look, arcs, dogs, inner, bounds,
    key: layerKey(id, skyBoxKey(box, true), arcs.map((a) => [a.points.length, q(a.points[0][0], 0.5), q(a.points[0][1], 0.5), q(a.alphas[0] ?? 0, 0.02),
      q(a.alphas[Math.floor(a.alphas.length / 2)] ?? 0, 0.02)]), dogs.map((d) => [q(d.x, 0.5), q(d.y, 0.5), q(d.alpha, 0.02)]), inner && q(inner.alpha, 0.02),
      world.keys.optics),
  }
}

/** The azimuth (deg) a sky x stands for (the camera's, inverted). */
function azimuthOf(world: WorldState, geom: SkyGeom, x: number): number {
  const c = world.camera
  return c.heading + c.handed * ((x - geom.left) / geom.s - c.width / 2) / c.pxPerDeg
}
