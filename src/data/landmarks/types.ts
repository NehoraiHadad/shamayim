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

export interface PlacedMark {
  id: string
  kind: MarkKind
  glyph: string
  layer: MarkLayer
  /** Geodesic distance of a mark on the plain. */
  km?: number
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
  /** Famous or hand-drawn (`fame.ts` `isLandmark`): lifted a little off the sheet edge rather than dropped. */
  landmark?: boolean
  /** Part of the place's portrait (composed by side, `markProjection.ts`): seated even on a steep face, like its houses. */
  portrait?: boolean
  /** Px the base is raised off low ground so the sheet edge does not cut it (src/ui/scene/marks/sceneLayout.ts). */
  lift?: number
  /** Px a field patch sits under the crest, fitted to the visible face (sceneLayout.ts); else from dy. */
  fieldDepth?: number
}

export interface MarkLife {
  litShare: number
  aviation: boolean
  leanDeg: number
  sway: { ampDeg: number; periodS: number } | null
  turbinePeriodS: number | null
  hideFar: boolean
  farBleach: number
}

export interface TerrainSample { x: number; y: number; elevation?: number }
