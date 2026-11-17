import type { JSX } from 'react'
import { Castle, Church, Mosque, Synagogue, WaterTower } from './buildings'

export interface BuildingProps { h: number; night: boolean }
export interface BuildingSpec { w: number; h: (hPx: number) => number; Draw: (props: BuildingProps) => JSX.Element }

/** Box width and drawn height (from the mark's projected height) per generic building kind. */
export const BUILDINGS: Partial<Record<string, BuildingSpec>> = {
  minaret: { w: 14, h: (hPx) => Math.max(17, hPx), Draw: Mosque },
  synagogue: { w: 11, h: () => 9, Draw: Synagogue },
  church: { w: 12, h: () => 15.5, Draw: Church },
  waterTower: { w: 9, h: (hPx) => Math.max(16, hPx), Draw: WaterTower },
  castle: { w: 16, h: () => 9.5, Draw: Castle },
}

export const FIELD_KINDS = new Set(['orchard', 'vineyard', 'solar'])
export function fieldWidth(kind: string) { return kind === 'solar' ? 18 : kind === 'vineyard' ? 20 : 22 }
