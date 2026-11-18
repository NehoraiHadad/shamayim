import { profileY } from '../../data/terrain/profile'
import { FLOOR_Y, SEA_Y } from './sceneBox'

/** Snow on the ridges for the shown hour: how much, and the height (m) above which it lies. */
export interface SnowFall {
  /** 0–1: a dusting to a heavy fall. */
  amount: number
  /** Snow line, metres above sea level. */
  lineM: number
}

/** Weather codes that mean snow, with how heavy each reads (WMO: 71/73/75 snow, 77 grains, 85/86 showers). */
const CODE_AMOUNT: Record<number, number> = { 71: .3, 73: .55, 75: .85, 77: .25, 85: .4, 86: .75 }
/** Temperature drop per metre of height (standard lapse rate). */
const LAPSE = .0065
/** Snow reaches the ground up to about this air temperature; above it falls as rain. */
const SNOW_TEMP = 2
/** A heavy fall cools the air it falls through, so the line comes down further (m at amount 1). */
const HEAVY_DROP = 100
/** cm/h that counts as a heavy fall. */
const HEAVY_CMH = 2

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Snow caps only when it actually snows: a snow weather code or snowfall in the shown hour; null on any other day.
 * The line sits where the air cools to `SNOW_TEMP` going up from the place, and never above the place itself while
 * snow is falling there. A high hill town (כרמי צור, ~950 m) gets white tops; a valley below sea level, only if cold.
 */
export function snowFall(air: { weatherCode: number; snowfall: number; temperature: number }, elevationM: number): SnowFall | null {
  const coded = CODE_AMOUNT[air.weatherCode] ?? 0
  if (coded === 0 && !(air.snowfall > 0)) return null
  const amount = clamp01(Math.max(coded, air.snowfall / HEAVY_CMH, .2))
  const line = Math.min(elevationM, elevationM + (air.temperature - SNOW_TEMP) / LAPSE)
  return { amount, lineM: line - HEAVY_DROP * amount }
}

/**
 * The y (px) of a height on a ridge: through the ridge's own sampled profile when known, else (the hand-drawn valley)
 * from the sea line and the valley floor where the place stands. Null when no ridge height is known at all.
 */
export function heightY(metres: number, elevations: readonly number[] | undefined, placeM: number | null): number | null {
  if (elevations?.length) return profileY(elevations.map((elevation) => ({ elevation })), metres)
  if (placeM === null || placeM >= 0) return null
  return SEA_Y - (metres / -placeM) * (FLOOR_Y - SEA_Y)
}
