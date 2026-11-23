import { shadowCoverage } from '../model/cloudShadowEdge'
import { shadowRadii, SHADOW_CARRY_SECONDS, SHADOW_DEPTH_STEPS, type ShadowBlob } from '../model/planeCloudShadow'
import type { DeviceRect } from './paintJob'

/** Cache one stationary stencil per projected cell. Advection only shifts
 * its scanlines. Lobes, the disc and transport stay out of the frame loop. */
export function prepareShadowStamp(blob: ShadowBlob, alpha: Uint8Array, rect: DeviceRect, ratio: number, texel: number) {
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
  const profile = transportProfile(alpha, opticalDepth)
  for (let j = top; j <= bottom; j++) {
    const y = ((j + .5) * texel + rect.y / ratio - blob.y) / blob.ry
    let start = last + 1, end = first - 1
    for (let i = first; i <= last; i++) {
      const x = i * texel / blob.rx
      let depth: number
      if (edge) {
        const angle = Math.atan2(y, x), count = edge.lobes.length
        const sector = (angle / (2 * Math.PI) * count + count) % count, k = Math.floor(sector)
        const radius = 1 + edge.lobes[k] + (edge.lobes[(k + 1) % count] - edge.lobes[k]) * (sector - k)
        // Project the anisotropic disc onto this edge's normal.
        const penumbra = Math.hypot(Math.cos(angle) * edge.penumbraX / blob.rx, Math.sin(angle) * edge.penumbraY / blob.ry)
        const coverage = shadowCoverage(Math.hypot(x, y), radius, penumbra)
        depth = profile[Math.round(coverage * 255)]
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

function transportProfile(alpha: Uint8Array, depth: number) {
  // Area-average the two endpoints over the penumbra, then store the
  // equivalent optical depth so overlapping cell stencils still add depth.
  const max = Math.min(alpha.length - 1, Math.round(depth * SHADOW_DEPTH_STEPS))
  const profile = new Float32Array(256)
  for (let i = 1, bin = 0; i < 255; i++) {
    const target = i * alpha[max] / 255
    while (bin < max && alpha[bin] < target) bin++
    profile[i] = bin / SHADOW_DEPTH_STEPS
  }
  profile[255] = depth
  return profile
}
