/**
 * Temporary: which of the scene's two styles people prefer. One KV key per voter (`vote:<random id>`), the vote in the
 * key's metadata so the totals need only a listing. No IP and no personal data are kept. To remove: delete this file,
 * `voteBody.ts` and `voteTally.ts`, their test, the two routes in index.ts and the POST preflight in cors.ts.
 */
import { plain } from './plain'
import { parseVote, readSmall } from './voteBody'
import { countedVote, forgetTally, rememberVote, tally, VOTE_PREFIX, type Style, type VoteKV, type VoteMeta } from './voteTally'

export const VOTE_PATH = '/v1/style-vote'
export const TOTALS_PATH = '/v1/style-votes'

const VOTE_TTL_SECONDS = 365 * 24 * 3600
const MAX_BODY_BYTES = 200
/** KV's free plan allows 1000 writes a day, shared with the live correction and the forecast log (~50). */
export const DAILY_WRITES = 300
/** Changes of mind per voter per day. */
export const DAILY_CHANGES = 10
const CAP_MEMO_MS = 5 * 60_000
const TOTALS_MEMO_MS = 60_000
const MEMORY_LIMIT = 500

/** What this isolate last wrote, since KV may keep answering an older copy for a minute after a write. */
const written = new Map<string, VoteMeta>()

export function clearVoteMemory(): void {
  written.clear()
  forgetTally()
}

function remember(key: string, meta: VoteMeta): void {
  written.delete(key)
  written.set(key, meta)
  if (written.size > MEMORY_LIMIT) written.delete(written.keys().next().value as string)
}

const saved = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
const unavailable = () => plain(503, 'Votes are not available')

async function store(kv: VoteKV, id: string, style: Style, now: number): Promise<Response> {
  const key = VOTE_PREFIX + id
  const previous = written.get(key) ?? countedVote((await kv.getWithMetadata(key)).metadata)
  if (previous?.style === style) return saved()

  const { day, today, full } = await tally(kv, now, CAP_MEMO_MS)
  const changes = previous?.day === day ? previous.n + 1 : 1
  if (changes > DAILY_CHANGES) return plain(429, 'Too many changes today')
  if (full || today >= DAILY_WRITES) return plain(429, 'No more votes today')

  const meta: VoteMeta = { style, day, n: changes }
  await kv.put(key, style, { metadata: meta, expirationTtl: VOTE_TTL_SECONDS })
  remember(key, meta)
  rememberVote(previous, meta)
  return saved()
}

/** `POST /v1/style-vote` `{id, style}`: one vote per id, a later vote replaces it. */
export async function castVote(request: Request, kv: VoteKV | undefined, now: number): Promise<Response> {
  if (!kv) return unavailable()
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return plain(415, 'JSON expected')
  const text = await readSmall(request, MAX_BODY_BYTES)
  if (text === null) return plain(413, 'Body too large')
  const vote = parseVote(text)
  if (!vote) return plain(400, 'id and style are required')
  try {
    return await store(kv, vote.id, vote.style, now)
  } catch {
    // KV over its daily or per-key limit: the app keeps the vote and sends it again at its next start.
    return unavailable()
  }
}

/** `GET /v1/style-votes`: `{real, drawn}`. */
export async function voteTotals(kv: VoteKV | undefined, now: number): Promise<Response> {
  if (!kv) return unavailable()
  try {
    const { real, drawn } = await tally(kv, now, TOTALS_MEMO_MS)
    return new Response(JSON.stringify({ real, drawn }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    })
  } catch {
    return unavailable()
  }
}
