import { describe, expect, it } from 'vitest'
import { freshnessText, problemAnnouncement, QUIET_MINUTES } from './status'

const NOW = Date.UTC(2026, 10, 17, 11, 0)
const ago = (min: number) => NOW - min * 60000

describe('freshnessText', () => {
  it('shows no words while the data is fresh, uses natural Hebrew for 1-2 minutes, and isolates counts', () => {
    expect(freshnessText(ago(0), null, NOW)).toEqual({ text: '', spoken: 'עודכן עכשיו' })
    expect(freshnessText(ago(1), null, NOW)).toEqual({ text: '', spoken: 'עודכן לפני דקה' })
    expect(freshnessText(ago(2), null, NOW)).toEqual({ text: '', spoken: 'עודכן לפני שתי דקות' })
    expect(freshnessText(ago(QUIET_MINUTES - 1), null, NOW)).toEqual({
      text: '',
      spoken: `עודכן לפני \u2066${QUIET_MINUTES - 1}\u2069 דקות`,
    })
  })

  it('names the age once it matters with isolated numbers and clocks', () => {
    expect(freshnessText(ago(40), null, NOW)).toEqual({
      text: 'לפני \u206640\u2069 דק׳',
      spoken: 'עודכן לפני \u206640\u2069 דקות',
    })
    expect(freshnessText(ago(90), null, NOW)).toEqual({
      text: 'נכון ל־\u206611:30\u2069',
      spoken: 'התחזית נכונה לשעה \u206611:30\u2069',
    })
  })

  it('always speaks up when offline, even with fresh data, with an isolated clock', () => {
    expect(freshnessText(ago(2), 'offline', NOW)).toEqual({
      text: 'אין חיבור · \u206612:58\u2069',
      spoken: 'אין חיבור. התחזית נכונה לשעה \u206612:58\u2069',
    })
  })

  it('does not blame the connection when the service refused or failed, with an isolated clock', () => {
    expect(freshnessText(ago(2), 'service', NOW)).toEqual({
      text: 'לא עודכן · \u206612:58\u2069',
      spoken: 'התחזית לא עודכנה. היא נכונה לשעה \u206612:58\u2069',
    })
  })
})

describe('problemAnnouncement', () => {
  it('returns null when the problem state has not changed', () => {
    expect(problemAnnouncement(null, null, ago(2))).toBeNull()
    expect(problemAnnouncement('offline', 'offline', ago(2))).toBeNull()
    expect(problemAnnouncement('service', 'service', ago(2))).toBeNull()
  })

  it('announces offline and service transitions with an isolated clock', () => {
    expect(problemAnnouncement(null, 'offline', ago(2))).toBe('אין חיבור. מוצגת התחזית מ־\u206612:58\u2069.')
    expect(problemAnnouncement(null, 'service', ago(2))).toBe('התחזית לא עודכנה. מוצגת התחזית מ־\u206612:58\u2069.')
    expect(problemAnnouncement(null, 'offline', null)).toBe('אין חיבור.')
  })

  it('announces recovery when coming back online', () => {
    expect(problemAnnouncement('offline', null, ago(2))).toBe('החיבור חזר.')
    expect(problemAnnouncement('service', null, ago(2))).toBeNull()
  })
})
