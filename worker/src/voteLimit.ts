/**
 * Temporary (see styleVote.ts): true when one address asks too often. The address is only a key in Cloudflare's own
 * short-lived counter, per location; nothing of it is kept or logged. Without the binding, or when it fails, everyone passes:
 * the daily caps still hold.
 */
export async function overVoteLimit(request: Request, limiter: RateLimit | undefined): Promise<boolean> {
  const address = request.headers.get('CF-Connecting-IP')
  if (!limiter || !address) return false
  try {
    return !(await limiter.limit({ key: address })).success
  } catch {
    return false
  }
}
