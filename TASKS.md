# Shamayim — tasks

Status legend: [x] done · [~] in progress · [ ] todo. Keep this file current so a new chat can resume.
Plan: `docs/PLAN.md`. Brief: `docs/PLANNING_BRIEF.md`.

## v1 — one screen (current temp, Hebrew sentence, 7 days) — DONE 2026-11-17
- [x] Planning with Codex (Sol) + Fable, merged into docs/PLAN.md
- [x] Scaffold Vite + React + TS, git init
- [x] Tooling
  - [x] vite-plugin-pwa manifest + shell precache (SVG icons in public/)
  - [x] vitest (`npm test`), oxlint (`npm run lint`), `npm run typecheck`
  - [x] GitHub Actions CI (.github/workflows/ci.yml)
  - [x] Public GitHub repo + push
- [x] Data layer
  - [x] domain types, WMO conditions, local-time helpers (no `new Date()` on API strings)
  - [x] Open-Meteo request builders (icon_seamless, past_days=1), mappers with guards
  - [x] provider (forecast + optional air), localStorage SWR cache, useForecast (refetch on date rollover)
- [x] Hebrew text: facts → phrases → compose; 8 sentence tests
- [x] UI: Sky (gradient + stars/clouds/rain/dust), Ridge, SunArc, Hero, Sentence, WeekList/DayRow/RangeBar, icons, StatusLine, States, Attribution
- [x] Theme contrast tests (32) for all 8 themes
- [x] Verified on 375px mobile viewport, night and day (`?at=` dev override)
- [x] README

## Known gaps / polish
- [ ] Visual QA of rain, dust, heat, dawn/dusk themes against real conditions (only night + cloudy day seen live)
- [ ] PNG icons (192/512) for older Android/iOS install prompts (currently SVG only)
- [ ] Screen-reader pass (VoiceOver/TalkBack)
- [ ] Lighthouse PWA/perf pass on a deployed build

## Next (proposed)
- Hourly strip for the next 24h (tap a day to expand)
- Multi-model accuracy: add `ecmwf_ifs025` + blending provider; show agreement as confidence
- IMS (Israel Meteorological Service) data/warnings
- What-to-wear tips, radar, richer animation
- Place search / GPS, Capacitor wrap
