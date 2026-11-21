//# allFunctionsCalledOnLoad
import type { KoppenCode } from '../../data/land/koppenGrid'
import {
  distanceFade, SCRUB_FULL_M_PER_PX, SCRUB_MAX_M_PER_PX, STRATA_FULL_M_PER_PX, STRATA_MAX_M_PER_PX,
  TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX, TREE_KIND_CODE,
} from './vegRules'
import { TONE } from './vegSample'
import type { AreaLimit, CoverCheck, Footprint } from './vegFootprint'
import { treeExtent, tuftExtent } from './vegShapes'

/**
 * Natural vegetation & bare-strata geometry builders (Stage 4: woodland clusters, scrub/grass tufts, strata).
 * Agricultural builders (`addFieldParcel`, `addOrchardBlock`) live in `vegAgriBuilders.ts`.
 * Every feature checks projected cover compatibility & clear zones and obeys a < 10 KB total byte ceiling.
 */

export interface VegBuffers {
  trees: number[]; treeMeta: number[]; fields: number[]; fieldMeta: number[]
  rows: number[]; rowMeta: number[]; tufts: number[]; tuftMeta: number[]; strata: number[]; strataMeta: number[]
}

export interface BuildEnv {
  sx: number; horizonY: number
  koppen: KoppenCode; solarMonth: number
  crestAt: (refX: number) => number; footAt: (refX: number) => number
  scaleAt: (refX: number, y: number) => number
  farScale: (area: Footprint) => number
  fits: (area: Footprint, accepts: CoverCheck, mapped?: AreaLimit) => boolean
}

/**
 * Hard per-buffer caps whose simultaneous worst-case sum stays strictly under 10,000 bytes AND never starves
 * across the 12×3 near grid (36 cells × 6 trees = 216; 36 × 1 field = 36; 36 × 3 tufts = 108):
 * 216*27 (5,832) + 36*38 (1,368) + 20*25 (500) + 108*18 (1,944) + 14*25 (350) = 9,994 B < 10 KB.
 */
export const CAPS = { trees: 216, fields: 36, rows: 20, tufts: 108, strata: 14 } as const
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const isShrubCover = (c: number | null, src: number | null) => c === 2 || c === 9 || c === 10 || (c === null && src === null)

/** Clustered rounded pine/oak woodland crowns (WorldCover 10), projected from metres, thinning with NDVI & fading with distance. */
export function addForestCluster(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, y: number, colW: number, cellH: number,
  mPerPx: number, density: number, weight = 1, mapped?: AreaLimit,
): void {
  const fade = distanceFade(mPerPx, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX)
  if (fade * weight <= 0.02 || buf.trees.length / 6 >= CAPS.trees || rand() > 0.24 + 0.76 * density) return
  // Individual foreground crowns (~18 m) aggregate smoothly into merged woodland crown domes (~40 m) on mid slopes.
  const domeM = 18 + 0.62 * mPerPx
  const baseR = clamp(domeM / Math.max(3, mPerPx), 1.30, 3.25)
  const count = clamp(Math.round((2 + 4 * density) * (0.65 + 0.35 * fade)), 1, 6)
  // Distribute across 2 overlapping sub-groves spanning the cell so wooded slopes read as connected woodland, not isolated dots.
  const subOffX = (rand() - 0.5) * colW * 0.44, subOffY = (rand() - 0.5) * cellH * 0.36
  const alphaByte = Math.round(clamp(fade * weight * (0.86 + 0.14 * density), 0, 1) * 255)
  for (let i = 0; i < count && buf.trees.length / 6 < CAPS.trees; i++) {
    const g = i < Math.ceil(count / 2) ? -0.5 : 0.5
    const ang = rand() * Math.PI * 2, dist = (rand() ** 0.62) * (baseR * 2.1 + colW * 0.16)
    const rx = refX + g * subOffX + Math.cos(ang) * dist * 1.25
    const ry = y + g * subOffY + Math.sin(ang) * dist * 0.48
    const r = clamp(baseR * (0.76 + 0.46 * rand()), 1.15, 3.5)
    if (rx < 1 || rx > 374 || ry < env.crestAt(rx) + 1.4 + r * 0.25 || ry > env.footAt(rx) - 0.5) continue
    const shade = 0.20 + 0.65 * rand()
    const height = r * (2.0 + 0.7 * rand()), phase = rand() * Math.PI * 2
    if (!env.fits(treeExtent(rx, ry, r, height, phase, TREE_KIND_CODE.pine, env.sx), (c) => c === 1, mapped)) continue
    buf.trees.push(rx * env.sx, ry, r, height, phase, shade)
    buf.treeMeta.push(TREE_KIND_CODE.pine, shade > 0.50 ? TONE.PINE_SHADE : TONE.PINE_MID, alphaByte)
  }
}

/** Scattered scrub cushions (WorldCover 20) or grass tufts (WorldCover 30) on near slopes, contained in compatible cover. */
export function addScrubOrGrass(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, y: number, colW: number, cellH: number,
  mPerPx: number, isGrass: boolean, srcCover: number | null, density: number,
): void {
  const fade = distanceFade(mPerPx, SCRUB_FULL_M_PER_PX, SCRUB_MAX_M_PER_PX)
  if (fade <= 0.04 || buf.tufts.length / 4 >= CAPS.tufts || rand() > 0.22 + 0.78 * density) return
  const patchM = isGrass ? 11 + 0.34 * mPerPx : 14 + 0.40 * mPerPx
  const size = clamp(patchM / Math.max(3, mPerPx), 1.05, 2.45)
  const count = clamp(Math.round((1.2 + 1.8 * density) * (0.65 + 0.35 * fade)), 1, 3)
  const spreadX = Math.max(4, colW * 0.44), spreadY = Math.max(2.5, cellH * 0.42)
  for (let i = 0; i < count && buf.tufts.length / 4 < CAPS.tufts; i++) {
    const rx = refX + (rand() - 0.5) * 2 * spreadX, ry = y + (rand() - 0.5) * 2 * spreadY
    const r = size * (0.72 + 0.48 * rand()) * (isGrass ? 0.92 : 1)
    if (r < 0.75 || rx < 1 || rx > 374 || ry < env.crestAt(rx) + 1.3 + r * 0.6 || ry > env.footAt(rx) - 0.6) continue
    if (!env.fits(tuftExtent(rx, ry, r, env.sx), (c) => isGrass ? c === 3 : isShrubCover(c, srcCover))) continue
    buf.tufts.push(rx * env.sx, ry, r, clamp((0.62 + 0.28 * density) * fade, 0, 1))
    buf.tuftMeta.push(isGrass ? 1 : 0, isGrass ? TONE.GRASS : TONE.SHRUB)
  }
}

/** Soft geological strata ribbon on bare/sparse (WorldCover 60) and desert slopes — zero vegetation. */
export function addStrataBand(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, y: number, spanRef: number, mPerPx: number,
): void {
  if (buf.strata.length / 6 >= CAPS.strata) return
  const fade = distanceFade(mPerPx, STRATA_FULL_M_PER_PX, STRATA_MAX_M_PER_PX)
  if (fade <= 0.04) return
  const x0 = clamp(refX - spanRef * 0.55, 1, 374), x1 = clamp(refX + spanRef * 0.55, 1, 374)
  const tilt = (rand() - 0.5) * 3.0, y0 = y - tilt * 0.5, y1 = y + tilt * 0.5
  if (y0 < env.crestAt(x0) + 1.8 || y1 < env.crestAt(x1) + 1.8 || y0 > env.footAt(x0) - 0.8 || y1 > env.footAt(x1) - 0.8) return
  const thick = 2.4 + 3.4 * rand(), margin = thick * 0.95 + 0.6
  const okBare = (c: number | null) => c !== 8 && c !== 1 && c !== 4 && c !== 5 && c !== 7
  if (!env.fits([x0 - margin / env.sx, Math.min(y0, y1) - margin, x1 + margin / env.sx, Math.max(y0, y1) + margin],
    okBare)) return
  buf.strata.push(x0 * env.sx, y0, x1 * env.sx, y1, thick, (0.18 + 0.16 * rand()) * fade)
  buf.strataMeta.push(rand() < 0.5 ? TONE.STRATA_LIGHT : TONE.STRATA_DARK)
}
