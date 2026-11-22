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
const isCanopy = (item: PendingSlot) => item.job.progressive && item.totalFrames > 1
const isShade = ({ desc }: PaintJob) => (desc.kind === 'plane' || desc.kind === 'canopy') && desc.beamRemoved
const priority = (item: PendingSlot) => item.totalFrames === 1 ? (isShade(item.job) ? 2 : 0)
  : isCanopy(item) && !item.nextFrame ? 1 : 3
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
  takeBatch(now: number, fillCanopies = true): { jobs: PaintJob[]; since: number } | null {
    const eligible = [...this.pending].filter(([, item]) => fillCanopies || !isCanopy(item) || !item.nextFrame)
    if (!eligible.length) return null
    let first = 3
    for (const [, item] of eligible) first = Math.min(first, priority(item))
    const selected = eligible.filter(([, item]) => priority(item) === first)
    this.inFlightFinal.clear()
    if (first === 3) selected.length = 1

    let since = now
    const jobs: PaintJob[] = []
    for (const [slot, item] of selected) {
      since = Math.min(since, item.since)
      const preview = first === 1
      const end = Math.min(item.totalFrames, item.nextFrame + (preview ? 1 : STRIP_CHUNK_FRAMES))
      const final = end === item.totalFrames
      if (final) {
        this.pending.delete(slot)
        this.inFlightFinal.set(slot, tagOf(item.job.key, item.job.formKey))
      }
      if (item.totalFrames === 1) jobs.push(item.job)
      else {
        const frames = Array.from({ length: end - item.nextFrame }, (_, i) => item.nextFrame + i)
        jobs.push({ ...item.job, frames, final, preview: preview ? true : undefined })
      }
      item.nextFrame = end
    }
    return { jobs, since }
  }

  finishBatch() {
    this.inFlightFinal.clear()
  }
}
