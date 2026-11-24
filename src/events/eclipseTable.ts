/*
 * The umbral lunar eclipses from late 2026 to the end of 2037, as published: F. Espenak, NASA's GSFC, "Lunar Eclipses:
 * 2021–2030" and "2031–2040" (https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html and LEdecade2031.html): greatest
 * eclipse in TD, umbral magnitude, the partial and total phases' lengths; ΔT from the catalogue
 * (https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html). "Eclipse Predictions by Fred Espenak, NASA's GSFC".
 * There is none between 2026-11-24 and 2028-01-12. Whether a place sees one is asked of the moon over it (`seen.ts`).
 */

export interface LunarEclipse {
  /** Greatest eclipse, Terrestrial Dynamical Time, and what to take off it for UT (s). */
  greatestTD: string
  deltaT: number
  magnitude: number
  /** From the umbra's first touch to its last (minutes). */
  partialMin: number
  /** The total phase (minutes); 0 for a partial eclipse. */
  totalMin: number
}

const row = (greatestTD: string, deltaT: number, magnitude: number, partialMin: number, totalMin = 0): LunarEclipse =>
  ({ greatestTD, deltaT, magnitude, partialMin, totalMin })

export const LUNAR_ECLIPSES: readonly LunarEclipse[] = [
  row('2028-01-12T04:14:13', 76, 0.066, 56),
  row('2028-07-06T18:20:57', 77, 0.389, 141),
  row('2028-12-31T16:53:15', 77, 1.246, 209, 71),
  row('2029-06-26T03:23:22', 77, 1.844, 220, 102),
  row('2029-12-20T22:43:12', 78, 1.117, 213, 54),
  row('2030-06-15T18:34:34', 78, 0.502, 144),
  row('2032-04-25T15:14:51', 79, 1.191, 211, 66),
  row('2032-10-18T19:03:40', 79, 1.103, 196, 47),
  row('2033-04-14T19:13:51', 80, 1.094, 215, 49),
  row('2033-10-08T10:56:23', 80, 1.35, 202, 79),
  row('2034-09-28T02:47:37', 81, 0.014, 27),
  row('2035-08-19T01:12:15', 81, 0.104, 77),
  row('2036-02-11T22:13:06', 82, 1.299, 202, 74),
  row('2036-08-07T02:52:32', 82, 1.454, 231, 95),
  row('2037-01-31T14:01:38', 82, 1.207, 197, 64),
  row('2037-07-27T04:09:53', 83, 0.809, 192),
]

/** Greatest eclipse (ms, UT). */
export const greatestOf = (e: LunarEclipse) => Date.parse(`${e.greatestTD}Z`) - 1000 * e.deltaT
