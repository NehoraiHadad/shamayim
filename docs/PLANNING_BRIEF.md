# Shamayim (שמיים) — Planning brief

## Product
Hebrew (RTL) weather app. Goal: tell the user clearly and comfortably what the weather will be, with the most accurate data available for a specific place and time. People should prefer it over other weather apps because of its **UI/UX and accuracy**.

First target place: Shadmot Mehola (lat 32.348, lon 35.535), Jordan Valley, Israel (~ -150 m below sea level, hot valley climate).

## v1 scope (small, working, readable)
One screen:
1. Current temperature (+ feels-like, condition).
2. A short natural Hebrew sentence describing the expected weather (rule-based, generated from data).
3. 7-day forecast.

Data: free Open-Meteo API, ICON model (`models=icon_seamless` or `icon_eu`; Shadmot Mehola is inside the ICON-EU domain). 7 days: ICON-EU covers ~5 days, so plan the fallback/blending.

Tech: React + Vite + TypeScript, mobile-first, installable PWA, later wrapped with Capacitor. Clean modular code (files < 150 lines), because later we add: more data sources (multi-model blending, IMS), radar, what-to-wear tips, beautiful animated design.

Repo will be public on GitHub; CI on GitHub Actions (typecheck, lint, test, build).

## What I want from you (planner)
Produce a concrete plan (markdown, <= ~120 lines):
1. **Architecture / folder structure** — data layer (provider abstraction for future sources), domain model, Hebrew text generation, UI components, PWA.
2. **Open-Meteo request** — exact params (current, hourly, daily vars, timezone Asia/Jerusalem), how to handle ICON-EU 5-day horizon for a 7-day view (e.g. `icon_seamless`), caching/offline strategy.
3. **Hebrew sentence logic** — rules (heat, wind, rain chance, dust, night vs day), examples.
4. **Visual design direction** — must be impressive and distinctive, not a template: palette per condition/time of day, typography for Hebrew (font choices), layout of hero + 7-day list, motion ideas that are cheap for v1, accessibility/contrast. Suggest whether generated imagery (backgrounds/illustrations/app icon) is worth it in v1 and give image prompts if so.
5. **Accuracy concerns** — elevation correction for the below-sea-level valley, model choice, units, timezone/day-boundary pitfalls.
6. **Risks & v1 non-goals.**
Be decisive; no option lists without a pick.
