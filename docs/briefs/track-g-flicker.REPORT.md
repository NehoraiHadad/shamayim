# Track G flicker report

## Changes

- Towers and glyphs share the Track A cast-shadow painter. The projected reach has no minimum, and cast opacity is multiplied by `min(1, reach)`. At zero lateral reach the painter leaves the symmetric contact shade. Each caller supplies its original contact dimensions and opacity. `src/scene/paint/castShadow.ts:5`, `src/scene/paint/outside.ts:39`, `src/scene/paint/glyphs/index.ts:46`.
- Box and tower window cells consume a fixed sequence of seeded draws before testing the light. Each cell's threshold is compared with the same lit share as before, including the tower's 0.8 multiplier. Glint, halo, and recess eligibility are seeded independently of the time of day. Glyph openings now consume one draw per opening. The high-rise and Azrieli window loops already consumed one draw per cell, and the homes placement tests use seeded geometry. `src/scene/paint/outsideBox.ts:52`, `src/scene/paint/outsideTower.ts:97`, `src/scene/paint/glyphs/kit.ts:113`, `src/scene/paint/glyphs/industry.ts:72`, `src/scene/paint/icons/azrieli.ts:37`.
- Box and tower sky highlights and tower masts paint both fixed edges with their own opacity. Positive signed light weights the screen-left edge. Both lateral highlight opacities reach zero at even light. Side faces, roof planes, crown edges, and eligible side-window glints retain their geometry throughout the signed sweep. The outside painter delegates its box, tower, and ground passes to smaller modules. `src/scene/paint/outsideLight.ts:15`, `src/scene/paint/outsideBox.ts:66`, `src/scene/paint/outsideBox.ts:129`, `src/scene/paint/outsideTower.ts:52`, `src/scene/paint/outsideTower.ts:83`, `src/scene/paint/outside.ts:31`.
- The worker cache keeps the displayed form and light together with their rect, ratio, and description. It replaces them when the matching parts are ready, including for layers whose light bitmap is the whole picture. It discards superseded form replies after first paint. The surface uses the held layout through its existing stale-scaling logic. `src/scene/compose/remoteCache.ts:18`, `src/scene/compose/remoteCache.ts:183`, `src/scene/compose/remoteCache.ts:213`, `src/scene/compose/remoteCache.ts:258`.

## Measurements

- The Jerusalem painter test records paths, rects, and transforms at 41 signed-light positions from −1 to +1 with night and window share held fixed. The building geometry is identical. The largest building color-channel step stays within three times the median plus one RGB byte. Cast paths are recorded separately because their projection changes with lateral light. The test checks both sides of zero for shrinking reach and opacity and checks that only the contact shade remains at zero. `src/scene/paint/outside.test.ts:75`.
- The Jerusalem scrub checks 121 frames from 16:30 through 18:30 by classifying window rects from their fills. When the lit share holds or rises, every previously lit window stays lit and the count holds or rises. `src/scene/paint/outside.test.ts:119`.
- The fake worker checks both formless and ordinary layers across a form-key and DPR change, a strip toggle, and a superseded reply. It verifies bitmap retention, old placement while work is pending, and the replacement layout and strip dimensions after arrival. `src/scene/compose/compose.test.ts:218`.

## Test output

| Command | Result |
| --- | --- |
| `npx tsc -b` | Exit 0 in the temporary verification mirror, with no diagnostics. |
| `npx oxlint` | Exit 0 with 12 warnings, all outside the changed files. |
| `npx vitest run src/scene/paint/outside.test.ts src/scene/compose/compose.test.ts src/scene/paint/glyphs/glyphs.test.ts --testTimeout=180000` | Exit 0. Three test files passed, 27 tests passed. |

The default Windows `npx` wrapper failed to resolve its npm module, so the checks used the installed `npx-cli.js` with the same arguments. The worktree typecheck also hit `TS5033` writing the two build-info files under `node_modules/.tmp`. The successful rerun used the same source and dependency directories through junctions and redirected only the two build-info outputs into the temporary mirror.

## Visual differences

The probabilities and share multipliers are preserved. The fixed draw order can assign a different set of window, glint, and halo locations for an existing building seed. Faint glints and lateral highlights now approach zero continuously through the range where the old painter skipped very small alphas. Tower casts now use the glyph cast outline and falloff, with the tower's original contact shade.

## Round 2

- The worker cache advances each layer's generation when its requested paint keys change. A complete intermediate picture can replace an older displayed picture during a resize, including during strip changes. Returning to an already-matching picture advances its displayed generation, so an earlier worker reply cannot displace it. After an arrival, the cache checks whether a queued light still has a compatible form and queues one when needed. The surface continues to use the displayed picture's rect, ratio, and description while it is stale. `src/scene/compose/remoteCache.ts:25`, `src/scene/compose/remoteEntry.ts:46`.
- Entry acceptance, promotion, bitmap ownership, and the peek result live in `remoteEntry.ts`. Batch coalescing, timing, and settlement live in `paintQueue.ts`. The `RemoteCache` class is 118 lines and its `bytes()` doc describes the retained main-thread RGBA bitmaps. `src/scene/compose/remoteEntry.ts:56`, `src/scene/compose/paintQueue.ts:16`, `src/scene/compose/remoteCache.ts:135`.
- `Kit.open` again draws only for openings marked eligible by their geometry. This restores the original seeded sequence. The tower cast again uses the tower's outline, gradient start at `w / 2 - .5`, and `.8 * cast.alpha` before the shared reach fade. Its visible projection beyond the tower edge shrinks to zero as lateral cast light approaches zero. `src/scene/paint/glyphs/kit.ts:113`, `src/scene/paint/outside.ts:29`, `src/scene/paint/castShadow.ts:14`.
- An eligible box window's halo and core fade linearly from zero to their previous opacity multiplier over night values 0.6 to 0.8. Box and tower sky highlights use their existing strength multipliers down to zero with fixed geometry. Box front highlights and roof rims also use fixed geometry and fade to zero. `src/scene/paint/outsideBox.ts:24`, `src/scene/paint/outsideBox.ts:44`, `src/scene/paint/outsideBox.ts:126`, `src/scene/paint/outsideTower.ts:41`, `src/scene/paint/glyphs/index.ts:76`.
- The fake worker tests exercise form and strip changes, repeated resizes that outpace replies, light repainting after its form was replaced, and a scrub back to a matching picture. The Jerusalem tests measure tower cast geometry and opacity and compare paint operations across the former highlight and halo cutoffs. The 121-frame minute sweep now checks lit opening paths for nine glyph kinds, including the high-rise and Azrieli grids, using eight fixed seeds per kind and the fixture's minute-by-minute light. `src/scene/compose/compose.test.ts:218`, `src/scene/compose/compose.test.ts:279`, `src/scene/compose/compose.test.ts:359`, `src/scene/paint/outside.test.ts:102`, `src/scene/paint/outside.test.ts:157`, `src/scene/paint/outside.test.ts:177`.

### Test output

| Command | Result |
| --- | --- |
| `npx tsc -b` | Exit 0 with no diagnostics. |
| `npx oxlint` | Exit 0 with 12 warnings outside the changed files. |
| `npx vitest run src/scene/paint/outside.test.ts src/scene/compose/compose.test.ts src/scene/paint/glyphs/glyphs.test.ts --testTimeout=180000` | Exit 0. Three test files passed, 29 tests passed in 46.79 s. |

The checks used the installed Windows `npx-cli.js`. TypeScript ran in a temporary mirror with junctions to the worktree's source, scripts, worker and dependencies. Its build-info files were written to that mirror.
