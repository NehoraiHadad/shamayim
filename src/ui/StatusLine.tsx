import { useEffect, useReducer, useRef, useState } from 'react'
import type { Freshness } from '../data/cache'
import type { FailureCause } from '../data/fetchFailure'
import type { LoadStatus } from '../data/useForecast'
import { freshnessText, type UpdateProblem } from '../text/status'
import { deriveProblem, LIVE_INITIAL, liveReducer } from './statusLive'
import styles from './StatusLine.module.css'

interface Props {
  status: LoadStatus
  freshness: Freshness | null
  fetchedAt: number | null
  /** Why the last update failed, if it did. */
  failure: FailureCause | null
  onRefresh: () => void
}

const MIN_SPIN_MS = 600
const DONE_MS = 1200
const ANNOUNCE_MS = 3000
type Phase = 'idle' | 'busy' | 'done'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
  return online
}

/** Announce refresh progress and connectivity transitions once after mount, clearing problem notices after ~3 s. */
function useLiveStatus(problem: UpdateProblem, fetchedAt: number | null, update: string): string {
  const [state, dispatch] = useReducer(liveReducer, LIVE_INITIAL)

  useEffect(() => {
    dispatch({ type: 'sync', problem, fetchedAt, update })
  }, [problem, fetchedAt, update])

  useEffect(() => {
    if (!state.notice || !state.delivered || update) return
    const timer = setTimeout(() => dispatch({ type: 'clear' }), ANNOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state.notice, state.delivered, update])

  return state.live
}

/** A tapped refresh spins for at least 600 ms so it is seen, then shows a check for 1.2 s on success. */
function usePhase(busy: boolean, failed: boolean, onRefresh: () => void): [Phase, () => void] {
  const [tail, setTail] = useState<'idle' | 'spinning' | 'done'>('idle')
  const since = useRef(0)

  useEffect(() => {
    if (busy || tail !== 'spinning') return
    const wait = Math.max(0, MIN_SPIN_MS - (Date.now() - since.current))
    const timer = setTimeout(() => setTail(failed ? 'idle' : 'done'), wait)
    return () => clearTimeout(timer)
  }, [busy, tail, failed])

  useEffect(() => {
    if (tail !== 'done') return
    const timer = setTimeout(() => setTail('idle'), DONE_MS)
    return () => clearTimeout(timer)
  }, [tail])

  const start = () => {
    since.current = Date.now()
    setTail('spinning')
    onRefresh()
  }
  const phase: Phase = busy || tail === 'spinning' ? 'busy' : tail === 'done' ? 'done' : 'idle'
  return [phase, start]
}

export function StatusLine({ status, freshness, fetchedAt, failure, onRefresh }: Props) {
  const online = useOnline()
  const problem = deriveProblem(online, failure, freshness)
  const offline = problem !== null
  const [phase, start] = usePhase(status === 'refreshing' || status === 'loading', Boolean(failure), onRefresh)
  const fresh = fetchedAt ? freshnessText(fetchedAt, problem) : { text: '', spoken: '' }
  const busy = phase === 'busy'
  /** What the refresh itself is doing, for screen readers; the spinner and the check say it visually. */
  const update = busy ? 'מעדכן…' : phase === 'done' ? 'עודכן עכשיו' : ''
  const live = useLiveStatus(problem, fetchedAt, update)
  /** Visible words only when the data's age matters (old or offline); otherwise the pill is a round icon button. */
  const text = phase === 'idle' ? fresh.text : ''
  const spoken = busy ? 'מעדכן את התחזית' : `${phase === 'done' ? 'עודכן עכשיו' : fresh.spoken}. רענון`

  return (
    <>
      <button
        type="button"
        className={`${styles.status} ${offline && phase === 'idle' ? styles.warn : ''} ${text ? '' : styles.iconOnly}`}
        onClick={busy ? undefined : start}
        aria-disabled={busy}
        aria-label={spoken}
      >
        <span className={styles.pill}>
          <svg className={`${styles.icon} ${busy ? styles.spin : ''}`} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            {phase === 'done' ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" />}
          </svg>
          {text && <span key={text} className={styles.text}>{text}</span>}
        </span>
      </button>
      {/* Mounts empty so assistive tech speaks the first transition; idle freshness is not re-read on every tick. */}
      <span className="visually-hidden" role="status">{live}</span>
    </>
  )
}
