import type { Place } from '../../config/place'
import { offsetKm } from './project'
import type { CuratedPlace, Landmark } from './types'

type Mark = Omit<Landmark, 'source'>
const mark = (value: Mark): Landmark => ({ ...value, source: 'curated' })

export const CURATED: CuratedPlace[] = [
  { id: 'jerusalem', lat: 31.7690, lon: 35.2163, marks: [
    mark({ id: 'jerusalem-bridge', kind: 'custom', glyph: 'jerusalem-bridge', nameHe: 'גשר המיתרים', lat: 31.7885, lon: 35.2004, heightM: 118 }),
    mark({ id: 'jerusalem-david', kind: 'custom', glyph: 'jerusalem-david', nameHe: 'מגדל דוד', lat: 31.7761, lon: 35.2281, heightM: 30 }), // Height unverified.
    mark({ id: 'jerusalem-wall', kind: 'custom', glyph: 'jerusalem-wall', nameHe: 'הכותל', lat: 31.7768, lon: 35.2344, heightM: 19 }), // Wall above the plaza; drawn without the Dome of the Rock (owner, 2026-11-17).
  ] },
  { id: 'tel-aviv', lat: 32.0809, lon: 34.7806, marks: [
    mark({ id: 'tel-aviv-shalom', kind: 'custom', glyph: 'tel-aviv-shalom', nameHe: 'מגדל שלום', lat: 32.0642, lon: 34.7697, heightM: 142 }), // https://www.skyscrapercenter.com/building/wd/4259
    mark({ id: 'tel-aviv-reading', kind: 'custom', glyph: 'tel-aviv-reading', nameHe: 'ארובת רדינג', lat: 32.1055, lon: 34.7789, heightM: 150 }), // Retired 2024; chimney retained by plan. Height unverified. https://www.timesofisrael.com/tel-avivs-iconic-power-station-to-close-become-apartments-report/
    mark({ id: 'tel-aviv-sarona', kind: 'custom', glyph: 'tel-aviv-sarona', nameHe: 'עזריאלי שרונה', lat: 32.0719, lon: 34.7885, heightM: 238 }),
    mark({ id: 'tel-aviv-azrieli', kind: 'custom', glyph: 'tel-aviv-azrieli', nameHe: 'מרכז עזריאלי', lat: 32.0746, lon: 34.7916, heightM: 187 }),
  ] },
  { id: 'haifa', lat: 32.8130, lon: 34.9993, marks: [
    mark({ id: 'haifa-bab', kind: 'custom', glyph: 'haifa-bab', nameHe: 'מקדש הבאב', lat: 32.8146, lon: 34.9871, heightM: 11 }), // https://en.wikipedia.org/wiki/Shrine_of_the_B%C3%A1b
    mark({ id: 'haifa-dagon', kind: 'custom', glyph: 'haifa-dagon', nameHe: 'ממגורות דגון', lat: 32.82297, lon: 34.99526, heightM: 65 }), // https://he.wikipedia.org/wiki/%D7%9E%D7%9E%D7%92%D7%95%D7%A8%D7%95%D7%AA_%D7%93%D7%92%D7%95%D7%9F
    mark({ id: 'haifa-sail', kind: 'custom', glyph: 'haifa-sail', nameHe: 'מגדל המפרש', lat: 32.8163, lon: 35.0028, heightM: 137 }),
    mark({ id: 'haifa-cooling', kind: 'custom', glyph: 'haifa-cooling', nameHe: 'מגדל הקירור בבזן', lat: 32.7933, lon: 35.0516, heightM: 75 }), // One tower remains; height unverified. https://www.timesofisrael.com/iconic-haifa-oil-refinery-tower-collapses/
  ] },
  { id: 'shadmot-mehola', lat: 32.348, lon: 35.535, marks: [
    mark({ id: 'shadmot-palms', kind: 'palms', glyph: 'shadmot-palms', nameHe: 'מטע תמרים', lat: 32.3690, lon: 35.5253, heightM: 15, x: 160 }),
    mark({ id: 'shadmot-homes', kind: 'homes', glyph: 'shadmot-homes', nameHe: 'בתי שדמות מחולה', lat: 32.3465, lon: 35.5324, heightM: 8, x: 170 }),
    mark({ id: 'shadmot-solar', kind: 'solar', glyph: 'shadmot-solar', nameHe: 'שדה סולארי', lat: 32.3425, lon: 35.5340, heightM: 3, x: 187 }),
    mark({ id: 'shadmot-orchard', kind: 'orchard', glyph: 'shadmot-orchard', nameHe: 'מטע', lat: 32.3460, lon: 35.5605, heightM: 5, x: 200 }),
  ] },
]

export function curatedForPlace(place: Pick<Place, 'lat' | 'lon'>): CuratedPlace | null {
  return CURATED.find((city) => Math.hypot(offsetKm(place, city).dx, offsetKm(place, city).dy) <= 8) ?? null
}
