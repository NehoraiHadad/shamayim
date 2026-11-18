import type { RadarState } from '../../domain/rainVerdict'
import { clockAt, frameAge, frameIsStale } from './timing'

/** What the headline can say about the radar: offline, failed, stale, still loading, or fine. */
export function radarState({ online, radarFailed, latestRadar, hasOutlook, slow, now, timezone }: {
  online: boolean
  /** The radar index or its tiles failed. */
  radarFailed: boolean
  /** The newest radar frame's epoch time, once the timeline is known. */
  latestRadar: number | null | undefined
  hasOutlook: boolean
  /** The page has waited long enough that a missing outlook is a failure, not loading. */
  slow: boolean
  now: number
  timezone: string
}): RadarState {
  if (!online) return { kind: 'offline' }
  if (radarFailed || latestRadar === null) return { kind: 'failed' }
  if (latestRadar !== undefined && frameIsStale(latestRadar, now)) {
    return { kind: 'stale', clock: clockAt(latestRadar, timezone), ago: frameAge(latestRadar, now) }
  }
  if (!hasOutlook) return slow ? { kind: 'failed' } : { kind: 'loading' }
  return { kind: 'ok' }
}

/**
 * The page's quiet problem line, for what the headline does not already say: the clouds or the basemap failed, or
 * images are still loading. Empty when all is well (offline and radar trouble are the headline's job).
 */
export function overheadStatus({ online, cloudFailed, mapFailed, ready }: {
  online: boolean
  cloudFailed: boolean
  mapFailed: boolean
  ready: boolean
}): string {
  if (!online) return ''
  if (mapFailed) return 'המפה לא נטענה. הגשם והעננים מוצגים בלי קווי חוף.'
  if (cloudFailed) return 'תמונת העננים לא נטענה. הגשם מוצג כרגיל.'
  return ready ? '' : 'טוען תמונות…'
}
