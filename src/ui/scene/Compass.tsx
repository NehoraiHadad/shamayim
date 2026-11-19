import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { xOf, type Camera } from '../../domain/camera'
import styles from './Compass.module.css'

const LETTERS: Record<number, string> = { 0: 'צ', 90: 'מז', 180: 'ד', 270: 'מע' }
const STEP = 45
const NAMES = ['צפון', 'צפון־מזרח', 'מזרח', 'דרום־מזרח', 'דרום', 'דרום־מערב', 'מערב', 'צפון־מערב']
const nameOf = (heading: number) => NAMES[Math.round(heading / 45) % 8]

interface Props {
  camera: Camera
  /** The sun's azimuth while it is up, else null. */
  sunAzimuth: number | null
  /** Follow a finger (every move). */
  onDrag: (heading: number) => void
  /** Turn softly to a heading. */
  onGlide: (heading: number) => void
  /** Where the rain is (the nearest, or the one on its way here), and the line that says so; null when there is none. */
  rain?: { azimuth: number; text: string } | null
}

/**
 * Which way the view looks, and the way to turn it: a quiet rule along the top of the sky with the four letters where
 * those directions really are. Drag it and the land follows the finger (the scene's own drag stays time); the keyboard
 * turns by eighths. When the sun is out of view, a small sun at the edge says which way it is; a tap turns to it.
 */
export function Compass({ camera, sunAzimuth, onDrag, onGlide, rain = null }: Props) {
  const drag = useRef<{ id: number; x: number; heading: number; scale: number; moved: boolean } | null>(null)
  const pct = (az: number) => (xOf(az, camera) / camera.width) * 100
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const scale = e.currentTarget.getBoundingClientRect().width / camera.width
    drag.current = { id: e.pointerId, x: e.clientX, heading: camera.heading, scale, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d?.id !== e.pointerId) return
    e.stopPropagation()
    d.moved = true
    // The land follows the finger: dragging right brings what was on the left into the middle.
    onDrag(d.heading - (camera.handed * (e.clientX - d.x)) / (d.scale * camera.pxPerDeg))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const turn = { ArrowLeft: -STEP * camera.handed, ArrowRight: STEP * camera.handed }[e.key]
    if (turn === undefined) return
    e.preventDefault()
    onGlide(Math.round((camera.heading + turn) / STEP) * STEP)
  }
  const ticks: number[] = []
  for (let az = 0; az < 360; az += 15) {
    const at = pct(az)
    if (at >= 0 && at <= 100) ticks.push(az)
  }
  const sunPct = sunAzimuth === null ? null : pct(sunAzimuth)
  const sunSide = sunPct === null ? null : sunPct < 2 ? 'left' : sunPct > 98 ? 'right' : 'in'
  const rainPct = rain ? pct(rain.azimuth) : null
  const rainSide = rainPct === null ? null : rainPct < 4 ? 'left' : rainPct > 96 ? 'right' : 'in'
  return (
    <div className={styles.compass} role="slider" tabIndex={0} aria-label="כיוון המבט"
      aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(camera.heading)}
      aria-valuetext={`מבט ל${nameOf(camera.heading)}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      {ticks.map((az) => {
        const letter = LETTERS[az]
        const style = { left: `${pct(az).toFixed(2)}%` }
        return letter
          ? <span key={az} className={styles.letter} style={style}>{letter}</span>
          : <span key={az} className={az % 45 ? styles.tick : styles.major} style={style} />
      })}
      {rain && rainSide && (
        <button type="button" className={styles.rain} data-side={rainSide} aria-label={`להסתכל לגשם: ${rain.text}`}
          style={rainSide === 'in' ? { left: `${rainPct!.toFixed(2)}%` } : undefined}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onGlide(rain.azimuth)}>
          {rainSide === 'left' ? '‹' : null}<i aria-hidden="true" />{rainSide === 'right' ? '›' : null}
        </button>
      )}
      {rain && (
        <button type="button" className={styles.caption} onPointerDown={(e) => e.stopPropagation()} onClick={() => onGlide(rain.azimuth)}>
          {rain.text}
        </button>
      )}
      {sunSide && sunSide !== 'in' && (
        <button type="button" className={styles.sun} data-side={sunSide} aria-label="להסתכל לשמש"
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onGlide(sunAzimuth!)}>
          {sunSide === 'left' ? '‹' : null}<i />{sunSide === 'right' ? '›' : null}
        </button>
      )}
    </div>
  )
}
