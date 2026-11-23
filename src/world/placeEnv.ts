import type { FarData } from '../data/city/farData'
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import type { Place } from '../config/place'
import { eachBuiltCell, walker } from './builtCells'
import { AIR_REACH_KM } from './townAir'

/*
 * What the land round a place is like, for the life in its sky and the darkness of its night (C10): how far the sea and the
 * nearest lake are, how built and how open the ground within ~2 km is (the land cover's classes), and how much artificial
 * light the towns within 60 km throw into its sky (Walker's law from the far raster's built shares). Independent of the
 * hour; one value per place and data.
 */

export interface PlaceEnv {
  /** Distance (km) to the sea within 20 km, else null. */
  seaKm: number | null
  /** Distance (km) to a lake (the Kinneret, the Dead Sea) within 20 km, else null. */
  lakeKm: number | null
  /** The bearing (deg) of the nearest sea and lake, where there is one (a resident of the shore keeps to it). */
  seaAz?: number | null
  lakeAz?: number | null
  /** Shares (0–1) of the ground within ~2 km: built, and open country (crops, grass, shrub, bare). */
  built: number
  open: number
  /**
   * Artificial sky glow at the place (relative units, Walker's law Σ built area × d^−2.5 over the towns within 60 km): ~0
   * in the desert, ~1 at the edge of a town of tens of thousands, 10+ in a metropolis.
   */
  glow: number
  sources: { land: 'cover' | 'population'; glow: 'far' | 'cover' | 'population' }
}

const KM_LAT = 110.57
const kmLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180)

/** The nearest water of a kind along 24 bearings, out to 20 km in 0.4 km steps: its distance and bearing. */
function waterKm(place: Place, mask: WaterMask | null | undefined, kind: 'sea' | 'lake'): { km: number; az: number } | null {
  if (!mask) return null
  let best: { km: number; az: number } | null = null
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * 2 * Math.PI
    for (let d = 0; d <= 20 && (best === null || d < best.km); d += 0.4) {
      const lat = place.lat + (d * Math.cos(a)) / KM_LAT, lon = place.lon + (d * Math.sin(a)) / kmLon(place.lat)
      const body = mask.bodyAt(lat, lon)
      if (body !== null && mask.bodies[body]?.kind === kind) { best = { km: d, az: k * 15 }; break }
    }
  }
  return best
}

/** The land cover's shares within 2 km (a 0.2 km grid): built (class 5) and open (shrub, grass, crop, bare: 2, 3, 4, 6). */
function coverShares(place: Place, cover: LandCover): { built: number; open: number; n: number } {
  let built = 0, open = 0, n = 0
  for (let dn = -2; dn <= 2.0001; dn += 0.2) {
    for (let de = -2; de <= 2.0001; de += 0.2) {
      if (dn * dn + de * de > 4) continue
      const c = cover.coverAt(place.lat + dn / KM_LAT, place.lon + de / kmLon(place.lat))
      if (!c) continue
      n++
      if (c === 5) built++
      else if (c === 2 || c === 3 || c === 4 || c === 6) open++
    }
  }
  return n ? { built: built / n, open: open / n, n } : { built: 0, open: 0, n: 0 }
}

/** Sky glow from the far raster: every built cell within reach by Walker's law. */
function farGlow(place: Place, far: FarData): number {
  let sum = 0
  eachBuiltCell(place, far, AIR_REACH_KM, (_e, _n, km, area) => { sum += walker(km, area) })
  return sum
}

/** The place's surroundings, from whatever data is at hand (each fallback marked). */
export function placeEnvOf(place: Place, data: { cover?: LandCover | null; far?: FarData | null; waterMask?: WaterMask | null }): PlaceEnv {
  const shares = data.cover ? coverShares(place, data.cover) : null
  // Without the land cover: the population says how built the place is.
  const popBuilt = Math.min(0.7, Math.max(0.02, Math.log10(Math.max(10, place.population ?? 1000)) / 6 - 0.3))
  const built = shares?.n ? shares.built : popBuilt
  const open = shares?.n ? shares.open : 1 - popBuilt
  const glow = data.far ? farGlow(place, data.far) : shares?.n ? shares.built * 8 : popBuilt * 8
  const sea = waterKm(place, data.waterMask, 'sea'), lake = waterKm(place, data.waterMask, 'lake')
  return {
    seaKm: sea?.km ?? null,
    lakeKm: lake?.km ?? null,
    seaAz: sea?.az ?? null,
    lakeAz: lake?.az ?? null,
    built, open, glow,
    sources: { land: shares?.n ? 'cover' : 'population', glow: data.far ? 'far' : shares?.n ? 'cover' : 'population' },
  }
}
