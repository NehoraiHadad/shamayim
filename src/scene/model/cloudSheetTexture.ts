import { createClumpSampler } from '../../world/field/clump'
import { smoothstep } from '../../world/field/genus'
import { DIFFUSE_EXTINCTION } from './cloudSheetMath'
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
  // N3h places Sc/Ac tone detail below the typical cell diameter.
  // As bands vary on sub-kilometre scales across the wind and merge along it.
  st: [8, 1, 0.15], sc: [0.4, 1, 0.5], as: [0.75, 6, 0.9], ac: [0.2, 1, 0.6],
  cs: [18, 1, 0.1], ci: [2, 6, 0.1], ns: [6, 1, 0.15],
  cu: [1.5, 1, 0.5], cg: [3, 1, 0.5], cb: [6, 1, 0.5],
}

const periodFor = (genus: Genus) =>
  scales[genus][0] * (genus === 'sc' || genus === 'ac' ? 1 : 2)

const samplers = new Map<string, [ReturnType<typeof createClumpSampler>, ReturnType<typeof createClumpSampler>]>()

export function sheetTexture(genus: Genus, layer: FieldLayer, seed: number) {
  const [scale, stretch, deviation] = scales[genus]
  const angle = Math.atan2(layer.vel[0], layer.vel[1])
  const sin = Math.sin(angle), cos = Math.cos(angle)
  const [dx, dy] = layer.d
  const period = periodFor(genus)
  const key = `${seed}:${period}:${scale}`
  let pair = samplers.get(key)
  if (!pair) {
    if (samplers.size >= 32) samplers.delete(samplers.keys().next().value!)
    pair = [createClumpSampler(seed, period), createClumpSampler(seed ^ 0x51ed270b, scale / 2)]
    samplers.set(key, pair)
  }
  const [coarse, fine] = pair
  return (footprint: number) => {
    const a = deviation * 5 * (1 - smoothstep(period / 2, period, footprint))
    const b = deviation * 2 * (1 - smoothstep(scale / 4, scale / 2, footprint))
    const coarseFine = 1 - smoothstep(scale / 2, scale, footprint)
    const fineFine = 1 - smoothstep(scale / 8, scale / 4, footprint)
    return (x: number, y: number) => {
      const e = x - dx, n = y - dy
      const u = e * cos - n * sin, v = (e * sin + n * cos) / stretch
      const variation = (a ? a * (coarse(u, v, coarseFine) - 0.5) : 0)
        + (b ? b * (fine(u, v, fineFine) - 0.5) : 0)
      // A thickness deficit in As reaches zero instead of folding into a
      // second thick band as the squared noise crosses zero.
      const signal = genus === 'as' ? Math.max(0, 1 + variation) : 1 + variation
      return signal * signal
    }
  }
}

export const sheetDetail = (genus: Genus, footprint: number) =>
  1 - smoothstep(periodFor(genus) / 2, periodFor(genus), footprint)

/** Look. How much of a thick base's own variation is seen: the light spreads sideways on its way down through the cloud, and
 *  evens out a good half of what the columns would show alone (radiative smoothing, Marshak et al. 1995). */
const BASE_CONTRAST = 0.4

/**
 * The light of a thick open cloud's base against its mean (1), per node: what comes through a column as deep as that goes as
 * 1 / (1 + kτ), so it falls as its liquid water grows, the more the thicker it is. Nothing of it in a thin cloud, whose
 * tone and veil show its texture, nor in a closing deck; none on the whole, as it is drawn (`ys`).
 */
export function baseSource(ys: number[], tau: number[], slant: number[], fade: number[], texel: (index: number) => number,
  cols: number, cover: number): number[] {
  const contrast = BASE_CONTRAST * (1 - smoothstep(0.6, 0.95, cover)), out = new Array<number>(ys.length * cols).fill(0)
  const thick = out.slice()
  let sum = 0, area = 0
  if (contrast) for (let row = 0; row < ys.length; row++) {
    const height = (ys[Math.min(ys.length - 1, row + 1)] - ys[Math.max(0, row - 1)]) / 2
    for (let i = row * cols; i < (row + 1) * cols; i++) {
      const depth = DIFFUSE_EXTINCTION * tau[i] * slant[row] * (1 - fade[row])
      if (!depth) continue
      // Once for how the light moves with the depth, once for the share of it the cloud's own tone no longer moves with.
      thick[i] = (depth / (1 + depth)) ** 2
      out[i] = -Math.log(Math.max(0.1, texel(i)))
      sum += height * thick[i] * out[i]
      area += height * thick[i]
    }
  }
  const mean = area && sum / area
  return out.map((value, i) => 1 + contrast * thick[i] * (value - mean))
}
