/**
 * Dev-only synthetic radar for `?rain=` (see `devParams.forcedRain`): discs of rain around the place that move in a
 * straight line, drawn both as the echo grids the nowcast reads and as Universal Blue radar tiles the map recolours,
 * so every rainy state of the radar page can be checked on a dry day. Loaded only by dynamic import in dev builds.
 */
import type { RadarOutlook } from '../../domain/outlookNow'
import { rainOutlook, type Band, type EchoGrid } from '../../domain/rainNowcast'
import type { RadarIndex } from './sources'

/** A disc of rain whose centre is `km` from the place along `bearing` *now*, moving toward `toward` at `kmh`. */
export interface RainBlob { bearing: number; km: number; radiusKm: number; band: 1 | 2 | 3; toward: number; kmh: number }

export const RAIN_PRESETS: Record<string, string> = {
  arrive: '270:40:20:2:90:30', // a band from the west, here in about 40 minutes, its core about 20 minutes later
  here: '0:0:25:3:90:30', // heavy rain over the place, moving east
  pass: '270:30:12:2:0:30', // west of the place, moving north: near but not coming
  far: '0:230:30:2', // far north, off the map
  still: '200:20:10:1', // light rain close by, standing
  none: '',
}

/** `arrive` or `bearing:km:radiusKm:band[:towardDeg:kmh],…`; malformed parts are skipped. */
export function parseRain(value: string): RainBlob[] {
  const spec = RAIN_PRESETS[value] ?? value
  return spec.split(',').map((part) => part.split(':').map(Number))
    .filter((v) => (v.length === 4 || v.length === 6) && v.every(Number.isFinite) && [1, 2, 3].includes(v[3]))
    .map(([bearing, km, radiusKm, band, toward = 0, kmh = 0]) =>
      ({ bearing, km, radiusKm, band: band as RainBlob['band'], toward, kmh }))
}

const STEP_MS = 10 * 60_000
const FRAMES = 13
const radians = Math.PI / 180
const SYNTHETIC_HOST = 'https://synthetic.invalid'

/** The newest frame a few minutes behind now, on the radar's 10-minute clock. */
export const newestFrame = (nowMs: number) => Math.floor((nowMs - 5 * 60_000) / STEP_MS) * STEP_MS

/** Rain band at a point `east`/`north` km from the place, at `timeMs`: the core at full strength, the rim one lighter. */
export function bandAt(blobs: RainBlob[], nowMs: number, timeMs: number, east: number, north: number): Band {
  let best = 0
  for (const b of blobs) {
    const back = (b.kmh * (nowMs - timeMs)) / 3_600_000
    const x = b.km * Math.sin(b.bearing * radians) - back * Math.sin(b.toward * radians)
    const y = b.km * Math.cos(b.bearing * radians) - back * Math.cos(b.toward * radians)
    const d = Math.hypot(east - x, north - y)
    if (d <= b.radiusKm / 2) best = Math.max(best, b.band)
    else if (d <= b.radiusKm) best = Math.max(best, b.band - 1 || 1)
  }
  return best as Band
}

/** The two echo grids `useRainOutlook` would read (128 cells, 2 px of a z6 image each), run through the real nowcast. */
export function syntheticOutlook(blobs: RainBlob[], lat: number, nowMs: number): RadarOutlook {
  const size = 128
  const kmPerCell = (156_543.03 * Math.cos(lat * radians) * 2) / 2 ** 6 / 1000
  const c = (size - 1) / 2
  const grid = (timeMs: number): EchoGrid => {
    const cells = new Uint8Array(size * size)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) cells[y * size + x] = bandAt(blobs, nowMs, timeMs, (x - c) * kmPerCell, (c - y) * kmPerCell)
    return { size, kmPerCell, cells }
  }
  const at = newestFrame(nowMs)
  const newest = grid(at)
  return { ...rainOutlook(grid(at - 30 * 60_000), newest, 30), at, grid: newest }
}

/** A RainViewer-shaped index of 13 frames, 10 minutes apart, served by the synthetic painter. */
export function syntheticIndex(nowMs: number): RadarIndex {
  const newest = newestFrame(nowMs)
  return {
    host: SYNTHETIC_HOST,
    frames: Array.from({ length: FRAMES }, (_, i) => {
      const time = newest - (FRAMES - 1 - i) * STEP_MS
      return { time, path: `/synthetic/${time / 1000}` }
    }),
  }
}

/** Universal Blue colours that `radarBand` reads back as bands 1–3 (light blue, dark blue, red-orange). */
const UNIVERSAL_BLUE = [[0, 0, 0, 0], [0x88, 0xdd, 0xee, 255], [0x00, 0x55, 0x88, 255], [0xff, 0x44, 0x00, 255]]

/** One `size` px Web Mercator tile z/x/y of the synthetic radar at `timeMs`. */
export function paintTile(blobs: RainBlob[], [lon0, lat0]: [number, number], nowMs: number, timeMs: number,
  z: number, x: number, y: number, size: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(size * size * 4)
  const world = size * 2 ** z
  const kmPerLon = 111.32 * Math.cos(lat0 * radians)
  for (let py = 0; py < size; py++) {
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y * size + py + 0.5)) / world))) / radians
    for (let px = 0; px < size; px++) {
      const lon = ((x * size + px + 0.5) / world) * 360 - 180
      const band = bandAt(blobs, nowMs, timeMs, (lon - lon0) * kmPerLon, (lat - lat0) * 110.574)
      if (band) pixels.set(UNIVERSAL_BLUE[band], (py * size + px) * 4)
    }
  }
  return pixels
}

/** For the tile protocol: paints `https://synthetic.invalid/synthetic/<sec>/<size>/<z>/<x>/<y>/…`, null otherwise. */
export function syntheticPainter(blobs: RainBlob[], place: [number, number], nowMs: number) {
  return (url: string): { pixels: Uint8ClampedArray; size: number } | null => {
    const match = url.startsWith(SYNTHETIC_HOST) && /\/synthetic\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\//.exec(url)
    if (!match) return null
    const [sec, size, z, x, y] = match.slice(1).map(Number)
    return { pixels: paintTile(blobs, place, nowMs, sec * 1000, z, x, y, size), size }
  }
}
