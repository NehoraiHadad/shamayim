import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../config/place'
import { airUrl, forecastUrl } from './openMeteo/request'
import { fetchedAtOf, normalsUrl, weatherUrl } from './weatherApi'

const q = new URLSearchParams({ latitude: '1', longitude: '2' })

afterEach(() => vi.unstubAllEnvs())

describe('weatherUrl', () => {
  it('makes normals available only through the Worker', () => {
    expect(normalsUrl(q, '')).toBeNull()
    expect(normalsUrl(q, '  ')).toBeNull()
    expect(normalsUrl(q, 'https://w.test/')).toBe('https://w.test/v1/normals?latitude=1&longitude=2')
  })

  it('calls Open-Meteo directly when no base is set', () => {
    expect(weatherUrl('forecast', q, '')).toBe('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2')
    expect(weatherUrl('air-quality', q, undefined)).toBe('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=1&longitude=2')
    expect(weatherUrl('elevation', q, '  ')).toBe('https://api.open-meteo.com/v1/elevation?latitude=1&longitude=2')
  })

  it('calls the Worker when a base is set, with or without a trailing slash', () => {
    expect(weatherUrl('forecast', q, 'https://w.test')).toBe('https://w.test/v1/forecast?latitude=1&longitude=2')
    expect(weatherUrl('elevation', q, 'https://w.test/')).toBe('https://w.test/v1/elevation?latitude=1&longitude=2')
  })

  it('follows VITE_WEATHER_API_BASE in the request builders', () => {
    const params = new URL(forecastUrl(SHADMOT_MEHOLA)).searchParams
    expect(params.get('minutely_15')).toBe('precipitation')
    expect(params.get('forecast_minutely_15')).toBe('12')
    expect(forecastUrl(SHADMOT_MEHOLA)).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=/)
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test')
    expect(forecastUrl(SHADMOT_MEHOLA)).toMatch(/^https:\/\/w\.test\/v1\/forecast\?latitude=/)
    expect(airUrl(SHADMOT_MEHOLA)).toMatch(/^https:\/\/w\.test\/v1\/air-quality\?latitude=/)
  })
})

describe('fetchedAtOf', () => {
  const now = 1_800_000_000_000
  const headers = (value?: string) => new Headers(value === undefined ? {} : { 'X-Fetched-At': value })

  it('uses the Worker time, so a shared copy keeps its real age', () => {
    expect(fetchedAtOf(headers(String(now - 14 * 60_000)), now)).toBe(now - 14 * 60_000)
  })

  it('falls back to now when the header is missing or invalid', () => {
    expect(fetchedAtOf(headers(), now)).toBe(now)
    expect(fetchedAtOf(headers('soon'), now)).toBe(now)
    expect(fetchedAtOf(headers('0'), now)).toBe(now)
  })

  it('never returns a time after now', () => {
    expect(fetchedAtOf(headers(String(now + 60_000)), now)).toBe(now)
  })
})
