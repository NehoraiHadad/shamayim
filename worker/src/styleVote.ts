/**
 * Temporary: which of the scene's two styles people prefer. One KV key per voter (`vote:<round>:<random id>`), the vote in
 * the key's metadata so the totals need only a listing. No IP and no personal data are kept. To remove: delete this file,
 * `voteBody.ts`, `voteTally.ts` and `voteLimit.ts`, their tests, the two routes and the limits in index.ts, [[ratelimits]] in
 * wrangler.toml and the POST preflight in cors.ts.
 */
import { VOTE_ROUND, type VoteStyle } from '../../src/data/styleVoteRound'
import { plain } from './plain'
import { parseVote, readSmall } from './voteBody'
import { countedVote, forgetTally, rememberVote, tally, VOTE_PREFIX, type VoteKV, type VoteMeta } from './voteTally'

export const VOTE_PATH = '/v1/style-vote'
export const TOTALS_PATH = '/v1/style-votes'

const VOTE_TTL_SECONDS = 365 * 24 * 3600
const MAX_BODY_BYTES = 200
/**
 * KV's free plan allows 1000 writes a day, shared with the live correction and the forecast log (~50). Every isolate counts
 * from a listing some minutes old, so the day can pass this by what VOTE_LIMIT_ALL lets through meanwhile.
 */
export const DAILY_WRITES = 200
/** Votes per voter per day: the first and its changes. */
export const DAILY_PER_VOTER = 10
const MEMORY_LIMIT = 500
/** The totals may be older than the count votes go by, so polling them does not spend KV's listings. */
const TOTALS_AGE_MS = 15 * 60_000

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

async function store(kv: VoteKV, id: string, style: VoteStyle, now: number): Promise<Response> {
  const { day, today, full } = await tally(kv, now)
  if (full || today >= DAILY_WRITES) return plain(429, 'No more votes today') // Before the read: those are limited too.
  const key = VOTE_PREFIX + id
  // Written even when KV answers the same style: its copy may be older than a change made through another isolate.
  const previous = written.get(key) ?? countedVote((await kv.getWithMetadata(key)).metadata)
  const n = previous?.day === day ? previous.n + 1 : 1
  if (n > DAILY_PER_VOTER) return plain(429, 'Too many changes today')

  const meta: VoteMeta = { style, day, n }
  await kv.put(key, style, { metadata: meta, expirationTtl: VOTE_TTL_SECONDS })
  remember(key, meta)
  rememberVote(previous, meta)
  return saved()
}

/** `POST /v1/style-vote` `{id, style, round}`: one vote per id, a later vote replaces it. */
export async function castVote(request: Request, kv: VoteKV | undefined, now: number): Promise<Response> {
  if (!kv) return unavailable()
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return plain(415, 'JSON expected')
  const text = await readSmall(request, MAX_BODY_BYTES)
  if (text === null) return plain(413, 'Body too large')
  const vote = parseVote(text)
  if (!vote) return plain(400, 'id, style and round are required')
  if (vote === 'old') return plain(409, 'Another round')
  try {
    return await store(kv, vote.id, vote.style, now)
  } catch {
    // KV over its daily or per-key limit: the app keeps the vote and sends it again at its next start.
    return unavailable()
  }
}

/** `GET /v1/style-votes`: the votes, the writes of today (a jump shows a flood) and whether more are taken today. */
export async function voteTotals(kv: VoteKV | undefined, now: number): Promise<Response> {
  if (!kv) return unavailable()
  try {
    const { real, drawn, today, full } = await tally(kv, now, TOTALS_AGE_MS)
    return new Response(JSON.stringify({ round: VOTE_ROUND, real, drawn, today, open: !full && today < DAILY_WRITES }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    })
  } catch {
    return unavailable()
  }
}
