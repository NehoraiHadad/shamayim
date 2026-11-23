# Clouds: shapes and gaps (writer "clouds")

Read COMMON.md, clouds.diagnosis.md and clouds.patch in this folder first.
Do fixes A + A2 (`cloudSheetSeen.ts`: the eye's proportions above DOME_ALT, the cells' own fractal outline) and T (far towers' aspect), with
the five tests the diagnosis lists.
- `towerHeight.test.ts`'s lower bound must become the new rule, as explained. Move `shapeOf` + `sceneStretch` out of `cloudCells.ts`. Another
  writer, "sky", edits the lit tone near `cloudCells.ts:134` and `cloudSheet.ts`'s `through`: keep your hunks in those two files minimal and
  away from colour code.
- Perf is a hard condition: `cloudSheet.perf.test` (<= 3.5 ms, <= 25 % increment) must pass. Restrict the cells per row first (a row is one
  range), precompute outline tables, avoid per-sample trig. Report ms before/after for neve-zohar 16:00, haifa 15:30, tel-aviv 12:00,
  haifa 2026-03-15 14:00.
- Continuity: prove by test that a cell drifting across DOME_ALT and through a midnight handover changes outline smoothly (max alpha step
  per minute bounded, no popping), and that mean cover above 23 deg holds within .02 over >= 100 drawn fields. Derive OVERLAP (1.07) from
  the measured overlap if that is simple; otherwise state how it was calibrated and test it.
- Do not do B, C, D of the diagnosis. Both hands read the same desc: check that both painters accept the new raster without change.
