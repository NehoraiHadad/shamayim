import { registerSW } from 'virtual:pwa-register'

const CHECK_EVERY_MS = 30 * 60 * 1000
export const IDLE_MS = 60_000
export const RECHECK_MS = 5_000

export interface ReloadContext {
  hidden: boolean
  idleMs: number
  dialogOpen: boolean
  scrubbing: boolean
}

/** True when activating a waiting service worker and reloading will not interrupt the user. */
export function shouldReloadNow({ hidden, idleMs, dialogOpen, scrubbing }: ReloadContext): boolean {
  return hidden || (idleMs >= IDLE_MS && !dialogOpen && !scrubbing)
}

/** Hold a waiting service worker until the page is hidden or idle with no dialog or active scrub, then activate once. */
export function setupServiceWorker(): () => void {
  let pending = false
  let activated = false
  let disposed = false
  let lastInput = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  let updateInterval: ReturnType<typeof setInterval> | undefined
  let onVisibleCheck: (() => void) | undefined
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  const tryActivate = () => {
    if (disposed || !pending || activated) return
    const idleMs = Date.now() - lastInput
    const ok = shouldReloadNow({
      hidden: document.visibilityState === 'hidden',
      idleMs,
      dialogOpen: Boolean(document.querySelector('dialog[open]')),
      scrubbing: Boolean(document.querySelector('.app[data-scrubbing]')),
    })
    if (ok) {
      activated = true
      clearTimer()
      void updateSW?.(true)
      return
    }
    clearTimer()
    timer = setTimeout(tryActivate, Math.max(RECHECK_MS, IDLE_MS - idleMs))
  }
  const touch = () => {
    lastInput = Date.now()
    if (pending && !activated) {
      clearTimer()
      timer = setTimeout(tryActivate, IDLE_MS)
    }
  }
  const onHidden = () => { if (document.visibilityState === 'hidden') tryActivate() }
  const inputEvents = ['pointerdown', 'keydown', 'scroll'] as const
  for (const ev of inputEvents) window.addEventListener(ev, touch, { passive: true, capture: true })
  document.addEventListener('visibilitychange', onHidden)
  // Prompt mode: the new worker waits until updateSW(true) posts SKIP_WAITING; workbox-window reloads on `controlling`.
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (disposed || pending || activated || !navigator.serviceWorker?.controller) return
      pending = true
      tryActivate()
    },
    onRegisteredSW(_url, registration) {
      if (disposed || !registration) return
      const check = () => void registration.update().catch(() => {})
      updateInterval = setInterval(check, CHECK_EVERY_MS)
      onVisibleCheck = () => { if (document.visibilityState === 'visible') check() }
      document.addEventListener('visibilitychange', onVisibleCheck)
    },
  })
  return () => {
    disposed = true
    clearTimer()
    if (updateInterval !== undefined) clearInterval(updateInterval)
    for (const ev of inputEvents) window.removeEventListener(ev, touch, true)
    document.removeEventListener('visibilitychange', onHidden)
    if (onVisibleCheck) document.removeEventListener('visibilitychange', onVisibleCheck)
  }
}
