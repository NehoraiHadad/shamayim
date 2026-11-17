> Superseded (2026-11-17) by `israel-landmarks.md` (static Geofabrik cells). Kept as the base for a future IMS Pages Function.

# Brief: landmarks through our own Cloudflare Pages Function (v6.2)

Why: today every phone calls public Overpass servers directly. They rate-limit per IP and fail under load
(seen live: Karmei Tzur got nothing). A Pages Function in the same Cloudflare Pages project (`shamayim`,
Git-connected, build `npm run build`, output `dist`, no wrangler config) asks Overpass once per area and
caches the answer at the edge for everyone. The same function will later carry IMS data (API key must stay
server-side), so build it as a small, clean `functions/api/` base.

Rules: files ≤150 lines, DRY, tests with vitest, `npm test`, `npm run lint`, `npm run build` green. Do not commit.

## Function: `functions/api/landmarks.ts` (Pages Functions file routing → `GET /api/landmarks`)
- Query `lat`, `lon` (numbers, |lat| ≤ 85, |lon| ≤ 180, else 400). Round both to 2 decimals (~1 km) for the
  cache key and for the query centre; the client still ranks against its exact place.
- Build the query with the existing `buildQuery` from `src/data/landmarks/overpass.ts` and parse with
  `parseOverpass` (share the modules; they are pure — keep them free of DOM/React imports). Return
  `{ marks: Landmark[] }` unranked, plus `generatedAt`.
- Hosts in order: overpass-api.de, overpass.private.coffee, overpass.kumi.systems; 12 s timeout each;
  POST `data=` form body; header `User-Agent: Shamayim weather app (https://shamayim.pages.dev)`
  (no personal email).
- Edge cache: `caches.default` keyed by the normalised URL. Success (including empty) cached 30 days
  (`Cache-Control: public, max-age=2592000` on the stored copy; browser gets `max-age=86400`).
  Failure → 502 `{ error }`, `Cache-Control: no-store`, not cached. Only GET; other methods 405.
- Concurrency: if two requests miss at once it is fine to fetch twice; no KV/Durable Objects.

## Client: `src/data/landmarks/useLandmarks.ts`
- First call `/api/landmarks?lat=&lon=`; if it fails (404 in `vite dev`, network, 5xx) fall back to the current
  direct Overpass path. Keep localStorage caching and the 1-hour failure memory exactly as now.
- Rank on the client as today.

## Types and tooling
- `functions/` gets its own `tsconfig.json` with `@cloudflare/workers-types` (devDependency) and is type-checked
  in `npm run build` (e.g. `tsc -p functions`) — confirm Cloudflare Pages still builds with the Git integration.
- Local check: `npx wrangler pages dev dist` (wrangler as devDependency) must serve `/api/landmarks`.
  Document the command in README or LANDMARKS.md.
- Tests: handler with mocked `fetch` and a fake `caches.default`: bad params 400, cache hit returns stored copy
  without fetching, first host 429 → second host used, all fail → 502 not cached, empty result cached.
- Update `docs/design/LANDMARKS.md` (source section) and ODbL attribution stays as is.

## Done when
All checks green, `wrangler pages dev` serves a real answer for Karmei Tzur (31.61, 35.10), and you list files
changed and anything unverified.
