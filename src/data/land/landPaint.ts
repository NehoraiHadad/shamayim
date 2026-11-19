import { azimuthAt } from '../../domain/camera'
import type { Coordinate } from '../landmarks/project'
import { apparentAngle, destination, RAY_DISTANCES } from '../terrain/panorama'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { COVER } from './grid'
import type { LandCover } from './landData'
import { colourAt, REACH_M, type LandColour } from './satellite'

/** What is known about the land around a place: what covers it, and this week's colour of it. */
export interface Land { cover: LandCover | null; colour: LandColour | null }

/** One flat colour and the shapes painted in it (path data in scene px). */
/** `band`: distance in steps of `BAND_KM` (the tint fades with it, smoothly, never in a few hard steps). */
export interface Paint { fill: string; d: string; band: number }

const TREE = COVER.indexOf('tree'), WATER = COVER.indexOf('water')
/** Each channel to coarse steps, so neighbouring ground shares one tone (a drawn land, not a photo mosaic). */
const hex = ([r, g, b]: readonly number[]) => '#' + [r, g, b].map(v => Math.min(255, Math.round(v / 28) * 28).toString(16).padStart(2, '0')).join('')
/** A fallback albedo per cover where the satellite has nothing (outside its window, a cloud gap). */
const BASE: Record<number, [number, number, number]> = {
  1: [92, 112, 70], 2: [150, 140, 100], 3: [170, 160, 110], 4: [160, 150, 100], 5: [170, 165, 160], 6: [200, 180, 150],
  7: [240, 240, 245], 8: [90, 110, 130], 9: [110, 130, 100], 10: [140, 140, 120],
}
/**
 * Each cover's mean colour in this week's scene (beyond the satellite window, a field far off still takes this week's
 * field colour, not a stock one). Kept per `Land` object.
 */
const MEANS = new WeakMap<Land, Record<number, [number, number, number]>>()
function coverMeans(land: Land): Record<number, [number, number, number]> {
  const known = MEANS.get(land)
  if (known) return known
  const sums: Record<number, number[]> = {}
  const { colour, cover } = land
  if (colour && cover) {
    const step = REACH_M / 25
    for (let n = -REACH_M; n <= REACH_M; n += step) {
      for (let e = -REACH_M; e <= REACH_M; e += step) {
        const lat = colour.lat + n / 111_320, lon = colour.lon + e / (111_320 * Math.cos((colour.lat * Math.PI) / 180))
        const rgb = colourAt(colour, lat, lon)
        if (!rgb) continue
        const sum = (sums[cover.coverAt(lat, lon)] ??= [0, 0, 0, 0])
        sum[0] += rgb[0]; sum[1] += rgb[1]; sum[2] += rgb[2]; sum[3]++
      }
    }
  }
  const means = { ...BASE }
  for (const [k, [r, g, b, count]] of Object.entries(sums)) if (count >= 8) means[Number(k)] = [r / count, g / count, b / count]
  MEANS.set(land, means)
  return means
}

/** The satellite's colour around a point (its 100 m cell and the four around it, so edges soften), else the cover's. */
function albedo(land: Land, lat: number, lon: number, cover: number): [number, number, number] | undefined {
  if (!land.colour) return BASE[cover]
  const d = .0012
  const samples = [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]].map(([a, b]) => colourAt(land.colour!, lat + a, lon + b))
    .filter((c): c is [number, number, number] => c !== null)
  if (!samples.length) return coverMeans(land)[cover] ?? BASE[cover]
  const sum = samples.reduce<number[]>((acc, c) => acc.map((v, i) => v + c[i]), [0, 0, 0])
  return sum.map(v => v / samples.length) as [number, number, number]
}
/** Tree crowns stay green under a dry season's dust: the satellite's 100 m colour mixes trees with the ground between. */
const crownOf = (colour: readonly number[]) => colour.map((v, i) => v * .45 + [62, 88, 54][i] * .55)
export const BAND_KM = 1
const bandOf = (km: number) => Math.min(15, Math.floor(km / BAND_KM))

function collect() {
  const paths = new Map<string, Paint>()
  return {
    add(fill: string, band: number, d: string) {
      const key = `${fill}${band}`
      const paint = paths.get(key)
      if (paint) paint.d += d
      else paths.set(key, { fill, band, d })
    },
    done: () => [...paths.values()],
  }
}

/**
 * The visible ground of the backdrop between the stage and `toKm`, in its own colours: along each 3-px column, every
 * sampled point of ground that the place's eye sees (higher in angle than all ground in front of it) is painted from
 * its angle down to the next nearer one, in the colour the satellite saw there. Trees darker, water by the sky's tint
 * (left to the sheet under it). Hidden ground and the stage's band (under `floorY`) stay unpainted.
 */
export function backdropLand(place: Coordinate, land: Land, terrain: SceneTerrain, width: number, toKm = 15): Paint[] {
  const { groundAt, angleY, camera } = terrain
  if (!groundAt || !angleY || !camera || (!land.colour && !land.cover)) return []
  const out = collect()
  const floorY = Infinity
  const step = 3
  for (let left = 0; left < width; left += step) {
    const x = (left + step / 2) * RIDGE_WIDTH / width
    const azimuth = azimuthAt(x / RIDGE_WIDTH, camera)
    let highest = -Infinity
    // The nearest ground seen runs down to the stage's edge (or the bottom of the scene): nothing nearer is backdrop.
    let previousY = Math.min(floorY, 128)
    for (const km of RAY_DISTANCES) {
      if (km > toKm) break
      const height = groundAt(x, km)
      if (height === null) continue
      const angle = apparentAngle(height, km, 0)
      const y = angleY(angle)
      if (angle <= highest) continue
      highest = angle
      const top = Math.min(y, floorY), bottom = Math.min(previousY, floorY)
      previousY = y
      if (bottom - top < .25) continue
      const point = destination(place.lat, place.lon, km, azimuth)
      const cover = land.cover?.coverAt(point.lat, point.lon) ?? 3
      const colour = albedo(land, point.lat, point.lon, cover)
      if (!colour) continue
      out.add(cover === WATER ? 'water' : hex(cover === TREE ? crownOf(colour) : colour), bandOf(km), `M${left} ${top.toFixed(1)}h${step}V${bottom.toFixed(1)}h-${step}Z`)
    }
  }
  return out.done()
}
