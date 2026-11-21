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

/** True when a waiting service-worker reload will not interrupt the user. */
export function shouldReloadNow({ hidden, idleMs, dialogOpen, scrubbing }: ReloadContext): boolean {
  return hidden || (idleMs >= IDLE_MS && !dialogOpen && !scrubbing)
}

/** Defer service-worker reloads until the page is hidden or idle with no dialog or active scrub. */
export function setupServiceWorker(reload: () => void = () => window.location.reload()): () => void {
  let controlled = Boolean(navigator.serviceWorker?.controller)
  let pending = false
  let reloaded = false
  let disposed = false
  let lastInput = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  let updateInterval: ReturnType<typeof setInterval> | undefined
  let onVisibleCheck: (() => void) | undefined

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  const tryReload = () => {
    if (disposed || !pending || reloaded) return
    const idleMs = Date.now() - lastInput
    const ok = shouldReloadNow({
      hidden: document.visibilityState === 'hidden',
      idleMs,
      dialogOpen: Boolean(document.querySelector('dialog[open]')),
      scrubbing: Boolean(document.querySelector('.app[data-scrubbing]')),
    })
    if (ok) {
      reloaded = true
      clearTimer()
      reload()
      return
    }
    clearTimer()
    timer = setTimeout(tryReload, Math.max(RECHECK_MS, IDLE_MS - idleMs))
  }
  const queueReload = () => {
    if (disposed || pending || reloaded) return
    pending = true
    tryReload()
  }
  const touch = () => {
    lastInput = Date.now()
    if (pending && !reloaded) {
      clearTimer()
      timer = setTimeout(tryReload, IDLE_MS)
    }
  }
  const onHidden = () => { if (document.visibilityState === 'hidden') tryReload() }
  const onControllerChange = () => {
    if (!controlled) { controlled = true; return }
    queueReload()
  }
  const inputEvents = ['pointerdown', 'keydown', 'scroll'] as const
  for (const ev of inputEvents) window.addEventListener(ev, touch, { passive: true, capture: true })
  document.addEventListener('visibilitychange', onHidden)
  navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)
  registerSW({
    immediate: true,
    // Disable vite-plugin-pwa's autoUpdate immediate reload; controllerchange -> tryReload is the sole reload path.
    onNeedReload: () => {},
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
    navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
  }
}
