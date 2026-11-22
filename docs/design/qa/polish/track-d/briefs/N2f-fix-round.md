# N2f — fix round for N2d/N2e (shadow clip contract, pre-cull, scrub allocation)

The Opus review (round 8) of N2d and N2e (b3995b8..91a1396) found nothing physically wrong. At 16:30 in Tel Aviv the
sun really is behind the low and mid lattices (`light.eye` ≈ 1e-21), so glitter on `light.eye` is correct. Three items
remain, plus CI.

CI on 91a1396 (run 44995756933) failed 4 of 1550 tests:
- shadow ratio 0.261, 0.280 and 0.254 against the 0.2 limit;
- `density.perf.test.ts` warm scrub ratio 0.621 against 0.59.

The perf job measured `scrub.model` p95 of 20.3 ms (Haifa) and 18.6 ms (Tel Aviv). Main measures 17.3 and 16.1 on the
same job, so about 2–3 ms of that is ours.

Fix the items below without committing.

## Must fix (ranked)
1. **Clip data in the shadow contract** (`src/scene/model/types.ts:575-576`, `model/cloudShadows.ts:154-159`).
   - Today every plane's layer is drawn `source-atop` over the whole land mask at one z (40.3), so far blobs paint
     over the near ridge. The painter runs pure in a worker and cannot recover plane outlines.
   - Add to each `cloudShadow.<plane>` desc the clip polylines in land pixels: this plane's crest and the crest of the
     plane in front, from the same `facesOf` / plane geometry the land painter uses. Do not recompute it.
   - Alternatively, give each layer a z just above its own land plane and below the next nearer one, if the
     compositor's `source-atop` then clips correctly. Say which you chose and why.
   - Test: no far-plane blob pixel lies above the near plane's crest line.
2. **Shadow pre-cull to ≤ 0.6 ms** (`src/world/flightTerrain.ts`, `cloudShadows.ts:121-124`).
   - About 293 candidates are projected every minute (the `onGround` solve plus a `blockedKm` walk), and 85–95 % of
     them are hidden. Store a running-maximum horizon slope per polar ray when `flightTerrain` builds its grid, so that
     visibility is a constant-time lookup.
   - Cull conservatively at the eye-level position, using the ray's ground maximum, before `onGround`.
   - State the conservativeness argument: the cull never drops a visible blob.
   - The CI ratio must hold with margin: ≤ 0.15 locally, so that CI's ~1.4× factor stays under 0.2.
3. **Per-minute allocation in the world snapshot.**
   - World build p50 doubled (Haifa 2.4–2.7 → 5.8–7.9 ms). The p95 spikes land on random frames, which suggests GC
     pauses (inferred).
   - Add a per-frame heap delta or GC trace to `e2e/scene.perf.mjs` (reported only) so CI confirms the cause.
   - Cut the allocation: reuse the snapshot and density-grid buffers per place and lattice (deterministic and pure:
     same inputs give the same bytes), and avoid rebuilding what does not change within an hour.
   - Fix `density.perf.test.ts`'s warm ratio (0.621 on CI against 0.59) with real work, not a looser limit.
   - Report world-build and model p50/p95 before and after.
4. **Make the glint test relational** (`outside.test.ts:370-379`).
   - Assert no glint when `light.eye` is below a threshold.
   - Assert glint strength is monotonic in eye transmission.
   - Keep the forced-clear "> 3 sparks" check.
   - Do not hard-code one seed's outcome.
5. **Document and split** `model/cloudShadows.ts` (160 lines):
   - add the error-bound comment for the footprint ellipse taken at the centre's ground height;
   - split the file under 150 lines.

## Out of scope
- `src/scene/paint/cloudShadows.ts` is Claude's: I'll write the clipped painter myself. Touch only its type import if
  the desc shape changes.
- Sun disc and glare on `light.clear` against a slant-aware value waits for N3.

## Precision
- Any cull or memo is conservative, or has a computed bound in screen px at 375 px width.
- Buffer reuse must not leak state between places, days or lattices. Add a test that builds A, B, A and compares the
  two A results byte for byte.

## Rules
- Never run a multi-line `npx tsx -e "..."`. Write a temp script and run `npx tsx <file>`. Use
  `./node_modules/.bin/<tool>`.
- Pure and seeded. Files ≤ ~150 lines, DRY. Remove dead code.
- Edit only `src/world/`, `src/scene/model/` and their tests, `e2e/scene.perf.mjs` (reporting only) and the report.
  Do not commit.
- Run `tsc -b`, `oxlint src/world src/scene/model scripts e2e`, and targeted vitest (`cloudShadow*`, `outside`,
  `density*`, `field`, `weather`, `model`). CI runs the rest and the perf job.
- Append `## Round 6` to `N2-report.md`:
  - per-item changes;
  - shadow ms and ratio;
  - allocation and world-build numbers;
  - the clip contract;
  - anything not done.
