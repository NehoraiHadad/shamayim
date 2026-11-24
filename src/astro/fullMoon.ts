import { moonEquatorial } from './moon'
import { sunLongitude } from './planets'

const RAD = Math.PI / 180
const OBLIQUITY = 23.4393 * RAD
const DAY_MS = 86_400_000
/** The moon gains this on the sun in a day, on the mean (deg). */
const GAIN = 12.1907

/** How far (deg, −180…180) the moon is past opposition, in ecliptic longitude: 0 is the full moon. */
export function pastFull(at: Date): number {
  const { rightAscension: ra, declination: dec } = moonEquatorial(at)
  const longitude = Math.atan2(Math.sin(ra) * Math.cos(OBLIQUITY) + Math.tan(dec) * Math.sin(OBLIQUITY), Math.cos(ra)) / RAD
  return (((longitude - sunLongitude(at)) % 360) + 360) % 360 - 180
}

/** The instant (ms) of the full moon nearest to a time. */
export function fullMoonNear(ms: number): number {
  let at = ms
  for (let k = 0; k < 6; k++) at -= pastFull(new Date(at)) / GAIN * DAY_MS
  return at
}
