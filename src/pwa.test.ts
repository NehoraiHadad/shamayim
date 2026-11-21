import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'virtual:pwa-register'

const { registerSWMock, updateSWMock } = vi.hoisted(() => {
  const updateSWMock = vi.fn<(reloadPage?: boolean) => Promise<void>>().mockResolvedValue(undefined)
  const registerSWMock = vi.fn<(options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>>(() => updateSWMock)
  return { registerSWMock, updateSWMock }
})
vi.mock('virtual:pwa-register', () => ({ registerSW: registerSWMock }))

import { IDLE_MS, RECHECK_MS, setupServiceWorker, shouldReloadNow } from './pwa'

interface Harness {
  setHidden: (hidden: boolean) => void
  setDialogOpen: (open: boolean) => void
  setScrubbing: (scrubbing: boolean) => void
  triggerNeedRefresh: () => void
  triggerOfflineReady: () => void
  dispatchInput: () => void
  options: RegisterSWOptions
  cleanup: () => void
}

function mountPwa(initialController: object | null = {}): Harness {
  const win = new EventTarget()
  const doc = new EventTarget()
  let hidden = false, dialogOpen = false, scrubbing = false

  Object.defineProperty(doc, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') })
  Object.assign(doc, {
    querySelector: (sel: string) => (sel === 'dialog[open]' ? dialogOpen : sel === '.app[data-scrubbing]' ? scrubbing : false) ? {} : null,
  })
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('navigator', { serviceWorker: { controller: initialController } })

  const cleanup = setupServiceWorker()
  const options = registerSWMock.mock.calls.at(-1)?.[0] ?? {}
  return {
    setHidden(next) { hidden = next; doc.dispatchEvent(new Event('visibilitychange')) },
    setDialogOpen(next) { dialogOpen = next },
    setScrubbing(next) { scrubbing = next },
    triggerNeedRefresh() { options.onNeedRefresh?.() },
    triggerOfflineReady() { options.onOfflineReady?.() },
    dispatchInput() { win.dispatchEvent(new Event('pointerdown')) },
    options,
    cleanup,
  }
}

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

  it('registers in prompt mode without overriding the controlling reload path', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    expect(registerSWMock).toHaveBeenCalledTimes(1)
    expect(h.options.immediate).toBe(true)
    expect(typeof h.options.onNeedRefresh).toBe('function')
    expect(h.options.onNeedReload).toBeUndefined()
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
    expect(updateSWMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(RECHECK_MS * 3)
    expect(updateSWMock).not.toHaveBeenCalled()

    toggle(h, false)
    vi.advanceTimersByTime(RECHECK_MS)
    expect(updateSWMock).toHaveBeenCalledTimes(1)
    expect(updateSWMock).toHaveBeenCalledWith(true)
  })

  it('never activates on first install of an uncontrolled page', () => {
    const h = mountPwa(null)
    activeCleanup = h.cleanup
    vi.advanceTimersByTime(IDLE_MS)

    h.triggerOfflineReady()
    h.triggerNeedRefresh()
    h.setHidden(true)
    expect(updateSWMock).not.toHaveBeenCalled()
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
