import { ltr } from './isolate'

const clock = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Jerusalem',
})
const date = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeZone: 'Asia/Jerusalem' })
const dayMonth = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })

function updatedAt(fetchedAt: number, now: number): string {
  const time = ltr(clock.format(fetchedAt))
  return date.format(fetchedAt) === date.format(now) ? time : `${time} ב־${ltr(dayMonth.format(fetchedAt))}`
}

export interface PillText {
  /** Short visible text. */
  text: string
  /** Full sentence for screen readers. */
  spoken: string
}

/** Under this age the pill is just the refresh icon: fresh data needs no caption. */
export const QUIET_MINUTES = 30

/** What kept the data from updating: no connection, or the service (busy, or its request limit for this network). */
export type UpdateProblem = 'offline' | 'service' | null

/** Freshness wording for the update pill (SPEC §6). Empty `text` while fresh; `spoken` always says the age. */
export function freshnessText(fetchedAt: number, problem: UpdateProblem, now = Date.now()): PillText {
  const min = Math.max(0, Math.round((now - fetchedAt) / 60000))
  if (problem || min >= 60) {
    const at = updatedAt(fetchedAt, now)
    if (problem === 'offline') return { text: `אין חיבור · ${at}`, spoken: `אין חיבור. התחזית נכונה לשעה ${at}` }
    if (problem === 'service') return { text: `לא עודכן · ${at}`, spoken: `התחזית לא עודכנה. היא נכונה לשעה ${at}` }
    return { text: `נכון ל־${at}`, spoken: `התחזית נכונה לשעה ${at}` }
  }
  if (min < 1) return { text: '', spoken: 'עודכן עכשיו' }
  if (min === 1) return { text: '', spoken: 'עודכן לפני דקה' }
  if (min === 2) return { text: '', spoken: 'עודכן לפני שתי דקות' }
  const count = ltr(String(min))
  if (min < QUIET_MINUTES) return { text: '', spoken: `עודכן לפני ${count} דקות` }
  return { text: `לפני ${count} דק׳`, spoken: `עודכן לפני ${count} דקות` }
}

/** One-shot live-region sentence when connectivity/service status changes; null when unchanged. */
export function problemAnnouncement(prev: UpdateProblem, next: UpdateProblem, fetchedAt: number | null, now = Date.now()): string | null {
  if (prev === next) return null
  const at = fetchedAt !== null ? updatedAt(fetchedAt, now) : null
  if (next === 'offline') return at ? `אין חיבור. מוצגת התחזית מ־${at}.` : 'אין חיבור.'
  if (next === 'service') return at ? `התחזית לא עודכנה. מוצגת התחזית מ־${at}.` : 'התחזית לא עודכנה.'
  return prev === 'offline' ? 'החיבור חזר.' : null
}
