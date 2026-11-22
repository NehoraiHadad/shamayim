# Worship ownership: finish the merge of origin/main (0818fd1)

Rounds 1–5 are committed (453e7d6). A merge of origin/main is in progress (not yet committed). The two text conflicts
are resolved, keeping both sides: `src/scene/model/outside.ts` (`Shape` keeps main's `bounds` plus our `mass`/`home`)
and `e2e/scene.stills.mjs` (main's `@hide` segment plus our `--flat`/`--describe`/`--crop4x`). Check both resolutions.
Same process rules: targeted test files only, `npx tsc -b`, `npx oxlint`; never whole folders; never a multi-line
`npx tsx -e`; never call live services. Do not commit; do not run `git merge --abort`.

Remaining:
1. `npx tsc -b` fails: main's new `GlyphDesc` literals lack our required `factor`
   (`src/scene/paint/glyphs/glyphs.test.ts:115`, `src/scene/paint/outside.test.ts:235`). Find every such literal main
   added (grep) and fix the right way: an owned/test glyph has factor 1. Prefer one shared default over editing each
   literal if that is DRY; do not make `factor` optional in production types if the scene model relies on it.
2. `src/scene/model/outside.test.ts:539` (jerusalem, "tops lighter, feet darker (C5b, C9)") fails after the merge:
   `lum(t.top)` 0.371 vs sky 0.360. Find whether it fails on origin/main alone (e.g. `git worktree add` a temp checkout
   of origin/main in the scratchpad, run that one file, remove the worktree) or only after combining with our change.
   If ours caused it, fix the cause (not the expectation) unless the expectation is physically wrong, and say why.
3. Run the targeted files our change and main's merged files share: `src/scene/model/outside.test.ts`,
   `c9.test.ts`, `src/scene/paint/glyphs/glyphs.test.ts`, `src/scene/paint/outside.test.ts`,
   `settlementOwnership.test.ts`, `worshipVisibility.test.ts`, `markOcclusion.test.ts`, `nearOcclusion.test.ts`,
   `src/world/portraitContest.test.ts`, plus any test file main changed that imports a module we changed.
4. Append `## Merge with main` to REPORT.md: conflicts, resolutions, results.
