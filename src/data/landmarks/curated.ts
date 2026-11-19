import { distanceOf } from './project'
import type { Landmark, MarkKind } from './types'

/**
 * The few landmarks still drawn by hand (docs/design/TRUE-SCENE-PLAN.md, step b). Every other landmark is chosen from
 * the data by its fame (`fame.ts`) and drawn with its kind's generic glyph: the Tower of David as a castle, Shalom
 * Meir, the Sail Tower and Dagon as towers, Reading's chimney, Bazan's cooling tower. These stay because no generic
 * glyph or no mapped object says what they are:
 * - the Western Wall: no kind for a wall (OpenStreetMap maps it as a place of worship, which would draw a synagogue);
 * - the Shrine of the Báb: no kind for a Bahá'í shrine, and its golden dome is Haifa's own sign;
 * - Azrieli Center: three towers, round, triangular and square, read as one sign of Tel Aviv, not as three towers;
 * - the Chords Bridge: OpenStreetMap maps bridges as lines, which the landmark data does not keep.
 * An icon stands in for the mapped objects at its spot (`replaces`): the anonymous towers of Azrieli Center, the Wall's
 * own place of worship, and the mosques of the Temple Mount (the Wall is drawn without the Dome of the Rock: owner,
 * 2026-11-17).
 */
export interface Icon {
  mark: Landmark
  replaces?: { kinds: MarkKind[]; km: number }[]
}

type Mark = Omit<Landmark, 'source' | 'fame' | 'kind'>
const icon = (value: Mark, replaces?: Icon['replaces']): Icon => ({
  mark: { ...value, kind: 'custom', source: 'curated', fame: 2 }, ...(replaces ? { replaces } : {}) })

export const ICONS: Icon[] = [
  icon({ id: 'jerusalem-bridge', glyph: 'jerusalem-bridge', nameHe: 'גשר המיתרים', lat: 31.7885, lon: 35.2004, heightM: 118 },
    [{ kinds: ['bridge'], km: .3 }]),
  icon({ id: 'jerusalem-wall', glyph: 'jerusalem-wall', nameHe: 'הכותל', lat: 31.7768, lon: 35.2344, heightM: 19 },
    [{ kinds: ['synagogue'], km: .1 }, { kinds: ['minaret'], km: .4 }]),
  icon({ id: 'tel-aviv-azrieli', glyph: 'tel-aviv-azrieli', nameHe: 'מרכז עזריאלי', lat: 32.0746, lon: 34.7916, heightM: 187 },
    [{ kinds: ['highrise'], km: .3 }]),
  icon({ id: 'haifa-bab', glyph: 'haifa-bab', nameHe: 'מקדש הבאב', lat: 32.8146, lon: 34.9871, heightM: 11 }), // https://en.wikipedia.org/wiki/Shrine_of_the_B%C3%A1b
]

/** How far an icon is offered to a place: the landmark strip's own reach (`overpass.ts`, `israelData.ts`). */
const ICON_KM = 30

/**
 * The place's landmarks with the icons in its reach added, and the mapped objects each icon stands in for left out.
 */
export function withIcons(place: { lat: number; lon: number }, marks: Landmark[]): Landmark[] {
  const icons = ICONS.filter(({ mark }) => distanceOf(place, mark) <= ICON_KM)
  if (!icons.length) return marks
  const replaced = (mark: Landmark) => icons.some(({ mark: at, replaces }) => replaces?.some(({ kinds, km }) =>
    kinds.includes(mark.kind) && distanceOf(at, mark) <= km))
  return [...marks.filter(mark => mark.source === 'curated' || !replaced(mark)), ...icons.map(({ mark }) => mark)]
}
