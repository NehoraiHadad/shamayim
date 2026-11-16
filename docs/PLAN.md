# Shamayim v1 — merged plan

Planned on 2026-11-16 by two independent planners (Codex GPT-5.6 Sol and Claude Fable), merged by the orchestrator. Fable's concrete design is the base; Codex's safeguards are folded in.

## Decisions
- **Model:** `models=icon_seamless` (ICON-EU ~5 days, ICON Global after). `icon_eu` alone cannot fill 7 days. Days 6–7 are tagged "מגמה" and shown at lower emphasis.
- **Elevation:** do not pass `elevation`; Open-Meteo's DEM already resolves the point to −175 m (verified live). The mapper asserts elevation is in [−250, −100].
- **Air:** separate call to the air-quality API (PM10, dust, UV), 2 days. Its failure never breaks the screen.
- **Time:** API times are Jerusalem wall-clock strings. Never `new Date()` them; compare strings. "Today" comes from `current.time`. Group hourly rows by date prefix (DST-safe).
- **Tonight's low:** from hourly rows between today's sunset and tomorrow's sunrise.
- **Cache:** localStorage, normalized snapshot. <15 min fresh; up to 12 h shown + revalidated; older shows a stale badge. No SW runtime cache for the API (single source of freshness).
- **Validation:** hand-written guards (no Zod) — reject unit mismatches and array-length mismatches.
- **Text:** facts → ranked → whole Hebrew phrases (no glued adjectives). Valley-tuned temperature words. Thresholds live in one config file.
- **Design ("the valley's sky"):** live gradient sky by condition + sun phase, SVG Gilead ridge silhouette, sun arc with sunrise/sunset, giant temperature, editorial sentence, paper "week sheet" overlapping the ridge, one shared weekly range bar scale. No generated imagery in v1 (both planners agreed); SVG app icon.
- **Fonts:** Karantina (hero digits), Frank Ruhl Libre (sentence, day names), Assistant (UI). Self-hosted via `@fontsource`.
- **Motion:** CSS only, all disabled under `prefers-reduced-motion`.
- **Attribution:** "נתונים: Open-Meteo · DWD ICON · CAMS" (license requirement).

## Architecture
```
src/
  config/      place.ts, thresholds.ts
  domain/      types.ts, conditions.ts, time.ts
  data/        WeatherProvider.ts, openMeteo/{request,mapForecast,mapAir,provider}.ts, cache.ts, useForecast.ts
  text/        facts.ts, phrases.ts, compose.ts, format.ts
  theme/       skyThemes.ts, pickTheme.ts
  ui/          Sky, Ridge, SunArc, Hero, Sentence, WeekList, DayRow, RangeBar, WeatherIcon, StatusLine, Attribution
```
UI imports only `domain`, `text`, `theme`. Only `data/openMeteo` knows Open-Meteo field names. Future sources = new providers + a blending provider behind `WeatherProvider`.

## v1 non-goals
Place search/GPS, hourly chart, radar, multi-model blending (first accuracy upgrade: add `ecmwf_ifs025`), IMS, what-to-wear, notifications, settings, Capacitor wrap.

## Risks
Open-Meteo free tier is non-commercial (store release needs a key/proxy). ICON dry bias for convective showers. CAMS dust grid is coarse. iOS evicts localStorage.
