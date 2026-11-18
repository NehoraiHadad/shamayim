import type { RainOutlook } from './rainNowcast'

/** A radar outlook and the time (UTC epoch ms) of the radar frame it was read from. */
export type RadarOutlook = RainOutlook & { at: number }

/** A radar picture older than this cannot say what is happening now. */
export const RADAR_STALE_MIN = 45

/**
 * The outlook as of `nowMs`: arrival and end times counted from now instead of from the frame, or null once the
 * frame is too old to trust. Positions (`nearest`, `approach`) stay at the frame's time.
 */
export function outlookNow(o: RadarOutlook, nowMs: number): RadarOutlook | null {
  const age = Math.max(0, (nowMs - o.at) / 60_000)
  if (age > RADAR_STALE_MIN) return null
  const less = (m: number) => Math.max(5, m - age)
  return {
    ...o,
    arrivesIn: o.arrivesIn === null ? null : less(o.arrivesIn),
    lastsFor: typeof o.lastsFor === 'number' && o.now ? less(o.lastsFor) : o.lastsFor,
  }
}
