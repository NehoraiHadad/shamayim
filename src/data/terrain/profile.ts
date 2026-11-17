export interface TerrainSample {
  elevation: number
  latitude?: number
  longitude?: number
}

export interface TerrainPaths {
  near: string
  far: string
  centerY: number
  seaInView: boolean
}

const TOP = 18
const BOTTOM_GAP = 24
const MIN_RELIEF_METRES = 120

/** Maps an ordered west-to-east elevation profile into a closed SVG land path. */
export function profileToPath(
  samples: readonly TerrainSample[],
  w = 375,
  h = 128,
): string {
  if (samples.length === 0) return gentleHillsPath(w, h)

  const values = samples.map(({ elevation }) => Number.isFinite(elevation) ? elevation : 0)
  const points = values.map((value, index) => {
    const x = values.length === 1 ? w / 2 : (index / (values.length - 1)) * w
    return `${round(x)} ${round(profileY(samples, value, h))}`
  })

  return `M0 ${h}L${points.join('L')}L${w} ${h}Z`
}

/** Stable fallback used while terrain loads or when the elevation service is unavailable. */
export function gentleHillsPath(w = 375, h = 128): string {
  return `M0 ${h}V72C48 48 92 52 136 70S220 88 264 62S334 48 ${w} 66V${h}Z`
}

export function sampleY(samples: readonly TerrainSample[], index: number, h = 128): number {
  const sample = samples[Math.min(Math.max(index, 0), Math.max(0, samples.length - 1))]
  return sample ? profileY(samples, sample.elevation, h) : h * 0.62
}

export function profileY(samples: readonly TerrainSample[], value: number, h = 128): number {
  if (!samples.length) return h * 0.62
  const values = samples.map((sample) => Number.isFinite(sample.elevation) ? sample.elevation : 0)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const range = Math.max(high - low, MIN_RELIEF_METRES)
  const offset = (range - (high - low)) / 2
  const drawable = Math.max(1, h - TOP - BOTTOM_GAP)
  const y = TOP + ((high + offset - value) / range) * drawable
  return Math.min(h, Math.max(0, y))
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}
