/**
 * Shared Planetary Computer SAS token fetcher with an independent AbortController deadline so a
 * hung token fetch or body read aborts, clears its in-flight slot, and never blocks later callers.
 */
const SAS_REFRESH_MARGIN_MS = 5 * 60_000

let cachedSas: { token: string; expiresAt: number } | null = null
let sasInFlight: Promise<string | null> | null = null

export function resetWorldCoverSasCache(): void { cachedSas = null; sasInFlight = null }

export function raceAbort<T>(p: Promise<T>, sig: AbortSignal): Promise<T> {
  if (sig.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    sig.addEventListener('abort', onAbort, { once: true })
    p.then(
      (v) => { sig.removeEventListener('abort', onAbort); resolve(v) },
      (e) => { sig.removeEventListener('abort', onAbort); reject(e) },
    )
  })
}

/** Runs `work` under an independent deadline, aborting and settling `null` even if `fetchImpl` ignores signals. */
export function withDeadline<T>(work: (sig: AbortSignal) => Promise<T | null>, ms: number, caller?: AbortSignal): Promise<T | null> {
  if (caller?.aborted) return Promise.resolve(null)
  const ctrl = new AbortController()
  const onCaller = () => ctrl.abort()
  caller?.addEventListener('abort', onCaller, { once: true })
  const timer = setTimeout(() => ctrl.abort(new DOMException('Asset deadline exceeded', 'TimeoutError')), ms)
  return raceAbort(work(ctrl.signal), ctrl.signal).catch(() => null).finally(() => {
    clearTimeout(timer); caller?.removeEventListener('abort', onCaller)
  })
}

async function runSasRequest(
  sasUrl: string, fetchImpl: typeof fetch, clock: () => number, reqSignal: AbortSignal, isGlobal: boolean,
): Promise<string | null> {
  const work = async (): Promise<string | null> => {
    try {
      const res = await fetchImpl(sasUrl, { signal: reqSignal })
      if (!res.ok) return null
      const body = (await res.json()) as { token?: string; 'msft:expiry'?: string }
      if (!body.token) return null
      const exp = Date.parse(body['msft:expiry'] ?? '')
      if (isGlobal && !reqSignal.aborted) {
        cachedSas = { token: body.token, expiresAt: Number.isFinite(exp) ? exp : clock() + 30 * 60_000 }
      }
      return body.token
    } catch { return null }
  }
  return raceAbort(work(), reqSignal).catch(() => null)
}

export async function fetchWorldCoverSasToken(
  sasUrl: string, fetchImpl: typeof fetch, clock: () => number,
  timeoutMs: number, defaultTimeoutMs: number, signal?: AbortSignal,
): Promise<string | null> {
  if (signal?.aborted) return null
  const isGlobal = fetchImpl === globalThis.fetch
  if (isGlobal && cachedSas && clock() + SAS_REFRESH_MARGIN_MS < cachedSas.expiresAt) return cachedSas.token
  if (!isGlobal) return runSasRequest(sasUrl, fetchImpl, clock, signal ?? new AbortController().signal, false)
  if (!sasInFlight) {
    const sasCtrl = new AbortController()
    const deadlineMs = timeoutMs > 0 && Number.isFinite(timeoutMs) ? Math.min(defaultTimeoutMs, timeoutMs) : defaultTimeoutMs
    const sasTimer = setTimeout(() => sasCtrl.abort(), deadlineMs)
    const p = runSasRequest(sasUrl, fetchImpl, clock, sasCtrl.signal, true).finally(() => {
      clearTimeout(sasTimer)
      if (sasInFlight === p) sasInFlight = null
    })
    sasInFlight = p
  }
  return signal ? raceAbort(sasInFlight, signal).catch(() => null) : sasInFlight
}
