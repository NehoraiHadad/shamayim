import { registerSW } from 'virtual:pwa-register'
import { createTabCoordinator } from './pwaTabs'

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

/** Hold a waiting service worker until every tab is safe to reload, then activate and reload at most once. */
export function setupServiceWorker(): () => void {
  let pending = false
  let activated = false
  let needsReload = false
  let reloaded = false
  let disposed = false
  let lastInput = Date.now()
  let hadController = Boolean(navigator.serviceWorker?.controller)
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
  const canReloadNow = () => shouldReloadNow({
    hidden: document.visibilityState === 'hidden',
    idleMs: Date.now() - lastInput,
    dialogOpen: Boolean(document.querySelector('dialog[open]')),
    scrubbing: Boolean(document.querySelector('.app[data-scrubbing]')),
  })
  const retryDelay = () => document.visibilityState === 'hidden'
    ? RECHECK_MS
    : Math.max(RECHECK_MS, IDLE_MS - (Date.now() - lastInput))
  const scheduleRetry = () => {
    clearTimer()
    timer = setTimeout(tryStep, retryDelay())
  }
  const tabs = createTabCoordinator(canReloadNow)

  const tryStep = () => {
    if (disposed || reloaded) return
    if (needsReload) {
      if (canReloadNow()) {
        reloaded = true
        clearTimer()
        window.location?.reload()
        return
      }
      scheduleRetry()
      return
    }
    if (!pending || activated) return
    if (!canReloadNow()) {
      scheduleRetry()
      return
    }
    clearTimer()
    tabs.probe((allowed) => {
      if (disposed || reloaded || activated || needsReload) return
      if (allowed && canReloadNow()) {
        activated = true
        void updateSW?.(true)
        return
      }
      scheduleRetry()
    })
  }

  const markNeedsReload = () => {
    if (disposed || reloaded || !hadController) return
    needsReload = true
    tryStep()
  }
  const onControllerChange = () => {
    if (disposed) return
    if (!hadController) {
      hadController = Boolean(navigator.serviceWorker?.controller)
      return
    }
    markNeedsReload()
  }
  const touch = () => {
    lastInput = Date.now()
    if (!reloaded && (needsReload || (pending && !activated))) {
      clearTimer()
      timer = setTimeout(tryStep, IDLE_MS)
    }
  }
  const onHidden = () => { if (document.visibilityState === 'hidden') tryStep() }
  const inputEvents = ['pointerdown', 'keydown', 'scroll'] as const
  for (const ev of inputEvents) window.addEventListener(ev, touch, { passive: true, capture: true })
  document.addEventListener('visibilitychange', onHidden)
  navigator.serviceWorker?.addEventListener?.('controllerchange', onControllerChange)

  // Prompt mode: `onNeedReload` prevents the plugin's duplicate `controlling` handlers from calling location.reload;
  // both `onNeedReload` and `controllerchange` funnel into our single idempotent `shouldReloadNow` gate.
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (disposed || pending || activated || needsReload || !hadController || !navigator.serviceWorker?.controller) return
      pending = true
      tryStep()
    },
    onNeedReload: markNeedsReload,
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
    tabs.close()
    if (updateInterval !== undefined) clearInterval(updateInterval)
    for (const ev of inputEvents) window.removeEventListener(ev, touch, true)
    document.removeEventListener('visibilitychange', onHidden)
    if (onVisibleCheck) document.removeEventListener('visibilitychange', onVisibleCheck)
    navigator.serviceWorker?.removeEventListener?.('controllerchange', onControllerChange)
  }
}
