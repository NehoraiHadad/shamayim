# The drawn style: a colour woodblock print

Status: concept, phase 1. Nothing of it is in `src/scene`. Prototype: `docs/design/prototypes/drawn/` (`render.mjs` draws the app's own
stills with it). Stills: `drawn/concept/` in the sessions' shared notes folder; layer crops: `drawn/map/`. An earlier hand, cut paper, was built in
full, judged too plain and dropped (`drawn/concept-a-paper/`). The technique is borrowed, not the subject: no Japanese motif, no artist's manner.

## 1. The one hand

The scene is printed from carved blocks: flat ink, wiped so that it grades one way, and a thin carved key line. Where a thing is, how big it is and how lit it
is comes from the same model as `real`. Only the edges, the number of inks and the marks differ.

| Rule | What it says |
|---|---|
| Line | One carved key line, 0.5 to 1 px, its width stepping as a knife's does, in the local ink's own dark, as strong as the model's light and shade stand apart (Oklab): fog and dust lose it. It runs where one thing stands before another: cloud tops, crests, bodies, crowns, shore. Never round a cloud's foot. It thins and fades with distance. |
| Shape | Four words: the **billow** (a run of round bumps of many sizes over a level foot: cloud, crown, tower), the **wipe** (sky, sea, deck roll, hill: ink graded one way), the **pot** (a patch of ground of one ink), the **body** (three inks inside a key line). |
| Values | Inks, not blends: lit, local, half, shade, foot, each lying flat and wiped into the next. A cloud mass is one such wash of the model's own light; caps of uneven size stand on it where it is busy and fade to nothing at their foot, and quiet areas have none. How heavy a cloud is comes from where the model's body lies between its light and shade: a heavy one goes down to its foot ink, a light one never does. |
| Colour | One rule, `pigment`: Oklab lightness is the model's, chroma up to ×1.5 and at most 0.15, a light turned warm, a shade cool only as far as the model's own is and less where the light itself is coloured; `papered` lets a day's lights through to cream paper. No colour is picked by hand for a place or an hour. |
| Edge | Crisp: contours of the model's own field, its tops turned into billows, its base pressed level (cloud begins at one height). |
| Texture | The cut only: level grain in the sky, slope cuts on ground, wave cuts on water, parallel cuts of rain, a few level cuts under a cloud. No noise, no mottle, no soft wash. |
| Distance | Fewer inks, fewer cuts, thinner line, nearer the model's own air: near clouds in caps, far ones in low arches, the last ones in a row. Near ground 6 pots, the middle 4, the far 3. |
| Night | Same blocks, inks closed up to the model's values, key line nearly gone. What shines (windows, lamps, moon, floodlit gold) is the one bright, warm thing. |
| Detail kept | Every landmark, window rule, lamp, tree, field, terrace, gully, crest, shore, ripple, far town, bird and star the model gives. Windows are carved slots by day, all the model's lit ones by night. |

## 2. Where v1 looks like `real`: the ranked map

Read at 375 px wide. Difference = mean of 255 between v1 and `real` over the crop's still. Crops are 2x: `real` | v1 | concept.

| # | Layer | Still, crop in `drawn/map/` | What is weak in v1 |
|---|---|---|---|
| 1 | Sky | rosh-pina 10:00, `04-sky` | Identical (shared painter): half of every picture is the same in both styles |
| 2 | Broken and lone clouds | rosh-pina 10:00, `02-clouds-lone` | Same silhouette, only smoother: a soft barrel, no flat foot, no value plan |
| 3 | Closed deck and storm | haifa storm `03-clouds-storm`, beit-shean `12-overcast-rain` | Soft lens blobs all alike; a grey on grey whose mass cannot be read |
| 4 | Ground | rosh-pina 10:00, `05-ground` | Identical: the same muddy mottle, land difference 1.5 |
| 5 | Town | tel-aviv 12:00, `01-town` | Same thin grey towers, dense noise for windows |
| 6 | Night | haifa 21:00, `08-night` | 1.9 from `real` in all: only some windows more |
| 7 | Far clouds | tel-aviv 12:00, `11-far-clouds` | Same smears |
| 8 | Village | rosh-pina 10:00, `10-village` | Same houses, roofs greyed |
| 9 | Sea and lakes | tel-aviv 12:00, `07-water` | Identical grey-blue fill |
| 10 | Vegetation | tel-aviv 12:00, `09-vegetation` | Identical crowns (and these are already cut shapes: the weakest gain of the concept too) |
| 11 | Rain curtain, near rain | haifa storm `06-rain-curtain`, beit-shean `12-overcast-rain` | The curtain barely differs, the near rain is the same |
| 12 | Fog and mist | haifa 07:00 fog, `13-fog` | 3.3: the same flat veil |
| 13 | Dust | ramon 15:00, `14-dust` | Same air; only the clouds' edges differ |
| 14 | Dusk and dawn colour | haifa 16:30, `15-dusk` | Same pinks in a smoother cloud |
| 15 | Far towns and ridges | neve-zohar 16:00, `16-far-towns-ridges` | Identical |
| 16 | Landmarks | haifa, `08-night`, `03` | Own glyphs already; differ little, and the gold is dull |
| 17 | Moving things | tel-aviv 12:00, `17-birds-moving` | Identical (birds, aircraft, smoke, wear) |
| 18 | Snow | no still in the set | Not judged; a snow moment is asked for in phase 2 |

## 3. Concept stills, honest numbers

Mean difference against `real` of the same model, of 255 (whole picture; land = rows 700 to 856):

| Still | v1 | concept | land v1 | land concept |
|---|---|---|---|---|
| tel-aviv 12:00 | 6.6 | 17.7 | 5.5 | 14.4 |
| rosh-pina 10:00 | 4.6 | 13.2 | 1.5 | 15.2 |
| haifa 2026-03-15 14:00 | 14.6 | 24.7 | 8.2 | 18.2 |
| haifa 21:00 | 1.9 | 5.9 | 2.8 | 7.5 |

The base is `ac4262e8` with foundations' clouds and town patches, so both styles show foundations' newer model. Rain, dusk, dawn, broken, fog and dust were
also drawn with the same code (`more-weather-concept-only.png`).

Second set (after the manager's five points; the first is kept in `drawn/concept-b-first/`): caps vary in size and leave quiet areas, a mass
is one wipe of the model's own light with caps on it; a storm is dark and stands on its underside; nothing is see-through; fog and
dust lose the line; fields and slope cuts show; town walls sit in the light. The table above is of this second set.

Known weak points of the concept:
- **Dust** is the weakest by a clear step: the lower clouds are smudged (a soft wash under orange patches of the model's tone). The
  brown blocks at the left edge are the model's own fault (they are in `real` too). `mist` is still the shared painter and the sheet
  does not take the veil.
- **Fog's towns** keep more line than its clouds do: the town painter does not take the veil yet.
- **Crisp where `real` is half clear**: the storm's low haze and some faint far clouds are gone or firm. A sheet's opacity is not kept yet.
- **Dusk and dawn (06:20)**: one pink value, little form. The light is coloured, so the shade hardly parts from it; caps read by their line only.
- **Haifa storm**: the pale sun disc lies over the dark slab of the right tower, and the slab ends in a hard edge. The sun must stand
  behind a heavy tower, the base needs the billow's own foot.
- **Rosh Pina's tower**: side lobes are translucent, stand outside the mass and have no key line, so the contour doubles; its foot is one
  flat patch. No cap past the silhouette.
- **Rosh Pina's ground**: still flat next to `real`; the lit slope has fewer cuts than in the first set.
- The large clouds keep the model's own outlines (Tel Aviv's arm, Rosh Pina's column): a crisp edge shows a model fault more than a soft one. Foundations' 1d.
- Vegetation is the smallest gain: `real` crowns were already cut shapes.
- Birds, aircraft, smoke, near rain, snow, mist, rays and bow are still shared.

## 4. Painter plan against the layer contract

Own files in `src/scene/paint/drawn/`, one line each in `drawn/painters.ts`. Nothing reads `real/`. "Prototype" names the file that carries it.

| Kind | Printed as | Prototype | From the desc |
|---|---|---|---|
| `sky` | One wipe of ink through the model's stops, level grain, the glow wiped out round the light | `sky.ts`, `skyBase.ts` | stops, glow, arch (to do) |
| `bodies` | Sun: paper disc, a thin ring (gone when veiled). Moon: shared disc and phase | `bodies.ts` | disc, veil |
| `stars`, `planets`, `twinkle`, `milkyWay` | Shared; the Milky Way as a band of fine cuts (plan) | | |
| `cloudSheet`, broken | Billowed blocks with caps, feet wiped up from the level base, key line on tops; far rows as arches | `sheet.ts`, `inks.ts`, `wash.ts`, `lobes.ts`, `caps.ts`, `feet.ts`, `billow.ts`, `carve.ts`, `base.ts`, `farRows.ts`, `contour.ts` | alpha, tone, city, row spacing |
| `cloudSheet`, closed | Rolls closing to the horizon, each with a hanging scalloped foot, lower where the model is darker; here and there a line | `deck.ts` | tone, row spacing |
| `cloudSheet`, high | The same at 0.4; fine level cuts instead of caps (plan) | `sheet.ts` | alpha |
| `cloudCells` | The model's column as one billowed block, caps lit from the light's side, dark level base | `cells.ts` (inks, wash, caps, feet as the sheet) | `towerMass` |
| `shafts` | A graded pane and many fine parallel slanted cuts in ink and bare paper | `rain.ts` | shaft, lean, alpha |
| `fall` | Rain: carved strokes of two lengths, near bold, far fine. Snow: bare-paper flecks of three sizes (plan) | new | drops, flakes |
| `mist`, `edge`, `landDust` | Level wipes one behind another, their tops let go, in the model's veil colour; they lift line and ink behind them (plan) | `painters.ts` (`edge`) | density, heights |
| `grains` | Flecks (plan) | new | |
| `rays`, `sheen`, `bow`, `flash`, `shimmer` | Rays as wedges of bare paper, the bow as five wipes; the rest shared (plan) | new | |
| `plane` | The lit ground as pots, slope cuts, gullies, terraces, a crest line, ink deeper to the foot | `plane.ts`, `classes.ts`, `groundMarks.ts` | `litField` |
| `canopy` | Bumped crown with a wipe, key line and leaf cuts | `canopy.ts` | trees, light |
| `water` | A wipe with level wave cuts; carved dashes for wind and glint | `water.ts` | stops, ripples, glint |
| `outside`, `marks`, `farCities` | Bodies in three inks, wiped to the foot, slots by day, warm windows by night; tile roofs outlined; gold kept | `town*.ts` | bodies, tones, shine |
| `smoke` | Three small billows a puff (plan) | new | |
| `birds`, `aircraft`, `meteor`, `wear*`, `loading` | Shared, in the hand's tones (plan) | | |

Order of the build: sky, sheets and cells, ground, town, then water and canopy, rain and fall, mist and dust, the rest. Each step ends with the CI
still set before and after.

### What the prototype owes before it may enter `src/scene`

From an independent review of the prototype (20 findings; the rest are already fixed):
- A sheet's opacity; high and closed sheets traced at a low level with their mean alpha. One mean tone and city per sheet, `toward: 0`: take them by region.
- Cells: `share`, `tau`, silver rim, and the shared guards.
- **Stable under drift and scrub**: edge bend and billows seeded in cloud space, not screen space; the window layout must not depend on light (draw all
  randoms, then compare `< lit`).
- Sky: the belt of Venus (`arch`), lower haze stops; the sun's spread through cloud and the aureole's gate.
- Ground: cluster once under a neutral beam, recolour per beam; the warp bends material, not light.
- Water: ruffle's alpha floor, the fades, the glint's core, land stops; no state left on the ctx.
- Canopy: guard for empty tones, multiply `globalAlpha`. Palette: cache key rounding. No caps past the silhouette. No copies of `src` code.

## 5. What the contract must give (for the manager, before phase 2)

1. **Sky base per style.** The base sky is a CSS background made in `paint/shared/sky/skyBackground.ts`. A printed sky (graded ink, grain, wiped glow) needs the style to give it: either a
   per-style background function (a CSS gradient gives the wipe but no grain), or the base on the sky canvas (as in the
   prototype). The real session asks for the same change.
2. **A kind moves out of `SHARED`** when the styles part on it (`sky`, `bodies`, `plane`, `canopy`, `water`, `farCities`, `marks`, `fall`, `mist`, `grains`,
   `landDust`, `rays`, `smoke`): a registry line, no type change but `OwnKind`.
3. **Plane shading.** `plane` and `canopy` write `env.shade` with `shadowBeam` and `shadedTones`; the pots and crowns must write it too, so these two stay in `shared/`.

## 6. Perf budget

Cold sky within about 25 % of `real`. CI on main `fcd96b26` (worker, CPU x4, 2.75 dpr), ms: `real` sky haifa 271, tel-aviv 271, shadmot 245; the thunder batch
373, 401, 364; land batch 181, 174, 185.

Measured on the first set; the second adds a raster wash and a flood fill, so it must be measured again on CI. Prototype, local, one cold paint of each kind, ms, `real` | concept (tel-aviv, rosh-pina, storm, night):

| Kind | `real` | concept |
|---|---|---|
| sky | 22, 12, 12, 11 | 38, 32, 27, 27 |
| cloudSheet (two sheets) | 246, 278, 335, 260 | 506, 419, 543, 419 |
| cloudCells | storm 166 | 411 |
| plane | 60, 76, 87, 57 | 287, 346, 293, 197 |
| canopy | 7, 14, 8, 6 | 15, 28, 11, 10 |
| water, shafts | 2 to 3, 34 | 4 to 8, 9 |
| outside | 75, 41, 93, 91 (drawn v1's) | 71, 35, 74, 79 |

**Phase 2 is designed round the cost, not trimmed after.** The old numbers are over the budget already, so the first thing built is a
cached sheet: form (outlines, lobes, masks) made once per form and kept, light only re-inks it. No layer goes in before its cost is measured on CI.

So as written the sky is 1.5 to 2 times `real` and the ground 3.5 to 5 times: **over budget**, and not yet worked on. The plan, in order of gain:
- **Sheets**: 3 px grid (0.44 of the cells); noise only where the alpha is near the edge; empty and full contour cells skipped; the two softens folded into
  one; lobes found on a coarser mask with an integer hash; feet's 16 wipes to 6 for small masses. Target 300 where `real` is 250.
- **Cells**: caps drawn once per tower into a sprite and blitted, one mask for block, feet and lobes. Target 200.
- **Ground**: cluster once for both beams on every 16th texel, all classes softened packed four to a buffer. Target 1.25 of `real`'s plane.
- **Sky**: 260 grain lines in two paths instead of one each. Target 18.
- **Scrub and animation** are unchanged in kind: shapes hang on the form, inks on the light. No per-frame work is added.

If a sheet stays over after that, caps are kept for the near row groups only. If the budget still cannot be met, that goes to the manager with numbers.

## 7. Phase 2 proof

Still set (both styles, before and after) on CI, plus one snow moment; mean difference per still; identity check for `real` (byte for byte); perf log; a
review by another model than the writer; the owner's verdict on stills.
