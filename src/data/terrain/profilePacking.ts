import type { GroundSample } from './panorama'

// Preserve 0.02° steps around the horizon and use coarser steps for steep slopes.
const encode = (angle: number) => 1024 + Math.sign(angle) * (
  Math.abs(angle) <= 18 ? Math.round(Math.abs(angle) * 50) : 900 + Math.round((Math.abs(angle) - 18) * 1.5)
)
const decode = (value: number) => {
  const magnitude = Math.abs(value - 1024)
  return Math.sign(value - 1024) * (magnitude <= 900 ? magnitude / 50 : 18 + (magnitude - 900) / 1.5)
}

const pack = ({ angle, seen }: GroundSample) => (encode(angle) << 1) | Number(seen)
const unpack = (value: number): GroundSample => ({ angle: decode(value >> 1), seen: Boolean(value & 1) })

export function packProfiles(samples: GroundSample[]): string {
  let bytes = ''
  for (let i = 0; i < samples.length; i += 2) {
    const a = pack(samples[i])
    const b = samples[i + 1] ? pack(samples[i + 1]) : 0
    bytes += String.fromCharCode(a >> 4, ((a & 15) << 4) | (b >> 8), b & 255)
  }
  return btoa(bytes)
}

export function unpackProfiles(packed: string, count: number): GroundSample[] | null {
  try {
    const bytes = atob(packed)
    if (bytes.length !== Math.ceil(count / 2) * 3) return null
    const samples: GroundSample[] = []
    for (let i = 0; i < bytes.length; i += 3) {
      const middle = bytes.charCodeAt(i + 1)
      samples.push(unpack((bytes.charCodeAt(i) << 4) | (middle >> 4)))
      samples.push(unpack(((middle & 15) << 8) | bytes.charCodeAt(i + 2)))
    }
    return samples.slice(0, count)
  } catch {
    return null
  }
}
