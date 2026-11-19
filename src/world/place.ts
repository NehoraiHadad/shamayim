import type { Place } from '../config/place'
import { homeCluster } from '../data/city/homeCluster'
import type { BoundsFile } from '../data/city/bounds'
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
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import { LABEL_H, labelBox, overlaps, placeLabel, SHEET_CLEAR, textWidth, VISIBLE_BOTTOM } from './layout'
import { markBox, marksOf } from './marks'
import { outsidePlace } from './outside'
import { composePortrait, portraitHalf } from './portrait'
import { seaSpan } from './seaLine'
import type { CoastalSea, OutsideView, PlacePortrait, WorldLabels, WorldMark } from './types'

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
  /** The places' own boundaries (C5: the outside view's frame is cut at the place's). */
  bounds?: BoundsFile | null
  /** The large water (C5: a coastal place's own sea seen from outside). */
  waterMask?: WaterMask | null
  /** The land cover (C5: every place's built cells and trees). */
  cover?: LandCover | null
}

/**
 * The place and its marks (stages C4–C5). Every place over a panorama is seen from outside and built from its own data
 * by one builder (`outside.ts`, owner 2026-11-19): its built cells at their real heights (houses with roofs where low and
 * sparse, blocks where dense, the jagged mass with spires where high), its trees, towers and marks, by true east–west and
 * north–south. Only the drawn stand-in (no panorama, no positions) keeps the composed portrait round the dot
 * (`portrait.ts`). The marks by the portrait and outside rules (`marks.ts`); the height label
 * next to the dot, clear of the marks; the portrait composed round them both. Independent of the hour (lit windows
 * are `night.litShare`). No longer the SVG scene's `hillScene`: the SVG scene keeps its own layout until C9.
 */
export function placeOf(input: PlaceInput): { place3: PlacePortrait | OutsideView; marks: WorldMark[]; labels: WorldLabels;
  ownSkyline: boolean; coastalSea: CoastalSea | null } {
  const { place, terrain, city, width, elevation } = input
  const landmarks = [...input.landmarks]
  const reachKm = portraitReach(city?.clusters)
  const towers = city?.raster?.towers ?? city?.towers ?? []
  // One builder for every place over a panorama (owner, 2026-11-19, C5): seen from outside, built from its own data.
  const outside = Boolean(terrain.sightAt)
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
  const floor = VISIBLE_BOTTOM - SHEET_CLEAR
  // A city seen from outside (C5): its own frame, boundary and slope, its mass and spires, the towers beyond, its sea.
  const view = outside ? outsidePlace({ place, terrain, landmarks, city, width, centerX, reachKm, ground, floor,
    bounds: input.bounds, mask: input.waterMask, cover: input.cover }) : null
  const frame = view?.frame ?? null
  const skyline = view?.skyline ?? null
  const marks = marksOf({ place, terrain, landmarks, width, dot, reachKm, homeHalf: portraitHalf(reachKm, known), style: style.style,
    notes: noteBoxes(notes), rasterTowers: ownSkyline ? towers : null,
    outside: view ? { frame: view.frame, isCity: true, lie: view.lie, baseKm: view.baseKm, land: view.land } : null })
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
    ...[...skyline?.towers ?? [], ...view?.beyond ?? []].map((t) => ({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.baseY - t.h, bottom: t.baseY }))]
  // Seen from outside, the place's own mass and trees round the dot are obstacles too (the dot stands among its rows, C5b);
  // the label tries last over the mass there, in the sky, rather than cutting a hole in it.
  const reach = textWidth(label.text, 11) / 2 + 62
  const massNear = view ? [...view.skyline.boxes.map((b) => ({ left: b.x - b.w / 2, right: b.x + b.w / 2, top: b.top - 2.5, bottom: b.foot })),
    ...view.trees.map((t) => ({ left: t.x - t.w, right: t.x + t.w, top: t.base - t.h, bottom: t.base }))]
    .filter((b) => b.right > dot.x - reach && b.left < dot.x + reach) : []
  const half0 = textWidth(label.text, 11) / 2 + 2
  const overMass = massNear.filter((b) => b.right > dot.x - half0 && b.left < dot.x + half0).concat(obstacles.filter((b) => b.right > dot.x - half0 && b.left < dot.x + half0))
  const overTop = view && overMass.length ? Math.min(...overMass.map((b) => b.top)) - LABEL_H - 3 : undefined
  const spot = placeLabel({ dot, text: label.text, width, top, minTop: label.below ? terrain.seaY + 2 : 0,
    obstacles: [...obstacles, ...massNear], ...(overTop !== undefined ? { over: overTop } : {}) })
  const labels: WorldLabels = { height: { ...label, x: spot.x, y: spot.y }, notes }
  if (view && frame && skyline) {
    return { marks, labels, ownSkyline, coastalSea: view.sea, place3: { kind: 'outside', dot, reachKm, seed, skyline, frame,
      bounds: view.bounds, topM: view.topM, beyond: view.beyond, baseKm: view.baseKm, trees: view.trees, fabric: view.fabric,
      roofs: style.roofs, land: view.land } }
  }
  const text = labelBox(labels.height)
  const clear = (b: { left: number; right: number; top: number; bottom: number }) => !overlaps(b, text, 0.5)
  const plan = { halfPx: composed.halfPx,
    houses: composed.houses.filter((h) => clear({ left: h.x, right: h.x + h.w, top: h.base - h.h - (h.roof === 'tile' ? 2.2 : 1), bottom: h.base })),
    trees: composed.trees.filter((t) => clear({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.base - t.h, bottom: t.base })) }
  return { marks, labels, ownSkyline, coastalSea: null, place3: { kind: 'portrait', dot, reachKm, seed, ...style, plan } }
}
