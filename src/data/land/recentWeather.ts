import type { Place } from '../../config/place'
import { FORECAST_MODELS } from '../openMeteo/request'
import { fetchedAtOf, weatherUrl } from '../weatherApi'
import type { RecentLandWeather } from './types'

/**
 * Recent liquid precipitation (past 14–60 completed local days), snowfall and volumetric soil
 * moisture via the dedicated narrow Worker route `/v1/land-weather` (`worker/src/routes.ts`).
 * Gated behind `ASK_LAND_WEATHER = false` until deployed (see `docs/design/CANVAS-SCENE-PLAN.md`).
 *
 * Open-Meteo daily definitions (`https://open-meteo.com/en/docs`): `rain_sum` + `showers_sum` =
 * liquid rain (mm); `snowfall_sum` = snowfall (cm, 0.7 cm per 1 mm SWE); `precipitation_sum` =
 * liquid + SWE. Today's partial/forecast entry (`forecast_days=1`) is excluded from past sums.
 */
export const ASK_LAND_WEATHER = false
export const LAND_PAST_DAYS = 60
export const SOIL_MOISTURE_FIELDS = [
  'soil_moisture_0_to_1cm', 'soil_moisture_1_to_3cm',
  'soil_moisture_3_to_9cm', 'soil_moisture_9_to_27cm',
] as const
const DAILY_FIELDS = ['rain_sum', 'showers_sum', 'snowfall_sum', 'precipitation_sum'] as const
const SNOW_CM_PER_MM_SWE = 0.7
const MIN_PRECIP_COVERAGE = 0.5
const MODEL_SUFFIXES = ['_icon_seamless', '_ecmwf_ifs025'] as const

export function recentWeatherUrl(place: Place, base?: string): string {
  const p = new URLSearchParams({
    latitude: String(place.lat), longitude: String(place.lon), timezone: place.timezone,
    models: FORECAST_MODELS, forecast_days: '1', past_days: String(LAND_PAST_DAYS),
    current: SOIL_MOISTURE_FIELDS.join(','), daily: DAILY_FIELDS.join(','),
  })
  return weatherUrl('land-weather', p, base)
}

const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const arr = (obj: Record<string, unknown>, key: string) => (Array.isArray(obj[key]) ? obj[key] as unknown[] : null)
const currentSoil = (cur: Record<string, unknown>, field: string): number | null =>
  finite(cur[field]) ?? finite(cur[`${field}_icon_seamless`]) ?? finite(cur[`${field}_ecmwf_ifs025`])

function modelLiquidAt(daily: Record<string, unknown>, i: number, sfx: string): number | null {
  const rain = finite(arr(daily, `rain_sum${sfx}`)?.[i])
  const showers = finite(arr(daily, `showers_sum${sfx}`)?.[i])
  if (rain !== null || showers !== null) return Math.max(0, (rain ?? 0) + (showers ?? 0))
  const precip = finite(arr(daily, `precipitation_sum${sfx}`)?.[i])
  if (precip === null) return null
  const snow = finite(arr(daily, `snowfall_sum${sfx}`)?.[i])
  return snow !== null ? Math.max(0, precip - snow / SNOW_CM_PER_MM_SWE) : Math.max(0, precip)
}

function blendAt(fn: (sfx: string) => number | null): number | null {
  const a = fn(MODEL_SUFFIXES[0]), b = fn(MODEL_SUFFIXES[1])
  return a !== null && b !== null ? (a + b) / 2 : (a ?? b ?? fn(''))
}

function weightedMean(pairs: [number | null, number][]): number | null {
  let sum = 0, wSum = 0
  for (const [val, w] of pairs) if (val !== null) { sum += val * w; wSum += w }
  return wSum > 0 ? sum / wSum : null
}

function windowStats(series: (number | null)[], days: number): { sum: number | null; coverage: number } {
  const slice = series.slice(Math.max(0, series.length - days))
  let sum = 0, count = 0
  for (const v of slice) if (v !== null) { sum += v; count++ }
  return { sum: count > 0 ? Math.round(sum * 10) / 10 : null, coverage: days > 0 ? count / days : 0 }
}

/** Parses an Open-Meteo `/v1/land-weather` response using completed local dates only; returns null if empty. */
export function mapRecentWeather(body: unknown, fetchedAt: number): RecentLandWeather | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as { current?: Record<string, unknown>; daily?: Record<string, unknown>; utc_offset_seconds?: number }
  const daily = raw.daily, times = Array.isArray(daily?.time) ? (daily.time as unknown[]) : null
  const cur = raw.current ?? {}
  const curDate = typeof cur.time === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cur.time) ? cur.time.slice(0, 10) : null
  const offsetMs = typeof raw.utc_offset_seconds === 'number' && Number.isFinite(raw.utc_offset_seconds)
    ? raw.utc_offset_seconds * 1000 : 0
  const todayLocal = curDate ?? new Date(fetchedAt + offsetMs).toISOString().slice(0, 10)

  const liquid: (number | null)[] = [], snow: (number | null)[] = []
  if (daily && times) {
    for (let i = 0; i < times.length; i++) {
      const entry = times[i]
      const t = typeof entry === 'string' ? entry.slice(0, 10) : ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t >= todayLocal) continue
      liquid.push(blendAt((sfx) => modelLiquidAt(daily, i, sfx)))
      snow.push(blendAt((sfx) => finite(arr(daily, `snowfall_sum${sfx}`)?.[i])))
    }
  }

  const w14 = windowStats(liquid, 14), w30 = windowStats(liquid, 30), w60 = windowStats(liquid, 60)
  const snow14 = windowStats(snow, 14)
  let daysSinceRain: number | null = null
  for (let k = liquid.length - 1; k >= 0; k--) {
    const v = liquid[k]
    if (v !== null && v >= 1) { daysSinceRain = liquid.length - k; break }
  }

  const soilMoistureTop = weightedMean([[currentSoil(cur, 'soil_moisture_0_to_1cm'), 1], [currentSoil(cur, 'soil_moisture_1_to_3cm'), 2]])
  const soilMoistureRoot = weightedMean([[currentSoil(cur, 'soil_moisture_3_to_9cm'), 6], [currentSoil(cur, 'soil_moisture_9_to_27cm'), 18]])
  if (w60.coverage === 0 && soilMoistureTop === null && soilMoistureRoot === null) return null

  return {
    date: todayLocal, source: `open-meteo:${todayLocal}`, fetchedAt,
    precip14dMm: w14.sum, precip30dMm: w30.sum, precip60dMm: w60.sum,
    precipCoverage14d: w14.coverage, precipCoverage30d: w30.coverage, precipCoverage60d: w60.coverage,
    snowfall14dCm: snow14.sum, daysSinceRain, soilMoistureTop, soilMoistureRoot,
  }
}

/**
 * Surface dryness index `[0, 1]` (0 = wet, 1 = parched); returns null if neither soil moisture nor
 * adequate rain coverage exists. Soil bounds: FAO-56 Table 19 (Allen et al. 1998) mineral soil
 * wilting point (~0.08 m³/m³) and field capacity (~0.34 m³/m³); rain scales (35/120 mm) are heuristic.
 */
export function drynessFromWeather(w: RecentLandWeather): number | null {
  let rainDry: number | null = null
  if (w.precip14dMm !== null && w.precipCoverage14d >= MIN_PRECIP_COVERAGE) {
    const p14 = clamp01(w.precip14dMm / 35)
    const wet = w.precip60dMm !== null && w.precipCoverage60d >= MIN_PRECIP_COVERAGE
      ? clamp01(0.6 * p14 + 0.4 * clamp01(w.precip60dMm / 120)) : p14
    rainDry = 1 - wet
  }
  const sm = weightedMean([[w.soilMoistureTop, 0.35], [w.soilMoistureRoot, 0.65]])
  const soilDry = sm !== null ? clamp01((0.34 - sm) / (0.34 - 0.08)) : null
  if (soilDry !== null && rainDry !== null) return clamp01(0.65 * soilDry + 0.35 * rainDry)
  return soilDry ?? rainDry
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
