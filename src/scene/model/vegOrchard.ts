import { seeded } from '../../data/landmarks/hash'
import type { AreaLimit, Footprint } from './vegFootprint'
import { clipSpans } from './vegClipping'
import {
  distanceFade, MIN_RESOLVED_ROW_PX, ORCHARD_ALLEY_M, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX,
  ORCHARD_ROW_M, TREE_KIND_CODE, type OrchardKind,
} from './vegRules'
import { TONE } from './vegSample'
import { CAPS, type BuildEnv, type VegBuffers } from './vegBuilders'
import { treeExtent } from './vegShapes'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toneFor = (kind: OrchardKind) => kind === 'palm' ? TONE.PALM : kind === 'citrus' ? TONE.CITRUS : TONE.OLIVE
const orchardCover = (c: number | null) => c === 1 || c === 4

/** The coarse background can grow as the detailed orchard disappears without changing the ecological class. */
export const orchardDetail = (mPerPx: number) => distanceFade(mPerPx, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)

export function addOrchardBlock(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, yTop: number, yBot: number, spanRef: number,
  mPerPx: number, orchard: OrchardKind, density: number, mapped?: AreaLimit, slope = 0,
): void {
  const fade = orchardDetail(mPerPx)
  const y0 = Math.max(env.crestAt(refX) + 1.0, yTop), y1 = Math.min(env.footAt(refX) - 0.8, yBot)
  if (fade <= 0.002 || y1 - y0 < 1.4) return
  const drift = (rand() - 0.5) * spanRef * 0.36
  const bounds: Footprint = [refX - spanRef / 2 - Math.abs(drift), y0, refX + spanRef / 2 + Math.abs(drift), y1]
  const maxScale = Math.max(0.5, env.farScale(bounds))
  // The farthest part of the block sets the CSS-pixel spacing gate. The extra pixel blends rows and alleys
  // before the row centres become unreadable. Steep radial slopes use a canopy/management block motif.
  const resolved = (1 - distanceFade(ORCHARD_ROW_M[orchard] * env.sx / maxScale,
    MIN_RESOLVED_ROW_PX, MIN_RESOLVED_ROW_PX + 1)) * distanceFade(Math.abs(slope), 0.15, 0.22)
  const individualSeed = rand() * 0x100000000, aggregateSeed = rand() * 0x100000000
  const tone = toneFor(orchard)

  function paintableLines(pitchM: number, weight: number, individual: boolean, seed: number) {
    if (weight <= 0.002) return
    const random = seeded(seed)
    const topGap = pitchM / Math.max(0.5, env.scaleAt(refX + drift, y0))
    const bottomGap = pitchM / Math.max(0.5, env.scaleAt(refX, y1))
    const lineCount = Math.min(5, 1 + Math.floor(spanRef / Math.max(topGap, bottomGap)))
    const lineWidth = clamp(pitchM * env.sx / maxScale * 0.24, 0.5, 1.15)
    const pad = lineWidth / 2 + 0.15
    const kind = TREE_KIND_CODE[individual ? orchard : 'orchard']
    const opacity = Math.round(weight * (individual ? 0.96 : 0.78) * 255)
    let addedTrees = 0

    for (let i = 0; i < lineCount; i++) {
      const index = i - (lineCount - 1) / 2
      const tx = refX + drift + index * topGap, bx = refX + index * bottomGap
      const xAt = (y: number) => tx + (bx - tx) * (y - y0) / (y1 - y0)
      const yStart = Math.max(y0, env.crestAt(tx) + 1.0), yEnd = Math.min(y1, env.footAt(bx) - 0.8)
      if (yEnd - yStart < 1.2) continue
      const fits = (a: number, b: number) => {
        const x0 = xAt(a), x1 = xAt(b)
        return env.fits([Math.min(x0, x1) - pad / env.sx, a - pad, Math.max(x0, x1) + pad / env.sx, b + pad],
          orchardCover, mapped)
      }
      const emit = (a: number, b: number) => {
        if (buf.rows.length / 6 < CAPS.rows) {
          buf.rows.push(xAt(a) * env.sx, a, xAt(b) * env.sx, b, lineWidth, weight * (individual ? 0.28 : 0.34))
          buf.rowMeta.push(tone)
        }
      }
      clipSpans(yStart, yEnd, fits, emit, 0.45, 0.9)

      // Seed tree positions on whole rows. Splitting an interrupted row never shifts another crown.
      const steps = individual ? 3 : 2
      for (let j = 0; j < steps && addedTrees < 3 && buf.trees.length / 6 < CAPS.trees; j++) {
        if (random() > 0.38 + 0.62 * density) continue
        const t = (j + 0.35 + (random() - 0.5) * 0.2) / steps
        const y = yStart + (yEnd - yStart) * t, x = xAt(y)
        // Crown sizes here are illustrated clusters at unresolved scales. Individual palms use the round
        // canopy proportions shown in FAO Date Palm Cultivation, ch. I (https://www.fao.org/4/y4360e/y4360e05.htm).
        const crownM = individual ? (orchard === 'palm' ? 7 : 5.5) : 18
        const r = clamp(crownM / (2 * Math.max(0.5, env.scaleAt(x, y))) * env.sx, 0.8, 3.6)
        const height = r * (kind === 3 ? 2.7 + 0.6 * random() : 1.5 + 0.45 * random())
        const phase = random() * Math.PI * 2, shade = 0.25 + 0.5 * random()
        if (!env.fits(treeExtent(x, y, r, height, phase, kind, env.sx), orchardCover, mapped)) continue
        buf.trees.push(x * env.sx, y, r, height, phase, shade)
        buf.treeMeta.push(kind, tone, opacity)
        addedTrees++
      }
    }
  }

  paintableLines(ORCHARD_ROW_M[orchard], fade * resolved, true, individualSeed)
  paintableLines(ORCHARD_ALLEY_M[orchard], fade * (1 - resolved), false, aggregateSeed)
}
