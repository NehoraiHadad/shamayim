# N2b — fix round for N2 (light, shadows, rain)

N2 (commit 5297bd4) has 16 failures in `src/world` and `src/scene/model`. The Opus review (round 5) measured the cause
and classified each failure. Fix everything below in this branch, without committing. Read `briefs/N2-light-shadow-rain.md`
and `SPEC.md` §4–5 again first.

**Correction to the N2 brief:** line 57 took `k_L` from each layer's own cover. That is wrong, and item 2 below replaces
it.

## Must fix (ranked)
1. **Shadows cost 0.3–0.9 s per `sceneModel`** (`src/scene/model/cloudShadows.ts:46-137`). Before N2 it was 4–7 ms.
   - Today: 41k–108k terrain calls per model, from the `onGround` fixed-point loop (up to 12 `groundAt` calls) and 8
     `seenAt` rim points, both run on every visited cell before any culling. A second `visitCells` call over 60 km adds
     another 5–9 ms.
   - Take cells from `cloudField.snapshot`; drop the second visit.
   - Cull by alpha ≥ 1/255, range and azimuth-in-view before any terrain call.
   - Pick the 64 blobs by importance (nearest or largest on screen), not by scan order. The early stop at 64 puts all
     the blobs on one side today.
   - Cache each cell id's ground projection across minutes (pure memoisation).
   - Budget: ≤ 1 ms per `sceneModel`, with a perf test (ratio by default, absolute with `FIELD_PERF=1`).
2. **`cloudTransmit` changed meaning under its users** (`src/world/lightCloud.ts:6-15`).
   - Take `k` from the combined cover `C = 1 − Π(1 − c_L)`, not from each layer. T_open is gap light only.
   - Add `light.clear`: the mean Π T̄ or the eye value, whichever each user means.
   - Repoint every user that means "is the disc clear":
     - `src/scene/model/optics.ts:96`: rainbow `lit`;
     - `sky.ts:120`: `veilOf`, which feeds `rays.ts:75` glare, the sun disc in `bodies.ts:32`, and `clouds.ts:46`;
     - `outside.ts:70-85`: sea glitter;
     - `clouds.ts:39-40`: `above`, which should use the mean transmission.
   - The c10 rainbow and c9 glare tests must pass **unchanged**. In c10 at 95 % steady rain, direct went 0.073 → 0.509
     and a rainbow appeared.
3. **`transmit.ts` is undersampled** (`src/world/field/transmit.ts:38-45`).
   - Today: 12 columns 0.75 km apart against low cells of r ≈ 0.3–0.5 km, so whole cells fall between columns. The
     error against a fine march reaches 0.64–0.96.
   - Use exact ray–cell intersection, or a step ≤ r_min/2.
   - Fix the error-bound comment.
   - Test against a fine march (column step 0.02 km), |ΔT| ≤ 0.03.
   - Add a sub-minute eye continuity test at 6 s steps. It is N3's baseline.
4. **The rain wiring breaks the drawn clouds** (`src/world/world.ts:196-199`).
   - It overwrites the raining layer's `banks` with `rainBanks(rain)` (1° stubs), so the clouds turn into rain stubs.
   - Stop overwriting `clouds[].banks`. Expose `rain.cells` for the shaft painter. Keep `rainBanks` (`rain.ts:83`) only
     as a separate adapter the shaft painter reads.
   - Add a `weather.test` case with rain out of view, so `edgeMark` is exercised again (`weather.test.ts:298`).
5. **Shadow ground height uses the wrong datum** (`cloudShadows.ts:61-77`).
   - `groundAt/1000` is height above sea level, but the code treats it as height above the eye. That is about 2 km of
     displacement in Jerusalem at a 20° sun.
   - Use `(groundAt − eyeM)/1000`.
   - Test with eyeM ≠ 0 and sloping ground.
6. **Rain ranking ignores `rainWeight`** (`src/world/rain.ts:35-39`), so Cu humilis rains.
   - Rank by `rainWeight·τ0·R²` and drop weight-0 cells.
   - Document the 10 km low-candidate range, or widen it.
7. **The ½ diffraction factor is inconsistent** (`density.ts` `shadowTau`). `transmit` and `cloudShadows` apply ½, but
   `shadowTau` returns the full slant τ.
   - Make it consistent, or document why not.
   - State the error from using layer-mean heights, or use per-cell heights.
8. **`model.test.ts:138` is stale:** cloud shadows are `placed` land layers. Exclude `kind === 'cloudShadow'` from that
   filter, or don't mark shadows `placed`.
9. **livingLight's 0.55·Δbeam subtraction** stays only once item 3 is in. Then the steps it exempts are physical, not
   aliasing.
10. **Moon** (`light.ts`): N2 removed the `moonCloud` veil. Test that a thin cirrostratus veil still dims the moon.
11. **Effective τ:** extend the far-field transmission check to tower, mid, high and overcast (today only 2 low cases).
12. Low priority, `world.ts:193`: take `groundAboveEyeKm` from `groundAt` at each shaft's foot rather than the
    forecast-grid elevation.
13. **Test cost:** in the tests you touch, build one `worldInput` and vary only `selected`. A fresh `worldInput` per
    minute rebuilds the forecast, about 100 ms each.

## Out of scope (Claude or N3)
- The shadow polygon painter and the rain shaft, trail and virga painter are Claude's.
- Sub-minute motion is N3.
- Glyph faces lit from T at their own ground point belong to track A or N3. Don't touch glyph lighting.

## Precision
Pay attention to subtleties and physical accuracy:
- above-sea-level versus above-eye versus above-ground heights;
- the sun's azimuth is degrees clockwise from north, and shadows fall away from it;
- E[exp(−τ)] ≠ exp(−E[τ]);
- the ½ diffraction factor;
- "is the disc clear" versus "light through the gaps".

Every approximation gets a comment with its error bound, computed, not guessed.

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock, no `ctx.filter`. Caches are deterministic memoisation
  only.
- Files ≤ ~150 lines, DRY, meaningful names. Remove dead code you make.
- Edit only:
  - `src/world/` and its tests;
  - in `src/scene/model/`: `cloudShadows`, `sky`, `optics`, `rays`, `bodies`, `clouds`, `outside`, and the tests named
    above;
  - `scripts/`;
  - the report.
- Do not touch glyph lighting or faces (track A), life, planes or birds (track C), or `src/scene/paint/` (Claude).
- Do not commit.
- Run `npx tsc -b`, `npx oxlint src/world src/scene/model scripts`, and `npx vitest run src/world src/scene/model`. The
  whole set must pass. Rerun as often as needed. No full suite, perf or Playwright: CI runs them.
- Append `## Round 2` to `docs/design/qa/polish/track-d/N2-report.md`:
  - per-item changes;
  - `sceneModel` time before and after;
  - T_code against T_fine;
  - the shadow budget;
  - every test changed and why;
  - anything not done.
