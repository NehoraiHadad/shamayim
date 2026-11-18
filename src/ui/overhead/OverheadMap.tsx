import { useEffect, useRef, useState } from 'react'
import type { Place } from '../../config/place'
import type { RainOutlook } from '../../domain/rainNowcast'
import { parseRadarIndex, RAINVIEWER_INDEX } from '../../data/overhead/sources'
import { forcedRain } from '../devParams'
import { createOverheadMap } from './mapRuntime'
import { fetchJson } from './mapSupport'
import type { Pointer } from './nowcastLayers'
import type { TilePainter } from './tileProtocols'
import marks from './MapMarks.module.css'
import { distance } from '../../domain/rainVerdict'
import { weatherTimeline, type Frame, type Timeline } from './weatherLayers'
import type { WeatherStatus } from './weatherViewport'
import styles from './OverheadPage.module.css'

interface Props {
  place: Place
  frame?: Frame
  now: number
  /** The outlook the headline speaks from; the map draws its motion arrow. */
  outlook: RainOutlook | null
  onTimeline: (timeline: Timeline) => void
  onReady: () => void
  onMapError: () => void
  onStatus: (status: WeatherStatus) => void
}

export function OverheadMap({ place, frame, now, outlook, onTimeline, onReady, onMapError, onStatus }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const runtime = useRef<Awaited<ReturnType<typeof createOverheadMap>>>(null)
  const selection = useRef({ frame, now })
  const latestOutlook = useRef(outlook)
  const [pointer, setPointer] = useState<Pointer | null>(null)

  useEffect(() => {
    latestOutlook.current = outlook
    runtime.current?.outlook(outlook)
  }, [outlook])

  useEffect(() => {
    selection.current = { frame, now }
    if (frame) runtime.current?.show(frame, now)
  }, [frame, now])

  useEffect(() => {
    const node = container.current
    if (!node) return
    const abort = new AbortController()
    const { signal } = abort
    // Dev `?rain=`: synthetic radar frames, painted instead of fetched.
    const rain = import.meta.env.DEV ? forcedRain() : null
    let painter: TilePainter | undefined
    const index = import.meta.env.DEV && rain
      ? import('../../data/overhead/syntheticRain').then((m) => {
        const start = Date.now()
        painter = m.syntheticPainter(m.parseRain(rain), [place.lon, place.lat], start)
        return m.syntheticIndex(start)
      })
      : fetchJson(RAINVIEWER_INDEX, signal).then(parseRadarIndex)
    const timeline = index.catch(() => null)
      .then((index) => {
        const data = weatherTimeline(index, Date.now())
        if (!signal.aborted) onTimeline(data)
        return data
      })
    createOverheadMap({ container: node, place, timeline, signal, onReady, onMapError, onStatus, onPointer: setPointer,
      painter: rain ? (url) => painter?.(url) ?? null : undefined })
      .then((controller) => {
        if (signal.aborted) return
        runtime.current = controller
        controller.outlook(latestOutlook.current)
        const selected = selection.current
        if (selected.frame) controller.show(selected.frame, selected.now)
      })
      .catch(() => { if (!signal.aborted) onMapError() })
    return () => {
      abort.abort()
      runtime.current = null
    }
  }, [place, onTimeline, onReady, onMapError, onStatus])

  return (
    <div className={styles.map}>
      {/* MapLibre owns this element; the pointer chip is its sibling. Inline position beats maplibregl-map's. */}
      <div ref={container} dir="ltr" style={{ position: 'absolute', inset: 0 }} />
      {pointer && (
        <span className={`${marks.halo} ${marks.pointer}`} dir="rtl" aria-hidden="true"
          style={{ left: pointer.x, top: pointer.y, flexDirection: Math.abs(pointer.angle) < 90 ? 'row' : 'row-reverse' }}>
          {/* The chevron sits on the side the rain is: first (right, in RTL) when it lies east. */}
          <svg viewBox="0 0 10 10" width="10" height="10" style={{ transform: `rotate(${pointer.angle}deg)` }}>
            <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          גשם · {distance(pointer.km)}
        </span>
      )}
    </div>
  )
}
