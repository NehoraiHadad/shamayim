import { plainContrast } from '../../data/city/plainHaze'
import type { WorldState } from '../../world/types'
import { tonesAt } from './marks'
import { toneAt } from './planeLight'
import { mixRgb } from './tone'
import type { Tones } from './types'

/** The far-city contrast law, evaluated at the true receiving-eye distance, never the icon's drawn size. */
export const landmarkContrast = (world: WorldState, km: number) => plainContrast(km, world.air?.visibilityKm)

/** Existing land/far-city aerialFor is already in tonesAt. Contract material/detail contrast toward the
 * land at that same distance as well, rather than adding only a haze tint. Lamps use far-city Allard transmission. */
export function landmarkTonesAt(world: WorldState, km: number, contrast = landmarkContrast(world, km)): Tones {
  const own = tonesAt(world, km), land = toneAt(world, km), tones = {} as Tones
  for (const key of Object.keys(own) as (keyof Tones)[]) {
    tones[key] = key === 'mist' ? own[key] : mixRgb(land, own[key], key === 'win' ? Math.cbrt(contrast) : contrast)
  }
  return tones
}
