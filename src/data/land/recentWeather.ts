import type { Place } from '../../config/place'
import { FORECAST_MODELS } from '../openMeteo/request'
import { fetchedAtOf, weatherUrl } from '../weatherApi'
import type { RecentLandWeather } from './types'

/**
 * Recent precipitation (past 14–60 days) and volumetric soil moisture via Open-Meteo `/v1/forecast`
 * through the Worker allowlist (`worker/src/routes.ts`).
 *
 * Gated behind `ASK_LAND_WEATHER` (off by default): the deployed Worker must first allow
 * `past_days` up to 60 and `current=soil_moisture_*` (see "Deploys pending for the owner" in
 * `docs/design/CANVAS-SCENE-PLAN.md`) before flipping this flag to `true`.
 */
export const ASK_LAND_WEATHER = false
export const LAND_PAST_DAYS = 60
export const SOIL_MOISTURE_FIELDS = [
  'soil_moisture_0_to_1cm',
  'soil_moisture_1_to_3cm',
  'soil_moisture_3_to_9cm',
  'soil_moisture_9_to_27cm',
] as const

/** Builds the lightweight (~2.1 KB) `/v1/forecast` URL for past precipitation and current soil moisture. */
export function recentWeatherUrl(place: Place, base?: string): string {
  const p = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    timezone: place.timezone,
    models: FORECAST_MODELS,
    forecast_days: '1',
    past_days: String(LAND_PAST_DAYS),
    current: SOIL_MOISTURE_FIELDS.join(','),
    daily: 'precipitation_sum',
  })
  return weatherUrl('forecast', p, base)
}

const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function currentSoil(current: Record<string, unknown>, field: string): number | null {
  return finite(current[field])
    ?? finite(current[`${field}_icon_seamless`])
    ?? finite(current[`${field}_ecmwf_ifs025`])
}

function dailyPrecipSeries(daily: Record<string, unknown>, length: number): number[] {
  const icon = Array.isArray(daily.precipitation_sum_icon_seamless) ? daily.precipitation_sum_icon_seamless : null
  const ecmwf = Array.isArray(daily.precipitation_sum_ecmwf_ifs025) ? daily.precipitation_sum_ecmwf_ifs025 : null
  const plain = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : null
  const out = new Array<number>(length).fill(0)
  for (let i = 0; i < length; i++) {
    const a = finite(icon?.[i]), b = finite(ecmwf?.[i]), c = finite(plain?.[i])
    if (a !== null && b !== null) out[i] = (a + b) / 2
    else out[i] = a ?? b ?? c ?? 0
  }
  return out
}

function weightedMean(pairs: [number | null, number][]): number | null {
  let sum = 0, wSum = 0
  for (const [val, w] of pairs) {
    if (val !== null) { sum += val * w; wSum += w }
  }
  return wSum > 0 ? sum / wSum : null
}

/** Parses an Open-Meteo recent-weather response into a compact `RecentLandWeather` summary. */
export function mapRecentWeather(body: unknown, fetchedAt: number): RecentLandWeather | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as { current?: Record<string, unknown>; daily?: Record<string, unknown> }
  const daily = raw.daily
  const times = Array.isArray(daily?.time) ? daily.time : null
  if (!daily || !times || times.length === 0) return null
  const precip = dailyPrecipSeries(daily, times.length)
  const date = typeof raw.current?.time === 'string'
    ? raw.current.time.slice(0, 10)
    : String(times[times.length - 1]).slice(0, 10)

  const sumLast = (days: number) => {
    const start = Math.max(0, precip.length - days)
    let total = 0
    for (let i = start; i < precip.length; i++) total += Math.max(0, precip[i])
    return Math.round(total * 10) / 10
  }

  let daysSinceRain: number | null = null
  for (let i = precip.length - 1; i >= 0; i--) {
    if (precip[i] >= 1) { daysSinceRain = precip.length - 1 - i; break }
  }

  const cur = raw.current ?? {}
  const m01 = currentSoil(cur, 'soil_moisture_0_to_1cm')
  const m13 = currentSoil(cur, 'soil_moisture_1_to_3cm')
  const m39 = currentSoil(cur, 'soil_moisture_3_to_9cm')
  const m927 = currentSoil(cur, 'soil_moisture_9_to_27cm')

  return {
    date,
    source: `open-meteo:${date}`,
    fetchedAt,
    precip14dMm: sumLast(14),
    precip30dMm: sumLast(30),
    precip60dMm: sumLast(60),
    daysSinceRain,
    // Depth-weighted layer means: 0–1 cm (1 cm) + 1–3 cm (2 cm); 3–9 cm (6 cm) + 9–27 cm (18 cm).
    soilMoistureTop: weightedMean([[m01, 1], [m13, 2]]),
    soilMoistureRoot: weightedMean([[m39, 6], [m927, 18]]),
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Surface dryness index in `[0, 1]` (0 = wet/moist, 1 = parched) from recent rain and soil moisture.
 *
 * Provenance: mineral-soil permanent wilting point (~0.08 m³/m³) and field capacity (~0.34 m³/m³)
 * from FAO-56 Table 19 (Allen et al. 1998) / Saxton & Rawls (2006); rainfall recharge scales
 * (35 mm / 14 d for topsoil annuals, 120 mm / 60 d for root-zone storage).
 */
export function drynessFromWeather(w: RecentLandWeather): number {
  const rainWet = clamp01(0.6 * clamp01(w.precip14dMm / 35) + 0.4 * clamp01(w.precip60dMm / 120))
  const rainDry = 1 - rainWet
  const sm = weightedMean([[w.soilMoistureTop, 0.35], [w.soilMoistureRoot, 0.65]])
  if (sm === null) return rainDry
  const soilDry = clamp01((0.34 - sm) / (0.34 - 0.08))
  return clamp01(0.65 * soilDry + 0.35 * rainDry)
}

export async function fetchRecentWeather(
  place: Place,
  opts: { enabled?: boolean; signal?: AbortSignal; fetchImpl?: typeof fetch; base?: string; now?: number } = {},
): Promise<RecentLandWeather | null> {
  if (!(opts.enabled ?? ASK_LAND_WEATHER)) return null
  const fetchImpl = opts.fetchImpl ?? fetch
  const timeout = AbortSignal.timeout(8000)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
  const res = await fetchImpl(recentWeatherUrl(place, opts.base), { signal })
  if (!res.ok) return null
  return mapRecentWeather(await res.json(), fetchedAtOf(res.headers, opts.now))
}
