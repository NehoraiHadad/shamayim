# Track A glyph lighting report

Glyph orientation is fixed at model time from the mark seed. The four landmark icons and three ground-following fields keep their drawn orientation. The marks and outside form keys include handedness, while light keys quantize the signed lateral value. Lamp coordinates use the same handedness and scale as the body.

## Glyphs and icons

| Glyph | Treatment |
| --- | --- |
| Minaret | Fixed hall and tower placement. The box faces, drum, dome, and tower respond to signed light. Finials use even tones. The balcony lamp follows the tower transform. |
| Church | The stone gable and belfry side use their fixed face directions. Roof ridge and cross use even tones, and the tower cap uses the reversible gradient. |
| Synagogue | The stair block and hall stay fixed. The hall edge and box faces respond continuously, as do the drum and dome. |
| Water tower | Tank and shaft falloff reverse in place. Fixed underside and hatch details receive lateral weights. |
| Castle | Left-facing masonry and the keep edge stay fixed. Its ragged top catches the sky. |
| Homes | Seeded house placement stays fixed. Box faces and edge strips track the light. Roofs retain their even tones. |
| Chimney | Hall box and rounded stack use signed light. Platform and crown accents remain on fixed faces. |
| Highrise | Fixed side glazing takes signed light and the far edge can catch the light. Front glass and bands keep sky and front tones. Seeded window paths are traced at zero alpha when unlit. |
| Cooling tower | The shell reverses its falloff in place. Inlet legs are weighted by their lateral position. |
| Silo | Cylindrical bins, conveyor, and head house use fixed paths with signed falloff or face tones. |
| Mast | Both legs take their respective tones. Bracing stays even. |
| Lighthouse | The tower and cap use signed falloff, each keeper roof half has its own tone, and the gallery keeps a fixed side accent. |
| Turbine | Blade edge weighting follows each seeded blade rotation. The nacelle top uses a sky-facing tone. |
| Bridge | Piers and pylon use signed box and round shading. Each fan of stays takes its corresponding tone. |
| Palms | Both trunk edges and both sets of fronds take weighted light. Wind still controls bend independently of light. |
| Orchard | Fixed canopy lobes take paired highlights and opposite shade overlays. |
| Vineyard | Row tops retain an even sky highlight, with separate lateral leaf highlights. |
| Solar | Panel tops retain their sky reflection, with two weighted end highlights. |
| Western Wall | Each stone has fixed left and right drafted margins with separate highlight and shadow weights. The front takes an even floodlit tone. |
| Azrieli | Tower order stays fixed. The drum falloff reverses, the two triangle faces and square edges blend independently, and both podium accents have fixed paths. |
| Chords Bridge | The pylon keeps its lean. Both face polygons are always traced, and stays take their corresponding side tones. |
| Báb Shrine | Arcade faces and the gold dome take signed lighting. The central stair keeps its even or floodlit tone, and terrace highlights are paired. |

Outside trees keep the seeded canopy silhouette and trace both light and shade halves. Far-city blocks always trace both face strips. The world attenuates lateral direction through the existing direct-light shading ramp (0.04 to 0.45 direct share). Glyphs derive lateral light from the difference between the two face shares. Cast-shadow reach and opacity tend to zero at the contact shade.

## Files and verification

- `docs/briefs/track-a-glyph-flip.REPORT.md`
- `src/dev/glyphSheet.tsx`
- `src/scene/model/farCities.ts`
- `src/scene/model/glyphHand.ts`
- `src/scene/model/marks.test.ts`
- `src/scene/model/marks.ts`
- `src/scene/model/outside.test.ts`
- `src/scene/model/outside.ts`
- `src/scene/model/planes.test.ts`
- `src/scene/model/types.ts`
- `src/scene/model/wear.test.ts`
- `src/scene/model/wear.ts`
- `src/scene/paint/farCities.ts`
- `src/scene/paint/glyphs/buildings.ts`
- `src/scene/paint/glyphs/glyphs.test.ts`
- `src/scene/paint/glyphs/index.ts`
- `src/scene/paint/glyphs/industry.ts`
- `src/scene/paint/glyphs/kit.ts`
- `src/scene/paint/glyphs/kitLight.ts`
- `src/scene/paint/glyphs/nature.ts`
- `src/scene/paint/glyphs/structures.ts`
- `src/scene/paint/icons/azrieli.ts`
- `src/scene/paint/icons/babShrine.ts`
- `src/scene/paint/icons/chordsBridge.ts`
- `src/scene/paint/icons/westernWall.ts`
- `src/scene/paint/marks.ts`
- `src/scene/paint/outside.ts`
- `src/world/light.ts`
- `src/world/types.ts`
- `src/world/world.test.ts`

## Validation output

The PowerShell `npx` shim pointed at a missing roaming npm installation. The checked-in dependency declarations were already installed, so validation used the equivalent local binaries. Vitest ran with `nice -n 19`.

```text
node node_modules/typescript/bin/tsc -b
(exit 0, no diagnostics)

node_modules/.bin/oxlint.cmd
(exit 0)
scripts/city/geometry.ts:69:40: warning eslint(no-control-regex)
src/data/land/useLand.ts:34:5: warning react(set-state-in-effect)
docs/design/prototypes/canvas-scene/styleCurrent.ts:11:44: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleCurrent.ts:11:57: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleCurrent.ts:11:126: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleCurrent.ts:11:141: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleCurrent.ts:11:145: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleRich.ts:16:10: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleRich.ts:64:34: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleRich.ts:276:56: warning eslint(no-constant-binary-expression)
docs/design/prototypes/canvas-scene/styleMid.ts:11:34: warning eslint(no-unused-vars)
docs/design/prototypes/canvas-scene/styleMid.ts:44:196: warning eslint(no-unused-expressions)
```

All lint warnings came from untouched files. `git diff --check` passed. The source search found no `glyphSide`, `litSide`, or world `Light.side` references. Wear retains its own signed direction label for the existing painter. No dedicated far-cities test file was present.

### Initial glyph regression run

```text
RUN v5.1.0
src/scene/paint/glyphs/glyphs.test.ts (3 tests | 1 failed) 117389ms
  keeps all 22 glyph forms and night lamps fixed as signed light crosses the scene
  Error: Test timed out in 60000ms.

Test Files  1 failed (1)
Tests       1 failed | 2 passed (3)
Duration    363.65s (transform 59%, tests 34%, import 6%)
```

The Shadmot Mehola world-driven comparison and cast-shadow regression passed. The sweep now uses a fixed palette and shine, with no fixture setup, and compares serialized form logs. The world-driven test now reuses one world builder for the 32 times. The revised test file was type-checked and was not rerun under the retry rule.

## Round 2

- `src/scene/paint/marks.ts` uses clamped signed light for palm frond colour and the seeded frond length for geometry.
- `src/scene/paint/glyphs/kit.ts` restores the box's even-sky shade at 0.25 opacity, increases shade opacity with light from glyph-left, and blends toward the lit tone with light from glyph-right.
- `src/scene/paint/glyphs/industry.ts` restores the highrise's shade strip at its original night-weighted opacity. Its tone deepens with light from glyph-left and brightens with light from glyph-right.
- `src/scene/paint/farCities.ts` restores the blocks' lit-to-shade blend. `src/scene/paint/glyphs/nature.ts` restores the orchard's underside shading with the same even-sky opacity ramp as the outside trees.
- `src/scene/paint/icons/chordsBridge.ts` uses the magnitude of signed light for both sets of round stays. Its documentation and the comments in `src/scene/paint/icons/westernWall.ts` and `src/scene/paint/glyphs/index.ts` now describe signed lighting.
- `src/world/glyphSpecs.ts` owns the field predicate and the glyph painter uses it. `src/scene/paint/glyphs/buildings.ts` is 150 lines.
- Windows denied writes to `src/scene/model/glyphHand.ts` and `src/scene/paint/glyphs/glyphs.test.ts`. The pending patch switches the model to the shared field predicate and adds the two-handed sweep, mirrored minaret lamp and box-face checks, fill and stroke recording, and the zero-light palm check. It also removes the redundant layer condition.

### Verification

The `npx` shim failed to resolve its roaming npm CLI, so the checks used the installed binaries. The normal TypeScript build reported TS5033 on the two existing build-info cache files under `node_modules/.tmp`. Running `tsc -b` against temporary configs extending both original projects and redirecting only the build-info cache exited 0 with no diagnostics.

Oxlint exited 0 with 12 baseline warnings in `scripts/city/geometry.ts`, `src/data/land/useLand.ts`, and the canvas-scene prototypes `styleCurrent.ts`, `styleMid.ts`, and `styleRich.ts`.

```text
nice -n 19 node node_modules/vitest/vitest.mjs run src/scene/paint/glyphs/glyphs.test.ts src/scene/model/marks.test.ts --testTimeout=180000
RUN  v5.1.0
Test Files  2 passed (2)
     Tests  47 passed (47)
  Duration  27.93s (tests 75%, transform 21%, import 3%)
```

The Vitest result covers the existing tests with the applied painter changes. The pending tests were source-reviewed and their patch passed `git apply --check`. No commit was made.

Windows also denied appending this section to the original report. The pending patch includes the report update.
