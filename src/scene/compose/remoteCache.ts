import type { LayerDesc } from '../model/types'
import { HAND, painterOf, type Hand, type Painter } from '../paint'
import type { Painted } from './layerCache'
import { deviceRect, formKeyOf, lightKeyOf, type DeviceRect, type PaintJob, type PaintReply, type PaintRequest } from './paintJob'

/** What the cache needs of a worker (a `Worker`, or a fake in tests). */
export interface WorkerLike {
  postMessage(message: PaintRequest): void
  onmessage: ((event: MessageEvent<PaintReply>) => void) | null
  onerror: ((event: ErrorEvent | Event) => void) | null
  terminate(): void
}

/** A part as shown: the bitmap last painted for it and what it was painted for. */
interface Shown { key: string; formKey: string; bitmap: ImageBitmap | null; ratio: number; rect: DeviceRect; desc: LayerDesc }

interface Entry {
  /** What is wanted (the last desc's keys). */
  formKey: string
  lightKey: string | null
  desc: LayerDesc
  /** What is shown. */
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
  /** A batch arrived and was taken in: the surface lays the layers again. */
  onArrive: (arrival: Arrival) => void
  /** The worker failed (no 2D `OffscreenCanvas` in workers, a script error): the surface goes back to painting itself. */
  onFail: (reason: string) => void
}

/**
 * The layer cache of §1d with its painting done by the paint worker (`paintWorker.ts`): the same keys as `LayerCache`
 * (a layer repainted only when its key changes; a change of light repaints the light part alone), but `update` only asks
 * for the stale parts, and they arrive as `ImageBitmap`s a little later. Until then the surface keeps laying what it has:
 * the last light over the form (a scrub frame shows the light a frame or two behind while the hand moves, and the exact
 * one once it stops), nothing for a layer never painted yet (a cold start, as the sliced one did).
 *
 * One batch in flight at a time: what is asked for meanwhile waits, and a newer ask for the same part replaces an older one
 * (a fast scrub never queues up frames it has moved past).
 */
export class RemoteCache {
  private entries = new Map<string, Entry>()
  private pending = new Map<string, PaintJob>()
  /** When the oldest waiting job was asked for. */
  private pendingSince: number | null = null
  private inFlight: { batch: number; since: number; jobs: Map<string, PaintJob> } | null = null
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

  /** The layer's shown parts are those its desc asks for. */
  fresh(desc: LayerDesc, dpr: number): boolean {
    const entry = this.entries.get(desc.id)
    const formKey = formKeyOf(desc, dpr).key, lightKey = lightKeyOf(desc, this.painters(desc))
    return Boolean(entry && entry.form?.key === formKey && (lightKey === null
      || (entry.light?.key === lightKey && entry.light.formKey === formKey)))
  }

  formless(desc: LayerDesc): boolean {
    return Boolean(desc.light && this.painters(desc)?.formless?.(desc))
  }

  /** Asks for what is stale of a layer: what will be painted (`none` when it is shown or already asked for). */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const painter = this.painters(desc)
    const { ratio, key: formKey } = formKeyOf(desc, dpr)
    const lightKey = lightKeyOf(desc, painter)
    let entry = this.entries.get(desc.id)
    if (!entry) {
      entry = { formKey: '', lightKey: null, desc, form: null, light: null }
      this.entries.set(desc.id, entry)
    }
    entry.formKey = formKey
    entry.lightKey = lightKey
    entry.desc = desc
    if (entry.form?.key === formKey) entry.form.desc = desc
    if (this.fresh(desc, dpr)) {
      this.pending.delete(`${desc.id}:form`)
      this.pending.delete(`${desc.id}:light`)
      return 'none'
    }
    const rect = deviceRect(desc, ratio)
    const job = (part: 'form' | 'light', key: string): PaintJob =>
      ({ id: desc.id, part, key, formKey, desc, ratio, rect, phase, hand: this.hand })
    let painted: Painted = 'none'
    // A layer that is all light (`formless`) has an empty form: nothing to paint for it, only its place.
    if (entry.form?.key !== formKey) {
      if (this.formless(desc)) {
        painted = 'form'
        entry.form = { key: formKey, formKey, bitmap: null, ratio, rect, desc }
        this.pending.delete(`${desc.id}:form`)
      } else if (this.ask(job('form', formKey))) painted = 'form'
    } else this.pending.delete(`${desc.id}:form`)
    if (lightKey !== null && (entry.light?.key !== lightKey || entry.light.formKey !== formKey)) {
      if (this.ask(job('light', lightKey)) && painted === 'none') painted = 'light'
    } else this.pending.delete(`${desc.id}:light`)
    return painted
  }

  private ask(job: PaintJob) {
    const id = `${job.id}:${job.part}`
    const sent = this.inFlight?.jobs.get(id)
    if (sent?.key === job.key && sent.formKey === job.formKey) {
      this.pending.delete(id)
      return false
    }
    const queued = this.pending.get(id)
    if (queued?.key === job.key && queued.formKey === job.formKey) return false
    if (!this.pending.size) this.pendingSince = this.now()
    this.pending.set(id, job)
    return true
  }

  /** Sends what waits, unless a batch is in flight (it goes when that one is back). */
  flush() {
    if (this.failed || this.inFlight || !this.pending.size) return
    const jobs = [...this.pending.values()]
    this.pending.clear()
    this.inFlight = { batch: ++this.batch, since: this.pendingSince ?? this.now(),
      jobs: new Map(jobs.map((job) => [`${job.id}:${job.part}`, job])) }
    this.pendingSince = null
    try {
      this.worker.postMessage({ batch: this.inFlight.batch, jobs })
    } catch (error) {
      this.fail(String(error))
    }
  }

  private receive(reply: PaintReply) {
    if (this.failed || this.inFlight?.batch !== reply.batch) {
      for (const result of reply.results) result.bitmap.close()
      return
    }
    if (reply.error) {
      this.fail(reply.error)
      return
    }
    let workerMs = 0
    for (const result of reply.results) {
      workerMs += result.ms
      const entry = this.entries.get(result.id)
      const job = this.inFlight.jobs.get(`${result.id}:${result.part}`)
      if (!entry || !job) {
        result.bitmap.close()
        continue
      }
      const wanted = result.part === 'form' ? entry.formKey : entry.lightKey
      const old = result.part === 'form' ? entry.form : entry.light
      // Keep the current bitmap if the user scrubbed back to it while this job was in flight.
      if (old?.key === wanted && old.formKey === entry.formKey && (result.key !== wanted || result.formKey !== entry.formKey)) {
        result.bitmap.close()
        continue
      }
      const shown: Shown = { key: result.key, formKey: result.formKey, bitmap: result.bitmap, ratio: result.ratio,
        rect: result.rect, desc: result.formKey === entry.formKey ? entry.desc : job.desc }
      old?.bitmap?.close()
      if (result.part === 'form') entry.form = shown
      else entry.light = shown
    }
    const latency = this.now() - (this.inFlight?.since ?? this.now())
    this.inFlight = null
    this.flush()
    const settled = this.settled()
    this.options.onArrive({ latency, workerMs, settled })
    if (settled) for (const resolve of this.waiters.splice(0)) resolve()
  }

  private fail(reason: string) {
    if (this.failed) return
    this.failed = true
    this.pending.clear()
    this.inFlight = null
    this.worker.terminate()
    this.options.onFail(reason)
    for (const resolve of this.waiters.splice(0)) resolve()
  }

  /** Nothing asked for is still on its way. */
  settled(): boolean {
    return this.failed || (!this.inFlight && !this.pending.size)
  }

  /** Resolves once nothing asked for is on its way (at once if nothing is). */
  whenSettled(): Promise<void> {
    if (this.settled()) return Promise.resolve()
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  /** The bitmaps shown for a layer: its form (null when it has none), its light if it was painted for that form. */
  peek(id: string) {
    const entry = this.entries.get(id)
    if (!entry?.form) return null
    const light = entry.light && entry.light.formKey === entry.form.key ? entry.light.bitmap : null
    if (!entry.form.bitmap && !light) return null
    return { form: entry.form.bitmap, light, ratio: entry.form.ratio, rect: entry.form.rect,
      formKey: entry.form.key, desc: entry.form.desc }
  }

  prune(keep: ReadonlySet<string>) {
    for (const [id, entry] of this.entries) {
      if (keep.has(id)) continue
      entry.form?.bitmap?.close()
      entry.light?.bitmap?.close()
      this.entries.delete(id)
      this.pending.delete(`${id}:form`)
      this.pending.delete(`${id}:light`)
    }
  }

  /** Backing memory of the bitmaps shown (bytes, RGBA); the worker holds a canvas of each size besides. */
  bytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      for (const part of [entry.form, entry.light]) if (part?.bitmap) total += part.bitmap.width * part.bitmap.height * 4
    }
    return total
  }

  get isFailed() {
    return this.failed
  }
}
