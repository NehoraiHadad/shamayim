import { resultBitmaps, type PaintResult } from './paintJob'
import type { Entry, Request } from './remoteEntry'

export function collectParts(results: readonly PaintResult[], entries: ReadonlyMap<string, Entry>,
  requestOf: (id: string, part: PaintResult['part']) => Request | undefined) {
  const arrived = new Map<Entry, { request: Request; parts: PaintResult[] }>()
  let workerMs = 0
  for (const result of results) {
    workerMs += result.ms
    const entry = entries.get(result.id), request = requestOf(result.id, result.part)
    if (!result.bitmap || !entry || !request) {
      // Intermediate chunks stay staged in the Worker. Evicted entries no longer own a reply.
      for (const bitmap of resultBitmaps(result)) bitmap?.close()
      continue
    }
    const held = arrived.get(entry)
    if (held) held.parts.push(result)
    else arrived.set(entry, { request, parts: [result] })
  }
  return { arrived, workerMs }
}
