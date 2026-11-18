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

Dev only: append `?at=2026-11-17T13:00` to preview another local time, and `?theme=rain` (dawn, clearDay, heat, cloudy, rain, dust, dusk, night) to force a sky theme. `?relief=true|mid|high` compares how much the low degrees (land and low sky together) are stretched (default `high`). `?rain=arrive` (or `here`, `pass`, `far`, `still`, `none`, or `bearing:km:radiusKm:band[:towardDeg:kmh],…`) replaces the radar with synthetic moving rain, for the rainy states of the rain map.

## Data

- [Open-Meteo](https://open-meteo.com/) forecast API with two models in one request: `icon_seamless` (DWD ICON-EU ~7 km, then ICON Global) and `ecmwf_ifs025`. They are blended per day (ICON weighted 0.6 for the first 5 days, ECMWF 0.6 after); the difference between them sets each day's confidence. Days 6–7 are labelled "מגמה".
- Open-Meteo air-quality API (CAMS) for PM10/dust, used only for haze wording.
- [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (terrarium PNGs, open CORS, no key) for the land in the valley scene: a horizon panorama from the place (`src/data/terrain/panorama.ts`), the true angle of the land in every direction, drawn on the sky's own vertical scale so the sun and moon rise and set behind the hill that really hides them. Fetched once per place (zoom 10 near, zoom 8 far, ~0.3–0.6 MB) and kept in localStorage for good.
- Free tier is non-commercial; a store release needs an API key. Attribution "נתונים: Open-Meteo" stays in the app.

### Weather proxy (`worker/`)

Open-Meteo's free tier limits requests per IP address, so many users behind one mobile-carrier IP can hit "Daily API request limit exceeded". A small Cloudflare Worker sits in between and caches each place's answer for everyone, so the request volume follows the number of places, not users.

| Route | Upstream | Shared cache | Stale-if-error |
|---|---|---|---|
| `GET /v1/forecast` | `api.open-meteo.com/v1/forecast` | 15 min | up to 12 h |
| `GET /v1/air-quality` | `air-quality-api.open-meteo.com/v1/air-quality` | 60 min | up to 12 h |
| `GET /v1/elevation` | `api.open-meteo.com/v1/elevation` (no longer called by the app since the horizon panorama; kept for older clients) | 30 days | any age |

- Only the query parameters the app sends are forwarded (per-route allowlist, coordinates checked and rounded to 4 decimals, at most 50 elevation points); anything else is a 400, unknown paths 404, non-GET 405.
- `X-Fetched-At` (epoch ms) says when the data left Open-Meteo; the app uses it as `fetchedAt`, so a shared copy is not shown as "updated now". `X-Cache` is `HIT`, `MISS` or `STALE`.
- Upstream refusals with no cached copy are passed through unchanged (status + `{"error":true,"reason":…}`), so the app can still tell a daily/hourly limit from a busy minute.
- Concurrent misses for the same key within one Worker isolate share one upstream request.
- CORS: only origins in the `ALLOWED_ORIGINS` variable (`worker/wrangler.toml`; `https://*.shamayim.pages.dev` covers Pages preview builds); other browser origins get 403.
- Served at `https://shamayim-api.nehoraihadad.com` (custom domain, so the Cache API works; on `*.workers.dev` it would not, and only a per-isolate memory cache would remain).

Production builds use it through `.env.production` (`VITE_WEATHER_API_BASE=https://shamayim-api.nehoraihadad.com`), which Vite reads only for `vite build`. Unset (dev, tests), the app calls Open-Meteo directly. Geocoding and Overpass/Nominatim are always called directly.

```bash
cd worker
npm install
npm test           # allowlist, cache key, cache/stale/coalescing, CORS
npx wrangler deploy
```

**Order when the app asks Open-Meteo for something new** (a new hourly/current variable, a new parameter): the Worker
refuses any name it does not list, so a production app that sends it before the Worker knows it gets 400 for every
forecast (this took the forecast down on 2026-11-18). Always:

1. Add the name to the Worker's allowlist (`worker/src/routes.ts`) and its test; merge to `main`. The Worker accepts
   any subset of its list, so the app already in production keeps working.
2. Deploy the Worker: `cd worker && npm ci && npm test && npx wrangler deploy` (needs `npx wrangler login` once on the
   machine; the account is chosen there, nothing secret is in the repo).
3. Check the deployed Worker answers the new query (example below), then merge the app change. Pages builds `main`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://shamayim.pages.dev" \
  "https://shamayim-api.nehoraihadad.com/v1/forecast?latitude=32.348&longitude=35.535&hourly=cloud_cover_high"
# 200 = the Worker knows the name; 400 = not deployed yet (do not merge the app change)
```

## Structure

See [docs/PLAN.md](docs/PLAN.md) for the architecture and decisions, and [TASKS.md](TASKS.md) for status.

```
src/config   place + thresholds
src/domain   types, WMO conditions, local-time helpers
src/data     provider interface, Open-Meteo provider, cache, useForecast
src/text     Hebrew sentence engine (facts → phrases → sentences)
src/theme    sky themes + picker (contrast-tested)
src/ui       components
worker/      Cloudflare Worker: cached Open-Meteo proxy (own package)
```
