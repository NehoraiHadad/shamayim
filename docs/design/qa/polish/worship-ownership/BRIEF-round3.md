# Worship ownership, round 3: a neighbour reads as a neighbour (owner decision)

Same worktree and branch; rounds 1–2 are uncommitted. Same process rules as round 2: targeted test files only, plus
`npx tsc -b` and `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live services; do not
commit.

## Owner decision (2026-11-22, verbatim)

"מסגדים של כפרים שכנים שבאמת נראים מהיישוב — אבל צריך להיות ברור שזה של ישוב שנמצא ליד ולא נראה בתוך הישוב. גם אם
זה מתרחק מעט מהאמת."

Keep the neighbour glyphs that are truly visible, but readability wins over strict truth: at a glance each must read as a
separate nearby village, never as part of the home settlement. One general automatic rule, for every place and every
non-own kind; no per-place code.

## Rules

1. **Own town around it, gap from home.** A beyond glyph is drawn only where its own town's drawn mass is visible
   around it: at its foot and on both sides, by at least a stated width in px. Its whole footprint (drawn glyph box,
   not the seat box) keeps a clear horizontal gap of N px from the home settlement's roofline span (own drawn skyline,
   after the scene model's final boxes). Choose N and justify it in the constant's comment (perceptual grouping at the
   scene's scale, e.g. as a multiple of the glyph width or of the home house width). If the gap is not met, slide the
   glyph within its own town's visible mass, away from home, to the nearest spot that meets both conditions; if none
   exists, cull it. State the slide's maximum in px and that this is a deliberate, bounded departure from true position.
2. **Distance reads.** The glyph uses its town's haze and its true, smaller angular scale (rounds 1–2), so it sits
   visibly further back than the home roofs. Check that a kept glyph's haze is never lighter than the home roofs' haze.
3. **Tests.** Across all settlements in the committed fast test (round 2's set, 375 and 1280 px): no neighbour glyph's
   footprint overlaps or comes within N px of the home roofline span; every drawn neighbour glyph stands on visible mass
   of its own town; slides never exceed the stated maximum and always move away from home. Each assertion must fail
   without its safeguard (say how you checked).
4. **Stills.** Record a still of Karmei Tzur and one of a settlement that keeps a neighbour glyph, using the project's
   existing stills tooling (find it: `src/dev/sceneHarness.tsx`, `docs/design/qa/canvas/`, the stills CI job). No live
   services: if Karmei Tzur has no recorded panorama, say so and use the closest honest option the tooling allows
   (e.g. a recorded place with the same pattern), labelled as such. Save them under
   `docs/design/qa/polish/worship-ownership/stills/` and list what each shows.

## Docs

- Add the owner decision and the rule (with N, the slide maximum and the side-width) to `REPORT.md` as `## Round 3`, and
  to `TASKS.md` under a new "Worship ownership (audit follow-up)" section: decision, rule, who wrote what (Neon: audit
  probe; Codex gpt-6.2-sol: implementation rounds 1–3; Opus subagent: review), and open follow-ups.
- Re-run the audit probe (background is fine) and update `AUDIT-table.md`'s After section: counts per group before →
  after, and the list of kept neighbour glyphs with their gap in px.

## Also from round 2's diff

A beyond block height is clamped with `Math.min(7, Math.max(0.5, apparentHeight(...)))`. The `0.5` floor inflates
blocks whose true size is smaller, and the `7` cap shrinks larger ones: both break rule 2 of round 1 (true size, cull
under a stated floor, never inflate or clip). Find every such clamp on non-own masses and marks; replace each with the
true size plus the one stated floor (cull below it). If a cap is physically justified, state why in its comment.
