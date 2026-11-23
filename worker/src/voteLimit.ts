/**
 * Temporary (see styleVote.ts): the vote's limits a minute, per Cloudflare location. Without the binding, or when it fails,
 * everyone passes: the daily caps still hold.
 */
async function over(limiter: RateLimit | undefined, key: string | null): Promise<boolean> {
  if (!limiter || !key) return false
  try {
    return !(await limiter.limit({ key })).success
  } catch {
    return false
  }
}

/** An IPv4 address, or the /64 of an IPv6 one: a single line has a whole /64 to pick addresses from. */
export function network(address: string | null): string | null {
  if (!address?.includes(':')) return address
  const [head, tail] = address.split('::').map((part) => part.split(':').filter(Boolean))
  const zeros = tail ? Array<string>(Math.max(0, 8 - head.length - tail.length)).fill('0') : []
  return [...head, ...zeros, ...(tail ?? [])].slice(0, 4).join(':')
}

export interface VoteLimits {
  /** Requests of one address. */
  VOTE_LIMIT?: RateLimit
  /** Votes of everyone. */
  VOTE_LIMIT_ALL?: RateLimit
}

/**
 * True when one address asks too often, or everyone votes too often. The address is a key in Cloudflare's own short-lived
 * counter; nothing of it is kept or logged.
 */
export async function overVoteLimit(request: Request, { VOTE_LIMIT, VOTE_LIMIT_ALL }: VoteLimits): Promise<boolean> {
  return await over(VOTE_LIMIT, network(request.headers.get('CF-Connecting-IP')))
    || (request.method === 'POST' && await over(VOTE_LIMIT_ALL, 'all'))
}
