/** 24 px over 60 km: ~2.5 km a pixel, finer than the mask itself (~4–5 km over Israel), a ~1 kB PNG. */
export const SAMPLE_PX = 24
export const SAMPLE_KM = 60
/** The cover that corrects "now" is read from the middle 30 km, as before: one passing cloud must not flip it. */
const COVER_PX = 12

/** What one slot's cloud-mask image says: the middle's cover (0–100), and the cloudy pixels of the whole sample. */
export interface MaskReading {
  cover: number
  mask: boolean[]
}

const isCloud = (rgba: Uint8ClampedArray, i: number) =>
  rgba[i + 3] >= 128 && rgba[i] > 200 && rgba[i + 1] > 200 && rgba[i + 2] > 200

/** Share of cloud pixels in a cloud-mask image (cloud is drawn white; clear land/sea are coloured). */
export function cloudShare(rgba: Uint8ClampedArray): number | null {
  let seen = 0, cloudy = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    seen += 1
    if (isCloud(rgba, i)) cloudy += 1
  }
  return seen ? (100 * cloudy) / seen : null
}

/** The middle `inner`×`inner` pixels of an `n`×`n` RGBA image. */
function centre(rgba: Uint8ClampedArray, n: number, inner: number): Uint8ClampedArray {
  const from = (n - inner) / 2
  const out = new Uint8ClampedArray(inner * inner * 4)
  for (let j = 0; j < inner; j++) out.set(rgba.subarray(((from + j) * n + from) * 4, ((from + j) * n + from + inner) * 4), j * inner * 4)
  return out
}

/** Cover of the middle and the cloudy pixels of the whole sample, from one RGBA cloud-mask image. */
export function readMask(rgba: Uint8ClampedArray): MaskReading | null {
  const cover = cloudShare(centre(rgba, SAMPLE_PX, COVER_PX))
  if (cover == null) return null
  return { cover, mask: Array.from({ length: SAMPLE_PX * SAMPLE_PX }, (_, k) => isCloud(rgba, k * 4)) }
}
