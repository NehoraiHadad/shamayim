import type { LocalTime } from '../domain/types'

/**
 * One formatter per time zone: making an `Intl.DateTimeFormat` costs far more than formatting with it (a scrub frame of
 * the canvas scene called this some hundred times: ~10 ms a frame, 100+ ms spikes, CPU ×4).
 */
const formatters = new Map<string, Intl.DateTimeFormat>()
const formatterOf = (timeZone: string) => {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

const partsAt = (at: Date, timeZone: string) => {
  const values = formatterOf(timeZone).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((value) => value.type === type)?.value)
  return {
    year: part('year'), month: part('month'), day: part('day'),
    hour: part('hour'), minute: part('minute'), second: part('second'),
  }
}

/** Convert a wall clock in an IANA time zone to its instant. */
export function utcOf(local: LocalTime, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!match) throw new RangeError(`Invalid local time: ${local}`)
  const [, y, m, d, h, minute] = match.map(Number)
  const wallUtc = Date.UTC(y, m - 1, d, h, minute)
  const wallAt = (ms: number) => {
    const p = partsAt(new Date(ms), timeZone)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  }
  // A day on either side sees both offsets of a DST change, including offsets far from UTC.
  const day = 86_400_000
  const earlyProbe = wallUtc - day, lateProbe = wallUtc + day
  const before = wallUtc - (wallAt(earlyProbe) - earlyProbe)
  const after = wallUtc - (wallAt(lateProbe) - lateProbe)
  // In a repeated hour use its first occurrence. In a skipped hour hold the transition instant.
  if (before === after || wallAt(before) === wallUtc) return new Date(before)
  if (wallAt(after) === wallUtc) return new Date(after)
  // Neither offset represents this wall time: it falls in the gap.
  let lo = after / 1000, hi = before / 1000
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (wallAt(mid * 1000) >= wallUtc) hi = mid
    else lo = mid
  }
  return new Date(hi * 1000)
}
