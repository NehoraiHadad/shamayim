import type { Band, RainOutlook } from './rainNowcast'

/**
 * One or two plain Hebrew sentences on what the rain around the place will do, for people who do not read radar.
 * `clockIn(m)` gives the place's clock m minutes from now ("15:40"); `forecastRainAt` is the model's first rainy
 * clock time within three hours, used only when the radar sees nothing close.
 */

const KIND = ['', 'גשם קל', 'גשם', 'גשם חזק'] as const
const SIDE = ['צפונית', 'צפון־מזרחית', 'מזרחית', 'דרום־מזרחית', 'דרומית', 'דרום־מערבית', 'מערבית', 'צפון־מערבית']
const FROM = ['מצפון', 'מצפון־מזרח', 'ממזרח', 'מדרום־מזרח', 'מדרום', 'מדרום־מערב', 'ממערב', 'מצפון־מערב']
const TOWARD = ['צפונה', 'לצפון־מזרח', 'מזרחה', 'לדרום־מזרח', 'דרומה', 'לדרום־מערב', 'מערבה', 'לצפון־מערב']
/** Rain this close counts as "in your area" even when it is not heading here. */
const NEAR_KM = 80

const octant = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8
const round = (n: number, to: number) => Math.max(to, Math.round(n / to) * to)

export function about(minutes: number): string {
  if (minutes <= 10) return 'כמה דקות'
  if (minutes < 55) return `כ־${round(minutes, 5)} דקות`
  if (minutes < 75) return 'כשעה'
  return 'כשעה וחצי'
}

const distance = (km: number) => `כ־${round(km, km < 20 ? 5 : 10)} ק״מ`
const kind = (band: Band) => KIND[band] || 'גשם'

function lasting(lastsFor: RainOutlook['lastsFor']): string {
  if (lastsFor === 'longer') return ' ונראה שיימשך זמן רב'
  return lastsFor === null ? '' : ` ולהימשך ${about(lastsFor)}`
}

export function rainSentence(o: RainOutlook, clockIn: (minutes: number) => string, forecastRainAt: string | null): string {
  if (o.now) {
    const head = `יורד עכשיו ${kind(o.now)}.`
    if (o.lastsFor === 'longer') return `${head} נראה שהוא יימשך עוד יותר משעה וחצי.`
    if (o.lastsFor === null) return head
    return `${head} לפי תנועת העננים הוא צפוי להיפסק בעוד ${about(o.lastsFor)}, בסביבות ${clockIn(o.lastsFor)}.`
  }
  if (o.arrivesIn !== null) {
    const from = o.motion ? ` ${FROM[octant(o.motion.heading + 180)]}` : ''
    return `${kind(o.band)} מתקרב${from}. הוא צפוי להגיע לאזור שלך בעוד ${about(o.arrivesIn)}, `
      + `בסביבות ${clockIn(o.arrivesIn)},${lasting(o.lastsFor)}.`
  }
  const near = o.nearest && o.nearest.km <= NEAR_KM ? o.nearest : null
  if (near) {
    const where = `יש ${kind(near.band)} ${distance(near.km)} ${SIDE[octant(near.bearing)]} לך`
    if (!o.motion) return `${where}.`
    if (o.motion.kmh < 4) return `${where}, והוא כמעט לא זז.`
    return `${where}. הוא נע ${TOWARD[octant(o.motion.heading)]} ולא צפוי להגיע אליך בשעה וחצי הקרובה.`
  }
  if (forecastRainAt) return `עדיין אין גשם באזור, אבל התחזית צופה גשם בסביבות ${forecastRainAt}.`
  if (o.nearest) return `אין גשם באזור שלך. הגשם הקרוב נמצא ${distance(o.nearest.km)} ${SIDE[octant(o.nearest.bearing)]} לך.`
  return 'אין גשם בכל הסביבה, עד מאות קילומטרים ממך.'
}
