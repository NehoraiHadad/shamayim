# N3f: the sheet must look like a sky (after the 75b2fc6 stills)

CI run 45007824196 at 75b2fc6 was green in every job, perf included. The stills are in the `stills-75b2fc6…` artifact:

- **haifa 11:30 overcast:** one flat blue-grey wash from the zenith to the horizon, still. The N3d tone spread
  (p10–p90 0.12) is not visible. There is no brighter zenith, no darker base toward the horizon, and no thin places.
  The colour is too blue: a thick deck (τ ≥ 10) passes almost no direct sky light, so it must read grey-white
  (overcast base luminance), not sky blue at partial alpha.
- **jerusalem / shadmot-mehola 11:30 broken:** the sheet is now visible, but its texture runs in **vertical streaks**,
  like curtains or drips. Perspective demands the opposite: a world-space texture viewed at a low elevation is
  compressed **vertically** into flat horizontal bands, and features stay wide near the horizon. The streaks also have
  no edges: Sc at a cover of 0.6 shows distinct lit rolls with sharp-ish bases and blue gaps (SPEC §6.0 finding 3).
  This reads as a smudge.
- **Hard horizontal seam** at about y = 620/856 in all three daytime stills: the sheet stops at some altitude and a
  flat pale band fills the rest down to the horizon. A deck continues to the horizon, compressed and fading by
  aerial perspective; it doesn't end on a line.
- **haifa 11:30 showers:** no rain is visible at all, neither shafts nor an edge mark.
- **jerusalem 21:00 overcast:** flat navy blue. At night an overcast base over a city is lit from below by the city
  (an orange-grey skyglow, brightest toward the lit horizon). Check whether the night light model covers this, and
  report. Do not invent a glow the light model doesn't have.

## Must do (ranked)
1. **Find the cause of the vertical streaks.** Dump, for the jerusalem broken fixture, the low-lattice grid as three
   small PNGs or ASCII maps (rows × cols): τv, texture and alpha. Also dump the texture sample positions `(x, y)` in
   km for column 24 over all rows. Then say which of these is it:
   - the texture is sampled in azimuth space, not on the ground plane;
   - the rows are too coarse in elevation;
   - the footprint fade (`detail`, `smoothstep(scale, 2·scale, footprint)`) leaves only τ, and τ's cell structure is
     radial;
   - the field's cells project as vertical bands.
   Fix the cause, not the symptom. The test: the texture's mean autocorrelation length along a row (in px) must
   exceed its length along a column for rows below 30° elevation (perspective foreshortening). Compute both and gate
   it.
2. **Overcast tone and colour.** With τ ≥ 10 the sheet's alpha should be ≥ 0.97 and its colour the cloud-base
   colour (the `body`/`shade` RGB from the cloud light), not a blend with sky blue. Then the N3d tone spread must be
   visible. Test: on haifa overcast, the painted sky's luminance p10–p90 within the upper half is ≥ 0.06 (in sRGB
   luminance 0–1), measured on the composed model with a pure-JS paint of the sheet layer.
3. **No seam above the horizon.** The sheet runs to the visible horizon. Below the altitude where the rows stop,
   either continue the rows (the footprint average takes over, so it is cheap) or hand over by a smoothstep across
   at least 3°. Name the old cut-off and its source. Test: no row-to-row luminance jump > 0.03 in the lowest 10° of
   any daytime fixture.
4. **Edges in Sc/Ac.** Broken Sc must have defined cloud bases. Keep τ from the field, but give the alpha a steeper
   transfer where the texture's footprint is fine: use a contrast on the texture term that sharpens the cell edge
   over about 1 texel. Derive it from the kernel slope you already use for the continuity bound, so the minute-to-minute
   continuity gate still holds.
5. **Showers.** Explain why haifa 11:30 showers shows no rain (cells out of view? `rainBankDescs` empty? a gate?).
   Fix it if it is a bug; otherwise state what the model says (where the rain is and why the edge mark is absent).

6. **Tone saturates to 0 (found after N3e).** `cloudSheet.test.ts` "keeps a low-cover floor transparent and lights gaps
   more than cores" fails at the N3e commit. On haifa 2026-11-17T12:00 low, with tau forced to 3, alpha is 0.95 but
   `tone` is 0, the same as the clear floor. `tone = 1 − Td·above/aboveMax` must not clamp to 0 for τs = 3 (Td about
   0.75). Find why `above/aboveMax` exceeds 1/Td there: a normaliser taken from the wrong layer or hour, or the
   upper-layer transmission changing with the new day anchor. Fix the normaliser, not the test. Also say why
   `floorTau` for that layer is now exactly 0.

## Precision
- Every number has its source: perspective, the optical constants, the light model's RGB.
- No per-place or per-frame tuning. Do not touch the N3e files (`src/world/field/*`). Codex N3e is editing those in
  parallel.
- The painter `src/scene/paint/cloudSheet.ts` is Claude's. If you believe it causes the streaks, prove it with the
  dumps and say what should change; do not edit it.

## Rules
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
- Pure, seeded, no clock. Files ≤ ~150 lines, DRY, no dead code.
- Edit only `src/scene/model/cloudSheet*.ts`, `src/scene/model/clouds.ts`, `src/scene/model/weather.ts` and their
  tests. Do not commit.
- Run `tsc -b`, oxlint on the touched files, and vitest with explicit paths: the cloudSheet tests, `sky.test.ts`,
  `weather.test.ts`, `model.test.ts`.
- Append `## Round 13 (N3f)` to `N2-report.md`. Write it after Round 12 if that exists; otherwise leave a placeholder
  heading for Round 12 above it.
