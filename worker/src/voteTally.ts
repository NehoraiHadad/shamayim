/** Temporary (see styleVote.ts): the round's votes counted from a listing of their keys' metadata. */
import { VOTE_ROUND } from '../../src/data/styleVoteRound'

export const VOTE_PREFIX = `vote:${VOTE_ROUND}:`

export type Style = 'real' | 'drawn'

export const isStyle = (value: unknown): value is Style => value === 'real' || value === 'drawn'

export interface VoteMeta {
  style: Style
  /** UTC day of the last write, and how many writes this voter made on it. */
  day: string
  n: number
}

/** The part of the KV binding the votes use. */
export interface VoteKV {
  getWithMetadata(key: string): Promise<{ metadata: unknown }>
  put(key: string, value: string, options: { metadata: VoteMeta; expirationTtl: number }): Promise<void>
  list(options: { prefix: string; cursor?: string }): Promise<{ keys: { metadata?: unknown }[]; list_complete: boolean; cursor?: string }>
}

interface Tally {
  real: number
  drawn: number
  /** The UTC day counted as today, and the KV writes spent on votes on it. */
  day: string
  today: number
  /** More votes than one count may read: no new ones are taken. */
  full: boolean
}

/** 1000 keys a page; KV's free plan allows 1000 listings a day. */
const MAX_PAGES = 5

/** Long, as one isolate polled for the totals must not spend the listings the other isolates need. */
const MEMO_MS = 5 * 60_000

let memo: { tally: Tally; readAt: number } | null = null

export function forgetTally(): void {
  memo = null
}

/** A key's metadata as a vote, or null when it is missing or not one. */
export function countedVote(metadata: unknown): VoteMeta | null {
  if (!metadata || typeof metadata !== 'object') return null
  const { style, day, n } = metadata as Partial<VoteMeta>
  return isStyle(style) && typeof day === 'string' && typeof n === 'number' ? { style, day, n } : null
}

async function count(kv: VoteKV, day: string): Promise<Tally> {
  const out: Tally = { real: 0, drawn: 0, day, today: 0, full: false }
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const listed = await kv.list({ prefix: VOTE_PREFIX, cursor })
    for (const key of listed.keys) {
      const vote = countedVote(key.metadata)
      if (!vote) continue
      out[vote.style]++
      if (vote.day === day) out.today += vote.n
    }
    if (listed.list_complete) return out
    cursor = listed.cursor
  }
  return { ...out, full: true }
}

/** The totals, up to five minutes old. */
export async function tally(kv: VoteKV, now: number): Promise<Tally> {
  const day = new Date(now).toISOString().slice(0, 10)
  if (memo && memo.tally.day === day && now - memo.readAt < MEMO_MS) return memo.tally
  memo = { tally: await count(kv, day), readAt: now }
  return memo.tally
}

/** Adds a vote just written to the remembered totals, ahead of KV's own listing. */
export function rememberVote(previous: VoteMeta | null, vote: VoteMeta): void {
  if (!memo) return
  if (previous) memo.tally[previous.style]--
  memo.tally[vote.style]++
  memo.tally.today++
}
