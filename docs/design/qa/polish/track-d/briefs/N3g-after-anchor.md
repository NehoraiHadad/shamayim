# N3g: regressions from the N3e day anchor, and the midnight strip (after CI run 45009532710 at 884b2af)

CI `check` was green at 75b2fc6 and fails at 884b2af (N3e) with 5 tests:

1. `c10fixes.test.ts:87` "hides the ring under the land and the horizon": `TypeError: Cannot read properties of
   undefined (reading 'clip')`, so the 22° halo layer is missing.
2. `c10fixes.test.ts:95` "sets the sun dogs level with the sun": the same halo is missing (`dogs`).
3. `cloudSheet.test.ts:165` "keeps a low-cover floor transparent": tone saturates to 0 (N3f item 6).
4. `cloudSheetVisible.test.ts:93` "shows the recorded haifa sheet": the tone spread is 0.0277, below 0.12.
5. `model.test.ts:138` "leaves the sky out when there is no sky box": one layer fewer than expected
   (`['plane.far', 'farCities', …(2)]` against `…(3)`).

**Status at the N3f commit:** items 3 and 4 pass after N3f. Items 1, 2 and 5 still fail locally. N3f's report also
names a local `cloudShadow.far` failure in `model.test.ts`; include it if it reproduces. For the strip, first check
whether N3f's tone fix already removed the 23:20 cut, then still add the continuity test.

For each: say whether the fixture's sky truly changed (a new day seed gives a different Cs field, so the halo
condition no longer holds; that is legitimate), or whether N3e broke a contract.
- **If the sky changed:** keep the test's intent. Pin the fixture to a state that has the feature: force the Cs cover
  through the test's weather input, not by loosening the assertion, and explain it.
- **If a contract broke:** fix the code.

The halo must follow the drawn Cs veil. It appears where a Cs sheet is drawn over the sun and not otherwise.

## The midnight strip (`docs/design/qa/polish/track-d/midnight-strip-884b2af.png`)

Jerusalem, 17→18 Nov, 23:20 / 23:40 / 00:00 / 00:20 / 00:40:
- **Overcast:** continuous. Fine.
- **Broken: a cut between 23:20 and 23:40.** At 23:20 the low sheet is bright, lit white, with vertical streaks,
  against stars. At 23:40 the same area is dark navy cloud. From 23:40 to 00:40 it stays dark and continuous.
  - The jump is in tone and brightness, not in geometry.
  - At night with no moonlight a cloud base must be dark, or lit only by city glow from below. So 23:20 is the wrong
    one: probably the tone normaliser saturating (N3f item 6) at night, when `aboveMax` is tiny.
  - Prove it. Compute the sheet tone and alpha statistics at 23:20, 23:30, 23:40 and 23:50 for that fixture, and the
    `above` / `aboveMax` values.
  - Then add a test: over 23:00–01:00, minute by minute, the low-sheet mean tone and mean alpha change by at most the
    continuity bound per minute.
  - Check the moon. If the moon sets between 23:20 and 23:40, the direct moonlight on the clouds must fade, not cut.

## Precision
- Name each cause with evidence (numbers and lines). No per-place tuning.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths for every file above plus `field.test.ts`
  and `continuity.test.ts`.
- Append `## Round 14 (N3g)` to `N2-report.md`.
