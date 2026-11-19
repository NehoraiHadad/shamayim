import type { Place } from '../config/place'
import { homeCluster } from '../data/city/homeCluster'
import { outsideFrame, outsideSkyline, seenFromOutside } from '../data/city/outsideView'
import type { CityResult } from '../data/city/types'
import { clusterRoofs, clusterStyle } from '../data/city/villageStyle'
import { hashId } from '../data/landmarks/hash'
import { isPlaceHomes, settlementSize } from '../data/landmarks/placeMarks'
import { portraitReach } from '../data/landmarks/portrait'
import { groundFn } from '../data/landmarks/seat'
import { desertSettlement, settlementStyle } from '../data/landmarks/settlement'
import type { Landmark } from '../data/landmarks/types'
import { noteBoxes, sceneNotes } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import { LABEL_H, labelBox, overlaps, placeLabel, SHEET_CLEAR, textWidth, VISIBLE_BOTTOM } from './layout'
import { markBox, marksOf } from './marks'
import { composePortrait, portraitHalf } from './portrait'
import { seaSpan } from './seaLine'
import type { OutsideView, PlacePortrait, WorldLabels, WorldMark } from './types'

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
 * The place and its marks (stage C4). A city (its homes read as a large town, or 8+ towers within its reach) over a
 * panorama is seen from outside (variant B: mass and spires, `outsideView.ts`; drawn at C5); any other place is its
 * portrait round the dot (`portrait.ts`). The marks by the portrait and outside rules (`marks.ts`); the height label
 * next to the dot, clear of the marks; the portrait composed round them both. Independent of the hour (lit windows
 * are `night.litShare`). No longer the SVG scene's `hillScene`: the SVG scene keeps its own layout until C9.
 */
export function placeOf(input: PlaceInput): { place3: PlacePortrait | OutsideView; marks: WorldMark[]; labels: WorldLabels;
  ownSkyline: boolean } {
  const { place, terrain, city, width, elevation } = input
  const landmarks = [...input.landmarks]
  const reachKm = portraitReach(city?.clusters)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  const outside = Boolean(terrain.sightAt) && seenFromOutside(place, landmarks, towers, reachKm)
  const rounded = Math.round(elevation)
  const label = { text: `${rounded < 0 ? `−${Math.abs(rounded)}` : rounded} מ׳`, below: elevation < 0 }
  const datum = elevation < 0
  const notes = sceneNotes(terrain, datum, width, datum ? seaSpan(terrain.nearPoints, terrain.seaY) : undefined)
  const ground = groundFn(terrain.nearPoints, width)
  const centerX = Number.parseFloat(terrain.centerLeft) / 100 * width
  // The dot sits on the drawn ridge, not on the raw middle sample (which can float above the smoothed curve).
  const dot = { x: centerX, y: terrain.drawn ? terrain.centerY : ground(centerX) }
  const seed = hashId(place.id)
  // The place's own city skyline (its raster towers within reach): the far towns start beyond it.
  const ownSkyline = Boolean(city?.raster && terrain.groundAt && terrain.angleY && terrain.sightAt)
  const style = portraitStyle(place, landmarks, city)
  const known = Boolean(homeCluster([...city?.clusters ?? []]))
  const frame = outside ? outsideFrame(city?.clusters, reachKm, centerX, width, true) : null
  const marks = marksOf({ place, terrain, landmarks, width, dot, reachKm, homeHalf: portraitHalf(reachKm, known), style: style.style,
    notes: noteBoxes(notes), rasterTowers: ownSkyline ? towers : null, outside: frame ? { frame, isCity: true } : null })
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  const skyline = frame ? outsideSkyline({ variant: 'b', place, towers, landmarks, raster: city?.raster ?? undefined, frame,
    ground, floor, width }) : null
  // The portrait first (round the dot, out of the notes and the marks among its roofs), then the height label: under the
  // houses that stand over it (as the SVG scene's settlement label), clear of the marks; the houses and trees it would
  // cover give way to it. A place with no houses of its own (a point in a crater, a summit) has no portrait.
  const among = marks.filter((m) => m.plane === 'near').map(markBox)
  const composed = frame || !landmarks.some(isPlaceHomes) ? { halfPx: 0, houses: [], trees: [] }
    : composePortrait({ dot, ground, width, style: style.style, roofs: style.roofs, reachKm, known, seed,
      blocked: [...noteBoxes(notes), ...among], floor: VISIBLE_BOTTOM - 2 })
  const half = textWidth(label.text, 11) / 2 + 2
  const over = composed.houses.filter((h) => h.x + h.w > dot.x - half && h.x < dot.x + half && h.base > dot.y)
  const top = label.below ? terrain.seaY + 6
    : Math.min(VISIBLE_BOTTOM - 1 - LABEL_H, Math.max(dot.y + 7, ...over.map((h) => h.base + 2)))
  const obstacles = [...marks.filter((m) => m.plane !== 'far').map(markBox),
    ...(skyline?.towers ?? []).map((t) => ({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.baseY - t.h, bottom: t.baseY }))]
  const spot = placeLabel({ dot, text: label.text, width, top, minTop: label.below ? terrain.seaY + 2 : 0, obstacles })
  const labels: WorldLabels = { height: { ...label, x: spot.x, y: spot.y }, notes }
  if (frame && skyline) {
    return { marks, labels, ownSkyline, place3: { kind: 'outside', dot, reachKm, seed, skyline, frame } }
  }
  const text = labelBox(labels.height)
  const clear = (b: { left: number; right: number; top: number; bottom: number }) => !overlaps(b, text, 0.5)
  const plan = { halfPx: composed.halfPx,
    houses: composed.houses.filter((h) => clear({ left: h.x, right: h.x + h.w, top: h.base - h.h - (h.roof === 'tile' ? 2.2 : 1), bottom: h.base })),
    trees: composed.trees.filter((t) => clear({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.base - t.h, bottom: t.base })) }
  return { marks, labels, ownSkyline, place3: { kind: 'portrait', dot, reachKm, seed, ...style, plan } }
}
