import { useEffect, useState, type CSSProperties } from 'react'
import type { MarkLife } from '../../../data/landmarks/types'

type ConnectionNavigator = Navigator & { connection?: { saveData?: boolean } }

function motionAllowed(media: MediaQueryList) {
  return !media.matches && !(navigator as ConnectionNavigator).connection?.saveData
}

/**
 * Whether marks may move (no reduced motion, no Save-Data), whether the page is hidden (animations pause), and a
 * generation that bumps when the page comes back, so the 20 s motion window restarts (LANDMARKS.md, CALM-LIFE.md).
 */
export function useMarkMotion() {
  const [state, setState] = useState({ allowed: motionAllowed(matchMedia('(prefers-reduced-motion: reduce)')),
    hidden: document.hidden, generation: 0 })
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setState((previous) => ({
      allowed: motionAllowed(media), hidden: document.hidden,
      generation: previous.hidden && !document.hidden ? previous.generation + 1 : previous.generation,
    }))
    update()
    media.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return state
}

/** Custom properties read by `.crown`, `.sway` and `.blades` in marks.module.css. */
export function lifeStyle(life: MarkLife): CSSProperties {
  const swayPeriod = life.sway?.periodS ?? 2.6
  const turbinePeriod = life.turbinePeriodS ?? 7
  return {
    '--lean': `${life.leanDeg}deg`, '--sway': `${life.sway?.ampDeg ?? 0}deg`,
    '--sway-period': `${swayPeriod}s`, '--turbine-period': `${turbinePeriod}s`,
    '--sway-count': 20 / swayPeriod, '--turbine-count': 20 / turbinePeriod,
    '--mark-bleach': life.farBleach,
  } as CSSProperties
}
