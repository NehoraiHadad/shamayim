import type { LayerDesc } from '../model/types'
import type { Painter } from '../paint/contract'
import { HAND, type Hand } from '../paint/hand'
import { DEFAULT_STYLE, painterOf, type SceneStyle } from '../paint/styles'
import type { Painted } from './layerCache'
import { deviceRect, formKeyOf, lightKeyOf, resultBitmaps, type PaintJob, type PaintReply } from './paintJob'
import { receiverJob, shadeKeyOf } from './paintReceiver'
import { PaintQueue, type WorkerLike } from './paintQueue'
import { accept, closeEntry, isStaged, partsOf, peek, pruneStaged, reuse, sameForm, samePaint, stage, type Entry, type Request } from './remoteEntry'
import { collectParts } from './remoteReceipt'

export type { WorkerLike } from './paintQueue'

/** An arrival's oldest wait, Worker paint time, completion status and effect on the visible cache. */
export interface Arrival { latency: number; workerMs: number; settled: boolean; changed: boolean }

export interface RemoteOptions {
  worker: WorkerLike
  painters?: (desc: LayerDesc, style: SceneStyle) => Painter | undefined
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
  /** The scene's hand (`LayerCache.style`), sent with every job. */
  style = DEFAULT_STYLE
  private readonly painters: NonNullable<RemoteOptions['painters']>
  private readonly options: RemoteOptions
  private failed = false
  /** Worker time of strip chunks staged since the last arrival, reported with the batch that completes them. */
  private stagedWorkerMs = 0

  constructor(options: RemoteOptions) {
    this.options = options
    this.painters = options.painters ?? painterOf
    this.queue = new PaintQueue(options.worker, options.now ?? (() => performance.now()), (reason) => this.fail(reason))
    options.worker.onmessage = (event) => this.receive(event.data)
    options.worker.onerror = () => this.fail('paint worker error')
  }

  fresh(desc: LayerDesc, dpr: number): boolean {
    const shown = this.entries.get(desc.id)?.shown
    return shown?.request.formKey === formKeyOf(desc, dpr, this.style).key && shown.request.formless === this.formless(desc)
      && shown.request.lightKey === lightKeyOf(desc, this.painters(desc, this.style), this.style) && (!shadeKeyOf(desc) || Boolean(shown.shade))
  }

  formless(desc: LayerDesc): boolean {
    return Boolean(desc.light && this.painters(desc, this.style)?.formless?.(desc))
  }

  /** Asks for stale parts and reports what was newly queued. */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const { ratio, key: formKey } = formKeyOf(desc, dpr, this.style)
    const entry = this.entries.get(desc.id)
    const request: Request = { formKey, ratio, desc, phase, rect: deviceRect(desc, ratio),
      lightKey: lightKeyOf(desc, this.painters(desc, this.style), this.style), formless: this.formless(desc), generation: 1 }
    if (entry) {
      const unchanged = samePaint(entry.wanted, request)
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
    pruneStaged(entry)
    const request = entry.wanted
    const { desc, formKey, lightKey, formless, ratio, rect, phase } = request
    const same = sameForm(entry.shown?.request, request)
    const ask = (part: PaintJob['part'], key: string | null) => {
      if (key === null) return this.queue.cancel(desc.id, part)
      return this.queue.ask({ id: desc.id, part, key, formKey, ratio, rect, phase, hand: this.options.hand ?? HAND, style: this.style,
        ...receiverJob(desc, part, formless, same, Boolean(entry.shown)) }, request)
    }
    const form = ask('form', same || formless || isStaged(entry, 'form') ? null : formKey)
    const light = ask('light', (same && !entry.shown?.preview && entry.shown?.request.lightKey === lightKey) || isStaged(entry, 'light') ? null : lightKey)
    if (form || (light && !same && formless)) return 'form'
    return light ? 'light' : 'none'
  }

  private receive(reply: PaintReply) {
    const batch = this.queue.complete(reply.batch)
    if (!batch || reply.error) {
      for (const bitmap of reply.results.flatMap(resultBitmaps)) bitmap?.close()
      if (batch && reply.error) this.fail(reply.error)
      return
    }
    const { arrived, workerMs } = collectParts(reply.results, this.entries, batch.requestOf)
    this.stagedWorkerMs += workerMs
    let changed = false
    for (const [entry, { request, parts }] of arrived) {
      const whole = stage(entry, request, parts)
      if (whole && accept(entry, request, whole)) changed = true
      // Promotion can replace a form that the queued light planned to reuse.
      this.ask(entry)
    }
    const latency = batch.latency()
    this.flush()
    const settled = this.settled()
    if (arrived.size) {
      const workerMs = this.stagedWorkerMs
      this.stagedWorkerMs = 0
      this.options.onArrive({ latency, workerMs, settled, changed })
    } else if (settled) this.stagedWorkerMs = 0
    this.queue.resolveIfSettled()
  }

  private fail(reason: string) {
    if (this.failed) return
    this.failed = true
    this.queue.stop()
    this.prune(new Set())
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
      closeEntry(entry)
      this.entries.delete(id)
      this.queue.prune(id)
    }
  }

  /** RGBA bytes of the retained bitmaps on the main thread. */
  bytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      for (const bitmap of partsOf(entry.shown, entry.staged)) if (bitmap) total += bitmap.width * bitmap.height * 4
    }
    return total
  }
}
