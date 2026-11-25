import { Body } from 'astronomy-engine'

export const BRIGHT_PLANETS = [
  { id: 'mercury', body: Body.Mercury, name: 'חמה' },
  { id: 'venus', body: Body.Venus, name: 'נוגה' },
  { id: 'mars', body: Body.Mars, name: 'מאדים' },
  { id: 'jupiter', body: Body.Jupiter, name: 'צדק' },
  { id: 'saturn', body: Body.Saturn, name: 'שבתאי' },
] as const
