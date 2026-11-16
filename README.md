# שמיים · Shamayim

A Hebrew (RTL) weather app that tells you clearly and comfortably what the weather will be, for a specific place, as accurately as the data allows.

v1: one screen for Shadmot Mehola (Jordan Valley) — current temperature, a short Hebrew sentence describing the expected weather, and a 7-day forecast, over a live "valley sky" that follows the real sun position and conditions.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (sentence engine, mappers, theme contrast)
npm run build      # production build + PWA service worker
```

Dev only: append `?at=2026-11-17T13:00` to preview the screen at another local time (themes, sentence).

## Data

- [Open-Meteo](https://open-meteo.com/) forecast API, model `icon_seamless` (DWD ICON-EU for ~5 days, ICON Global after; days 6–7 are labelled "מגמה").
- Open-Meteo air-quality API (CAMS) for PM10/dust, used only for haze wording.
- Free tier is non-commercial; a store release needs an API key or proxy.

## Structure

See [docs/PLAN.md](docs/PLAN.md) for the architecture and decisions, and [TASKS.md](TASKS.md) for status.

```
src/config   place + thresholds
src/domain   types, WMO conditions, local-time helpers
src/data     provider interface, Open-Meteo provider, cache, useForecast
src/text     Hebrew sentence engine (facts → phrases → sentences)
src/theme    sky themes + picker (contrast-tested)
src/ui       components
```
