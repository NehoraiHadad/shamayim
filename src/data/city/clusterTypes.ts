import type { Column, PlaceRow } from './types'

export type Extent = [number, number]
export type Cluster = {
  id: number
  dx: Extent
  dy: Extent
  centre: { dx: number; dy: number }
  squares: number
  measured: number
  shareSum: number
  levels: number
  upper: number
  // Form size is a class. Big, pitched, flat and evidence are fractions of mapped squares.
  form: { size: number; big: number; pitched: number; flat: number; evidence: number; tagged?: number }
  bands: { dy: number; runs: Extent[]; big: Extent[] }[]
  place?: { name: string; kind: PlaceRow[2]; faith: PlaceRow[3] }
  urban: boolean
  /** Sparse phase-3 bins of this component alone, indexed at BAND_WIDTH. */
  columns?: ReadonlyMap<number, Column>
  nearest: number
}
export type BuiltSquare = { x: number; y: number; lat: number; lon: number; meta: number; upper: number; form: number }
