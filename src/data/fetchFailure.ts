/**
 * Why a forecast could not be fetched: the device's connection, a busy / failing service, or the service's request
 * limit for this network (Open-Meteo counts its free limits per IP address, so another network gets a fresh quota).
 */
export type FailureCause = 'network' | 'busy' | 'limit-hour' | 'limit-day'

export interface FetchFailure {
  cause: FailureCause
  message: string
}

/** A non-OK HTTP response, keeping its status so the cause can be told apart from a network error. */
export class HttpError extends Error {
  readonly status: number
  /** The service's own explanation, when it gave one (Open-Meteo: `{ "reason": "Daily API request limit exceeded…" }`). */
  readonly reason: string

  constructor(status: number, host: string, reason = '') {
    super(`HTTP ${status} for ${host}${reason ? `: ${reason}` : ''}`)
    this.name = 'HttpError'
    this.status = status
    this.reason = reason
  }
}

/** A 429 whose reason names a daily or hourly limit: retrying within seconds or minutes cannot help. */
function limitOf(err: HttpError): FailureCause | null {
  if (err.status !== 429) return null
  if (/daily/i.test(err.reason)) return 'limit-day'
  if (/hourly/i.test(err.reason)) return 'limit-hour'
  return null
}

/** Daily/hourly limits are told apart; other 429s and 5xx mean the service is busy; anything else is the network. */
export function toFetchFailure(err: unknown): FetchFailure {
  const message = err instanceof Error ? err.message : String(err)
  if (!(err instanceof HttpError)) return { cause: 'network', message }
  const cause = limitOf(err) ?? (err.status === 429 || err.status >= 500 ? 'busy' : 'network')
  return { cause, message }
}
