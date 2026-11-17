import { useMemo } from 'react'
import type { ThemeId } from '../theme/skyThemes'
import styles from './Sky.module.css'

interface Props {
  theme: ThemeId
  /** 0–100, drives cloud layer opacity. */
  cloudCover: number
}

/** Deterministic star field as one box-shadow list (cheap: a single element). Kept clear of the text column. */
function starField(count: number): string {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * 100)
    const y = Math.round(rand() * 50)
    const nearText = x > 30 && y > 8 && y < 40
    const a = ((0.35 + rand() * 0.65) * (nearText ? 0.4 : 1)).toFixed(2)
    return `${x}vw ${y}svh 0 rgba(255,255,255,${a})`
  }).join(',')
}

const STARS: Partial<Record<ThemeId, number>> = { night: 1, dusk: 0.4 }

/**
 * The sky behind everything. Every layer stays mounted and cross-fades by opacity,
 * so a theme change never pops.
 */
export function Sky({ theme, cloudCover }: Props) {
  const stars = useMemo(() => starField(46), [])
  const clouds = theme !== 'dust' && cloudCover >= 20 ? Math.min(0.7, cloudCover / 100) : 0
  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.stars} style={{ boxShadow: stars, opacity: STARS[theme] ?? 0 }} />
      <div className={styles.clouds} style={{ opacity: clouds }}>
        <span /><span /><span />
      </div>
      <div className={styles.rain} style={{ opacity: theme === 'rain' ? 1 : 0, animationPlayState: theme === 'rain' ? 'running' : 'paused' }} />
      <div className={styles.dust} style={{ opacity: theme === 'dust' ? 0.14 : 0 }} />
    </div>
  )
}
