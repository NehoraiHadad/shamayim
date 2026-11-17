import { useEffect, useRef } from 'react'
import type { LifeState } from './types'
import styles from './Life.module.css'

const dots = [[8, 46], [22, 42], [36, 48], [61, 44], [79, 49], [94, 40]]

export function Twinkle({ state, enabled }: { state: LifeState['twinkle']; enabled: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current || !state || !enabled) return
    let animations: Animation[] = []
    const play = () => {
      animations.forEach((a) => a.cancel())
      if (document.hidden) return
      animations = [...root.current!.children].map((dot, index) => {
        const duration = state.period * 1000 * (0.8 + index * 0.09)
        return dot.animate(
          [{ opacity: 1 }, { opacity: 1 - state.amp }, { opacity: 1 }],
          { duration, iterations: 30000 / duration, iterationStart: index * 430 / duration },
        )
      })
    }
    play()
    document.addEventListener('visibilitychange', play)
    return () => { document.removeEventListener('visibilitychange', play); animations.forEach((a) => a.cancel()) }
  }, [state, enabled])
  if (!state || !enabled) return null
  return <div ref={root}>{dots.map(([x, y]) => <i key={x} className={styles.twinkle} style={{ left: `${x}vw`, top: `${y}svh` }} />)}</div>
}
