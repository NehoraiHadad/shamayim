//# allFunctionsCalledOnLoad
import type { KoppenCode } from '../../data/land/koppenGrid'
import {
  cropFieldState, distanceFade, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX, FIELD_STATE_CODE,
  ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX, SCRUB_FULL_M_PER_PX, SCRUB_MAX_M_PER_PX,
  STRATA_FULL_M_PER_PX, STRATA_MAX_M_PER_PX, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX,
  TREE_KIND_CODE, type OrchardKind,
} from './vegRules'
import { TONE } from './vegSample'

/** Pure geometry builders for Stage 4 vegetation buffers (fields, orchards, pine clusters, tufts, strata). */

export interface VegBuffers {
  trees: number[]; treeMeta: number[]; fields: number[]; fieldMeta: number[]
  rows: number[]; rowMeta: number[]; tufts: number[]; tuftMeta: number[]; strata: number[]; strataMeta: number[]
}

export interface BuildEnv {
  sx: number; width: number; landHeight: number; horizonY: number
  koppen: KoppenCode; solarMonth: number
  crestAt: (refX: number) => number; footAt: (refX: number) => number
  blocked: (refX: number, y: number, r: number) => boolean; rand: () => number
}

export const CAPS = { trees: 280, fields: 32, rows: 48, tufts: 160, strata: 28 } as const
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const orchardTone = (k: OrchardKind) => (k === 'palm' ? TONE.PALM : k === 'citrus' ? TONE.CITRUS : TONE.OLIVE)

/** Perspective-converging cropland parcel quad aligned to the ground plane and horizon. */
export function addFieldParcel(
  buf: VegBuffers, env: BuildEnv, refX: number, yTop: number, yBot: number, halfW: number,
  mPerPx: number, ndvi: number, dryness: number,
): void {
  if (buf.fields.length / 10 >= CAPS.fields) return
  const fade = distanceFade(mPerPx, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX)
  const y0 = Math.max(env.crestAt(refX) + 1.5, yTop), y1 = Math.min(env.footAt(refX) - 0.4, yBot)
  if (fade <= 0.04 || y1 - y0 < 2.5) return

  const vpRefX = clamp(refX + (env.rand() - 0.5) * 140, -60, 435)
  const h0 = Math.max(4, y0 - env.horizonY), h1 = Math.max(h0 + 2, y1 - env.horizonY)
  const ratio = clamp(h0 / h1, 0.45, 0.92), topCx = vpRefX + (refX - vpRefX) * ratio, topHw = halfW * ratio
  const slant = (env.rand() - 0.5) * 1.3
  const fieldNdvi = clamp(ndvi + (env.rand() - 0.5) * 0.16, -0.1, 0.95)
  const state = cropFieldState(fieldNdvi, dryness, env.solarMonth, env.koppen)
  const toneIdx = state === 'growing' ? TONE.FIELD_GREEN : state === 'ploughed' ? TONE.FIELD_PLOUGH : TONE.FIELD_STRAW

  buf.fields.push(
    (topCx - topHw) * env.sx, Math.max(env.crestAt(topCx - topHw) + 1.2, y0 - slant),
    (topCx + topHw) * env.sx, Math.max(env.crestAt(topCx + topHw) + 1.2, y0 + slant),
    (refX + halfW) * env.sx, y1, (refX - halfW) * env.sx, y1,
    Math.atan2(y1 - y0, (refX - vpRefX) * env.sx), fade * (0.34 + 0.18 * env.rand()),
  )
  buf.fieldMeta.push(FIELD_STATE_CODE[state], toneIdx)
}

/** Converging orchard/plantation rows (olive, citrus, date palms) on resolvable near cells. */
export function addOrchardBlock(
  buf: VegBuffers, env: BuildEnv, refX: number, yTop: number, yBot: number, spanRef: number,
  km: number, mPerPx: number, orchard: OrchardKind, density: number,
): void {
  const fade = distanceFade(mPerPx, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)
  const y0 = Math.max(env.crestAt(refX) + 1.8, yTop), y1 = Math.min(env.footAt(refX) - 0.8, yBot)
  if (fade <= 0.05 || y1 - y0 < 3.0) return

  const vpRefX = clamp(refX + (env.rand() - 0.5) * 110, -40, 415)
  const nRows = clamp(Math.round(3 + (spanRef / 11) * fade), 3, 5)
  const kindCode = TREE_KIND_CODE[orchard], toneIdx = orchardTone(orchard)
  const h0 = Math.max(4, y0 - env.horizonY), h1 = Math.max(h0 + 2, y1 - env.horizonY)
  const persp = clamp(h0 / h1, 0.42, 0.88)

  for (let i = 0; i < nRows; i++) {
    const bx = refX + (nRows > 1 ? i / (nRows - 1) - 0.5 : 0) * spanRef
    const tx = vpRefX + (bx - vpRefX) * persp
    const ry0 = Math.max(env.crestAt(tx) + 1.6, y0), ry1 = Math.min(env.footAt(bx) - 0.8, y1)
    if (ry1 - ry0 < 2.8) continue
    if (buf.rows.length / 6 < CAPS.rows && !env.blocked((tx + bx) * 0.5, (ry0 + ry1) * 0.5, 2)) {
      buf.rows.push(tx * env.sx, ry0, bx * env.sx, ry1, clamp(1.0 / (0.5 + km * 0.5), 0.45, 1.15), 0.22 * fade)
      buf.rowMeta.push(kindCode, toneIdx)
    }
    const steps = clamp(Math.round(2 + (ry1 - ry0) / (orchard === 'palm' ? 3.8 : 3.2)), 2, 5)
    for (let s = 0; s < steps && buf.trees.length / 6 < CAPS.trees; s++) {
      if (env.rand() > 0.35 + 0.65 * density) continue
      const t = (s + 0.35 + (env.rand() - 0.5) * 0.22) / steps
      const rx = tx + (bx - tx) * t, ry = ry0 + (ry1 - ry0) * t
      const baseR = orchard === 'palm' ? 2.4 : orchard === 'citrus' ? 1.8 : 1.6
      const r = clamp((baseR / (0.5 + km * 0.7)) * (0.65 + 0.55 * t), 0.85, 3.8) * (0.68 + 0.32 * fade)
      if (r < 0.75 || ry < env.crestAt(rx) + 1.5 || env.blocked(rx, ry, r + 0.9)) continue
      const height = orchard === 'palm' ? r * (2.8 + 0.65 * env.rand()) : r * (1.5 + 0.5 * env.rand())
      buf.trees.push(rx * env.sx, ry, r, height, env.rand() * Math.PI * 2, 0.28 + 0.52 * env.rand())
      buf.treeMeta.push(kindCode, toneIdx)
    }
  }
}

/** Clustered rounded pine/woodland crowns (WorldCover 10), sized by distance and broken where NDVI is low. */
export function addForestCluster(
  buf: VegBuffers, env: BuildEnv, refX: number, y: number, km: number, mPerPx: number, density: number,
): void {
  const fade = distanceFade(mPerPx, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX)
  if (fade <= 0.05 || buf.trees.length / 6 >= CAPS.trees || env.rand() > 0.20 + 0.80 * density) return
  const count = Math.max(1, Math.round((2 + 6 * density) * (0.55 + 0.45 * fade)))
  const baseR = clamp(3.0 / (0.45 + km * 0.58), 0.95, 4.6)
  const spread = baseR * (2.4 + 0.9 * (1 - density))
  for (let i = 0; i < count && buf.trees.length / 6 < CAPS.trees; i++) {
    const ang = env.rand() * Math.PI * 2, dist = (env.rand() ** 0.68) * spread
    const rx = refX + Math.cos(ang) * dist * 1.45, ry = y + Math.sin(ang) * dist * 0.58
    const r = clamp(baseR * (0.72 + 0.55 * env.rand()) * (0.7 + 0.3 * fade), 0.85, 4.6)
    if (rx < 1 || rx > 374 || ry < env.crestAt(rx) + 1.4 + r * 0.3 || ry > env.footAt(rx) - 0.5 || env.blocked(rx, ry, r + 0.8)) continue
    const shade = 0.25 + 0.65 * env.rand()
    buf.trees.push(rx * env.sx, ry, r, r * (2.1 + 0.8 * env.rand()), env.rand() * Math.PI * 2, shade)
    buf.treeMeta.push(TREE_KIND_CODE.pine, shade > 0.50 ? TONE.PINE_SHADE : TONE.PINE_MID)
  }
}

/** Scattered scrub clumps (WorldCover 20) or grass tufts (WorldCover 30), density from NDVI. */
export function addScrubOrGrass(
  buf: VegBuffers, env: BuildEnv, refX: number, y: number, km: number, mPerPx: number, isGrass: boolean, density: number,
): void {
  const fade = distanceFade(mPerPx, SCRUB_FULL_M_PER_PX, SCRUB_MAX_M_PER_PX)
  if (fade <= 0.05 || buf.tufts.length / 4 >= CAPS.tufts || env.rand() > 0.15 + 0.85 * density) return
  const count = Math.max(1, Math.round((2 + 4.5 * density) * fade))
  const size = clamp(1.6 / (0.45 + km * 0.8), 0.55, 2.3), spread = 3.4 + 4.0 * size
  for (let i = 0; i < count && buf.tufts.length / 4 < CAPS.tufts; i++) {
    const a = env.rand() * Math.PI * 2, rr = (env.rand() ** 0.75) * spread
    const rx = refX + Math.cos(a) * rr * 1.55, ry = y + Math.sin(a) * rr * 0.52
    const r = size * (0.55 + 0.65 * env.rand()) * (isGrass ? 0.9 : 1)
    if (r < 0.45 || rx < 1 || rx > 374 || ry < env.crestAt(rx) + 1.3 + r || ry > env.footAt(rx) - 0.6 || env.blocked(rx, ry, r + 0.6)) continue
    buf.tufts.push(rx * env.sx, ry, r, (0.46 + 0.36 * density) * fade)
    buf.tuftMeta.push(isGrass ? 1 : 0, isGrass ? TONE.GRASS : TONE.SHRUB)
  }
}

/** Soft geological strata ribbon on bare/sparse (WorldCover 60) and desert slopes — zero vegetation. */
export function addStrataBand(
  buf: VegBuffers, env: BuildEnv, refX: number, y: number, spanRef: number, mPerPx: number,
): void {
  if (buf.strata.length / 6 >= CAPS.strata) return
  const fade = distanceFade(mPerPx, STRATA_FULL_M_PER_PX, STRATA_MAX_M_PER_PX)
  if (fade <= 0.05) return
  const x0 = clamp(refX - spanRef * 0.58, 1, 374), x1 = clamp(refX + spanRef * 0.58, 1, 374)
  const tilt = (env.rand() - 0.5) * 3.0, y0 = y - tilt * 0.5, y1 = y + tilt * 0.5
  if (y0 < env.crestAt(x0) + 1.8 || y1 < env.crestAt(x1) + 1.8 || y0 > env.footAt(x0) - 0.8 || y1 > env.footAt(x1) - 0.8) return
  buf.strata.push(x0 * env.sx, y0, x1 * env.sx, y1, 2.4 + 3.4 * env.rand(), (0.18 + 0.16 * env.rand()) * fade)
  buf.strataMeta.push(env.rand() < 0.5 ? TONE.STRATA_LIGHT : TONE.STRATA_DARK)
}
