import { cloudSightings, stoodBefore } from '../../domain/cloudSightings'
import { AGREEING_SLOTS, type CloudObservation } from '../../domain/observedCloud'
import { smoothstep } from '../../domain/smoothstep'
import { SAMPLE_KM, SAMPLE_PX, type MaskReading } from './cloudMask'
import { slotBeforeLowSun, STEP_MS, sunAt } from './maskSlots'

export type ReadSlot = (slot: number) => Promise<MaskReading | null>

/** The mask sees best with the sun well up. */
const daylight = (sun: number) => smoothstep(7, 14, sun)

/** An earlier slot that is this slow does not hold up the newest. */
const PATIENCE_MS = 8000
const within = <T>(read: Promise<T | null>) =>
  Promise.race([read, new Promise<null>((resolve) => { setTimeout(() => resolve(null), PATIENCE_MS) })])

/**
 * What the satellite saw in the newest of `slots` (newest first) that can be read: its cover, the covers of the slots right
 * before it, and its single clouds. A slot that failed is unknown, never clear: it ends the run and speaks for no patch.
 */
export async function observeCloud(read: ReadSlot, slots: readonly number[], lat: number, lon: number) {
  let slot = 0
  let newest: MaskReading | null = null
  for (const candidate of slots) {
    slot = candidate
    newest = await read(candidate)
    if (newest) break
  }
  if (!newest) return null
  const back = Array.from({ length: AGREEING_SLOTS - 1 }, (_, k) => slot - (k + 1) * STEP_MS)
  const earlier = await Promise.all(back.map((time) => within(read(time))))
  const gap = earlier.indexOf(null)
  const before = earlier.slice(0, gap < 0 ? undefined : gap).map((reading) => reading!.cover)

  let sightings = cloudSightings(newest.mask, SAMPLE_PX, SAMPLE_KM)
  // In low sun a patch is a cloud only if it stood there before; without the slot that would tell, it is not shown.
  const anchor = sightings.length ? slotBeforeLowSun(slot, lat, lon) : null
  if (anchor !== null) {
    const steady = await within(read(anchor))
    const past = [...back, anchor].map((time, k) => ({ time, reading: k < back.length ? earlier[k] : steady }))
      .flatMap(({ time, reading }) => reading ? [{ mask: reading.mask, minutes: (slot - time) / 60_000 }] : [])
    sightings = steady ? cloudSightings(newest.mask, SAMPLE_PX, SAMPLE_KM, stoodBefore(past, SAMPLE_PX, SAMPLE_KM)) : []
  }
  const seen: Omit<CloudObservation, 'at'> = { cover: newest.cover, before, daylight: daylight(sunAt(slot, lat, lon)), sightings }
  return { slot, seen }
}
