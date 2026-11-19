import type { Place } from '../../../config/place'
import type { Cluster, Extent } from '../../../data/city/clusterTypes'
import { hasCityFabric } from '../../../data/city/fabric'
import { homeCluster, homeTier } from '../../../data/city/homeCluster'
import type { CityColumns, CityResult } from '../../../data/city/types'
import { clusterStyle } from '../../../data/city/villageStyle'
import { isPlaceHomes, settlementSize } from '../../../data/landmarks/placeMarks'
import { offsetKm } from '../../../data/landmarks/project'
import { desertSettlement, settlementStyle } from '../../../data/landmarks/settlement'
import { templateHalf } from '../../../data/landmarks/settlementPlan'
import type { Landmark } from '../../../data/landmarks/types'
import { villageRows } from '../../../data/landmarks/villageExtent'

export type HomeCityData = CityColumns & Partial<Pick<CityResult, 'clusters' | 'raster'>>

export function neighbourHomeZone(centerX: number, halfWidth: number): Extent {
  return [centerX - halfWidth - 6, centerX + halfWidth + 6]
}

function localRoof(place: Place, home: Cluster, marks: Landmark[]) {
  const local = marks.filter(mark => {
    if (mark.kind !== 'minaret' && mark.kind !== 'synagogue') return false
    const { dx, dy } = offsetKm(place, mark)
    const [south, north] = home.dy
    if (dx < home.dx[0] || dx > home.dx[1] || dy < south || dy > north) return false
    // V2 bands divide the north-south extent into equal slices, north first.
    const depth = north > south ? (north - dy) / (north - south) : 0
    const index = Math.min(home.bands.length - 1, Math.floor(depth * home.bands.length))
    return home.bands[index]?.runs.some(([west, east]) => dx >= west && dx <= east)
  })
  return local.some(mark => mark.kind === 'minaret') && !local.some(mark => mark.kind === 'synagogue')
    ? 'flat-hill' : undefined
}

export function homeMode(place: Place, marks: Landmark[], width: number, centerX: number, city?: HomeCityData | null, panorama = false) {
  const homes = marks.find(isPlaceHomes)
  if (!homes) return null
  const size = settlementSize(homes)
  const style = settlementStyle(place, size, marks)
  const historicalHalf = templateHalf(size)
  const home = homeCluster(city?.clusters ?? [])
  const tier = homeTier(home)
  const footprintStyle = home && clusterStyle(home, desertSettlement(place), home.place ? undefined : localRoof(place, home, marks))
  // The roofs come from the data where it knows them (its mapped roof shapes, the place's CBS population group or else
  // the faith of its worship, a town of blocks); where it knows nothing, from the marks around (minarets and no
  // synagogue: flat roofs).
  const known = home && footprintStyle && (footprintStyle !== 'tile' || (home.form.tagged ?? 0) >= 5 || (home.place?.faith ?? 0) > 0)
  // Nothing known and no rule applies (the default red tiles): a mix of red-tiled and flat roofs, not a guess.
  if (panorama) return { kind: 'template', size, style: known ? footprintStyle : style, homeHalf: historicalHalf,
    mixed: !known && style === 'tile' } as const
  const rural = place.settlementType === 'village' || place.settlementType === 'hamlet' || place.settlementType === 'isolated_dwelling'
  // Longitude bins have already discarded the bearings of their constituent buildings.
  if (city && !rural && (size === 'large' || style === 'blocks' || (tier !== 'B' && footprintStyle === 'blocks')) &&
    hasCityFabric(city, width, centerX)) {
    return { kind: 'city', size, style, homeHalf: historicalHalf, columns: city } as const
  }
  if (home && footprintStyle && tier === 'A') {
    return { kind: 'village', size, style: footprintStyle, seed: home.id,
      plan: villageRows(home, footprintStyle, { width, centerX }, 2 * historicalHalf) } as const
  }
  // Tier B uses the historical template until V7 is approved.
  return { kind: 'template', size, style, homeHalf: historicalHalf } as const
}
