import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { StatusLine } from './StatusLine'
import { deriveProblem, LIVE_INITIAL, liveReducer } from './statusLive'

const FETCHED_AT = Date.UTC(2026, 10, 17, 10, 58)

describe('deriveProblem', () => {
  it('treats browser offline as offline even with a fresh cache and no fetch failure', () => {
    expect(deriveProblem(false, null, 'fresh')).toBe('offline')
    expect(deriveProblem(true, null, 'fresh')).toBeNull()
  })

  it('keeps service and stale/network failures mapped when online', () => {
    expect(deriveProblem(true, 'busy', 'fresh')).toBe('service')
    expect(deriveProblem(true, 'network', 'fresh')).toBe('offline')
    expect(deriveProblem(true, null, 'stale')).toBe('offline')
  })
})

describe('liveReducer', () => {
  it('starts empty and queues a problem notice behind "מעדכן…" without swallowing it', () => {
    expect(LIVE_INITIAL.live).toBe('')
    const queued = liveReducer(LIVE_INITIAL, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: 'מעדכן…' })
    expect(queued.live).toBe('מעדכן…')
    expect(queued.notice).toBe('אין חיבור. מוצגת התחזית מ־\u206612:58\u2069.')
    expect(queued.delivered).toBe(false)

    const delivered = liveReducer(queued, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: '' })
    expect(delivered.live).toBe('אין חיבור. מוצגת התחזית מ־\u206612:58\u2069.')
    expect(delivered.delivered).toBe(true)

    const cleared = liveReducer(delivered, { type: 'clear' })
    expect(cleared.live).toBe('')
    expect(cleared.notice).toBe('')
    expect(cleared.delivered).toBe(false)
  })

  it('does not re-speak an already-delivered notice after a subsequent refresh starts', () => {
    const delivered = liveReducer(LIVE_INITIAL, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: '' })
    expect(delivered.delivered).toBe(true)

    const duringRefresh = liveReducer(delivered, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: 'מעדכן…' })
    expect(duringRefresh.live).toBe('מעדכן…')
    expect(duringRefresh.notice).toBe('')
    expect(duringRefresh.delivered).toBe(false)

    const afterRefresh = liveReducer(duringRefresh, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: '' })
    expect(afterRefresh.live).toBe('')
  })

  it('queues recovery behind an active refresh and delivers it once idle', () => {
    const offline = liveReducer(LIVE_INITIAL, { type: 'sync', problem: 'offline', fetchedAt: FETCHED_AT, update: '' })
    const backWhileBusy = liveReducer(offline, { type: 'sync', problem: null, fetchedAt: FETCHED_AT, update: 'מעדכן…' })
    expect(backWhileBusy.live).toBe('מעדכן…')
    expect(backWhileBusy.notice).toBe('החיבור חזר.')
    expect(backWhileBusy.delivered).toBe(false)

    const delivered = liveReducer(backWhileBusy, { type: 'sync', problem: null, fetchedAt: FETCHED_AT, update: '' })
    expect(delivered.live).toBe('החיבור חזר.')
    expect(delivered.delivered).toBe(true)
  })
})

describe('StatusLine live region mount', () => {
  it('mounts role="status" empty even when already offline or refreshing', () => {
    const offlineHtml = renderToStaticMarkup(
      createElement(StatusLine, {
        status: 'ready',
        freshness: 'stale',
        fetchedAt: FETCHED_AT,
        failure: 'network',
        onRefresh: vi.fn(),
      }),
    )
    expect(offlineHtml).toContain('role="status"></span>')

    const busyHtml = renderToStaticMarkup(
      createElement(StatusLine, {
        status: 'refreshing',
        freshness: 'fresh',
        fetchedAt: FETCHED_AT,
        failure: null,
        onRefresh: vi.fn(),
      }),
    )
    expect(busyHtml).toContain('role="status"></span>')
  })
})
