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
  x?: number
  source: 'curated' | 'osm' | 'place'
}

export interface CuratedPlace {
  id: string
  lat: number
  lon: number
  marks: Landmark[]
}

export interface PlacedMark {
  id: string
  kind: MarkKind
  glyph: string
  layer: 'near' | 'far'
  xPct: number
  baseY: number
  hPx: number
  lights: number
  tall: boolean
  /** North–south offset in km (north = behind the section line). */
  dy: number
  /** Stands among the place's own roofs (ILLUSTRATION.md R5): seated on the crest at its true x, the house there removed. */
  absorbed?: boolean
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
