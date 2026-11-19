import { hashId, seeded } from '../data/landmarks/hash'
import type { Glint, WaterLight } from '../data/water/glint'
import { fractal } from '../scene/paint/core'
import type { WaterSpan } from '../data/water/waterInView'
import type { SceneTerrain } from '../data/terrain/terrain'
import { xOf, type Camera } from '../domain/camera'
import type { LocalTime } from '../domain/types'
import type { Skyline } from './skyline'
import type { Ripple, WaterState } from './types'
import { waterLight } from './waterLight'

/** A glint whose share of facets sends back less than this is not drawn (a 1 % share of the sun is still bright). */
const MIN_SHARE = 0.004

/**
 * The share of wave facets that send the light at `altitudeDeg` to the eye from water seen `depressionDeg` below eye
 * level: a facet must tilt from level by half the angle between the incoming and the reflected ray, (altitude −
 * depression) / 2 (a flat mirror sends the light back where depression = altitude), and the share tilted that far falls
 * off as Cox and Munk measured (slope variance 0.003 + 0.00512 × wind in m/s).
 *
 * (`data/water/glint.ts`'s `glitter`, which the frozen SVG scene uses, adds the two angles; the canvas scene takes the
 * mirror's own geometry. The SVG's is left as it is until it goes, stage C9.)
 */
export function facetShare(altitudeDeg: number, depressionDeg: number, windMs: number): number {
  const tilt = ((altitudeDeg - depressionDeg) / 2) * (Math.PI / 180)
  return Math.exp(-(Math.tan(tilt) ** 2) / (0.003 + 0.00512 * windMs))
}

/**
 * The light's path on the water in view: on the span the light's azimuth stands over, only when the light is up and
 * above the land in its own direction (`lit`); its strength the light's (cloud, the moon's phase) times the share of
 * facets the one wind tilts to send it to the eye, at the best of the span's near and far edges under the light.
 */
export function glintsOf(spans: readonly WaterSpan[], light: WaterLight | null, lit: boolean, camera: Camera,
  windMs: number): Glint[] {
  if (!light || !lit || light.altitude <= 0 || light.strength <= 0) return []
  const x = xOf(light.azimuth, camera)
  return spans.flatMap((span, index) => {
    if (x < span.from || x > span.to) return []
    const edge = span.edges.reduce((best, e) => Math.abs(e.x - x) < Math.abs(best.x - x) ? e : best)
    const share = Math.max(facetShare(light.altitude, -edge.farAngle, windMs), facetShare(light.altitude, -edge.nearAngle, windMs))
    const opacity = light.strength * share
    return opacity >= MIN_SHARE ? [{ span: index, edge, x, opacity }] : []
  })
}

/** Ripples a span can show at most (the windiest water). */
const MAX_RIPPLES = 1400

const smooth = (values: number[]) => values.map((v, i) =>
  (values[Math.max(0, i - 1)] + 2 * v + values[Math.min(values.length - 1, i + 1)]) / 4)

/**
 * The places ripples can take on each span (scene px at the reference width; seeded by the place and the span, built
 * once with the terrain, never per hour): as many as the windiest water shows, in a seeded order, so a lighter wind shows
 * the first share of them. Each has its spot on the surface (the span's edges smoothed as the drawing smooths them), its
 * place down the surface (`v`, 0 far … 1 near), seeded draws for its length, side and strength, and `gate`: a
 * low-frequency field across and down the water (the wind ruffles water in patches and bands, cat's-paws, with glassy
 * slicks between) that decides where ripples gather.
 */
export function ripplesOf(spans: readonly WaterSpan[], placeId: string): Ripple[][] {
  return spans.map((span, index) => {
    const { edges } = span
    const xs = edges.map((edge, i) => (i === 0 ? span.from : i === edges.length - 1 ? span.to : edge.x))
    const farY = smooth(edges.map((e) => e.farY))
    const nearY = smooth(edges.map((e) => e.nearY)).map((y, i) => Math.max(y, farY[i]))
    const width = xs.at(-1)! - xs[0]
    const area = xs.reduce((sum, _, i) => sum + (nearY[i] - farY[i]), 0) / Math.max(1, xs.length) * width
    const seed = hashId(`${placeId}:water:${index}`)
    const random = seeded(seed)
    const out: Ripple[] = []
    for (let i = 0; i < Math.min(MAX_RIPPLES, Math.round(area / 4.5)); i++) {
      const x = xs[0] + random() * width
      const v = random(), length = random(), side = random(), strength = random()
      let k = 1
      while (k < xs.length - 1 && xs[k] < x) k++
      const t = Math.min(1, Math.max(0, (x - xs[k - 1]) / ((xs[k] - xs[k - 1]) || 1)))
      const top = farY[k - 1] + (farY[k] - farY[k - 1]) * t, bottom = nearY[k - 1] + (nearY[k] - nearY[k - 1]) * t
      if (bottom - top < 1) { out.push({ x, y: top, v, length, side, strength, gate: -1 }); continue }
      const y = top + 0.35 + v * (bottom - top - 0.7)
      out.push({ x, y, v, length, side, strength, gate: fractal(seed, x, y, 0.045, 0.3, 2) })
    }
    return out
  })
}

/**
 * The water really in view (`data/water/`, at its true bearing and distance) and the light's path on it, under the sun
 * (or the moon by night), its strength by the wave slopes the one wind raises.
 */
export function waterOf(at: LocalTime, site: { lat: number; lon: number; timezone: string }, terrain: SceneTerrain,
  skyline: Skyline, cloudCover: number, camera: Camera, windMs: number, ripples: Ripple[][] = []): WaterState {
  const spans = terrain.water ?? []
  if (!spans.length) return { spans: [], glints: [], ripples: [], light: null, lit: false, byMoon: false, coastalSea: null }
  const { light, lit, moon } = waterLight(at, site, terrain, skyline, cloudCover)
  return { spans, glints: glintsOf(spans, light, lit, camera, windMs), ripples, light, lit, byMoon: moon, coastalSea: null }
}
