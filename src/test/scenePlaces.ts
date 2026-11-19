import type { Place } from '../config/place'

/**
 * Places the scene is checked at (baseline snapshots, camera migration): the hand-curated valley, three curated cities,
 * a village read from the Israel landmark data, and a point in Makhtesh Ramon that is no settlement at all.
 */
export const SCENE_PLACES: Place[] = [
  { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.348, lon: 35.535, timezone: 'Asia/Jerusalem' },
  { id: 'tel-aviv', nameHe: 'תל אביב', regionHe: 'גוש דן', lat: 32.0809, lon: 34.7806, timezone: 'Asia/Jerusalem' },
  { id: 'jerusalem', nameHe: 'ירושלים', regionHe: 'הרי יהודה', lat: 31.769, lon: 35.2163, timezone: 'Asia/Jerusalem' },
  { id: 'haifa', nameHe: 'חיפה', regionHe: 'הכרמל', lat: 32.813, lon: 34.9993, timezone: 'Asia/Jerusalem' },
  { id: 'rosh-pina', nameHe: 'ראש פינה', regionHe: 'הגליל העליון', lat: 32.9686, lon: 35.5422, timezone: 'Asia/Jerusalem' },
  { id: 'ramon-crater', nameHe: 'מכתש רמון', regionHe: 'הנגב', lat: 30.585, lon: 34.81, timezone: 'Asia/Jerusalem' },
]
