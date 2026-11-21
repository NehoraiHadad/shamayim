//# allFunctionsCalledOnLoad
import {
  cropFieldState, distanceFade, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX, FIELD_STATE_CODE,
  MIN_RESOLVED_ROW_PX, ORCHARD_ALLEY_M, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX, ORCHARD_ROW_M,
  TREE_KIND_CODE, type OrchardKind,
} from './vegRules'
import { TONE } from './vegSample'
import { CAPS, type BuildEnv, type VegBuffers } from './vegBuilders'

/**
 * Agricultural geometry builders for Stage 4 vegetation: perspective cropland parcels and metre-projected
 * orchard/plantation blocks (resolving individual rows when `rowPx >= 1.5 px`, else aggregate alley texture).
 */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const orchardTone = (k: OrchardKind) => (k === 'palm' ? TONE.PALM : k === 'citrus' ? TONE.CITRUS : TONE.OLIVE)
const isOrchardCover = (c: number | null) => c === 1 || c === 4

/** Perspective-converging cropland parcel quad strictly contained within crop cover (`4`) and outside clear zones. */
export function addFieldParcel(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, yTop: number, yBot: number, halfW: number,
  mPerPx: number, ndvi: number, dryness: number,
): void {
  if (buf.fields.length / 9 >= CAPS.fields) return
  const fade = distanceFade(mPerPx, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX)
  const y0 = Math.max(env.crestAt(refX) + 1.5, yTop), y1 = Math.min(env.footAt(refX) - 0.4, yBot)
  if (fade <= 0.04 || y1 - y0 < 2.5) return

  const vpRefX = clamp(refX + (rand() - 0.5) * 140, -60, 435)
  const h0 = Math.max(4, y0 - env.horizonY), h1 = Math.max(h0 + 2, y1 - env.horizonY)
  const ratio = clamp(h0 / h1, 0.45, 0.92), topCx = vpRefX + (refX - vpRefX) * ratio
  const slant = (rand() - 0.5) * 1.2
  // Classify from exact unjittered NDVI (styling alpha alone varies per parcel).
  const state = cropFieldState(ndvi, dryness, env.solarMonth, env.koppen)
  const toneIdx = state === 'growing' ? TONE.FIELD_GREEN : state === 'ploughed' ? TONE.FIELD_PLOUGH : TONE.FIELD_STRAW
  const alpha = fade * (0.36 + 0.16 * rand())

  // Shrink inward if an edge crosses out of crop cover into bare/water/forest; skip if footprint overlaps a clear zone.
  for (const scale of [1, 0.7, 0.45]) {
    const hw = halfW * scale, topHw = hw * ratio
    const tx0 = clamp(topCx - topHw, 1, 374), tx1 = clamp(topCx + topHw, 1, 374)
    const bx0 = clamp(refX - hw, 1, 374), bx1 = clamp(refX + hw, 1, 374)
    const ty0 = Math.max(env.crestAt(tx0) + 1.2, y0 - slant), ty1 = Math.max(env.crestAt(tx1) + 1.2, y0 + slant)
    const by0 = Math.min(env.footAt(bx0) - 0.4, y1), by1 = Math.min(env.footAt(bx1) - 0.4, y1)
    if (bx1 - bx0 < 3 || Math.min(by0, by1) - Math.max(ty0, ty1) < 2) continue
    if (env.blockedBox(Math.min(tx0, bx0), Math.min(ty0, ty1), Math.max(tx1, bx1), Math.max(by0, by1))) continue
    if (env.coverAt(tx0, ty0) !== 4 || env.coverAt(tx1, ty1) !== 4
      || env.coverAt(bx0, by0) !== 4 || env.coverAt(bx1, by1) !== 4) continue
    buf.fields.push(tx0 * env.sx, ty0, tx1 * env.sx, ty1, bx1 * env.sx, by1, bx0 * env.sx, by0, alpha)
    buf.fieldMeta.push(FIELD_STATE_CODE[state], toneIdx)
    return
  }
}

/**
 * Metre-projected orchard/plantation rows (olive/citrus/date palm): resolves individual 6–8 m rows when
 * `rowSpacingM / mPerPx >= 1.5 px`, and switches cleanly to a 32–36 m management alley block texture +
 * aggregate canopy clumps when individual rows are sub-pixel, fading smoothly in alpha to `ORCHARD_MAX_M_PER_PX`.
 */
export function addOrchardBlock(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, yTop: number, yBot: number, spanRef: number,
  mPerPx: number, orchard: OrchardKind, density: number,
): void {
  const fade = distanceFade(mPerPx, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)
  const y0 = Math.max(env.crestAt(refX) + 1.8, yTop), y1 = Math.min(env.footAt(refX) - 0.8, yBot)
  if (fade <= 0.04 || y1 - y0 < 3.0) return

  const rowPx = ORCHARD_ROW_M[orchard] / Math.max(0.5, mPerPx)
  const resolvedRows = rowPx >= MIN_RESOLVED_ROW_PX
  const spacingPx = resolvedRows ? rowPx : clamp(ORCHARD_ALLEY_M[orchard] / Math.max(0.5, mPerPx), 2.2, 7.5)
  const nLines = clamp(Math.floor(spanRef / spacingPx) + 1, 2, resolvedRows ? 5 : 4)
  const actualSpan = (nLines - 1) * spacingPx
  const vpRefX = clamp(refX + (rand() - 0.5) * 90, -40, 415)
  const kindCode = TREE_KIND_CODE[orchard], toneIdx = orchardTone(orchard)
  const h0 = Math.max(4, y0 - env.horizonY), h1 = Math.max(h0 + 2, y1 - env.horizonY)
  const persp = clamp(h0 / h1, 0.45, 0.88)
  const alphaByte = Math.round(clamp(fade * (resolvedRows ? 0.96 : 0.78), 0, 1) * 255)
  const crownM = resolvedRows ? (orchard === 'palm' ? 7 : 5.5) : (orchard === 'palm' ? 22 : 18)
  let addedTrees = 0

  for (let i = 0; i < nLines; i++) {
    const bx = clamp(refX + (nLines > 1 ? i / (nLines - 1) - 0.5 : 0) * actualSpan, 1, 374)
    const tx = clamp(vpRefX + (bx - vpRefX) * persp, 1, 374)
    const ry0 = Math.max(env.crestAt(tx) + 1.6, y0), ry1 = Math.min(env.footAt(bx) - 0.8, y1)
    if (ry1 - ry0 < 2.6) continue
    const mx = (tx + bx) * 0.5, my = (ry0 + ry1) * 0.5
    if (env.blockedBox(Math.min(tx, bx), ry0, Math.max(tx, bx), ry1)) continue
    if (!isOrchardCover(env.coverAt(tx, ry0)) || !isOrchardCover(env.coverAt(mx, my)) || !isOrchardCover(env.coverAt(bx, ry1))) continue
    if (buf.rows.length / 6 < CAPS.rows) {
      const lineW = resolvedRows ? clamp(rowPx * 0.35, 0.5, 1.15) : clamp(spacingPx * 0.24, 0.45, 0.95)
      buf.rows.push(tx * env.sx, ry0, bx * env.sx, ry1, lineW, (resolvedRows ? 0.24 : 0.30) * fade)
      buf.rowMeta.push(toneIdx)
    }
    const steps = resolvedRows ? clamp(Math.round((ry1 - ry0) / Math.max(2.2, rowPx * 0.85)), 2, 4) : 2
    for (let s = 0; s < steps && addedTrees < 5 && buf.trees.length / 6 < CAPS.trees; s++) {
      if (rand() > 0.38 + 0.62 * density) continue
      const t = (s + 0.35 + (rand() - 0.5) * 0.2) / steps
      const rx = tx + (bx - tx) * t, ry = ry0 + (ry1 - ry0) * t
      const r = clamp((crownM / Math.max(2, mPerPx)) * (0.72 + 0.45 * t), 1.0, 3.6)
      if (ry < env.crestAt(rx) + 1.5 || env.blocked(rx, ry, r + 0.8) || !isOrchardCover(env.coverAt(rx, ry))) continue
      const height = orchard === 'palm' ? r * (2.7 + 0.6 * rand()) : r * (1.5 + 0.45 * rand())
      buf.trees.push(rx * env.sx, ry, r, height, rand() * Math.PI * 2, 0.25 + 0.5 * rand())
      buf.treeMeta.push(kindCode, toneIdx, alphaByte)
      addedTrees++
    }
  }
}
