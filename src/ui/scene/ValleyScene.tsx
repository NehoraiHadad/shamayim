import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AirState } from '../../atmo/airTypes'
import type { MarkLife, Landmark } from '../../data/landmarks/types'
import { placeMarks } from '../../data/landmarks/placeMarks'
import type { SceneTerrain } from '../../data/terrain/terrain'
import type { Place } from '../../config/place'
import { clockOf, datePart } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { isolateNumbers } from '../isolateNumbers'
import { nextSunEvent, twilight } from './sceneModel'
import { Shimmer } from './Shimmer'
import { Sun } from './Sun'
import { SCENE_H, SCENE_W, sunPosition } from './sunPath'
import { Landmarks } from './marks/Landmarks'
import { HillMarks } from './marks/HillMarks'
import { isHillMark } from './marks/hillPlane'
import { hillScene } from './marks/hillScene'
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
  place: Place
  landmarks: Landmark[]
  markLife: MarkLife
}

/** West–east cross-section through the place (hand-drawn for Shadmot Mehola, sampled elsewhere). */
export function ValleyScene({ forecast, now, selected, lat, readout = null, air, cloudCover, terrain, mist = 0,
  mistColor = '#C9D2D8', place, landmarks, markLife }: Props) {
  const shimmerId = `shimmer${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const sceneRef = useRef<HTMLElement>(null)
  const [sceneWidth, setSceneWidth] = useState(375)
  useEffect(() => {
    const node = sceneRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setSceneWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const at = selected ?? now
  const day = forecast.days.find((d) => d.date === datePart(at))
  const sun = day ? sunPosition(at, day.sunrise, day.sunset, lat) : null
  const glow = twilight(forecast.days.find((d) => d.date === datePart(now)), now)
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const elevation = Math.round(forecast.elevation)
  const elevationText = `${elevation < 0 ? `−${Math.abs(elevation)}` : elevation} מ׳`
  const showSea = forecast.elevation < 50 || terrain.seaInView
  const placed = useMemo(() => placeMarks(place, { ...terrain, seaInView: showSea }, landmarks, sceneWidth),
    [place, terrain, landmarks, sceneWidth, showSea])
  const flat = useMemo(() => placed.filter((mark) => !isHillMark(mark)), [placed])
  const night = markLife.litShare > 0
  const hill = useMemo(() => hillScene(place, terrain, landmarks, placed, sceneWidth, markLife.litShare),
    [place, terrain, landmarks, placed, sceneWidth, markLife.litShare])
  const sunX = sun && !night && cloudCover < 80 && air.haze.farFade <= .5 ? sun.x * sceneWidth : null
  const label = [
    sun && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')

  return (
    <figure
      className={styles.scene}
      ref={sceneRef}
      role="img"
      aria-label={label}
      data-scene
      data-haze={air.haze.farFade > 0.5 ? 'heavy' : undefined}
      style={{ '--far-fade': air.haze.farFade.toFixed(2), '--near-fade': air.haze.nearFade.toFixed(2) } as CSSProperties}
    >
      {glow && <div className={`${styles.glow} ${styles[glow.side]}`} style={{ opacity: glow.opacity }} />}
      <Sun point={sun} date={datePart(at)} lat={lat} cloudCover={cloudCover} coin={air.sunCoin} />
      <svg className={`${styles.land} ${styles.landFar}`} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
        {air.heat.amplitude > 0 && <Shimmer id={shimmerId} amplitude={air.heat.amplitude} />}
        <path d={terrain.far} className={styles.far} filter={air.heat.amplitude > 0 ? `url(#${shimmerId})` : undefined} />
        <foreignObject x="0" y="72" width={SCENE_W} height="33" className={styles.mistObject}>
          <div className={styles.mist} style={{ '--mist': mist.toFixed(3), '--mist-color': mistColor } as CSSProperties} />
        </foreignObject>
      </svg>
      <Landmarks marks={flat} layer="far" life={markLife} readout={Boolean(readout)} fade={air.haze.farFade} />
      <svg className={`${styles.land} ${styles.landNear}`} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
        {showSea && (
          <line x1="96" x2="276" y1={terrain.seaY} y2={terrain.seaY} className={styles.sea} vectorEffect="non-scaling-stroke" />
        )}
        <path d={terrain.near} className={styles.near} />
      </svg>
      <Landmarks marks={flat} layer="near" life={markLife} readout={Boolean(readout)} fade={air.haze.nearFade} />
      <HillMarks marks={placed} settlement={hill.settlement} width={sceneWidth} ground={hill.ground} sunX={sunX} night={night} />
      <span className={styles.village} style={{ left: terrain.centerLeft, top: hill.centerY }} aria-hidden="true" />
      <span
        className={styles.depth}
        style={{ left: terrain.centerLeft, top: below ? terrain.seaY + 6
          : hill.settlement?.labelTop ?? Math.min(116, hill.centerY + 7) }}
        aria-hidden="true"
      >
        <bdi>{elevationText.replace(' מ׳', '')}</bdi> מ׳
      </span>
      {showSea && (
        <>
          <span className={styles.seaLabel} style={{ top: terrain.seaY - 14,
            ...(terrain.seaSide === 'west' ? { left: '6%', right: 'auto' }
              : terrain.seaSide === 'east' ? { right: '6%' } : {}) }} aria-hidden="true">פני הים</span>
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
