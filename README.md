# שמיים · Shamayim

A Hebrew (RTL) weather app that tells you clearly and comfortably what the weather will be, for a specific place, as accurately as the data allows.

One screen for Shadmot Mehola (Jordan Valley), over a live "valley sky" that follows the real sun position and conditions:

- current temperature and a short Hebrew sentence describing the expected weather
- the next 24 hours as a scrolling strip with a temperature curve, rain chances and sunrise/sunset
- what to wear today (or tomorrow, in the afternoon)
- 7 days on one shared temperature scale; tap a day for its hours, rain, gusts, UV, air quality and how much the models agree

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (sentence engine, mappers, theme contrast)
npm run build      # production build + PWA service worker
```

Dev only: append `?at=2026-11-17T13:00` to preview another local time, and `?theme=rain` (dawn, clearDay, heat, cloudy, rain, dust, dusk, night) to force a sky theme.

## Data

- [Open-Meteo](https://open-meteo.com/) forecast API with two models in one request: `icon_seamless` (DWD ICON-EU ~7 km, then ICON Global) and `ecmwf_ifs025`. They are blended per day (ICON weighted 0.6 for the first 5 days, ECMWF 0.6 after); the difference between them sets each day's confidence. Days 6–7 are labelled "מגמה".
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
