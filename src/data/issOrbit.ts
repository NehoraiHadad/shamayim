import { parseIssOrbit, usableIssOrbit, type IssOrbit } from '../astro/iss'

// Public, CORS-enabled TLE for NORAD 25544. See https://wheretheiss.at/w/developer.
const ISS_TLE_URL = 'https://api.wheretheiss.at/v1/satellites/25544/tles'
const REFRESH_MS = 6 * 3_600_000
const RETRY_MS = 15 * 60_000

let cached: IssOrbit | null = null
let nextCheck = 0
let pending: Promise<IssOrbit | null> | null = null

async function fetchOrbit(): Promise<IssOrbit | null> {
  try {
    const response = await fetch(ISS_TLE_URL, { signal: AbortSignal.timeout(5000), credentials: 'omit', referrerPolicy: 'no-referrer' })
    return response.ok ? parseIssOrbit(await response.json()) : null
  } catch {
    return null
  }
}

/** A shared snapshot for this tab. A failed refresh may reuse still-valid orbital data. */
export async function loadIssOrbit(nowMs = Date.now()): Promise<IssOrbit | null> {
  if (!pending && Date.now() >= nextCheck) {
    pending = fetchOrbit().then((orbit) => {
      const now = Date.now()
      const valid = orbit && usableIssOrbit(orbit, now) && (!cached || orbit.epoch >= cached.epoch)
      if (valid) cached = orbit
      nextCheck = now + (valid ? REFRESH_MS : RETRY_MS)
      return cached
    }).finally(() => { pending = null })
  }
  const orbit = pending ? await pending : cached
  return orbit && usableIssOrbit(orbit, nowMs) ? orbit : null
}
