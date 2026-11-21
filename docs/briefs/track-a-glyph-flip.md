# Track A — never mirror a glyph's form; only the light follows the light (audit #1, #23)

Repo: Shamayim, a Hebrew weather PWA with a canvas valley scene. Read `docs/design/qa/polish/AUDIT.md` rows #1 and #23
and section "3. Buildings flipping by hour" first. Work only in this worktree. Do not commit; the manager commits.

## The bug

`src/scene/paint/glyphs/index.ts` `drawGlyph` mirrors the WHOLE glyph (`ctx.scale(d.scale * mirror, …)`) when
`glyphSide` returns −1, the bare sign of `shine.faces.left − shine.faces.right`. Asymmetric glyphs (`minaret`,
`synagogue`, `church`, `homes`, `castle` in `glyphs/buildings.ts`, and the asymmetric parts of the others) therefore
jump to their mirror image 4–6 times a day, even when the side's strength k≈0.001. `kit.ts` (header comment and the
`k` doc) claims "symmetric at k=0, so mirroring never shows": false. `src/world/light.ts:44` `sideOf` also snaps
`Light.side` between left / null / right at ±0.02.

## The fix (general; no per-place or per-mark special cases)

1. **Form never mirrors with the light.** Each glyph gets a FIXED handedness `hand: 1 | -1`. There is no true
   orientation in the mark data (`world/marks.ts`, `GlyphDesc`), so seed it from the mark's own seed
   (`d.seed`, deterministic, e.g. `rng(d.seed * 13 + 5)() < 0.5 ? -1 : 1`, or a hash). Put it on `GlyphDesc` as
   `hand` built in the model (`scene/model/marks.ts`, `scene/model/outside.ts`, `dev/glyphSheet.tsx`) so the
   painter stays pure and the layer form key includes it. Icons whose real shape has a known real-world
   orientation (Western Wall, Azrieli, Chords Bridge, Bab shrine) keep hand = 1 (their drawn orientation is the true
   one as seen from the scene); fields (`orchard`, `vineyard`, `solar`, which follow the ground profile) keep hand = 1.
   `drawGlyph` does `ctx.scale(d.scale * hand, d.scale)` and maps lamps with the same `hand`, so lamps stay on the
   unmirrored shape (e.g. the minaret's balcony lamp stays on the minaret).
2. **Only the light follows the light, continuously.** Replace `glyphSide` (side sign + |k|) with ONE signed value:
   `glyphLight(shine): number` in [−1, 1] = `clamp(faces.left − faces.right)` (positive = light from screen-left).
   No `litSide` fallback: every shine the glyph painters receive has `faces` (verify; if a test fixture lacks it,
   fix the fixture, treat missing as 0). In glyph space the light is `l = hand * glyphLight(shine)`
   (positive = from glyph-left). The `Kit` takes `l` instead of `k`, and exposes `l`, `kl = max(0, l)`,
   `kr = max(0, −l)`, `k = |l|`. Every lit/shade decision in the kit and in every glyph/icon becomes a continuous
   weight of `l`:
   - `round(tr, x0, x1, term)`: gradient = mix(even, sided, |l|) where sided is the existing falloff when l ≥ 0 and
     the same falloff REVERSED in position (lit at x1, reflected sky at x0) when l < 0. At l = 0 both are `even`, so
     there is no jump at the sign change.
   - `box(...)`: the narrow three-quarter side face is FORM (which face we see), so it stays on the glyph-left; its tone
     goes from the even-sky tone toward `lit` by `kl` and toward a deeper shade by `kr`. The core-shadow strip on the
     far (right) edge deepens by `kl`; when the light comes from the right (`kr`) that far edge is instead the lit
     edge (a lit tone weighted by `kr`).
   - Tones: replace the single `t.lit` meaning "the left face" with explicit per-side tones: e.g. `k.litL`,
     `k.litR` (= mix(wall, lit, kl) / mix(wall, lit, kr)) and likewise for stone/roof/green. Go through EVERY glyph in
     `glyphs/buildings.ts`, `industry.ts`, `structures.ts`, `nature.ts` and every icon in `paint/icons/*.ts` and make
     each hard-coded lit-left detail use the tone of the side it physically faces. A face that faces the eye or the
     sky (front walls, finials, crosses, roofs' tops) is not side-lit: use the even tone or `faces.front`/`faces.top`
     as the kit already does.
   - Icons (`westernWall`, `azrieli`, `chordsBridge`) and fields (`orchard`, `vineyard`, `solar`) currently take a
     `side: 1 | -1 | 0` sign. Give them the kit's signed `l` instead; every `side < 0 ? a : b` becomes two fills, one
     on each side, weighted by `kl` / `kr` (alpha or tone mix), so at l = 0 neither shows and nothing jumps.
   - **No geometry may depend on the light.** The set and order of traced paths and transforms must be the same at
     every hour: no `if (side)` around a fill, no `side < 0 ? x0 : x1` positions. `Kit.fill` must not skip a shape
     because a light-derived alpha is tiny (draw at alpha 0 or keep the skip only for alphas that are constants).
     Randomness stays from the seed only, consumed identically whatever the light (`open()` already does).
3. **Cast shadow** (`glyphShadow`): it already follows `shine.cast.dx`, but `dir = sign(dx)` plus a `+1` px minimum
   reach makes a ~1 px stub jump sides when dx crosses 0. Make it continuous: the reach must go to 0 (just the contact
   shade, which is symmetric) as |dx| → 0.
4. **`outside` layer and trees** (`src/scene/paint/outside.ts`, `paint/marks.ts` `tree`): they take
   `side = desc.litSide …` and `glyphSide(...)`. `facesOf(s, side)` falls back to a one-sided light from `side`:
   drop the fallback (use `s.faces`). `tree(...)` takes `side` + `k`: give it the signed value; its "second lobe's
   side" is FORM and must stay seeded, the lit/shaded halves weighted by the signed value.
5. **#23: delete the side sign from the world.** Remove `Light.side` (`src/world/types.ts:136-137`,
   `src/world/light.ts:44,142`) and every `litSide` (`GlyphDesc.litSide`, the outside layer's `litSide`, the
   farCities layer's `litSide` in `scene/model/types.ts`, `scene/model/farCities.ts`, `scene/paint/farCities.ts`).
   Where a consumer needs the light's lateral direction, expose and use ONE signed continuous value: add
   `Light.across` (the `lateral(body.azimuth, camera)` already computed in `light.ts`, −1 left … 1 right, scaled to 0
   by the same direct-share ramp the code used to null `side` — i.e. multiply by
   `smoothstep(SKY_ONLY, MIN_DIRECT, direct)` or the existing `SHADING` ramp, document which). farCities paints its lit
   face on the side `sign(faces.left − faces.right)` weighted by `sideK`: make it two fills weighted by
   max(0, ±(left − right)) so it is continuous too. Layer keys that included `world.light.side` use the signed value
   (quantised as the other light keys are). Update the tests that compared `litSide` to `world.light.side`
   (`marks.test.ts:88-89,162`, `outside.test.ts:516-517`, `planes.test.ts:61-73`, `wear.test.ts:167-171`) to assert
   on the signed value instead (e.g. sign of `cast.dx` equals −sign of `light.across` when |across| > 0.05).
   `wear.ts` computes its own `WearLight.side` from `across`; leave the wear painter as is (out of scope) but feed it
   from `light.across`, not `light.side`.
6. Update docs: the `kit.ts` header ("THE LIGHT ON THE LEFT … mirrors …" → glyph space has a fixed handedness, light
   comes signed), the `k` doc, the `glyphs/index.ts` header, `GlyphDesc` docs, `Shine.faces` doc if needed.

## The proving test (required, new file `src/scene/paint/glyphs/glyphs.test.ts`, under 150 lines; a helper
file is fine)

- A recording `Ctx2D` (a Proxy like `src/scene/model/sky.test.ts:177`) that logs FORM ops (`save/restore`,
  `translate/scale`, `beginPath/moveTo/lineTo/bezierCurveTo/arc/rect/closePath/clip`, with numeric args rounded
  to 1e-6) separately from LIGHT ops (every `fillStyle`/`strokeStyle` value set, `addColorStop` colours, gradient
  coordinates count as light).
- For every `GlyphKind` (all 22 in `DRAW`), with fixed tones and a fixed seed, sweep the signed light
  l = −1 … 1 in 41 steps: the FORM log is identical for every l; the LIGHT log changes; and it is continuous across
  0: parse the css colours and assert max channel difference between l = +ε and l = −ε (ε = 1e-3) is < 0.01, and
  between consecutive sweep steps is bounded (no step larger than a few times the median step).
- World-driven: build the Shadmot Mehola world (`src/test/sceneWorld.ts` helpers, fixture
  `forecast-*.json`, day 2026-11-17) every 30 min 05:30 → 21:00, take the marks layers' glyphs (and the outside layer's
  mark items if Shadmot has them), paint each glyph: per glyph the FORM log is identical at every time.
- The lamps returned by `drawGlyph` keep the same x at every light (by night).

## Done means

- `npx tsc -b` clean, `npx oxlint` no new warnings, and these suites green (run them, targeted, with
  `npx vitest run <files>`): the new glyphs test, `src/scene/model/marks.test.ts`, `outside.test.ts`,
  `planes.test.ts`, `wear.test.ts`, `farCities` tests if any, `livingLight.test.ts`, `src/world/*light*.test.ts`,
  `src/scene/compose/compose.test.ts`. Grep `side` / `litSide` / `glyphSide` afterwards: nothing left.
- Files stay under ~150 lines (split `kit.ts` if it grows: e.g. `kit.ts` + `kitLight.ts`), DRY, no unused code.

## Owner rules (hard)

- True to nature, automatic from data, one world state drives everything. No point fixes for places or marks.
- Painters pure in time and phase: no clock, seeded rng only, no `ctx.filter`.
- Never call live services; tests use the fixtures. Never `npx tsx -e` multi-line.

## Precision

Pay attention to subtleties and physical accuracy. Real geometry: a glyph's form (which faces we see, where its
minaret or tower stands) is a property of the building, not of the sun, so it never changes with the hour. Light:
a face is lit in proportion to how much it faces the source, which here is the signed lateral difference; the shade
side is the opposite face; faces toward the eye or the sky are not side-lit. Shadow direction: the cast shadow falls
away from the light on screen (`cast.dx`), shrinking to the symmetric contact shade as the light goes straight ahead
or behind. Occlusion order stays: cast shadow → body → lit face → core shadow → openings → rim → grain → lamps. Units:
glyph px vs screen px (`d.scale`); keep them straight in the lamp mapping. No unstated approximations: if you pick a
ramp or threshold, say which and why in a comment.

## Report

List every file changed and, per glyph/icon, what you did with its lit-left details. Paste the test output.
