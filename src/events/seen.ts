import { nowIn } from '../domain/now'
import { unionOf } from '../world/clouds'
import type { Candidate, Direction, EventSky, SpecialEvent, Viewing } from './types'

const MINUTE = 60_000

interface Look extends Direction { ms: number; score: number; viewing: Viewing }

const dark = (c: Candidate, sky: EventSky, ms: number) => c.sunBelow === undefined || sky.sunAt(ms).altitude < c.sunBelow

/** Clouds leave it; an hour with no forecast promises nothing. */
function viewingOf({ cloud, weatherDependent }: Candidate, sky: EventSky, ms: number): Viewing | null {
  if (!cloud) return weatherDependent ? 'weather-dependent' : 'expected'
  const covers = sky.coversAt(ms)
  if (!covers) return null
  const thick = 1 - (1 - covers.low) * (1 - covers.mid), all = unionOf(covers)
  if (thick > (cloud.thick ?? 1) || all > (cloud.all ?? 1)) return null
  if (weatherDependent) return 'weather-dependent'
  // A forecast close to either cloud limit still leaves a chance for a break in the clouds.
  return thick > (cloud.thick ?? 1) * 0.75 || all > (cloud.all ?? 1) * 0.75 ? 'cloud-dependent' : 'expected'
}

function samplesOf(c: Candidate, sky: EventSky): number[] {
  const from = Math.max(c.from, sky.from), to = Math.min(c.to, sky.to)
  if (from > to) return []
  if (from === to) return [from]
  const step = (c.stepMin ?? 10) * MINUTE
  const samples = new Set((c.sampleAt ?? []).filter((ms) => ms >= from && ms <= to))
  if (c.peakAt !== undefined && c.peakAt >= from && c.peakAt <= to) samples.add(c.peakAt)
  for (let ms = c.from < from ? from : Math.ceil(from / step) * step; ms <= to; ms = (Math.floor(ms / step) + 1) * step) {
    samples.add(ms)
  }
  return [...samples].sort((a, b) => a - b)
}

const directionOf = ({ azimuth, altitude }: Direction): Direction => ({ azimuth, altitude })

/** The runs of looks at which the place sees it: over the land, in the light it needs, through the clouds. */
function runsOf(c: Candidate, sky: EventSky): Look[][] {
  const runs: Look[][] = []
  let run: Look[] | null = null
  for (const ms of samplesOf(c, sky)) {
    const at = c.at(ms)
    const viewing = at && sky.clear(at) && dark(c, sky, ms) ? viewingOf(c, sky, ms) : null
    if (!at || !viewing) { run = null; continue }
    if (!run) runs.push((run = []))
    run.push({ azimuth: at.azimuth, altitude: at.altitude, score: at.score ?? 0, ms, viewing })
  }
  // What is under way is told to its end.
  return runs.filter((r) => r[0].ms === sky.from || r.at(-1)!.ms - r[0].ms >= (c.leastMin ?? 0) * MINUTE)
}

/** The event as the place will see it, in the one shape; null when it will not. */
export function seen(c: Candidate, sky: EventSky): SpecialEvent | null {
  const runs = runsOf(c, sky)
  if (!runs.length) return null
  // Prefer a usable clear window over one in which every sample depends on breaks in the clouds.
  const run = runs.find((looks) => looks.every((look) => look.viewing === 'expected')) ?? runs[0]
  const best = c.tell === 'at' ? runs.flat().reduce((a, b) => a.viewing === b.viewing
    ? (b.score > a.score ? b : a) : (b.viewing === 'expected' ? b : a)) : null
  const look = best ?? run[0], last = best ?? run.at(-1)!
  const viewing = c.tell === 'span' && run.some((p) => p.viewing === 'cloud-dependent') ? 'cloud-dependent' : look.viewing
  const local = (ms: number) => nowIn(sky.place.timezone, new Date(ms))
  const peak = c.peakAt === undefined ? undefined : run.find((p) => p.ms === c.peakAt)
  return { what: c.what, perYear: c.perYear, viewing, where: directionOf(look),
    when: { from: local(look.ms), to: local(last.ms), tell: c.tell },
    ...(c.kind && { kind: c.kind }),
    ...(peak && { peak: local(peak.ms) }),
    ...(c.track && { track: { to: directionOf(last) } }),
    ...(c.approximateTime && { approximateTime: c.approximateTime }) }
}
