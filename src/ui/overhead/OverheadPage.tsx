import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Place } from '../../config/place'
import { OverheadMap } from './OverheadMap'
import { RainLegend, TimeRail } from './TimeRail'
import { frameAge, frameIsStale } from './timing'
import { usePlayback } from './usePlayback'
import type { Timeline } from './weatherLayers'
import type { WeatherStatus } from './weatherViewport'
import styles from './OverheadPage.module.css'

export function OverheadPage({ open, place, story, onClose }: {
  open: boolean
  place: Place
  story: string | null
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const title = useId()

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    close.current?.focus({ preventScroll: true })
    return () => {
      element.close()
      const entry = opener?.isConnected ? opener : element.closest('.app')?.querySelector<HTMLElement>('[data-overhead-entry]')
      entry?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <dialog ref={dialog} dir="rtl" aria-labelledby={title} className={styles.dialog}
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      {open && <OverheadContent place={place} story={story} title={title} close={close} onClose={onClose} />}
    </dialog>
  )
}

function OverheadContent({ place, story, title, close, onClose }: {
  place: Place
  story: string | null
  title: string
  close: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [now, setNow] = useState(Date.now)
  const [online, setOnline] = useState(() => navigator.onLine)
  const motion = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => matchMedia(motion).matches)
  const [timeline, setTimeline] = useState<Timeline>()
  const [ready, setReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [weather, setWeather] = useState<WeatherStatus>()
  const onReady = useCallback(() => setReady(true), [])
  const onMapError = useCallback(() => setMapFailed(true), [])
  const drag = useRef<{ pointer: number; x: number; y: number }>(null)
  const frames = timeline?.frames ?? []
  const { at, choose } = usePlayback(frames.length, ready, reduced)
  const frame = frames[at]
  const radar = frame?.radar ?? null
  const cloud = frame?.cloud ?? null
  const stale = frameIsStale(timeline?.latest.radar ?? null, now)

  useEffect(() => {
    const network = () => setOnline(navigator.onLine)
    const preference = matchMedia(motion)
    const changeMotion = () => setReduced(preference.matches)
    const clock = setInterval(() => setNow(Date.now()), 15_000)
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    preference.addEventListener('change', changeMotion)
    return () => {
      clearInterval(clock)
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
      preference.removeEventListener('change', changeMotion)
    }
  }, [])

  const failed = [
    ((timeline && radar === null) || weather?.radarFailed) && 'מכ״ם',
    weather?.cloudFailed && 'לוויין',
    mapFailed && 'מפה',
  ].filter(Boolean)
  const status = !online ? 'אין חיבור'
    : failed.length ? `לא הצלחנו לטעון ${failed.join(' · ')}`
      : !ready ? 'טוען תמונות…' : ''

  return (
    <div className={styles.panel}>
      <header className={styles.heading}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' || (event.target as HTMLElement).closest('button')) return
          drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { drag.current = null }}
        onPointerUp={(event) => {
          const start = drag.current
          drag.current = null
          if (start?.pointer !== event.pointerId) return
          const dy = event.clientY - start.y
          if (dy > 56 && dy > Math.abs(event.clientX - start.x)) onClose()
        }}>
        <h2 id={title}>מבט מלמעלה</h2>
        <button type="button" ref={close} className={styles.close} onClick={onClose} aria-label="סגירה">✕</button>
      </header>
      {/* Always rendered so the panel's grid rows stay put while the radar loads. */}
      <p className={styles.story} aria-live="polite">{story}</p>
      <OverheadMap place={place} frame={frame} now={now} onTimeline={setTimeline}
        onReady={onReady} onMapError={onMapError} onStatus={setWeather} />
      <div className={styles.details}>
        <TimeRail at={at} count={frames.length} age={frameAge(radar ?? cloud, now)} reduced={reduced} choose={choose} />
        <div className={styles.legend}><RainLegend clear={weather?.echoes === 'clear' && radar !== null} stale={stale} /></div>
        <p className={styles.ages}>ענן: {frameAge(cloud, now)} · גשם: {frameAge(radar, now)}</p>
        <p className={styles.status} role="status">{status}</p>
      </div>
      <footer className={styles.attribution}>
        מכ״ם: <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>{', '}
        לוויין: <a href="https://www.eumetsat.int/" target="_blank" rel="noreferrer">© EUMETSAT 2026</a>{', '}
        מפה: <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a>{', '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      </footer>
    </div>
  )
}
