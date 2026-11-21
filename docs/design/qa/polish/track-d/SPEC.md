# Track D — one cloud field (audit #4, #5, #6, #10): design spec

Design: Fable (advisor, 2026-11-21). Scope decisions and build phases: Claude (manager). Code: Neon (Gemini 4 Neon) for the
field, light, shadow, rain and motion logic; Claude for the painters; Codex (gpt-6.2-sol) reviews.

## Scope decisions (Claude)

- **Data.** `HourPoint` has no CAPE or showers fields. `conv` comes from the weather code and rain rate only, marked in
  `sources` as `code`. Adding Open-Meteo `cape`, `showers` and `boundary_layer_height` is a follow-up (data layer).
- **Anchor.** Default anchor only: the first local midnight in `forecast.hours`, with a seeded per-(place, date, lattice)
  offset of 500 km. The persisted anchor across forecast refreshes (§2) is a follow-up; until then the layout re-deals
  once, when the forecast window's first day changes.
- **Motion.** Real-time, per cell, from keyframes (§7). The compositor gets one new mode for it.
- **Painters.** Claude draws per-genus sprites (§6).

Build phases:
1. **N1 — field core** (`src/world/field/*`): lattice, occupancy, genus, advect, field, cells, project. Tests 1, 4, 5.
2. **N2 — light, shadow, rain**: transmit, `light.eye` and `light.direct`, ground shadows by forward projection, rain cells.
   Tests 2, 3, 8. Wire into `world.ts`, `light.ts`, `rain.ts`, `scene/model/cloudShadows.ts`.
3. **N3 — emission and motion**: `scene/model` cell descs with keyframes, far strips, the compositor `cells` mode.
   Test 7, perf.
4. **Claude — painters** per genus, stills.

## 0. Decisions in one page

- **One field.** Each layer is an infinite seeded jittered lattice of cells, fixed in that layer's air frame.
  - World position = lattice position + `D_L(t)`, the wind integrated from an anchor.
  - No tiling, no wrap, no per-day reseed, so nothing pops.
- **Cover** sets a rank threshold and a size factor through the Boolean-model formula. Cells gather and dissolve by `share`.
- **Every consumer queries the same cells:**
  - drawing (true perspective);
  - eye-to-disc transmission (a ray march);
  - ground shadows (the same march from a ground point);
  - rain (the ranked cells of the raining layer).
- **Motion is real-time and per cell.** The current drift is a 20–200× time-lapse and uniform per layer. Both go.
- **`cloudTransmit`** stays only as the layer-mean (closed-deck and diffuse) estimate, re-derived from τ.

Replaced:
- `banksOf`;
- `deckOf` and its veil;
- the `cloudShadows.ts` bands;
- `cloudDriftKm`;
- `rainFrom`'s random bank pick;
- `CloudLayer.drift`.

## 1. Field model

### 1.1 Frames and units

- **World frame:** km east and north of the eye; heights in km above the eye. `t` is minutes since the Unix epoch at the
  shown minute.
- **Air frame of layer L:** `q = p − D_L(t)`.
- **Sites:** site `(i, j)` sits at `q = P_L·(i + jx, j + jy)`, with jitter `jx, jy ∈ [−0.35, 0.35]` from
  `hash(placeId, L, i, j)`. The lattice axes are fixed north–east.

### 1.2 Four lattices

| Lattice | Pitch P | Carries | Individual range | Far-strip range |
|---|---|---|---|---|
| low | 1.5 km | Cu humilis/mediocris, Sc, St | 10 km | 50 km |
| tower | 8 km | Cu congestus, Cb (their area comes out of the low budget) | 80 km | — |
| mid | 6 km | Ac patches, As/Ns sheet | 40 km | 110 km |
| high | 25 km | Ci, Cs | 120 km | 250 km |

### 1.3 Per-site static attributes

Each site carries:
- rank `u ∈ [0,1)`, its order of appearance;
- `r0`, its radius at unit size: lognormal, clipped;
- `aspect` (V/W), `seed`, `lifePeriod`, `lifePhase`, and `axis` (high lattice only).

Caching: typed-array blocks of 128×128 sites around the eye's air-frame position. A block is rebuilt when the eye comes
within 16 sites of its edge. Two blocks are kept, LRU.

Mesoscale clumping:
- `u' = clamp(u + A_L·(n(q/λ_L) − ½))`, where `n` is a 2-octave value noise in the air frame.
- `λ` = 12 km (low), 40 km (mid), 150 km (high).
- `A` = 0.35 (Cu), 0.2 (Sc), 0.5 (Ac), 0.5 (Ci).

### 1.4 Genus table

Notes on the table:
- Bases are above ground. The WMO étages for mid-latitudes: low < 2 km, mid 2–7 km, high 5–13 km.
- τ is the visible vertical optical depth at the cell centre: `τ0 = κ·V`.

| Genus | Base | Thickness V | Width W = 2R | κ (km⁻¹) | τ0 |
|---|---|---|---|---|---|
| Cu humilis | LCL (`lowBaseM`, 0.3–2.5 km) | 0.15–0.5 km (V/W 0.4) | 0.25–1.0 km, median 0.6 | 30 | 5–15 |
| Cu mediocris | LCL | 0.5–1.5 km (V/W 0.8) | 0.5–2 km | 30 | 15–45 |
| Cu congestus | LCL | 2–5 km (V/W 1.2–1.5) | 1.5–5 km | 30 | 60–150 |
| Cb | LCL | to 8–12 km; anvil 20–60 km | 5–15 km core | 30 | 150–400 |
| Sc | 0.4–2.0 km | 0.2–0.6 km | elements 0.6–3 km | 40 | 8–25 |
| St | 0.05–0.6 km | 0.1–0.5 km | sheet | 40 | 4–20 |
| Ac | 3–5 km | 0.2–0.6 km | patch 3–15 km; elements 0.1–0.35 km | 15 | 3–9 |
| As | 3–5 km | 1–3 km | sheet | 6 | 6–18 |
| Ns | 0.6–2 km | 2–5 km | sheet | 25 | 50–125 |
| Ci | 8–12 km (at 31–33° N) | 0.3–1.5 km | streak 20–60 × 3–10 km | 0.15 | 0.03–0.3 |
| Cs | 7–10 km | 1–2.5 km | sheet | 0.5 | 0.3–1.5 |

`r0` per lattice:

| Lattice | Median | σ_ln | Clip / note |
|---|---|---|---|
| low | 0.30 km | 0.45 | [0.12, 0.60] |
| tower | 1.2 km | 0.4 | — |
| mid | 2.2 km | 0.4 | — |
| high | half-length 15 km | 0.4 | width = length / 3 |

Cell thickness profile:
- cumuliform: a paraboloid on a flat base, `V(r) = V0·(1 − (r/R)²)`;
- stratiform: `V0·(1 − (r/R)⁴)`.

### 1.5 Genus from the data

All blends are continuous smoothsteps; nothing switches.

- **`conv`** = the largest of:
  - codes 80–82 → 0.6;
  - codes 95–99 → 1;
  - CAPE (not in the data yet).
- **Low `strat`** = `smoothstep(0.5, 0.75, c_low)·(1 − conv) + 0.5·(1 − smoothstep(−6, 10, sunAlt))`, clamped.
  - 0 = Cu, 1 = Sc.
  - St when `strat > 0.9`, LCL < 0.3 km and wind < 4 m/s.
- **Cu aspect** = `lerp(0.4, 0.8, smoothstep(0.1, 0.4, conv))`.
- **Tower share budget** = `conv·min(c_low, 0.5)`.
- **Mid `sheet`** = `smoothstep(0.65, 0.9, c_mid)`: Ac → As.
  - Ns when the mid or low layer rains steadily (codes 61–65) and `c_low·c_mid > 0.5`.
- **High `veil`** = `smoothstep(0.55, 0.85, c_high)`: Ci → Cs.
- Never drawn, because no data tells them apart: Cc, mammatus, lenticularis, castellanus.

### 1.6 Cover → occupancy

The Boolean model:
- `c = 1 − exp(−n·E[πR²])`, so the intensity is `Λ(c) = −ln(1 − c)`, with c clamped at 0.98.
- `a0 = π·E[r0²]/P²` ≈ 0.19 (low), 0.55 (mid), 0.5 (high).
- Occupied fraction `Q = min(1, Λ/a0)`. Size factor `g = max(1, √(Λ/a0))`.

Per cell:
- share `s_i = smoothstep(0, 1, (Q − u'_i)/δ + ½)`, with δ = 0.25;
- `R_i = r0_i·g·√s_i`;
- `τ0_i ∝ s_i`.

Life cycle:
- `u'_i(t) = u'_i + 0.12·sin(2π(t/T_i + φ_i))`.
- T is 20–40 min (Cu), 60–180 min (Sc, Ac), 90–240 min (Ci).

Closing floor:
- Above c = 0.9 a sheet closes the gaps: `τ_floor = smoothstep(0.9, 1, c)·0.5·κV̄`.
- Overlapping cells add their τ.

Calibration:
- Stated bias up to ±0.05.
- A 9-point correction table `c → c'` per lattice, produced by the calibration test, brings the residual to ≤ 0.03.
- The forecast's cover is plan-view cover. The sky cover seen from the ground is higher because cloud sides show; that
  comes from the projection and is not calibrated away.

## 2. Advection

**Steering wind.** The wind at the layer's mid-height above sea level, `z = elev + base + V̄/2`:
- Interpolate the vector linearly in height between 10 m, 850 hPa (≈ 1.46 km asl), 700 hPa (≈ 3.01 km) and 300 hPa
  (≈ 9.16 km). These are the forecast's `windAloft.low`, `.mid` and `.high`.
- Hold the value above 300 hPa. Clamp the speed to 250 km/h.

**Fallback without `windAloft`:**
- `wind.ts`'s ×1.4, ×2 and ×3 of the 10 m wind;
- veered clockwise by +20°, +30° and +30°;
- marked `derived`.

**Displacement.** `D_L(t) = D_L(A) + ∫_A^t v_L dt`, as a vector in km:
- Trapezoid cumulative sums per `forecast.hours` identity, kept in a `WeakMap`.
- Inside an hour: `D = cum[h] + a·f + (b − a)·f²/2`.

**Anchor A.** The first local midnight in `forecast.hours`, with `d = 500 km × seeded(hash(placeId, date(A), L))`.

## 3. Projection to the panorama

For a cell at world (x, y), with base `h`, top `h + V` and radius R:

| Quantity | Formula |
|---|---|
| ground distance | `d = hypot(x, y)` |
| azimuth | `az = atan2(x, y)` |
| altitude of a point at height z | `alt(z, d) = atan2(z − d²/(2·R_eff), d)`, R_eff = 7433 km |
| range | `range = hypot(d, h)` |
| angular width | `w° = 2·atan(R/range)` |

Silhouette:
- The underside runs from `a_far = alt(h, d + R)` to `a_near = alt(h, d − R)`. `a_near` is 90° when `d < R`.
- The side and top run from `a_near` to `a_top = alt(h + V, d)`, shown only when `a_top > a_near`.

Screen placement:
- `x = geom.x(az)`.
- `y = geom.dome()` of each of the three altitudes.
- Below `DOME_ALT` clouds share the land's vertical exaggeration, so occlusion of the sun and moon stays exact.

Azimuth extent:
- `w°/cos(alt_mid)`, capped at ×2.4 (alt 65°).
- Cells above 65°, or with the eye under them, are drawn as a canopy band along the top edge, spanning their azimuth
  extent (≤ 120°, soft ends).

Emission:
- On-cells within the individual range are emitted one by one, far to near.
  - Caps: 96 low, 12 tower, 48 mid, 24 high, chosen by apparent area.
- The rest are binned into **far strips**:
  - bins of 4° in azimuth (8° for high);
  - opacity `1 − Π(1 − s_i·min(1, w_i/bin))`;
  - top = `max a_top`, bottom = `min a_far`;
  - the bin's mean range, for haze.
- Satellite sightings (`seenBanks`) become extra low cells in world coordinates at `now`.

## 4. Light

### 4.1 `transmitAlong(field, origin, az, alt, t)`

The ray march:
- For each lattice, find where the ray enters and leaves the slab `[base, base + V_max]`, curvature included:
  `d(z) = R_eff·(−tan a + √(tan²a + 2z/R_eff))`.
- Take `K = clamp(ceil(V·cot(a)/(P/2)), 1, 12)` samples through the slab.
- At each sample, look up the 3×3 sites (5×5 when g > 1.5). Add `κ·Δs` for each cell the sample is inside, plus the
  floor's share.
- `T = exp(−Σ τ_slant / 2)`.
  - The ½ is diffraction: half of a large particle's extinction is scattered into a cone narrow enough to stay in the
    beam.
  - The painter veils the disc where T < 0.3.

The disc:
- Average 5 rays: the centre, and 4 at 0.19° from it.
- Unresolved Ac and Ci elements: a patch transmits its area mean, `gap + (1 − gap)·e^(−τ/2)`, with gap = 0.35 (Ac) and
  0.5 (Ci).

### 4.2 Which share goes where

**`light.eye`** = `clear × T(eye → disc)`, for the sun and the moon alike. It drives:
- the disc veil, aureole and glows;
- the rays and `rimX`;
- the halo and sun dogs;
- the cloud-edge backlight;
- `shadow.softness`.

**`light.direct`** = `clear × T_open`:
- `T_open = Π_L T̄_L^k_L`, where `T̄_L = 1 − c_L·(1 − e^(−τ̄_L/2))` and `k_L = smoothstep(0.75, 0.97, c_L)`.
- Only closed decks dim the land's base light.
- `T̄` is the new `cloudTransmit`.
- `diffuse = 1 − Π T̄_L`.

Broken-cloud shade on the land comes only from the shadow layer (§4.3).

### 4.3 Ground shadows

The shadow of a cell on ground at height `z_g`:
- the footprint moved by `(z − z_g)·cot(alt_s)` along the anti-sun azimuth, for z from the base to the top;
- so the cell's disc is swept from the base offset to the top offset.

How the model draws them:
- Enumerate the low, tower and mid cells whose shadow centre lies within the visible land's range (≤ 60 km) and inside
  the view.
- Project each forward:
  - centre azimuth → x;
  - 8 rim points → `seenAt(x, km)` → a screen polygon;
  - hidden points are dropped.
- Alpha = `0.65·(1 − T_cell/T_open)·light.direct`.
- Cap 64 blobs.
- Lay them `source-atop`.

## 5. Rain

**Raining layer.** As `rainingLayer` now. A raised cover is raised through the field.

**Rain area share `f_r`:**
- stratiform (codes 51–65, 71–75): 0.9;
- showers: `clamp(rate / R_cell, 0.08, 0.6)`, with `R_cell = 4 + 2·rate` mm/h.

**Which cells rain:**
- Rank the raining lattice's on-cells by `τ0·R²`, towers first.
- `r_i` is a smoothstep over cumulative area around `f_r`.

**Shaft:**
- It falls from the base, with a footprint of 0.6·R.
- It trails on a parabola: `Δx(z) = −(u_c − u_s)·(h − z)²/(2·h·v_t)`.
- Fall speed `v_t`: drizzle 1.5 m/s, light rain 4, moderate 6, heavy 8, snow 1.

**Virga:** the shaft fades out at a fraction `f_v` of the way down. `f_v < 1` when the base is above 2.5 km, or when the
rate is below 0.2 mm/h with RH below 45 %.

**Near rain** (over the land) falls only when the eye's ground point is inside a shaft footprint.

**`Rain.cells`** keeps `fromAzimuth`, `toAzimuth` and `bank`, and gains `x`, `y`, `radiusKm`, `share` and `virga`.

## 6. Painted form per type (Claude)

### 6.0 Layers before shapes (owner note, 2026-11-22)

What a person sees outside is mostly not a set of shapes. It is "the sky is cloudy": a layer, or several layers, over
all or part of the sky. Reference set: 12 Wikimedia Commons photos — Elko NV stratiform and cirrostratus decks, Sterling
VA As/Cs, Nevada low decks, London Cu, Nuthurst and Gagra Ac fields, Tel Aviv and Israel winter Sc. What they show:

1. **Overcast is a ceiling.** It is continuous, with large soft brightness variations near the zenith. Toward the
   horizon it compresses into thin horizontal bands, and there is often a bright strip at the horizon where the deck
   thins or ends. The sun is a glow through its thin places.
2. **A layer can cover part of the sky.** It has an edge, and clear sky shows under or beyond it, often as a bright band
   on the horizon under a dark deck.
3. **A broken Sc sky is one textured field.** Clumps merge into each other with lit gaps between them. It is not
   separate clouds.
4. **Ac and Cc are textures** of very many small elements, in fields or patches, with lanes through them.
5. **Separate shapes are the exception**: fair-weather Cu, towers, and the heaps on the horizon.

Hence two render modes per layer, both drawn from the same field:
- **`sheet` (the default for strat, sheet and veil, and for any layer above ~45 % cover).** The layer is drawn as a
  continuous density texture over the dome.
  - The density is sampled in world space: per screen sample, a ray goes to the layer's altitude and gives
    `densityAt(layer, x, y, t)`.
  - The density is the cells' kernels plus a genus-shaped multi-scale noise (St smooth, Sc cellular lumps, As
    striated along the wind, Ac and Cc fine cells, Cs a near-uniform veil).
  - The density is thresholded with a soft edge, so the drawn coverage equals the cover by construction.
  - Perspective compression toward the horizon, the deck's edges and its gaps then come out of the geometry.
  - The painter turns density into marks: tone from τ, lit gaps, and the bright horizon strip where the line of sight
    leaves the layer.
- **`cells` (conv genus, and the heaps on the horizon).** The sprites of §6.1 on.

**Several layers at once** (Cs over As over Sc fragments) are drawn high to low, each in its own mode. A lower layer
hides the ones above it where it is dense.

The light (§4) and the shadows (§4.3) already read the same density, so what you see, the shade on the ground and the
dimming all agree.

### 6.1 Sprites (`cells` mode)

Common rules:
- One sprite per cell.
- The underside lies between `y(a_far)` and `y(a_near)`; the side and top above it.
- Base tone: `body·(0.45 + 0.55·e^(−τ0/12))`.
- Thin rims are translucent: the brightest part toward the sun, grey-blue away from it.
- Haze by range.
- No outline. No `ctx.filter`. Seeded only.

Per type, with references:

| Genus | Form | References |
|---|---|---|
| Cu | Hard flat bases on one perspective line. A cauliflower top of 3–7 turrets, the tallest off-centre and leaning downwind. Self-shadow in the clefts. Torn edges on the lee side only. | Constable, *Study of Cumulus Clouds* (1822); Ruisdael, *View of Haarlem with Bleaching Grounds*; WMO Cloud Atlas cumulus pages |
| Cu congestus, Cb | A tower 1.2–1.5× taller than wide, with a hard bright crown. A fibrous anvil downwind. A very dark base with scud and a shaft. | Dobrowner; Seaman; WMO Cb capillatus |
| Sc | Rounded pads or rolls with dark centres and luminous joints, and irregular lanes between them. Bars near the horizon. | J. C. Dahl's Dresden studies; Boudin's pastels |
| St, Ns | Undulation from the summed τ (~15 % contrast, 5–15 km wavelength), lighter toward the sun. Ns darker, with pannus when it rains. | Constable, *Rainstorm over the Sea*; Ansel Adams, *Clearing Winter Storm* |
| Ac | A patch of small "sheep" in a quincunx, element pitch 1.4–5° at the zenith. A shaded underside and lit edges. The patch edge frays. | Stieglitz, *Equivalents*; WMO Ac perlucidus |
| As | A fibrous grey-blue sheet. The sun as through ground glass, gone above τ 8. | — |
| Ci | Fibres: a hooked head and a trailing tail, 6–14 strands, silky with no shade side. Strands converge toward the horizon points along their axis. | Luke Howard's sketches; WMO Ci uncinus |
| Cs | A milky veil, the blue desaturated, the disc sharp. | — |
| Far strips | A continuous bank with a lumpy top and a level base line, hazed by range. | — |

## 7. Motion between rebuilds

**Clock (agreed with track C, 2026-11-22):** cloud motion uses track C's `LifeClock { laidAt, sinceS }` (branch
`claude/fix-life-motion-740e49`, see `track-c-notes.md` for the final names). There is no second clock. The seconds
since the shown minute are `phase − laidAt + sinceS`. Keyframes and the `cells`/sheet drift read that offset (an open
`Track`, or `drift = speed × (phase − laidAt + sinceS)`), never a per-layer lay phase in `surface.ts`. N3 waits for
track C to land.

Names (track C, d673f4a on `claude/fix-life-motion-740e49`):
- the type `LifeClock { laidAt, sinceS }` (`src/scene/model/types.ts`);
- `LIFE_START` (`src/scene/model/lifeTracks.ts`);
- the hook `useLifeClock(at, selected, timezone)` (`src/scene/react/useLifeClock.ts`).

The model call is `sceneModel(world, box, clock, life = LIFE_START)`, which calls `skyLayers(world, box, life)`. `Track`
gains `open?` and per-point `scale?`, `alpha?` and `turn?`. `trackAt` returns `{x, y, scale, alpha, turn}`.

Clouds use `at = sinceS − laidAt`. Merge main once C lands there, not C's branch.

The true rates:
- tangential `ω = v·sin(alt)/h`;
- radial altitude rate `v·sin²(alt)/h`.

Examples: low cloud (1.2 km, 8 m/s) moves 0.38°/s at the zenith and 0.033°/s at 5°.

The design:
- The model emits each placement at 3 keyframes, phase 0, 30 and 60 s, from `t`, `t + 0.5` and `t + 1` minute.
- The compositor lerps `(x, y, w, h)` from the phase at which the model was laid, and extrapolates if a rebuild is late.
- A new `animated.mode: 'cells'`: a sprite cache plus placements.

## 8. Tests

1. **Cover calibration.** For c ∈ {0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98, 1}, take 4,000 plan points over 60×60 km at 3
   times. Expect `|covered − c| ≤ 0.04`, and exactly 1 at c = 1.
2. **Shadow under the cloud.** For seeded cells and sun altitudes {5, 20, 45, 70}°, the ground point `centre − (z_mid −
   z_g)·cot(alt)·ŝ` has low T, and the emitted blob is within 50 m of it. A point 3R to the side has T = 1.
3. **Direct behind a drawn cell.**
   - A sun at an emitted cell's `(az, alt_mid)` gives `eye/clear ≤ 0.1` when τ0 ≥ 10.
   - An uncovered direction gives ≥ 0.95.
   - Drawn-covered and T < 0.5 agree at ≥ 97 % of sample directions above 6°.
4. **Continuity.** Minute by minute over 48 h, through midnight:
   - a cell's move is ≤ `v_max·60 s` and matches `∫v dt` within 1 m;
   - `|Δshare| ≤ 0.15` per minute;
   - no new id appears with share > 0.15.
5. **Difference.** Comparing t with t + 3 h, and with the same hour on the next day: fewer than 20 % of cells are within
   1° of their old direction.
7. **Projection.**
   - `a_far < a_near ≤ 90`.
   - The base line is monotonic in range.
   - The 60 s keyframe equals the next build's phase 0 within 0.1 px.
8. **Rain.**
   - Every shaft lies under a cell with `r_i > 0`.
   - No rain at the eye outside every footprint.
   - The raining area share ≈ `f_r` within 0.1.
9. **Purity.** No `Date.now`, `performance.now` or `ctx.filter` in `scene/paint`.
10. **Perf.**
    - Field: cold ≤ 4 ms, warm ≤ 2 ms.
    - Shadows ≤ 1 ms.
    - The whole model inside 10 ms.
