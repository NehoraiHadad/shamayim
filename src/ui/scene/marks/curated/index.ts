import type { BuildingSpec } from '../generic/buildingSpecs'
import { BabShrine } from './haifa'
import { ChordsBridge, WesternWall } from './jerusalem'
import { AzrieliCenter } from './telAviv'

/** The hand-drawn icons keyed by glyph (src/data/landmarks/curated.ts). Widths match their drawn bodies. */
export const CURATED_BUILDINGS: Record<string, BuildingSpec> = {
  'jerusalem-bridge': { w: 20, h: (hPx) => Math.max(22, hPx), Draw: ChordsBridge, litWidth: 0,
    beacon: (h) => [-6 - .2 * h, -h] },
  'jerusalem-wall': { w: 18, h: () => 9, Draw: WesternWall },
  'tel-aviv-azrieli': { w: 19, h: (hPx) => Math.max(24, hPx), Draw: AzrieliCenter, selfLit: true, beacon: (h) => [-5.25, -h - 1] },
  'haifa-bab': { w: 12, h: (hPx) => Math.max(16, hPx), Draw: BabShrine },
}
