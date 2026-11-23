import { edgeCoverage } from '../model/cloudShadowEdge'
import { shadowRadii, SHADOW_CARRY_SECONDS, type ShadowBlob } from '../model/planeCloudShadow'
import type { DeviceRect } from './paintJob'

/** Cache one stationary stencil per projected cell. Advection only shifts
 * its scanlines. Lobes, the disc and transport stay out of the frame loop. */
export function prepareShadowStamp(blob: ShadowBlob, rect: DeviceRect, ratio: number, texel: number) {
  const [rx, ry] = shadowRadii(blob)
  const carry = SHADOW_CARRY_SECONDS * blob.speed
  const first = Math.max(Math.floor(-rx / texel), Math.floor((rect.x / ratio - blob.x - Math.max(0, carry)) / texel) - 2)
  const last = Math.min(Math.ceil(rx / texel), Math.ceil(((rect.x + rect.w) / ratio - blob.x - Math.min(0, carry)) / texel) + 2)
  const top = Math.max(0, Math.ceil((blob.y - ry - rect.y / ratio) / texel - .5))
  const bottom = Math.min(Math.ceil(rect.h / (ratio * texel)) - 1, Math.floor((blob.y + ry - rect.y / ratio) / texel - .5))
  const width = Math.max(0, last - first + 1)
  const height = Math.max(0, bottom - top + 1)
  const data = new Float32Array(width * height)
  const spans = new Int32Array(height * 2)
  const { edge, opticalDepth } = blob
  const removed = -Math.expm1(-opticalDepth)
  for (let j = top; j <= bottom; j++) {
    const y = ((j + .5) * texel + rect.y / ratio - blob.y) / blob.ry
    let start = last + 1, end = first - 1
    for (let i = first; i <= last; i++) {
      const x = i * texel / blob.rx
      let depth: number
      if (edge) {
        const coverage = edgeCoverage(edge, x, y)
        depth = coverage === 1 ? opticalDepth : -Math.log1p(-coverage * removed)
      } else {
        depth = opticalDepth * Math.max(0, 1 - x * x - y * y) ** 2
      }
      data[(j - top) * width + i - first] = depth
      if (depth > 0) {
        start = Math.min(start, i)
        end = i
      }
    }
    spans[(j - top) * 2] = start - first
    spans[(j - top) * 2 + 1] = end - first
  }
  return { first, last, top, bottom, width, data, spans, x: blob.x, speed: blob.speed }
}
