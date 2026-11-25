import { EquatorFromVector, RotateVector, Rotation_EQJ_EQD, Vector, type AstroTime } from 'astronomy-engine'

const RAD = Math.PI / 180

export interface BrightStar {
  name: string
  /** Right ascension in hours and declination in degrees, at J2000. */
  ra: number
  dec: number
  /** Proper motion in arcseconds per year along the right ascension and declination directions. */
  pmRa: number
  pmDec: number
  magnitude: number
}

// Yale Bright Star Catalogue, 5th revised edition: https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50.
// The brightest stars near the Moon's track, plus Alcyone (HR 1165) in the middle of M45.
export const ALCYONE: BrightStar = {
  name: 'אלקיונה', ra: 3 + 47 / 60 + 29.1 / 3600, dec: 24 + 6 / 60 + 18 / 3600,
  pmRa: 0.019, pmDec: -0.046, magnitude: 2.87,
}

export const MOON_STARS: readonly BrightStar[] = [
  { name: 'אלדברן', ra: 4 + 35 / 60 + 55.2 / 3600, dec: 16 + 30 / 60 + 33 / 3600, pmRa: 0.063, pmDec: -0.190, magnitude: 0.85 },
  { name: 'אלנת׳', ra: 5 + 26 / 60 + 17.5 / 3600, dec: 28 + 36 / 60 + 27 / 3600, pmRa: 0.023, pmDec: -0.175, magnitude: 1.65 },
  { name: 'פולוקס', ra: 7 + 45 / 60 + 18.9 / 3600, dec: 28 + 1 / 60 + 34 / 3600, pmRa: -0.626, pmDec: -0.046, magnitude: 1.14 },
  { name: 'רגולוס', ra: 10 + 8 / 60 + 22.3 / 3600, dec: 11 + 58 / 60 + 2 / 3600, pmRa: -0.249, pmDec: 0.006, magnitude: 1.35 },
  { name: 'ספיקה', ra: 13 + 25 / 60 + 11.6 / 3600, dec: -(11 + 9 / 60 + 41 / 3600), pmRa: -0.042, pmDec: -0.031, magnitude: 0.98 },
  { name: 'אנטארס', ra: 16 + 29 / 60 + 24.5 / 3600, dec: -(26 + 25 / 60 + 55 / 3600), pmRa: -0.010, pmDec: -0.023, magnitude: 1.06 },
]

/** Geocentric stellar direction in the true equator of date. Annual aberration is under 21 arcseconds. */
export function starEquatorial(star: BrightStar, time: AstroTime) {
  const years = time.tt / 365.25
  const dec = (star.dec + star.pmDec * years / 3600) * RAD
  const ra = star.ra * 15 * RAD + star.pmRa * years * RAD / (3600 * Math.cos(dec))
  const j2000 = new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time)
  return EquatorFromVector(RotateVector(Rotation_EQJ_EQD(time), j2000))
}
