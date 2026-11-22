import { useEffect, useState } from 'react'
import { arrivalWeight } from '../../domain/forecastRefresh'
import { nowIn } from '../../domain/now'
import { cloudSightings } from '../../domain/cloudSightings'
import type { CloudObservation } from '../../domain/observedCloud'
import { bboxAround, CLOUD_MASK_LAYER, satelliteMapUrl } from './sources'

interface Site { lat: number; lon: number; timezone: string }

/** 24 px over 60 km: ~2.5 km a pixel, finer than the mask itself (~4–5 km over Israel), a ~1 kB PNG. */
const SAMPLE_PX = 24
const SAMPLE_KM = 60
/** The cover that corrects "now" is read from the middle 30 km, as before: one passing cloud must not flip it. */
const COVER_PX = 12
/** Polls are cheap: a request goes out only when a newer slot may be out. */
const POLL_MS = 5 * 60_000
const STEP_MS = 15 * 60_000
/** Measured 2026-11-18: a slot is served ~15 min after its time (14:45 at 15:00). Earlier ones are not tried. */
const FIRST_LAG_MS = 14 * 60_000
/** How many slots back to look when the newest is not out yet. */
const BACK_SLOTS = 3

const isCloud = (rgba: Uint8ClampedArray, i: number) =>
  rgba[i + 3] >= 128 && rgba[i] > 200 && rgba[i + 1] > 200 && rgba[i + 2] > 200

/** Share of cloud pixels in a cloud-mask image (cloud is drawn white; clear land/sea are coloured). */
export function cloudShare(rgba: Uint8ClampedArray): number | null {
  let seen = 0, cloudy = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    seen += 1
    if (isCloud(rgba, i)) cloudy += 1
  }
  return seen ? (100 * cloudy) / seen : null
}

/** The middle `inner`×`inner` pixels of an `n`×`n` RGBA image. */
export function centre(rgba: Uint8ClampedArray, n: number, inner: number): Uint8ClampedArray {
  const from = (n - inner) / 2
  const out = new Uint8ClampedArray(inner * inner * 4)
  for (let j = 0; j < inner; j++) out.set(rgba.subarray(((from + j) * n + from) * 4, ((from + j) * n + from + inner) * 4), j * inner * 4)
  return out
}

/** Cover of the middle and the cloud patches of the whole sample, from one RGBA cloud-mask image. */
export function readMask(rgba: Uint8ClampedArray): Omit<CloudObservation, 'at'> | null {
  const cover = cloudShare(centre(rgba, SAMPLE_PX, COVER_PX))
  if (cover == null) return null
  const mask = Array.from({ length: SAMPLE_PX * SAMPLE_PX }, (_, k) => isCloud(rgba, k * 4))
  return { cover, sightings: cloudSightings(mask, SAMPLE_PX, SAMPLE_KM) }
}

/** The slots to try at `nowMs`, newest first: the newest that may be out, then a few older ones. */
export function candidateSlots(nowMs: number): number[] {
  const newest = Math.floor((nowMs - FIRST_LAG_MS) / STEP_MS) * STEP_MS
  return Array.from({ length: BACK_SLOTS }, (_, k) => newest - k * STEP_MS)
}

async function sample(site: Site, slot: number, signal: AbortSignal) {
  const url = satelliteMapUrl(CLOUD_MASK_LAYER, bboxAround(site.lon, site.lat, SAMPLE_KM), SAMPLE_PX, slot)
  const res = await fetch(url, { signal })
  // A slot that is not out yet comes back as a WMS exception (XML), not an image.
  if (!res.ok || !res.headers.get('Content-Type')?.startsWith('image/')) return null
  const bitmap = await createImageBitmap(await res.blob())
  const canvas = new OffscreenCanvas(SAMPLE_PX, SAMPLE_PX)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, SAMPLE_PX, SAMPLE_PX)
  return readMask(ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data)
}

/**
 * What Meteosat's cloud mask saw around the place in the newest published slot (one 24×24 px image), with the single
 * clouds in it. Checked every 5 minutes and whenever the app comes back to the screen, but a request goes out only for
 * a slot newer than the one already held, so a new image is picked up within ~5 min of being published (every 15 min,
 * ~15 min late). Null while unknown or when the service fails; the model then stands alone.
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
    const run = async () => {
      if (busy || document.hidden) return
      const slots = candidateSlots(Date.now()).filter((s) => s > held)
      if (!slots.length) return
      busy = true
      try {
        for (const slot of slots) {
          try {
            const got = await sample({ lat, lon, timezone }, slot, ctrl.signal)
            if (ctrl.signal.aborted) return
            if (got) {
              held = slot
              const receivedAt = receiptTime()
              setSeen((last) => {
                const outgoing = last?.key === key ? last.obs : undefined
                const previous = outgoing?.receivedAt !== undefined && arrivalWeight(outgoing.receivedAt, receivedAt) === 1
                  ? { ...outgoing, previous: undefined } : outgoing
                return { key, slot, obs: { ...got, at: nowIn(timezone, new Date(slot)), receivedAt, previous } }
              })
              return
            }
          } catch { if (ctrl.signal.aborted) return }
        }
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
