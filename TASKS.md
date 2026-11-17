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

## v5 — any place + life on calm days — 2026-11-17
Briefs: `docs/briefs/location.md`, `docs/briefs/calm-life.md`. Design: `docs/design/CALM-LIFE.md` (Fable).
Built by Codex (sol) in worktrees `feat/location`, `feat/calm-life`; reviewed, fixed and merged here.
- [x] `usePlace`: current + 4 recent places in localStorage; the place you leave joins the recents
- [x] Place picker (tap the place name): GPS ("המיקום שלי"), Open-Meteo geocoding search (he, debounced,
      aborts stale), recents; opens fresh each time
- [x] Terrain: 41 Open-Meteo elevation samples ±12 km (near) / ±30 km (far), cached per place
      (`shamayim:terrain:v1:<id>`), smoothed + Catmull-Rom curves; generic hills while loading/failing;
      Shadmot keeps its hand-drawn ridges. Sea line only below 50 m or with sea at a profile edge
- [x] Forecast and cache keyed by place id; timezone follows the place
- [x] Calm life (`src/atmo/life/`): crane V / stork skeins (migration windows), swifts (Mar–Jun dusk),
      thermal raptor (hot noon), meteors on shower peaks; one event at a time via Web Animations, GL loop
      stays asleep; mist band (humid still mornings); 30 s wind-driven star twinkle; reduced motion → mist only
- [x] Fixed in review: RTL `inset-inline-start` sent every flight off-screen; lanes were always dimmed to
      α .4 because `[data-air-band]` covers the whole sky — lanes now hang off the scene top
- [x] Dev override `?wx=hum:96` for mist QA
- [x] Verified (Chrome): Jerusalem (792 m, real ridges), Tel Aviv (11 m, sea west), back to Shadmot unchanged;
      crane V crossing today (17.11), meteor + twinkle at night, mist at 07:00
- [ ] Not verified: GPS on a phone; swifts/storks/raptor by eye (only by tests); mist band height on
      sampled (non-Shadmot) terrain uses the fixed y 72–105 band
- [x] Climate-relative thresholds and place-aware sentences — see climate normals + nowcast below

## Deploy — 2026-11-17
- [x] Cloudflare Pages project `shamayim` → https://shamayim.pages.dev (free plan)
- [x] Git-connected: every push to `main` builds (`npm run build`, Node from `.nvmrc`) and deploys to production;
      preview deployments off, no PR comments
- [x] `public/_headers`: no-cache for `sw.js`, manifest, index; immutable `/assets/*`; nosniff, geolocation self only
- [x] Custom domain shamayim.nehoraihadad.com
- [ ] Optional: Cloudflare Web Analytics
- Later services fit here: Pages Functions / Workers (API proxy, IMS warnings, push), KV/D1, Cron Triggers

## v6 — landmarks — 2026-11-17
Design: `docs/design/LANDMARKS.md` (Fable). Built by Codex (sol) in `feat/landmarks`, two rounds; verified and merged here.
- [x] Curated marks at true west–east positions: Jerusalem (Chords Bridge, YMCA, Tower of David, Wall + Dome),
      Tel Aviv (Shalom Meir, Reading, Sarona, Azrieli), Haifa (Báb, Dagon, Sail, refinery cooling towers),
      Shadmot (Mehola palms, homes + hall, solar field, orchard)
- [x] OSM/Overpass marks elsewhere (idle-time, cached 30 days, mirror fallback) + populated-place homes; ODbL credit
- [x] Scene split: ridges stretch, marks keep their aspect; spacing in viewBox units; dense curated clusters overlap ≤30%
- [x] Weather life: lit windows (night/storm/haze), aviation light ≥60 m, lights outlast walls in fog, far marks hidden
      in thick fog, palm lean + 20 s sway in light dry wind, turbines; reduced motion → static
- [x] Fixed: "פני הים" label now over the sea side (west/east), Shadmot unchanged
- [x] Verified (Chrome): all four places by day, Jerusalem at night
- [ ] Gaps: Haifa "69 מ׳" label touches the Dagon silo; OSM path not yet seen live on a small place; some curated
      heights unverified (YMCA, Tower of David, Azrieli Sarona); Haifa cooling towers' current existence unconfirmed
- [ ] Deferred: snow caps (with a ridge snow line); gust-triggered re-sway

## v6.1 — place detection — 2026-11-17
Brief: `docs/briefs/place-detection.md`. Codex (sol), merged `feat/place-detection`.
- [x] Search = Open-Meteo + Nominatim in parallel (Open-Meteo/GeoNames has no Gush Etzion places; כרמי צור now found)
- [x] Settlement homes always drawn at the centre (PPL* or Nominatim village/town/city), alongside OSM marks
- [x] Overpass: 3 hosts, 12 s timeout each, failure remembered 1 h, empty answer cached 30 days
- [x] Curated data checked online with sources in comments: Báb 11 m, Dagon 65 m (moved), Shalom 142 m,
      one Bazan cooling tower; YMCA / Tower of David / Dome top / Reading chimney heights still unverified
- [ ] Homes on כרמי צור are 12×6 px, ridge-coloured, under the village dot → invisible. Fix in illustration round.
- [x] Overpass public servers at capacity ("automated use: run your own") → solved for Israel in v6.2

## v6.2 — Israel landmark file — 2026-11-17
Brief: `docs/briefs/israel-landmarks.md`. Codex (sol), merged `feat/israel-landmarks`.
(`docs/briefs/landmarks-proxy.md` is superseded — kept only as the base for a future IMS Pages Function.)
- [x] `.github/workflows/landmarks.yml`: monthly (1st, 02:00 UTC) + manual; Geofabrik israel-and-palestine pbf →
      `osmium tags-filter` (filters from `src/data/landmarks/filters.ts`, shared with Overpass) → geojsonseq →
      `scripts/landmarks/build.ts` → `public/data/landmarks/il/<lat*10>_<lon*10>.json` + `index.json`; commits if changed
- [x] First run (44070744406): 256 cells, 470 KB, bbox 29.45–33.34 N / 34.17–35.90 E
- [x] Client: curated → Israel cells (in coverage) → Overpass; cache key `shamayim:landmarks:v2:`; SW runtime-caches
      `/data/landmarks` (not precached)
- [x] Verified on prod: כרמי צור loads index + 13 cells, 5 marks (Beit Ummar minarets), no Overpass call
- [x] Custom domain https://shamayim.nehoraihadad.com (Pages domain + proxied CNAME via `cf`)
- [x] Stale service worker kept an old bundle on prod until unregistered → skipWaiting + clientsClaim + update polling (`src/pwa.ts`)
- [ ] Synagogues and water towers are in the data but have no glyph (illustration round)
- [ ] Abroad: OpenFreeMap vector tiles (z14: worship, castles/ruins, building `render_height`; no towers/masts)
      as the main source, Overpass as a bonus — next Codex round
- [ ] Later: Cloudflare Pages Function for IMS (token server-side) once access is granted (asked 16.11)
- [~] Illustration upgrade → v7 below

## v7 — illustration: marks that belong to the hill — 2026-11-17 (branch `feat/illustration`)
Spec: `docs/design/ILLUSTRATION.md` (Fable). Drawn by Claude, not Codex (owner: Codex drawings read "מודבק").
- [x] QA stills of 10 places (day/night) → Fable critique: one tone, pins on the skyline edge, no depth, no sun side, no village
- [x] Px-space hill layer `src/ui/scene/marks/HillMarks.tsx` (no stretch): seat on slope (`seat.ts`), planes behind/line/face
      from north–south offset, sun-side lit strip, R3 colour tokens in `marks.module.css`
- [x] Settlement cluster (`settlement.ts`, `SettlementGlyph.tsx`): tile / flat-hill / flat-desert / blocks, rows draped
      down the slope, terraces, night windows; elevation label sits under the houses; dot seated on the drawn ridge
- [x] Glyphs (`generic/buildings.tsx`): mosque (hall + dome + minaret, green lamp), synagogue, church, water tower, castle;
      field patches (`generic/fields.tsx`): orchard, vineyard, solar
- [x] OSM caps (minaret 2, mast 1, orchard 2, solar 1, highrise 4) + variety penalty; new kinds synagogue, vineyard
- [x] Look test Karmei Tzur 10:00 / 21:00 at 375 px → sent to owner for approval
- [x] Absorb (eafd467): synagogue/water tower/minaret/church/silo within 0.6 km of the centre skip `select` and stand
      at their true x inside the cluster (≥8 px from the dot, max 3), the skyline house in their slot gives way;
      seated with `steepOk`, plane `line`. Umm al-Fahm shows its central mosque again
- [x] flat-desert: houses only where ground is within 5 px of the rim (Mitzpe Ramon stays on the plateau)
- [x] `classify`: synagogue (religion=jewish + building, 9 m), `landuse=vineyard` filter + kind
- [ ] After merge to main: re-run the landmarks workflow (`workflow_dispatch`) so cells carry synagogues/vineyards
- [ ] Mitzpe Ramon: the sun-event label (שקיעה) overlaps the westmost houses — move label or skip houses under it
- QA tip: in the browser pane use `resize_window` mobile, then `scene.style.zoom=3` for readable stills
- [x] Fresh-critic loop (anidoodle method): r1 → 60ca846, r2 → 4292ae4 (houses in the ridge tone, crescent domes,
      hand-planted orchard, solar strips, stepped castle rubble, one light side per village). Sheets:
      `docs/design/qa/specimens-mine*.png`; dev sheet at `/specimen.html`
- [x] (`feat/illustration-glyphs`) All generic kinds in the px layer (`generic/industry|structures|nature.tsx`);
      curated cities redrawn (`curated/*.tsx`); one-light rig (`LightRig.tsx`); far layer via HillMarks; old
      `Landmarks.tsx` + `glyphs/` removed. Specimens + critique: `docs/design/qa/specimens-*.png`, `NOTES.md`
- [x] Merged into feat/illustration; my five buildings keep their own lit faces (`selfLit`, mirrored, CastShadow),
      other glyphs use LightRig. [ ] Fresh critic over `specimens-generic/curated.png`
- [ ] Follow-ups: (Báb label fixed by placement) Dagon dropped by placement; Tel Aviv dot off its towers;
      Sarona twist reads flat at 1x; palms crowns still icon-like; verify the facts listed in `docs/design/qa/NOTES.md`
- [x] Critic on city glyphs (r1): ground skirt under line-plane marks (no sky wedge under Azrieli), Báb terraces as
      one stair, wall/lit tones down to 18%/30% sky
- [x] Placement (critic P0/P1, `fix/scene-placement`): `marks/sceneLayout.ts` fits the near hill to what shows above
      the sheet (scene y < 102): label takes the nearest spot clear of every mark/house/dot/caption box; marks step
      off the dot; bases within 6 px of the sheet are dropped (curated: lifted ≤ 6 px); fields slide onto the visible
      face; no house under the sun-event caption. Stills `docs/design/qa/placement-{before,after}-*.png`
      (dev helper `docs/design/qa/place.html` seeds the place for headless Chrome at a true 375 px)
- [ ] Glyph follow-ups from the same critic: Azrieli round tower needs round shading; Western Wall stone courses
- [ ] Regression stills for all 10 places; then merge to main

- [x] Hill-town blocks ("מודבק" fix, Umm al-Fahm / Tiberias): `marks/blocks.tsx` draws a flat-roofed block of 2–5
      storeys (`STOREY`/`PARAPET` in `settlement.ts`) with lit side, sky-lit parapet, a dark window row per storey by
      day (lit by `litShare` at night), black tanks / heater / rebar; per-house wash (`.house` concrete, washed,
      stone, basalt) and the crest row pulled toward the far ridge (`.recede`). Overcast (`.flat`): `.side` goes a step
      darker and `.top` stays sky-lit, so houses keep two values (FlatRoof too). Layout: houses only where ground is
      within `REACH` of the dot (blocks 22 up / 12 down, tile 14/12, desert 5/5); steep face (slope > .6) packs at
      .6 pitch and leans the terraces uphill; nothing below the sheet (`floor`); retaining walls only under every
      other stretch (`terraces.ts`). Cities (`settlementType: city`) take blocks even under 50 000
- [x] Absorbed minaret (Umm al-Fahm): it was drawn in the `line` plane BEFORE the cluster, so lower rows painted over
      it (only row 0 gave way) and it sat seated low on the steep west face. Now `hillScene.intoTown` slides it up to
      the crest when its base falls below the houses' reach, houses round it stay under its roof (base − 6 px), and
      HillMarks draws absorbed marks after the settlement. Stills `docs/design/qa/blocks-*.png`
- [ ] Blocks follow-ups: Tiberias dot sits ~12 px above the sheet on a 1.3 slope, so its town is a small uphill
      clump (terrain/dot placement, not the cluster); windows are sub-px at 1x; clear-day washes may read light
- [x] Jerusalem without mosque or church (owner, 2026-11-17): YMCA bell tower removed; the Wall drawn alone (9 px,
      Herodian courses), no Dome of the Rock. Tower of David keeps its Ottoman minaret silhouette

## UI polish A — picker, top bar, status, states (2026-11-17, branch from main)
- [x] Picker contrast: dark sky surface (`--sky-top` 92% + white), ink 55% borders, explicit placeholder, no opacity
      text; checked for all 8 themes in `src/ui/PlacePicker.contrast.test.ts` (helpers in `src/test/contrast.ts`)
- [x] Picker is a native modal `<dialog>` bottom sheet (radius 28 28 0 0): page inert, Tab stays inside, Escape and ×
      close it, focus returns to the opener; wells/rows/input use `--radius-well`; 16 px stroke close icon; "מחפש…"
      status while the debounced search is pending; split into `PlacePickerSearch.ts` + `PlacePickerList.tsx`
- [x] Top bar: 12 px chevron after the place name, aria-label "{place}, החלפת מקום", focus ring; hidden `<h1>`
- [x] Refresh pill: `aria-disabled` while busy (focus stays), `role=status` mirror announces "מעדכן…" / "עודכן עכשיו"
- [x] Copy: impersonal "מאתר מיקום…" / "מעדכן…"
- [x] Error state by cause: `HttpError` + `toFetchFailure` (429/5xx → "השירות עמוס, נסו שוב בעוד דקה", else network);
      typed `FetchFailure` from `useForecast`; tests in `src/data/fetchFailure.test.ts`; focus ring on retry
- [x] Sentence no longer `aria-live` (re-announced on every clock tick)
- [x] forced-colors borders on picker rows/buttons, refresh pill, retry button
- [x] Dev QA: `?picker=open` opens the picker on load; `place.html` takes `r=<recent places JSON>`.
      Stills `docs/design/qa/polish-a-{before,after}-*.png` (Open-Meteo was rate-limiting, so the top bar sits over
      the error state in them)
- [ ] No component-test setup (vitest runs `node`, `*.test.ts` only): focus return / inert were checked by hand in
      Chrome, not in an automated test. `src/theme/contrast.test.ts` still has its own luminance helper (theme files
      belong to polish B); it could import `src/test/contrast.ts`
## UI polish B — hero, sheet, strip, sky contrast — 2026-11-17 (worktree branch, part A runs in parallel)
- [x] Hero: degree sign after the digits (LTR digits row), visually-hidden "{n} מעלות", decorative icon,
      `--text-hero: clamp(5rem, 34.2vw, 8rem)` (128 px at 375, fits 200% text)
- [x] RangeBar: spread clamped to the track, one ink-hairline sleeve (reads on light and dark paper); fill clamped
- [x] Tokens: `--sky-rain`, `--sheet-rain`, `--sheet-curve`, `--sheet-sun` (+ `.dark-sheet`) in `tokens.css`;
      Sheet/WearCard/DayRow/Attribution hard-coded sizes, radii, durations and fonts mapped to tokens
- [x] DayRow: confidence tag on its own line; no opacity on estimate rows; date 13 px muted (≥ 5.8:1)
- [x] Fog icon: wavy wisps under a small cloud (`docs/design/qa/polish-b-fog-icon.png`)
- [x] Attribution: one source per line
- [x] Hourly strip: labels at full opacity (weight marks now/selected), min-heights, Home/End keys,
      forced-colors outline on the picked hour, mid-sky halo on sky text; sun times on paper `--sheet-sun`
- [x] Sky gradient stops in rem (mid 12–27rem, horizon 33rem) instead of svh; scene caption top 12 px + halo
      (`captionBox` mirrors it); `body` font-size 100%
- [x] Contrast: `src/theme/contrast.ts` (shared), test reads tokens.css; report `docs/design/qa/contrast-report.ts`
- [x] QA: `docs/design/qa/offline.html` seeds the cache with the fixture when Open-Meteo answers 429;
      stills `docs/design/qa/polish-b-{before,after}-*.png`
- [ ] Not done: --warn token (no warning colour lives in these files); hourly band offsets stay px, so 200% text
      grows labels into the curve band; DayDetail sheet strip not captured in stills (needs a tap)

## Weather proxy Worker — 2026-11-17 (branch `feat/weather-proxy-worker`)
Goal: Open-Meteo request volume follows places, not users (free tier limits per IP; carriers share IPs).
- [x] `worker/` package (wrangler, TS, vitest): `/v1/forecast`, `/v1/air-quality`, `/v1/elevation`, else 404
- [x] Per-route param allowlist + value checks (`worker/src/routes.ts`, `validate.ts`), coords rounded to 4 dp,
      ≤ 50 elevation points, canonical order = cache key = upstream query
- [x] Shared cache (Cache API + per-isolate memory, `store.ts`), TTL 15 min / 60 min / 30 d, stale-if-error
      12 h / 12 h / any age, `X-Cache: HIT|MISS|STALE`, `X-Stale-Reason`; in-isolate request coalescing (`proxy.ts`)
- [x] Upstream refusals passed through (status + `reason`) when nothing is cached; timeout → 504 JSON
- [x] CORS from `ALLOWED_ORIGINS` var, OPTIONS preflight, disallowed browser origins → 403
- [x] App: `src/data/weatherApi.ts` (`VITE_WEATHER_API_BASE` switch, `X-Fetched-At` → `fetchedAt`),
      request.ts / terrain.ts / provider.ts wired; useForecast keeps a newer local copy over an older shared one
- [x] Tests: worker 31, app weatherApi + provider; README section; CI `worker` job
- [x] Deployed 2026-11-17 to workers.dev (`ALLOWED_ORIGINS` = shamayim.pages.dev + localhost:5173); live curl:
      forecast MISS→HIT→HIT same X-Fetched-At, air MISS, 400, 404, preflight 204/403, GET with origin → ACAO
- [x] `.env.production` sets `VITE_WEATHER_API_BASE=https://shamayim-api.nehoraihadad.com` (Pages git builds pick it up);
      `*.shamayim.pages.dev` allowed for preview builds (worker cors wildcard + test)
- [ ] After merge: confirm shamayim.nehoraihadad.com calls shamayim-api in the network panel
- [x] Custom domain `shamayim-api.nehoraihadad.com` (Cache API works there); origin shamayim.nehoraihadad.com added;
      live: MISS→HIT→HIT, 8 parallel connections all HIT with one X-Fetched-At, 400, preflight 204/403
- [x] PR against main

## Climate normals + nowcast — 2026-11-17 (branch `claude/data-text-80a67f`)
Brief: `docs/briefs/climate-nowcast.md` (Claude Opus 5.5). Code: Codex gpt-5.6-sol (via the Codex plugin; the
outsourcerer cloud gate refused the run because of `.env.production`, which holds only the public Worker URL).
Review, the `normalsUrl` cleanup, commits and QA: Claude Opus 5.5. Later code rounds in this lane: Codex sol 6.2, Opus if weak.
- Facts: Open-Meteo has no native 15-min model over Israel (only ICON-D2 Central Europe / HRRR North America);
  `minutely_15` here is interpolated from hourly ICON/ECMWF, so the sentence speaks in quarter hours, not minutes.
  Archive weight ≈ (days/14)·(vars/10): 30 y × 3 vars ≈ 235 calls, hence one fetch per place per year via the Worker.
- [x] Worker computed routes; `/v1/normals` reduces 1991–2020 archive data into a circular 366-slot table;
      365-day shared cache, stale fallback, precise coordinates; forecast accepts 15-minute precipitation
- [x] App: optional blended nowcast; Worker-only normals with 180-day localStorage cache; parallel provider;
      forecast cache v4; offline QA `nm=` and `nc=` overrides
- [x] Sentence: Hebrew temperature anomaly first extra / tomorrow suffix; place-relative heat and wind;
      rain start/stop leads with hazard folding, returning-rain wording and a three-sentence limit
- [x] Local verification: root typecheck, lint, 314 tests and build; Worker typecheck and 48 tests
- [x] Browser pane, 375 px, fixture via `offline.html` at 10:00: warmer (`nm=4` → "חם מהרגיל לנובמבר ב־4°"),
      colder (`nm=-4`), normal (`nm=0`, silent), rain starting (`nc=start:10:30` → "בעוד כחצי שעה"), rain stopping
      (`nc=stop:10:15` → "בעוד כרבע שעה"). Still `docs/design/qa/climate-nowcast-start-colder-375.jpg` (3 sentences fit)
- [ ] After merge: redeploy the Worker (`/v1/normals`, `minutely_15`); then check a live `/v1/normals` MISS→HIT,
      its CPU time on the free plan, and that a real Israeli `minutely_15` answer carries both suffixed columns
- [ ] Not verified: live archive/forecast answers (Open-Meteo daily limit was hit from this IP), real-device QA,
      night-mode anomaly and nowcast in the browser (tests only)

## Sheet polish — the sheet belongs to the sky — 2026-11-17 (branch `claude/sheet-polish-4018dc`)
Fable critique before → build → Fable critique after (verdict: belongs; its three small fixes done).
- [x] Wear card: side stripe gone; xs muted label over a `--text-lead` (21 px) balanced serif sentence, hairline below
- [x] Week rows: `week/SkyWindow.tsx` — a 36×40 window of the day's midday sky (hours 11–14: cloud, rain, dust, heat)
      carrying the icon in the sky's ink, a ridge cut at its foot in paper colour (the open row's well sets `--win-ground`)
  - [x] `week/middaySky.ts` (+ tests): dry days draw the midday cloud (no "overcast" icon over a clear midday);
        wet/fog/snow/thunder keep the day's kind; dust → greyed ochre + hand-drawn hazy sun (+ "אובך" in the label);
        heat → red-orange with a paler top; fog/snow → pale window with dark ink, slate with white ink on the dark sheet
  - [x] Sky colours read only through `week/skyPalette.ts` (adapter over `SKY_THEMES`): when the scene lane moves
        to continuous light, remap there
  - [x] Icon ink ≥ 3:1 on every reachable window sky (test grid); heat vs dust kept apart (test)
- [x] Date line carries rain % and the tag ("22.11 · הערכה"); name column 5.5 rem; chevrons removed (open well marks it)
- [x] "השבוע הקרוב" kept for screen readers only
- [x] RangeBar: absolute ramp in sky colours (indigo → clear blue → sand → rust), interpolated; 5 px; spread as a pale
      tint, no outline; today = small ink dot with a paper halo
- [x] Stills (375 px): `docs/design/qa/sheet-{before,after}-{day,night}.png` (fixture via `offline.html`),
      `sheet-after-variety-day.png` + `sheet-after-variety-night-expanded.png` (synthetic rain/heat/dust/fog days)
- [ ] Not verified: real rain/dust/heat weeks (only synthetic data); a phone; screen reader; 200% text checked by eye
      at night only; no component tests (vitest is node-only); the rows' tap affordance without chevrons is a judgment call
- [ ] Later (Fable): the hard straight seam between valley and sheet
- [x] Wear card clothesline (owner: "draw the clothes, not generic"): `wear/WearLine.tsx` + `wear/garments.tsx` —
      the day's clothes pegged on a sagging line in the sentence's order (tee / long sleeve / sweater / jacket / coat,
      + umbrella or rain jacket, + sun hat / water bottle); `wear.ts` returns `garments` + `wind`; pegged cloth skews
      and hooked things swing with the day's max wind (downwind from today's direction; tomorrow assumes the westerly);
      sway slower in still air, off under reduced motion. Specimen: `docs/design/qa/wear-specimen.html` →
      `wear-line-specimen.png`. Fable: keep it; softer outline + 1.3× scale done
  - [x] Pass 2 (owner: "improve the drawings + add animation"): garments split into `wear/tops.tsx` + `wear/gear.tsx`
        with shaded drapes / inner sleeves, stitched hems, a cable-knit sweater, coat flap pockets, umbrella strap,
        hat ribbon + brim underside, water inside the bottle. Motion (`wear/gust.ts`): one gust cycle shared by the
        rope (SMIL: the line lifts in gusts, more in wind) and the cloth (hems flap out from the pegs, hooked things
        swing; calm days only drift); rain gear drips. Reduced motion: no SMIL, no CSS animation
  - [ ] Not verified: real-time motion feel on a phone (only 3 headless frames checked); SMIL + CSS in Safari
  - [ ] Not verified: the motion by a reviewer (stills only); tomorrow's wind direction (assumed); a phone
- Who wrote what: all code and the hazy-sun / ridge / garment glyphs by Claude Opus 5.5 (main thread); Fable critiques only;
  Codex not used — the owner's routing (UI code → Codex sol 6.2, judged from 375 px stills, Opus redo if weak;
  glyphs stay with Claude) arrived after this PR was opened, so 6.2 is untested here. Apply it to the next UI pass.

## v8 scene/time lane — the valley plays the day — 2026-11-17 (branch `claude/scene-time-0f67a4`)
Brief: `docs/briefs/scene-time.md` (decisions by Fable). Codex (sol): astro, scrub, light. Moon drawn by Claude.
Parallel lanes (stay out): data/text (`src/data`, `compose.ts`), sheet (`WearCard`, `week/`, `DayRow`).
- [x] `src/astro/`: sun + moon position, moon phase, local→UTC (tests on 2026 eclipses / full and new moons)
- [x] Scene time at minute resolution (`useSceneTime`): scrub on the valley (touch) and the strip (mouse/pen);
      hold 6 s then rewind to now over 900 ms; "עכשיו" chip; slider role + keys; reduced motion → cut
- [x] Air follows the scrubbed minute (hourly fields interpolated); sun, glow, lit windows follow
- [x] Continuous sky light from sun altitude + cloud / wet / PM10 (`src/theme/skyLight.ts`), contrast guard,
      altitude-sweep tests; sheet stays on now
- [x] Moon geometry (`scene/moonShape.ts` + tests): true west–east place, continuous phase outline, lit limb to the sun
- [x] Moon component wired into the scene (behind the ridges, veiled by cloud, faded by far haze)
- [x] QA stills at 375 px (headless): dawn, golden, dusk, night-moon, rain morning/dusk, dust noon (`docs/design/qa/scene-time-*`)
- [x] Scrub checked in the pane with synthetic pointer/key events: drag, release → hold → back to now, keys, Escape, strip 4 px threshold
- [x] Fix: releasing pointer capture after a pointercancel threw and left the scene stuck in scrubbing
- Models: outsourcerer's `sol` alias ran **gpt-5.6-sol** (Codex) for astro, skyLight/oklab, the first scrub/strip/App
      wiring; not 6.1 or 6.2 (no 6.2 lane in outsourcerer 0.17; Codex config default is gpt-6.1-sol). Opus (main thread)
      rewrote `useSceneTime`, wrote `SceneScrubber`, `useStripScrub`, `airInput` tests and fixed 8 review bugs; Claude drew
      the moon. Verdict on sol: math/theme solid, interaction code needed rework. 6.2 not yet tried — owner wants it for
      the next UI code (fall back to Opus if weak).
- [ ] Real-finger scrub on a phone (touch-action pan-y vs vertical scroll, feel of 4 min/px)
- [ ] The 900 ms rewind seen animating (the pane throttled rAF to 2 fps, so it showed as a cut)
- [ ] Reduced motion and VoiceOver/TalkBack on a device (slider announcements)
- [ ] Golden hour on a clear day (fixture day is cloudy, so golden reads grey)

## Known gaps / polish
- [ ] Hero meta column hugs the left edge on wide phones; village dot tight against sheet edge
- [ ] Rain/dust/heat seen via `?wx=` overrides, not yet in real weather
- [ ] Screen-reader pass on a real device (VoiceOver/TalkBack)
- [ ] Lighthouse PWA/perf pass on a deployed build

## Next (proposed)
- Future idea (owner, 2026-11-17): OSM-parametric building shapes (footprint width, `building:levels`,
  `roof:shape`, colour) so each glyph matches its real building — parked, not now
- IMS (Israel Meteorological Service) warnings
- Radar (RainViewer tiles), Capacitor wrap
- Verify blend weights against observed station data (IMS station near Shadmot Mehola / Tirat Zvi)
