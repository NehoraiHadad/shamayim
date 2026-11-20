/*
 * Airports and their traffic (C10): the civil airports of Israel with scheduled or regular traffic, by their published
 * coordinates, field elevation and runway headings (true, the higher-numbered end's opposite given as the lower one), and a
 * typical number of movements an hour by day and by night. One general rule places the traffic of every airport: aircraft
 * take off and land into the wind, so the runway in use is the one most nearly into it; arrivals come in down the extended
 * centreline on a 3° glide path, departures climb out along it at about 5° (a light plane at 3°).
 */

export interface Airport {
  icao: string
  lat: number
  lon: number
  /** Field elevation (m). */
  elevationM: number
  /** Runway headings (deg true) of the lower-numbered ends: each runway serves this heading and its opposite. */
  runways: readonly number[]
  /** Movements an hour, by day and by night (both directions together). */
  perHour: { day: number; night: number }
  /** Light aircraft only (a small piston plane, slow and low). */
  light: boolean
  /** Within this distance (km) its traffic is in the sky of a place. */
  reachKm: number
}

export const AIRPORTS: readonly Airport[] = [
  // Ben Gurion: 03/21, 08/26, 12/30; the country's main airport, open round the clock.
  { icao: 'LLBG', lat: 32.0114, lon: 34.8867, elevationM: 41, runways: [33, 79, 118], perHour: { day: 22, night: 8 }, light: false, reachKm: 35 },
  // Haifa: 16/34.
  { icao: 'LLHA', lat: 32.8094, lon: 35.0431, elevationM: 9, runways: [157], perHour: { day: 2, night: 0 }, light: false, reachKm: 18 },
  // Ramon (Timna): 01/19.
  { icao: 'LLER', lat: 29.7237, lon: 35.0114, elevationM: 88, runways: [11], perHour: { day: 2, night: 0.5 }, light: false, reachKm: 25 },
  // Herzliya: 11/29, light aircraft and flight schools.
  { icao: 'LLHZ', lat: 32.1806, lon: 34.8347, elevationM: 35, runways: [107], perHour: { day: 6, night: 0 }, light: true, reachKm: 12 },
  // Rosh Pina: 15/33, light aircraft.
  { icao: 'LLIB', lat: 32.981, lon: 35.5719, elevationM: 281, runways: [150], perHour: { day: 1, night: 0 }, light: true, reachKm: 10 },
]

const KM_LAT = 110.57
const kmLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180)

/** East and north (km) of a point from an origin (a local flat frame; fine within ~60 km). */
export function enuKm(origin: { lat: number; lon: number }, p: { lat: number; lon: number }): { e: number; n: number } {
  return { e: (p.lon - origin.lon) * kmLon(origin.lat), n: (p.lat - origin.lat) * KM_LAT }
}

/** The angle (deg, 0–90) between a runway heading and the direction the wind comes from, over either end. */
const offWind = (heading: number, fromDeg: number) => Math.abs(((heading - fromDeg) % 360 + 540) % 360 - 180)

/** The runway heading in use (deg true): the end of any runway most nearly into the wind. In a calm, the first runway. */
export function runwayInUse(airport: Airport, windFromDeg: number, windMs: number): number {
  if (windMs < 1.5) return airport.runways[0]
  let best = airport.runways[0], off = Infinity
  for (const r of airport.runways) {
    for (const h of [r, (r + 180) % 360]) {
      const o = offWind(h, windFromDeg)
      if (o < off) { off = o; best = h }
    }
  }
  return best
}

/** A point of a flight path: east and north of the airport (km) and its height above the field (m). */
export interface PathPoint { e: number; n: number; up: number }

/**
 * The approach (`arrive`) or the climb-out (`depart`) along a runway heading, `km` from the field: arrivals out along the
 * reciprocal on a 3° glide path (a light plane the same), departures out ahead climbing ~5° (a light plane ~3°).
 */
export function pathPoint(kind: 'arrive' | 'depart', heading: number, km: number, light: boolean): PathPoint {
  const dir = ((kind === 'arrive' ? heading + 180 : heading) * Math.PI) / 180
  const slope = kind === 'arrive' ? Math.tan((3 * Math.PI) / 180) : Math.tan(((light ? 3 : 5) * Math.PI) / 180)
  return { e: km * Math.sin(dir), n: km * Math.cos(dir), up: 15 + km * 1000 * slope }
}
