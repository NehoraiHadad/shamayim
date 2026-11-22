# Worship ownership, round 6: "mosques no, landmarks yes" (owner decision)

Start after the merge of origin/main is finished (BRIEF-merge.md). Same process rules: targeted test files only,
`npx tsc -b`, `npx oxlint`; never whole folders; never a multi-line `npx tsx -e`; never call live services; do not
commit.

## Owner decision (2026-11-22, verbatim): "מסגדים לא, ציונים כן"

Decision B with the 2× cap culled every neighbour on the 18 recorded panoramas and every famous far landmark
(REPORT.md Round 4/5 tables). The owner chose:

1. **Mosques no.** A non-own mosque (`minaret` kind, and any mosque-like kind) is never drawn, famous or not.
   Other generic non-own places of worship (church, synagogue, shrine… of a non-own town) are not drawn either,
   unless they are famous landmarks (rule 2). Settlements stay clean.
2. **Landmarks yes.** Famous named landmarks of a non-own place are drawn as a legible icon. The class comes from data:
   the existing famous/named-landmark flag or source the scene already uses (find it: e.g. `famous` on `GlyphDesc`, the
   landmark rank/curated source in `src/data/landmarks/`), never a hand list of ids. For this class:
   - drawn at `max(true, LEGIBLE_PX)` with **no** `MAX_EXAGGERATION` cap; record the factor on the glyph as now;
   - haze from the true distance, as now;
   - the drawn box keeps the 6 px gap from the home roofline (with the bounded 12 px slide away from home), as now;
   - visibility: its foot is visible, **or** terrain (a ridge, not a building or the home roofs) hides the foot but the
     landmark's true top projects above that ridge line at its bearing. In that case draw it standing on the ridge line
     at its bearing (base on the ridge's drawn top there). Nothing painted in front other than that ridge may cover it.
   - Town support: a famous landmark inside a non-own town still needs its town's drawn mass (as now), unless it stands
     on a ridge line by the rule above. State this choice in a comment.
3. Everything else non-own (castle, antenna, tower… not famous) keeps round 5's rule unchanged (floor 4 px, cap 2×).
4. One shared policy function (kind + famous → rule), used by both layers and by pre-selection
   (`NEIGHBOUR_MIN_TRUE_PX` must not pre-cull famous landmarks the new rule would keep; a famous candidate needs only a
   true visible height > 0). No place-specific code.

## Tests

- Across the 117-place set and all 18 recorded panoramas, both widths: no non-own `minaret` (or mosque-like) glyph is
  ever drawn; no non-own non-famous worship glyph is drawn; every kept famous landmark has `factor` recorded, ≥4 px,
  gap ≥6 px, haze from true distance, and a visible foot or ridge-line base.
- Unit tests: a famous landmark needing 5× is kept; a non-famous castle needing 3× is culled; a famous mosque is culled;
  a famous landmark whose foot is behind a ridge but top is above it stands on the ridge; one whose top is below the
  ridge is culled; one behind home roofs is culled. Each must fail without its safeguard; say how you checked.
- Keep the fast test under ~60 s per test.

## Evidence

Stills at 375 px, DPR 2, with `e2e/scene.stills.mjs`: Karmei Tzur (`--flat=31.6092,35.1009,כרמי צור`, clean) and one
**recorded** panorama where מבצר נמרוד or כנסיית הר האושר (or another famous landmark) is now kept: find it from the
audit data (which recorded place sees it). If no recorded panorama keeps one, say so and use the closest honest option,
labelled. 4× crop of the landmark region. Update `stills/README.md` (per glyph: kind, famous, true px, drawn px, factor,
gap, slide, haze km, base: foot|ridge).

## Docs

REPORT.md `## Round 6` with per-layer kept counts (18 recorded, 117 set) and the famous landmarks table before → after
(kept, or the reason dropped). TASKS.md worship section: the decision with the quote and the rule. Re-run the audit probe
(background) and update AUDIT-table.md After.
