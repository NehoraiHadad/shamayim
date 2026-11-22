import { createClumpSampler } from '../../world/field/clump'
import { smoothstep } from '../../world/field/genus'
import type { FieldLayer, Genus } from '../../world/field/types'

const depthFraction = (tau: number) => tau / (1 + tau)

/** Preserve both the area mean of the texture and the area integral of optical depth. */
export function textureCorrection(texture: number[], tau: number[], weights: number[], cols: number, detail?: number[]) {
  let area = 0, depth = 0, fraction = 0, depthFractionSum = 0, noise = 0, depthNoise = 0
  for (let row = 0; row < weights.length; row++) {
    const weight = weights[row]
    if (!weight) continue
    for (let i = row * cols; i < (row + 1) * cols; i++) {
      const active = weight * (detail?.[i] ?? 1)
      if (!active) continue
      const t = tau[i], q = depthFraction(t), n = (texture[i] - 1) * weights[row]
      area += active
      depth += active * t
      fraction += active * q
      depthFractionSum += active * t * q
      noise += n
      depthNoise += t * n
    }
  }
  if (!area) return (index: number) => texture[index]
  const mean = noise / area
  const qMean = fraction / area
  const variance = depthFractionSum - depth * qMean
  const slope = variance > Number.EPSILON * depth ? (depthNoise - depth * mean) / variance : 0
  const offset = mean - slope * qMean
  // Shift and rescale the corrected deviation together to retain both zero moments.
  const lift = Math.max(0, offset, offset + slope)
  return (index: number) => {
    const fade = detail?.[index] ?? 1
    if (!fade) return 1
    return 1 + (texture[index] - 1 - fade * (offset + slope * depthFraction(tau[index]))) / (1 + lift)
  }
}

const scales: Record<Genus, [km: number, stretch: number, deviation: number]> = {
  st: [8, 1, 0.15], sc: [1.5, 1, 0.5], as: [2, 6, 0.3], ac: [0.6, 1, 0.6],
  cs: [18, 1, 0.1], ci: [2, 6, 0.1], ns: [6, 1, 0.15],
  cu: [1.5, 1, 0.5], cg: [3, 1, 0.5], cb: [6, 1, 0.5],
}

const samplers = new Map<string, [ReturnType<typeof createClumpSampler>, ReturnType<typeof createClumpSampler>]>()

export function sheetTexture(genus: Genus, layer: FieldLayer, seed: number) {
  const [scale, stretch, deviation] = scales[genus]
  const angle = Math.atan2(layer.vel[0], layer.vel[1])
  const sin = Math.sin(angle), cos = Math.cos(angle)
  const [dx, dy] = layer.d
  const key = `${seed}:${scale}`
  let pair = samplers.get(key)
  if (!pair) {
    if (samplers.size >= 32) samplers.delete(samplers.keys().next().value!)
    pair = [createClumpSampler(seed, scale * 2), createClumpSampler(seed ^ 0x51ed270b, scale / 2)]
    samplers.set(key, pair)
  }
  const [coarse, fine] = pair
  return (footprint: number) => {
    const a = deviation * 5 * (1 - smoothstep(scale, scale * 2, footprint))
    const b = deviation * 2 * (1 - smoothstep(scale / 4, scale / 2, footprint))
    const coarseFine = 1 - smoothstep(scale / 2, scale, footprint)
    const fineFine = 1 - smoothstep(scale / 8, scale / 4, footprint)
    return (x: number, y: number) => {
      const e = x - dx, n = y - dy
      const u = e * cos - n * sin, v = (e * sin + n * cos) / stretch
      const signal = 1 + (a ? a * (coarse(u, v, coarseFine) - 0.5) : 0) + (b ? b * (fine(u, v, fineFine) - 0.5) : 0)
      return signal * signal
    }
  }
}

export const sheetDetail = (genus: Genus, footprint: number) =>
  1 - smoothstep(scales[genus][0], scales[genus][0] * 2, footprint)
