import { useEffect, useState } from 'react'
import { nowIn } from '../../domain/now'
import type { CloudObservation } from '../../domain/observedCloud'
import { bboxAround, CLOUD_MASK_LAYER, latestSatelliteSlot, satelliteMapUrl } from './sources'

interface Site { lat: number; lon: number; timezone: string }

const SAMPLE_PX = 12
/** About 30 km around the place: wide enough that one cloud passing the pixel does not flip "now". */
const SAMPLE_KM = 30
const REFRESH_MS = 10 * 60_000
const step = 15 * 60_000

/** Share of cloud pixels in a cloud-mask image (cloud is drawn white; clear land/sea are coloured). */
export function cloudShare(rgba: Uint8ClampedArray): number | null {
  let seen = 0, cloudy = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    seen += 1
    if (rgba[i] > 200 && rgba[i + 1] > 200 && rgba[i + 2] > 200) cloudy += 1
  }
  return seen ? (100 * cloudy) / seen : null
}

async function sample(site: Site, slot: number, signal: AbortSignal): Promise<number | null> {
  const url = satelliteMapUrl(CLOUD_MASK_LAYER, bboxAround(site.lon, site.lat, SAMPLE_KM), SAMPLE_PX, slot)
  const res = await fetch(url, { signal })
  if (!res.ok || !res.headers.get('Content-Type')?.startsWith('image/')) return null
  const bitmap = await createImageBitmap(await res.blob())
  const canvas = new OffscreenCanvas(SAMPLE_PX, SAMPLE_PX)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, SAMPLE_PX, SAMPLE_PX)
  return cloudShare(ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data)
}

/**
 * What Meteosat's cloud mask saw around the place in the newest published slot (one 12×12 px image, a few hundred
 * bytes), refreshed every 10 minutes. Null while unknown or when the service fails; the model then stands alone.
 */
export function useObservedCloud(site: Site): CloudObservation | null {
  const [obs, setObs] = useState<CloudObservation | null>(null)
  const { lat, lon, timezone } = site
  useEffect(() => {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return
    const ctrl = new AbortController()
    const run = async () => {
      const latest = latestSatelliteSlot(Date.now())
      // The newest slot is sometimes not out yet: fall back one slot.
      for (const slot of [latest, latest - step]) {
        try {
          const cover = await sample({ lat, lon, timezone }, slot, ctrl.signal)
          if (cover != null) return setObs({ cover, at: nowIn(timezone, new Date(slot)) })
        } catch { if (ctrl.signal.aborted) return }
      }
    }
    setObs(null)
    void run()
    const id = setInterval(run, REFRESH_MS)
    return () => { ctrl.abort(); clearInterval(id) }
  }, [lat, lon, timezone])
  return obs
}
