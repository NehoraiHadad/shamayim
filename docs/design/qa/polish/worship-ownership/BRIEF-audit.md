# Worship ownership, phase 1: audit every settlement (no fix yet)

Worktree `P:\projects\Shamayim\.claude\worktrees\fix-mark-ownership-caed9e`, branch `claude/fix-worship-ownership-7d2a`
(from `origin/main`; Track B, audit #2, is merged: read `docs/design/qa/polish/track-b/NOTES.md` and
`git show 3ae092d --stat` first). Do not commit. Do not change anything under `src/` except a new probe folder
`src/test/probe-worship/` (it stays uncommitted). Do not touch `src/test/probe/`.

## Problem

The owner reports mosque/minaret glyphs still drawn in Jewish settlements. We need the facts before any fix.

## Shell rule

Never run a multi-line `npx tsx -e "..."`: on this Windows shell it waits on stdin and hangs. Write a script file and run
it with `npx tsx <file>`, or write a vitest probe and run `npx vitest run <file>`. Never call live services: load only
bundled data from `public/` (see `stubPublicFetch` in `src/test/sceneWorld.ts`).

## What to build

A probe that, for each place, builds the real world (`src/world/world.ts` path, as `src/test/sceneWorld.ts` does) and the
real scene model (`src/scene/model/`, the same call the canvas makes, at 375 px and at 1280 px), and lists **every
worship glyph actually drawn** (synagogue, minaret, church and any other worship kind), after every cull.

Places:
1. Every place in `src/test/scenePlaces.ts` (all lists), plus Karmei Tzur (`markOwnership.test.ts` has its point).
2. Every named home cluster in the bundled city data (`public/data/city/il`, `place.at` / name), as a `Place` at its
   gazetteer point. Where no recorded panorama exists (`src/test/fixtures/scene/<id>.panorama.json`), use a flat
   terrain at the place's elevation and say so in the table (column `terrain: flat|recorded`).

For each place, classify it from data, not from names: count worship landmarks of each kind **inside its own built
footprint** (the same ownership `isOwnSpot` / `boundsForPlace` uses). Call it "synagogue-only" when it has at least one
own synagogue and no own mosque or church. Those are the audit's Jewish settlements; still output all places.

## Output

Write `docs/design/qa/polish/worship-ownership/AUDIT-table.md` (and a TSV beside it) with one row per drawn worship
glyph in synagogue-only places, and a summary row count for every other place. Columns:
place, terrain, width px, glyph kind, source landmark id and name, true distance km from the gazetteer point,
plane (own / beyond / other — use the world's own field), height m and its evidence (tagged or `HALL_M` default),
the town mass it stands on (block id and that block's own cluster name, or "none"), the glyph's screen x span and the
screen x span of the settlement's own drawn homes/blocks, and whether the two spans overlap.

Then add a section **Findings**: group the rows into
- (A) a true view of a neighbouring town: on that town's drawn mass, at its true distance and size;
- (B) attributed to the settlement itself (plane own, or source inside the own footprint);
- (C) beyond, but drawn over the settlement's own homes in screen space, so it reads as inside it;
- (D) anything else (no town mass, wrong distance or size, source outside any footprint).
For each B, C and D group, trace the code path that let it through (file:line) and name the root cause in one sentence.
Do not fix anything.

Precision: real geometry and units (km, m, px); state every approximation (flat terrain) in the table itself.

End with a report: files created, commands run and their results, and the counts per group.
