import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { xOf, type Camera } from '../../domain/camera'
import styles from './Compass.module.css'

const POINTS: { az: number; label: string; name: string }[] = [
  { az: 0, label: 'צ', name: 'צפון' }, { az: 45, label: '·', name: '' }, { az: 90, label: 'מז', name: 'מזרח' },
  { az: 135, label: '·', name: '' }, { az: 180, label: 'ד', name: 'דרום' }, { az: 225, label: '·', name: '' },
  { az: 270, label: 'מע', name: 'מערב' }, { az: 315, label: '·', name: '' },
]
const STEP = 15
const nameOf = (heading: number) => ['צפון', 'צפון־מזרח', 'מזרח', 'דרום־מזרח', 'דרום', 'דרום־מערב', 'מערב', 'צפון־מערב'][Math.round(heading / 45) % 8]

interface Props {
  camera: Camera
  /** The sun's azimuth while it is up, else null. */
  sunAzimuth: number | null
  onTurn: (heading: number) => void
}

/**
 * Which way the view looks, and the way to turn it (the scene itself keeps its drag for time). The letters stand where
 * those directions are; drag the strip and the land follows the finger, or step with the arrows or the keyboard.
 * When the sun is out of view, a sun mark at the edge says which way it is; a tap turns the view to it.
 */
export function Compass({ camera, sunAzimuth, onTurn }: Props) {
  const drag = useRef<{ id: number; x: number; heading: number; scale: number } | null>(null)
  const pct = (az: number) => (xOf(az, camera) / camera.width) * 100
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const scale = e.currentTarget.getBoundingClientRect().width / camera.width
    drag.current = { id: e.pointerId, x: e.clientX, heading: camera.heading, scale }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d?.id !== e.pointerId) return
    e.stopPropagation()
    // The land follows the finger: dragging right brings what was on the left into the middle.
    onTurn(d.heading - (camera.handed * (e.clientX - d.x)) / (d.scale * camera.pxPerDeg))
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
    onTurn(camera.heading + turn)
  }
  const sunPct = sunAzimuth === null ? null : pct(sunAzimuth)
  const sunOut = sunPct !== null && (sunPct < 0 || sunPct > 100)
  return (
    <div className={styles.compass} role="slider" tabIndex={0} aria-label="כיוון המבט"
      aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(camera.heading)}
      aria-valuetext={`מבט ל${nameOf(camera.heading)}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      {POINTS.map(({ az, label }) => {
        const at = pct(az)
        return at < -2 || at > 102 ? null
          : <span key={az} className={label === '·' ? styles.tick : styles.letter} style={{ left: `${at.toFixed(2)}%` }}
            data-heading={az === camera.heading || undefined}>{label}</span>
      })}
      {sunPct !== null && (
        <button type="button" className={styles.sun} aria-label="להסתכל לשמש"
          style={{ left: `${Math.min(97, Math.max(3, sunPct)).toFixed(2)}%` }} data-out={sunOut || undefined}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onTurn(sunAzimuth!)}>
          {sunOut ? (sunPct! < 0 ? '☀›' : '‹☀') : '☀'}
        </button>
      )}
      <button type="button" className={styles.arrow} data-side="left" aria-label="לסובב שמאלה"
        onPointerDown={(e) => e.stopPropagation()} onClick={() => onTurn(camera.heading - STEP * camera.handed)}>‹</button>
      <button type="button" className={styles.arrow} data-side="right" aria-label="לסובב ימינה"
        onPointerDown={(e) => e.stopPropagation()} onClick={() => onTurn(camera.heading + STEP * camera.handed)}>›</button>
    </div>
  )
}
