import type { PaintJob, PaintReply, PaintRequest } from './paintJob'
import type { Request } from './remoteEntry'

/** What the cache needs of a worker (a `Worker`, or a fake in tests). */
export interface WorkerLike {
  postMessage(message: PaintRequest): void
  onmessage: ((event: MessageEvent<PaintReply>) => void) | null
  onerror: ((event: ErrorEvent | Event) => void) | null
  terminate(): void
}

interface Queued { job: PaintJob; request: Request }
const partId = (id: string, part: PaintJob['part']) => `${id}:${part}`

/** One batch in flight and only the latest queued ask for each layer part. */
export class PaintQueue {
  private pending = new Map<string, Queued>()
  private pendingSince: number | null = null
  private inFlight: { batch: number; since: number; jobs: Map<string, Queued> } | null = null
  private batch = 0
  private waiters: (() => void)[] = []
  private stopped = false
  private readonly worker: WorkerLike
  private readonly now: () => number
  private readonly fail: (reason: string) => void

  constructor(worker: WorkerLike, now: () => number, fail: (reason: string) => void) {
    this.worker = worker
    this.now = now
    this.fail = fail
  }

  ask(job: PaintJob, request: Request) {
    const id = partId(job.id, job.part)
    const matches = (item: Queued | undefined) => item?.job.key === job.key
      && item.job.formKey === job.formKey && item.request.formless === request.formless
    if (matches(this.inFlight?.jobs.get(id))) {
      this.cancel(job.id, job.part)
      return false
    }
    const queued = matches(this.pending.get(id))
    this.pendingSince ??= this.now()
    this.pending.set(id, { job, request })
    return !queued
  }

  cancel(id: string, part: PaintJob['part']) {
    this.pending.delete(partId(id, part))
    if (!this.pending.size) this.pendingSince = null
  }

  prune(id: string) {
    for (const part of ['form', 'light'] as const) {
      this.cancel(id, part)
      this.inFlight?.jobs.delete(partId(id, part))
    }
  }

  flush() {
    if (this.stopped || this.inFlight || !this.pending.size) return
    const batch = ++this.batch
    this.inFlight = { batch, since: this.pendingSince ?? this.now(), jobs: this.pending }
    const jobs = [...this.pending.values()].map(({ job }) => job)
    this.pending = new Map()
    this.pendingSince = null
    try {
      this.worker.postMessage({ batch, jobs })
    } catch (error) {
      this.fail(String(error))
    }
  }

  complete(batch: number) {
    const flight = this.inFlight
    if (flight?.batch !== batch) return null
    this.inFlight = null
    return { latency: () => this.now() - flight.since,
      requestOf: (id: string, part: PaintJob['part']) => flight.jobs.get(partId(id, part))?.request }
  }

  settled() {
    return this.stopped || (!this.inFlight && !this.pending.size)
  }

  whenSettled(): Promise<void> {
    if (this.settled()) return Promise.resolve()
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  resolveIfSettled() {
    if (this.settled()) for (const resolve of this.waiters.splice(0)) resolve()
  }

  stop() {
    this.stopped = true
    this.pending.clear()
    this.pendingSince = null
    this.inFlight = null
    this.worker.terminate()
  }
}
