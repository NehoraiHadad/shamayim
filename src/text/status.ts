const clock = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Jerusalem',
})

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
  const at = clock.format(fetchedAt)
  if (problem === 'offline') return { text: `אין חיבור · ${at}`, spoken: `אין חיבור. התחזית נכונה לשעה ${at}` }
  if (problem === 'service') return { text: `לא עודכן · ${at}`, spoken: `התחזית לא עודכנה. היא נכונה לשעה ${at}` }
  if (min < 1) return { text: '', spoken: 'עודכן עכשיו' }
  if (min < QUIET_MINUTES) return { text: '', spoken: `עודכן לפני ${min} דקות` }
  if (min < 60) return { text: `לפני ${min} דק׳`, spoken: `עודכן לפני ${min} דקות` }
  return { text: `נכון ל־${at}`, spoken: `התחזית נכונה לשעה ${at}` }
}
