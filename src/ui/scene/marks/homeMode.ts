import type { Place } from '../../../config/place'
import type { Extent } from '../../../data/city/clusterTypes'
import { hasCityFabric } from '../../../data/city/fabric'
import { homeCluster, homeTier } from '../../../data/city/homeCluster'
import type { CityColumns, CityResult } from '../../../data/city/types'
import { clusterRoofs, clusterStyle } from '../../../data/city/villageStyle'
import { isPlaceHomes, settlementSize } from '../../../data/landmarks/placeMarks'
import { desertSettlement, settlementStyle } from '../../../data/landmarks/settlement'
import { templateHalf } from '../../../data/landmarks/settlementPlan'
import type { Landmark } from '../../../data/landmarks/types'
import { villageRows } from '../../../data/landmarks/villageExtent'

export type HomeCityData = CityColumns & Partial<Pick<CityResult, 'clusters' | 'raster'>>

export function neighbourHomeZone(centerX: number, halfWidth: number): Extent {
  return [centerX - halfWidth - 6, centerX + halfWidth + 6]
}

export function homeMode(place: Place, marks: Landmark[], width: number, centerX: number, city?: HomeCityData | null, panorama = false) {
  const homes = marks.find(isPlaceHomes)
  if (!homes) return null
  const size = settlementSize(homes)
  const style = settlementStyle(place, size)
  const historicalHalf = templateHalf(size)
  const home = homeCluster(city?.clusters ?? [])
  const tier = homeTier(home)
  const footprintStyle = home && clusterStyle(home, desertSettlement(place))
  // Roofs come only from evidence about the roofs themselves (never from who lives in the place): the mapped roof
  // shapes, or a town of blocks. Where nothing is known (the default red tiles): a mix of red-tiled and flat roofs.
  const known = home && footprintStyle && (footprintStyle !== 'tile' || clusterRoofs(home) !== undefined)
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
