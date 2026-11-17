# Shamayim — tasks

Status legend: [x] done · [~] in progress · [ ] todo. Keep this file current so a new chat can resume.
Plan: `docs/PLAN.md`. Brief: `docs/PLANNING_BRIEF.md`. Codex briefs: `docs/briefs/`.

## v1 — one screen (current temp, Hebrew sentence, 7 days) — DONE 2026-11-17
- [x] Planning with Codex (Sol) + Fable, merged into docs/PLAN.md
- [x] Scaffold, tooling (PWA, vitest, oxlint, typecheck), GitHub CI, public repo
- [x] Data layer: Open-Meteo, guards, provider, SWR cache, useForecast
- [x] Hebrew sentence engine + tests; 8 sky themes + contrast tests
- [x] UI: Sky, Ridge, SunArc, Hero, Sentence, week list, states, attribution

## v2 — polish + accuracy — 2026-11-17
- [x] Accuracy: ICON + ECMWF IFS 0.25 in one request, weighted blend (Codex, `docs/briefs/codex-multimodel*.md`)
  - [x] ICON 0.6 for days 0–4, ECMWF 0.6 after; wet weather code wins at ≥40% probability
  - [x] Per-day `confidence` (high/medium/low) + model `spread`; cache key bumped to v2
  - [x] Round 2 review fixes: readable mapper split, `lowConfidence` = trend horizon only, shared `Confidence` type
- [x] Hourly strip, next 24 h, in the sky area (`src/ui/hourly/`)
  - [x] temperature curve (Catmull-Rom), rain %, sunrise/sunset markers, scroll-snap, edge fade
  - [x] screen-reader text per slot
- [x] Week rows expand on tap (`src/ui/week/DayDetail.tsx`)
  - [x] 2-hourly strip for that day, tiles: rain, gusts, sunrise, sunset, UV, air quality
  - [x] model-agreement meter ("המודלים מסכימים / חלוקים"); "לא ודאי" tag on low-confidence near days
- [x] What-to-wear card (`src/text/wear.ts` + tests): levels by felt temp, wind penalty, umbrella, heat/UV
- [x] Sheet wrapper component; PNG icons 192/512/maskable + apple-touch-icon
- [x] Dev QA overrides: `?at=YYYY-MM-DDTHH:MM`, `?theme=rain|dust|heat|dawn|dusk|night|cloudy|clearDay`
- [x] Verified on 375px (night, morning, dusk, rain theme); typecheck, lint, 58 tests, build

## v3 — full UI/UX polish — 2026-11-17
Spec: `docs/design/SPEC.md` (merged from `review-codex.md` + `review-fable.md`).
- [x] Theme colours: per-theme paper tint, `sheetAccent`, `dark-sheet` for dusk+night, contrast test (40 checks)
- [x] Motion tokens (`src/ui/tokens.css`) + one intro sequence (`src/ui/motion/`, `data-intro`, reduced-motion off)
- [x] Sun arc + ridge replaced by `src/ui/scene/ValleyScene` (128 px): Samaria/Gilead cross-section,
      sea-level line above the village (−175 m), real sun position behind the ridges, cloud veil, twilight glow
- [x] Hero: one meta line (feels-like or gusts), no max/min; count-up only on change
- [x] TopBar: place + region; status pill with spin ≥600 ms then check, freshness copy (`src/text/status.ts`)
- [x] Hourly strip: tappable hours (arrow keys), selection readout in the scene, midnight day names at the foot,
      sun markers (dot on sky, time on sheet) — markers CSS in `hourly/markers.module.css`
- [x] Sky: all layers mounted and cross-faded; stars dimmed behind text; pre-paint boot colour (no flash)
- [x] Sheet lane (Codex): WeekList, DayRow grid + lazy disclosure, RangeBar spread ends, DayDetail facts, UV feminine
- [x] Verified 375 px: noon, night, dusk, clearDay, rain, expanded day; typecheck, lint, 78 tests, build

## v4 — live atmosphere — 2026-11-17
Spec: `docs/design/ATMOSPHERE.md` (merged from `atmo-codex.md` + `atmo-fable.md`). Code: `src/atmo/`.
- [x] Current adds wind direction, precipitation, snowfall, visibility (cache v3)
- [x] `mapAir(input) → AirState`: pure, 13 tests; max two moving systems; one carrier per variable; calm = still
- [x] `airInput`: live values or the selected hour's (direction/visibility held from now)
- [x] WebGL1 renderer: ⅓-res air pass (clouds, haze, rays, bloom, heat lines, thunder flash) + stateless particles
      (rain, snow, dust grains, wind streaks) in one static buffer; `AirMotion` eases, gusts, breathes
- [x] Loop: pauses when hidden, calm days draw one frame and stop, governor steps DPR/octaves down, intro ramp
- [x] Scene: far/near ridge fade from visibility, heavy-haze label ink, sun veil + sharav coin, SVG heat shimmer
- [x] CSS fallback (`CssAir`) when WebGL is unavailable; reduced motion / Save-Data → one still frame
- [x] Dev override `?wx=rain:12,wind:45,gust:65,dir:270,cloud:95,code:63,temp:,pm10:,vis:,snow:`
- [x] Fixed: StrictMode remount killed the GL context (dispose no longer calls loseContext)
- [x] Tuned by eye: rain slant cap 50°, wind streak alpha .24→.40, snowflakes 5–10 px
- [x] Verified (Chrome, live loop): storm rain, sharav, dry easterly wind, snow, 44 °C heat, night rain,
      hour preview, calm day stops drawing
- [ ] Not verified: reduced-motion still and CSS fallback on a device; frame times on a real phone
- [ ] Deferred: anidoodle-painted ridge plates (same 375×128 contract) — out of v4 scope

## Known gaps / polish
- [ ] Hero meta column hugs the left edge on wide phones; village dot tight against sheet edge
- [ ] Rain/dust/heat seen via `?wx=` overrides, not yet in real weather
- [ ] Screen-reader pass on a real device (VoiceOver/TalkBack)
- [ ] Lighthouse PWA/perf pass on a deployed build

## Next (proposed)
- IMS (Israel Meteorological Service) warnings
- Radar (RainViewer tiles), place search / GPS, Capacitor wrap
- Verify blend weights against observed station data (IMS station near Shadmot Mehola / Tirat Zvi)
