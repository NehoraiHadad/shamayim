/** Why a forecast could not be fetched: the device's connection, or a busy / failing service. */
export type FailureCause = 'network' | 'busy'

export interface FetchFailure {
  cause: FailureCause
  message: string
}

/** A non-OK HTTP response, keeping its status so the cause can be told apart from a network error. */
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, host: string) {
    super(`HTTP ${status} for ${host}`)
    this.name = 'HttpError'
    this.status = status
  }
}

/** Rate limits (429) and server errors (5xx) mean the service is busy; anything else is treated as the network. */
export function toFetchFailure(err: unknown): FetchFailure {
  const busy = err instanceof HttpError && (err.status === 429 || err.status >= 500)
  return { cause: busy ? 'busy' : 'network', message: err instanceof Error ? err.message : String(err) }
}
