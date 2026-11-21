export interface RequestToken {
  readonly signal: AbortSignal
  readonly isCurrent: () => boolean
}

export interface RequestGuard {
  /** Start a new request, invalidating and aborting any earlier one. */
  start: () => RequestToken
  /** Invalidate and abort the active request (e.g. on close, manual choice, or unmount). */
  cancel: () => void
}

/** Guards async callbacks (such as geolocation + reverse-geocode) against stale completions. */
export function createRequestGuard(): RequestGuard {
  let seq = 0
  let controller: AbortController | null = null

  const cancel = () => {
    seq += 1
    controller?.abort()
    controller = null
  }

  const start = (): RequestToken => {
    cancel()
    const id = seq
    const next = new AbortController()
    controller = next
    return {
      signal: next.signal,
      isCurrent: () => id === seq && !next.signal.aborted,
    }
  }

  return { start, cancel }
}
