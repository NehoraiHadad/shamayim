import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Place } from '../../config/place'
import type { RadarOutlook } from '../../domain/outlookNow'
import { mapSentence, rainVerdict } from '../../domain/rainVerdict'
import { OverheadMap } from './OverheadMap'
import { RAIN_MAP } from './rainMapName'
import { RainLegend, TimeRail } from './TimeRail'
import { overheadStatus, radarState } from './overheadStatus'
import { clockAt, frameAge, frameIsStale } from './timing'
import { usePageEnv } from './usePageEnv'
import { usePlayback } from './usePlayback'
import { useSwipeClose } from './useSwipeClose'
import type { Timeline } from './weatherLayers'
import type { WeatherStatus } from './weatherViewport'
import styles from './OverheadPage.module.css'


interface Rain {
  /** The radar outlook as of now (null while unknown, or once its frame is too old). */
  outlook: RadarOutlook | null
  /** The model's first rainy clock time within three hours. */
  forecastRainAt: string | null
  /** The place's clock `minutes` from now. */
  clockIn: (minutes: number) => string
}

export function OverheadPage({ open, place, rain, onClose }: {
  open: boolean
  place: Place
  rain: Rain
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const title = useId()

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    // Start where the answer is: a screen reader reads the headline and its detail first.
    heading.current?.focus({ preventScroll: true })
    return () => {
      element.close()
      const entry = opener?.isConnected ? opener : element.closest('.app')?.querySelector<HTMLElement>('[data-overhead-entry]')
      entry?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <dialog ref={dialog} dir="rtl" aria-labelledby={title} className={styles.dialog}
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      {open && <OverheadContent place={place} rain={rain} title={title} heading={heading} onClose={onClose} />}
    </dialog>
  )
}

function OverheadContent({ place, rain, title, heading, onClose }: {
  place: Place
  rain: Rain
  title: string
  heading: React.RefObject<HTMLHeadingElement | null>
  onClose: () => void
}) {
  const { now, online, reduced, slow } = usePageEnv()
  const [timeline, setTimeline] = useState<Timeline>()
  const [ready, setReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [weather, setWeather] = useState<WeatherStatus>()
  const onReady = useCallback(() => setReady(true), [])
  const onMapError = useCallback(() => setMapFailed(true), [])
  const frames = timeline?.frames ?? []
  const { at, playing, choose, toggle } = usePlayback(frames.length, ready, reduced)
  const frame = frames[at]
  const radar = frame?.radar ?? null
  const shown = radar ?? frame?.cloud ?? null
  const latestRadar = timeline?.latest.radar
  const state = radarState({ online, radarFailed: Boolean(weather?.radarFailed), latestRadar,
    hasOutlook: Boolean(rain.outlook), slow, now, timezone: place.timezone })
  const verdict = rainVerdict(state, rain.outlook, rain.clockIn, rain.forecastRainAt)
  const status = overheadStatus({ online, cloudFailed: Boolean(weather?.cloudFailed), mapFailed, ready })
  const swipe = useSwipeClose(onClose)
  const time = shown === null ? null
    : { clock: clockAt(shown, place.timezone), ago: frameAge(shown, now), spoken: frameAge(shown, now, true) }

  return (
    <div className={styles.panel}>
      <header className={styles.heading} {...swipe}>
        <p className={styles.eyebrow}>{RAIN_MAP}</p>
        <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">✕</button>
      </header>
      <div className={styles.verdict} aria-live="polite" aria-atomic="true">
        <h2 id={title} ref={heading} tabIndex={-1} className={state.kind === 'loading' ? styles.waiting : undefined}>
          {verdict.headline}
        </h2>
        {verdict.detail && <p className={styles.detail}>{verdict.detail}</p>}
        {verdict.basis && <p className={styles.basis}>{verdict.basis}</p>}
        <p className="visually-hidden">{mapSentence(place.nameHe, state.kind === 'ok' ? rain.outlook : null)}</p>
      </div>
      <OverheadMap place={place} frame={frame} now={now} outlook={state.kind === 'ok' ? rain.outlook : null} onTimeline={setTimeline}
        onReady={onReady} onMapError={onMapError} onStatus={setWeather} />
      <div className={styles.details}>
        <TimeRail at={at} count={frames.length} time={time} start={frameAge(frames[0]?.radar ?? frames[0]?.cloud ?? null, now)}
          playing={playing} toggle={toggle} choose={choose} />
        <div className={styles.legend}>
          <RainLegend clear={weather?.echoes === 'clear' && radar !== null} stale={frameIsStale(latestRadar ?? null, now)}
            clouds={!weather?.cloudFailed} />
        </div>
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
