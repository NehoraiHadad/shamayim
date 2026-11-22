# N2 — light, ground shadows and rain from the cloud field

N1 (the field core, `src/world/field/`) passed review at 82b8e5b. N2 makes the field drive the app's light, the cloud
shadows on the land and the rain, so all three come from one world state. Read `SPEC.md` §0–5, §7 and §8 first.
§4 (light), §4.3 (shadows), §5 (rain) and tests 2, 3, 8 and 10 are this round.

## Part A — finish N1 (review round 4, ranked)
1. **Mean τ is wrong for light beyond the raster** (`density.ts:93-94, 104-108`).
   - The expected field returns mean τ, and exp(−mean τ) is far below E[exp(−τ)] for broken cloud. At 64 % low the true
     mean transmission is 0.536, but the code gives 0.000; sparse low gives 0.313 against 0.936.
   - Return an effective τ with exp(−τ_eff) = E[exp(−τ)]. In the Boolean model, −ln T̄ = Λ_local · (area mean of
     (1 − e^(−τ_cell))). Compute it per layer when the field is built.
   - Test: the ensemble mean transmission over an annulus beyond the raster, against the exact cells (tolerance 0.03).
     Also test the fade zone and the stated 0.0117 clump-cache error.
   - Rename today's ~1e-16 near "RMS" test as an index-completeness check with a bound of 1e-12. It is not an accuracy
     test.
2. **`shadowTau` reads one height and assumes the ground is at eye height** (`density.ts:118-126`).
   - Integrate the slant path: slant τ = (1/sin alt) × the mean over n heights z_k in [base, base + v] of
     τ_col(p + (z_k − z_g)·cot(alt)·ŝ), with n ≥ v·cot(alt)/(r/2).
   - Return slant τ, not column τ.
   - Add `groundAboveEyeKm`: heights are above the eye (`types.ts:20`), and valley or slope ground must offset by its own
     height.
   - Why: at a 20° sun a 0.8 km low cell shifts ±1.1 km, more than its radius; a Cb shifts ±11 km.
3. **Tower periods were chosen to fit the bound, not the physics** (`cells.ts:61-63`, `periodScale`).
   - A single Cb cell lives about 30–60 min (Byers–Braham: three stages of 15–30 min each). Put `[30, 60]` in `LATTICES`.
   - Delete `periodScale` and its hand copy in `continuity.test.ts:80`.
   - Widen the tower share ramp δ from 0.25 to 0.4, about a 24 min developing stage. The bound becomes
     3.75 × (1/60 + 0.15·sin(π/30)) = 0.121.
   - Refit the tower calibration row.
   - I add the SPEC tower row myself; you put the numbers in the report.
4. **Rain weight is not tied to the app's raining layer** (`cells.ts` `fieldCell`).
   - Pass the raining level and rate from `world/rain.ts` (`rainingLayer`) into the field input.
   - Weight by genus: Ns, Cb and Cg rain; Sc and St drizzle when the low layer rains; Cg below Cb. Comment each factor.
5. **Timing guard** (`density.test.ts:77-123`).
   - Make the reference loop allocate (small objects plus a Float64Array), like the scrub does.
   - Apply the ratio to cold scrub too.
   - Print the ratio so it can be calibrated on CI, and set the cap from it with a 30 % margin.
6. **Split `density.test.ts`** (182 lines): move the timing and profile tests to `density.perf.test.ts`. Add a real
   `shadowTau` test (see test 2 below).

## Part B — N2
**B1. Transmission along a ray.** Implement `transmitAlong(field, snapshot, az, alt, t)` as SPEC §4.1 specifies:
- the slab entry and exit per lattice, curvature included;
- K samples per slab;
- T = exp(−Σ τ_slant / 2);
- the disc average over 5 rays;
- the gap rule for unresolved Ac and Ci.

Read the snapshot grids (near) and the effective τ (far); do not enumerate cells per ray.

**B2. Eye and direct light** (SPEC §4.2), in `src/world/light.ts`:
- `light.eye = clear × T(eye → disc)` drives:
  - the disc veil, aureole and glows;
  - `rimX`;
  - the cloud-edge backlight;
  - `shadow.softness`.
- `light.direct = clear × T_open`, with `T_open = Π T̄_L^k_L`, `T̄_L = 1 − c_L·(1 − e^(−τ̄_L/2))` and
  `k_L = smoothstep(0.75, 0.97, c_L)`. This is the new `cloudTransmit`: only closed decks dim the land's base light.
- `diffuse = 1 − Π T̄_L`.
- Keep every existing consumer of `Light` working, and keep `Light`'s shape stable. Add `eye`; do not rename fields.
  Track A just made `across` the one signed light: don't touch it.
- Moon: the same rule.
- `light.ts` is 152 lines: split it along a real seam, for example the transmission maths into `lightCloud.ts`.

**B3. Ground shadows** (SPEC §4.3): replace the tile patches in `src/scene/model/cloudShadows.ts` with field blobs.
- Enumerate the low, tower and mid cells whose shadow centre is within the visible land's range (≤ 60 km) and in view.
- Sweep each footprint from its base offset to its top offset along the anti-sun direction.
- Project 8 rim points with `seenAt(x, km)`, and drop the hidden ones.
- Alpha = `0.65·(1 − T_cell/T_open)·light.direct`.
- Cap at 64 blobs, laid `source-atop`.
- The ground height of each point is the terrain's height there, above the eye.
- Keep the scrub cheap: the blobs move with the field, and a scrub must not repaint a tile cache per minute.
- Budget: ≤ 1 ms.

**B4. Rain** (SPEC §5), in `src/world/rain.ts`:
- `f_r` as specified;
- rank the raining lattice's on-cells by τ0·R², towers first;
- `r_i` as a smoothstep over cumulative area;
- shafts falling from the base with a 0.6·R footprint, the parabolic trail and fall speed by type;
- virga by base height and dryness;
- near rain only when the eye's ground point is inside a footprint;
- `Rain.cells` gains `x`, `y`, `radiusKm`, `share` and `virga`, keeping its existing fields.

Distant Cb shafts come from the cell list, because `cellAt` covers only the raster; document that.

**B5. Wire it into `src/world/world.ts`.**
- Build the field once per forecast, place and day: `buildField` is memoised, so put it behind the same memoOne pattern
  as the other parts.
- Take a snapshot per scrub for the shown minute.
- `world.ts` is already 271 lines: put the field wiring in its own module, `world/cloudField.ts`, called once from
  `world.ts`.
- Motion uses track C's clock, already on main: `LifeClock { laidAt, sinceS }` in `src/scene/model/types.ts`. The field
  minute is the shown minute, with no second clock. N3 handles sub-minute motion; N2 reads the shown minute only.

## Tests (SPEC §8)
- **2. Shadow under the cloud.**
  - For seeded cells and sun altitudes {5, 20, 45, 70}°, the ground point `centre − (z_mid − z_g)·cot(alt)·ŝ` has
    low T.
  - The emitted blob is within 50 m of it.
  - A point 3R to the side has T = 1.
  - Include ground above and below the eye.
- **3. Direct behind a drawn cell.**
  - A sun at an emitted cell's `(az, alt_mid)` gives `eye/clear ≤ 0.1` when τ0 ≥ 10.
  - An uncovered direction gives ≥ 0.95.
  - Drawn-covered and T < 0.5 agree at ≥ 97 % of sample directions above 6°.
- **8. Rain.**
  - Every shaft lies under a cell with r_i > 0.
  - No rain at the eye outside every footprint.
  - The raining area share ≈ f_r within 0.1.
- **10. Perf** (`FIELD_PERF=1` absolute, ratio by default):
  - shadows ≤ 1 ms;
  - transmission for the disc and eye ≤ 0.3 ms;
  - field warm ≤ 2 ms.
  The whole model must stay inside 10 ms; CI's perf job reports it.
- **Regressions.** Every existing test in `src/world` and `src/scene/model` stays green. Run them, including
  `planes.test.ts`, `livingLight.test.ts` and `lifeContinuity.test.ts`. If a test there asserts the old tile shadows or
  the old `cloudTransmit` numbers, update it only when the new value is the physical one, and say so in the report.

## Precision
Pay attention to subtleties and physical accuracy:
- real cloud heights and sizes; ellipse areas;
- wind is "from", so it blows toward from + 180; km/h ÷ 60 = km/min;
- above-ground versus above-eye versus sea-level heights;
- the sun's azimuth is degrees clockwise from north (`astro/sun.ts`), and shadows fall away from it;
- the ½ diffraction factor; E[exp(−τ)] ≠ exp(−E[τ]).

No unstated approximations: every approximation gets a comment with its error bound, computed, not guessed.

## Rules
- Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a temp script
  file and run `npx tsx <file>`.
- Pure and seeded: no `Math.random`, no `Date.now`, no clock. Caches are deterministic memoisation only. No `ctx.filter`.
- Files ≤ ~150 lines, DRY, meaningful names. Remove dead code you make, including the old tile-shadow code once
  replaced.
- Edit only:
  - `src/world/` (field, light, rain, world wiring and their tests);
  - `src/scene/model/cloudShadows.ts` and its test;
  - `scripts/`;
  - `docs/design/qa/polish/track-d/N2-report.md`.
- Do not touch:
  - glyph lighting or faces (track A);
  - `life.ts`, `lifeSchedule.ts`, `lifeAhead.ts` or the planes and birds code (track C);
  - `src/scene/paint/clouds/` (Claude's painters).
- Do not commit.
- Run only:
  - `npx tsc -b`;
  - `npx oxlint src/world src/scene/model scripts`;
  - `npx vitest run src/world src/scene/model`, or single files;
  - the calibration script.
  Rerun as often as needed. No full suite, perf or Playwright: CI runs them.
- Write `docs/design/qa/polish/track-d/N2-report.md`:
  - per-item changes, Part A then Part B;
  - measured numbers from the final code: effective-τ transmission error, shadow offset error, tower continuity worst
    case, the timings;
  - every test you changed and why;
  - anything not done.
