import { frameCount } from '../model/anim'
import { paintSlot, type PaintJob } from './paintJob'

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

const priority = (item: PendingSlot) => {
  if (item.job.scrubReceiver) return -1
  if (item.job.progressive && !item.nextFrame && (item.totalFrames > 1 || item.job.shade)) return 1
  return item.totalFrames === 1 ? 0 : 2
}
const tagOf = (key: string, formKey: string) => `${key}\0${formKey}`

/**
 * Priority queue for `RemoteCache`:
 * Terrain and static layers go first, followed by canopy pose zero. The rest of each gust strip
 * waits for the scrub to settle, with at most one chunk in flight.
 */
export class RemoteQueue {
  private pending = new Map<string, PendingSlot>()
  /** Slots currently completing in flight (`final !== false`), mapped to `key\0formKey`. */
  private inFlightFinal = new Map<string, string>()

  /** Enqueues a job unless the identical `(key, formKey)` is already queued or finishing in flight. */
  ask(job: PaintJob, now: number): boolean {
    const slot = paintSlot(job.id, job.part)
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

  staged(slot: string) {
    return Boolean(this.pending.get(slot)?.nextFrame)
  }

  drop(slot: string) {
    this.pending.delete(slot)
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
    const eligible = [...this.pending].filter(([, item]) => fillCanopies || !item.job.progressive || priority(item) < 2)
    if (!eligible.length) return null
    let first = 2
    for (const [, item] of eligible) first = Math.min(first, priority(item))
    const selected = eligible.filter(([, item]) => priority(item) === first)
    this.inFlightFinal.clear()
    if (first === -1) {
      for (const [, { job }] of [...selected]) {
        if (job.desc.kind !== 'plane' || !job.desc.canopyId) continue
        const slot = paintSlot(job.desc.canopyId, 'light')
        const canopy = this.pending.get(slot)
        if (canopy?.job.shade && !canopy.nextFrame && priority(canopy) === 1
          && canopy.job.desc.kind === 'canopy' && canopy.job.desc.receiver?.form === job.desc.key) {
          selected.push([slot, canopy])
        }
      }
    }
    if (first >= 2) selected.length = 1

    let since = now
    const jobs: PaintJob[] = []
    for (const [slot, item] of selected) {
      since = Math.min(since, item.since)
      const preview = item.job.progressive && item.totalFrames > 1 && !item.nextFrame
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
