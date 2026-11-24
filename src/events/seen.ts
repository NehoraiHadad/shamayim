import { nowIn } from '../domain/now'
import { unionOf } from '../world/clouds'
import type { Candidate, Direction, EventSky, SpecialEvent } from './types'

const MINUTE = 60_000

interface Look extends Direction { ms: number; score: number }

const dark = (c: Candidate, sky: EventSky, ms: number) => c.sunBelow === undefined || sky.sunAt(ms).altitude < c.sunBelow

/** Clouds leave it; an hour with no forecast promises nothing. */
function open({ cloud }: Candidate, sky: EventSky, ms: number): boolean {
  if (!cloud) return true
  const covers = sky.coversAt(ms)
  if (!covers) return false
  return 1 - (1 - covers.low) * (1 - covers.mid) <= (cloud.thick ?? 1) && unionOf(covers) <= (cloud.all ?? 1)
}

/** The runs of looks at which the place sees it: over the land, in the dark it needs, through the clouds. */
function runsOf(c: Candidate, sky: EventSky): Look[][] {
  const step = (c.stepMin ?? 10) * MINUTE, runs: Look[][] = []
  let run: Look[] | null = null
  // On round times.
  for (let ms = Math.ceil(Math.max(c.from, sky.from) / step) * step; ms <= Math.min(c.to, sky.to); ms += step) {
    const at = c.at(ms)
    if (!at || !sky.clear(at) || !dark(c, sky, ms) || !open(c, sky, ms)) { run = null; continue }
    if (!run) runs.push((run = []))
    run.push({ azimuth: at.azimuth, altitude: at.altitude, score: at.score ?? 0, ms })
  }
  return runs.filter((r) => r.at(-1)!.ms - r[0].ms >= (c.leastMin ?? 0) * MINUTE)
}

/** The event as the place will see it, in the one shape; null when it will not. */
export function seen(c: Candidate, sky: EventSky): SpecialEvent | null {
  const runs = runsOf(c, sky)
  if (!runs.length) return null
  const best = runs.flat().reduce((a, b) => (b.score > a.score ? b : a))
  const [look, last] = c.tell === 'at' ? [best, best] : [runs[0][0], runs[0].at(-1)!]
  const local = (ms: number) => nowIn(sky.place.timezone, new Date(ms))
  return { what: c.what, perYear: c.perYear, where: { azimuth: look.azimuth, altitude: look.altitude },
    when: { from: local(look.ms), to: local(last.ms), tell: c.tell } }
}
