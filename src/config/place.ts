export interface Place {
  id: string
  nameHe: string
  regionHe: string
  lat: number
  lon: number
  timezone: string
  elevation?: number
  usesOsm?: boolean
  population?: number
  featureCode?: string
  settlementType?: string
}

export const SHADMOT_MEHOLA: Place = {
  id: 'shadmot-mehola',
  nameHe: 'שדמות מחולה',
  regionHe: 'בקעת הירדן',
  // The village's centre (by its synagogue, in the middle of its built-up area): the dot and its portrait stand here.
  lat: 32.3465,
  lon: 35.5325,
  timezone: 'Asia/Jerusalem',
  featureCode: 'PPL',
  settlementType: 'village',
  population: 700,
}
