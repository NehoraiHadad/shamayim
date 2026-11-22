# Brief — birds travel across the sky (owner bug: "why don't the birds move? they fly in place")

Branch `claude/fix-birds-travel` (this worktree). Commit in English, each message ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push, do not touch main.

## Diagnosis (measured, Claude)

- Built app (main b2e250d, the same bundle Cloudflare serves), live, motion allowed, Haifa 08:00 fixture: the pigeon
  flock (22 birds, 500 m) moved its centre ~6 CSS px in 10 s (0.6 px/s). The birds flap and circle their 8 px loops
  round fixed places, so the flock reads as flying in place.
- Cause: `GROUP` in `src/world/lifeSchedule.ts` moves a flock's centre at 0.5–2 m/s for every resident kind
  (swift 1.2, gull 1.5, crow 1.2, pigeon 1, bat 0.5), by design "their centre wanders slowly". The sky is 1.5 px per
  degree at 375 px, so 1 m/s at 500 m is 0.17 px/s: invisible. The life clock, tracks and compositor are fine
  (positions are interpolated each frame); the world simply barely moves them.

## The fix (exact)

1. `GROUP` speeds become each flock's real ground speed while it goes somewhere (field figures):
   stork 10, crane 15, swift 10 (a hawking party drifts slower than a swift's 20 m/s airspeed), gull 9, raptor see 2,
   crow 11, pigeon 14, bat 6. Keep `reach` as is. Rewrite the doc comment above `GROUP` to say this: the flock passes at
   its own speed; the composite loop adds each bird's wheeling round its place. No "wanders slowly" text left.
2. Raptor (`flockEvents`, the `speedMs` line): `2 + 0.6 * Math.min(8, input.wind.ms)` (a thermal drifting downwind and
   the glide to the next one) instead of `1 + 0.35 * …`. Keep the `(0.85 + 0.3 * q())` spread.
3. `SHAPES` in `src/world/life.ts`: storks and cranes pass nearer, so their pass reads: stork `distanceM: [800, 2200]`,
   crane `distanceM: [1200, 3000]`. Nothing else in SHAPES changes.
4. The session rate already divides by the session length (`sessionS` uses `g.speedMs`), so the share of time each kind
   is in view stays the same; do not touch `arrivals`, `MAX_FLOCKS` or `PREVALENCE`.

## Test (new file `src/scene/model/birdsTravel.test.ts`, under 150 lines)

Use the helpers `lifeContinuity.test.ts` uses (`loadPlaces`, `stubPublicFetch`, `worldInput`, `makeWorldBuilder`,
`sceneModel`, `pose`/`distance` from `lifeContinuityMetrics.ts`, `LIFE_START`). Places haifa, tel-aviv, shadmot-mehola;
BOX `{ width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }`. Every 20 minutes from 05:00 to 19:00 on
2026-11-17, build the world, take every `birds.*` layer (not `.front` copies), and measure its laid point at phase 0 and
phase 10 (`pose(layer, phase).point`, the live path: `sceneModel(world, BOX, null, LIFE_START)`).
- Per kind, log the median and minimum travel over 10 s (CSS px) with `console.log`.
- Expect: at least 20 flocks measured over the three places; the median 10 s travel of all flocks ≥ 8 px; every flock
  nearer than 700 m (`flock.distanceM`) travels ≥ 5 px in 10 s.
- Put the per-place test timeout at 60 s (CI runs ×4 slower).
If a threshold fails with the numbers above, do NOT loosen it: stop and report the measured numbers in IMPL-1.md.

## Then

- Run `npx tsc -b`, `npx oxlint`, and `npx vitest run src/world src/scene/model` (all green; update any existing
  expectation that encoded the old slow speeds, and list each one you changed and why in IMPL-1.md).
- Write `docs/design/qa/polish/birds-travel/IMPL-1.md`: what changed, the logged per-kind travel numbers, tests changed.
- Files stay under ~150 lines where they already are; painters stay pure; no clock in painters; no `ctx.filter`.
