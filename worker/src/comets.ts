import {
  COMET_CORROBORATION_MAX_AGE, COMET_DESIGNATION, COMET_FEED_MAX_AGE, COMET_MAX_MAGNITUDE, COMET_MAX_TRACKS,
  COMET_OBSERVATION_MAX_AGE, COMET_SOURCES, COMET_STEP, cometFeedOf, emptyCometFeed, isCometSample,
  type CometEvidence, type CometFeed, type CometSample, type CometTrack,
} from '../../src/events/cometFeed'

export const COMETS_CRON = '15 10 * * *'
export const COMETS_PATH = '/v1/comets'

const COBS = 'https://cobs.si/api/obs_list.api'
const HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const USER_AGENT = 'Shamayim/1.0 (+https://github.com/NehoraiHadad/shamayim/issues)'
const KV_KEY = 'comet-feed'
const DAY = 86_400_000
const MEMO_MS = 5 * 60_000
const MAX_PAGES = 5
const EPHEMERIS_DURATION = 2 * DAY
const MAGNITUDE_AGREEMENT = 1.5

interface RefreshDeps { fetch: typeof fetch; now: () => number; kv: Pick<KVNamespace, 'put'> }
interface VisualObservation { designation: string; observer: string; observedAt: number; magnitude: number; nakedEye: boolean }

function observationOf(value: unknown, now: number): VisualObservation | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as {
    type?: unknown; obs_date?: unknown; magnitude?: unknown; comet_visibility?: unknown; conditions?: unknown;
    comet?: { name?: unknown; component?: unknown }; observer?: { icq_name?: unknown }; instrument_type?: { key?: unknown };
  }
  const designation = row.comet?.name, observer = row.observer?.icq_name
  if (row.type !== 'V' || typeof designation !== 'string' || !COMET_DESIGNATION.test(designation)
    || row.comet?.component || typeof observer !== 'string' || !/^[a-z\d]{2,12}$/i.test(observer)
    || typeof row.obs_date !== 'string' || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(row.obs_date)
    || typeof row.magnitude !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(row.magnitude)
    || row.conditions === ':' || row.comet_visibility === '[' || row.comet_visibility === '>') return null
  const observedAt = Date.parse(row.obs_date.replace(' ', 'T') + 'Z')
  const magnitude = Number(row.magnitude)
  if (!Number.isFinite(observedAt) || observedAt > now || now - observedAt > COMET_CORROBORATION_MAX_AGE
    || magnitude < -15 || magnitude > 30) return null
  return { designation, observer: observer.toUpperCase(), observedAt, magnitude, nakedEye: row.instrument_type?.key === 'E' }
}

async function getJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Comet source ${new URL(url).hostname} returned HTTP ${response.status}`)
  return response.json()
}

const utcMinute = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')

/** COBS visual total magnitudes. Read all the recent pages before comparing the latest independent estimates. */
async function recentObservations(now: number, fetcher: typeof fetch): Promise<VisualObservation[]> {
  const query = new URLSearchParams({ format: 'json', from_date: utcMinute(now - COMET_CORROBORATION_MAX_AGE),
    to_date: utcMinute(now), obs_type: 'V', exclude_faint: 'true', exclude_not_accurate: 'true', exclude_issue: 'true' })
  const observations: VisualObservation[] = []
  for (let page = 1, pages = 1; page <= pages; page++) {
    query.set('page', String(page))
    const payload = await getJson(`${COBS}?${query}`, fetcher) as {
      signature?: { version?: string; source?: string }; info?: { page: number; pages: number }; objects?: unknown[];
    } | null
    const count = payload?.info?.pages
    if (payload?.signature?.version !== '1.5' || payload.signature.source !== 'COBS Query API'
      || payload.info?.page !== page || typeof count !== 'number' || !Number.isInteger(count) || count < page || count > MAX_PAGES
      || !Array.isArray(payload.objects) || payload.objects.length > 2500) throw new Error('Unexpected COBS observation response')
    pages = count
    for (const row of payload.objects) {
      const observation = observationOf(row, now)
      if (observation) observations.push(observation)
    }
  }
  return observations
}

function corroborated(observations: VisualObservation[], now: number): CometEvidence[] {
  const byComet = new Map<string, VisualObservation[]>()
  for (const row of observations) {
    const group = byComet.get(row.designation)
    if (group) group.push(row)
    else byComet.set(row.designation, [row])
  }
  const bright: CometEvidence[] = []
  for (const [designation, group] of byComet) {
    group.sort((a, b) => b.observedAt - a.observedAt || b.magnitude - a.magnitude)
    const [latest] = group
    const second = group.find((row) => row.observer !== latest.observer)
    if (!second || now - latest.observedAt > COMET_OBSERVATION_MAX_AGE || Math.abs(second.magnitude - latest.magnitude) > MAGNITUDE_AGREEMENT) continue
    const magnitude = Math.max(latest.magnitude, second.magnitude)
    if (magnitude > COMET_MAX_MAGNITUDE) continue
    const nakedEyeAt = group.find((row) => row.nakedEye && row.magnitude <= COMET_MAX_MAGNITUDE
      && now - row.observedAt <= COMET_OBSERVATION_MAX_AGE && Math.abs(row.magnitude - magnitude) <= MAGNITUDE_AGREEMENT)?.observedAt
    bright.push({ designation, magnitude, observedAt: latest.observedAt, corroboratedAt: second.observedAt, nakedEyeAt })
  }
  return bright.sort((a, b) => a.magnitude - b.magnitude || b.observedAt - a.observedAt).slice(0, COMET_MAX_TRACKS)
}

/** Columns 2, 20 and 23 in the Horizons observer table. No modeled magnitude is requested or retained. */
async function positions(designation: string, from: number, fetcher: typeof fetch): Promise<CometSample[] | null> {
  const query = new URLSearchParams({ format: 'json', COMMAND: `'DES=${designation};CAP;NOFRAG'`,
    OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER', CENTER: '500@399',
    START_TIME: utcMinute(from), STOP_TIME: utcMinute(from + EPHEMERIS_DURATION), STEP_SIZE: '3 h',
    QUANTITIES: '2,20,23', CAL_FORMAT: 'JD', TIME_TYPE: 'UT', ANG_FORMAT: 'DEG', RANGE_UNITS: 'KM',
    SUPPRESS_RANGE_RATE: 'YES', APPARENT: 'AIRLESS', EXTRA_PREC: 'YES', CSV_FORMAT: 'YES' })
  const payload = await getJson(`${HORIZONS}?${query}`, fetcher) as {
    signature?: { version?: string; source?: string }; result?: string; error?: unknown;
  } | null
  if (!payload || payload.signature?.source !== 'NASA/JPL Horizons API'
    || !['1.2', '1.3'].includes(payload.signature.version ?? '')) throw new Error('Unexpected Horizons response')
  const result = payload.result
  if (payload.error || typeof result !== 'string' || !result.includes('Center-site name: GEOCENTRIC')
    || !/Date_+JDUT, *, *, R\.A\.__\(a-app\), DEC_+\(a-app\), +delta, +S-O-T,/.test(result)) return null
  const body = /^Target body name:\s*(.*?)\s*\{source: JPL#/m.exec(result)?.[1]
  // Horizons identifies interstellar objects by their original provisional designation in this header.
  if (!body || !(body.includes(`(${designation})`) || body.startsWith(`${designation}/`) || /^\d+I$/.test(designation))) return null
  const table = /\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/.exec(result)?.[1]
  if (!table) return null
  const rows = table.split('\n')
  if (rows.length !== 1 + EPHEMERIS_DURATION / COMET_STEP) return null
  const samples: CometSample[] = []
  for (const [i, row] of rows.entries()) {
    const fields = row.split(',').map((field) => field.trim())
    const jd = Number(fields[0]), ms = Math.round((jd - 2_440_587.5) * DAY)
    const sample = [ms, ...fields.slice(3, 7).map(Number)]
    if (fields.length !== 9 || fields.slice(3, 7).some((field) => !field)
      || !isCometSample(sample) || ms !== from + i * COMET_STEP) return null
    samples.push(sample)
  }
  return samples
}

/** Called daily. JPL is contacted serially, only for comets already corroborated by visual observations. */
export async function refreshComets({ kv, fetch: fetcher, now }: RefreshDeps): Promise<number> {
  const collectedAt = now()
  const observations = await recentObservations(collectedAt, fetcher)
  const from = Math.floor(collectedAt / COMET_STEP) * COMET_STEP
  const tracks: CometTrack[] = []
  for (const evidence of corroborated(observations, collectedAt)) {
    const samples = await positions(evidence.designation, from, fetcher)
    if (samples) tracks.push({ ...evidence, samples })
  }
  const feed: CometFeed = { version: 1, collectedAt, tracks, sources: COMET_SOURCES }
  await kv.put(KV_KEY, JSON.stringify(feed), { expirationTtl: COMET_FEED_MAX_AGE / 1000 })
  return tracks.length
}

let memo: { kv: Pick<KVNamespace, 'get'>; readAt: number; value: Promise<unknown> } | null = null

export async function cometsResponse(kv: Pick<KVNamespace, 'get'> | undefined, now: number): Promise<Response> {
  let feed = emptyCometFeed
  if (kv) {
    if (memo?.kv !== kv || now - memo.readAt >= MEMO_MS || now < memo.readAt) {
      memo = { kv, readAt: now, value: kv.get(KV_KEY, 'json').catch(() => null) }
    }
    feed = cometFeedOf(await memo.value, now) ?? emptyCometFeed
  }
  return new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })
}
