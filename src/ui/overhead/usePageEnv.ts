import { useEffect, useState } from 'react'

const MOTION = '(prefers-reduced-motion: reduce)'
/** After this long without a radar outlook the page stops saying "checking" and says the radar is missing. */
const PATIENCE_MS = 12_000

/** The page's clock (ticks every 15 s), network and reduced-motion state, and whether it has waited long. */
export function usePageEnv() {
  const [now, setNow] = useState(Date.now)
  const [opened] = useState(Date.now)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [reduced, setReduced] = useState(() => matchMedia(MOTION).matches)

  useEffect(() => {
    const network = () => setOnline(navigator.onLine)
    const preference = matchMedia(MOTION)
    const changeMotion = () => setReduced(preference.matches)
    const clock = setInterval(() => setNow(Date.now()), 15_000)
    const patience = setTimeout(() => setNow(Date.now()), PATIENCE_MS)
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    preference.addEventListener('change', changeMotion)
    return () => {
      clearInterval(clock)
      clearTimeout(patience)
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
      preference.removeEventListener('change', changeMotion)
    }
  }, [])

  return { now, online, reduced, slow: now - opened >= PATIENCE_MS }
}
