import { useEffect, useRef } from 'react'
import type { Place } from '../../config/place'
import { parseRadarIndex, RAINVIEWER_INDEX } from '../../data/overhead/sources'
import { createOverheadMap, fetchJson } from './mapRuntime'
import { weatherTimeline, type Frame, type Timeline } from './weatherLayers'
import type { WeatherStatus } from './weatherViewport'
import styles from './OverheadPage.module.css'

interface Props {
  place: Place
  frame?: Frame
  now: number
  onTimeline: (timeline: Timeline) => void
  onReady: () => void
  onMapError: () => void
  onStatus: (status: WeatherStatus) => void
}

export function OverheadMap({ place, frame, now, onTimeline, onReady, onMapError, onStatus }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const runtime = useRef<Awaited<ReturnType<typeof createOverheadMap>>>(null)
  const selection = useRef({ frame, now })

  useEffect(() => {
    selection.current = { frame, now }
    if (frame) runtime.current?.show(frame, now)
  }, [frame, now])

  useEffect(() => {
    const node = container.current
    if (!node) return
    const abort = new AbortController()
    const { signal } = abort
    const timeline = fetchJson(RAINVIEWER_INDEX, signal).then(parseRadarIndex).catch(() => null)
      .then((index) => {
        const data = weatherTimeline(index, Date.now())
        if (!signal.aborted) onTimeline(data)
        return data
      })
    const marker = document.createElement('span')
    marker.className = styles.village
    marker.setAttribute('aria-hidden', 'true')
    createOverheadMap({ container: node, marker, place, timeline, signal, onReady, onMapError, onStatus })
      .then((controller) => {
        if (signal.aborted) return
        runtime.current = controller
        const selected = selection.current
        if (selected.frame) controller.show(selected.frame, selected.now)
      })
      .catch(() => { if (!signal.aborted) onMapError() })
    return () => {
      abort.abort()
      runtime.current = null
    }
  }, [place, onTimeline, onReady, onMapError, onStatus])

  return <div className={styles.map} ref={container} dir="ltr" />
}
