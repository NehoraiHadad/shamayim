# Foundations A: the paint split — report

Branch `claude/scene-foundations-2b66cc`, base `4de78844`. Commits: `a4887ce2` contract and registry, `d3b72e30` light hook, `0c05dbb7`
renames, `868c3631` moves, `1ea6d13d` mixed files, `5bd14d3f` weather/sky/wear, `b0e673c8` model layers, `45bb2313` tests by subject,
`f820847b` dead code, `7717bdc9` architecture test, `d0797190` style test types; after Codex's review `a3d3cd7d` outside `own` slot,
`3c2e31b2` painters-only registry, `6a3acc98` cleanup, `4ca7b10a` checker; and this report.

## Final tree (lines)

```
paint/  architecture.test 33  buildingTransmission.test 44  contract 43 (+test 19)  curtain.test 49  painters 27  styles 10  weatherLoop.test 89
 shared/painters 57
  base/   core 112  detailTile 42  hand 55  paintPass 10  softEllipse 21  soften 33
  cloud/  deck 25  layTower 49  resampleRows 21
  sky/    archStops 10  bodies 126  flash 71  nightLights.test 47  nightSky 150  optics 118  shimmer 19  sky 45  skyBackground 38  skyRows 85
  weather/ curtain 83  edge 32  fall 80  grains 30  landDust 21  loading 94  mist 29  rays 34  sheen 25  smoke 29  steps 2
  land/   canopy 36  landSurface.test 69  landVegCrowns 136  landVegPaint.test 98  landVegPose 32  landVegTufts 65  landVegetation 87
          paperGrain 28  planeLight 68  planeMaterial 80  planeTexel 142 (+test 34)  receiverBrush 45  vegInk 7  vegStability.test 95
          vegetationLight 22  water 141
  life/   birds 113  contrail 36  life 80
  wear/   cloth 106  clothGrain 38  drip 16  item 136  path 20  peg 31  rope 77  shape 5  shapes 110
  town/   buildingFaces 54  castShadow 44  farCities 58  marks 138 (+test 11)  outsideGround 76  stripPhase 8
   glyphs/ buildings 148  gilding 44  glyphForm.test 53  glyphs.test 109  index 109  industry 102  kit 137  kitGeometry 22  kitLight 9
           nature 138  roundGradient 24  structures 99
   icons/  azrieli 37  babShrine 57 (+test 49)  chordsBridge 40  westernWall 41
 real/    index 6  painters 20  cloudCells 8  cloudLook 89  cloudRaster 52  cloudSheet 40 (+test 96)  cloudTower 22 (+test 102)  domeTile 31
          outside 56 (+test 127)  outsideBox 32  outsideLit.test 89  outsideRoof 38  outsideTones.test 79  outsideTower 41
          outsideWindows 111 (+test 28)  towerShape 126  towerTone 58
 drawn/   index 6  painters 20  outsideOwn 17 (+test 45)  billows 83  cloudLight 18  cloudSheet 121  cloudTower 46  drawn.test 79  glyphBuildings 96  glyphIcons 94
          glyphIndustry 75  glyphKit 49  glyphStructures 45  outsideLight 7  sheetField 84  towerMass 85  town 82  townBlock 63
          townBlocks 80  townGlyph 23  townLight 52  townRoof 55  townTower 74  townWindows 45
  light/  index 6  groundTone 65  outsideLook 36  skyForm 55  twilightScreen 15
model/  styleLight 39  cloudSprite  types 26 (barrel)  layers/ base 50  cloud 19  land 114  motion 123  outside 37  scene 42  sky 46
        skyLife 57  town 76  water 53  wear 50  weather 63
src/test/ architecture 102 (+test 144)  sourceFacts 132  glyphTones 11  outsideRecording 70  receiverScene 15
```

## What moved, and why shared

- A file is in `shared/` when `SHARED` reaches it or both hands import it, checked by an import closure; the two others
  (`life/contrail`, `sky/skyBackground`) are laid by the compositor and by React. Nothing in `shared/` takes a style.
- Split out of mixed files, code verbatim: `cloud/deck` (`deckOpenness`, `toneOf`), `cloud/resampleRows`, `cloud/layTower`,
  `town/stripPhase`, `TOWER_CONTACT`/`TOWER_CAST` (into `castShadow`), `glyphs/roundGradient`, `weather/curtain` and `edge` (each hand
  passes its own `Fibres`), `base/softEllipse`. To `real/`: `domeTile` (only the real towers use it), `FIBRES`.
- `CloudSprite`/`SpriteGenus` → `model/cloudSprite.ts`. Outside look, twilight screen, sky form and ground tone → `drawn/light/`.
- Renamed: `drawnTones` → `illustratedTones`, `drawnHaze` → `illustratedHaze`, `world/drawnLight` → `world/halfDepthLight`.
- Module state stays single: noise tables, detail tiles, mark grains, the sky's scratch row image, the wear paths, the drawn caches.

## Deviations, with reasons

1. `PLAIN_LIGHT.key` is `'plain'`, so the real far towns' light key says `plain` where it said `real`: the model may not name a style. Same
   equality behaviour, and the default object is shared, so a call without a light meets the same caches.
2. `scene/sceneStyle.ts` is gone: ids live in `painters.ts`; `?style=` is read in `react/forcedStyle.ts`, because `ui/devParams` sits in the
   main chunk, which has no painters. `drawn/light.ts` became `cloudLight.ts` (it clashed with the folder `light/`).
3. Tests that iterate the registry (`curtain`, `weatherLoop`, `buildingTransmission`, moved from the model) stand at paint's root.
4. The drawn hand's data for the `outside` layer sits in the desc's one reserved slot `own` (plain data by type): a hook cannot touch the
   layer's facts. `drawn/outsideOwn.ts` types its writer and its reader; a layer without it throws in dev and tests, paints nothing in a
   release.
5. `detailTile` keeps the tile cache behind `keptTile`, which `real/domeTile` also uses with the eviction it had (none of its own).
6. The checker is `src/test/architecture.ts` over `sourceFacts.ts`, on vite's `parseSync` (an AST: TypeScript 7 has no JS API). Beyond the
   brief it follows imports all the way from styles, shared, contract, model, world and the worker, scans `scripts/` and `worker/` too, and
   refuses what it cannot follow (aliases, unknown paths, computed imports; URLs and globs that could reach paint).
   A model or style test may run the whole scene (only its first imports count).
7. The outside tests' recorder takes the painter as an argument (`src/test/outsideRecording.ts`), so no test helper knows a style.
8. Dropped from the contract, unused: `Line`, `Rect`, `Face`; from `core.ts`: `oval`, `softBox`, `line`, `jitter`; nine `_env` parameters.
9. Files outside `paint/` that were over 150 lines and only had imports rewritten stay (`sceneHarness`, `compose.test`, model tests…).
10. The registry is two files: `painters.ts` (ids and painters, all the worker loads) and `styles.ts` (with the light), since one file took
   the model's light into the worker. Removing a style: its folder and 4 whole lines, 2 in each; a forgotten one is a type error.
11. `CANVAS-SCENE-PLAN.md` is a log by stage: one note at §1c, and full paths corrected in the living-land section; older stage notes,
    briefs and reports keep the names of their day. `TASKS.md` was not touched, by order. The commit trailer is the one the task named.

## Byte identity

A throw-away script hashed, for nine places and 30 cases of hour and weather (haifa, jerusalem and tel-aviv at 12:00, 16:30 and 21:00 among
them) in both styles: `JSON.stringify(sceneModel(...).layers)`, each layer, each layer's form and light keys, and every canvas call, style
set and scratch image each painter makes through `paintPart`: 4675 entries before and after. `landDust` alone never came up in the cases.

| step | differ |
|---|---|
| contract and registry | 0 |
| light hook, and every step after it, to the end | 42 = `real/MODEL` 21 + `real/layer/farCities` 21 |

The 42 are deviation 1 alone: with that light key left out (`MODEL-noFarKey`) every hash is equal, and every drawn entry is equal. The last hash, after the
review, lays the drawn desc's `own` open where `form` stood (the one change of serialized shape): the same 42 and no other.

## Proofs

- The checker's own tests put each breach into a small tree kept in memory (12 import forms between styles, both ways; 17 other breaches).
  On the real tree, an import of `real/outsideBox` in `drawn/` and a `'drawn'` string in `src/ui` both failed it.
- After the review: `drawn/town` taking `./light`, `shared/` taking `compose/paintJob`, and a glob in `src/ui` over `scene/` each failed it.
- Deleting `paint/drawn/` and its four lines: `tsc -b` is clean, and the architecture, style, contract and curtain tests pass (restored).

## Bugs and oddities seen, left as they are

- `domeTile` adds to the shared tile cache without the `>= 16` check `detailTile` makes, so the cap holds only on detail tiles.
- `model/landSnow.ts` and `world/water.ts` import `fractal` from the painters' `base/core`: a noise helper that belongs lower.
- `hazePath`, `skyGlows`, `skyArch`, `DOME_ALT`, `sheenLayer`, `HANGING` are exported for nobody.
- `weather/loading.ts` has a `STEPS` of its own beside `weather/steps.ts` (other numbers; not merged, by the brief).
- `CANVAS-SCENE-PLAN.md`'s living-land section names painters `landSurface.ts` and `landVegLight.ts`, which did not exist at the base.
- `dev/sceneHarness.tsx:174`: the one oxlint warning under `src/` (a `useMemo` without `params`), as before.

## Commands and results

- `npx tsc -b`: clean. `npx oxlint`: one warning under `src/` (above), as at the base.
- `npx vitest run` (2 workers): before the review, paint + compose + purity + the changed model and world tests, 46 files, 577 passed; 22
  more that import changed modules, 184 passed and 3 timed out at 30 s under load (`lifeContinuity`; alone, with a longer timeout, 4 of 4
  pass in 70 s; slow, not failing, and cut close on this machine). After the review: 50 files, 626
  passed and 2 timed out at their own 30 s (`weather`, rain from its banks; with nothing else running those cases pass, 8 of 8).
- `npx vite build`, kB (gzip): main `index` 490.43 (170.71) → 490.34 (170.65); `CanvasScene` 521.68 (210.45) → 521.76 (212.57).
- The paint worker's chunk, bytes (gzip -9): 153 312 (59 381) at the base, 190 140 (76 855) before the review, **153 123 (61 037)** now. The
  raw size is below the base's; its modules come in another order, which packs a little worse.
- No changed file's line endings differ from the base's. `e2e/scene.stills`, `harness`, `compare`, `styleIdentity` and the `identity*` files
  name no moved path; none was touched. `e2e/buildingCompatibility.mjs` now takes `painterOf` from `painters.ts`.
