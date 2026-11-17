import { useId, type CSSProperties } from 'react'
import type { AirState } from '../../atmo/airTypes'
import type { SceneTerrain } from '../../data/terrain/terrain'
import { clockOf, datePart } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { isolateNumbers } from '../isolateNumbers'
import { nextSunEvent, twilight } from './sceneModel'
import { Shimmer } from './Shimmer'
import { Sun } from './Sun'
import { SCENE_H, SCENE_W, sunPosition } from './sunPath'
import styles from './ValleyScene.module.css'

interface Props {
  forecast: Forecast
  now: LocalTime
  /** An hour picked in the strip; the sun moves there. */
  selected: LocalTime | null
  lat: number
  /** Shown in place of the next sun event while an hour is selected. */
  readout?: string | null
  /** The air being shown (now or the selected hour): haze, dust coin, heat shimmer, cloud veil. */
  air: AirState
  /** Cloud cover of the shown hour, 0–100. */
  cloudCover: number
  terrain: SceneTerrain
  /** Still morning mist, layered between the two ridge paths. */
  mist?: number
  mistColor?: string
}

/** West–east cross-section through the place (hand-drawn for Shadmot Mehola, sampled elsewhere). */
export function ValleyScene({ forecast, now, selected, lat, readout = null, air, cloudCover, terrain, mist = 0, mistColor = '#C9D2D8' }: Props) {
  const shimmerId = `shimmer${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const at = selected ?? now
  const day = forecast.days.find((d) => d.date === datePart(at))
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, lat) : null
  const glow = twilight(forecast.days.find((d) => d.date === datePart(now)), now)
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const elevation = Math.round(forecast.elevation)
  const elevationText = `${elevation < 0 ? `−${Math.abs(elevation)}` : elevation} מ׳`
  const showSea = forecast.elevation < 50 || terrain.seaInView
  const label = [
    sun && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')

  return (
    <figure
      className={styles.scene}
      role="img"
      aria-label={label}
      data-scene
      data-haze={air.haze.farFade > 0.5 ? 'heavy' : undefined}
      style={{ '--far-fade': air.haze.farFade.toFixed(2), '--near-fade': air.haze.nearFade.toFixed(2) } as CSSProperties}
    >
      {glow && <div className={`${styles.glow} ${styles[glow.side]}`} style={{ opacity: glow.opacity }} />}
      <Sun point={sun} date={datePart(at)} lat={lat} cloudCover={cloudCover} coin={air.sunCoin} />
      <svg className={styles.land} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
        {air.heat.amplitude > 0 && <Shimmer id={shimmerId} amplitude={air.heat.amplitude} />}
        <path d={terrain.far} className={styles.far} filter={air.heat.amplitude > 0 ? `url(#${shimmerId})` : undefined} />
        <foreignObject x="0" y="72" width={SCENE_W} height="33" className={styles.mistObject}>
          <div className={styles.mist} style={{ '--mist': mist.toFixed(3), '--mist-color': mistColor } as CSSProperties} />
        </foreignObject>
        {showSea && (
          <line x1="96" x2="276" y1={terrain.seaY} y2={terrain.seaY} className={styles.sea} vectorEffect="non-scaling-stroke" />
        )}
        <path d={terrain.near} className={styles.near} />
      </svg>
      <span className={styles.village} style={{ left: terrain.centerLeft, top: terrain.centerY }} aria-hidden="true" />
      <span
        className={styles.depth}
        style={{ left: terrain.centerLeft, top: below ? terrain.seaY + 6 : Math.min(116, terrain.centerY + 7) }}
        aria-hidden="true"
      >
        <bdi>{elevationText.replace(' מ׳', '')}</bdi> מ׳
      </span>
      {showSea && (
        <>
          <span className={styles.seaLabel} style={{ top: terrain.seaY - 14 }} aria-hidden="true">פני הים</span>
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
