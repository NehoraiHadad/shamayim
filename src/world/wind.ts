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
  /** The shown air's direction: now's (`current`), or a forced one. */
  shownFromDeg: number
  /** The hour under the shown minute, when a preview: its own direction and wind aloft, when the forecast gives them. */
  hour?: Pick<HourPoint, 'windDirection' | 'windAloft'>
  preview: boolean
  forced: boolean
}

/** Where a wind from `fromDeg` moves across the screen: + left → right (the direction it goes, through the camera). */
export const acrossOf = (fromDeg: number, camera: Camera) => lateral((fromDeg + 180) % 360, camera)

/**
 * One wind for the whole scene: rain slant, cloud drift, tree lean, smoke and the water's ruffle all read it. The 10 m
 * direction is the hour's when a picked hour gives one, else now's (`current`); aloft, the forecast's 850 / 700 / 300 hPa
 * wind when known, else the 10 m wind scaled up in the same direction.
 */
export function windOf(input: WindInput, camera: Camera): { wind: Wind; sources: Pick<WorldSources, 'windDirection' | 'windAloft'> } {
  const hourDirection = input.preview ? input.hour?.windDirection ?? null : null
  const fromDeg = input.forced ? input.shownFromDeg : hourDirection ?? input.shownFromDeg
  const ms = input.speedKmh / KMH
  const aloftData = input.hour?.windAloft ?? null
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
    sources: { windDirection: input.forced ? 'forced' : hourDirection === null ? 'current' : 'hour', windAloft: fromData ? 'forecast' : 'derived' },
  }
}
