import { sunPosition } from '../../astro/sun'

export const STEP_MS = 15 * 60_000
/** Measured 2026-11-18: a slot is served ~15 min after its time (14:45 at 15:00). Earlier ones are not tried. */
const FIRST_LAG_MS = 14 * 60_000
/** How many slots back to look when the newest is not out yet. */
const BACK_SLOTS = 3
/**
 * In low sun the mask takes cold ground for cloud: at Shadmot Mehola on 24 Nov 2026, under a clear sky, patches that stayed
 * in place grew from a sun of 11° on and still stood at −15°.
 */
const LOW_SUN = 14
/** Below this a morning's sun has not begun to change the ground. */
const NIGHT_SUN = -12
/** An evening patch is held to the last daylight for this long (about 2.5 h after sunset). */
const HELD_SLOTS = 16

/** The slots to try at `nowMs`, newest first: the newest that may be out, then a few older ones. */
export function candidateSlots(nowMs: number): number[] {
  const newest = Math.floor((nowMs - FIRST_LAG_MS) / STEP_MS) * STEP_MS
  return Array.from({ length: BACK_SLOTS }, (_, k) => newest - k * STEP_MS)
}

/** The sun's altitude at a slot, degrees. */
export const sunAt = (slot: number, lat: number, lon: number) => sunPosition(new Date(slot), lat, lon).altitude

/** The last slot before the low sun a slot is in: of an evening in daylight, of a morning in the night. Null outside it. */
export function slotBeforeLowSun(slot: number, lat: number, lon: number): number | null {
  const sun = sunAt(slot, lat, lon)
  const rising = sunAt(slot + STEP_MS, lat, lon) > sun
  if (sun >= LOW_SUN || (rising && sun < NIGHT_SUN)) return null
  for (let k = 1; k <= HELD_SLOTS; k++) {
    const earlier = slot - k * STEP_MS
    const then = sunAt(earlier, lat, lon)
    if (rising ? then < NIGHT_SUN : then >= LOW_SUN) return earlier
  }
  return null
}
