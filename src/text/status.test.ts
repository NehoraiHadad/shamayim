import { describe, expect, it } from 'vitest'
import { freshnessText, QUIET_MINUTES } from './status'

const NOW = Date.UTC(2026, 10, 17, 11, 0)
const ago = (min: number) => NOW - min * 60000

describe('freshnessText', () => {
  it('shows no words while the data is fresh, but still says its age to screen readers', () => {
    expect(freshnessText(ago(0), null, NOW)).toEqual({ text: '', spoken: 'עודכן עכשיו' })
    expect(freshnessText(ago(QUIET_MINUTES - 1), null, NOW)).toEqual({ text: '', spoken: `עודכן לפני ${QUIET_MINUTES - 1} דקות` })
  })

  it('names the age once it matters', () => {
    expect(freshnessText(ago(40), null, NOW).text).toBe('לפני 40 דק׳')
    expect(freshnessText(ago(90), null, NOW).text).toBe('נכון ל־11:30')
  })

  it('always speaks up when offline, even with fresh data', () => {
    expect(freshnessText(ago(2), 'offline', NOW).text).toBe('אין חיבור · 12:58')
  })

  it('does not blame the connection when the service refused or failed', () => {
    expect(freshnessText(ago(2), 'service', NOW).text).toBe('לא עודכן · 12:58')
  })
})
