import type { LocalTime } from '../domain/types'

const partsAt = (at: Date, timeZone: string) => {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at)
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
  let guess = wallUtc
  // A second pass handles offsets that differ between the initial guess and result.
  for (let pass = 0; pass < 2; pass += 1) {
    const shown = partsAt(new Date(guess), timeZone)
    const shownUtc = Date.UTC(
      shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second,
    )
    guess += wallUtc - shownUtc
  }
  return new Date(guess)
}
