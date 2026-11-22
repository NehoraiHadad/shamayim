# N2c — fix round for N2b (datum regression, shadow cost on real terrain)

The Opus review (round 6) of N2b (2c0a26d, merged as 0379058) found two regressions, both measured on recorded panoramas.
Rain wiring, `light.clear`, ray–cell transmission, `shadowTau` ½ and the `model.test` filter are clean; keep them.
Fix everything below in this branch, without committing. Reread `briefs/N2b-fix-round.md` and `SPEC.md` §4.3.

**Correction to N2b item 5:** `SceneTerrain.groundAt` was always metres **relative to the eye** (`terrain.ts:52` doc,
`sightProfile` returns `relativeHeight`). The round 5 claim was wrong, and the old shadow datum was right.

## Must fix (ranked)
1. **Revert the sea-level conversion in `TerrainPlanes.groundAt`** (`src/world/terrain.ts:51-55`).
   - `facesOf` (`terrain.ts:58`, then `face.ts:68,76`) treats `h` as relative, so faces and contours are empty for
     every place above sea level. Near/far face points now: Jerusalem 0/0 (was 1585/27), Haifa 0/23 (was 1747/100), Rosh
     Pina 0/0 (was 1593/715). Tiberias (−135 m) is wrong the other way.
   - Add a regression test: Jerusalem's faces are non-empty and contour heights lie in a plausible elevation range.
   - Do not edit `face.ts` or glyph code (track A).
2. **Project shadows through `flightTerrain`, not the panorama** (`src/scene/model/cloudShadows.ts:83-97, 124-149`).
   - Today `groundAt` costs about 10 µs per new x (`sightProfile.ts:38` rebuilds a ray profile per unseen x). There
     are 1,000–1,650 calls per minute, so 10–24 ms. It also thrashes the shared 512-entry profile cache.
   - `flightTerrain(sceneTerrain)` (`flightTerrain.ts:71-143`) is memoised per terrain: `heightAt(eKm, nKm)` gives
     sea-level metres in about 0.3 µs, and `blockedKm(e, n, upM)` tests visibility with no near-crest cutoff. Expose
     both from `world.ts` on `WorldState` (it already holds `flightOf(...).terrain`). Work in east/north km directly.
   - Ground height above the eye = `heightAt − eyeM`. Screen y = `horizonY − anglePx(apparentAngle(h − eyeM, km))`, the
     same mapping `terrainPlanes` uses. Reuse that function; don't copy it.
   - **Test visibility before ranking.** Today the nearest 64 are taken first, and then `seenAt` rejects them
     (`visibility.ts:15`, `km <= nearKm`). In Jerusalem under broken cloud at 13:00, 490 of 492 calls return null and
     0 blobs are drawn. Project each candidate's centre once, test it with `blockedKm`, fill 64 from the visible ones
     nearest first, then do the 8 rim points.
   - Test: Jerusalem broken cloud at 13:00 draws ≥ 10 blobs, some on the near slope (km < the near crest).
3. **Remove the frame-keyed memo** (`cloudShadows.ts:72, 127`). Its key includes the sun factors, which change every
   minute, and it needs exact cell x/y, which drift. It never hits across minutes. With grid lookups it isn't needed.
4. **Perf on a recorded panorama**, replacing the synthetic opt-in check:
   - a ratio guard by default;
   - `FIELD_PERF=1` absolute: shadows ≤ 1 ms per new minute; a new-minute `sceneModel` ≤ 2× the pre-N2 time
     (4.4–6.7 ms measured; use 10 ms).
   - Expected: 64 × 9 points × ~3 iterations × 0.3 µs ≈ 0.6 ms.
5. **Rain shaft feet use the same grid** (`src/world/rain.ts:58-69`, `world.ts:194-199`). Today up to 12 iterations on
   the 10 µs `groundAt`, so world builds reach 8–9.5 ms in steady rain (3–4 otherwise). The rain datum is correct; keep it.
6. **`lifeContinuity.test.ts`: don't change it or the timeout.** Shadmot Mehola is 25.4 s with shadows and 5.7 s with a
   stub. It must pass once item 2 lands. Run it on its own as the check.

## Out of scope
- Switching the disc, glare and glows from `light.clear` to `light.eye` waits until clouds are drawn from cells (N3).
- Painters (`src/scene/paint/`), glyph lighting and faces (track A), life, planes and birds (track C).

## Precision
- Sea-level versus eye-relative versus above-ground heights: write the datum in every variable name or comment.
- East/north km versus screen x; the sun azimuth is clockwise from north, and shadows fall away from it.
- Curvature and refraction: use the same `apparentAngle` the land uses, so shadows sit on the drawn land.
- Every approximation gets a comment with its error bound, computed, not guessed (for example, the grid's bilinear
  error against the DEM).

## Rules
- Never run a multi-line `npx tsx -e "..."`: it hangs on this shell. Write a temp script and run `npx tsx <file>`.
  The `npx` shim is broken here, so use `./node_modules/.bin/<tool>`.
- Pure and seeded: no `Math.random`, `Date.now`, clock or `ctx.filter`. Caches are deterministic memoisation only.
- Files ≤ ~150 lines, DRY. Remove dead code, including the frame memo and any unused `seenAt` path.
- Edit only `src/world/`, `src/scene/model/` (`cloudShadows`, `world` wiring, terrain planes and their tests), `scripts/`
  and the report. Do not commit.
- Run `tsc -b`, `oxlint src/world src/scene/model scripts`, and `vitest run src/world src/scene/model`. The whole set
  must pass, including `lifeContinuity.test.ts` within its 30 s limit. No full suite, perf or Playwright.
- Append `## Round 3` to `docs/design/qa/polish/track-d/N2-report.md`:
  - per-item changes;
  - new-minute shadow and `sceneModel` times on Jerusalem, Haifa and Tiberias;
  - blob counts;
  - face counts before and after the revert;
  - every test changed;
  - anything not done.
