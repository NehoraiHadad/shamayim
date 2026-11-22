export const SW_CHANNEL = 'shamayim-sw'
export const PROBE_MS = 300

type TabMessage =
  | { type: 'may-activate'; id: string }
  | { type: 'busy'; id: string }

export interface TabCoordinator {
  /** Ask peer tabs whether SW activation is safe now; calls `onResult(true)` if none reply `busy` within `PROBE_MS`. */
  probe: (onResult: (allowed: boolean) => void) => void
  /** Close the channel and cancel any in-flight probe. */
  close: () => void
}

const NOOP_COORDINATOR: TabCoordinator = {
  probe(onResult) { onResult(true) },
  close() {},
}

/** Coordinate SW activation across tabs over BroadcastChannel; falls back to immediate approval when unsupported. */
export function createTabCoordinator(isAllowed: () => boolean): TabCoordinator {
  if (typeof BroadcastChannel !== 'function') return NOOP_COORDINATOR
  let channel: BroadcastChannel
  try {
    channel = new BroadcastChannel(SW_CHANNEL)
  } catch {
    return NOOP_COORDINATOR
  }

  let closed = false
  let seq = 0
  let pending: { id: string; timer: ReturnType<typeof setTimeout>; finish: (allowed: boolean) => void } | null = null

  const onMessage = (event: MessageEvent) => {
    if (closed) return
    const msg = event.data as Partial<TabMessage> | null
    if (!msg || typeof msg.id !== 'string') return
    if (msg.type === 'may-activate') {
      if (!isAllowed()) channel.postMessage({ type: 'busy', id: msg.id } satisfies TabMessage)
      return
    }
    if (msg.type === 'busy' && pending?.id === msg.id) {
      const current = pending
      pending = null
      clearTimeout(current.timer)
      current.finish(false)
    }
  }
  channel.addEventListener('message', onMessage)

  return {
    probe(onResult) {
      if (closed || pending) return
      const id = `${Date.now()}-${++seq}-${Math.random().toString(36).slice(2, 8)}`
      const timer = setTimeout(() => {
        if (closed || pending?.id !== id) return
        pending = null
        onResult(true)
      }, PROBE_MS)
      pending = { id, timer, finish: onResult }
      channel.postMessage({ type: 'may-activate', id } satisfies TabMessage)
    },
    close() {
      if (closed) return
      closed = true
      if (pending) {
        clearTimeout(pending.timer)
        pending = null
      }
      channel.removeEventListener('message', onMessage)
      channel.close()
    },
  }
}
