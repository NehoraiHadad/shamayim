# Brief: compared with normal + rain in the next two hours (data/text lane)

Shamayim is a Hebrew RTL weather PWA (React 19, Vite, TS, vitest, oxlint). Read `TASKS.md` first.
Weather comes from Open-Meteo through our Cloudflare Worker (`worker/`, per-route allowlist in
`worker/src/routes.ts`, checks in `validate.ts`, shared cache in `proxy.ts`/`store.ts`). App side:
`src/data/weatherApi.ts`, `src/data/openMeteo/*`. Sentence engine: `src/text/compose.ts`, `phrases.ts`,
`facts.ts`, thresholds in `src/config/thresholds.ts`.

**Lane rules.** Other sessions are editing `src/ui/scene`, `src/ui/hourly`, `Sky.tsx`, `src/theme`, `src/atmo`,
`WearCard`, `src/ui/week/`, `DayRow`. Do not touch those. The only UI surface is the sentence.
Files under ~150 lines (split when needed), DRY, no dead code. Do not deploy anything. Do not call
Open-Meteo from tests. Commit in small English commits on the current branch (no push).

## Facts already checked
- Open-Meteo **forecast** API: `minutely_15` has native 15-min data only in Central Europe (ICON-D2) and North
  America. **No 15-min model covers Israel**: there the values are interpolated from hourly models
  (ICON-EU/ICON global 1 h, ECMWF 1 h). So timing is good to ~±30 min, not ±5. The phrasing below is therefore in
  quarter hours, never "in 20 minutes". With `models=icon_seamless,ecmwf_ifs025` the columns come suffixed
  (`precipitation_icon_seamless`, `precipitation_ecmwf_ifs025`), like hourly. Precipitation at time `t` is the
  sum over the 15 minutes **ending** at `t`.
- **Historical** API `https://archive-api.open-meteo.com/v1/archive` (ERA5 / ERA5-Land, `best_match`) works:
  `daily=temperature_2m_max,temperature_2m_min,wind_gusts_10m_max&timezone=auto&wind_speed_unit=kmh`.
  Request weight ≈ (days/14)·(variables/10): 30 years × 3 variables ≈ 235 calls of the 600/min, 10 000/day
  budget, so it must be fetched **once per place and kept for a year**. Keep coordinates at 4 dp (same as the
  forecast): Open-Meteo downscales to the point's elevation, and rounding to 0.1° would move Jerusalem's
  normal by degrees.

## 1. Worker

### 1a. Computed routes
Extend `Route` with two optional members and use them in `proxy.ts`:
- `upstreamQuery?: (canonical: string) => string` — the query sent upstream (default: the canonical query).
  The cache key stays the canonical client query.
- `transform?: (body: string) => string` — applied to a 200 body before it is stored/served. If it throws,
  answer 502 `{error:true, reason:'Upstream data invalid'}` (stale copy first if one is usable), never store it.

### 1b. `/v1/normals`
- Client params: `latitude`, `longitude` (coord, 4 dp), both required; nothing else allowed.
- Upstream: archive URL above with the client coords plus fixed `start_date=1991-01-01&end_date=2020-12-31`,
  the daily list, `timezone=auto`, `wind_speed_unit=kmh`.
- `freshMs` 365 days, `staleMs` infinity. Add `'normals'` to `Route['name']`.
- `worker/src/normals.ts` (pure, tested): parse `daily.time` + the three columns (nulls skipped), and build a
  366-slot day-of-year table on a **leap-year calendar** (slot = index of MM-DD in a leap year; 02-29 = 59).
  For each slot, aggregate all samples whose MM-DD lies within ±7 slots (circular). Do it in O(n): first sum,
  sum of squares and count per slot, then slide the window. Output (numbers rounded to 0.1):
  ```json
  { "period": [1991, 2020], "windowDays": 15, "elevation": -249,
    "tempMax": [366], "tempMaxSd": [366], "tempMin": [366], "gustMax": [366], "gustMaxSd": [366] }
  ```
  Keep CPU small (free Workers: ~10 ms): no sorting, no per-slot rescans.

### 1c. Forecast route
Allow `minutely_15` (list: `precipitation`) and `forecast_minutely_15` (int 1–16), placed after `daily` in the
param order. Bump nothing else.

### 1d. Tests (worker/test)
Route table knows four endpoints; the app's new forecast query is accepted unchanged; normals query canonical
form + refusals (extra param, missing coord); `upstreamQuery`/`transform` used by `proxy` (fake fetch sees the
upstream query, cache key is the client query, transform output is what is cached, a throwing transform gives
502 and is not cached); `normals.ts` table: leap slot, circular window (Jan 1 sees Dec 25), mean/sd on a small
synthetic series, nulls skipped, 366 entries.

## 2. App data

- `src/domain/types.ts`:
  - `NowcastPoint { time: LocalTime; precipitation: number }` (mm in the 15 min ending at `time`).
  - `DayNormal { tempMax; tempMaxSd; tempMin; gustMax; gustMaxSd }`.
  - `Forecast` gains `nowcast: NowcastPoint[] | null` and `normals: Record<LocalDate, DayNormal> | null`
    (only the forecast's dates).
- `weatherApi.ts`: endpoint `'normals'`. It exists **only through the Worker** (raw archive data would be
  ~300 KB and needs the Worker's reduction): `weatherUrl` keeps its signature; add `normalsUrl(query, base)`
  that returns `null` without a base, and the provider skips normals then.
- `request.ts`: forecast adds `minutely_15=precipitation&forecast_minutely_15=12` (3 h). Shared lists stay in one
  place (DRY with the worker test's copy is not required; the worker test mirrors the app query on purpose).
- `src/data/openMeteo/mapNowcast.ts`: read `minutely_15.time` and the two suffixed columns; blend with the
  existing `blendNumber(pair, iconWeight(0))`; return `null` when the block is missing/empty. Malformed → `null`
  plus a console warning, never throw (the forecast must still render).
- `src/data/normals.ts`: fetch via the Worker, validate shape (5 arrays × 366 finite numbers), keep in
  localStorage `shamayim:normals:v1:<placeId>` for 180 days (guarded like `cache.ts`); `normalsFor(table, dates)`
  maps each `YYYY-MM-DD` to its leap-calendar slot. Tests.
- `provider.ts`: forecast, air and normals in parallel (`allSettled`); normals failure → `null`.
- `cache.ts`: bump `VERSION` to `v4` (Forecast shape changed). Update `docs/design/qa/offline.html` (key `v4`).

## 3. Sentence

All new numbers go in `src/config/thresholds.ts`:
`anomaly: { minDelta: 3, sdFactor: 1, strong: 6 }`, `heat: { aboveNormal: 8, floor: 35 }`,
`nowcast: { wetMm: 0.1, dryRun: 2, horizonMin: 120 }`.

### 3a. Compared with normal (`src/text/normal.ts`, pure)
- `gap = day.tempMax − normal.tempMax`. Say it only when `|gap| ≥ max(minDelta, sdFactor·tempMaxSd)`.
- Phrases (month in Hebrew, from the day's date: ינואר … דצמבר, joined with ל־ prefix, no hyphen: "לנובמבר"):
  - gap > 0: `חם מהרגיל לנובמבר ב־4°` (≥ strong: `חם בהרבה מהרגיל לנובמבר, ב־7°`)
  - gap < 0: `קריר מהרגיל לנובמבר ב־4°` (≤ −strong: `קר בהרבה מהרגיל לנובמבר, ב־7°`)
  - Use the maqaf form `ב־` as elsewhere in `phrases.ts`; degrees via `deg()` on |gap|.
- Day mode: it becomes the **first** extra (before wind, dust, trend; still max two extras). Night mode: appended
  to the tomorrow sentence for tomorrow's day: `מחר בהיר ונעים, עד 26°, חם מהרגיל לנובמבר ב־4°.`
- Temperature words (`dayTempWord`) stay absolute: they describe how it feels.

### 3b. Place-relative thresholds (`src/text/placeThresholds.ts`, pure)
`thresholdsFor(normal?: DayNormal)` →
- wind: scale `brisk/strong/gusts` by `k = max(1, (gustMax + gustMaxSd) / T.wind.gusts)` — windy places need more
  to be called windy; calm places never get lower thresholds.
- `veryHot = clamp(normal.tempMax + heat.aboveNormal, heat.floor, T.dayTemp.veryHot)`; `heatHours = veryHot − 3`.
- No normal → today's fixed values. `windClause`, `extremeHeat` and the heat span use these. `windowFacts`
  takes the heat-hours value as a parameter (default `T.heatHours`).

### 3c. Rain in the next two hours (`src/text/nowcast.ts`, pure)
`nowcastOf(points, now) → { kind: 'start' | 'stop'; minutes: number } | null`:
- Slots from the one covering `now` (time − 15 min < now ≤ time) to `now + horizonMin`. Wet = ≥ `wetMm`.
- Raining now (covering slot wet): find the first run of ≥ `dryRun` dry slots; minutes = from now to that run's
  slot start (slot time − 15). None within the horizon → `null` (keep quiet; hazard already speaks).
- Dry now: first wet slot whose run is ≥ 2 slots or ≥ 0.3 mm total; minutes = slot start − now. None → `null`.
- Phrase (`phrases.ts`), minutes snapped to the nearest of: <10 → `בדקות הקרובות`; 15 `כרבע שעה`, 30 `כחצי שעה`,
  45 `כשלושה רבעי שעה`, 60 `כשעה`, 90 `כשעה וחצי`, 120 `כשעתיים`:
  - start: `גשם צפוי להתחיל בעוד כחצי שעה.` / `גשם צפוי להתחיל בדקות הקרובות.`
  - stop: `הגשם צפוי להיפסק בעוד כרבע שעה.` / `הגשם צפוי להיפסק בדקות הקרובות.`
- Placement in `composeSummary`, both modes: the nowcast sentence leads; the rest follows (max 3 sentences).
  Coherence with `hazard()`:
  - start: if the hazard's start would be "בשעות הקרובות", fold amount/flood into the nowcast sentence
    (`גשם צפוי להתחיל בעוד כחצי שעה, כ־5 מ״מ. חשש לשיטפונות בנחלים.`) and drop that hazard sentence.
  - stop: compute the hazard on the window starting one hour after the stop; if rain comes back, phrase it with
    `שוב` (`צפוי גשם שוב בערב, כ־3 מ״מ.`), else no rain hazard (dust hazard still applies).
- `App.tsx` already recomputes the sentence on every `now` tick; no UI change needed. Remember `rollForward`.

### 3d. Tests
`normal.test.ts` (warmer, colder, strong, below threshold silent, sd raises the bar, month names incl. January),
`placeThresholds.test.ts`, `nowcast.test.ts` (start in ~30, stop in ~15, short blip ignored, raining all horizon
→ null, dry all → null, slot boundary), and `compose.test.ts` cases: warmer than normal as first extra, colder,
normal → nothing, rain starting folds amount, rain stopping with later rain says שוב, windy place with normal
gusts 60 does not call 46 km/h gusts "strong", heat at 36° in a place with normal 27° is שרב.
`makeForecast` gets optional `normals`/`nowcast` (default null) — keep existing tests unchanged.

## 4. QA hook
`docs/design/qa/offline.html` takes extra query params so the sentence can be checked without the network:
- `nm=<delta>`: normals for every fixture date with `tempMax = day.tempMax − delta`, sd 2, gusts 40 ± 8
  (`nm=4` warmer, `nm=-4` colder, `nm=0` normal).
- `nc=start:<HH:MM>` / `nc=stop:<HH:MM>`: 12 slots of nowcast around the fixture day, dry then 0.8 mm from that
  time (start), or wet until that time then dry (stop).
Keep it inline and short; reuse the mapper as today.

## Done
`npm run typecheck && npm run lint && npm test && npm run build` in the root, and `npm run typecheck && npm test`
in `worker/`, all green. Report what you could not verify.
