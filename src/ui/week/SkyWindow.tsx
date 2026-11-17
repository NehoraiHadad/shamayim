import type { CSSProperties } from 'react'
import { WeatherIcon } from '../WeatherIcon'
import type { DaySky } from './middaySky'
import styles from './SkyWindow.module.css'

/** A low ridge the paper cuts into the window's foot, as the valley section meets the sheet above. */
const RIDGE = 'M0 40V32.6C3.5 31.6 6.5 31.2 9.5 32.1 13.5 33.4 16.5 35.6 21.5 35.9 26.5 36.2 31 35 36 35.8V40Z'

/** Dust: a rayless sun seen through bands of haze (the sharav sun is a flat coin, its rays lost in the dust). */
function HazySun() {
  return (
    <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M7.6 11.5a4.4 4.4 0 0 1 8.8 0" />
      <path d="M3.5 14.5h17M5.5 18h13M8 21.5h8" opacity="0.85" />
    </svg>
  )
}

/** A small window onto a day's midday sky, carrying its weather in the sky's own ink. Decorative. */
export function SkyWindow({ sky }: { sky: DaySky }) {
  const style = { '--win-top': sky.top, '--win-low': sky.low, '--win-ink': sky.ink } as CSSProperties
  return (
    <span className={styles.window} style={style} data-pale={sky.ink !== '#FFFFFF' || undefined} aria-hidden="true">
      {sky.hazy && sky.kind !== 'fog' ? (
        <HazySun />
      ) : (
        <WeatherIcon kind={sky.kind} size={22} decorative className={styles.icon} />
      )}
      <svg className={styles.ridge} viewBox="0 0 36 40" preserveAspectRatio="none">
        <path d={RIDGE} />
      </svg>
    </span>
  )
}
