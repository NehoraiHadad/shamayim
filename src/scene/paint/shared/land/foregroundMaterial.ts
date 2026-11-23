import { foregroundShare, type ForegroundMaterial } from '../../../model/foregroundMaterial'
import { ALBEDO_CHROMA_BOOST, albedoLinear } from '../../../model/landRadiance'

export function prepareForeground(field: ForegroundMaterial) {
  const { cols, rows, rgba } = field
  const linear = new Float32Array(rgba.length)
  for (let i = 0; i < rgba.length; i += 4) {
    const w = rgba[i + 3] / 255
    if (!w) continue
    const rgb = albedoLinear([rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255], ALBEDO_CHROMA_BOOST)
    for (let k = 0; k < 3; k++) linear[i + k] = rgb[k] * w
    linear[i + 3] = w
  }
  return { cols, rows, linear, rangeKm: field.rangeKm }
}

/** The foreground follows projected ground coordinates, including where the base palette is warped. */
export function blendForeground(field: ReturnType<typeof prepareForeground>, u: number, v: number, out: [number, number, number]) {
  const { cols, rows, linear, rangeKm } = field
  const x = u * (cols - 1), y = v * (rows - 1)
  const c = Math.floor(x), r = Math.floor(y), dx = x - c, dy = y - r
  const a = (r * cols + c) * 4, b = c + 1 < cols ? a + 4 : a
  const d = r + 1 < rows ? cols * 4 : 0
  const w0 = (1 - dx) * (1 - dy), w1 = dx * (1 - dy), w2 = (1 - dx) * dy, w3 = dx * dy
  const w = w0 * linear[a + 3] + w1 * linear[b + 3] + w2 * linear[a + d + 3] + w3 * linear[b + d + 3]
  if (w <= 0) return
  // The projected grid must not interpolate foreground colour past the physical cutoff.
  const km = w0 * rangeKm[a / 4] + w1 * rangeKm[b / 4] + w2 * rangeKm[(a + d) / 4] + w3 * rangeKm[(b + d) / 4]
  const share = Math.min(w, foregroundShare(km))
  if (share <= 0) return
  const scale = share / w
  for (let k = 0; k < 3; k++) {
    const colour = w0 * linear[a + k] + w1 * linear[b + k] + w2 * linear[a + d + k] + w3 * linear[b + d + k]
    out[k] = out[k] * (1 - share) + scale * colour
  }
}
