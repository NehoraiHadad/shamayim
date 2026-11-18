import type { Band, RainOutlook } from './rainNowcast'

/**
 * What the rain map says in words, for people who do not read radar: a headline that answers "will it rain on me
 * soon, and when?", one detail line, and (only when a time is predicted from the rain's motion) a basis line.
 * Copy: `docs/design/radar-ux-fable.md` §1. `clockIn(m)` gives the place's clock m minutes from now ("15:40");
 * `forecastRainAt` is the model's first rainy clock time within three hours.
 */

export type RadarState =
  | { kind: 'ok' }
  /** Not read yet (the page is loading, or the main sheet has no radar outlook). */
  | { kind: 'loading' }
  /** The newest radar frame is too old: its clock time and how long ago, already in words. */
  | { kind: 'stale'; clock: string; ago: string }
  | { kind: 'failed' }
  | { kind: 'offline' }

export interface Verdict { headline: string; detail: string; basis: string | null }

export const BASIS = 'הערכה לפי תנועת הגשם בחצי השעה האחרונה'

const KIND = ['גשם', 'גשם קל', 'גשם', 'גשם חזק'] as const
const SIDE = ['צפונית', 'צפון־מזרחית', 'מזרחית', 'דרום־מזרחית', 'דרומית', 'דרום־מערבית', 'מערבית', 'צפון־מערבית']
const FROM = ['מצפון', 'מצפון־מזרח', 'ממזרח', 'מדרום־מזרח', 'מדרום', 'מדרום־מערב', 'ממערב', 'מצפון־מערב']
const TOWARD = ['צפונה', 'לצפון־מזרח', 'מזרחה', 'לדרום־מזרח', 'דרומה', 'לדרום־מערב', 'מערבה', 'לצפון־מערב']
/** Rain this close counts as "near" even when it is not heading here. */
export const NEAR_KM = 80
/** Slower than this the rain is "almost not moving". */
const STILL_KMH = 4

export const octant = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8
const round = (n: number, to: number) => Math.max(to, Math.round(n / to) * to)

/** "כמה דקות", "כ־25 דקות", "כשעה", "כשעה וחצי". */
export function about(minutes: number): string {
  if (minutes <= 10) return 'כמה דקות'
  if (minutes < 55) return `כ־${round(minutes, 5)} דקות`
  if (minutes < 75) return 'כשעה'
  return 'כשעה וחצי'
}

export const distance = (km: number) => `כ־${round(km, km < 20 ? 5 : 10)} ק״מ`
/** "צפונית לך" — where a point lies from the place. */
export const side = (bearing: number) => `${SIDE[octant(bearing)]} לך`
/** "ממערב" — where rain moving along `heading` comes from. */
export const comingFrom = (heading: number) => FROM[octant(heading + 180)]
/** "מזרחה" — where rain moving along `heading` goes. */
export const goingTo = (heading: number) => TOWARD[octant(heading)]

const kind = (band: Band) => KIND[band]

export function rainVerdict(state: RadarState, o: RainOutlook | null, clockIn: (minutes: number) => string,
  forecastRainAt: string | null): Verdict {
  const model = forecastRainAt ? ` לפי התחזית: גשם בסביבות ${forecastRainAt}.` : ''
  if (state.kind === 'offline') return { headline: 'אין חיבור לרשת',
    detail: 'אי אפשר להציג את מפת הגשם בלי חיבור. התחזית בדף הראשי נשמרה מהעדכון האחרון.', basis: null }
  if (state.kind === 'failed') return { headline: 'אין כרגע תמונת מכ״ם', detail: `העננים מוצגים כרגיל.${model}`, basis: null }
  if (state.kind === 'stale') return { headline: 'אין תמונת מכ״ם עדכנית',
    detail: `התמונה האחרונה מ־${state.clock}, ${state.ago}. אי אפשר לדעת ממנה מה קורה עכשיו.`, basis: null }
  if (!o) return { headline: 'בודקים איפה הגשם…', detail: '', basis: null }

  if (o.now) {
    const headline = `יורד עכשיו ${kind(o.now)}`
    if (o.lastsFor === 'longer') return { headline, detail: 'נראה שיימשך עוד יותר משעה וחצי.', basis: BASIS }
    if (o.lastsFor === null) return { headline, detail: 'לא ברור עדיין מתי ייפסק.', basis: null }
    return { headline, detail: `צפוי להיפסק בעוד ${about(o.lastsFor)}, בסביבות ${clockIn(o.lastsFor)}.`, basis: BASIS }
  }
  if (o.arrivesIn !== null) {
    const from = o.motion ? `מגיע ${comingFrom(o.motion.heading)}, ` : 'מגיע '
    const lasting = o.lastsFor === 'longer' ? ', ונראה שיימשך זמן רב'
      : typeof o.lastsFor === 'number' ? `, ויימשך ${about(o.lastsFor)}` : ''
    return {
      headline: `${o.band === 3 ? 'גשם חזק' : 'גשם'} בעוד ${about(o.arrivesIn)}`,
      detail: `${from}בסביבות ${clockIn(o.arrivesIn)}${lasting}.`,
      basis: BASIS,
    }
  }
  const near = o.nearest && o.nearest.km <= NEAR_KM ? o.nearest : null
  if (near) {
    const where = `${distance(near.km)} ${side(near.bearing)}`
    if (!o.motion) return { headline: `גשם ${distance(near.km)} ממך`,
      detail: `${side(near.bearing)}. לא ברור עדיין לאן הוא נע.`, basis: null }
    if (o.motion.kmh < STILL_KMH) return { headline: 'גשם קרוב, כמעט לא זז', detail: `${where}.`, basis: BASIS }
    return { headline: 'גשם קרוב, אבל לא בדרך אליך',
      detail: `${where}, נע ${goingTo(o.motion.heading)}. לא צפוי להגיע בשעה וחצי הקרובה.`, basis: BASIS }
  }
  if (forecastRainAt) return { headline: 'אין גשם כרגע', detail: `התחזית צופה גשם בסביבות ${forecastRainAt}.`, basis: null }
  if (o.nearest) return { headline: 'לא נראה גשם בדרך אליך',
    detail: `הגשם הקרוב ${distance(o.nearest.km)} ${side(o.nearest.bearing)}.`, basis: null }
  return { headline: 'לא נראה גשם בדרך אליך', detail: 'אין גשם במכ״ם בכל הסביבה.', basis: null }
}

/** Whether the main sheet should lead with the rain row: rain over the place, coming, or near. */
export const rainIsNear = (o: RainOutlook | null) =>
  Boolean(o && (o.now || o.arrivesIn !== null || (o.nearest?.km ?? Infinity) <= NEAR_KM))

/** The main sheet's rain row: the page's headline, or the model's time while the radar outlook is unknown. */
export function entryHeadline(o: RainOutlook | null, clockIn: (minutes: number) => string, forecastRainAt: string | null): string {
  if (o) return rainVerdict({ kind: 'ok' }, o, clockIn, forecastRainAt).headline
  return forecastRainAt ? `גשם צפוי בסביבות ${forecastRainAt}` : 'גשם בדרך'
}
