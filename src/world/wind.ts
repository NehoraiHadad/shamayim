import { lateral, type Camera } from '../domain/camera'
import type { HourPoint, WindVector } from '../domain/types'
import type { CloudLevel, Wind, WorldSources } from './types'

/** Wind at the cloud levels from the 10 m wind, until the forecast's own arrives (plan §1a; a marked fallback). */
export const ALOFT_FACTOR: Record<CloudLevel, number> = { low: 1.4, mid: 2, high: 3 }

const LEVELS: CloudLevel[] = ['low', 'mid', 'high']
const KMH = 3.6

export interface WindInput {
  /** The shown wind (now's, or the picked hour's), km/h. */
  speedKmh: number
  gustKmh: number
  shownFromDeg: number
  directionSource: WorldSources['windDirection']
  aloft?: HourPoint['windAloft']
  forced: boolean
}

/** Where a wind from `fromDeg` moves across the screen: + left → right (the direction it goes, through the camera). */
export const acrossOf = (fromDeg: number, camera: Camera) => lateral((fromDeg + 180) % 360, camera)

/**
 * One wind for the whole scene: rain slant, cloud drift, tree lean, smoke and the water's ruffle all read it. The 10 m
 * direction comes from the timeline. Aloft, use the forecast's 850 / 700 / 300 hPa wind when available.
 */
export function windOf(input: WindInput, camera: Camera): { wind: Wind; sources: Pick<WorldSources, 'windDirection' | 'windAloft'> } {
  const fromDeg = input.shownFromDeg
  const ms = input.speedKmh / KMH
  const aloftData = input.aloft
  const vector = (level: CloudLevel): WindVector | null => aloftData?.[level] ?? null
  const fromData = Boolean(aloftData && LEVELS.some((level) => vector(level)))
  const aloft = {} as Record<CloudLevel, number>
  const aloftAcross = {} as Record<CloudLevel, number>
  for (const level of LEVELS) {
    const v = vector(level)
    aloft[level] = v ? v.speed / KMH : ms * ALOFT_FACTOR[level]
    aloftAcross[level] = acrossOf(v ? v.fromDeg : fromDeg, camera)
  }
  return {
    wind: { fromDeg, towardDeg: (fromDeg + 180) % 360, ms, gustMs: input.gustKmh / KMH, across: acrossOf(fromDeg, camera), aloft, aloftAcross },
    sources: { windDirection: input.forced ? 'forced' : input.directionSource, windAloft: fromData ? 'forecast' : 'derived' },
  }
}
