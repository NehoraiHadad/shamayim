import { frameCount } from '../model/anim'
import type { PaintJob } from './paintJob'

/**
 * Maximum strip poses painted in one worker batch so queued terrain and scrub-light updates
 * preempt an in-flight multi-frame strip (e.g. a 10-pose animated canopy) after at most one short chunk.
 */
export const STRIP_CHUNK_FRAMES = 2

interface PendingSlot {
  job: PaintJob
  nextFrame: number
  totalFrames: number
  since: number
}

const slotOf = (id: string, part: 'form' | 'light') => `${id}:${part}`
const tagOf = (key: string, formKey: string) => `${key}\0${formKey}`

/**
 * Priority queue for `RemoteCache`:
 * 1. Single-frame jobs (terrain planes, static layers, scrub light) always dispatch together ahead of multi-frame strips.
 * 2. Multi-frame strips dispatch one job at a time in bounded `STRIP_CHUNK_FRAMES` pose chunks so newly arriving
 *    terrain or scrub-light jobs preempt after at most one chunk, and superseded strip keys cancel immediately.
 */
export class RemoteQueue {
  private pending = new Map<string, PendingSlot>()
  /** Slots currently completing in flight (`final !== false`), mapped to `key\0formKey`. */
  private inFlightFinal = new Map<string, string>()

  /** Enqueues a job unless the identical `(key, formKey)` is already queued or finishing in flight. */
  ask(job: PaintJob, now: number): boolean {
    const slot = slotOf(job.id, job.part)
    const tag = tagOf(job.key, job.formKey)
    if (this.inFlightFinal.get(slot) === tag) {
      this.pending.delete(slot)
      return false
    }
    const existing = this.pending.get(slot)
    if (existing && tagOf(existing.job.key, existing.job.formKey) === tag) {
      // Preserve strip chunk progress (`nextFrame`) when re-asked with the same key (e.g. scrub changes light only).
      existing.job = job
      return false
    }
    this.pending.set(slot, { job, nextFrame: 0, totalFrames: frameCount(job.desc.animated), since: now })
    return true
  }

  has(slot: string) {
    return this.pending.has(slot)
  }

  drop(slot: string) {
    this.pending.delete(slot)
  }

  dropLayer(id: string) {
    this.pending.delete(slotOf(id, 'form'))
    this.pending.delete(slotOf(id, 'light'))
  }

  clear() {
    this.pending.clear()
    this.inFlightFinal.clear()
  }

  get size() {
    return this.pending.size
  }

  /** Selects the next worker batch and records any completing slots in `inFlightFinal`. */
  takeBatch(now: number): { jobs: PaintJob[]; since: number } | null {
    if (!this.pending.size) return null
    const single: [string, PendingSlot][] = []
    for (const entry of this.pending) if (entry[1].totalFrames === 1) single.push(entry)
    this.inFlightFinal.clear()
    if (single.length) {
      let since = Infinity
      const jobs: PaintJob[] = []
      for (const [slot, item] of single) {
        this.pending.delete(slot)
        this.inFlightFinal.set(slot, tagOf(item.job.key, item.job.formKey))
        if (item.since < since) since = item.since
        jobs.push(item.job)
      }
      return { jobs, since: Number.isFinite(since) ? since : now }
    }
    const [slot, item] = this.pending.entries().next().value as [string, PendingSlot]
    const end = Math.min(item.totalFrames, item.nextFrame + STRIP_CHUNK_FRAMES)
    const frames: number[] = []
    for (let i = item.nextFrame; i < end; i++) frames.push(i)
    const final = end >= item.totalFrames
    if (final) {
      this.pending.delete(slot)
      this.inFlightFinal.set(slot, tagOf(item.job.key, item.job.formKey))
    } else {
      item.nextFrame = end
    }
    return { jobs: [{ ...item.job, frames, final }], since: item.since }
  }

  finishBatch() {
    this.inFlightFinal.clear()
  }
}
