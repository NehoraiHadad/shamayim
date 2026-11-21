import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'virtual:pwa-register'

const { registerSWMock, updateSWMock } = vi.hoisted(() => {
  const updateSWMock = vi.fn<(reloadPage?: boolean) => Promise<void>>().mockResolvedValue(undefined)
  const registerSWMock = vi.fn<(options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>>(() => updateSWMock)
  return { registerSWMock, updateSWMock }
})
vi.mock('virtual:pwa-register', () => ({ registerSW: registerSWMock }))

import { IDLE_MS, RECHECK_MS, setupServiceWorker, shouldReloadNow } from './pwa'

function mountPwa(initialController: object | null = {}, reload = vi.fn()) {
  const win = Object.assign(new EventTarget(), { location: { reload } })
  const doc = new EventTarget()
  const sw = Object.assign(new EventTarget(), { controller: initialController })
  let hidden = false, dialogOpen = false, scrubbing = false

  Object.defineProperty(doc, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') })
  Object.assign(doc, {
    querySelector: (sel: string) => (sel === 'dialog[open]' ? dialogOpen : sel === '.app[data-scrubbing]' ? scrubbing : false) ? {} : null,
  })
  vi.stubGlobal('BroadcastChannel', undefined)
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('navigator', { serviceWorker: sw })

  const cleanup = setupServiceWorker()
  const options = registerSWMock.mock.calls.at(-1)?.[0] ?? {}
  return {
    setHidden(next: boolean) { hidden = next; doc.dispatchEvent(new Event('visibilitychange')) },
    setDialogOpen(next: boolean) { dialogOpen = next },
    setScrubbing(next: boolean) { scrubbing = next },
    triggerNeedRefresh() { options.onNeedRefresh?.() },
    triggerOfflineReady() { options.onOfflineReady?.() },
    dispatchInput() { win.dispatchEvent(new Event('pointerdown')) },
    dispatchControllerChange(nextController: object | null = {}) {
      sw.controller = nextController
      sw.dispatchEvent(new Event('controllerchange'))
    },
    reload,
    options,
    cleanup,
  }
}

type Harness = ReturnType<typeof mountPwa>

describe('shouldReloadNow', () => {
  it('activates immediately once hidden, and while visible only when idle >= 60 s with no dialog or scrub', () => {
    expect(shouldReloadNow({ hidden: true, idleMs: 0, dialogOpen: true, scrubbing: true })).toBe(true)
    expect(shouldReloadNow({ hidden: false, idleMs: IDLE_MS, dialogOpen: false, scrubbing: false })).toBe(true)
    expect(shouldReloadNow({ hidden: false, idleMs: IDLE_MS - 1, dialogOpen: false, scrubbing: false })).toBe(false)
    expect(shouldReloadNow({ hidden: false, idleMs: IDLE_MS * 2, dialogOpen: true, scrubbing: false })).toBe(false)
    expect(shouldReloadNow({ hidden: false, idleMs: IDLE_MS * 2, dialogOpen: false, scrubbing: true })).toBe(false)
  })
})

describe('setupServiceWorker', () => {
  let activeCleanup: (() => void) | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    registerSWMock.mockClear()
    updateSWMock.mockClear()
  })

  afterEach(() => {
    activeCleanup?.()
    activeCleanup = null
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('passes onNeedReload so the plugin never calls location.reload, and reloads once per update', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    expect(registerSWMock).toHaveBeenCalledTimes(1)
    expect(h.options.immediate).toBe(true)
    expect(typeof h.options.onNeedRefresh).toBe('function')
    expect(typeof h.options.onNeedReload).toBe('function')

    vi.advanceTimersByTime(IDLE_MS)
    h.options.onNeedReload?.()
    h.options.onNeedReload?.()
    h.dispatchControllerChange()
    expect(h.reload).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['dialog open', (h: Harness, active: boolean) => h.setDialogOpen(active)],
    ['scrubbing', (h: Harness, active: boolean) => h.setScrubbing(active)],
  ])('defers activation while %s, then activates once after it clears', (_label, toggle) => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    toggle(h, true)
    vi.advanceTimersByTime(IDLE_MS)

    h.triggerNeedRefresh()
    vi.advanceTimersByTime(RECHECK_MS * 3)
    expect(updateSWMock).not.toHaveBeenCalled()

    toggle(h, false)
    vi.advanceTimersByTime(RECHECK_MS)
    expect(updateSWMock).toHaveBeenCalledTimes(1)
    expect(updateSWMock).toHaveBeenCalledWith(true)
  })

  it('never activates or reloads on first install of an uncontrolled page', () => {
    const h = mountPwa(null)
    activeCleanup = h.cleanup
    vi.advanceTimersByTime(IDLE_MS)

    h.triggerOfflineReady()
    h.triggerNeedRefresh()
    h.options.onNeedReload?.()
    h.dispatchControllerChange({})
    h.setHidden(true)
    expect(updateSWMock).not.toHaveBeenCalled()
    expect(h.reload).not.toHaveBeenCalled()
  })

  it('activates immediately when already idle >= 60 s, or early on hidden while clearing its retry timer', () => {
    const idle = mountPwa({})
    activeCleanup = idle.cleanup
    vi.advanceTimersByTime(IDLE_MS)
    idle.triggerNeedRefresh()
    expect(updateSWMock).toHaveBeenCalledTimes(1)
    expect(updateSWMock).toHaveBeenCalledWith(true)
    idle.cleanup()
    updateSWMock.mockClear()

    const hidden = mountPwa({})
    activeCleanup = hidden.cleanup
    hidden.triggerNeedRefresh()
    expect(updateSWMock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)

    hidden.dispatchInput()
    hidden.setHidden(true)
    expect(updateSWMock).toHaveBeenCalledTimes(1)
    expect(updateSWMock).toHaveBeenCalledWith(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
