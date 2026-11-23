import type { DeviceRect } from './paintJob'
import { MASK_TEXEL, type ShadowMask } from './shadowComposite'

function axis(size: number, offset: number, texel: number, limit: number, stride: number) {
  const indices = new Uint32Array(size), next = new Uint32Array(size), fractions = new Float32Array(size)
  const origin = (offset + 0.5) / texel - 0.5
  for (let p = 0; p < size; p++) {
    const v = Math.max(0, Math.min(origin + p / texel, limit - 1))
    const index = Math.floor(v)
    indices[p] = index * stride
    next[p] = Math.min(index + 1, limit - 1) * stride
    fractions[p] = v - index
  }
  return { indices, next, fractions }
}

export function maskSampling({ rect, ratio, cols, rows }: ShadowMask, box: DeviceRect) {
  const texel = MASK_TEXEL * ratio
  return { rect, columns: axis(box.w, box.x - rect.x, texel, cols, 1),
    rows: axis(box.h, box.y - rect.y, texel, rows, cols) }
}

export type Sampling = ReturnType<typeof maskSampling>

const LITTLE_ENDIAN = new Uint32Array(Uint8Array.of(1, 0, 0, 0).buffer)[0] === 1
const RED_BLUE = 0x00ff00ff

/** Equal coverage permits a rounded 8-bit interpolation. Red and blue occupy separate 16-bit lanes. */
function mixRgb(beam: number, shade: number, weight: number) {
  const lit = 255 - weight
  const rb = (beam & RED_BLUE) * lit + (shade & RED_BLUE) * weight + 0x00800080
  const g = (beam >>> 8 & 255) * lit + (shade >>> 8 & 255) * weight + 128
  // For channel numerators rounded to the nearest byte, division by 255 uses two shifts.
  return (beam & 0xff000000) | (((rb + (rb >>> 8 & RED_BLUE)) >>> 8) & RED_BLUE) | ((g + (g >>> 8)) & 0xff00)
}

/** Sum the weighted premultiplied colours (Canvas lighter), then return straight RGBA for ImageData. */
export function blendPixels(beam: Uint8ClampedArray, shade: Uint8ClampedArray, shadeOffset: number, shadeWidth: number,
  alpha: Uint8Array, { columns, rows }: Sampling, beamOffset: number, beamWidth: number) {
  const width = columns.indices.length
  const litPixels = LITTLE_ENDIAN ? new Uint32Array(beam.buffer, beam.byteOffset, beam.byteLength / 4) : undefined
  const darkPixels = LITTLE_ENDIAN ? new Uint32Array(shade.buffer, shade.byteOffset, shade.byteLength / 4) : undefined
  for (let y = 0; y < rows.indices.length; y++) {
    const row = rows.indices[y], nextRow = rows.next[y], dy = rows.fractions[y]
    const litStart = beamOffset + y * beamWidth, darkStart = shadeOffset + y * shadeWidth
    for (let x = 0; x < width; x++) {
      const p = litStart + x, q = darkStart + x
      const i = p * 4, s = q * 4
      const a = beam[i + 3], b = shade[s + 3]
      if (!(a || b)) continue
      const column = columns.indices[x], nextColumn = columns.next[x], dx = columns.fractions[x]
      const tl = alpha[row + column], bl = alpha[nextRow + column]
      const top = tl + (alpha[row + nextColumn] - tl) * dx
      const bottom = bl + (alpha[nextRow + nextColumn] - bl) * dx
      const weight = Math.round(top + (bottom - top) * dy)
      if (!weight) continue
      if (a === b) {
        if (litPixels && darkPixels) {
          litPixels[p] = mixRgb(litPixels[p], darkPixels[q], weight)
          continue
        }
        const t = weight * (1 / 255)
        beam[i] += (shade[s] - beam[i]) * t
        beam[i + 1] += (shade[s + 1] - beam[i + 1]) * t
        beam[i + 2] += (shade[s + 2] - beam[i + 2]) * t
        continue
      }
      const dark = b * weight, sum = a * (255 - weight) + dark
      if (sum) {
        const t = dark / sum
        beam[i] += (shade[s] - beam[i]) * t
        beam[i + 1] += (shade[s + 1] - beam[i + 1]) * t
        beam[i + 2] += (shade[s + 2] - beam[i + 2]) * t
      }
      beam[i + 3] = sum / 255
    }
  }
}

