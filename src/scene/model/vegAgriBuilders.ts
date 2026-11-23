//# allFunctionsCalledOnLoad
import { clipSpans } from './vegClipping'
import { cropFieldState, distanceFade, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX, FIELD_STATE_CODE } from './vegRules'
import { TONE } from './vegSample'
import { CAPS, type BackgroundWeight, type BuildEnv, type VegBuffers } from './vegBuilders'
import type { AreaLimit, Footprint } from './vegFootprint'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Nominal 1.44–16 ha square parcel widths, sampling the small/medium field classes in
// Lesiv et al. (2019), https://doi.org/10.1111/gcb.14492. Actual parcel boundaries are unknown.
const MIN_PARCEL_M = 120
const MAX_PARCEL_M = 400
// The painter's Bézier bow and stroked border fit in this CSS-pixel margin.
const FIELD_PAD = 1

export function addFieldParcel(
  buf: VegBuffers, env: BuildEnv, rand: () => number, refX: number, yTop: number, yBot: number, halfW: number,
  mPerPx: number, ndvi: number, dryness: number, cover = 4, mapped?: AreaLimit, weight?: BackgroundWeight,
): void {
  const fade = distanceFade(mPerPx, FIELD_FULL_M_PER_PX, FIELD_MAX_M_PER_PX)
  const y0 = Math.max(env.crestAt(refX) + 1.5, yTop), y1 = Math.min(env.footAt(refX) - 0.4, yBot)
  if (fade <= 0.002 || y1 - y0 < 2.5 || buf.fields.length / 9 >= CAPS.fields) return

  const vp = clamp(refX + (rand() - 0.5) * 140, -60, 435)
  const nominalWidthM = lerp(MIN_PARCEL_M, MAX_PARCEL_M, rand())
  const widthAt = (x: number, y: number) => nominalWidthM / (2 * Math.max(0.5, env.scaleAt(x, y)))
  // Cross-ray widths are metre-projected. Depth and convergence are stylised to follow the drawn face.
  const h0 = Math.max(4, y0 - env.horizonY), h1 = Math.max(h0 + 2, y1 - env.horizonY)
  const ratio = clamp(h0 / h1, 0.45, 0.92), topCx = lerp(vp, refX, ratio)
  const nearHalf = Math.min(halfW, widthAt(refX, y1)), farHalf = Math.min(halfW * ratio, widthAt(topCx, y0))
  const state = cropFieldState(ndvi, dryness, env.solarMonth, env.koppen)
  const tone = state === 'growing' ? TONE.FIELD_GREEN : state === 'ploughed' ? TONE.FIELD_PLOUGH : TONE.FIELD_STRAW
  const alpha = fade * (0.50 + 0.18 * rand())
  const coverOk = (c: number | null) => c === cover

  function parcel(scale: number) {
    const edgeAt = (y: number, side: number) => {
      const t = (y - y0) / (y1 - y0)
      const centre = lerp(topCx, refX, t)
      const width = Math.min(lerp(farHalf, nearHalf, t), widthAt(centre, y))
      return clamp(centre + width * side * scale, 1, 374)
    }
    const corners = (a: number, b: number) => [edgeAt(a, -1), edgeAt(a, 1), edgeAt(b, 1), edgeAt(b, -1)] as const
    const envelope = (a: number, b: number, [l0, r0, r1, l1]: ReturnType<typeof corners>): Footprint =>
      [Math.min(l0, l1) - FIELD_PAD / env.sx, a - FIELD_PAD, Math.max(r0, r1) + FIELD_PAD / env.sx, b + FIELD_PAD]
    const fits = (a: number, b: number) => {
      const edges = corners(a, b)
      return edges[2] - edges[3] >= 2.5 && env.fits(envelope(a, b, edges), coverOk, mapped)
    }
    const emit = (a: number, b: number) => {
      if (buf.fields.length / 9 >= CAPS.fields) return
      const edges = corners(a, b)
      const localAlpha = alpha * (weight?.(envelope(a, b, edges)) ?? 1)
      if (localAlpha <= 0.002) return
      const [l0, r0, r1, l1] = edges.map((x) => x * env.sx)
      buf.fields.push(l0, a, r0, a, r1, b, l1, b, localAlpha)
      buf.fieldMeta.push(FIELD_STATE_CODE[state], tone)
    }
    return { fits, emit }
  }

  for (const scale of [1, 0.7, 0.45]) {
    const { fits, emit } = parcel(scale)
    if (fits(y0, y1)) { emit(y0, y1); return }
  }
  const { fits, emit } = parcel(0.7)
  clipSpans(y0, y1, fits, emit)
}
