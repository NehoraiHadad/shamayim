/** A small JSON error answer, never cached. */
export function plain(status: number, reason: string): Response {
  return new Response(JSON.stringify({ error: true, reason }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
