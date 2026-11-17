import { useMemo, useRef } from 'react'
import { SKY_THEMES, type ThemeId } from '../theme/skyThemes'
import type { AirState } from './airTypes'
import styles from './Atmosphere.module.css'
import { CssAir } from './CssAir'
import { airPalette } from './gl/palette'
import { useAirLoop } from './useAirLoop'

interface Props {
  air: AirState
  theme: ThemeId
  night: boolean
  /** Glide time to this state: 320 into a preview, 520 back, 1600 for live updates. */
  glide: number
}

/** The live air over the sky gradient: WebGL when available, otherwise a CSS still of the same state. */
export function Atmosphere({ air, theme, night, glide }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pal = useMemo(() => airPalette(SKY_THEMES[theme], air.haze.color, night), [theme, air.haze.color, night])
  const supported = useAirLoop(canvas, air, pal, glide)
  return supported ? <canvas ref={canvas} className={styles.canvas} aria-hidden="true" /> : <CssAir air={air} />
}
