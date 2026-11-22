# N2e — CI round for N2d (sea glint, shadow budget on CI, scrub.model p95, shadow layer shape)

CI run 44993185800 on 6557681 (N2d merged with main 7c50d4f). Main itself is green. Of 1540 tests, 5 failed. I fixed
the purity hit myself (a `window` variable in `calibration.test-helper.ts`). The perf job reports
`scrub.model p95 23.6 ms > 15.0` for Haifa and Tel Aviv (p50 9.1 ms across 60 scrubs). Fix the items below without
committing.

## Must fix (ranked)
1. **Tel Aviv's sunset sea path is gone** (`src/scene/model/outside.test.ts`, "lays the light's path toward the
   setting sun over Tel Aviv's sea": expected > 3, got 0). This passes on main, so N2–N2d broke it. The likely cause is
   N2b's repointing of glitter to `light.clear` / mean transmission (`outside.ts:70-85`).
   - Find the cause with numbers: `light.clear`, `light.eye` and `direct` at that minute against main's
     `cloudTransmit`.
   - Fix the physics, not the test. Glitter needs the sun disc to be seen through the cloud field along the eye ray,
     and a clear evening must still glint.
2. **Shadow cost on CI** (`cloudShadowPanorama.test.ts`): ratios were 0.31 (Jerusalem), 0.46 (Haifa) and 0.41
   (Tiberias), against the 0.2 limit. The limit is correct. The code is still about 1.5–2.3× over the 1 ms budget.
   - Profile one new-minute pass on the recorded panorama: count `heightAt`, `blockedKm` and `onGround` iterations,
     and the rim points per accepted blob.
   - Cut the work until the ratio holds on CI with margin. Options:
     - fewer `onGround` iterations (state the convergence bound);
     - rim points only for blobs whose centre is visible;
     - memoise by cell id with the sun direction quantised, keeping the error below 1 px at 375 px and saying so.
3. **`scrub.model` p95 ≤ 15 ms** for Haifa and Tel Aviv in `npm run test:perf` (CI's perf job). Find what the p95
   minutes spend that the p50 minutes don't: the field snapshot, transmitAlong, the shadows, or rain. Report the
   split.
4. **One shadow layer per land plane, not one per blob.** CI's "scrub repainted" list holds hundreds of
   `cloudShadow.<cellId>` layers, so every scrub creates and repaints new layers.
   - Emit one `cloudShadow.<plane>` layer per land plane (`near`, `far`, …) whose desc carries the blob list:
     ellipse or rim points, alpha and cell id.
   - Keep the key stable across a scrub so the compositor repaints one canvas per plane.
   - Update the existing painter call site minimally. I'll write the real painter afterwards: blobs clipped to the
     land faces.
   - Check the shape of `src/scene/model/types.ts` against the painter in `src/scene/paint/` and keep both
     compiling. You may touch only the painter's type import and the call that reads the list.

## Precision
- Any memo has a stated, computed error bound in screen px at 375 px width.
- The sun azimuth is clockwise from north. Shadows fall away from the sun. Heights are eye-relative km (`heightAt` is
  sea level minus `eyeM`).

## Rules
- Never run a multi-line `npx tsx -e "..."`. Write a temp script and run `npx tsx <file>`. Use
  `./node_modules/.bin/<tool>`.
- Pure and seeded. Files ≤ ~150 lines, DRY. Remove dead code.
- Edit `src/world/` and `src/scene/model/` and their tests, plus the minimal painter call site for item 4. Do not
  commit.
- Run `tsc -b`, `oxlint src/world src/scene/model scripts`, and targeted vitest: `outside`, `cloudShadow*`,
  `weather`, `model`, `livingLight`, `planes`. CI runs the rest.
- Append `## Round 5` to `N2-report.md`:
  - the cause and fix of the sea path;
  - the shadow profile before and after;
  - the p95 split;
  - the new layer shape;
  - anything not done.
