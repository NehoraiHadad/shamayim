import type { Place } from '../config/place'

/**
 * Places the scene is checked at (baseline snapshots, camera migration): the hand-curated valley, three cities with icons,
 * a village read from the Israel landmark data, a point in Makhtesh Ramon that is no settlement at all, and two places
 * over a lake (Tiberias over the Kinneret, Ein Gedi over the Dead Sea).
 */
export const SCENE_PLACES: Place[] = [
  { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'village', population: 700 },
  { id: 'tel-aviv', nameHe: 'תל אביב', regionHe: 'גוש דן', lat: 32.0809, lon: 34.7806, timezone: 'Asia/Jerusalem',
    featureCode: 'PPLA', settlementType: 'city', population: 470000 },
  { id: 'jerusalem', nameHe: 'ירושלים', regionHe: 'הרי יהודה', lat: 31.769, lon: 35.2163, timezone: 'Asia/Jerusalem',
    featureCode: 'PPLC', settlementType: 'city', population: 980000 },
  { id: 'haifa', nameHe: 'חיפה', regionHe: 'הכרמל', lat: 32.813, lon: 34.9993, timezone: 'Asia/Jerusalem',
    featureCode: 'PPLA', settlementType: 'city', population: 290000 },
  { id: 'rosh-pina', nameHe: 'ראש פינה', regionHe: 'הגליל העליון', lat: 32.9686, lon: 35.5422, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'town', population: 3100 },
  { id: 'ramon-crater', nameHe: 'מכתש רמון', regionHe: 'הנגב', lat: 30.585, lon: 34.81, timezone: 'Asia/Jerusalem' },
  { id: 'tiberias', nameHe: 'טבריה', regionHe: 'הכנרת', lat: 32.7922, lon: 35.5312, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'city', population: 47000 },
  { id: 'ein-gedi', nameHe: 'עין גדי', regionHe: 'ים המלח', lat: 31.4524, lon: 35.3848, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'village', population: 650 },
]

/**
 * Three more cities for the skyline study (`?skyline=a|b|c`, docs/design/qa/true-scene/skyline/): dense with towers
 * (Ramat Gan, Netanya) and a desert city of mid-rise blocks (Be'er Sheva). Not in the baseline (no panorama fixtures).
 */
export const SKYLINE_STUDY_PLACES: Place[] = [
  { id: 'ramat-gan', nameHe: 'רמת גן', regionHe: 'גוש דן', lat: 32.08227, lon: 34.81065, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'city', population: 170000 },
  { id: 'beer-sheva', nameHe: 'באר שבע', regionHe: 'הנגב', lat: 31.25181, lon: 34.7913, timezone: 'Asia/Jerusalem',
    featureCode: 'PPLA', settlementType: 'city', population: 210000 },
  { id: 'netanya', nameHe: 'נתניה', regionHe: 'השרון', lat: 32.33291, lon: 34.85992, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'city', population: 230000 },
]

/**
 * Places the canvas scene's review stills add (docs/design/qa/canvas/): a point over the Dead Sea that is no settlement
 * (Masada's summit), a moshav and a mid-size town. Not in the baseline; their panoramas are recorded beside the baseline's.
 */
export const STILL_PLACES: Place[] = [
  { id: 'masada', nameHe: 'מצדה', regionHe: 'ים המלח', lat: 31.3156, lon: 35.3536, timezone: 'Asia/Jerusalem' },
  // The density continuum (C5): a moshav of farmsteads round its ring and a mid-size town on a ridge.
  { id: 'nahalal', nameHe: 'נהלל', regionHe: 'עמק יזרעאל', lat: 32.6897, lon: 35.1953, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'village', population: 1400 },
  { id: 'zikhron-yaakov', nameHe: 'זכרון יעקב', regionHe: 'רמת הנדיב', lat: 32.5714, lon: 34.9522, timezone: 'Asia/Jerusalem',
    featureCode: 'PPL', settlementType: 'town', population: 24000 },
]
