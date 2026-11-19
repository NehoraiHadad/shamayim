import type { Place } from '../config/place'
import { homeCluster } from '../data/city/homeCluster'
import { outsideFrame, seenFromOutside } from '../data/city/outsideView'
import type { CityResult } from '../data/city/types'
import { clusterRoofs, clusterStyle } from '../data/city/villageStyle'
import { hashId } from '../data/landmarks/hash'
import { isPlaceHomes, settlementSize } from '../data/landmarks/placeMarks'
import { portraitReach } from '../data/landmarks/portrait'
import { desertSettlement, settlementStyle } from '../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../data/landmarks/types'
import type { SceneTerrain } from '../data/terrain/terrain'
import { hillScene } from '../ui/scene/marks/hillScene'
import type { OutsideView, PlacePortrait } from './types'

/**
 * The house style and roofs of a portrait. Roofs only from evidence about the roofs (5+ mapped roof shapes, the majority
 * deciding; a town of blocks or a desert place flat), else mixed (owner, 2026-11-19); the same rule as the SVG scene's
 * `homeMode` over a panorama.
 */
export function portraitStyle(place: Place, landmarks: readonly Landmark[], city: CityResult | null | undefined) {
  const homes = landmarks.find(isPlaceHomes)
  const size = homes ? settlementSize(homes) : 'small'
  const style = settlementStyle(place, size)
  const home = homeCluster([...city?.clusters ?? []])
  const footprint = home ? clusterStyle(home, desertSettlement(place)) : null
  const known = Boolean(home && footprint && (footprint !== 'tile' || clusterRoofs(home) !== undefined))
  const roofs: PlacePortrait['roofs'] = known ? (footprint === 'tile' ? 'tile' : 'flat') : style === 'tile' ? 'mixed' : 'flat'
  return { size, style: known && footprint ? footprint : style, roofs }
}

export interface PlaceInput {
  place: Place
  terrain: SceneTerrain
  landmarks: readonly Landmark[]
  city?: CityResult | null
  /** The figure's width (px) the marks are laid out in. */
  width: number
  /** The place's height (m): the label it keeps clear of, and the "פני הים" datum below sea level. */
  elevation: number
}

/**
 * The place and its marks. A city (its homes read as a large town, or 8+ towers within its reach) over a panorama is
 * seen from outside (variant B: mass and spires, `outsideView.ts`); any other place is its portrait round the dot.
 * The marks come out of the same rules as the SVG scene (`hillScene`: portrait side rule, outside view, fame), which
 * stages C4–C5 rewrite as `scene/model/portrait.ts`, `outside.ts`, `marks.ts`. Independent of the hour (lit windows
 * are `night.litShare`).
 */
export function placeOf(input: PlaceInput): { place3: PlacePortrait | OutsideView; marks: PlacedMark[] } {
  const { place, terrain, city, width, elevation } = input
  const landmarks = [...input.landmarks]
  const reachKm = portraitReach(city?.clusters)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const outside = Boolean(terrain.sightAt) && seenFromOutside(place, landmarks, towers, reachKm)
  const rounded = Math.round(elevation)
  const scene = hillScene({ place, terrain, landmarks, city, width, litShare: 0, datum: elevation < 0, variant: outside ? 'b' : null,
    label: { text: `${rounded < 0 ? `−${Math.abs(rounded)}` : rounded} מ׳`, below: elevation < 0 } })
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  const dot = { x: centerX, y: scene.centerY }
  const seed = hashId(place.id)
  if (outside && scene.outside) {
    return { marks: scene.marks, place3: { kind: 'outside', dot, reachKm, seed, skyline: scene.outside,
      frame: outsideFrame(city?.clusters, reachKm, centerX, width, true) } }
  }
  return { marks: scene.marks, place3: { kind: 'portrait', dot, reachKm, seed, ...portraitStyle(place, landmarks, city) } }
}
