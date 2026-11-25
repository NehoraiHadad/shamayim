import { degreesToRadians, eciToEcf, ecfToLookAngles, gstime, propagate, radiansToDegrees,
  SatRecError, twoline2satrec, type EciVec3, type Kilometer, type SatRec } from 'satellite.js'
import { sunEquatorial } from './sun'

const DAY = 86_400_000
const UNIX_EPOCH_JD = 2_440_587.5
const EARTH_RADIUS_KM = 6378.137
const SUN_RADIUS_KM = 695_700

export interface IssOrbit { epoch: number; record: SatRec }

interface IssObserver { lat: number; lon: number; elevation?: number }

function validLine(line: unknown, prefix: string): line is string {
  if (typeof line !== 'string' || line.length !== 69 || !line.startsWith(prefix) || !/^[-+ .A-Z0-9]+[0-9]$/.test(line)) return false
  let checksum = 0
  for (const char of line.slice(0, -1)) {
    if (char === '-') checksum += 1
    else if (char >= '0' && char <= '9') checksum += Number(char)
  }
  return checksum % 10 === Number(line[68])
}

/** NORAD 25544 from a two-line element response. Its own epoch is the age that matters for propagation. */
export function parseIssOrbit(payload: unknown): IssOrbit | null {
  if (!payload || typeof payload !== 'object' || !('line1' in payload) || !('line2' in payload)) return null
  const { line1, line2 } = payload
  if (!validLine(line1, '1 25544U ') || !validLine(line2, '2 25544 ') || !/^\d{5}\.\d{8}$/.test(line1.slice(18, 32))) return null
  const record = twoline2satrec(line1, line2)
  const { epochyr, epochdays, jdsatepoch, bstar, inclo, nodeo, ecco, argpo, mo, no } = record
  const year = epochyr < 57 ? 2000 + epochyr : 1900 + epochyr
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY
  if (record.error !== SatRecError.None || ![jdsatepoch, bstar, inclo, nodeo, ecco, argpo, mo, no].every(Number.isFinite)
    || epochdays < 1 || epochdays >= days + 1 || no <= 0 || ecco < 0 || ecco >= 1) return null
  return { record, epoch: (jdsatepoch - UNIX_EPOCH_JD) * DAY }
}

/** Keep predictions close to the fit. Elements can be fit to a nearby epoch ahead of their release. */
export function usableIssOrbit(orbit: IssOrbit, ms: number): boolean {
  return ms >= orbit.epoch - DAY && ms <= orbit.epoch + 3 * DAY
}

function fullyLit({ x, y, z }: EciVec3<Kilometer>, at: Date): boolean {
  const { rightAscension, declination, distanceKm } = sunEquatorial(at)
  const equatorial = distanceKm * Math.cos(declination)
  const sx = equatorial * Math.cos(rightAscension) - x
  const sy = equatorial * Math.sin(rightAscension) - y
  const sz = distanceKm * Math.sin(declination) - z
  const earthDistance = Math.hypot(x, y, z), sunDistance = Math.hypot(sx, sy, sz)
  const separationCos = -(x * sx + y * sy + z * sz) / (earthDistance * sunDistance)
  // Both disks have to clear one another as seen from the station. Use Earth's equatorial radius for its limb.
  const sumOfRadii = Math.asin(EARTH_RADIUS_KM / earthDistance) + Math.asin(SUN_RADIUS_KM / sunDistance)
  return separationCos < Math.cos(sumOfRadii)
}

/** The observer's geometric look angles and whether the whole solar disk shines on the station. */
export function issPosition(orbit: IssOrbit, observer: IssObserver, ms: number) {
  if (!usableIssOrbit(orbit, ms)) return null
  const at = new Date(ms)
  const state = propagate(orbit.record, at)
  if (!state) return null
  const sidereal = gstime(at)
  const target = eciToEcf(state.position, sidereal)
  const { azimuth, elevation } = ecfToLookAngles({ longitude: degreesToRadians(observer.lon),
    latitude: degreesToRadians(observer.lat), height: (observer.elevation ?? 0) / 1000 }, target)
  if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) return null
  return { azimuth: radiansToDegrees(azimuth) % 360, altitude: radiansToDegrees(elevation), sunlit: fullyLit(state.position, at) }
}
