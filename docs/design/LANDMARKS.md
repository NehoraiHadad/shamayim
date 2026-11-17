# Landmarks (v6): what stands on the line

Extends `ATMOSPHERE.md` (still wins) and `CALM-LIFE.md`. **Honest rule: a mark is drawn only if a curated entry or an OSM object says it is
there.** No data → the scene stays as it is today. Sizes are CSS px; the scene is 128 px high at every width, so only x is in %.

## 1. What gets drawn
Three sources, first match wins per place: **curated** (place centre ≤ 8 km from a curated centre; match by distance, geocoder ids vary) →
**OSM** (Overpass, everywhere else) → **place** (a `homes` glyph at the centre, only when the geocoder says it is a populated place).

Curated, MVP. Coordinates and heights checked against OSM on 2026-11-17 unless marked `?`. `dx` = km east of the Open-Meteo geocoder centre.
| Place (centre) | Mark | lat, lon | Height m | dx → x | Glyph |
|---|---|---|---|---|---|
| Jerusalem (31.7690, 35.2163) | Chords Bridge | 31.7885, 35.2004 | 118 mast | −1.51 → 164 | leaning mast + cable fan |
| | YMCA tower (the "buildings") | 31.7743, 35.2216 | 46 `?` | +0.50 → 195 | stepped tower, small dome cap |
| | Tower of David | 31.7761, 35.2281 | 30 `?` | +1.11 → 205 | crenellated wall + slim minaret |
| | Western Wall + Dome of the Rock | 31.7768, 35.2344 | wall 20, dome top 34 `?` | +1.71 → 214 | coursed wall block, dome above it |
| Tel Aviv (32.0809, 34.7806) | Shalom Meir Tower | 32.0642, 34.7697 | 130 (OSM; Wikipedia 142) | −1.03 → 171 | plain slab |
| | Reading chimney | 32.1055, 34.7789 | 150 | −0.16 → 185 | chimney on a low block |
| | Azrieli Sarona | 32.0719, 34.7885 `?` | 238 | +0.75 → 199 | tall twisted slab |
| | Azrieli Center | 32.0746, 34.7916 | 187 / 169 / 154 | +1.04 → 204 | round + triangle + square tops, one glyph |
| Haifa (32.8130, 34.9993) | Shrine of the Báb | 32.8146, 34.9871 | 40 | −1.14 → 170 | drum + dome, terrace step below |
| | Dagon silo | 32.8232, 34.9948 | 47 | −0.42 → 181 | wide block, crenellated top |
| | Sail Tower | 32.8163, 35.0028 | 137 (OSM roof 113) | +0.33 → 193 | slab with curved sail edge |
| | Refinery cooling towers ×2 | 32.7933, 35.0516 | 75 | +4.90 → 264 | two hyperboloids |
| Shadmot Mehola (32.348, 35.535) | Date palms (grove at Mehola) | 32.3690, 35.5253 | 15 | x 160 | 3 palms |
| | Synagogue among the homes | 32.3465, 35.5324 | 8 | x 170 | low roofs, one taller hall |
| | Solar field | 32.3425, 35.5340 | 3 | x 187 | 4 tilted panels |
| | Orchard (crop untagged) | 32.3460, 35.5605 | 5 | x 200 | 4 round crowns, **not** palms |

Cut and why: Jaffa St Peter's (2.9 km south; projects into the sea), Haifa Eshkol Tower (5.6 km south, would stand on the wrong ground), Knesset
(low, unreadable at 12 px), flags (no data on where one flies), chimney smoke (we cannot know a plant is running; Reading is shut).
Shadmot: OSM has **no water tower** and no fish ponds on the line (two ponds 1.9 km north, flat, not a silhouette), so neither is drawn. Its
terrain is hand-drawn (about 9 px/km east of the dot, not 15.6), so its four entries carry explicit `x` instead of being projected.

**OSM (phase 2).** One Overpass request per place, after first paint (`requestIdleCallback`), `[out:json][timeout:25]`, `out tags center 200`.
Near box: ±12 km east–west × ±1.5 km north–south. Far box: ±30 km × ±3 km, tall kinds only.
| Kind | Tags | Default height m | Weight |
|---|---|---|---|
| bridge | `way[bridge]["bridge:structure"~"cable-stayed\|suspension"]` | 60 | 9 |
| cooling | `man_made=cooling_tower`, or `man_made=tower` + `tower:type=cooling` | 60 | 8 |
| turbine | `power=generator` + `generator:source=wind` | 80 | 8 |
| chimney | `man_made=chimney` | 60 | 7 |
| lighthouse | `man_made=lighthouse` | 20 | 7 |
| minaret | `man_made=tower` + `tower:type=minaret`, or `building=mosque` | 30 | 7 |
| highrise | `building` with `height ≥ 40` or `building:levels ≥ 12` (levels × 3.2) | — | 6 |
| waterTower | `man_made=water_tower` | 25 | 6 |
| church | `amenity=place_of_worship` + `building~church\|cathedral` | 25 | 5 |
| silo | `man_made=silo` | 30 | 5 |
| castle | `historic~castle\|fort` | 12 | 5 |
| mast | `man_made=mast`, `man_made=tower` + `tower:type=communication` | 45 | 3 |
| palms / orchard | `landuse=orchard` (+ `trees=date_palms` → palms) | 15 / 5 | 2 |
| solar | `power=plant` + `plant:source=solar` | 3 | 2 |

`height` tag wins over the default. `score = weight + min(h, 200)/20 − 4·(|dy|/band) − |dx|/6 + (named ? 1 : 0)`; duplicates of one kind within
300 m merge. Far layer accepts only `h ≥ 60` or chimney / cooling / turbine.
- **Cache:** `localStorage` `shamayim:landmarks:v1:{placeId}`, the ≤ 8 ranked marks only, 30 days. Failure: store `{ failed: at }`, retry after
  24 h, try `overpass.kumi.systems` once before giving up. While loading or failed: `place` fallback, never a guess.
- **Place fallback:** `homes` at the centre when geocoder `feature_code` starts with `PPL`: population < 2 000 → 3 roofs (6 px); < 50 000 → 5
  roofs + one 2-storey block (8 px); else 7 blocks of mixed height (≤ 14 px). Needs optional `population` on `Place`.
- **Attribution:** `נתוני ציוני דרך: © תורמי OpenStreetMap (ODbL)` linking to `openstreetmap.org/copyright`, shown where credits live whenever
  marks come from OSM (the curated list was checked against OSM, so show it there too). `Place.usesOsm` already exists; reuse it.

## 2. Placement
- **x.** `dxKm = (lon − place.lon) · 111.32 · cos(lat)`, `dyKm = (lat − place.lat) · 111.32`. Near: `x = 187.5 + 15.625·dx` (|dx| ≤ 12).
  Far: `x = 187.5 + 6.25·dx` (12 < |dx| ≤ 30). Rendered as `left: x/375·100%`. Shadmot uses the entry's `x`.
- **On the line.** OSM: `|dy| ≤ 1.5 km` near, `≤ 3 km` far. Curated: `≤ 3 km` (a city is wider than the line; the cluster is the city).
- **Base.** `baseY = groundY(samples, x)`: linear interpolation of `profilePoints()` of that layer; the glyph extends 2 px below it so no
  hairline shows. Shadmot bases: y 96 for x 150–200. A mark whose ground sample is water (|elevation| ≤ 1 m) is dropped.
- **Far visibility.** A far mark is drawn only where the far ridge shows: `farY(x) ≤ nearY(x) − 4`.
- **No distortion.** Split `.land` into two SVGs (`landFar`: far path + mist; `landNear`: sea + near path), both still
  `preserveAspectRatio="none"`. Marks live in two plain divs, `marksFar` between them and `marksNear` after; each mark is its own inline SVG
  with a fixed px box, `position: absolute; transform: translateX(-50%)`. Ridges stretch, marks never do.
- **Height.** `hPx = round(clamp(8 + 26·√(h/240), 10, 34))`; far × 0.6 (min 8). Fixed: homes 6–14, solar 3, orchard 6, palms 11. This keeps
  order honest (238 m → 34, 118 m → 26, 40 m → 19, 20 m → 16) and sits near the terrain's own ~10× vertical exaggeration; it is not to scale.
- **Count.** Near ≤ 5, far ≤ 2 at 375 px; +1 near per extra 150 px of width, cap 8. Take by score.
- **Spacing.** Keep west→east order, then push apart until boxes clear by 3 px (near) / 6 px (far). Max shift 24 px; if more is needed drop
  the lower score. Order is true, spacing inside a cluster is not; that is the stated licence.
- **Collisions.** Village dot: no box within ±7 px of `centerLeft` (shift, do not drop). Sea label box (`right: 27%`, `seaY − 14`, 44 × 12):
  shift or drop. Corner captions: for x < 110 or x > 265 the top must be ≥ 22 (shrink to fit, drop under 10 px). Hour readout: marks with
  top < 22 go to opacity .35 while it shows. Sun: nothing to do, it already passes behind the land and now behind the marks.

## 3. Drawing style
- One filled path per glyph, flat, no stroke, no gradient. Near: `fill: var(--ridge-near)`, `opacity: calc(1 − var(--near-fade))`. Far:
  `var(--ridge-far)`, `opacity: calc(1 − .95·var(--far-fade))`. Same tokens as the ridge, so theme, night and haze come for free and a mark
  reads as the ridge growing a shape.
- Smallest feature 1.5 px, smallest gap 1.5 px, corners square (domes and crowns are the only curves). Test every glyph at 12 px.
- One accent per curated glyph at most: the Dome of the Rock dome `color-mix(in srgb, var(--accent) 70%, var(--ridge-near))`. Nothing else.
- Generic vocabulary (viewBox w × h): highrise 6×20 slab; chimney 3×20 taper; cooling 9×12 waist; mast 1.5 wide line + 3 px cross-arm;
  waterTower 8×14 mushroom on stem; minaret 3×18 with balcony ring + point; church 10×14 gable + tower; silo 12×12 three round-tops;
  lighthouse 4×14 taper + lamp; turbine 2×18 pole + three 7 px blades (blades are a separate element); bridge 22×14 mast + five cables;
  castle 14×6 crenellated; palms 3 trunks 1.2 wide + 5-frond crowns (crowns separate elements); orchard 4 circles r 2.5; solar 4
  parallelograms; homes: pitched roofs 5 px wide.
- Curated glyphs are drawn by hand to the descriptions in §1, one file each, viewBox height 40.

## 4. Life from weather
All static except one ambient sway. No rAF, no new timer chain; CSS animations on `transform` only. `mapMarks(input, air)` is pure.
| Behaviour | Trigger | Spec |
|---|---|---|
| Lit windows | `sunElev ≤ −4`; or by day when thunder, rain ≥ 7.5 mm/h or `farFade > 0.6` (30% lit) | 2–6 rects 1 × 1.5 px per glyph at seeded spots, `#FFD9A0` α .85. Lit share by local hour: 17–23 100%, 23–01 50%, 01–05 20%, 05–sunrise 50%. Highrise, homes, church, minaret (one lamp), lighthouse (lamp) |
| Aviation light | lights on and `h ≥ 60` | one 1.5 px dot `#FF5A4A` at the top, steady. No blinking (it would be a luminance event) |
| Lights in fog | lights on | light alpha × `(1 − 0.7·fade)` while the body uses `(1 − .95·fade)`: the window outlives the wall. `farFade > 0.4` adds a 3 px halo at α .25 |
| Fog swallows | `farFade ≥ 0.85` | far marks not rendered. Near marks follow `--near-fade` only |
| Lean (static) | wind ≥ 8 km/h, `|u| ≥ 0.35` | palms and orchard crowns rotate `sign(u)·(1.5 + 5·clamp((kmh − 8)/32))°` about the trunk top. Follows hour preview |
| Sway (ambient) | wind 8–20, dry, no rain / snow / dust / streaks, not both heat band and rays, not preview | crowns ± `(2 + 6·clamp((kmh − 8)/22))°` around the lean, period `2.6 − 1.0·clamp(…)` s, ease-in-out alternate, random phase. Along-valley wind: × 0.5. Runs 20 s after load / visible and during each gust swell, then rests at the lean |
| Turbine | wind 11–90 km/h, no precipitation or dust, fewer than two moving systems active, not preview | blades rotate, period `7 − 3.5·clamp((kmh − 11)/40)` s, linear, same 20 s window; otherwise parked with one blade up |
| Heat | heat band active | far marks alpha × 0.85 (bleach). No motion: the shimmer filter stays on the ridge |
| Lightning | — | nothing added: dark silhouettes against the flash are the effect, and the storm rule above turns windows on |

Why sway only at 8–20 dry: principle 2 (one carrier per variable). Streaks start near 20 and rain or dust carry wind when present; below that
the wind had no carrier at all. Sway never coexists with a particle system, so "two moving systems" holds.
Reduced motion / Save-Data: lean, lights and fades only. `document.hidden`: `animation-play-state: paused`.
**Cut:** wet sheen (invisible on a flat 12 px shape, and rain already has its carrier), flags, cranes swinging, smoke. **Deferred:** snow caps
(1.5 px `#F4F7FA` top edge when `snow_depth ≥ 1 cm`); ship only together with a snow line on the ridge, otherwise a white roof on a brown hill lies.

## 5. Data and modules (each ≤ 150 lines)
```ts
type MarkKind = 'highrise' | 'chimney' | 'cooling' | 'mast' | 'waterTower' | 'minaret' | 'church' | 'silo' | 'lighthouse' | 'turbine'
  | 'bridge' | 'castle' | 'palms' | 'orchard' | 'solar' | 'homes' | 'custom'
interface Landmark { id: string; kind: MarkKind; glyph?: string; nameHe?: string; lat: number; lon: number; heightM: number
  x?: number; source: 'curated' | 'osm' | 'place' }
interface CuratedPlace { id: string; lat: number; lon: number; marks: Landmark[] }
interface PlacedMark { id: string; kind: MarkKind; glyph: string; layer: 'near' | 'far'; xPct: number; baseY: number; hPx: number
  lights: number; tall: boolean }
interface MarkLife { litShare: number; aviation: boolean; leanDeg: number; sway: { ampDeg: number; periodS: number } | null
  turbinePeriodS: number | null; hideFar: boolean; farBleach: number }
```
- `src/data/landmarks/types.ts` · `curated.ts` (the §1 table) · `project.ts` (`offsetKm`, `toX`, `groundY`, `markHeight`) ·
  `rank.ts` (`score`, `select`, `spread`, `avoid`) · `overpass.ts` (`buildQuery(place)`, `parseOverpass(json) → Landmark[]`) ·
  `useLandmarks.ts` (cache, fetch, fallback; the only impure file) · `placeMarks.ts` (`placeMarks(place, terrainData, marks, width) → PlacedMark[]`).
- `src/atmo/life/mapMarks.ts` (`mapMarks(input, air) → MarkLife`).
- `src/ui/scene/marks/Landmarks.tsx`, `glyphs/*.tsx` (generic in one file, one file per curated city), `marks.module.css`.

**Tests (pure).**
1. `offsetKm(Jerusalem, Chords Bridge)` → dx −1.51, dy +2.16 (±0.02); `toX` → 163.9. Azrieli from Tel Aviv → +1.04, −0.70, x 203.8.
2. `toX`: dx 0 → 187.5; dx +12 near → 375; dx +30 far → 375; dx 13 → far layer; dx 31 → dropped.
3. `groundY` halfway between samples of y 40 and 60 → 50; x 0 and x 375 return the edge samples.
4. `markHeight`: 238 → 34, 118 → 26, 40 → 19, 5 → 12, 1000 → 34; far 150 → 17.
5. Band: OSM mark at dy 1.6 km → out; curated at dy 2.75 (Reading) → in; curated at dy 5.6 → out.
6. Water: Jaffa-like point whose ground sample is 0 m → dropped.
7. `select`: 9 candidates at width 375 → 5 near; at 675 → 7; far never more than 2; a 40 m mast at dx 20 → not in far.
8. `spread`: Jerusalem x 164 / 195 / 205 / 214 → order kept, boxes ≥ 3 px apart, no shift > 24, none inside 180.5–194.5 (the dot).
9. `parseOverpass`: `building:levels=30`, no height → 96 m highrise; `man_made=tower` + `tower:type=cooling` → cooling; two chimneys 200 m
   apart → one; orchard with `trees=date_palms` → palms, without → orchard.
10. `mapMarks`: `sunElev` −10 at 21:00 → litShare 1; at 03:00 → 0.2; noon with thunder → 0.3; clear noon → 0.
11. `mapMarks`: wind 14 from 270°, dry → lean +2.44°, sway amp 3.64°, period 2.33 s; same with rain 1 mm/h → sway null, lean kept;
    wind 6 → lean 0, sway null; wind 14 from 0° → lean 0, amp × 0.5; wind 30 → sway null (streaks carry), turbine period 5.34 s.
12. `mapMarks`: `farFade` 0.9 → hideFar; preview → sway null, turbine null.

## 6. Build order
1. `types`, `project`, `rank` + tests. 2. Split the scene SVG, add `Landmarks.tsx` with the generic glyphs. 3. `curated.ts` + hand glyphs:
Shadmot, Jerusalem, Tel Aviv, Haifa; check each on a 375 px phone, day / night / dust. 4. `mapMarks`: lights, fog, lean. 5. Sway and turbine.
6. `overpass`, `useLandmarks`, place fallback, attribution. 7. Snow (with the ridge line) if still wanted.
