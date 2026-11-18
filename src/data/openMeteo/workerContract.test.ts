import { describe, expect, it } from 'vitest'
import { ROUTES } from '../../../worker/src/routes'
import { canonicalQuery } from '../../../worker/src/validate'
import { SHADMOT_MEHOLA } from '../../config/place'
import { airUrl, forecastUrl } from './request'

/** The Worker refuses any parameter it does not list; the app's real requests must pass it, or production breaks. */
describe('app requests pass the Worker allowlist', () => {
  const place = { ...SHADMOT_MEHOLA, lat: 31.4858455, lon: 35.1651529 }
  it.each([['/v1/forecast', forecastUrl(place)], ['/v1/air-quality', airUrl(place)]] as const)('%s', (path, url) => {
    const result = canonicalQuery(ROUTES[path], new URL(url).searchParams)
    expect(result).toMatchObject({ ok: true })
  })
})
