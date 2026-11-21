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

/** Clustered multi-tier pine/oak woodland crowns (WorldCover 10), projected from metres, thinning with NDVI & distance. */
export function addForestCluster(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, y: number, colW: number, cellH: number,
  mPerPx: number, density: number, weight = 1, mapped?: AreaLimit,
): void {
  const fade = distanceFade(mPerPx, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX)
  if (fade * weight <= 0.02 || buf.trees.length / 6 >= CAPS.trees) return
  if (density < 0.45 && rand() > 0.30 + 1.55 * density) return
  // Foreground crowns (~16 m) aggregate into merged woodland crown domes (~38 m) on mid slopes (KKL-JNF / FAO forestry).
  const domeM = 16 + 0.56 * mPerPx
  const baseR = clamp(domeM / Math.max(3, mPerPx), 1.35, 3.30)
  const count = clamp(Math.round((3 + 7 * density) * (0.60 + 0.40 * fade)), 2, 10)
  const groves = count >= 6 ? 3 : 2
  const groveOffX = Array.from({ length: groves }, (_, g) => (g - (groves - 1) / 2) * colW * 0.24 + (rand() - 0.5) * colW * 0.14)
  const groveOffY = Array.from({ length: groves }, () => (rand() - 0.5) * cellH * 0.34)
  const alphaByte = Math.round(clamp(fade * weight * (0.88 + 0.12 * density), 0, 1) * 255)
  for (let i = 0; i < count && buf.trees.length / 6 < CAPS.trees; i++) {
    const g = i % groves, rank = Math.floor(i / groves)
    // Emergent anchor + overlapping mid-canopy + smaller edge saplings so wooded slopes read as varied, cohesive groves.
    const tierScale = rank === 0 ? 1.12 + 0.44 * rand() : rank % 2 === 1 ? 0.72 + 0.38 * rand() : 0.48 + 0.30 * rand()
    const ang = rand() * Math.PI * 2
    const spread = rank === 0 ? 0.35 * rand() : rank % 2 === 1 ? 0.50 + 0.85 * rand() : 0.85 + 1.15 * rand()
    const dist = baseR * spread
    const rx = refX + groveOffX[g] + Math.cos(ang) * dist * 1.15
    const ry = y + groveOffY[g] + Math.sin(ang) * dist * 0.48
    const fullR = clamp(baseR * tierScale, 0.95, 4.35)
    const shade = 0.15 + 0.75 * rand(), hMul = 2.0 + 0.7 * rand(), phase = rand() * Math.PI * 2
    let r = fullR
    if (rx < 1 || rx > 374 || ry < env.crestAt(rx) + 1.2 + r * 0.25 || ry > env.footAt(rx) - 0.5) continue
    if (!env.fits(treeExtent(rx, ry, r, r * hMul, phase, TREE_KIND_CODE.pine, env.sx), (c) => c === 1, mapped)) {
      r = Math.max(0.90, fullR * 0.62)
      if (!env.fits(treeExtent(rx, ry, r, r * hMul, phase, TREE_KIND_CODE.pine, env.sx), (c) => c === 1, mapped)) continue
    }
    buf.trees.push(rx * env.sx, ry, r, r * hMul, phase, shade)
    buf.treeMeta.push(TREE_KIND_CODE.pine, shade > 0.52 ? TONE.PINE_SHADE : TONE.PINE_MID, alphaByte)
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
