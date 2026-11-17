# Atmosphere v4: design answer (Fable)

Answer to `docs/briefs/atmosphere.md`. Written from the product and motion side: what each state should feel like on a phone, and the numbers that make it proportional. Design target 375 × 812, same as SPEC.

## 0. Position in one page

**The air is derived from numbers, never from the theme.** The theme supplies palette only. A pure function turns forecast values into an `AirState`; every renderer (WebGL, Canvas2D, CSS still) draws the same `AirState`.

**Three rules of restraint.**

1. **One carrier per variable.** Wind is shown by whatever is already in the air: rain slant, snow drift, dust drift, cloud drift. Dedicated wind streaks appear only when the air is otherwise empty and wind is 20 km/h or more.
2. **At most two moving systems plus clouds.** Priority: precipitation > dust > wind streaks > heat shimmer > god rays. The third and later are dropped, not dimmed.
3. **The text band gets 40% of the weather; the valley gets 100%.** The air above the scene is the quiet echo. The valley scene is where the weather happens.

**Calm days cost nothing.** Cloud under 10%, wind under 20 km/h, no precipitation, under 35 °C, dust under 50 µg/m³: render one frame and stop the loop. The screen is a still gradient, the sun and the ridges. That is the correct picture of a calm day.

**A fourth motion verb.** SPEC §4 allows three verbs (travel, draw, fade). The air adds one: **drift**. It is ambient, never triggered by a tap, and never eases in with a bounce. Everything the air does is a drift at a speed set by the data.

**Layout facts that drive the design** (SPEC §2): text occupies 0–418 px, the scene 418–546 px, the sheet covers everything below 526 px. All eight inks are near-white. So there is almost no free sky: the air must work *behind text* for the top 418 px and can only be bold in the 128 px scene band.

## 1. Mapping table

Inputs marked (new) must be added to the request; see §1.10.

### 1.1 Wind: speed, gusts, direction

Screen projection: the scene looks north, west on the left. With `dir` in degrees (meteorological, "from"):

```ts
const u = -Math.sin(rad(dir)) // +1 = blowing left to right (westerly)
const v = -Math.cos(rad(dir)) // +1 = blowing toward the viewer (northerly)
```

Only `u` moves things sideways. When `|u| < 0.35` (wind along the valley, common here) streak length is foreshortened to 30% and particles scale up 15% (northerly, toward viewer) or down 15% (southerly) over their life. Horizontal sign falls back to the last known sign.

| Speed km/h | Feel | What moves | Numbers |
|---|---|---|---|
| under 8 | still | clouds only | cloud drift floor 1.5 px/s |
| 8–19 | a breeze you would not mention | clouds, rain slant | no streaks |
| 20–34 | noticeable | streaks begin | 6–14 streaks, 40–70 px long, alpha 0.10 |
| 35–49 | strong; hold your hat | streaks, dust lift when dry | 16–28 streaks, 90–140 px, alpha 0.14 |
| 50 and up | gale | streaks, ridge-crest spindrift | 36–44 streaks (cap), 160–220 px, alpha 0.18 |

- Streak speed: `12 × kmh` px/s in the near layer, half that in the far layer. 30 km/h crosses the screen in about a second; 50 km/h in 0.6 s.
- Streak count: `44 × clamp((kmh − 18) / 34, 0, 1)`.
- Streak look: 1 css px, alpha tapered to 0 at both ends, ink colour, a 4–8 px sinusoidal lift. Not comic speed lines. 70% of them live between y 380 and 520 (over the ridge crests); the rest are spread through the text band under the legibility profile (§2.4).
- Cloud drift: `max(1.5, 0.4 × kmh)` px/s, signed by `u`; the high layer runs at 0.6×.
- **Gusts.** If `gust − speed ≥ 15` km/h, a swell arrives every 5–9 s (random): attack 300 ms, decay 900 ms, during which effective wind rises from `speed` to `gust`. Rain tilts with it, streaks lengthen. Below 15 km/h difference there are no pulses. This is the felt difference between a steady 30 and a gusty 30.
- Suppression: with rain of 0.5 mm/h or more, or active dust drift, streak count is multiplied by 0.3 (rule 1).

### 1.2 Rain rate (mm/h)

Source: current `precipitation` (new), else the current hour's `precipitation`. If the weather code says drizzle or rain and the rate is under 0.1, use 0.2.

```ts
count  = Math.min(480, 90 * Math.sqrt(rate))
length = Math.min(36, 6 + 6 * Math.sqrt(rate))      // css px
speed  = Math.min(1600, 500 + 220 * Math.sqrt(rate)) // px/s
slant  = Math.min(65, deg(Math.atan((windEff * Math.abs(u)) / fall))) // from vertical
// fall = 32 km/h (real terminal velocity); 12 km/h when rate < 0.5, so drizzle drifts
```

| Rate | Feel | Count | Length | Speed | Alpha | Extras |
|---|---|---|---|---|---|---|
| 0.1–0.5 | drizzle: damp air, barely lines | 30–65 | 8–10 | 570–655 | 0.18 | drifts sideways easily |
| 0.5–2.5 | light rain | 65–140 | 10–15 | 655–850 | 0.22 | — |
| 2.5–7.5 | proper rain | 140–245 | 15–22 | 850–1100 | 0.26 | sky darkens 4% |
| 7.5–20 | heavy | 245–400 | 22–33 | 1100–1480 | 0.30 | splash ticks on the valley floor; sky darkens 8%; far ridge fade +0.3 |
| over 20 | downpour | 480 (cap) | 36 | 1600 | 0.32 | a denser curtain sweeps west to east every 4–7 s; far ridge fade +0.5 |

- Depth: 50% far (0.5× size, 0.6× speed, 0.5× alpha), 35% mid, 15% near (1.5× length, 1.3× speed, drawn in front of the near ridge; see §2.2).
- Showers (codes 80–82): density breathes ±35% over 8–14 s. Steady rain (61–65) does not breathe.
- Colour: `#DCF0FF`, never pure white.
- Thunder (codes 95–99): one in-cloud flash every 9–25 s, 80 ms on and 120 ms afterglow, +0.12 luminance inside cloud density only, capped in the text band. Never more than one per 5 s.

### 1.3 Snow

- Valley snow (`snowfall` > 0 at the place, new): `count = min(220, 60 × sqrt(cm/h))`, round flakes 1.5–3 px, fall 60–120 px/s, sway ±12 px at 0.4 Hz, drift `4 × kmh` px/s. Alpha 0.7 in the scene, 0.3 in the text band. Slow on purpose: the contrast with rain's speed is the whole message.
- **Snow on the ridges** (the realistic case): when precipitation is falling and `freezing_level_height` (new, optional) is below 1100 m, the top of the far ridge gets a white cap. Cap depth: 4 px at 1100 m, 12 px at 700 m. Rain keeps falling in the valley. Only drawn from real data; never inferred from temperature alone.

### 1.4 Temperature, hot side

Uses `max(temperature, feelsLike)`. Requires daylight, sun elevation over 15°, cloud under 60%, no precipitation.

| °C | Feel | Effect |
|---|---|---|
| under 30 | — | nothing |
| 30–34 | warm | sun bloom +10%, nothing moves |
| 35–39 | hot | shimmer band 24 px tall on the valley floor, amplitude 0.6 px, 1.2 Hz |
| 40–44 | sharav heat | band 40 px, amplitude 1.2 px; sun bloom radius 32 → 56 px; horizon bleaches +6% lightness |
| 45 and up | dangerous | band 56 px, amplitude 1.8 px, the far-ridge crest wobbles; sky top loses 10% saturation |

Shimmer never rises above y = 418 px. Text does not wobble, ever. Dry heat (RH under 25%, new) gets full amplitude; humid heat (RH over 55%) gets 50% amplitude and a pale haze instead.

### 1.5 Temperature, cold side

- 5 °C or below: nothing moves. Horizon shifts 8% toward `#C9D6E2`. Cold is stillness.
- 3 °C or below within 90 minutes of sunrise, RH 90% or more, wind under 8 km/h: a mist band 14–20 px thick lies on the valley floor below the sea-level line, drifting at 1 px/s. It burns off over the hour after sunrise.

### 1.6 Cloud cover

| Cover | Feel | Look |
|---|---|---|
| under 10% | open sky | no clouds at all |
| 10–30% | a few | thin high wisps, top quarter only |
| 30–60% | scattered | separate soft masses with clear gaps; the only range where god rays may appear |
| 60–85% | mostly cloudy | masses merge; sun veiled; sky mid desaturates 15% |
| over 85% | overcast | one deck with slow internal texture, no edges; top darkens 10% (25% with rain over 2.5 mm/h) |

- Shader threshold: `coverage = smoothstep(0.1, 0.9, cover/100)` applied to the noise field, so cover changes the *amount of sky*, not just opacity.
- Two layers: high (scale 1.0, speed 0.6×) and low (scale 0.55, speed 1×). Low layer only appears above 30%.
- At night clouds are `#2A2F5C` at up to 55% and they hide stars: star opacity × `(1 − 0.9 × cover/100)`.

### 1.7 Dust and visibility

Uses `visibility` (new) when present; else estimates `visKm ≈ 1300 / pm10` (rough; clamp 1–40).

```ts
farFade  = Math.pow(clamp(1 - (visKm - 3) / 22, 0, 1), 1.5) // 25 km: 0, 10 km: 0.56, 3 km: 1
nearFade = 0.6 * clamp(1 - (visKm - 1) / 5, 0, 1)           // 6 km: 0, 1 km: 0.6
```

| Visibility / dust | Feel | Look |
|---|---|---|
| over 20 km, dust under 50 | crisp | far ridge at full `ridgeFar` |
| 10–20 km, 50–150 | hazy | far ridge 25–55% dissolved into the horizon colour |
| 4–10 km, 150–500 | sharav | far ridge 60–90% gone; haze top rises from the sea-level line (y 72) to y 40; sun becomes a flat pale coin, halo off; 60–120 grains drifting |
| under 4 km, over 500 | dust storm | far ridge gone; near ridge up to 60% faded; sun at 50% opacity; sky top pulled 50% toward mid; 120–200 grains at wind speed |

- Haze colour by cause: dust `#D7BE8C`, humid mist `#C9D2D8` (RH over 85%, dust under 50), rain curtain `#6F8FA0`, heat `#F2CF92`.
- Grains: 1–1.5 px, alpha 0.12–0.2, speed `6 × kmh` px/s, minimum 8 px/s. They replace the current static overlay texture.

### 1.8 Sun elevation

Elevation ≈ `noonElevation × sin(π t)` from the existing `sunPath.ts`.

| Elevation | Light |
|---|---|
| over 45° | flat top light; no rays; glare bloom 56 px when clear and UV is 8 or more |
| 15–45° | standard |
| 0–15° | warm key light in the theme accent; cloud undersides take the horizon colour; god rays eligible |
| −6–0° | horizon glow on the sun's side (the existing `twilight()` values); clouds hold pink for 25 minutes after sunset |
| under −6° | night; static stars. No twinkle: twinkling stars are a screensaver |

God rays: cover 30–75%, elevation 4–30°, no rain. 3–5 soft shafts from the sun disc, alpha 0.10 at most, breathing over 20 s, confined to y over 300 px.

### 1.9 Time of day

The theme gradient already carries it. The air adds only the key-light colour (accent by day, horizon near the edges of the day, `#8FA0D8` at night) and scales particle alpha at night by 0.7 so rain at night reads as sound rather than light.

### 1.10 Data to add

| Variable | Where | Needed for | Priority |
|---|---|---|---|
| `wind_direction_10m` | current, hourly | everything that drifts | must |
| `precipitation` | current | rain rate now | must |
| `snowfall` | current, hourly | snow | must |
| `visibility` | current, hourly | ridge fade | must (has a pm10 fallback) |
| `relative_humidity_2m` | current, hourly | mist, heat character | should |
| `freezing_level_height` | hourly | snow on the ridges | optional |

Skip `rain` and `showers`: the weather code already separates them. Check that `visibility` and `freezing_level_height` are actually populated for `icon_seamless` and `ecmwf_ifs025`; the mapping must accept null for both.

## 2. Technique, layers, budget

### 2.1 Technique per effect

| Effect | Technique |
|---|---|
| Sky colour | **CSS gradient, unchanged.** The shader never paints the sky; it paints air on top with premultiplied alpha. Theme cross-fades stay in CSS for free. |
| Clouds, haze, mist, glow, god rays, lightning | fragment shader, "slow pass": rendered to a framebuffer at one third resolution, refreshed at 12 Hz |
| Far ridge (fade, heat wobble, snow cap) | fragment shader, from a 64-sample height profile |
| Heat shimmer | fragment shader, every frame, scene band only |
| Rain, snow, dust grains, wind streaks | one particle draw call, quads. **Stateless**: position is computed in the vertex shader from a per-particle seed and time. The buffer is uploaded once; no per-frame JavaScript, no garbage. |
| Near-layer rain and splashes | small Canvas2D inside the scene (375 × 128), 70 particles at most |
| Stars | existing single `box-shadow` element |
| Sun disc, near ridge, village, sea line, labels | existing DOM and SVG, crisp |

Noise comes from a 256 × 256 single-channel texture generated at start, not from `sin` hashes: `mediump` hashes band on Mali GPUs. Clouds use 3 octaves per layer plus one offset sample toward the sun for the lit edge. No ray marching.

### 2.2 Layer order, back to front

1. CSS gradient (fixed)
2. Stars
3. **Air canvas (WebGL)**: slow-pass composite → far ridge → shimmer → far and mid particles
4. SVG: sea-level line, near ridge
5. Sun disc (it stays in the DOM so the intro and hour-select travel are unchanged; the shader receives its position for bloom and rays)
6. Near-particle canvas (Canvas2D, scene only)
7. Village dot, scene labels
8. Text, hourly strip, sheet

**Decision: the far ridge moves into the air; the near ridge stays on the ground.** The far ridge is the thing that dissolves in dust, wobbles in heat, takes snow and disappears behind rain, so the shader must draw it. The SVG far path stays mounted as the fallback and is hidden when WebGL is live.

The air canvas is `position: absolute; top: 0; height: <scene bottom>`, so it scrolls with the content and stays registered with the scene. That is about 375 × 560 css px, 31% fewer pixels than full screen.

### 2.3 Terrain contract (for future 3D)

```ts
interface HorizonProfile { far: Float32Array; near: Float32Array } // 64 heights, 0..1
interface AirSurfaces { back: HTMLCanvasElement; front: HTMLCanvasElement | null }
```

The air knows only `AirState`, `HorizonProfile`, the sun position and two surfaces. The terrain renders between `back` and `front`. A 3D terrain later supplies the same profile (its silhouette) and nothing in the air changes. The SVG paths and the profile must come from one source in `sceneModel.ts`.

### 2.4 Legibility

- **Luminance cap.** For each theme, `cap = (L_ink + 0.05) / 4.5 − 0.05`. The shader's last step scales any pixel in the text band that is brighter than the cap. `clearDay` has almost no headroom (mid is 4.9:1 against white; the cap allows about +0.018 luminance), so **clouds behind text are drawn as shade**: slightly darker and greyer than the sky. Bright lit cloud appears only in the scene band. The contrast test gains one case per theme: ink against the cap colour, 4.5 or better.
- **Legibility profile** `k(y)` multiplies particle alpha and cloud contrast. Bands are measured from the DOM (ResizeObserver), not hard-coded:

  | Band | k |
  |---|---|
  | top bar | 0.6 |
  | hero (128 px digits tolerate a lot) | 0.8 |
  | sentence and hourly strip | 0.4 |
  | scene | 1.0 |

- No particle is wider than 1.5 css px. No shape behind small text moves faster than 20 px/s except particles.
- **Scene labels.** "פני הים", "‎−175 מ׳" and the caption currently rely on the dark far ridge behind them. When `farFade > 0.5` that backing turns into pale haze. Set `data-haze="heavy"` on the figure and switch those labels to the `ridgeNear` colour; add both pairs to the contrast test.

### 2.5 Performance budget

| Item | Budget |
|---|---|
| DPR | capped at 1.5 for the air canvas |
| Slow pass | about 190 × 280 px at 12 Hz |
| Particles | 600 quads total; rain 480, snow 220, grains 200, streaks 44 |
| GPU frame | 5 ms or less on Adreno 610 class |
| JS per frame | 1 ms or less; zero allocation |
| Shader and glue | 12 kB gzipped or less |
| Start | compile in `requestIdleCallback` after first paint; never block the intro |

Governor, when the average frame exceeds 20 ms for 2 s, step down one tier and stay there for the session: DPR 1.0 → 2 octaves and slow pass at 8 Hz → 30 fps → half particles → still frame.

Loop policy: stopped on calm days (§0); 12 fps when only clouds move; full rate only with particles or shimmer; 30 fps after 20 s without interaction; paused when `document.hidden` or when less than 15% of the canvas is visible.

## 3. Interaction with existing pieces

### 3.1 ValleyScene

- Far ridge drawn by the air; near ridge, village, sea line and labels unchanged.
- **The sea-level line becomes a gauge.** Haze top sits at the line at 150 µg/m³ and drowns it by 500. Morning mist lies below it. This gives the line a second job without adding any element.
- Sun disc: keep the DOM disc. Add two inputs: `coin` (0–1 from dust: halo shrinks to nothing, colour shifts toward `#F3E3B8`) and bloom radius from §1.4.
- The existing `.glow` twilight div moves into the shader, same numbers from `twilight()`.
- Bug to fix while here: `Sun` veils the disc with `forecast.current.cloudCover` even when an hour is selected. It should use the selected hour's cover.

### 3.2 Hourly selection: yes, the air previews the hour

- **What previews:** particles, cloud cover, haze and ridge fade, wind, sun (already), and the light inside the scene band.
- **What does not:** gradient top and mid, ink, sheet, stars. Text contrast and the theme stay with "now". The preview is weather, not a time machine.
- Night hour selected by day: the scene band darkens 35% toward `#2A2F5C`, sun hidden. The text band is untouched.
- Timing matches SPEC §4: light and ridge 320 ms (with the sun's travel), particle density 520 ms, return 520 ms after the 6 s timeout. Particles never pop: density ramps, existing drops finish their fall.
- No lightning in preview (a flash on tap reads as an error). Gust pulses are allowed.
- Dust beyond the 2-day air forecast is unknown: preview shows clear air, not today's dust.
- All parameters pass through one smoother with per-parameter time constants, so scrubbing with arrow keys just moves targets.

### 3.3 Intro sequence

Text first, weather second.

| Start | Air |
|---|---|
| 0 ms | CSS gradient only (pre-paint). Shader compiling in idle time. |
| when ready, not before 300 ms | slow pass (clouds, haze, far ridge) fades in over 520 ms. The SVG far ridge covers the gap, so nothing pops. |
| 700 ms | particles start; density ramps to target over 900 ms |
| 1600 ms | first gust pulse or shimmer allowed |

The sun's 900 ms travel is unchanged. The intro never waits for WebGL.

### 3.4 Theme cross-fades

- Gradient: CSS, 1600 ms, unchanged.
- Air palette uniforms (key light, haze colour, cloud tint): 1600 ms.
- Densities: 900 ms. Wind: 600 ms.
- A refresh that changes values never restarts anything; it moves targets.

## 4. Signature moment

**The valley holds the weather, and the Gilead tells you how far you can see.**

SPEC already names the valley cross-section as the signature. The atmosphere must not create a second one; it should make the first one alive. So the single memorable effect is inside the 128 px band:

> On a sharav day the eastern ridge dissolves into ochre, the haze rises over the sea-level line, and the sun turns into a pale coin with no glow.

People in the valley already judge a dust day by whether they can see the mountains across the Jordan. The app shows that same test, driven by real visibility. The same mechanism covers every other state without a new idea: rain erases the ridge behind a grey curtain that arrives from the west, heat makes its crest tremble, a cold front puts snow on it, a clear winter morning shows it razor-sharp with mist on the floor.

How the rest stays quiet:

- Behind text everything runs at `k(y)` 0.4–0.8 and under the luminance cap.
- Two moving systems at most.
- No effect reacts to touch. No sound, no haptics.
- No effect loops visibly: every period is randomised within a range (gusts 5–9 s, curtains 4–7 s, lightning 9–25 s).
- A calm day is a still picture.

What each day should feel like in the first 1.5 s, without reading:

| Day | Feel |
|---|---|
| Clear spring morning, 22 °C, 6 km/h | Nothing moves. Sharp ridges. Quiet. |
| August, 43 °C | The valley floor trembles; the sun is too big; the horizon is bleached. |
| Sharav, dust 400 | Flat ochre; no far ridge; coin sun; slow grains. Oppressive. |
| Winter front, 12 mm/h, gusts 55 | Dark top; rain at 50° from the west; the scene nearly erased; swells you can almost hear. |
| Drizzle, 0.3 mm/h | Short faint lines drifting sideways. Damp, not wet. |
| Dry 40 km/h easterly | Long thin streaks over the crests, right to left, with visible gusts. |
| Overcast, still | A slow grey deck. Heavy but calm. |

## 5. Hand-painted assets

Paint almost nothing.

| Asset | Decision |
|---|---|
| Ridge silhouettes | **Hand-drawn vector**, not raster. Redraw both layers from the real elevation profile along latitude 32.35° N (exaggerated about 6×) so Samaria and the Gilead are recognisable. Export once as SVG path plus the 64-sample profile. |
| Ridge texture | One optional plate: greyscale gouache grain, 750 × 256, WebP under 12 kB, multiplied into the ridges at 6–10%. The only raster worth painting. Ship without it first. |
| Clouds | Procedural. They must respond to cover, wind and light; painted clouds cannot. |
| Sky plates per state | **No.** They fight the eight-theme gradient and the contrast test, and the state count explodes. |
| Still frames for fallback | Rendered procedurally from `AirState`, not painted. |
| Noise | Generated at start. |
| Snow cap, mist, haze | Procedural from the profile. |

## 6. Accessibility and fallbacks

**Reduced motion: a still photograph of the weather.**

- One shader frame at a fixed time: clouds, haze, ridge fade, snow cap, sun coin and bloom all visible.
- Particles drawn frozen: rain as streaks at their real slant, 60% of the count, 70% alpha; snow as dots; grains as dots; wind streaks at 50% count. A frozen slanted streak still says "rain, windy".
- Heat: static mirage bands on the valley floor, no wobble.
- No lightning, no gust pulses, no curtains.
- Changes cross-fade in 320 ms (SPEC §4). Hour preview cross-fades in 160 ms.

**No WebGL: Canvas2D.**

- Particles as in WebGL, rain capped at 240.
- Clouds: 3–5 pre-blurred sprites drawn once to offscreen canvases, drifting at the mapped speed.
- Haze and ridge fade in CSS: `fill: color-mix(in srgb, var(--ridge-far), var(--air-haze) calc(var(--far-fade) * 100%))`.
- No shimmer, no rays, no lightning.

**No canvas or script failure: CSS only.** The current `Sky.tsx` layers, made data-driven with custom properties: `--rain-angle`, `--rain-alpha`, `--rain-gap`, `--far-fade`, `--cloud-alpha`. Still proportional, still honest.

**Power.**

- `navigator.connection.saveData`: start one tier down, 30 fps.
- Battery (where the API exists) under 20% and not charging: 30 fps, half particles, slow pass at 6 Hz. Under 10%: still frame.
- Hidden tab: paused. Sheet covering the sky: paused.

**Other.**

- The whole air stays `aria-hidden`. The scene's label gains one clause when relevant, for example "הרי הגלעד מוסתרים באבק" when `farFade > 0.6`, so the signature is not sighted-only.
- Flash safety: one flash per 5 s at most, small area, low luminance step.
- A user setting "אווירה: מלאה / שקטה / כבויה" is worth adding later; "שקטה" is the reduced-motion still.

## 7. Risks, and what to cut first

| Risk | Mitigation |
|---|---|
| Text contrast breaks under clouds or haze | Luminance cap in the shader plus a test per theme; clouds as shade behind text |
| It looks like a screensaver | Two-system rule, randomised periods, calm-day stop, nothing reacts to touch |
| Battery drain | Loop policy in §2.5; calm days render one frame |
| `visibility` or `freezing_level_height` null for our models | pm10 estimate; snow cap simply not drawn |
| Far ridge drawn in WebGL misaligns with the SVG near ridge | Canvas scrolls with content; both read one profile source; a visual test at 320, 375 and 430 px widths |
| Shader compile jank during the intro | Idle-time compile; SVG far ridge covers until ready |
| GPU differences (Mali precision, context loss) | Noise texture instead of hashes; handle `webglcontextlost` by falling back to Canvas2D for the session |
| Hour preview feels like the app is lying about now | Preview limited to the scene and particles; readout line already says which hour |
| Wind direction misread on a west–east section | Foreshortening for along-valley wind; never invent a sideways direction |
| Scope | Ship in the order below |

**Build order:** pure mapping and tests → CSS-only data-driven still → particles (rain, slant, gusts) → far-ridge fade and haze → clouds → heat shimmer → the rest.

**Cut order, first to last:**

1. Near-layer front canvas and splashes
2. God rays
3. Snow cap on the ridges
4. Lightning
5. Rain curtains in a downpour
6. Valley-floor mist
7. Painted ridge texture

Never cut: rain proportional to rate with wind slant, gust pulses, far-ridge fade, calm-day stillness, the luminance cap.

**Tests for the pure mapping** (`src/domain/atmosphere/*.test.ts`):

- 10 km/h gives no streaks; 50 km/h gives the cap.
- Rain count, length and speed are monotonic in rate and respect caps.
- Slant is 45° at 32 km/h cross wind and 0° for along-valley wind.
- `farFade` is 0 at 25 km and 1 at 3 km; null visibility uses pm10.
- At most two moving systems for any input.
- The calm predicate is true for the quiet case and false if any one variable crosses its threshold.
- Null and missing inputs never throw and never produce NaN.
