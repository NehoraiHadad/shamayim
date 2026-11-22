# Worship ownership, phase 2: beyond glyphs are occluded, true-size and hazed like their town

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`, branch `claude/fix-worship-ownership-7d2a`.
Read first: `BRIEF-audit.md` and `AUDIT-table.md` in this folder (your phase 1), `docs/design/qa/polish/track-b/NOTES.md`,
`src/world/beyondSeat.ts`, `src/world/beyondMarks.ts`, `src/world/seatBudget.ts`, `src/scene/model/outsideMarks.ts`.
Do not commit. Do not touch `src/test/probe/`.

## The case (production, verified)

Karmei Tzur (osm:way:462664109, 31.6092, 35.1009; camera faces SSE, 3.85 km back). The world draws
`il-minaret-31.58592-35.10681` (a Halhul mosque, 17 m tagged, 2.65 km SSE of the place, 6.46 km from the camera) seated
on Halhul block `315_351:5:41`, at x 166.6–169.8 of 375, 3.9 px tall, base at 78.2 % of the scene height. Karmei Tzur's
own drawn mass spans x 156.8–221.2 with its highest roof top at 77.3 %. The glyph's foot is behind the settlement's own
houses, so it rises out of Karmei Tzur's roofs and reads as a mosque in the settlement. The seat is on the right town at
the right distance; the gap is that nothing checks what stands in front of it.

## Step 0: write the phase-1 table from the data you already have

Phase 1 timed out before writing `AUDIT-table.md`. Do not re-run the 14-minute probe for it: write `AUDIT-table.md` from
`src/test/probe-worship/{summary,analysis,inspect-bc}.txt` (columns and Findings groups A–D as in `BRIEF-audit.md`).
Note: the audit's Karmei Tzur uses the test point 31.6047, 35.1081; production geocodes it at 31.6092, 35.1009, where the
Halhul minaret appears. Add the production point as its own row.

Phase 1 found two classes in synagogue-only places (490 places, 204 non-synagogue glyph rows):
- **Beyond seats over the own mass:** 12 minaret rows per width with `overlapSpan=true` (e.g. Kiryat Arba → مسجد أبو
  عبيدة, Hebron block, 1.25 km), the Karmei Tzur pattern.
- **Far-plane marks drawn at a fixed size:** `role=other plane=plain layer=marks.far` minarets/churches at 8–16 km with
  `HALL_M` 9 m drawn at `hPx=8.0` (e.g. Shvei Darom → Ibn Othman Mosque, Gaza, 16.24 km: 9 m subtends ~0.03°). That
  is an inflated size. Rules 2 and 3 below apply to these far-plane marks too, and rule 1 applies wherever a nearer
  drawn mass stands in front of them.

## Rules (one each, geometry, every place and every kind; no special cases)

These apply to every mark the place does not own: beyond seats and far-plane marks alike.

1. **Occlusion.** A beyond glyph (any mark seated on a beyond town's block) is drawn only when the foot of its seat is
   visible: at every x of the glyph's box, no nearer drawn mass (the place's own skyline boxes, nearer beyond blocks,
   nearer seated glyphs, and the terrain ridge, whichever the scene draws nearer) has its top above the glyph's foot.
   Otherwise the glyph is culled, as terrain would hide it. Use the same drawn geometry the scene paints (after the
   scene model's final block boxes), not a proxy. If a margin is needed, state it in px with its physical reason.
2. **True apparent size.** Find and state the scene's vertical scale: px per degree of elevation angle at 375 px, and
   any deliberate vertical exaggeration (relief, `vscale`, land vs marks). Beyond glyphs must use exactly the scale
   their town's mass uses at that distance; if they do not, make them. A 17 m tower at 6.46 km subtends ~0.15°. Define one
   legibility floor in px with a comment on why that value; a glyph whose true size falls below it is not drawn,
   never inflated.
3. **Haze.** A beyond glyph gets the same aerial haze (same function, same distance input) as its town's drawn mass, so
   it never reads as near. If painters already take a haze/distance parameter, feed it from the world; painters stay
   pure and untouched otherwise.

Keep one world state (built at `SCENE_W`); apply the screen-width-dependent part where Track B already re-budgets
(`outsideMarks`, after final containment). Run the seat budget after this cull, so a freed slot can go to a visible seat.

## Tests

- Across **all bundled settlements** (the named home clusters of `public/data/city/il`, as in your audit; flat terrain
  where no panorama is recorded, stated in the test), at 375 and 1280 px: no drawn beyond glyph's foot lies behind a
  nearer drawn mass; every drawn beyond glyph's height equals its true angular size times the scene's px/° (within a
  stated tolerance) and is at least the floor; its haze equals its town mass's haze. Keep the test under ~150 lines per
  file, with a shared helper; keep runtime reasonable (say how long it takes).
- Karmei Tzur at the production point above: keeps `שבת אחים`, drops the Halhul minaret.
- Each assertion must fail without its safeguard: say how you checked.
- Existing Track B tests stay green; any changed expectation is listed with its physical reason.

Files about 150 lines, do not grow files already over it (`outside.ts`, `marks.ts`, `place.ts`, `types.ts`); new logic
in small modules. DRY. Comment every constant with its physical meaning and source. Never cite "the brief".

Shell rule: never run a multi-line `npx tsx -e "..."`; write a script file. Never call live services.

Run: `npx vitest run src/data/landmarks src/data/city src/world src/scene/model`, `npx tsc -b`, `npx oxlint`. Then
re-run your audit probe and add an **After** column/section to `AUDIT-table.md` (per place: glyphs before → after).

End with a report: files changed (one line each, why), the stated scale/floor/haze facts, commands and results, every
changed expectation and why, and the audit summary counts before → after.

## Handover from phase 1 (Neon ran out of quota mid-way)

Nothing in `src/` was changed. Neon's last probe (`src/test/probe-worship/check-beyond-sizes.{test.ts,txt}`) measured
`horizonSlope = 9.8333 px/deg` at 375 px and found Rosh Pina's drawn beyond blocks (10 m) at 1–4 px where their true
angular size is ~0.6–1.5 px. Verify this and find whether beyond masses carry a deliberate vertical exaggeration; if
they do, glyphs must share exactly that scale (rule 2), and the stated floor is compared against the same scale.
Jerusalem's one seat (il-minaret-31.763-35.26575, 9.36 km, 2.95 px) is the case to check that against.
