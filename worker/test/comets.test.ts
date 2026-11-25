import { describe, expect, it, vi } from 'vitest'
import { COMET_FEED_MAX_AGE, COMET_SOURCES, COMET_STEP } from '../../src/events/cometFeed'
import { cometsResponse, refreshComets } from '../src/comets'

const HOUR = 3_600_000
const NOW = Date.parse('2024-10-16T10:15:00Z')
const START = Date.parse('2024-10-16T09:00:00Z')

const observation = (observer: string, hours: number, magnitude: string, designation = 'C/2023 A3') => ({
  type: 'V', obs_date: new Date(NOW - hours * HOUR).toISOString().slice(0, 19).replace('T', ' '),
  comet: { name: designation, component: null }, observer: { icq_name: observer }, magnitude,
})

function cobs(objects: unknown[], page = 1, pages = 1) {
  return Response.json({ signature: { source: 'COBS Query API', version: '1.5' }, info: { page, pages }, objects })
}

function horizons(designation: string, badRow = false) {
  const table = Array.from({ length: 17 }, (_, i) =>
    `${(START + i * COMET_STEP) / 86_400_000 + 2_440_587.5}, , , 230.1, ${badRow && i === 3 ? '' : '1.0'}, 7.5E+07, 32.0,/T,`).join('\n')
  const result = `Target body name: ATLAS (${designation})   {source: JPL#113}
Center-site name: GEOCENTRIC
Date_________JDUT, , , R.A.__(a-app), DEC___(a-app),             delta,     S-O-T,/r,
$$SOE
${table}
$$EOE`
  return Response.json({ signature: { source: 'NASA/JPL Horizons API', version: '1.2' }, result })
}

function memoryKv() {
  let stored: string | null = null
  const put = vi.fn(async (_key: string, body: string) => { stored = body })
  const get = vi.fn(async () => stored && JSON.parse(stored))
  return { put, get }
}

describe('the scheduled comet snapshot', () => {
  it('corroborates and publishes real visual estimates with positions for that designation only', async () => {
    const kv = memoryKv()
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(cobs([
      { ...observation('One01', 1, '2.6'), instrument_type: { key: 'E' } }, observation('One01', 2, '2.5'),
      observation('Other', 2, '7.0', 'C/2024 T5'),
    ], 1, 2)).mockResolvedValueOnce(cobs([observation('Two02', 4, '3.0')], 2, 2)).mockResolvedValueOnce(horizons('C/2023 A3'))

    expect(await refreshComets({ kv, fetch, now: () => NOW })).toBe(1)
    const cobsUrl = new URL(String(fetch.mock.calls[0][0]))
    expect(Object.fromEntries(cobsUrl.searchParams)).toMatchObject({ obs_type: 'V', exclude_faint: 'true', exclude_not_accurate: 'true', exclude_issue: 'true' })
    expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get('page')).toBe('2')
    const jpl = new URL(String(fetch.mock.calls[2][0]))
    expect(jpl.searchParams.get('COMMAND')).toBe("'DES=C/2023 A3;CAP;NOFRAG'")
    expect(jpl.searchParams.get('QUANTITIES')).toBe('2,20,23')
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get('User-Agent')).toContain('github.com/NehoraiHadad/shamayim/issues')

    const resp = await cometsResponse(kv, NOW)
    expect(await resp.json()).toMatchObject({ version: 1, collectedAt: NOW, sources: COMET_SOURCES, tracks: [{
      designation: 'C/2023 A3', magnitude: 3, observedAt: NOW - HOUR, corroboratedAt: NOW - 4 * HOUR, nakedEyeAt: NOW - HOUR,
      samples: expect.arrayContaining([[START, 230.1, 1, 75_000_000, 32]]),
    }] })
    expect(await (await cometsResponse(kv, NOW + COMET_FEED_MAX_AGE + 1)).json()).toMatchObject({ collectedAt: null, tracks: [] })
  })

  it('does not request ephemerides for stale, uncorroborated, flagged, conflicting, or forecast-only brightness', async () => {
    const kv = memoryKv()
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(cobs([
      observation('IdA', 50, '1.1'), observation('IdB', 51, '1.2'),
      observation('IdB', 1, '1.0', 'C/2024 T5'), observation('idb', 2, '1.3', 'C/2024 T5'),
      { ...observation('IdC', 1, '1.3', 'C/2024 T5'), type: 'C' },
      { ...observation('IdC', 3, '1.3', 'C/2024 T5'), conditions: ':' },
      { ...observation('IdC', 4, '1.3', 'C/2024 T5'), comet_visibility: '[' },
      { ...observation('IdC', 5, '1.3', 'C/2024 T5'), magnitude: '', predicted_mag: '1.3' },
      observation('IdA', 1, '2.0', '12P'), observation('IdB', 2, '3.9', '12P'),
    ]))
    expect(await refreshComets({ kv, fetch, now: () => NOW })).toBe(0)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await (await cometsResponse(kv, NOW)).json()).toMatchObject({ collectedAt: NOW, tracks: [] })
  })

  it('omits an incomplete Horizons table and keeps the last successful collection during a source error', async () => {
    const kv = memoryKv()
    const bright = [observation('IdA', 2, '2.0'), observation('IdB', 3, '2.2')]
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(cobs(bright)).mockResolvedValueOnce(horizons('C/2023 A3', true))
    expect(await refreshComets({ kv, fetch, now: () => NOW })).toBe(0)
    fetch.mockResolvedValueOnce(new Response(null, { status: 429 }))
    await expect(refreshComets({ kv, fetch, now: () => NOW + HOUR })).rejects.toThrow('HTTP 429')
    expect(kv.put).toHaveBeenCalledTimes(1)
    expect(await (await cometsResponse(kv, NOW + HOUR)).json()).toMatchObject({ collectedAt: NOW, tracks: [] })
  })
})
