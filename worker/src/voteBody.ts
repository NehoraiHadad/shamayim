import { VOTE_ROUND } from '../../src/data/styleVoteRound'
import { isStyle, type Style } from './voteTally'

/** A lower-case UUID, as `crypto.randomUUID()` gives. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** The body as text, or null when it is longer than `limit` bytes (reading stops there). */
export async function readSmall(request: Request, limit: number): Promise<string | null> {
  const reader = request.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
}

/** Exactly `{id, style, round}`; `old` for a vote of another round (an app not updated yet); null for anything else. */
export function parseVote(text: string): { id: string; style: Style } | 'old' | null {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (!body || typeof body !== 'object' || Object.keys(body).length !== 3) return null
  const { id, style, round } = body as { id?: unknown; style?: unknown; round?: unknown }
  if (typeof id !== 'string' || !UUID.test(id) || !isStyle(style) || typeof round !== 'string') return null
  return round === VOTE_ROUND ? { id, style } : 'old'
}
