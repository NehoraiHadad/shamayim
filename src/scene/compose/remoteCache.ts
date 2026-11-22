import type { LayerDesc } from '../model/types'
import { HAND, painterOf, type Hand, type Painter } from '../paint'
import type { Painted } from './layerCache'
import { deviceRect, formKeyOf, lightKeyOf, type PaintJob, type PaintReply, type PaintResult } from './paintJob'
import { PaintQueue, type WorkerLike } from './paintQueue'
import { accept, partsOf, peek, reuse, sameForm, type Entry, type Request } from './remoteEntry'

export type { WorkerLike } from './paintQueue'

/** The oldest job's wait, worker paint time, and whether more work is queued. */
export interface Arrival { latency: number; workerMs: number; settled: boolean }

export interface RemoteOptions {
  worker: WorkerLike
  painters?: (desc: LayerDesc) => Painter | undefined
  hand?: Hand
  now?: () => number
  /** A batch arrived and was taken in: the surface lays the layers again. */
  onArrive: (arrival: Arrival) => void
  /** The worker failed: the surface goes back to painting itself. */
  onFail: (reason: string) => void
}

/** Asks the worker for stale layer parts and displays the last compatible picture until a newer one arrives. */
export class RemoteCache {
  private entries = new Map<string, Entry>()
  private readonly queue: PaintQueue
  private readonly painters: NonNullable<RemoteOptions['painters']>
  private readonly options: RemoteOptions
  private failed = false

  constructor(options: RemoteOptions) {
    this.options = options
    this.painters = options.painters ?? painterOf
    this.queue = new PaintQueue(options.worker, options.now ?? (() => performance.now()), (reason) => this.fail(reason))
    options.worker.onmessage = (event) => this.receive(event.data)
    options.worker.onerror = () => this.fail('paint worker error')
  }

  fresh(desc: LayerDesc, dpr: number): boolean {
    const shown = this.entries.get(desc.id)?.shown?.request
    return shown?.formKey === formKeyOf(desc, dpr).key && shown.formless === this.formless(desc)
      && shown.lightKey === lightKeyOf(desc, this.painters(desc))
  }

  formless(desc: LayerDesc): boolean {
    return Boolean(desc.light && this.painters(desc)?.formless?.(desc))
  }

  /** Asks for stale parts and reports what was newly queued. */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const { ratio, key: formKey } = formKeyOf(desc, dpr)
    const entry = this.entries.get(desc.id)
    const request: Request = { formKey, ratio, desc, phase, rect: deviceRect(desc, ratio),
      lightKey: lightKeyOf(desc, this.painters(desc)), formless: this.formless(desc), generation: 1 }
    if (entry) {
      const unchanged = sameForm(entry.wanted, request) && entry.wanted.lightKey === request.lightKey
      request.generation = entry.wanted.generation + Number(!unchanged)
      entry.wanted = request
      return this.ask(entry)
    }
    const cold = { wanted: request, shown: null }
    this.entries.set(desc.id, cold)
    return this.ask(cold)
  }

  private ask(entry: Entry): Painted {
    reuse(entry)
    const request = entry.wanted
    const { desc, formKey, lightKey, formless, ratio, rect, phase } = request
    const same = sameForm(entry.shown?.request, request)
    const ask = (part: PaintJob['part'], key: string | null) => {
      if (key === null) return this.queue.cancel(desc.id, part)
      return this.queue.ask({ id: desc.id, part, key, formKey, desc, ratio, rect, phase,
        hand: this.options.hand ?? HAND }, request)
    }
    const form = ask('form', same || formless ? null : formKey)
    const light = ask('light', same && entry.shown?.request.lightKey === lightKey ? null : lightKey)
    if (form || (light && !same && formless)) return 'form'
    return light ? 'light' : 'none'
  }

  private receive(reply: PaintReply) {
    const batch = this.queue.complete(reply.batch)
    if (!batch || reply.error) {
      for (const { bitmap } of reply.results) bitmap.close()
      if (batch && reply.error) this.fail(reply.error)
      return
    }
    let workerMs = 0
    const results = new Map<Entry, { request: Request; parts: PaintResult[] }>()
    for (const result of reply.results) {
      workerMs += result.ms
      const entry = this.entries.get(result.id), request = batch.requestOf(result.id, result.part)
      if (!entry || !request) { result.bitmap.close(); continue }
      const received = results.get(entry)
      if (received) received.parts.push(result)
      else results.set(entry, { request, parts: [result] })
    }
    for (const [entry, { request, parts }] of results) {
      accept(entry, request, parts)
      // Promotion can replace a form that the queued light planned to reuse.
      this.ask(entry)
    }
    const latency = batch.latency()
    this.flush()
    this.options.onArrive({ latency, workerMs, settled: this.settled() })
    this.queue.resolveIfSettled()
  }

  private fail(reason: string) {
    if (this.failed) return
    this.failed = true
    this.queue.stop()
    this.options.onFail(reason)
    this.queue.resolveIfSettled()
  }

  flush() { this.queue.flush() }
  settled() { return this.queue.settled() }
  whenSettled() { return this.queue.whenSettled() }
  peek(id: string) { return peek(this.entries.get(id)) }
  get isFailed() { return this.failed }

  prune(keep: ReadonlySet<string>) {
    for (const [id, entry] of this.entries) {
      if (keep.has(id)) continue
      for (const bitmap of partsOf(entry.shown)) bitmap?.close()
      this.entries.delete(id)
      this.queue.prune(id)
    }
  }

  /** RGBA bytes of the retained bitmaps on the main thread. */
  bytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      for (const bitmap of partsOf(entry.shown)) if (bitmap) total += bitmap.width * bitmap.height * 4
    }
    return total
  }
}
