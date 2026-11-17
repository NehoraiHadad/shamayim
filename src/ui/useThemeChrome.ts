import { useEffect } from 'react'

export const BOOT_KEY = 'shamayim:boot-bg'

/** Keeps the browser chrome colour in step with the sky and remembers it for the next cold start. */
export function useThemeChrome(top: string) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top)
    try {
      localStorage.setItem(BOOT_KEY, top)
    } catch {
      // Storage can be unavailable (private mode); the next start just begins dark.
    }
  }, [top])
}
