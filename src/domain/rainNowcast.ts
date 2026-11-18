/**
 * Radar nowcast: how the rain around a place moved over the last half hour, carried forward in a straight line.
 * Pure grid maths so it can be tested without a radar; the data layer turns radar images into `EchoGrid`s.
 */

/** 0 dry, 1 light, 2 moderate, 3 heavy. */
export type Band = 0 | 1 | 2 | 3

/** A square of radar echoes centred on the place, north up (row 0 is the northern edge). */
export interface EchoGrid {
  size: number
  kmPerCell: number
  cells: Uint8Array
}

export interface RainOutlook {
  /** Strongest rain over the place now. */
  now: Band
  /** Minutes until rain reaches the place (only when dry now); null when none is heading here. */
  arrivesIn: number | null
  /** Minutes the current or coming rain lasts, 'longer' past the horizon; null when the motion is unknown. */
  lastsFor: number | 'longer' | null
  /** Strongest band of the current or coming rain. */
  band: Band
  nearest: { km: number; bearing: number; band: Band } | null
  /** Where the rain that reaches the place (at `arrivesIn`) is at the radar frame's time; null when none is coming. */
  approach: { km: number; bearing: number } | null
  /** Where the rain is moving to (degrees from north) and how fast; null when it cannot be measured. */
  motion: { kmh: number; heading: number } | null
}

/** Straight-line extrapolation is only worth trusting for about an hour and a half. */
export const HORIZON_MIN = 90
const STEP_MIN = 5
const MAX_KMH = 100
const MIN_ECHOES = 6
const MIN_MATCH = 0.3
/** Slower than this the rain is treated as standing still. */
const STILL_KMH = 4

const at = (g: EchoGrid, x: number, y: number) =>
  x < 0 || y < 0 || x >= g.size || y >= g.size ? 0 : g.cells[y * g.size + x]

/** Strongest echo within `radius` cells of a (fractional) point. */
function around(g: EchoGrid, x: number, y: number, radius = 1): Band {
  let best = 0
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx * dx + dy * dy <= radius * radius) best = Math.max(best, at(g, Math.round(x + dx), Math.round(y + dy)))
  return best as Band
}

/** The shift (cells per minute, x east, y south) that best lays the older echoes onto the newer ones. */
export function motionBetween(older: EchoGrid, newer: EchoGrid, minutes: number): { vx: number; vy: number } | null {
  const echoes: [number, number][] = []
  older.cells.forEach((c, i) => { if (c) echoes.push([i % older.size, Math.floor(i / older.size)]) })
  const a = echoes.length, b = newer.cells.reduce((n, c) => n + (c ? 1 : 0), 0)
  if (minutes <= 0 || a < MIN_ECHOES || b < MIN_ECHOES) return null
  const reach = Math.ceil((MAX_KMH * minutes) / 60 / newer.kmPerCell)
  let best = { score: -1, dx: 0, dy: 0 }
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++) {
      let overlap = 0
      for (const [x, y] of echoes) if (at(newer, x + dx, y + dy)) overlap++
      const closer = dx * dx + dy * dy < best.dx * best.dx + best.dy * best.dy
      if (overlap > best.score || (overlap === best.score && closer)) best = { score: overlap, dx, dy }
    }
  if (best.score / Math.min(a, b) < MIN_MATCH) return null
  return { vx: best.dx / minutes, vy: best.dy / minutes }
}

const bearingOf = (east: number, south: number) => ((Math.atan2(east, -south) * 180) / Math.PI + 360) % 360

function nearestEcho(g: EchoGrid, c: number): RainOutlook['nearest'] {
  let found: RainOutlook['nearest'] = null
  for (let y = 0; y < g.size; y++)
    for (let x = 0; x < g.size; x++) {
      const band = g.cells[y * g.size + x] as Band
      if (!band) continue
      const km = Math.hypot(x - c, y - c) * g.kmPerCell
      if (!found || km < found.km) found = { km, bearing: bearingOf(x - c, y - c), band }
    }
  return found
}

/** What reaches the place over the next HORIZON_MIN minutes if the newest echoes keep their measured motion. */
export function rainOutlook(older: EchoGrid | null, newer: EchoGrid, minutesApart: number): RainOutlook {
  const c = (newer.size - 1) / 2
  const v = older ? motionBetween(older, newer, minutesApart) : null
  const kmh = v ? Math.hypot(v.vx, v.vy) * newer.kmPerCell * 60 : 0
  const motion = v ? { kmh, heading: bearingOf(v.vx, v.vy) } : null
  const moving = v && kmh >= STILL_KMH ? v : null
  // The rain over the place at minute t is what now sits upwind by v·t.
  const over = (t: number) => (moving ? around(newer, c - moving.vx * t, c - moving.vy * t) : around(newer, c, c))
  const now = over(0)
  let arrivesIn: number | null = null
  let lastsFor: RainOutlook['lastsFor'] = null
  let band: Band = now
  let wetFrom: number | null = now ? 0 : null
  if (moving || now) {
    for (let t = STEP_MIN; t <= HORIZON_MIN; t += STEP_MIN) {
      const here = over(t)
      if (wetFrom === null && here) { wetFrom = t; arrivesIn = t }
      if (wetFrom !== null && here) band = Math.max(band, here) as Band
      if (wetFrom !== null && !here && moving) { lastsFor = t - wetFrom; break }
      if (!moving) break
    }
    if (wetFrom !== null && lastsFor === null && moving) lastsFor = 'longer'
  }
  // The arriving rain sits upwind of the place by v·t, t being the minute it arrives.
  const approach = moving && arrivesIn !== null
    ? { km: Math.hypot(moving.vx, moving.vy) * arrivesIn * newer.kmPerCell, bearing: bearingOf(-moving.vx, -moving.vy) }
    : null
  return { now, arrivesIn, lastsFor, band, nearest: nearestEcho(newer, c), approach, motion }
}
