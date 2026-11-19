import { profileY } from '../data/terrain/profile'
import { FLOOR_Y, SEA_Y } from './sceneBox'

/** Snow on the ridges for the shown hour: how much, and the height (m) above which it lies. */
export interface SnowFall {
  /** 0–1: a dusting to a heavy fall or a deep cover. */
  amount: number
  /** Snow line, metres above sea level. */
  lineM: number
  /** Snow is falling now (the air is thick with it), not only lying from before. */
  falling: boolean
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
/** Lying snow thinner than this (m) is patches, not a cover: no cap. */
const DEPTH_MIN = .01
/** Lying snow this deep (m) reads as a full white cover. */
const DEPTH_FULL = .3
/** Snow lying at the place lies on the land around it too: the cover reaches at least this far below (m)... */
const COVER_BELOW = 100
/** ...and this much further at full depth, as a deep cover lies down the slopes. */
const DEPTH_DROP = 300

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type SnowAir = { weatherCode: number; snowfall: number; temperature: number; snowDepth?: number }

/**
 * Snow caps while it snows (a snow code or snowfall in the shown hour) and while snow lies on the ground after (the
 * model's snow depth), so a cover stays after the fall and melts away as the depth does; null on any other hour.
 * Falling: the line sits where the air cools to `SNOW_TEMP` going up from the place, never above the place. Lying:
 * the place is under snow, and a deeper cover reaches further down the slopes. The lower line and the larger amount win.
 */
export function snowFall(air: SnowAir, elevationM: number): SnowFall | null {
  const coded = CODE_AMOUNT[air.weatherCode] ?? 0
  const falling = coded > 0 || air.snowfall > 0
  const depth = air.snowDepth ?? 0
  const lying = depth >= DEPTH_MIN
  if (!falling && !lying) return null
  const fall = falling ? clamp01(Math.max(coded, air.snowfall / HEAVY_CMH, .2)) : 0
  const fallLine = Math.min(elevationM, elevationM + (air.temperature - SNOW_TEMP) / LAPSE) - HEAVY_DROP * fall
  const cover = lying ? clamp01(Math.max(.2, depth / DEPTH_FULL)) : 0
  const coverLine = elevationM - COVER_BELOW - DEPTH_DROP * cover
  return {
    amount: Math.max(fall, cover),
    lineM: Math.min(falling ? fallLine : Infinity, lying ? coverLine : Infinity),
    falling,
  }
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
