# Shamayim — tasks

Status legend: [x] done · [~] in progress · [ ] todo. Keep this file current so a new chat can resume.
Plan: `docs/PLAN.md`. Brief: `docs/PLANNING_BRIEF.md`.

## v1 — one screen (current temp, Hebrew sentence, 7 days)
- [x] Planning with Codex (Sol) + Fable, merged into docs/PLAN.md
- [x] Scaffold Vite + React + TS, git init
- [ ] Tooling
  - [ ] vite-plugin-pwa manifest + shell precache
  - [ ] vitest config + test script
  - [ ] GitHub Actions CI (typecheck, lint, test, build)
  - [ ] Public GitHub repo + push
- [ ] Data layer
  - [ ] domain types, WMO conditions, time helpers
  - [ ] Open-Meteo request builders, mappers with guards
  - [ ] provider (forecast + optional air), localStorage cache, useForecast hook
- [ ] Hebrew text
  - [ ] facts (thresholds), phrases, compose, format helpers
  - [ ] unit tests with example sentences
- [ ] UI
  - [ ] Sky themes + picker, Sky, Ridge, SunArc
  - [ ] Hero, Sentence, WeekList, DayRow, RangeBar, icons
  - [ ] Loading / error / stale states, attribution
  - [ ] Fonts, RTL, reduced motion, contrast
- [ ] Verify on mobile viewport (375px) in browser, screenshot
- [ ] README

## Later (not v1)
- Multi-model blending (ECMWF IFS 0.25 first), IMS data
- Hourly chart, radar, what-to-wear tips, richer animation
- Place search / GPS, Capacitor wrap
