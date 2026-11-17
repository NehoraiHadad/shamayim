# Brief: a live atmosphere you can feel (v4)

## Goal
The user should *feel* the weather, not read it. Strong wind, rain (drizzle vs downpour), snow,
blazing sun, extreme heat, dust and cloud must be visible and proportional to the real numbers.
Today it is not: wind is invisible, rain is an on/off CSS texture, there is no snow, heat is only a
gradient colour, dust is a flat overlay, clouds are three blurred ellipses (`src/ui/Sky.tsx`).

Decision already made: **2.5D**, not full 3D. Layered depth + one GPU fragment shader for the air
(sky, volumetric-looking clouds, heat shimmer, god rays, haze) + a particle pass (rain, snow, dust,
wind streaks). Architecture must allow swapping the ridge for real 3D terrain later without touching
the air layer.

## The app (read these)
- `docs/design/SPEC.md` — current design spec (valley cross-section is the signature element).
- `src/App.tsx`, `src/ui/Sky.tsx`, `src/ui/scene/ValleyScene.tsx` (+ `sunPath.ts`, `sceneModel.ts`, `Sun.tsx`).
- `src/theme/skyThemes.ts` (8 themes, contrast rules), `src/ui/tokens.css`, `src/ui/motion/`.
- `src/domain/types.ts` (data available), `src/data/openMeteo/request.ts` (what we fetch).
Place: Shadmot Mehola, Jordan Valley, −175 m. Hot summers (40 °C+), sharevs (sharav/dust), winter
rain storms, snow almost never in the valley (possible on the ridges). Phone-first Hebrew RTL PWA.

## Data
Have now: current temperature, feelsLike, isDay, weatherCode, cloudCover, windSpeed, windGusts;
hourly precipitation (mm), precipProb, cloudCover, wind; air pm10/dust/uv; sun position model.
Can add cheaply from Open-Meteo: `wind_direction_10m`, current `precipitation`, `rain`, `showers`,
`snowfall`, `visibility`, `relative_humidity_2m`. Say which you need.

## Hard constraints
- Mid-range Android phone at 60 fps target, degrade to 30; DPR capped; pauses when tab hidden.
- No heavy dependency (no three.js for this). Raw WebGL (1 or 2) is fine; Canvas2D fallback when
  WebGL is missing; CSS-only fallback for reduced motion (a still frame that still *shows* the state).
- Text over the sky must keep ≥4.5:1 contrast (contrast test exists) — the effect lives around and
  behind the text, never makes it unreadable.
- Restraint: one signature, everything else quiet. Must not look like a screensaver or a game.
  Calm days should be calm. Intensity must map to reality (10 km/h ≠ 50 km/h).
- Files < 150 lines, DRY, tests for the pure mapping.

## What I need back (write it to the file named in your task)
1. **Mapping table**: for each variable (wind speed+gust+direction, rain rate, snow, temperature
   high/low, cloud cover, dust/visibility, sun elevation, time of day) → thresholds → what moves,
   how fast, how dense, at what angle, in which layer. Concrete numbers.
2. **Technique per effect** (shader vs particles vs CSS), layer order, and a perf budget.
3. **Interaction with existing pieces**: ValleyScene (ridges, sun disc), hourly selection (should the
   air preview the selected hour?), intro sequence, theme cross-fades.
4. **Signature moment**: the single most memorable effect, and how to keep the rest quiet.
5. **Hand-painted assets**: what (if anything) should be painted as still plates (ridge silhouettes,
   textures) by an illustration tool vs drawn procedurally.
6. **Accessibility & fallbacks**: reduced motion, no WebGL, low battery / save-data.
7. **Risks** and what you would cut first.
Be specific and opinionated. No code beyond short snippets.
