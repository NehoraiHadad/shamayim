import type { RainOutlook } from '../../domain/rainNowcast'
import { NEAR_KM } from '../../domain/rainVerdict'
import { destination, type LonLat } from './geo'

/** Slower than this the rain is "almost not moving": no arrow. */
const STILL_KMH = 4
/** Arrows farther than this from the place would leave the opening view (~350 km across). */
const MAX_TAIL_KM = 160
const MIN_PX = 24
const MAX_PX = 64
const HEAD_PX = 9

/**
 * One static arrow that makes the headline's "מגיע ממערב" / "נע מזרחה" visible: its tail on the rain the headline
 * talks about (the arriving rain, or the nearest rain passing by), pointing along the measured motion, as long as
 * half an hour of travel (clamped to 24–64 px). Null when there is nothing honest to draw: rain over the place,
 * motion unknown or nearly still, or the rain too far.
 */
export function motionArrow(o: RainOutlook | null, [lon, lat]: LonLat, kmPerPx: number): LonLat[][] | null {
  if (!o?.motion || o.now || o.motion.kmh < STILL_KMH) return null
  const from = o.arrivesIn !== null ? o.approach : o.nearest && o.nearest.km <= NEAR_KM ? o.nearest : null
  if (!from || from.km > MAX_TAIL_KM) return null
  const tail = destination([lon, lat], from.km, from.bearing)
  const lengthKm = Math.min(MAX_PX * kmPerPx, Math.max(MIN_PX * kmPerPx, o.motion.kmh / 2))
  const { heading } = o.motion
  const tip = destination(tail, lengthKm, heading)
  const head = HEAD_PX * kmPerPx
  return [
    [tail, tip],
    [destination(tip, head, heading + 150), tip, destination(tip, head, heading - 150)],
  ]
}
