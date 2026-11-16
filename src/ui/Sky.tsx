import { useMemo } from 'react'
import type { ThemeId } from '../theme/skyThemes'
import styles from './Sky.module.css'

interface Props {
  theme: ThemeId
  /** 0–100, drives cloud layer opacity. */
  cloudCover: number
}

/** Deterministic star field as one box-shadow list (cheap: a single element). */
function starField(count: number): string {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * 100)
    const y = Math.round(rand() * 55)
    const a = (0.35 + rand() * 0.65).toFixed(2)
    return `${x}vw ${y}vh 0 rgba(255,255,255,${a})`
  }).join(',')
}

export function Sky({ theme, cloudCover }: Props) {
  const stars = useMemo(() => starField(46), [])
  const night = theme === 'night' || theme === 'dusk'
  const clouds = theme !== 'dust' && cloudCover >= 20
  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.glow} />
      {night && <div className={styles.stars} style={{ boxShadow: stars }} />}
      {clouds && (
        <div className={styles.clouds} style={{ opacity: Math.min(0.85, cloudCover / 100 + 0.15) }}>
          <span /><span /><span />
        </div>
      )}
      {theme === 'rain' && <div className={styles.rain} />}
      {theme === 'dust' && <div className={styles.dust} />}
    </div>
  )
}
