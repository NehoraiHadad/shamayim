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

/** Freshness wording for the update pill (SPEC §6). */
export function freshnessText(fetchedAt: number, offline: boolean, now = Date.now()): PillText {
  const min = Math.max(0, Math.round((now - fetchedAt) / 60000))
  const at = clock.format(fetchedAt)
  if (offline) return { text: `אין חיבור, נכון ל־${at}`, spoken: `אין חיבור. התחזית נכונה לשעה ${at}` }
  if (min < 1) return { text: 'עודכן עכשיו', spoken: 'עודכן עכשיו' }
  if (min < 60) return { text: `לפני ${min} דק׳`, spoken: `עודכן לפני ${min} דקות` }
  return { text: `נכון ל־${at}`, spoken: `התחזית נכונה לשעה ${at}` }
}
