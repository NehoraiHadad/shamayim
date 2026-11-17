import { useEffect, useState } from 'react'
import type { LocalTime } from '../domain/types'

const CLEAR_AFTER_MS = 6000

/** An hour picked in the strip. It clears itself after 6 s so the scene returns to now. */
export function useHourSelection(): [LocalTime | null, (t: LocalTime | null) => void] {
  const [selected, setSelected] = useState<LocalTime | null>(null)
  useEffect(() => {
    if (!selected) return
    const timer = setTimeout(() => setSelected(null), CLEAR_AFTER_MS)
    return () => clearTimeout(timer)
  }, [selected])
  return [selected, setSelected]
}
