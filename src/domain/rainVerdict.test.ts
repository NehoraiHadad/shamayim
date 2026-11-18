import { describe, expect, it } from 'vitest'
import type { RainOutlook } from './rainNowcast'
import { BASIS, entryHeadline, mapSentence, rainIsNear, rainVerdict, type RadarState } from './rainVerdict'

const clock = (m: number) => `+${m}`
const ok: RadarState = { kind: 'ok' }
const dry: RainOutlook = { now: 0, arrivesIn: null, lastsFor: null, band: 0, nearest: null, approach: null, motion: null }
const east = { kmh: 30, heading: 90 }
const say = (o: RainOutlook | null, state: RadarState = ok, model: string | null = null) => rainVerdict(state, o, clock, model)

// One case per row of the copy table in docs/design/radar-ux-fable.md §1.
describe('rain verdict', () => {
  it('raining now, end known', () => {
    expect(say({ ...dry, now: 2, band: 2, lastsFor: 40, motion: east }))
      .toEqual({ headline: 'יורד עכשיו גשם', detail: 'צפוי להיפסק בעוד כ־40 דקות, בסביבות +40.', basis: BASIS })
    expect(say({ ...dry, now: 1, band: 1, lastsFor: 40, motion: east }).headline).toBe('יורד עכשיו גשם קל')
    expect(say({ ...dry, now: 3, band: 3, lastsFor: 40, motion: east }).headline).toBe('יורד עכשיו גשם חזק')
  })

  it('raining now, for long', () => {
    expect(say({ ...dry, now: 2, band: 2, lastsFor: 'longer', motion: east }))
      .toEqual({ headline: 'יורד עכשיו גשם', detail: 'נראה שיימשך עוד יותר משעה וחצי.', basis: BASIS })
  })

  it('raining now, motion unknown', () => {
    expect(say({ ...dry, now: 2, band: 2 }))
      .toEqual({ headline: 'יורד עכשיו גשם', detail: 'לא ברור עדיין מתי ייפסק.', basis: null })
  })

  it('approaching', () => {
    const coming = { ...dry, arrivesIn: 25, band: 2 as const, lastsFor: 40, motion: east }
    expect(say(coming)).toEqual({ headline: 'גשם בעוד כ־25 דקות', detail: 'מגיע ממערב, בסביבות +25, ויימשך כ־40 דקות.', basis: BASIS })
    expect(say({ ...coming, lastsFor: 'longer' }).detail).toBe('מגיע ממערב, בסביבות +25, ונראה שיימשך זמן רב.')
    expect(say({ ...coming, band: 3 }).headline).toBe('גשם חזק בעוד כ־25 דקות')
    expect(say({ ...coming, arrivesIn: 5 }).headline).toBe('גשם בעוד כמה דקות')
  })

  it('near and moving away', () => {
    expect(say({ ...dry, nearest: { km: 31, bearing: 0, band: 1 }, motion: east })).toEqual({
      headline: 'גשם קרוב, אבל לא בדרך אליך',
      detail: 'כ־30 ק״מ צפונית לך, נע מזרחה. לא צפוי להגיע בשעה וחצי הקרובה.', basis: BASIS })
  })

  it('near and standing', () => {
    expect(say({ ...dry, nearest: { km: 31, bearing: 0, band: 1 }, motion: { kmh: 2, heading: 90 } }))
      .toEqual({ headline: 'גשם קרוב, כמעט לא זז', detail: 'כ־30 ק״מ צפונית לך.', basis: BASIS })
  })

  it('near, motion unknown', () => {
    expect(say({ ...dry, nearest: { km: 31, bearing: 0, band: 1 } }))
      .toEqual({ headline: 'גשם כ־30 ק״מ ממך', detail: 'צפונית לך. לא ברור עדיין לאן הוא נע.', basis: null })
  })

  it('dry, the model expects rain', () => {
    expect(say(dry, ok, '16:00')).toEqual({ headline: 'אין גשם כרגע', detail: 'התחזית צופה גשם בסביבות 16:00.', basis: null })
  })

  it('dry, rain far away', () => {
    expect(say({ ...dry, nearest: { km: 228, bearing: 0, band: 2 }, motion: east }))
      .toEqual({ headline: 'לא נראה גשם בדרך אליך', detail: 'הגשם הקרוב כ־230 ק״מ צפונית לך.', basis: null })
  })

  it('dry, nothing in range', () => {
    expect(say(dry)).toEqual({ headline: 'לא נראה גשם בדרך אליך', detail: 'אין גשם במכ״ם בכל הסביבה.', basis: null })
  })

  it('loading', () => {
    expect(say(null, { kind: 'loading' })).toEqual({ headline: 'בודקים איפה הגשם…', detail: '', basis: null })
    expect(say(null).headline).toBe('בודקים איפה הגשם…')
  })

  it('stale radar', () => {
    expect(say(dry, { kind: 'stale', clock: '13:20', ago: 'לפני שעה וחצי' })).toEqual({
      headline: 'אין תמונת מכ״ם עדכנית',
      detail: 'התמונה האחרונה מ־13:20, לפני שעה וחצי. אי אפשר לדעת ממנה מה קורה עכשיו.', basis: null })
  })

  it('radar failed, with and without the model', () => {
    expect(say(null, { kind: 'failed' })).toEqual({ headline: 'אין כרגע תמונת מכ״ם', detail: 'העננים מוצגים כרגיל.', basis: null })
    expect(say(null, { kind: 'failed' }, '16:00').detail).toBe('העננים מוצגים כרגיל. לפי התחזית: גשם בסביבות 16:00.')
  })

  it('offline', () => {
    expect(say(dry, { kind: 'offline' })).toEqual({ headline: 'אין חיבור לרשת',
      detail: 'אי אפשר להציג את מפת הגשם בלי חיבור. התחזית בדף הראשי נשמרה מהעדכון האחרון.', basis: null })
  })

  it('knows when the rain row should lead the sheet', () => {
    expect(rainIsNear(null)).toBe(false)
    expect(rainIsNear(dry)).toBe(false)
    expect(rainIsNear({ ...dry, nearest: { km: 80, bearing: 0, band: 1 } })).toBe(true)
    expect(rainIsNear({ ...dry, nearest: { km: 81, bearing: 0, band: 1 } })).toBe(false)
    expect(rainIsNear({ ...dry, arrivesIn: 60 })).toBe(true)
  })

  it('gives the main sheet the headline, or the model while the radar is unknown', () => {
    expect(entryHeadline({ ...dry, arrivesIn: 25, band: 2, motion: east }, clock, null)).toBe('גשם בעוד כ־25 דקות')
    expect(entryHeadline(null, clock, '16:00')).toBe('גשם צפוי בסביבות 16:00')
    expect(entryHeadline(null, clock, null)).toBe('גשם בדרך')
  })

  it('describes the map in words for screen readers', () => {
    const base = 'במפה: שדמות מחולה במרכז, טבעות ב־25 וב־50 ק״מ.'
    expect(mapSentence('שדמות מחולה', null)).toBe(base)
    expect(mapSentence('שדמות מחולה', { ...dry, nearest: { km: 31, bearing: 315, band: 1 }, motion: east }))
      .toBe(`${base} הגשם הקרוב כ־30 ק״מ צפון־מערבית לך, נע מזרחה.`)
    expect(mapSentence('שדמות מחולה', { ...dry, nearest: { km: 31, bearing: 315, band: 1 } }))
      .toBe(`${base} הגשם הקרוב כ־30 ק״מ צפון־מערבית לך.`)
    expect(mapSentence('שדמות מחולה', { ...dry, nearest: { km: 230, bearing: 0, band: 1 } })).toBe(`${base} אין גשם במכ״ם באזור המפה.`)
    expect(mapSentence('שדמות מחולה', { ...dry, now: 2 })).toBe(`${base} הגשם מעל שדמות מחולה.`)
  })
})
