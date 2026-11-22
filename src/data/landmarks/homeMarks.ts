import type { Place } from '../../config/place'
import type { Landmark } from './types'
import type { SettlementSize } from './settlement'

const SETTLEMENTS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'isolated_dwelling',
   'locality'])

export function placeHomes(place: Place): Landmark[] {
  if (!place.featureCode?.startsWith('PPL') && !(place.usesOsm &&
     SETTLEMENTS.has(place.settlementType ?? ''))) return []
  const size = place.population != null
    ? place.population < 2_000 ? 'small' : place.population < 50_000 ? 'medium' : 'large'
    : place.settlementType === 'city' || place.featureCode === 'PPLA' ? 'large'
      : place.settlementType === 'town' || place.featureCode === 'PPLX' ? 'medium' : 'small'
  const heightM = size === 'small' ? 6 : size === 'medium' ? 8 : 14
  return [{ id: `${place.id}-homes`, kind: 'homes', glyph: `homes-${size}`, nameHe: place.nameHe,
    lat: place.lat, lon: place.lon, heightM, source: 'place' }]
}

/** Adds the place's own houses. */
export function withPlaceHomes(place: Place, marks: Landmark[]): Landmark[] {
  return [...marks, ...placeHomes(place)]
}

export function isPlaceHomes(mark: Landmark) { return mark.kind === 'homes' && mark.source === 'place' }

export function settlementSize(homes: Landmark): SettlementSize {
  return homes.glyph === 'homes-large' ? 'large' : homes.glyph === 'homes-medium' ? 'medium' : 'small'
}

/** Half a place's own houses (px) by its size, where its built-up reach is not known. */
const HOME_HALF: Record<SettlementSize, number> = { small: 27, medium: 43, large: 62 }

export function legacyHomeHalf(marks: Landmark[]) {
  const homes = marks.find(isPlaceHomes)
  return homes ? HOME_HALF[settlementSize(homes)] : 7
}

