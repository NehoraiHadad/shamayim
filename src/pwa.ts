import { registerSW } from 'virtual:pwa-register'

const CHECK_EVERY_MS = 30 * 60 * 1000

/**
 * A new deploy takes over on the next load (skipWaiting + clientsClaim in the
 * workbox config), and the open page reloads once when it does. Updates are
 * also polled while the app stays open.
 */
export function setupServiceWorker(): void {
  const hadController = !!navigator.serviceWorker?.controller
  let reloaded = false
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    // First install also fires controllerchange (clientsClaim): don't reload then.
    if (!hadController || reloaded) return
    reloaded = true
    window.location.reload()
  })

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => {})
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
