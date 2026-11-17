import type { BuildingSpec } from '../generic/buildingSpecs'
import { Cooling } from '../generic/industry'
import { Palms } from '../generic/nature'
import { BabShrine, DagonSilo, SailTower } from './haifa'
import { ChordsBridge, TowerOfDavid, WallAndDome, Ymca } from './jerusalem'
import { ShadmotHomes } from './shadmot'
import { AzrieliCenter, ReadingChimney, Sarona, ShalomMeir } from './telAviv'

/** Curated city marks keyed by glyph (src/data/landmarks/curated.ts). Widths match their drawn bodies. */
export const CURATED_BUILDINGS: Record<string, BuildingSpec> = {
  'jerusalem-bridge': { w: 20, h: (hPx) => Math.max(22, hPx), Draw: ChordsBridge, litWidth: 0,
    beacon: (h) => [-6 - .2 * h, -h] },
  'jerusalem-ymca': { w: 14, h: (hPx) => Math.max(18, hPx), Draw: Ymca, selfLit: true },
  'jerusalem-david': { w: 16, h: (hPx) => Math.max(17, hPx), Draw: TowerOfDavid, selfLit: true },
  'jerusalem-wall': { w: 18, h: () => 17, Draw: WallAndDome },
  'tel-aviv-shalom': { w: 8, h: (hPx) => Math.max(22, hPx), Draw: ShalomMeir },
  'tel-aviv-reading': { w: 12, h: (hPx) => Math.max(22, hPx), Draw: ReadingChimney, beacon: (h) => [4, -h] },
  'tel-aviv-sarona': { w: 10, h: (hPx) => Math.max(26, hPx), Draw: Sarona, selfLit: true, beacon: (h) => [-1, -h - 1] },
  'tel-aviv-azrieli': { w: 19, h: (hPx) => Math.max(24, hPx), Draw: AzrieliCenter, selfLit: true, beacon: (h) => [-5.25, -h - 1] },
  'haifa-bab': { w: 12, h: (hPx) => Math.max(16, hPx), Draw: BabShrine },
  'haifa-dagon': { w: 16, h: (hPx) => Math.max(18, hPx), Draw: DagonSilo, selfLit: true, beacon: (h) => [5, -h] },
  'haifa-sail': { w: 9, h: (hPx) => Math.max(22, hPx), Draw: SailTower, beacon: (h) => [-3.2, -h] },
  'haifa-cooling': { w: 17, h: () => 20, Draw: Cooling, litWidth: .4 },
  'shadmot-palms': { w: 12, h: (hPx) => Math.max(11, hPx), Draw: Palms, selfLit: true },
  'shadmot-homes': { w: 30, h: () => 9, Draw: ShadmotHomes },
}
