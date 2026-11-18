import { useEffect, useState } from 'react'
import { rainOutlook, type EchoGrid, type RainOutlook } from '../../domain/rainNowcast'
import { radarBand } from './radarBand'
import { parseRadarIndex, RAINVIEWER_INDEX, type RadarIndex } from './sources'

interface Site { lat: number; lon: number }

const ZOOM = 6
const PX = 256
/** 2 px per cell: ~4 km cells over a ~530 km square, fine enough to time rain to ~10 minutes. */
const CELL_PX = 2
const APART_MIN = 30
const REFRESH_MS = 5 * 60_000

/** One RainViewer image centred on the place (Universal Blue, smoothed) → an echo grid. */
async function echoGrid(index: RadarIndex, path: string, site: Site, signal: AbortSignal): Promise<EchoGrid | null> {
  const url = `${index.host}${path}/${PX}/${ZOOM}/${site.lat.toFixed(4)}/${site.lon.toFixed(4)}/2/1_1.png`
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const bitmap = await createImageBitmap(await res.blob())
  const ctx = new OffscreenCanvas(PX, PX).getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, PX, PX)
  const px = ctx.getImageData(0, 0, PX, PX).data
  const size = PX / CELL_PX
  const cells = new Uint8Array(size * size)
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 40) continue
    const p = i / 4
    const cell = Math.floor(Math.floor(p / PX) / CELL_PX) * size + Math.floor((p % PX) / CELL_PX)
    cells[cell] = Math.max(cells[cell], radarBand(px[i], px[i + 1], px[i + 2], px[i + 3]) + 1)
  }
  const metresPerPx = (156_543.03 * Math.cos((site.lat * Math.PI) / 180)) / 2 ** ZOOM
  return { size, kmPerCell: (metresPerPx * CELL_PX) / 1000, cells }
}

/** Moves an outlook made at the radar frame's time to now. */
function sinceFrame(o: RainOutlook, age: number): RainOutlook {
  const less = (m: number) => Math.max(5, m - age)
  return {
    ...o,
    arrivesIn: o.arrivesIn === null ? null : less(o.arrivesIn),
    lastsFor: typeof o.lastsFor === 'number' && o.now ? less(o.lastsFor) : o.lastsFor,
  }
}

/** Reads the two radar frames and returns the outlook as of now; null when the radar index has no frames. */
export async function readOutlook(site: Site, signal: AbortSignal): Promise<RainOutlook | null> {
  const index = parseRadarIndex(await (await fetch(RAINVIEWER_INDEX, { signal })).json())
  const newest = index.frames.at(-1)
  if (!newest) return null
  const older = [...index.frames].reverse().find((f) => newest.time - f.time >= APART_MIN * 60_000) ?? null
  const [a, b] = await Promise.all([
    older ? echoGrid(index, older.path, site, signal) : null,
    echoGrid(index, newest.path, site, signal),
  ])
  if (!b) return null
  const apart = older ? (newest.time - older.time) / 60_000 : APART_MIN
  const age = Math.max(0, (Date.now() - newest.time) / 60_000)
  return sinceFrame(rainOutlook(a, b, apart), age)
}

/**
 * The radar's view of rain around the place: the newest RainViewer frame and the one half an hour before, two
 * small images every five minutes. Null while unknown or offline; the page then says nothing rather than guess.
 */
export function useRainOutlook(site: Site): RainOutlook | null {
  const { lat, lon } = site
  const key = `${lat},${lon}`
  const [seen, setSeen] = useState<{ key: string; outlook: RainOutlook } | null>(null)
  useEffect(() => {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return
    const ctrl = new AbortController()
    const run = async () => {
      try {
        const outlook = await readOutlook({ lat, lon }, ctrl.signal)
        if (outlook) setSeen({ key: `${lat},${lon}`, outlook })
      } catch { /* offline or blocked: keep the last outlook */ }
    }
    void run()
    const id = setInterval(run, REFRESH_MS)
    return () => { ctrl.abort(); clearInterval(id) }
  }, [lat, lon])
  return seen?.key === key ? seen.outlook : null
}
