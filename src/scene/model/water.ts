//# allFunctionsCalledOnLoad
import { waterLayer } from '../../data/water/glint'
import type { WaterSpan } from '../../data/water/waterInView'
import { hashId, seeded } from '../../data/landmarks/hash'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import { seaSpan } from '../../world/seaLine'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { aerialFor, hazeOf, toneAt } from './planeLight'
import { skyAt } from './sky'
import { mixRgb, rgbOf } from './tone'
import type { Box, GlintPath, LayerOf, Pt, RGB, SceneBox, Streak, WaterBand } from './types'

type WaterName = 'far' | 'near'

/** Draw order on the land surface: far water lies on the far land (under its towns), near water over the near plane. */
const Z: Record<WaterName, number> = { far: 15, near: 35 }
/** The water's own colour where it sends back no sky: deep, a little green-blue (scaled by the light of the hour). */
const DEEP: RGB = [0.06, 0.17, 0.21]
/** The sun's path on the water in its own colour, the moon's silver. */
const MOONLIT: RGB = [0.88, 0.91, 0.96]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0
/** A light 1-2-1 smoothing along the span, as the SVG's water has (the DEM's and the mask's steps out of the edge). */
const smooth = (values: number[]) => values.map((v, i) =>
  (values[Math.max(0, i - 1)] + 2 * v + values[Math.min(values.length - 1, i + 1)]) / 4)

/**
 * The share of light still water reflects at a grazing angle `depressionDeg` below the horizon (Schlick's Fresnel term for
 * water, 2 % straight down): ~90 % a degree under the horizon, ~40 % at ten degrees. So far water is a mirror of the
 * sky at the horizon, and water nearer the eye shows more of its own dark.
 */
export function fresnel(depressionDeg: number): number {
  const cos = Math.sin(Math.max(0.05, depressionDeg) * Math.PI / 180)
  return 0.02 + 0.98 * (1 - cos) ** 5
}

const hits = (clear: readonly Box[], x: number, y: number, w: number, h: number) =>
  clear.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)

/** A span's surface in the box: x along it, its far and near edges smoothed (as the SVG's `waterPath`). */
interface Shape {
  xs: number[]; farY: number[]; nearY: number[]
  points: Pt[]; far: Pt[]; top: number; bottom: number
  /** Medians over the span: the edges' y, depression (deg, + below eye level) and distance (km). */
  far0: { y: number; dep: number; km: number }; near0: { y: number; dep: number; km: number }
  /** The land standing over the water's far edge (the higher of the two crests there): its angle (deg) and distance. */
  land: { angle: number; km: number }
}

const shapes = new WeakMap<WaterSpan, Map<number, Shape>>()

/** The altitude (deg) drawn at a y of the land (the relief is odd and rising: bisection). */
function angleAt(world: WorldState, y: number): number {
  let lo = -30, hi = 30
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (world.relief.y(mid) > y) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function shapeOf(world: WorldState, span: WaterSpan, box: SceneBox): Shape {
  let byWidth = shapes.get(span)
  if (!byWidth) shapes.set(span, byWidth = new Map())
  const cached = byWidth.get(box.width)
  if (cached) return cached
  const sx = box.width / SCENE_W
  const { edges } = span
  const xs = edges.map((edge, i) => (i === 0 ? span.from : i === edges.length - 1 ? span.to : edge.x) * sx)
  const farY = smooth(edges.map((edge) => edge.farY))
  const nearY = smooth(edges.map((edge) => edge.nearY)).map((y, i) => Math.max(y, farY[i]))
  const far: Pt[] = xs.map((x, i) => [x, farY[i]])
  const points: Pt[] = [...far, ...xs.map((x, i): Pt => [x, nearY[i]]).reverse()]
  // The land over the far edge in each direction: the crest standing highest there, near or far.
  const { near: nearPlane, far: farPlane } = world.terrain
  const over = edges.map((edge) => {
    const ny = nearPlane.points.length > 1 ? lineAt(nearPlane.points, edge.x) : Infinity
    const fy = farPlane.points.length > 1 ? lineAt(farPlane.points, edge.x) : Infinity
    const plane = fy < ny ? farPlane : nearPlane
    const i = Math.max(0, plane.points.findIndex(([px]) => px >= edge.x))
    return { y: Math.min(ny, fy), km: (plane.hazeKm ?? plane.distanceKm)[i] ?? span.distanceKm }
  })
  const landY = median(over.map((o) => o.y))
  const shape: Shape = {
    land: { angle: Number.isFinite(landY) ? angleAt(world, landY) : -90, km: median(over.map((o) => o.km)) },
    xs, farY, nearY, points, far, top: Math.min(...farY), bottom: Math.max(...nearY),
    far0: { y: median(farY), dep: -median(edges.map((e) => e.farAngle)), km: median(edges.map((e) => e.farKm)) },
    near0: { y: median(nearY), dep: -median(edges.map((e) => e.nearAngle)), km: median(edges.map((e) => e.nearKm)) },
  }
  byWidth.set(box.width, shape)
  return shape
}

/**
 * What the water shows at a row of the screen, shared by every span (both planes), so water at one height is one tone
 * however the spans split it: its distance there (the spans' edges binned by row, farther never lower on screen) and the
 * land standing over the far shores (the median over all spans: its angle and distance).
 */
interface Surface { kmAt: (y: number) => number; land: { angle: number; km: number } }
const surfaces = new WeakMap<readonly WaterSpan[], Map<number, Surface>>()

function surfaceOf(world: WorldState, box: SceneBox): Surface {
  const spans = world.water.spans
  let byWidth = surfaces.get(spans)
  if (!byWidth) surfaces.set(spans, byWidth = new Map())
  const cached = byWidth.get(box.width)
  if (cached) return cached
  const bins = new Map<number, number[]>()
  const add = (y: number, km: number) => {
    const row = Math.round(y)
    bins.set(row, [...bins.get(row) ?? [], km])
  }
  for (const span of spans) for (const e of span.edges) { add(e.farY, e.farKm); add(e.nearY, e.nearKm) }
  const rows = [...bins.keys()].sort((a, b) => b - a)
  // From the nearest row up: the median distance of each row, never nearer than the row below it.
  const known: [number, number][] = []
  let floor = 0
  for (const row of rows) {
    floor = Math.max(floor, median(bins.get(row)!))
    known.push([row, floor])
  }
  known.reverse()
  const kmAt = (y: number) => {
    if (!known.length) return 0
    if (y <= known[0][0]) return known[0][1]
    for (let i = 1; i < known.length; i++) {
      const [y1, k1] = known[i]
      if (y <= y1) { const [y0, k0] = known[i - 1]; return lerp(k0, k1, (y - y0) / ((y1 - y0) || 1)) }
    }
    return known.at(-1)![1]
  }
  const shapes = spans.map((span) => shapeOf(world, span, box))
  const surface = { kmAt, land: { angle: median(shapes.map((sh) => sh.land.angle)), km: median(shapes.map((sh) => sh.land.km)) } }
  byWidth.set(box.width, surface)
  return surface
}

/** The surface's far and near edge at an x inside it. */
function edgeAt(shape: Shape, x: number): [number, number] {
  const { xs, farY, nearY } = shape
  let i = 1
  while (i < xs.length - 1 && xs[i] < x) i++
  const t = clamp01((x - xs[i - 1]) / ((xs[i] - xs[i - 1]) || 1))
  return [lerp(farY[i - 1], farY[i], t), lerp(nearY[i - 1], nearY[i], t)]
}

/**
 * Ripples the one wind raises on a span (the world's `water.ripples`): calm water keeps a few long glassy bands, a breeze
 * breaks it into many short ripples, gathered in patches with slicks between; shorter and fainter toward the far edge
 * (perspective). Some facets tilt toward the eye and mirror the low sky (light), the rest away and mirror the higher sky
 * (dark): mostly light on calm water, as many dark as light in a breeze. Kept out of the text zones.
 */
function ruffleOf(world: WorldState, index: number, box: SceneBox, clear: readonly Box[]) {
  const w = clamp01(world.wind.ms / 9)
  const pool = world.water.ripples[index] ?? []
  const sx = box.width / SCENE_W
  const count = Math.round(pool.length * 4.5 / lerp(14, 4.5, w))
  const gate = lerp(0.55, 0.42, w), litShare = lerp(0.75, 0.5, w), base = lerp(10, 2.4, w)
  const lit: Streak[] = [], shade: Streak[] = []
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const r = pool[i]
    if (r.gate < gate) continue
    const len = base * (0.35 + 0.65 * r.v) * (0.6 + 0.8 * r.length) * sx
    const streak = { x: r.x * sx - len / 2, y: r.y, w: len, alpha: lerp(0.3, 0.4, w) * (0.45 + 0.55 * r.v) * (0.6 + 0.4 * r.strength) }
    if (hits(clear, streak.x, r.y - 0.3, len, 0.6)) continue
    ;(r.side < litShare ? lit : shade).push(streak)
  }
  return { lit, shade }
}

/**
 * The water of one plane (stage C3), from the world's spans (`data/water/`: each body at its true bearing and distance)
 * and its light, for every place alike:
 * - **surface**: still water mirrors the sky at the angle it is seen below the horizon (`fresnel`): the far edge the sky
 *   at the horizon, nearer the eye more of the higher sky and of the water's own dark; then the air at that distance
 *   (`aerialFor`, the land's own rule), so far water fades into the haze with the land round it;
 * - **rim**: a fine light line along the far edge (the horizon or the far shore mirrored at grazing angle);
 * - **ruffle** by the one wind (`ruffleOf`);
 * - **glint**: the light's path only where the world puts it (`water.glints`: the sun or moon over the span, above the land
 *   in its direction, strength by the wave slopes the wind raises), widening toward the eye, wider in more wind;
 * - **datum** (far layer): the dashed "פני הים" line where sea level meets the slopes, only below sea level.
 */
export function waterOnPlane(world: WorldState, box: SceneBox, name: WaterName, clear: readonly Box[]): LayerOf<'water'> | null {
  const { water, light, night } = world
  const sx = box.width / SCENE_W
  const spans = water.spans.map((span, index) => ({ span, index })).filter(({ span }) => waterLayer(span) === name)
  const datumOn = name === 'far' && world.labels.height.below && world.terrain.near.points.length > 1
  if (!spans.length && !datumOn) return null

  const sky = skyAt(world, box)
  const haze = hazeOf(world)
  const aerial = aerialFor(world, haze)
  const dark = night.dark
  // The water's own dark, lit by the hour: deep blue-green by day, near the night land's own dark by night.
  const body = mixRgb(mixRgb(rgbOf(light.palette.ridgeNear), DEEP, 0.55 * (1 - dark)), [0, 0, 0], 0.15)
  // Calm water mirrors the land over its far shore; ripples break the image up and mix in the higher sky.
  const still = lerp(0.85, 0.35, clamp01(world.wind.ms / 6))
  // Waves tilt the facets (Cox–Munk: slope variance 0.003 + 0.00512 × wind): on the whole the surface mirrors the sky
  // higher than the flat mirror would, by about the facets' own tilt (bluer and darker in more wind).
  const tilt = Math.atan(Math.sqrt(0.003 + 0.00512 * world.wind.ms)) * 180 / Math.PI
  const surface = surfaceOf(world, box)
  const land = surface.land
  const landTone = toneAt(world, land.km, haze)
  // The surface at a row: seen that far below eye level and that far away.
  const surfaceAt = (y: number) => {
    const dep = Math.max(0.1, -angleAt(world, y))
    const mirrored = mixRgb(sky(dep + 1.6 * tilt), landTone, still * smoothstep(dep - 0.2, dep + 0.2, land.angle))
    return aerial(mixRgb(body, mirrored, fresnel(dep + tilt)), surface.kmAt(y))
  }
  const bands: WaterBand[] = []
  const lit: Streak[] = [], shade: Streak[] = []
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (const { span, index } of spans) {
    const shape = shapeOf(world, span, box)
    const { far0 } = shape
    const stops = [0, 0.25, 0.5, 0.75, 1].map((t): [number, RGB] => [t, surfaceAt(lerp(shape.top, shape.bottom, t))])
    const rim = { rgb: aerial(mixRgb(sky(0.3), [1, 1, 1], 0.35 * (1 - dark)), far0.km),
      alpha: 0.3 * (1 - 0.55 * dark) * fresnel(Math.max(0.1, far0.dep)) }
    bands.push({ points: shape.points, far: shape.far, top: shape.top, bottom: shape.bottom, stops, rim })
    const ruffle = ruffleOf(world, index, box, clear)
    const fadeAt = (y: number) => 1 - 0.9 * world.air.fade(surface.kmAt(y))
    for (const s of ruffle.lit) lit.push({ x: s.x, y: s.y, w: s.w, alpha: s.alpha * fadeAt(s.y) })
    for (const s of ruffle.shade) shade.push({ x: s.x, y: s.y, w: s.w, alpha: s.alpha * fadeAt(s.y) })
    left = Math.min(left, shape.xs[0]); right = Math.max(right, shape.xs.at(-1)!)
    top = Math.min(top, shape.top); bottom = Math.max(bottom, shape.bottom)
  }

  // The light's path, where the world puts it.
  const windiness = clamp01(world.wind.ms / 9)
  const slope = Math.sqrt(0.003 + 0.00512 * world.wind.ms)
  const glintRgb = water.byMoon ? MOONLIT : mixRgb(light.colour, [1, 1, 1], 0.5)
  const glints = water.glints.flatMap((glint): GlintPath[] => {
    const span = water.spans[glint.span]
    if (waterLayer(span) !== name) return []
    const shape = shapeOf(world, span, box)
    const x = glint.x * sx
    const [gTop, gBottom] = edgeAt(shape, x)
    const depth = Math.max(0.8, gBottom - gTop)
    const spread = 0.15 + 2.2 * slope
    // The share of facets is small, but each sends back the sun itself (or the moon): a few per cent already blaze.
    const alpha = 1 - Math.exp(-12 * glint.opacity)
    const random = seeded(hashId(`${world.place.id}:glint:${glint.span}`))
    const sparks: Streak[] = []
    const count = Math.round(depth * lerp(3, 8, windiness))
    for (let i = 0; i < count; i++) {
      const v = random(), a = random(), b = random(), c = random()
      const half = 0.5 + v * depth * spread
      // A rough normal spread across the path (sum of two uniforms), brighter near its middle.
      const across = (a + b - 1) * half * 1.6
      const w = lerp(2.6, 1, windiness) * (0.45 + v) * (0.6 + 0.6 * c)
      const y = gTop + 0.3 + v * (depth - 0.6)
      const sx0 = x + across - w / 2
      const strength = alpha * Math.exp(-((across / half) ** 2)) * (0.45 + 0.55 * c)
      if (strength < 0.03 || hits(clear, sx0, y - 0.3, w, 0.6)) continue
      if (sx0 + w < shape.xs[0] || sx0 > shape.xs.at(-1)!) continue
      sparks.push({ x: sx0, y, w, alpha: strength })
    }
    return [{ x, top: gTop, bottom: gTop + depth, spread, rgb: glintRgb, alpha, sparks }]
  })

  let datum: LayerOf<'water'>['datum'] = null
  if (datumOn) {
    const { x1, x2 } = seaSpan(world.terrain.near.points, world.terrain.seaY)
    datum = { x1: x1 * sx, x2: x2 * sx, y: world.terrain.seaY, rgb: rgbOf(light.palette.ink), alpha: 0.38 }
    left = Math.min(left, datum.x1); right = Math.max(right, datum.x2)
    top = Math.min(top, datum.y - 1); bottom = Math.max(bottom, datum.y + 1)
  }
  const x0 = Math.max(0, Math.floor(left - 2)), y0 = Math.max(0, Math.floor(top - 2))
  const bounds = { x: x0, y: y0, w: Math.max(1, Math.min(box.width, Math.ceil(right + 2)) - x0),
    h: Math.max(1, Math.min(box.landHeight, Math.ceil(bottom + 2)) - y0) }
  const lightKey = layerKey('water.light', name, world.keys.terrain, world.keys.water, world.keys.light, world.keys.air,
    Math.round(world.wind.ms), world.keys.night, world.labels.height.below, clear.map((b) => [b.x, b.y, b.w, b.h]), landBoxKey(box))
  return {
    kind: 'water', id: `water.${name}`, surface: 'land', z: Z[name], bounds,
    // All of the water is light (the sky it mirrors, the hour's glint, the wind's ripples, the datum in the ink of the
    // hour): its form is only its place, so a scrub frame repaints the light canvas alone (§1d), and a datum alone only
    // when the ink turns.
    key: layerKey('water', name, world.keys.terrain, datum && [datum.x1, datum.x2, datum.y], landBoxKey(box)),
    light: { key: bands.length ? lightKey : layerKey('water.datum', datum && colourKey(datum.rgb), landBoxKey(box)),
      blend: 'source-over', tint: bands[0]?.stops[0][1] ?? body, faces: [] },
    bands, ruffle: { light: aerial(mixRgb(sky(0.2), [1, 1, 1], 0.18 * (1 - dark)), median(spans.map(({ span }) => span.distanceKm))),
      dark: mixRgb(sky(25), body, 0.5), lit, shade },
    glints, datum,
  }
}

/** The water on both planes (C3): far water under the far towns, near water over the near plane. */
export function waterLayers(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'water'>[] {
  return (['far', 'near'] as const).flatMap((name) => {
    const layer = waterOnPlane(world, box, name, clear)
    return layer ? [layer] : []
  })
}
