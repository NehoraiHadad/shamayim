import type { PaintJob, PaintReply, PaintRequest } from './paintJob'
import type { Request } from './remoteEntry'
import { RemoteQueue } from './remoteQueue'

/** What the cache needs of a worker (a `Worker`, or a fake in tests). */
export interface WorkerLike {
  postMessage(message: PaintRequest): void
  onmessage: ((event: MessageEvent<PaintReply>) => void) | null
  onerror: ((event: ErrorEvent | Event) => void) | null
  terminate(): void
}

interface Queued { job: PaintJob; request: Request; final: boolean }
const partId = (id: string, part: PaintJob['part']) => `${id}:${part}`

/**
 * One batch in flight and only the latest queued ask for each layer part. The order is `RemoteQueue`'s: single-frame
 * jobs (terrain, static layers, scrub light) go first, multi-frame strips go in bounded pose chunks so a new ask
 * preempts a strip after at most one chunk; each queued part carries the request its reply is judged against.
 */
export class PaintQueue {
  private pending = new RemoteQueue()
  private requests = new Map<string, Request>()
  private inFlight: { batch: number; since: number; jobs: Map<string, Queued> } | null = null
  private batch = 0
  private waiters: (() => void)[] = []
  private stopped = false
  private fillCanopies = false
  private fillTimer: ReturnType<typeof setTimeout> | undefined

  private deferCanopies() {
    this.fillCanopies = false
    clearTimeout(this.fillTimer)
    this.fillTimer = undefined
  }
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
    const sent = this.inFlight?.jobs.get(id)
    if (sent?.final && sent.job.key === job.key && sent.job.formKey === job.formKey && sent.request.formless === request.formless) {
      // The original job can satisfy a scrub back to these keys. Keep its request for the reply.
      this.cancel(job.id, job.part)
      return false
    }
    const added = this.pending.ask(job, this.now())
    if (added) this.deferCanopies()
    if (this.pending.has(id)) this.requests.set(id, request)
    return added
  }

  cancel(id: string, part: PaintJob['part']) {
    this.pending.drop(partId(id, part))
    this.requests.delete(partId(id, part))
  }

  prune(id: string) {
    for (const part of ['form', 'light'] as const) {
      this.cancel(id, part)
      this.inFlight?.jobs.delete(partId(id, part))
    }
  }

  flush() {
    if (this.stopped || this.inFlight) return
    const next = this.pending.takeBatch(this.now(), this.fillCanopies)
    if (!next) {
      if (this.pending.size && this.fillTimer === undefined) {
        // Let a rapid scrub publish fresh frame-zero poses without filling superseded strips.
        this.fillTimer = setTimeout(() => {
          this.fillTimer = undefined
          this.fillCanopies = true
          this.flush()
        }, 80)
      }
      return
    }
    const batch = ++this.batch
    const jobs = new Map<string, Queued>()
    for (const job of next.jobs) {
      const id = partId(job.id, job.part), final = job.final !== false
      jobs.set(id, { job, request: this.requests.get(id)!, final })
      if (final) this.requests.delete(id)
    }
    this.inFlight = { batch, since: next.since, jobs }
    try {
      this.worker.postMessage({ batch, jobs: next.jobs })
    } catch (error) {
      this.fail(String(error))
    }
  }

  complete(batch: number) {
    const flight = this.inFlight
    if (flight?.batch !== batch) return null
    this.inFlight = null
    this.pending.finishBatch()
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
    if (!this.settled()) return
    this.deferCanopies()
    for (const resolve of this.waiters.splice(0)) resolve()
  }

  stop() {
    this.stopped = true
    this.deferCanopies()
    this.pending.clear()
    this.requests.clear()
    this.inFlight = null
    this.worker.terminate()
  }
}
