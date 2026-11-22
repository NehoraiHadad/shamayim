# Track G — the outside view's buildings never flip or flicker (owner report, Karmei Tzur: "a building rotated and also flickered")

Branch `claude/fix-glyph-flicker-8384c3` (from `origin/main`). Do not commit. Write `docs/briefs/track-g-flicker.REPORT.md`
(what changed, file:line, test output). Run only `npx tsc -b`, `npx oxlint` and
`npx vitest run src/scene/paint/outside.test.ts src/scene/compose/compose.test.ts src/scene/paint/glyphs/glyphs.test.ts --testTimeout=180000`.

## Measured (the evidence; probes in `src/probe/`, do not touch or commit them)

- Glyphs are clean: hand, seed, form and position never change over minute or scrub sweeps (four places, one-minute steps).
- **Rotate.** At Karmei Tzur, around 11:25, the sun passes behind the eye, so `shine.cast.dx` crosses 0 while `cast.alpha` is 0.25.
  `towerShadow` (`src/scene/paint/outside.ts:263`) takes `dir = Math.sign(dx)` and keeps `reach >= 1` and full alpha, so the
  shadow and contact shape mirror to the other side in one step. Track A fixed exactly this in `glyphShadow`
  (`src/scene/paint/glyphs/index.ts:43`): the reach goes to 0 with |dx| and the cast's alpha scales by `min(1, reach)`.
- **Flicker 1.** The window rng in `box()` (`outside.ts:131`) and `tower()` (`outside.ts:290`) is drawn conditionally on the
  light: `else if (tw.full && r() < .55)` (only when unlit), `if (on && s.night > .6 && r() < .12)`, `if (glint * k > .03 && r() < .5)`.
  When a condition changes, every later window of that building re-rolls. Karmei Tzur at 17:19: 15 lit windows go dark and 26 light at
  once while the lit share holds at 0.400. Jerusalem: lit windows go dark every minute from 17:07 to 17:18 while the share rises.
- **Flicker 2.** `RemoteCache` (`src/scene/compose/remoteCache.ts`): for a `formless` layer (outside, marks, farCities, water…),
  `update()` sets `entry.form` to the new key with a null bitmap at once. `peek()` then drops the old light (its `formKey`
  differs) and returns null, so `Surface.composite` skips the layer: it vanishes until the worker replies. One trigger is the
  outside layer's strip toggling when the sway crosses its threshold (`stripKey`).

## Fix (true to nature, no point fixes, painters pure, files ~150 lines, DRY)

1. **One cast-shadow helper.** Extract the Track A shadow (contact shade, then a cast whose reach → 0 with |dx| and whose
   alpha × `min(1, reach)`) into one function. Use it for both `glyphShadow` and `towerShadow`; delete the tower's own copy,
   including its `+ 1` minimum reach. At |dx| → 0 a tower keeps only its symmetric contact shade.
   Any change of side happens at zero length: the length, not only the alpha, goes to 0 as dx goes to 0.
2. **Window rng independent of light** (continuous, not a new switch): each window gets a fixed seeded threshold, compared
   against the continuous lit share, so a window turns on or off only monotonically as the share crosses its threshold. In every outside-view painter, and any glyph painter with the same pattern
   (check `glyphs/kit.ts` `open`, `industry.ts`, `buildings.ts`), each window cell draws a fixed number of `r()` values in a
   fixed order, *before* any light test. Light only decides what to do with them. A window's lit/glint/lamp role is then a
   pure function of its seed and the light, and the lit set only grows as `windows` grows. Keep today's look: the same share
   lit, the same glint and lamp odds.
3. **`skyLight` side strip and tower mast strip without a sign switch.** `outside.ts:258` (`f.side > 0 ? x0 : x0 + w - fw`) and
   `outside.ts:370` (`fl.left >= fl.right ? …`): draw both edges, each weighted by its own share (`max(0, side)`,
   `max(0, -side)`; `fl.left`, `fl.right`), so the geometry is the same at every light and only the alphas change. At
   side = 0, both strips have alpha 0 (the look is unchanged).
4. **No blank under the worker.** In `RemoteCache`, a layer keeps showing its last painted light (with its old rect and desc)
   until the light painted for the new form key arrives. This applies to formless and ordinary layers alike; never return
   null from `peek` once a layer has been shown. Keep the stale-scaling rules `Surface` already has.

## Tests (measured, not by eye)

- `src/scene/paint/outside.test.ts` (new or extended): build a real outside layer from the Jerusalem fixture
  (`src/test/sceneWorld.ts`) and record the geometry ops of `paintOutside` (paths, rects, transforms) with a Proxy ctx, as in
  `glyphs.test.ts`. Sweep the signed lateral light −1…1 (faces.left/right, faces.across, cast.dx, form.side) at fixed
  night/windows: the geometry is identical at every step, and the colours change continuously (no step larger than 3× the
  median, plus one byte).
- In the same file, a minute sweep 16:30–18:30 (scrub, one-minute steps) of the real layer: no lit window ever goes dark
  while `shine.windows` does not fall (classify a window rect lit by its fill), and lit count ≥ the previous minute's.
- `compose.test.ts`: a formless layer under the fake worker is never absent from `peek` after its first arrival, across a
  form-key change and a strip toggle, until and after the new light arrives.

## Precision

Pay attention to subtleties and physical accuracy. A shadow cast straight toward or away from the eye is foreshortened to
its contact shade and never jumps sides. A window is lit or dark because of its own seeded draw and the evening's lit share,
never because a neighbour changed. Each side of a building catches its own share of the light; at an even light, neither side
catches any. A frame always shows the land: a layer waiting for its repaint shows its last picture. Signed-light convention:
positive = from screen-left. No unstated approximations; say in the report anything you could not keep exact.

## Round 2 (review findings; append `## Round 2` to the REPORT)

1. **RemoteCache must not starve.** Today a shown layer drops every reply whose `formKey` is not the latest (`remoteCache.ts:199`),
   so during a resize drag a layer stays on its first picture. Accept a reply that is newer than what is shown (a per-layer
   request generation), even if it is not the latest; still never show an older one. Test it: keys change faster than replies.
2. **Split `remoteCache.ts`** (288 lines): `remoteEntry.ts` (Shown/Entry/partsOf/closeReplaced, accept, promote, peek shape),
   `paintQueue.ts` (pending/inFlight/ask/flush/settled/whenSettled/pendingSince), the class ~120 lines. Fix the `bytes()` doc.
3. **Revert the extra draw in `Kit.open`** (`glyphs/kit.ts:114`): `canLight && r() < windows` was already light-independent;
   the new unconditional draw shifts every later `k.r()` in buildings.ts/industry.ts and changes those glyphs' look.
4. **Keep the tower's own cast look.** The shared helper takes the caller's cast alpha factor and start/outline (tower:
   `.8 × cast.alpha`, starting at `w/2 - .5`), so only the reach→0 law is shared, not the glyph's look.
5. **No remaining step switches:** the lamp halo (`outsideBox.ts:62`, `s.night > .6`) fades in continuously with night instead of
   appearing; the `f.strength > .02` gates (`outsideBox.ts:130`, `outsideTower.ts:184`) become alpha ramps with fixed geometry.
6. **Test glyph windows too:** extend the minute-sweep window test to glyph openings (filled paths from `kit.open`, `industry.ts`,
   `icons/azrieli.ts`), so a light-conditional draw there would fail it.

## Round 3 (re-review; append `## Round 3` to the REPORT)

1. **Lamps fade in, never pop.** Every light driven by night that is now a boolean or a `night > x` test becomes a continuous
   ramp of the same night value over a short band (e.g. ±0.1 around today's threshold), keeping today's look at full night and at
   day: the aviation lamp (`outsideTower.ts:102`, `glyphs/kit.ts:121`, fed from `scene/model/marks.ts:130`
   `night.aviation || night.dark > 0.3` — make the model hand a continuous strength), `glyphs/buildings.ts:40` (minaret lamp,
   `k.night > 0.4`), `glyphs/structures.ts:46` (window fill and lamp, `k.night > 0.3`), `icons/babShrine.ts:12` and
   `icons/westernWall.ts:15` (flood colour/alpha, `k.night > 0.4`). Sweep `src/scene/paint/**` for any other light/night threshold
   that toggles a draw and treat it the same. Geometry stays fixed; only alpha/colour moves. No new rng draws.
2. **A→S→A scrub:** accept a reply whose keys match what is currently wanted even if a newer generation was shown in between
   (`remoteEntry.ts:58`, `paintQueue.ts:37`), so a fast scrub back and forth costs no extra round trip. Test it.
3. **Test the lamps:** in `outside.test.ts` (or `glyphs.test.ts`), a dusk sweep of night in small steps: every lamp/flood alpha
   changes by at most a stated small amount per step (derive it from the ramp width).
4. Keep the `lit` local in `Kit.open` as at HEAD (no needless diff).
