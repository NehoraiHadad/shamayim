const HOUR = 3_600_000

export const COMET_FEED_MAX_AGE = 30 * HOUR
export const COMET_OBSERVATION_MAX_AGE = 48 * HOUR
export const COMET_CORROBORATION_MAX_AGE = 96 * HOUR
export const COMET_STEP = 3 * HOUR
export const COMET_MAX_MAGNITUDE = 4
export const COMET_MAX_TRACKS = 8
export const COMET_DESIGNATION = /^(?:[1-9]\d{0,3}[PI]|[CPI]\/\d{4} [A-Z]{1,2}\d{1,3})$/

export const COMET_SOURCES = {
  brightness: {
    credit: 'COBS Comet Observation Database and observers worldwide',
    url: 'https://cobs.si/',
    license: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    changes: 'Filtered and aggregated recent visual total-magnitude estimates',
  },
  positions: { credit: 'NASA/JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' },
}

/** UTC ms, geocentric apparent RA and declination of date (degrees), distance (km), solar elongation (degrees). */
export type CometSample = readonly [ms: number, ra: number, dec: number, distanceKm: number, elongation: number]

export interface CometEvidence {
  designation: string
  /** Fainter of the two recent visual total magnitudes, independently estimated by two observers. */
  magnitude: number
  observedAt: number
  corroboratedAt: number
  /** Latest recent brightness-compatible visual estimate made with the unaided eye, if present. */
  nakedEyeAt?: number
}

export interface CometTrack extends CometEvidence {
  samples: readonly CometSample[]
}

export interface CometFeed {
  version: 1
  /** UTC ms of the scheduled collection, or null before the first successful refresh. */
  collectedAt: number | null
  tracks: readonly CometTrack[]
  sources: typeof COMET_SOURCES
}

export const emptyCometFeed: CometFeed = { version: 1, collectedAt: null, tracks: [], sources: COMET_SOURCES }

export function evidenceUntil(evidence: CometEvidence): number {
  return Math.min(evidence.observedAt + COMET_OBSERVATION_MAX_AGE, evidence.corroboratedAt + COMET_CORROBORATION_MAX_AGE)
}

const between = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

export function isCometSample(value: unknown): value is CometSample {
  if (!Array.isArray(value) || value.length !== 5) return false
  const [ms, ra, dec, distanceKm, elongation] = value
  return between(ms, 1, 9e15) && between(ra, 0, 360) && between(dec, -90, 90)
    && between(distanceKm, 6379, 1e12) && between(elongation, 0, 180)
}

function isTrack(value: unknown, collectedAt: number): value is CometTrack {
  if (typeof value !== 'object' || value === null) return false
  const { designation, magnitude, observedAt, corroboratedAt, nakedEyeAt, samples } = value as Partial<CometTrack>
  return typeof designation === 'string' && COMET_DESIGNATION.test(designation)
    && between(magnitude, -15, COMET_MAX_MAGNITUDE) && between(observedAt, 1, collectedAt)
    && between(corroboratedAt, 1, observedAt) && (nakedEyeAt === undefined || between(nakedEyeAt, 1, observedAt))
    && Array.isArray(samples) && samples.length >= 2 && samples.length <= 20
    && samples.every((sample, i) => isCometSample(sample) && (i === 0 || sample[0] - samples[i - 1][0] === COMET_STEP))
}

/** Accept only a recent, versioned feed. Expire the independent observations separately from the snapshot. */
export function cometFeedOf(value: unknown, now: number): CometFeed | null {
  if (typeof value !== 'object' || value === null) return null
  const { version, collectedAt, tracks } = value as Partial<CometFeed>
  if (version !== 1 || !between(collectedAt, now - COMET_FEED_MAX_AGE, now)
    || !Array.isArray(tracks) || tracks.length > COMET_MAX_TRACKS || !tracks.every((track) => isTrack(track, collectedAt))) return null
  return {
    version, collectedAt, sources: COMET_SOURCES,
    tracks: tracks.filter((track) => evidenceUntil(track) >= now && track.samples.at(-1)![0] >= now),
  }
}
