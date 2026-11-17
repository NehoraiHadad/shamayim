import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { AirState } from '../../atmo/airTypes'
import type { MarkLife, Landmark } from '../../data/landmarks/types'
import { placeMarks } from '../../data/landmarks/placeMarks'
import type { SceneTerrain } from '../../data/terrain/terrain'
import type { Place } from '../../config/place'
import { clockOf, datePart } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import { isolateNumbers } from '../isolateNumbers'
import { nextSunEvent, twilight } from './sceneModel'
import { Shimmer } from './Shimmer'
import { Sun } from './Sun'
import { SCENE_H, SCENE_W, sunPosition } from './sunPath'
import { HillMarks } from './marks/HillMarks'
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
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
}

/** West–east cross-section through the place (hand-drawn for Shadmot Mehola, sampled elsewhere). */
export function ValleyScene({ forecast, now, selected, lat, readout = null, air, cloudCover, terrain, mist = 0,
  mistColor = '#C9D2D8', place, landmarks, markLife, first, last, onScrub, onRelease, onNow }: Props) {
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
  const glow = twilight(day, at)
  const event = nextSunEvent(forecast.days, now)
  const below = forecast.elevation < 0
  const elevation = Math.round(forecast.elevation)
  const elevationText = `${elevation < 0 ? `−${Math.abs(elevation)}` : elevation} מ׳`
  const showSea = forecast.elevation < 50 || terrain.seaInView
  const placed = useMemo(() => placeMarks(place, { ...terrain, seaInView: showSea }, landmarks, sceneWidth),
    [place, terrain, landmarks, sceneWidth, showSea])
  const night = markLife.litShare > 0
  const hill = useMemo(() => hillScene({ place, terrain, landmarks, placed, width: sceneWidth, litShare: markLife.litShare,
    label: { text: elevationText, below } }),
  [place, terrain, landmarks, placed, sceneWidth, markLife.litShare, elevationText, below])
  const sunX = sun && !night && cloudCover < 80 && air.haze.farFade <= .5 ? sun.x * sceneWidth : null
  const label = [
    sun && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    below ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')
  const drag = useRef<{ id: number; x: number; at: LocalTime } | null>(null)
  const clampTime = (time: LocalTime) => time < first ? first : time > last ? last : time
  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { id: e.pointerId, x: e.clientX, at }; e.currentTarget.setPointerCapture(e.pointerId)
  }
  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    onScrub(clampTime(addMinutes(drag.current.at, (drag.current.x - e.clientX) * 4)))
  }
  const pointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); onRelease()
  }
  const sliderKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.key === 'ArrowLeft' ? addMinutes(at, 60) : e.key === 'ArrowRight' ? addMinutes(at, -60)
      : e.key === 'Home' ? first : e.key === 'End' ? last : null
    if (e.key === 'Escape') { e.preventDefault(); onNow(); return }
    if (!target) return
    e.preventDefault(); onScrub(clampTime(target)); onRelease()
  }

  return (
    <figure
      className={styles.scene}
      ref={sceneRef}
      role="group"
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
      <HillMarks layer="far" marks={hill.marks} settlement={null} width={sceneWidth} ground={hill.farGround} sunX={null}
        night={night} life={markLife} readout={Boolean(readout)} />
      <svg className={`${styles.land} ${styles.landNear}`} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none" aria-hidden="true">
        {showSea && (
          <line x1="96" x2="276" y1={terrain.seaY} y2={terrain.seaY} className={styles.sea} vectorEffect="non-scaling-stroke" />
        )}
        <path d={terrain.near} className={styles.near} />
      </svg>
      <HillMarks marks={hill.marks} settlement={hill.settlement} width={sceneWidth} ground={hill.ground} sunX={sunX} night={night}
        life={markLife} readout={Boolean(readout)} />
      <span className={styles.village} style={{ left: terrain.centerLeft, top: hill.centerY }} aria-hidden="true" />
      <span
        className={styles.depth}
        style={{ left: hill.label.x, top: hill.label.y }}
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
        <span className={styles.readout} aria-hidden="true"><bdi>{clockOf(at)}</bdi> · {isolateNumbers(readout)}
          <button type="button" onClick={onNow}>עכשיו</button></span>
      )}
      <div className={styles.scrubber} role="slider" tabIndex={0} aria-label="שעה בעמק"
        aria-valuemin={minutesBetweenLocal(now, first)} aria-valuemax={minutesBetweenLocal(now, last)}
        aria-valuenow={minutesBetweenLocal(now, at)} aria-valuetext={readout ? `${clockOf(at)}, ${readout}` : `עכשיו, ${clockOf(now)}`}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
        onKeyDown={sliderKey} />
    </figure>
  )
}
