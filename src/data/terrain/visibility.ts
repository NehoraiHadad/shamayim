import { apparentAngle, type Panorama } from './panorama'
import { inProfile, sampleGround, sightProfiles } from './sightProfile'

export interface SeenPoint {
  angle: number
  groundAngle: number
  y: number
  groundY: number
}

export function visibilityAt(p: Panorama, yOf: (angle: number) => number, { profileAt } = sightProfiles(p)) {
  return (x: number, km: number, heightM = 0): SeenPoint | null => {
    if (!inProfile(km)) return null
    const profile = profileAt(x)
    if (!profile || km <= profile.nearKm) return null
    const { angles, before, a, b } = profile
    const { i, exact, height } = sampleGround(profile, km)
    const groundAngle = exact ? angles[i] : apparentAngle(height, km, 0)
    const angle = heightM ? apparentAngle(height + heightM, km, 0) : groundAngle
    if (angle < before[i]) return null
    // The stored visibility bit breaks quantization ties at sampled distances.
    if (!heightM && exact && angle === before[i] && !a.profile[i].seen && !b.profile[i].seen) return null
    return { angle, groundAngle, y: yOf(angle), groundY: yOf(groundAngle) }
  }
}
