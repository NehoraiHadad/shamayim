import type { JSX } from 'react'
import { CURATED_BUILDINGS } from '../curated'
import { Castle, Church, Mosque, Synagogue, WaterTower } from './buildings'
import { Chimney, Cooling, Highrise, Silo } from './industry'
import { Palms } from './nature'
import { Bridge, Lighthouse, Mast, Turbine } from './structures'

export interface BuildingProps {
  h: number
  night: boolean
  /** Stable per-mark seed (window patterns, mirroring). */
  seed?: number
  /** Share of windows lit at night (`MarkLife.litShare`). */
  litShare?: number
  /** Turbine blades turn (wind in range, motion allowed). */
  spin?: boolean
  /** Palm crowns sway (motion allowed and `MarkLife.sway`). */
  sway?: boolean
}
export interface BuildingSpec {
  w: number
  h: (hPx: number) => number
  Draw: (props: BuildingProps) => JSX.Element
  /** Share of the box the sun-side strip covers (R4); 0 = never lit (moving or open glyphs). Default .35. */
  litWidth?: number
  /** Draws its own lit and shade faces with the sun on the left (buildings.tsx); mirrored, never masked. */
  selfLit?: boolean
  /** Aviation light position relative to the base centre; default the top centre. */
  beacon?: (h: number) => [number, number]
}

/** Box width and drawn height (from the mark's projected height) per generic building kind, then curated glyphs. */
export const BUILDINGS: Partial<Record<string, BuildingSpec>> = {
  minaret: { w: 14, h: (hPx) => Math.max(17, hPx), Draw: Mosque, selfLit: true },
  synagogue: { w: 11, h: () => 9.5, Draw: Synagogue, selfLit: true },
  church: { w: 12, h: () => 15.5, Draw: Church, selfLit: true },
  waterTower: { w: 9, h: (hPx) => Math.max(16, hPx), Draw: WaterTower, selfLit: true },
  castle: { w: 16, h: () => 9.5, Draw: Castle, selfLit: true },
  highrise: { w: 10, h: (hPx) => Math.max(14, hPx), Draw: Highrise },
  chimney: { w: 9, h: (hPx) => Math.max(16, hPx), Draw: Chimney, beacon: (h) => [1.75, -h] },
  cooling: { w: 12, h: () => 14, Draw: Cooling, litWidth: .4 },
  silo: { w: 13, h: (hPx) => Math.max(14, hPx), Draw: Silo },
  turbine: { w: 4, h: (hPx) => Math.max(16, hPx), Draw: Turbine, litWidth: 0 },
  mast: { w: 5, h: (hPx) => Math.max(14, hPx), Draw: Mast, litWidth: 0 },
  lighthouse: { w: 9, h: (hPx) => Math.max(14, hPx), Draw: Lighthouse, beacon: (h) => [-1.5, -h] },
  bridge: { w: 24, h: (hPx) => Math.max(14, hPx), Draw: Bridge, litWidth: 0 },
  palms: { w: 12, h: (hPx) => Math.max(11, hPx), Draw: Palms, selfLit: true },
  ...CURATED_BUILDINGS,
}

export const FIELD_KINDS = new Set(['orchard', 'vineyard', 'solar'])
export function fieldWidth(kind: string) { return kind === 'solar' ? 18 : kind === 'vineyard' ? 20 : 22 }
/** How far a field's lowest row reaches below its depth (fields.tsx: orchard rows 2.6 apart with r ≤ 1.6 trees,
 * vine rows 2 apart, solar rows 2.2 apart and 1.5 thick). */
export function fieldReach(kind: string) { return kind === 'solar' ? 5.9 : kind === 'vineyard' ? 6.5 : 7.3 }
