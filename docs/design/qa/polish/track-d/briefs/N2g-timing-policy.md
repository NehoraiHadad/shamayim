# N2g — timing-gate policy (round 9)

Opus round 9 measured the code at the same speed on CI as locally. Only the 100k-`Math.sin` reference loop runs about
2× faster on CI, so the ratios fail there while the absolute times meet budget: shadows run at 0.60–0.68 ms on CI. Apply
this policy. Change test and harness files only, without committing. Claude is editing `src/scene/paint/cloudShadows.ts`,
`cloudShadowLayers.ts` and `types.ts` at the same time, so don't touch them.

1. **`src/scene/model/cloudShadowPanorama.test.ts:106-107`**
   - Normalise the shadow time by `baselineMs`: the model without the shadow field, measured in interleaved order.
     It is the same kind of code. Measured local ratios are 0.17 / 0.17 / 0.21 and CI 0.18 / 0.20 / 0.22.
   - Gate `shadowMs / baselineMs ≤ 0.30`.
   - Set `incrementMs ≤ 2.5`, because CI reached 2.10.
   - Keep the `FIELD_PERF=1` absolute checks.
   - Drop the shadow use of `referenceLoop` if nothing else needs it there.
2. **`src/world/field/density.perf.test.ts:78,97`**
   - Gate on absolute medians from CI output plus about 30 %: cold ≤ 15 ms (CI max 9.3), warm ≤ 2.5 ms (CI max 1.91),
     arrival ≤ 3 ms.
   - Raise the samples from 9 to 21.
   - Print the reference ratios for information only.
   - Comment the calibration source: run ids 44993185800, 44995756933 and 44997772484.
3. **`e2e/scene.perf.mjs`**
   - Warm up with about 10 unsampled scrub frames before the 60 sampled ones. The p95 tail was JIT warm-up in frames
     06:12–07:36.
   - Remove the heap-delta report: `performance.memory` is quantised, so it always printed 0.
   - Leave the budgets unchanged.

Rules:
- Never run a multi-line `npx tsx -e`. Use `./node_modules/.bin/<tool>`.
- Run `tsc -b`, oxlint on the touched files, and vitest on the two test files.
- Append `## Round 7` to `N2-report.md`. Do not commit.
