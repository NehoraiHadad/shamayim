import { describe, expect, it } from 'vitest'
import type { SpecialEvent } from '../events/types'
import { ltr } from './isolate'
import { specialEventText } from './specialEvent'

const event = (when: SpecialEvent['when'], azimuth = 90, altitude = 30): SpecialEvent =>
  ({ what: 'צדק ליד הירח', when, where: { azimuth, altitude }, perYear: 3, viewing: 'expected' })
const at = (from: string) => ({ from, to: from, tell: 'at' as const })
const NOW = '2026-11-24T12:00'

describe('the special event\'s line', () => {
  it('says what, when and where to look', () => {
    expect(specialEventText(event(at('2026-11-24T16:52'), 62, 4), NOW)).toBe(`צדק ליד הירח · צפוי להיראות היום ב־${ltr('16:52')} · נמוך בצפון־מזרח`)
    expect(specialEventText(event({ from: '2026-11-24T19:40', to: '2026-11-24T23:00', tell: 'from' }, 225, 50), NOW))
      .toBe(`צדק ליד הירח · צפוי להיראות הערב מ־${ltr('19:40')} · גבוה בדרום־מערב`)
    expect(specialEventText(event({ from: '2026-11-24T15:00', to: '2026-11-24T16:30', tell: 'span' }), NOW))
      .toBe(`צדק ליד הירח · צפוי להיראות היום ${ltr('15:00')}–${ltr('16:30')} · במזרח`)
    expect(specialEventText(event(at('2026-11-25T01:30'), 180, 80), NOW)).toBe(`צדק ליד הירח · צפוי להיראות הלילה ב־${ltr('01:30')} · כמעט מעל הראש`)
    expect(specialEventText(event(at('2026-11-25T05:10'), 350), NOW)).toBe(`צדק ליד הירח · צפוי להיראות מחר ב־${ltr('05:10')} · בצפון`)
    expect(specialEventText(event(at('2026-11-25T05:10')), '2026-11-25T02:00')).toBe(`צדק ליד הירח · צפוי להיראות הבוקר ב־${ltr('05:10')} · במזרח`)
  })

  it('says now when it has begun, and until when it lasts', () => {
    const span = { from: '2026-11-24T11:50', to: '2026-11-24T13:00', tell: 'span' as const }
    expect(specialEventText(event(span), NOW)).toBe(`צדק ליד הירח · עכשיו, עד ${ltr('13:00')} · במזרח`)
    expect(specialEventText(event({ ...span, tell: 'from' }), NOW)).toBe('צדק ליד הירח · עכשיו · במזרח')
  })

  it('qualifies uncertain viewing and keeps a weather-dependent title as written', () => {
    const example = event(at('2026-11-24T17:30'), 60, 5)
    expect(specialEventText({ ...example, what: 'סופרמון', viewing: 'cloud-dependent' }, NOW))
      .toBe(`סופרמון · ייתכן שייראה הערב ב־${ltr('17:30')} · נמוך בצפון־מזרח`)
    expect(specialEventText({ ...example, what: 'תיתכן קשת בענן', viewing: 'weather-dependent' }, NOW))
      .toBe(`תיתכן קשת בענן · הערב ב־${ltr('17:30')} · נמוך בצפון־מזרח`)
  })
})
