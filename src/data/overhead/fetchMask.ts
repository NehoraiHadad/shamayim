import { readMask, SAMPLE_KM, SAMPLE_PX, type MaskReading } from './cloudMask'
import { bboxAround, CLOUD_MASK_LAYER, satelliteMapUrl } from './sources'

/** The service fails about one request in six (503, measured 2026-11-24) and answers the next. */
const RETRY_MS = 1500

/** The slot's image. Null: not out yet (a WMS exception, XML, not an image), or the request failed twice. */
export async function fetchSlotImage(url: string, signal: AbortSignal,
  pause = () => new Promise<void>((resolve) => { setTimeout(resolve, RETRY_MS) })): Promise<Blob | null> {
  for (let tries = 2; tries > 0; tries--) {
    try {
      const res = await fetch(url, { signal })
      if (res.ok) return res.headers.get('Content-Type')?.startsWith('image/') ? await res.blob() : null
      if (res.status < 500 && res.status !== 429) return null
    } catch { /* No connection: as any other failure. */ }
    if (signal.aborted || tries === 1) return null
    await pause()
  }
  return null
}

/** One slot of Meteosat's cloud mask around the place (one 24×24 px image); null when it cannot be read. */
export async function fetchMask(lat: number, lon: number, slot: number, signal: AbortSignal): Promise<MaskReading | null> {
  const url = satelliteMapUrl(CLOUD_MASK_LAYER, bboxAround(lon, lat, SAMPLE_KM), SAMPLE_PX, slot)
  const image = await fetchSlotImage(url, signal)
  const ctx = image && new OffscreenCanvas(SAMPLE_PX, SAMPLE_PX).getContext('2d')
  if (!ctx) return null
  ctx.drawImage(await createImageBitmap(image), 0, 0, SAMPLE_PX, SAMPLE_PX)
  return readMask(ctx.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data)
}
