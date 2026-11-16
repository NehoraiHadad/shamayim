import type { Freshness } from '../data/cache'
import type { LoadStatus } from '../data/useForecast'
import { updatedAgo } from '../text/format'
import styles from './StatusLine.module.css'

interface Props {
  status: LoadStatus
  freshness: Freshness | null
  fetchedAt: number | null
  hasError: boolean
  onRefresh: () => void
}

export function StatusLine({ status, freshness, fetchedAt, hasError, onRefresh }: Props) {
  const busy = status === 'refreshing' || status === 'loading'
  const text = busy
    ? 'מעדכן…'
    : fetchedAt
      ? hasError || freshness === 'stale' ? `${updatedAgo(fetchedAt)} · אין חיבור` : updatedAgo(fetchedAt)
      : ''
  return (
    <button
      type="button"
      className={`${styles.status} ${freshness === 'stale' || hasError ? styles.warn : ''}`}
      onClick={onRefresh}
      disabled={busy}
      aria-label={`${text}. רענון`}
    >
      <svg className={busy ? styles.spin : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" />
      </svg>
      <span>{text}</span>
    </button>
  )
}
