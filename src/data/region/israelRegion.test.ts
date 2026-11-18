import { describe, expect, it } from 'vitest'
import { cleanRegionHe, israelRegionHe, withLocalRegion } from './israelRegion'

const cases: [string, number, number, string][] = [
  ['מעלה חבר', 31.4858, 35.1652, 'הר חברון'],
  ['קריית ארבע', 31.531, 35.122, 'הר חברון'],
  ['כרמי צור', 31.6092, 35.1009, 'גוש עציון'],
  ['אפרת', 31.655, 35.152, 'גוש עציון'],
  ['בית אל', 31.943, 35.224, 'בנימין'],
  ['שילה', 32.053, 35.291, 'בנימין'],
  ['מעלה אדומים', 31.7706, 35.2985, 'בנימין'],
  ['קרני שומרון', 32.1722, 35.0978, 'שומרון'],
  ['אריאל', 32.105, 35.17, 'שומרון'],
  ['שדמות מחולה', 32.348, 35.535, 'בקעת הירדן'],
  ['קצרין', 32.992, 35.6877, 'גולן'],
  ['צפת', 32.965, 35.496, 'גליל עליון'],
  ['נצרת', 32.70, 35.30, 'גליל תחתון'],
  ['נהריה', 33.006, 35.095, 'גליל מערבי'],
  ['תל אביב', 32.0809, 34.7806, 'גוש דן'],
  ['באר שבע', 31.252, 34.791, 'נגב'],
  ['מצפה רמון', 30.61, 34.80, 'הר הנגב'],
  ['אילת', 29.557, 34.952, 'ערבה'],
  ['עין גדי', 31.46, 35.39, 'ים המלח'],
]

describe('israelRegionHe', () => {
  it.each(cases)('%s is in %s', (_name, lat, lon, region) => {
    expect(israelRegionHe(lat, lon)).toBe(region)
  })

  it('stays out of Gaza, Sinai, Jordan, Lebanon and Syria', () => {
    for (const [lat, lon] of [[31.50, 34.45], [30.0, 33.8], [31.95, 35.93], [33.89, 35.50], [33.51, 36.29]]) {
      expect(israelRegionHe(lat, lon)).toBeNull()
    }
  })
})

describe('cleanRegionHe', () => {
  it('drops niqqud and the foreign name for the land', () => {
    expect(cleanRegionHe('הַגָּדָה הַמַּעֲרָבִית')).toBe('יהודה ושומרון')
    expect(cleanRegionHe('הר-חברון')).toBe('הר-חברון')
  })
})

describe('withLocalRegion', () => {
  const place = { id: 'x', timezone: 'Asia/Jerusalem' }
  it('replaces the source region with the local one', () => {
    expect(withLocalRegion({ ...place, nameHe: 'מעלה חבר', regionHe: 'יהודה ושומרון', lat: 31.4858, lon: 35.1652 }).regionHe)
      .toBe('הר חברון')
  })

  it('drops a region equal to the name and keeps foreign regions, cleaned', () => {
    expect(withLocalRegion({ ...place, nameHe: 'ירושלים', regionHe: 'מחוז ירושלים', lat: 31.78, lon: 35.22 }).regionHe)
      .toBe('')
    expect(withLocalRegion({ ...place, nameHe: 'ג׳רש', regionHe: 'עַמָּאן', lat: 31.95, lon: 35.93 }).regionHe)
      .toBe('עמאן')
  })

  it('sets the Israel clock inside the land and keeps the device clock abroad', () => {
    const moscow = { ...place, timezone: 'Europe/Moscow', nameHe: 'מעלה חבר', regionHe: '' }
    expect(withLocalRegion({ ...moscow, lat: 31.4858, lon: 35.1652 }).timezone).toBe('Asia/Jerusalem')
    expect(withLocalRegion({ ...moscow, lat: 55.75, lon: 37.62 }).timezone).toBe('Europe/Moscow')
  })
})
