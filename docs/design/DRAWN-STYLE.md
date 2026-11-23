# The drawn style: cut paper

Status: concept, phase 1. Nothing of it is in `src/scene`. Prototype: `docs/design/prototypes/drawn/` (`render.mjs` draws the app's own
stills with it). Stills: `drawn/concept/` in the sessions' shared notes folder; layer crops: `drawn/map/`.

## 1. The one hand

The whole scene is cut from coloured paper and laid far to near. Where a thing is, how big it is and how lit it is comes from the
same model as `real`. Only the shapes' edges, the number of values and the paint differ.

| Rule | What it says |
|---|---|
| Line | None. A shape is seen by its value against the next. One hair of light only where the model gives a rim (ridge crest, shore). |
| Shape | Four words: the **band** (sky, sea, far cloud row), the **lobe** (cloud, tree crown), the **pot** (a patch of ground of one colour), the **block** (a body of three planes). Every layer uses one of them. |
| Values | 3 to 4 flat values per thing, never a gradient inside a shape: lit, local, shade, foot. The step between lit and shade is the model's own, so noon, storm and night keep their range. |
| Colour | One rule, `pigment`: Oklab lightness is the model's, chroma ×1.62 up to 0.17, a light turned warm, a shade turned cool, both fading with the light. No colour is picked by hand for a place or an hour. |
| Edge | Crisp and slow: contours of the model's own field, eased three times. Scallops on cloud tops and crowns, flat on cloud feet, slightly wavy on bands. |
| Texture | No grain, no mottle, no soft wash. Detail is drawn: dabs, gullies, terraces, dashes, panes. |
| Distance | Fewer values and fewer marks, closer to the air's colour (the model's own air): near clouds in lobes, far ones in low arches with a flat foot, the last ones in the air's band. Near ground 6 pots with dabs, the middle 4, the far 3 without. |
| Night | Same cut, values closed up to the model's; what shines (windows, lamps, moon, floodlit gold) is the one bright, warm thing. |
| Detail kept | Every landmark, window rule, lamp, tree, field, terrace, gully, crest, shore, ripple, far town, bird and star the model gives. Windows are fewer and larger by day, all the model's lit ones by night. |

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
| tel-aviv 12:00 | 6.6 | 16.1 | 5.5 | 12.2 |
| rosh-pina 10:00 | 4.6 | 13.9 | 1.5 | 11.9 |
| haifa 2026-03-15 14:00 | 14.6 | 27.3 | 8.2 | 18.8 |
| haifa 21:00 | 1.9 | 7.1 | 2.8 | 7.7 |

The base is `ac4262e8` with foundations' clouds and town patches, so both styles show foundations' newer model.

Known weak points of the concept:
- The large clouds keep the model's own odd outlines (the Tel Aviv "T", the Rosh Pina column): a crisp edge shows a model fault more than
  a soft one. They are in foundations' 1d and must be judged again after it.
- A crisp edge decides where `real` is half clear: the thin low haze of the storm is gone, and some faint far clouds. The moon at
  haifa 21:00 is right but the cloud touches it.
- The storm reads bluer than the grey in `real`: the chroma rule has to ease with the cloud cover.
- Tel Aviv's ground and sea are the plainest parts; a lone ball sits on the right of its cloud.
- The storm's hole (a far cloud seen through the left mass) is the model's.
- The rain curtain is lighter than in `real`.

## 4. Painter plan against the layer contract

Own files in `src/scene/paint/drawn/`, one line each in `drawn/painters.ts`. Nothing reads `real/`. "Prototype" names the file that carries it.

| Kind | Cut as | Painter | From the desc |
|---|---|---|---|
| `sky` | 9 to 12 bands at equal steps of value with slow wavy edges; lilac or orange bands at dusk come from the stops themselves | `sky.ts`, `skyBase.ts` | stops, glow |
| `bodies` | Sun: flat disc, three rings (not when veiled). Moon: shared disc and phase, no ring | `bodies.ts` | disc, veil |
| `stars`, `planets`, `twinkle`, `milkyWay` | Shared; the Milky Way in two flat bands (plan) | | |
| `cloudSheet`, broken | One silhouette where the alpha stands; lobes in 4 values, top first; far rows as arches on a flat foot | `sheet.ts`, `lobes.ts`, `farRows.ts`, `contour.ts` | alpha, tone, city, row spacing |
| `cloudSheet`, closed | Broad planes of its own tone, 3 values, no lobes; the rows' perspective as bands toward the horizon | `sheet.ts` | tone |
| `cloudSheet`, high | Thin planes at 0.4 | `sheet.ts` | alpha |
| `cloudCells` | Tower of lobes lit from the light's side, flat dark base, shelf for the anvil as the model gives it | `cells.ts`, `lobes.ts` | `towerMass` |
| `shafts` | Three leaning panes with a toothed foot and a few strokes | `rain.ts` | shaft, lean, alpha |
| `fall` | Rain: short strokes of two lengths, near bold, far fine. Snow: flat discs of three sizes (plan) | new | drops, flakes |
| `mist`, `edge` | Two or three flat translucent sheets with a wavy top, one after another with distance (plan; `edge` in the prototype) | `painters.ts` | density, heights |
| `landDust`, `grains` | Same sheets in the dust's colour (plan) | new | |
| `rays`, `sheen`, `bow`, `flash`, `shimmer` | Rays and bow as flat wedges and 5 bands; the rest shared (plan) | new | |
| `plane` | The lit ground as pots: 6 near, 4, 3, warped edges, then gullies, terraces, dabs along the slope | `plane.ts`, `classes.ts`, `groundMarks.ts` | `litField` |
| `canopy` | Scalloped crown in three values, its shadow a flat foot | `canopy.ts` | trees, light |
| `water` | Bands of value, dashes for ripples, a chain of dashes for the glint | `water.ts` | stops, ripples, glint |
| `outside`, `marks`, `farCities` | Blocks of three planes, few square panes by day, all lit panes by night; landmarks from the drawn glyphs in the hand's tones, gold kept | `town*.ts` | bodies, tones, shine |
| `smoke` | Three lobes a puff, two values (plan) | new | |
| `birds`, `aircraft`, `meteor`, `wear*`, `loading` | Shared: small flat silhouettes already; wear in the hand's tones (plan) | | |

Order of the build: sky, sheets and cells, ground, town, then water and canopy, rain and fall, mist and dust, the rest. Each step ends with the CI
still set before and after.

## 5. What the contract must give (for the manager, before phase 2)

1. **Sky base per style.** The base sky is a CSS background made in `paint/shared/sky/skyBackground.ts`. A banded sky needs the style to give it: either a
   per-style background function (hard stops in a CSS gradient give straight bands for free, but no wavy edges), or the base on the sky canvas (as in the
   prototype). The real session asks for the same change.
2. **A kind moves out of `SHARED`** when the styles part on it (`sky`, `bodies`, `plane`, `canopy`, `water`, `farCities`, `marks`, `fall`, `mist`, `grains`,
   `landDust`, `rays`, `smoke`): a registry line, no type change but `OwnKind`.
3. **Plane shading.** `plane` and `canopy` write `env.shade` with `shadowBeam` and `shadedTones`; the pots must write it too, so these two stay in `shared/`.

## 6. Perf budget

Cold sky within about 25 % of `real`. CI on main `fcd96b26` (worker, CPU x4, 2.75 dpr), ms: `real` sky haifa 271, tel-aviv 271, shadmot 245; the thunder batch
373, 401, 364; land batch 181, 174, 185.

Prototype, local, one cold paint of each kind, ms, `real` → concept (tel-aviv, rosh-pina, storm, night; `farRows` not in these):

| Kind | `real` | concept |
|---|---|---|
| sky | 10 to 12 | 11 to 18 |
| cloudSheet (two sheets) | 239, 285, 316, 251 | 474, 443, 432, 402 |
| cloudCells | storm 160 | 209 |
| plane | 49, 85, 68, 57 | 166, 388, 314, 199 |
| canopy, water, shafts | 6 to 12, 2, 22 | 6 to 13, 3 to 4, 3 |

So as written it is over: sheets by 1.4 to 2 times, the ground by 3 to 5 times. The plan, in order of gain:
- **Ground**: one indicator soften per pot is the cost. Pots on a grid of two texels (a quarter of the work) and one soften of a single class index field
  with ordered pots (contour at k + ½), k-means on every 16th texel. Target under 1.25 of `real`'s plane.
- **Sheets**: grid at 3 px (0.44 of the cells), one noise lattice read bilinear instead of a `fractal` per cell, `sheetField` made once for form and light,
  the second soften folded into the first. Target 300 ms where `real` is 250.
- **Cells**: the same 3 px grid over 40 px wide towers.
- **Scrub and animation** are unchanged in kind: shapes hang on the form, colours on the light. No per-frame work is added.

If the sheet stays over after that, lobes are kept for the two nearest row groups only.

## 7. Phase 2 proof

Still set (both styles, before and after) on CI, plus one snow moment; mean difference per still; identity check for `real` (byte for byte); perf log; a
review by another model than the writer; the owner's verdict on stills.
