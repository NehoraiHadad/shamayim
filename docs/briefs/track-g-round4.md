# Track G round 4 — CI failures and final-review fixes

Branch `claude/fix-glyph-flicker-8384c3` at 309f094. Do not commit. Write `docs/briefs/track-g-round4.REPORT.md`.
Run `npx tsc -b`, `npx oxlint`, and only these vitest files (`--testTimeout=180000`): `src/scene/model/c9.test.ts`
`src/scene/react/sceneLabel.test.ts` `src/world/world.test.ts` `src/world/liveLight.test.ts` `src/scene/paint/glyphs/glyphs.test.ts`
`src/scene/paint/outside.test.ts` `src/scene/model/dust.test.ts` plus any test file of a module you change.
Context: `docs/briefs/track-g-*.md` and their REPORTs (live is the scrub timeline at now; nothing jumps when data arrives).

## 1. CI failures (find the root cause; do not weaken a test to pass it — if a test's expectation was HEAD's step behaviour
and is now wrong by the track G rule, say why in the report and change the expectation to the physically right value)
- `src/scene/model/c9.test.ts` "lays the sun's path by the world's own direct light and sun (Masada at sunrise)":
  `expected 0.0822 to be greater than 0.1`. Find which track G change lowered it (live blend of the observation? dust weight?
  aerosol?) and whether the new value is right for Masada at sunrise in that fixture.
- `src/scene/react/sceneLabel.test.ts`, 3 tests: the label's temperature (expected 14°, got 19°; expected −3°, got −4°) and
  `expected undefined to be true` in "speaks scrubbed WMO 95 without drawn thunder…". The label is the accessible description of
  the page: its temperature must be the same number the page shows the user at that moment (find what the hero/top shows in live
  and in a picked hour, and use the same source), and its condition must agree with what is drawn (thunder: the world's new
  continuous thunder weight replaced a boolean — restore a clear meaning: thunder is spoken when it is drawn).

## 2. Final-review fixes (this branch's own)
- `src/world/world.test.ts:232` merge continuity bound 0.10 is arbitrary: derive it (`2 × scrub max step + 0.01`) like
  `liveLight.test.ts:32`, bound rollover and receipt by it too, and record in a comment the measured step on the pre-merge code.
- Star halos: `src/scene/paint/bodies.ts:116-118` changed the gate `alpha > 0.5` to `smoothstep(0.4, 0.6, alpha)`, which changes
  the halos of stars whose full-night alpha is 0.4–0.6. Star alpha is a per-star constant at full night (`model/stars.ts:44`), so
  the gate is not a time step; restore HEAD's look exactly for stars (and check planets, milky way, `soft()`, water rim the same way:
  keep a ramp only where the alpha itself moves with night; where it is per-object constant, restore HEAD).
- `src/scene/model/marks.ts:16-21` `declare module './types'`: declare `aviationStrength` (required) in `types.ts`, drop the
  `?? Number(s.aviation)` fallbacks (`kit.ts:45`, `marks.ts:190`), and the now-redundant `s.aviation` in keys if nothing reads it.
- Painters import `smoothstep` from `domain/smoothstep`, not `world/ridgeLighting` (keeps sceneLight out of the worker).

## Precision
Pay attention to subtleties and physical accuracy. No unstated approximations; report each root cause with the measured values.
