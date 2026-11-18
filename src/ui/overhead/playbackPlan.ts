/**
 * How the radar movie steps. On open it plays once through the frames and rests on the newest (the truth). The
 * play button loops it at most three times, holding on the newest frame between loops, then rests there again.
 * With reduced motion nothing plays by itself, and play runs once, slower.
 */
export const FRAME_MS = 400
export const HOLD_MS = 1200
export const REDUCED_FRAME_MS = 800
export const LOOPS = 3

export interface Step { at: number; loop: number; delay: number }

/** The next frame to show after `at`, and how long to wait before showing it; null when playback stops. */
export function nextStep(at: number, loop: number, last: number, { reduced, looping }: { reduced: boolean; looping: boolean }): Step | null {
  if (last < 1) return null
  if (at < last) return { at: at + 1, loop, delay: reduced ? REDUCED_FRAME_MS : FRAME_MS }
  if (looping && !reduced && loop + 1 < LOOPS) return { at: 0, loop: loop + 1, delay: HOLD_MS }
  return null
}
