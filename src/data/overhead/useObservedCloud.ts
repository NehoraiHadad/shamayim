import { useEffect, useState } from 'react'
import { arrivalWeight } from '../../domain/forecastRefresh'
import { nowIn } from '../../domain/now'
import type { CloudObservation } from '../../domain/observedCloud'
import type { MaskReading } from './cloudMask'
import { fetchMask } from './fetchMask'
import { candidateSlots } from './maskSlots'
import { observeCloud, type ReadSlot } from './observeCloud'

interface Site { lat: number; lon: number; timezone: string }

/** Polls are cheap: a request goes out only when a newer slot may be out. */
const POLL_MS = 5 * 60_000
/** Readings kept for the slots still to come: the longest look back. */
const KEPT_MS = 5 * 3_600_000

/**
 * What Meteosat's cloud mask saw around the place in the newest published slot, with the single clouds in it. Checked every
 * 5 minutes and whenever the app comes back to the screen, but a request goes out only for a slot not held yet: three small
 * images at first (the newest and the two before it), one more while the sun is low and there are clouds in it, then one
 * every 15 min. A new image is picked up within ~5 min of being published (~15 min late). Null while unknown or when the
 * service fails; the model then stands alone.
 */
export function useObservedCloud(site: Site, receiptTime: () => number): CloudObservation | null {
  const { lat, lon, timezone } = site
  const key = `${lat},${lon}`
  // Keyed by place, so switching places never shows the last place's sky.
  const [seen, setSeen] = useState<{ key: string; slot: number; obs: CloudObservation } | null>(null)
  useEffect(() => {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return
    const ctrl = new AbortController()
    let held = -Infinity
    let busy = false
    const readings = new Map<number, MaskReading>()
    const read: ReadSlot = async (slot) => {
      const known = readings.get(slot)
      if (known) return known
      const got = await fetchMask(lat, lon, slot, ctrl.signal).catch(() => null)
      if (got) readings.set(slot, got)
      return got
    }
    const run = async () => {
      if (busy || document.hidden) return
      const slots = candidateSlots(Date.now()).filter((s) => s > held)
      if (!slots.length) return
      busy = true
      try {
        const observed = await observeCloud(read, slots, lat, lon)
        if (!observed || ctrl.signal.aborted) return
        const { slot, seen: got } = observed
        held = slot
        for (const known of readings.keys()) if (known < slot - KEPT_MS) readings.delete(known)
        const receivedAt = receiptTime()
        setSeen((last) => {
          const outgoing = last?.key === key ? last.obs : undefined
          const previous = outgoing?.receivedAt !== undefined && arrivalWeight(outgoing.receivedAt, receivedAt) === 1
            ? { ...outgoing, previous: undefined } : outgoing
          return { key, slot, obs: { ...got, at: nowIn(timezone, new Date(slot)), receivedAt, previous } }
        })
      } finally { busy = false }
    }
    void run()
    const id = setInterval(run, POLL_MS)
    const onVisible = () => { if (!document.hidden) void run() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      ctrl.abort()
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [key, lat, lon, timezone, receiptTime])
  return seen?.key === key ? seen.obs : null
}
