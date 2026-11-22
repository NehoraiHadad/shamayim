import type { CropArea } from './cropAreas'
import type { MarkTerrainEvidence } from '../../world/markTerrainEvidence'

export type MarkKind =
  | 'highrise' | 'chimney' | 'cooling' | 'mast' | 'waterTower'
  | 'minaret' | 'church' | 'silo' | 'lighthouse' | 'turbine'
  | 'bridge' | 'castle' | 'palms' | 'orchard' | 'solar' | 'homes' | 'custom'
  | 'synagogue' | 'vineyard'

export interface Landmark {
  id: string
  kind: MarkKind
  glyph?: string
  nameHe?: string
  lat: number
  lon: number
  heightM: number
  source: 'curated' | 'osm' | 'place' | 'cover'
  cropArea?: CropArea
  /** Separate geometry records from the static crop layer do not enter the portrait landmark shortlist. */
  areaOnly?: boolean
  /**
   * How well known it is (`fame.ts`): 2 when OpenStreetMap links it to a Wikipedia article, 1 to a Wikidata item only;
   * absent when anonymous.
   */
  fame?: Fame
}

export type Fame = 1 | 2

export interface CuratedPlace {
  id: string
  lat: number
  lon: number
  marks: Landmark[]
}

export type MarkLayer = 'near' | 'far' | 'plain'

/** The caller supplies the eye and depth frame of the layer that will paint the mark. */
export interface PerspectiveContext extends MarkTerrainEvidence {
  /** Local raster evidence; undefined means that the source cell is unavailable. */
  townFootprint?: boolean
  farCellId?: number
  /** Physical pixels visible above intervening terrain, before any legibility exaggeration. */
  crestPx?: number
}

export type MarkPerspective = (mark: Landmark, layer: MarkLayer, base: number) =>
  { sightKm: number; km: number; heightM: number; hPx: number; supportBlockId: string } & PerspectiveContext

export interface PlacedMark extends PerspectiveContext {
  id: string
  kind: MarkKind
  glyph: string
  layer: MarkLayer
  /** Geodesic distance of a mark on the plain. */
  km?: number
  /** View distance of an unowned glyph sized to its angle, in km. */
  sightKm?: number
  /** Physical height retained for projection after final base placement. */
  heightM?: number
  /** Source raster square, retained as proof of the non-owned glyph's supporting town. */
  supportBlockId?: string
  xPct: number
  baseY: number
  /** True y of the visible top when intervening terrain hides the foot. */
  visibleTopY?: number
  hPx: number
  lights: number
  tall: boolean
  /** North–south offset in km (north = behind the section line). */
  dy: number
  /** Stands among the place's own roofs (ILLUSTRATION.md R5): seated on the crest at its true x, the house there removed. */
  absorbed?: boolean
  /** Own portrait: isLandmark; non-own: isFamousLandmark. May lift a little off the sheet rather than drop. */
  landmark?: boolean
  /** Part of the place's portrait (composed by side, `markProjection.ts`): seated even on a steep face, like its houses. */
  portrait?: boolean
}

export interface TerrainSample { x: number; y: number; elevation?: number }

export interface Candidate extends PerspectiveContext {
  supportBlockId?: string
  sightKm?: number
  hPx?: number
  km?: number
  mark: Landmark
  dx: number
  dy: number
  x: number
  layer: MarkLayer
  plain?: { baseY: number; hPx: number; visibleTopY?: number }
  width: number
  score: number
  reserved?: boolean
  portrait?: boolean
}
