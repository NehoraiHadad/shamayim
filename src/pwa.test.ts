import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { registerSWMock } = vi.hoisted(() => ({ registerSWMock: vi.fn() }))
vi.mock('virtual:pwa-register', () => ({ registerSW: registerSWMock }))

import { IDLE_MS, RECHECK_MS, setupServiceWorker, shouldReloadNow } from './pwa'

interface Harness {
  setHidden: (hidden: boolean) => void
  setDialogOpen: (open: boolean) => void
  setScrubbing: (scrubbing: boolean) => void
  dispatchControllerChange: () => void
  dispatchInput: () => void
  reload: ReturnType<typeof vi.fn<() => void>>
  cleanup: () => void
}

function mountPwa(initialController: object | null = {}): Harness {
  const win = new EventTarget()
  const doc = new EventTarget()
  const sw = new EventTarget()
  let hidden = false
  let dialogOpen = false
  let scrubbing = false

  Object.defineProperty(doc, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') })
  Object.assign(doc, {
    querySelector: (selector: string) => {
      if (selector === 'dialog[open]') return dialogOpen ? {} : null
      if (selector === '.app[data-scrubbing]') return scrubbing ? {} : null
      return null
    },
  })
  Object.assign(sw, { controller: initialController })

  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('navigator', { serviceWorker: sw })

  const reload = vi.fn<() => void>()
  const cleanup = setupServiceWorker(reload)
  return {
    setHidden(next) {
      hidden = next
      doc.dispatchEvent(new Event('visibilitychange'))
    },
    setDialogOpen(next) { dialogOpen = next },
    setScrubbing(next) { scrubbing = next },
    dispatchControllerChange() { sw.dispatchEvent(new Event('controllerchange')) },
    dispatchInput() { win.dispatchEvent(new Event('pointerdown')) },
    reload,
    cleanup,
  }
}

describe('shouldReloadNow', () => {
  it('reloads immediately once the document is hidden, regardless of idle time or UI state', () => {
    expect(shouldReloadNow({ hidden: true, idleMs: 0, dialogOpen: true, scrubbing: true })).toBe(true)
  })

  it('reloads while visible only after 60 s idle with no dialog open and not scrubbing', () => {
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
  })

  afterEach(() => {
    activeCleanup?.()
    activeCleanup = null
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('disables vite-plugin-pwa autoUpdate immediate reload via onNeedReload', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    expect(registerSWMock).toHaveBeenCalledTimes(1)
    const options = registerSWMock.mock.calls[0][0] as { immediate?: boolean; onNeedReload?: () => void }
    expect(options.immediate).toBe(true)
    expect(typeof options.onNeedReload).toBe('function')
    options.onNeedReload?.()
    expect(h.reload).not.toHaveBeenCalled()
  })

  it('defers reload while a dialog is open, then reloads exactly once after it closes', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    h.setDialogOpen(true)
    vi.advanceTimersByTime(IDLE_MS)

    h.dispatchControllerChange()
    expect(h.reload).not.toHaveBeenCalled()

    vi.advanceTimersByTime(RECHECK_MS * 3)
    expect(h.reload).not.toHaveBeenCalled()

    h.setDialogOpen(false)
    vi.advanceTimersByTime(RECHECK_MS)
    expect(h.reload).toHaveBeenCalledTimes(1)

    // Subsequent events and timers never trigger a second reload.
    h.setHidden(true)
    h.dispatchControllerChange()
    vi.advanceTimersByTime(IDLE_MS * 2)
    expect(h.reload).toHaveBeenCalledTimes(1)
  })

  it('defers reload while scrubbing, then reloads exactly once after scrubbing ends', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    h.setScrubbing(true)
    vi.advanceTimersByTime(IDLE_MS)

    h.dispatchControllerChange()
    expect(h.reload).not.toHaveBeenCalled()

    vi.advanceTimersByTime(RECHECK_MS * 2)
    expect(h.reload).not.toHaveBeenCalled()

    h.setScrubbing(false)
    vi.advanceTimersByTime(RECHECK_MS)
    expect(h.reload).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(IDLE_MS)
    expect(h.reload).toHaveBeenCalledTimes(1)
  })

  it('skips only the very first claim of an uncontrolled page, then honours later replacements', () => {
    const h = mountPwa(null)
    activeCleanup = h.cleanup
    vi.advanceTimersByTime(IDLE_MS)

    h.dispatchControllerChange()
    expect(h.reload).not.toHaveBeenCalled()

    h.dispatchControllerChange()
    expect(h.reload).toHaveBeenCalledTimes(1)
  })

  it('reloads immediately when an update arrives after the page is already idle >= 60 s', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup
    vi.advanceTimersByTime(IDLE_MS)

    h.dispatchControllerChange()
    expect(h.reload).toHaveBeenCalledTimes(1)
  })

  it('clears the retry timer before reloading early on visibilitychange', () => {
    const h = mountPwa({})
    activeCleanup = h.cleanup

    h.dispatchControllerChange()
    expect(h.reload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)

    h.setHidden(true)
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
