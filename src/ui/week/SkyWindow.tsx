import type { CSSProperties } from 'react'
import { WeatherIcon } from '../WeatherIcon'
import type { DaySky } from './middaySky'
import styles from './SkyWindow.module.css'

/** A low ridge the paper cuts into the window's foot, as the valley section meets the sheet above. */
const RIDGE = 'M0 40V32.6C3.5 31.6 6.5 31.2 9.5 32.1 13.5 33.4 16.5 35.6 21.5 35.9 26.5 36.2 31 35 36 35.8V40Z'

/** A small window onto a day's midday sky, carrying its weather icon in the sky's own ink. Decorative. */
export function SkyWindow({ sky }: { sky: DaySky }) {
  const style = { '--win-top': sky.top, '--win-low': sky.low, color: sky.ink } as CSSProperties
  return (
    <span className={styles.window} style={style} aria-hidden="true">
      <WeatherIcon kind={sky.kind} size={22} decorative className={styles.icon} />
      <svg className={styles.ridge} viewBox="0 0 36 40" preserveAspectRatio="none">
        <path d={RIDGE} />
      </svg>
    </span>
  )
}
