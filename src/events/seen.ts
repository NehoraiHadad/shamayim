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

/** The runs of looks at which the place sees it: over the land, in the dark it needs, through the clouds. */
function runsOf(c: Candidate, sky: EventSky): Look[][] {
  const step = (c.stepMin ?? 10) * MINUTE, runs: Look[][] = []
  let run: Look[] | null = null
  const from = Math.max(c.from, sky.from), to = Math.min(c.to, sky.to)
  // Now, when it has begun, and then on round times.
  for (let ms = c.from < from ? from : Math.ceil(from / step) * step; ms <= to; ms = (Math.floor(ms / step) + 1) * step) {
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
  const best = runs.flat().reduce((a, b) => a.viewing === b.viewing
    ? (b.score > a.score ? b : a)
    : (b.viewing === 'expected' ? b : a))
  const [look, last] = c.tell === 'at' ? [best, best] : [runs[0][0], runs[0].at(-1)!]
  const viewing = c.tell === 'span' && runs[0].some((p) => p.viewing === 'cloud-dependent') ? 'cloud-dependent' : look.viewing
  const local = (ms: number) => nowIn(sky.place.timezone, new Date(ms))
  return { what: c.what, perYear: c.perYear, viewing, where: { azimuth: look.azimuth, altitude: look.altitude },
    when: { from: local(look.ms), to: local(last.ms), tell: c.tell } }
}
