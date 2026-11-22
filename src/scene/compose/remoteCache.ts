import type { LayerDesc } from '../model/types'
import { HAND, painterOf, type Hand, type Painter } from '../paint'
import type { Painted } from './layerCache'
import { deviceRect, formKeyOf, lightJobDesc, lightKeyOf, type DeviceRect, type PaintJob, type PaintReply, type PaintRequest } from './paintJob'
import { RemoteQueue } from './remoteQueue'

/** What the cache needs of a worker (a `Worker`, or a fake in tests). */
export interface WorkerLike {
  postMessage(message: PaintRequest): void
  onmessage: ((event: MessageEvent<PaintReply>) => void) | null
  onerror: ((event: ErrorEvent | Event) => void) | null
  terminate(): void
}

interface Shown { key: string; formKey: string; bitmap: ImageBitmap | null; ratio: number; rect: DeviceRect }

interface Entry {
  formKey: string
  lightKey: string | null
  ratio: number
  rect: DeviceRect
  form: Shown | null
  light: Shown | null
}

/** One batch's arrival: the main thread's time to take it in (the composite is the surface's), the oldest job's wait. */
export interface Arrival { latency: number; workerMs: number; settled: boolean }

export interface RemoteOptions {
  worker: WorkerLike
  painters?: (desc: LayerDesc) => Painter | undefined
  hand?: Hand
  now?: () => number
  onArrive: (arrival: Arrival) => void
  onFail: (reason: string) => void
}

/**
 * Off-thread layer cache (§1d) backed by `paintWorker.ts`. Single-frame layers (terrain, static marks, scrub light)
 * always dispatch ahead of multi-frame strips, and strips paint in bounded pose chunks (`RemoteQueue`) so newly
 * arriving terrain or scrub updates preempt an in-flight strip after at most one short chunk.
 */
export class RemoteCache {
  private entries = new Map<string, Entry>()
  private queue = new RemoteQueue()
  private inFlight: { batch: number; since: number } | null = null
  private stagedWorkerMs = 0
  private batch = 0
  private waiters: (() => void)[] = []
  private failed = false
  private readonly worker: WorkerLike
  private readonly painters: (desc: LayerDesc) => Painter | undefined
  private readonly hand: Hand
  private readonly now: () => number
  private readonly options: RemoteOptions

  constructor(options: RemoteOptions) {
    this.options = options
    this.worker = options.worker
    this.painters = options.painters ?? painterOf
    this.hand = options.hand ?? HAND
    this.now = options.now ?? (() => performance.now())
    this.worker.onmessage = (event) => this.receive(event.data)
    this.worker.onerror = () => this.fail('paint worker error')
  }

  fresh(desc: LayerDesc, dpr: number): boolean {
    const entry = this.entries.get(desc.id)
    const formKey = formKeyOf(desc, dpr).key, lightKey = lightKeyOf(desc, this.painters(desc))
    return Boolean(entry && entry.form?.key === formKey && (lightKey === null
      || (entry.light?.key === lightKey && entry.light.formKey === formKey)))
  }

  formless(desc: LayerDesc): boolean {
    return Boolean(desc.light && this.painters(desc)?.formless?.(desc))
  }

  /** Asks for what is stale of a layer (`none` when fresh or already queued/finishing for the same keys). */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const painter = this.painters(desc)
    const { ratio, key: formKey } = formKeyOf(desc, dpr)
    const lightKey = lightKeyOf(desc, painter)
    let entry = this.entries.get(desc.id)
    if (!entry) {
      entry = { formKey: '', lightKey: null, ratio, rect: deviceRect(desc, ratio), form: null, light: null }
      this.entries.set(desc.id, entry)
    }
    entry.formKey = formKey
    entry.lightKey = lightKey
    entry.ratio = ratio
    entry.rect = deviceRect(desc, ratio)
    if (this.fresh(desc, dpr)) { this.queue.dropLayer(desc.id); return 'none' }
    const now = this.now()
    const job = (part: 'form' | 'light', key: string): PaintJob =>
      ({ id: desc.id, part, key, formKey, desc: part === 'light' ? lightJobDesc(desc) : desc, ratio, rect: entry.rect, phase, hand: this.hand })
    let painted: Painted = 'none'
    if (entry.form?.key !== formKey) {
      if (this.formless(desc)) {
        entry.form = { key: formKey, formKey, bitmap: null, ratio, rect: entry.rect }
        this.queue.drop(`${desc.id}:form`)
        painted = 'form'
      } else if (this.queue.ask(job('form', formKey), now)) painted = 'form'
    } else this.queue.drop(`${desc.id}:form`)
    if (lightKey !== null && (entry.light?.key !== lightKey || entry.light.formKey !== formKey)) {
      if (this.queue.ask(job('light', lightKey), now) && painted === 'none') painted = 'light'
    } else this.queue.drop(`${desc.id}:light`)
    return painted
  }

  /** Sends the next batch (single-frame jobs first, else one bounded strip chunk) unless a batch is already in flight. */
  flush() {
    if (this.failed || this.inFlight) return
    const next = this.queue.takeBatch(this.now())
    if (!next) return
    this.inFlight = { batch: ++this.batch, since: next.since }
    try {
      this.worker.postMessage({ batch: this.inFlight.batch, jobs: next.jobs })
    } catch (error) {
      this.fail(String(error))
    }
  }

  private receive(reply: PaintReply) {
    if (this.failed) { for (const r of reply.results) r.bitmap?.close(); return }
    if (reply.error) { this.fail(reply.error); return }
    let hasBitmap = false
    for (const r of reply.results) {
      this.stagedWorkerMs += r.ms
      if (!r.bitmap) continue
      const entry = this.entries.get(r.id)
      if (!entry) { r.bitmap.close(); continue }
      hasBitmap = true
      const shown: Shown = { key: r.key, formKey: r.formKey, bitmap: r.bitmap, ratio: r.ratio, rect: r.rect }
      const old = r.part === 'form' ? entry.form : entry.light
      old?.bitmap?.close()
      if (r.part === 'form') entry.form = shown
      else entry.light = shown
    }
    const latency = this.now() - (this.inFlight?.since ?? this.now())
    this.inFlight = null
    this.queue.finishBatch()
    this.flush()
    const settled = this.settled()
    if (hasBitmap) {
      const workerMs = this.stagedWorkerMs
      this.stagedWorkerMs = 0
      this.options.onArrive({ latency, workerMs, settled })
    } else if (settled) this.stagedWorkerMs = 0
    if (settled) for (const resolve of this.waiters.splice(0)) resolve()
  }

  private fail(reason: string) {
    if (this.failed) return
    this.failed = true
    this.queue.clear()
    this.inFlight = null
    this.stagedWorkerMs = 0
    this.worker.terminate()
    this.options.onFail(reason)
    for (const resolve of this.waiters.splice(0)) resolve()
  }

  settled(): boolean { return this.failed || (!this.inFlight && !this.queue.size) }

  whenSettled(): Promise<void> {
    return this.settled() ? Promise.resolve() : new Promise((resolve) => this.waiters.push(resolve))
  }

  peek(id: string): { form: ImageBitmap | null; light: ImageBitmap | null; ratio: number; rect: DeviceRect } | null {
    const entry = this.entries.get(id)
    if (!entry?.form) return null
    const light = entry.light && entry.light.formKey === entry.form.key ? entry.light.bitmap : null
    if (!entry.form.bitmap && !light) return null
    return { form: entry.form.bitmap, light, ratio: entry.form.ratio, rect: entry.form.rect }
  }

  prune(keep: ReadonlySet<string>) {
    for (const [id, entry] of this.entries) {
      if (keep.has(id)) continue
      entry.form?.bitmap?.close()
      entry.light?.bitmap?.close()
      this.entries.delete(id)
      this.queue.dropLayer(id)
    }
  }

  bytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      for (const part of [entry.form, entry.light]) if (part?.bitmap) total += part.bitmap.width * part.bitmap.height * 4
    }
    return total
  }

  get isFailed() { return this.failed }
}
