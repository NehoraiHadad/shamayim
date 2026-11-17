# Calm life (v5-B): what lives in a quiet sky

Extends `ATMOSPHERE.md` (which still wins). Principle 5 becomes: **a calm day is a still picture that something occasionally crosses.** Everything
comes from date, hour, sun, wind, humidity, cloud or temperature. Sizes are CSS px at 375 px width; scale by `w/375`.

## 1. What made the cut
| Element | Kind | In? | Why |
|---|---|---|---|
| Migrant skein (cranes / storks) | event | yes | The flyway is the valley's signature; date + sun decide it |
| Swifts | event | yes | Fast and low, a contrast to skeins. Dates corrected: in Israel Mar–Jun, gone by July |
| Thermal raptor | event | yes | Makes heat visible without more shimmer; temperature + sun height |
| Meteor | event | yes | Only on real shower peak nights (date), so it is information, not sparkle |
| Morning mist | state (still) | yes | Humidity + wind + sunrise; costs zero frames |
| Star twinkle | ambient | yes, 30 s bursts | Amplitude from wind (scintillation); stops itself |
| Lone drifting cloud | — | **cut** | <10% cover means "no cloud", ≥10% already draws drifting cloud; it would be decoration that keeps the GL loop awake all day |

**One event on screen at a time.** Mist and twinkle are not events and may coexist with one.

## 2. Rendering and battery (decided: DOM, not WebGL)
Events are ≤11 tiny SVG elements in one `<div data-life>` placed directly after the air canvas inside `Sky` (below ridges and text, so birds pass
*behind* the ridges). Motion is Web Animations API on `transform`/`opacity` only (compositor): **no rAF, the GL loop stays asleep**, a 14 px bird
stays crisp (a shader-drawn wing on a DPR-1.5 quad is mush), and it works without WebGL.
- **Wake/sleep:** one `setTimeout` chain. Fire → mount → animate → on `finish` unmount → schedule next. Between events the page is idle.
  `document.hidden` → cancel event and timer; on visible re-arm with the first delay. State turns ineligible mid-event → fade out 300 ms, unmount.
- **First event 5–9 s after load/visible** (sessions are short; a 60 s wait means nobody sees it), then the per-kind gap. Never during the intro,
  never in hour preview (same rule as lightning).
- **Reduced motion or Save-Data:** no events, no twinkle. Mist is drawn (it is static).
- **Text band:** `[data-air-band]` is the whole sky area and ends at the scene top, so flight lanes sit at the scene top (see Lanes) and the meteor uses the upper sky.

## 3. Eligibility (pure)
`quiet` = rain, snow, grains, streaks counts all 0 · no thunder · `gustExcess = 0` · `haze.farFade ≤ 0.6` · at most one of {heat band, rays} active ·
`!preview`. Clouds do not block (not a "system"). Dates are local `MM-DD`, inclusive. `autumn = month ≥ 7`.
| Event | Date | Other conditions (all with `quiet`) |
|---|---|---|
| storks | 08-15…09-30, 03-10…04-30 | sunElev ≥ 25, temp ≥ 18, cloud < 70 (they need thermals) |
| cranes | 10-10…11-30, 02-15…03-20 | sunElev ≥ 8, cloud < 85 |
| swifts | 03-01…06-30 | sunElev 2…22, temp ≥ 16, wind < 15 (morning or evening) |
| raptor | any | sunElev ≥ 40, temp ≥ 28, cloud < 50 (winter noon is 34°, so none in winter) |
| meteor | 01-03…04, 04-21…23, 05-05…07, 08-11…13, 10-20…22, 11-17…18, 12-13…14 | sunElev ≤ −12, cloud < 20 |

If several kinds are eligible, event `n` takes `eligible[n % eligible.length]` in table order.

## 4. Event specs
Lanes: **high** `y = sceneTop − 30 … −8`; **low** `y = sceneTop − 8 … +16` (the air band spans the whole sky area, so lanes hang off the scene top at full alpha). Direction `dir = sign(u)` when `wind ≥ 5` and `|u| ≥ 0.35` (birds ride
the wind), else from seed. Travel from `−40` to `w + 40` px (reversed for `dir = −1`); flip glyphs with `scaleX(dir)`. Migration runs along the depth
axis (the view looks north), so skeins also scale: autumn (southbound, toward us) `0.8 → 1.15` and `y −18 px` over the pass; spring `1.15 → 0.8`, `y
+18 px`.
| | cranes | storks | swifts | raptor | meteor |
|---|---|---|---|---|---|
| Count | 7–11 | 6–10 | 5–8 | 1 | 1 |
| Wingspan | 12 | 11 | 7 | 14 | streak 46 × 1.5 |
| Speed px/s | 22 | 16 | 90–130 | 3 drift | 120 px in 450 ms |
| Duration | ~21 s | ~28 s | ~7 s total | 27 s (3 circles) | 0.45 s |
| Lane | high | high | low | high | free sky strip |
| Gap to next event | 60–110 s | 60–110 s | 35–60 s | 90–150 s | 50–110 s |
| Easing | linear | linear | ease-in-out per bird | linear | ease-out |
- **Raptor:** ellipse 26 × 9 px, 9 s per turn, centre at 25–75% w drifting 3 px/s downwind and rising 0.5 px/s. Fades in/out over 1.5 s. Banking =
  `scaleX` 1 → 0.45 → 1 and `rotate` ±12° per turn.
- **Swifts:** each bird its own cubic path in the low lane (control points ±22 px in y), starts staggered 0–2.5 s, 60% go `dir`, 40% the other way.
- **Meteor:** gradient `#FFFFFF` α .7 (head) → 0, 28–40° below horizontal, x start 15–85% w, fades over the last 150 ms. Strip = the taller of
  (safe-area top … bandTop) and (bandBottom … sceneTop); if neither is ≥ 40 px, draw in the upper 45% of the band at α .6.

## 5. Drawing a bird at 6–14 px
One inline SVG per bird, `viewBox="0 0 16 8"`, `overflow: visible`, no fill, round caps, stroke 1.2 (swift 1.0). Two wing paths meeting at the
shoulder (8, 5), each a slightly bowed stroke to the tip: left `M8 5 Q5 2.6 1 4`, right mirrored. Each wing has `transform-box: fill-box` with its
origin at the shoulder, so a wingbeat is a `rotate` on two elements.
- **Crane:** plus a body line along travel, 3 px ahead (neck) and 2.5 px behind (legs), stroke 1; that line is what makes it a crane and not a gull.
  Beat: wings −28° (up) ↔ +18° (down), 620 ms period, ease-in-out alternate, random phase per bird.
- **Stork:** body line 2 px each way. Glides with wings at −8°; a burst of 3 beats (700 ms period) every 6–10 s, bursts not synchronised.
- **Raptor:** no body line, wings fixed at −10° (shallow V), outer third of each wing 1.6 wide ("fingers"). Never flaps.
- **Swift:** wings swept back, `M8 5 Q5 3 2 6.5` (sickle). Flicker `scaleY` 1 ↔ 0.5 at 6 Hz for 0.4 s, glide 0.6 s, repeat.

**Flock shape** (offsets inside the flock div, which is the element that travels):
- **V (cranes):** leader at the apex, two arms trailing at 32° from the travel axis, 13 px between birds, arms unequal (`ceil((n−1)·0.6)` and the
  rest), jitter ±2 px; followers wobble ±1.5 px over 3–5 s.
- **Loose (storks):** positions in a 70 × 26 px ellipse, ≥10 px apart, each drifting ±4 px over 4–7 s.
- **Scatter (swifts):** no flock div; independent paths as above.

**Ink:** day `rgba(38,48,66,.62)`; `sunElev < 10` `rgba(52,36,40,.66)`; alpha × `(1 − 0.6·farFade)`.

## 6. Mist (state) and twinkle (ambient)
**Mist** `amount = clamp((RH−85)/10) · clamp((10−wind)/5) · clamp((14−sunElev)/8)`; 0 unless `localHour < 12`, `sunElev ≥ −6`, no precipitation,
`haze.nearFade < 0.3` (fog already drawn) and RH known. Shown when `amount ≥ 0.15`. It must lie *between* the ridges, so it is not GL: a `<div>` in
the scene between far and near ridge, scene y 56–82% (72–105 of 128), full width. Background: vertical gradient transparent → colour, plus two radial
lobes (120 × 18 px at 30% and 180 × 22 px at 72% of the width) so the top edge is uneven. Opacity `0.55·amount` through CSS var `--mist`, set where
`--far-fade` is set; glides 1600 ms. Colour `#C9D2D8`; `sunElev < 6` `#E6D3C4`; `sunElev < 0` `#8E97B8`. Mist follows hour preview (needs hourly
humidity) and never changes `AirState.calm`.

**Twinkle** when `sunElev ≤ −6` and star factor `(1 − .9·cover) ≥ 0.4`: six stars (the six lowest existing ones; if stars are one background layer,
add six 2 px dots). Opacity `1 → 1−a → 1`, `a = 0.25 + 0.30·clamp(wind/20)`, period `5.2 − 2.4·clamp(wind/20)` s, each star ×(0.8…1.25) with its own
phase. Runs 30 s after load/visible, then stops (finite iteration count).

## 7. Data and code shape
New `AirInput` fields: `humidity: number | null` (Open-Meteo `relative_humidity_2m`; add to `CURRENT` and `HOURLY` in `src/data/openMeteo/request.ts`,
map through `mapCurrent` and `HourPoint`); `date: string` (`YYYY-MM-DD`) and `localHour: number` (decimal), both from the `at` already in
`airInput.ts` (`sunElevation` is symmetric, so "morning" needs the hour). New pure module `src/atmo/life/`; `mapAir` and `AirState` stay untouched:
- `mapLife(input, air) → { mist; twinkle: { amp, period } | null; eligible: EventKind[]; dir: 1 | −1; autumn }`
- `planEvent(life, seed, n) → { kind, delayMs, count, laneY, dir, durationMs } | null`, with `seed = hash(date + floor(localHour))` and a seeded PRNG,
  so a given hour always plans the same.
- `flockOffsets(kind, count, seed) → { x, y }[]` Impure: `useLifeEvents` (timer chain, visibility, reduced motion) and `Life.tsx` (SVG + WAAPI).

## 8. Tests for the pure part
Base: calm clear day, wind 6 from 270°, RH 40, temp 22, `sunElev` 45, 12:00.
1. `10-25` → `eligible = ['cranes']`; `planEvent(n=0).delayMs` in 5000–9000, `n=1` in 60000–110000.
2. `09-05`, temp 30 → `['storks', 'raptor']`; n=0 storks, n=1 raptor, n=2 storks.
3. `03-15`, `sunElev` 30 → `['storks', 'cranes']`; `sunElev` 12 → `['cranes', 'swifts']`.
4. `05-10`, `sunElev` 10, 18:30 → `['swifts']`; same with wind 16 → `[]`.
5. `07-20`, temp 38 (heat band on, nothing else) → `['raptor']`; with rays also active → `[]`.
6. `01-15` noon → `[]`. `10-25` with rain 1 mm/h, dust grains, wind 30 or `preview: true` → `[]`.
7. `11-17`, `sunElev` −18, cloud 5 → `['meteor']`; cloud 30 → `[]`; `11-19` → `[]`. Night never gives birds.
8. Wind 10 from 270° → `dir = +1`; from 90° → `−1`; from 0° (|u| < 0.35) → from seed, stable per seed.
9. Mist: RH 95, wind 3, `sunElev` 7, 06:30 → `0.875`; wind 10 → 0; `sunElev` 14 → 0; 17:30 → 0; RH null → 0; RH 86 → 0.1 (not shown).
10. Twinkle: `sunElev` −18, cover 0, wind 0 → amp 0.25, period 5.2; wind 20 → 0.55, 2.8; cover 80 → null.
11. `flockOffsets('cranes', 9)` → leader + arms of 5 and 3 at 32° ± jitter; storks stay ≥10 px apart.
12. Same seed and `n` → identical plan; `count` always inside the table's range.

