import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'virtual:pwa-register'

const { registerSWMock, updateSWMock } = vi.hoisted(() => {
  const updateSWMock = vi.fn<(reloadPage?: boolean) => Promise<void>>().mockResolvedValue(undefined)
  const registerSWMock = vi.fn<(options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>>(() => updateSWMock)
  return { registerSWMock, updateSWMock }
})
vi.mock('virtual:pwa-register', () => ({ registerSW: registerSWMock }))

import { IDLE_MS, RECHECK_MS, setupServiceWorker } from './pwa'
import { createTabCoordinator, PROBE_MS, SW_CHANNEL } from './pwaTabs'

class FakeBroadcastChannel extends EventTarget {
  static open = new Set<FakeBroadcastChannel>()
  readonly name: string
  closed = false

  constructor(name: string) {
    super()
    this.name = name
    FakeBroadcastChannel.open.add(this)
  }

  postMessage(data: unknown) {
    if (this.closed) return
    for (const peer of FakeBroadcastChannel.open) {
      if (peer !== this && !peer.closed && peer.name === this.name) {
        peer.dispatchEvent(new MessageEvent('message', { data }))
      }
    }
  }

  close() {
    this.closed = true
    FakeBroadcastChannel.open.delete(this)
  }
}

function mountTab() {
  const reload = vi.fn()
  const win = Object.assign(new EventTarget(), { location: { reload } })
  const doc = new EventTarget()
  const sw = Object.assign(new EventTarget(), { controller: {} as object | null })
  let hidden = false, dialogOpen = false

  Object.defineProperty(doc, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') })
  Object.assign(doc, { querySelector: (sel: string) => (sel === 'dialog[open]' && dialogOpen ? {} : null) })
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('navigator', { serviceWorker: sw })

  const cleanup = setupServiceWorker()
  const options = registerSWMock.mock.calls.at(-1)?.[0] ?? {}
  return {
    setHidden(next: boolean) { hidden = next; doc.dispatchEvent(new Event('visibilitychange')) },
    setDialogOpen(next: boolean) { dialogOpen = next },
    triggerNeedRefresh() { options.onNeedRefresh?.() },
    triggerNeedReload() { options.onNeedReload?.() },
    dispatchControllerChange() { sw.dispatchEvent(new Event('controllerchange')) },
    reload,
    cleanup,
  }
}

describe('cross-tab SW coordination', () => {
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers()
    FakeBroadcastChannel.open.clear()
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
    registerSWMock.mockClear()
    updateSWMock.mockClear()
  })

  afterEach(() => {
    for (const fn of cleanups.splice(0)) fn()
    FakeBroadcastChannel.open.clear()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('blocks activation while a second tab is busy, then activates once idle', () => {
    let peerAllowed = false
    const peer = createTabCoordinator(() => peerAllowed)
    cleanups.push(() => peer.close())

    const tab = mountTab()
    cleanups.push(tab.cleanup)
    tab.setHidden(true)
    tab.triggerNeedRefresh()

    vi.advanceTimersByTime(PROBE_MS)
    expect(updateSWMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(RECHECK_MS - PROBE_MS)
    expect(updateSWMock).not.toHaveBeenCalled()

    peerAllowed = true
    vi.advanceTimersByTime(RECHECK_MS)
    expect(updateSWMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(PROBE_MS - 1)
    expect(updateSWMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(updateSWMock).toHaveBeenCalledTimes(1)
    expect(updateSWMock).toHaveBeenCalledWith(true)
  })

  it('defers reload on an external takeover while a dialog is open, then reloads once after it closes', () => {
    const tab = mountTab()
    cleanups.push(tab.cleanup)
    tab.setDialogOpen(true)
    vi.advanceTimersByTime(IDLE_MS)

    tab.dispatchControllerChange()
    tab.triggerNeedReload()
    tab.triggerNeedReload()
    expect(tab.reload).not.toHaveBeenCalled()

    vi.advanceTimersByTime(RECHECK_MS * 3)
    expect(tab.reload).not.toHaveBeenCalled()

    tab.setDialogOpen(false)
    vi.advanceTimersByTime(RECHECK_MS)
    expect(tab.reload).toHaveBeenCalledTimes(1)
  })

  it('closes the BroadcastChannel and clears probe timers on cleanup', () => {
    const tab = mountTab()
    expect([...FakeBroadcastChannel.open].map((ch) => ch.name)).toEqual([SW_CHANNEL])
    tab.setHidden(true)
    tab.triggerNeedRefresh()

    tab.cleanup()
    expect(FakeBroadcastChannel.open.size).toBe(0)
    vi.advanceTimersByTime(PROBE_MS + RECHECK_MS)
    expect(updateSWMock).not.toHaveBeenCalled()
  })
})
