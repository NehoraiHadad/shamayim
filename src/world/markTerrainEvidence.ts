/** Reference-scene coordinates, before horizontal viewport scaling. */
export interface MarkTerrainEvidence {
  bearingX?: number
  sourceTopY?: number
  sourceGroundY?: number
  baseMode?: 'foot' | 'ridge'
  ridgeKind?: 'near' | 'land'
}
