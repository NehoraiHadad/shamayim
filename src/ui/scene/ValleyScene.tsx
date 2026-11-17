import { clockOf, datePart } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { isolateNumbers } from '../isolateNumbers'
import { nextSunEvent, twilight } from './sceneModel'
import { Sun } from './Sun'
import { FLOOR_Y, SCENE_H, SCENE_W, SEA_Y, sunPosition } from './sunPath'
import styles from './ValleyScene.module.css'

interface Props {
  forecast: Forecast
  now: LocalTime
  /** An hour picked in the strip; the sun moves there. */
  selected: LocalTime | null
  lat: number
  /** Shown in place of the next sun event while an hour is selected. */
  readout?: string | null
}

// West (Samaria) on the left, east (Gilead, higher and steeper) on the right, as on a map.
// The near layer dips to the Jordan just east of the village. Vertical scale is exaggerated.
const FAR = 'M0 128V38C34 28 70 32 104 48S160 80 190 86S236 76 262 52S326 16 375 20V128Z'
const NEAR = 'M0 128V50C30 44 60 48 90 62S134 90 150 96L200 97Q212 103 222 98L236 96C256 82 272 58 296 44S348 30 375 32V128Z'
const VILLAGE_LEFT = `${((178 / SCENE_W) * 100).toFixed(1)}%`

/** Cross-section of the Jordan Valley at Shadmot Mehola, with sea level drawn above the village. */
export function ValleyScene({ forecast, now, selected, lat, readout = null }: Props) {
  const at = selected ?? now
  const day = forecast.days.find((d) => d.date === datePart(at))
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, lat) : null
  const glow = twilight(forecast.days.find((d) => d.date === datePart(now)), now)
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const depth = Math.abs(Math.round(forecast.elevation))
  const label = [
    sun && !selected ? 'השמש מעל הבקעה.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${depth} מטר מתחת לפני הים.` : '',
  ].filter(Boolean).join(' ')

  return (
    <figure className={styles.scene} role="img" aria-label={label}>
      {glow && <div className={`${styles.glow} ${styles[glow.side]}`} style={{ opacity: glow.opacity }} />}
      <Sun point={sun} date={datePart(at)} lat={lat} cloudCover={forecast.current.cloudCover} />
      <svg className={styles.land} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={FAR} className={styles.far} />
        {below && (
          <line x1="96" x2="276" y1={SEA_Y} y2={SEA_Y} className={styles.sea} vectorEffect="non-scaling-stroke" />
        )}
        <path d={NEAR} className={styles.near} />
      </svg>
      <span className={styles.village} style={{ left: VILLAGE_LEFT, top: FLOOR_Y }} aria-hidden="true" />
      {below && (
        <>
          <span className={styles.depth} style={{ left: VILLAGE_LEFT, top: SEA_Y + 6 }} aria-hidden="true">
            <bdi>−{depth}</bdi> מ׳
          </span>
          <span className={styles.seaLabel} style={{ top: SEA_Y - 14 }} aria-hidden="true">פני הים</span>
        </>
      )}
      {readout && (
        <span className={styles.readout} aria-hidden="true">{isolateNumbers(readout)}</span>
      )}
      {event && !readout && (
        <span className={`${styles.caption} ${event.rise ? styles.east : styles.west}`} aria-hidden="true">
          {event.rise ? 'זריחה' : 'שקיעה'} <bdi>{clockOf(event.time)}</bdi>
        </span>
      )}
    </figure>
  )
}
