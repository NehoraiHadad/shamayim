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
- [ ] Gaps: (Haifa label fixed in the illustration round: label padding 2 px) OSM path not yet seen live on a small place; some curated
      heights unverified (YMCA, Tower of David, Azrieli Sarona); Haifa cooling towers' current existence unconfirmed
- [ ] Deferred: gust-triggered re-sway (snow caps done in the illustration round)

## v6.1 — place detection — 2026-11-17
Brief: `docs/briefs/place-detection.md`. Codex (sol), merged `feat/place-detection`.
- [x] Search = Open-Meteo + Nominatim in parallel (Open-Meteo/GeoNames has no Gush Etzion places; כרמי צור now found)
- [x] Settlement homes always drawn at the centre (PPL* or Nominatim village/town/city), alongside OSM marks
- [x] Overpass: 3 hosts, 12 s timeout each, failure remembered 1 h, empty answer cached 30 days
- [x] Curated data checked online with sources in comments: Báb 11 m, Dagon 65 m (moved), Shalom 142 m,
      one Bazan cooling tower; YMCA / Tower of David / Dome top / Reading chimney heights still unverified
- [x] (illustration round: tile houses ×1.25 with a limestone wash) Homes on כרמי צור were 12×6 px, ridge-coloured, under the village dot → invisible. Fix in illustration round.
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
- [x] Synagogues and water towers have glyphs (`buildingSpecs.ts`; synagogue seen on כרמי צור)
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
- [x] Verified in the illustration round (noon + dusk stills, no overlap). Mitzpe Ramon: the sun-event label (שקיעה) overlaps the westmost houses — move label or skip houses under it
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
- [x] Glyph follow-ups from the same critic: Azrieli round tower shaded in bands; Western Wall Herodian courses (illustration round)
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
- [x] PR #5 review round (code: Codex gpt-6.2-sol; review + QA: Claude Opus 5.5): a warm word can no longer sit
      beside "colder than normal" (or "קריר" beside "warmer") as a separate sentence — the gap joins the temperature
      clause with "אבל": "מעונן וחמים, עד 26°, אבל קריר מהרגיל לנובמבר ב־4°." (shown only when |gap| ≥ max(3, sd),
      so it is a real contrast, not noise); `contradictsNormal` + tests both ways, day and night. "עד/סביב/בין" are
      glued to the number with U+00A0, so "עד" never ends a line. Checked at 375 px: `climate-contrast-colder-375.jpg`
- [x] Real Shadmot normals (ERA5 1991–2020 archive, reduced by the Worker code locally): 17 Nov max 24.8 ± 3.4,
      min 13.9, gust 23.5 ± 9.1; 15 Jan 17.6; 15 Jul 37.1; elevation −175. The fixture day (26°) is +1.2° → silent,
      as it should be; the "ב־4°" in QA comes only from the synthetic `nm=` override. Reduce ≈ 5.6 ms locally, 8.2 KB
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
- [x] Seam between valley and sheet (owner: "doesn't flow"; Fable diagnosis 2026-11-18): the cut is a drawn base line
      (1 px hairline, 22% ink) and the clothesline is tied to it at both gutters on ground tabs (`.cleat`, `--ridge-near`),
      rope END_Y 0 / SAG 22, SVG pulled up onto the cut (dead strip removed). Stills `docs/design/qa/seam-*`.
      Also: the sun marker's own chip hides while the edge tag stands in for it (no double "שקיעה" at the strip edge)
- [x] Sun and moon clear the ridges (2026-11-18): 0° altitude now sits on the drawn ridge at the body's x (`ui/scene/skyline.ts`),
  and by ~15° the body joins one shared arc (ARC_Y 46 → zenith 12). Before, 0° was a fixed line at y 70 under ridges that top
  out at y 34–44, so in Karmei Tzur the sun showed only 09:00–13:30 and the moon only above ~36°. Moon phase checked: 18.11
  is 60% lit and waxing, a day after first quarter (17.11), lit side towards the sun. The scrub readout moved from the sky band
  onto the ground (it hid the sun) and takes the elevation label's place; "עכשיו" is a slim pill with a 44 px hit area.
  QA: `docs/design/qa/sky-after-1500.png`, `sky-after-2000.png`. Unverified: on a real phone.
- [x] Paper follows the sun (2026-11-18, Fable's plan): `theme/sheetLight.ts`. Two states with hysteresis (dark below −6°,
  light above −4°), following real now only (not the scrub); weather no longer decides light/dark (rainy nights get dark paper).
  Light paper warms to the dawn paper over the sun's last 10°; dark paper goes dusk #211A33 → night #12162B from −6° to −12°.
  `.dark-sheet` is driven by the same flag. Contrast swept −18°…20° for every weather in `sheetLight.test.ts`.
- [x] Seam, round 2 (Fable, from the owner's 06:06 phone screenshot): the straight full-bleed cut read as a card on a drawing.
  The paper's top is now a low drawn bank (`Sheet.tsx`, SVG in `--sheet` with a hairline contour); the clothesline's tabs moved
  up 3 px onto it. The scrub readout sits on its own dark pill 20 px up (it was clipped under the sheet's 14 px overlap).
  QA: `docs/design/qa/bank-dawn.png`, `readout-pill.png`. Unverified on a phone; the bank path is a first shape to tune.
- [x] Sun path polish (2026-11-18): the arc's base only rises (ridge at 0° → the highest ridge point, floor y 28, by 15°), so
  the path no longer dips where the ridge below it drops; below the horizon a body sinks 3 px/° and the drawn sun is kept 8% of
  a day past rise/set, so it slips behind the ridge instead of vanishing on it (moon until −4°). The scene clips only its
  sides and bottom (`clip-path`), so the noon halo spreads up behind the strip (`.sky-area` z-index 1). Scene box constants
  moved to `ui/scene/sceneBox.ts` (broke a sunPath ↔ skyline import cycle). QA: `docs/design/qa/sun-halo-noon.png`.
- [x] Readout + twilight glow (2026-11-18): the scrub readout (time, weather, temp, wind + "עכשיו") is now a pill fixed to
  the bottom of the screen (safe-area aware, 44px touch target on the button), outside the drawing, so it never covers the
  scene. The dawn/dusk glow is centred on the ridge point where the sun rises (east, `sunAt(0)`) or set (west, `sunAt(1)`)
  today, instead of a fixed side band. QA: `docs/design/qa/readout-pill.png`, `docs/design/qa/glow-dusk-west.png`.
- [x] Seam round 3 + sun arc (2026-11-18): Codex (sol, `codex exec`) and Fable both diagnosed the seam as a value jump
  (~16:1 near ridge → paper at dawn), a near-flat bank (7 px relief) and a card-like 22% stroke. Took Fable's direction: a
  flat half-tone "yard" strip (`--ridge-far` 55% into `--sheet`, 9–27 px thick, out of phase with the bank) in
  `Sheet.tsx`, stroke removed; clothesline cleats moved into it (`END_Y −6`). Brief: `docs/design/seam-brief.md`.
  Sun: `sunAt` is now one sine arc from the rise-ridge to the set-ridge y (no dip/kink at the horizon), accelerating below
  it after set. Twilight glow ramps up to each event and down after it (no pop at sunrise/sunset).
- [x] Sky colours after real skies (2026-11-18): `skyLight.ts` anchors re-drawn. The sky turns blue once the sun is up
  (was magenta-mauve until 4°); rose/orange only low on the horizon from −9° to +3° (dawn pinker, dusk more orange); the
  clear-day horizon is pale whitish blue (`clearDay` top #11519B, horizon #BBD5EC, was beige all day); ridges lose the twilight tint by
  +6° (was +10°). Per-0.5° continuity and ≥4.5 text contrast still tested. QA: `docs/design/qa/sky-real-0630.jpg`, `sky-real-1650.png`.
- [x] Sheet as a separate page (2026-11-18, owner's call): the yard strip and wavy bank felt like patches. Root cause: the
  "paper = nearest lit ground" metaphor fights aerial perspective (near land is darker), so any blend reads as a cut. The
  sheet is now its own page over the landscape: top corners 22, faint shadow upward, no bank SVG; clothesline tied to tabs
  just inside its top edge (`END_Y 6`). Also fixed: phones scrolled sideways (scene `overflow-x: clip`, body too).
- [x] Haze keeps ridges opaque (2026-11-18): the sun and glow showed through hazy ridges (far ridge faded by opacity to 5%).
  Ridges now pale by colour toward `--haze-air` (sky mid + 45% horizon) by `--far-fade` / `--near-fade` × 90%, opacity 1.
  QA: `docs/design/qa/haze-opaque-dusk.png`.
- [x] (illustration round, `seaLine.ts`) Run the sea-level dashed line until it meets the near ridge flanks, so it reads as a datum.
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
  - [x] Pass 3 (2026-11-18, owner: "draw the clothes, the rope and the joins better"): the line kinks under each
        peg's load (`rope(..., loads)` in `gust.ts`, a polyline with the loads as vertices; per-garment `weight`, the
        coat pulls hardest), a twisted-cord lay + knots round the tabs; real spring clothespins (`wear/peg.tsx`: levers,
        slit, wire spring, jaws on the cloth) at a hand-placed lean, cloth bunched in the jaws and drag creases toward
        the slack neck; each piece hangs square to the chord between its own pegs; tee sleeves droop.
        Checked at 3-4x on light + night paper in the specimen (browser pane)
  - [x] Pass 4 (2026-11-18, owner: "more detail; the umbrella's join to the rope; the animation"): hooked things
        hang from their real contact point — the umbrella's crook rests on the rope (drawn in its own frame, turned so
        the canopy hangs plumb under the hook), the bottle's ring and the hat's new chin-cord loop likewise, and the rope
        is redrawn over each hook's far arm (`over`) so it passes through; hooked things don't tilt with the line.
        Twisted-cord lay is slanted ticks (`twist()` in gust.ts, morphs with the rope). Pegs: highlight + wire coil,
        gravity folds from each peg to the hem (`hem`); crew necks show the inside back + care label; tee pocket hem.
        Motion: hooked things swing about the hook (transform-box view-box, origin 0 0) a beat behind the line; cloth
        billows (`--billow`, wider/shorter in gusts) with a small overshoot; drips ride the swing.
        Stills: `docs/design/qa/wear-line-specimen.png` (rest) + `wear-line-gust.png` (t = 0.9 s), headless Chrome with
        SMIL + CSS frozen at a time; swing checked over 3 frames (crook stays on the rope)
  - [ ] Not verified: real-time motion feel on a phone (only 3 headless frames checked); SMIL + CSS in Safari
  - [ ] Not verified: the motion by a reviewer (stills only); tomorrow's wind direction (assumed); a phone
- Who wrote what: all code and the hazy-sun / ridge / garment glyphs by Claude Opus 5.5 (main thread); Fable critiques only;
  Codex not used — the owner's routing (UI code → Codex sol 6.2, judged from 375 px stills, Opus redo if weak;
  glyphs stay with Claude) arrived after this PR was opened, so 6.2 is untested here. Apply it to the next UI pass.

- [x] Few clouds were invisible (owner: "what does a few clouds look like?"): the shader threshold assumed fbm ~0.3–0.7,
      but measured on the GPU it sits in 0.22–0.6 (median 0.34), and `cloud()` smoothstepped 20% cover to 0.04.
      Now coverage = cover/100 and `t = mix(0.62, 0.20, cov)`; cloud alpha 0.6+0.3·cov. 20% = a couple of separate
      clouds, 45% scattered, 80% mostly covered. Stills: `docs/design/qa/clouds-20.png`, `clouds-45.jpg`, `clouds-80.jpg`
      (offscreen render of the shader over the page; the browser pane was hidden so the live loop did not draw)
  - [ ] Not verified: on a real phone (mediump hash precision may shift the noise range a little); night clouds

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

## View from above — radar + satellite clouds — 2026-11-18
- [x] Sources researched (live, 2026-11-18): RainViewer past radar (free tier since 2026: past 2 h only, no nowcast,
      zoom ≤ 7, Universal Blue only, personal/educational licence); EUMETSAT EUMETView WMS (`msg_fes:clm` cloud mask,
      15 min, ~20–35 min late, CORS open, "© EUMETSAT"); OpenFreeMap Positron basemap. NASA GIBS checked: its
      geostationary layers are GOES/Himawari only (Israel not in view); MODIS/VIIRS true colour is 1–2 passes a day
- [x] Satellite corrects now (`src/domain/observedCloud.ts`, `src/data/overhead/useObservedCloud.ts`): a 12×12 px
      cloud-mask sample ~30 km around the place every 10 min; the difference from the model, weighted by age
      (full ≤ 40 min, none at 100 min), capped ±40, fading to zero over 2.5 h; sky codes 0–3 follow the corrected cover
- [x] Page "מבט מלמעלה" (`src/ui/overhead/`), design by Fable (`docs/design/overhead-brief.md`), UI code by Codex
      gpt-6.2-sol; fixes by Claude Opus 5.5: Hebrew labels were mirrored (MapLibre RTL plugin, served from
      `public/vendor/`), clouds were 4 km blocks (blur 3 px on padded tiles), white clouds vanished on white land
      (sand land `#E2DDD2`, deeper water). Entry row at the top of the sheet when rain is due within 3 h, else a quiet
      link at the end. MapLibre is a lazy chunk (273 kB gz) loaded only on open
- [x] Headless phone stills: `node scripts/shot.mjs <url> <out.png> [waitMs] [clickText]` (the preview pane throttles
      rAF while hidden). Stills: `docs/design/qa/overhead-v1.png` (before fixes), `overhead-v4.png` (after)
- [ ] Not verified: a real rainy radar frame (dry today; recolour tested only on synthetic pixels); dark sheet at night;
      a phone; whether the no-echo legend "אין גשם במכ״ם" shows once radar loads
- [x] Rain in plain words (owner: "not 'rain on radar' — tell people what will happen"): `src/domain/rainNowcast.ts`
      finds how the rain moved between the newest RainViewer frame and the one 30 min before (best-overlap shift on a
      ~4 km grid around the place, a 256 px image centred on it), carries it forward ≤ 90 min and says when it
      arrives, how long it lasts, or where it is and which way it goes; `rainSentence.ts` turns that into Hebrew;
      the model's first rainy hour fills in only when the radar sees nothing close. Shown at the top of the page and
      as the sheet's entry row. Checked live (London, Paris, Munich, Glasgow, Seattle). Written by Claude Opus 5.5
- [ ] Not verified: the nowcast over Israel on a rainy day (does RainViewer cover IMS radar well?); motion is in whole
      cells (~8 km/h steps); a row with a long story on a phone
- [x] Single clouds the satellite sees (owner's photo, 18.11 16:27: one sunset-lit cloud over an almost empty sky; the
      models said 40–45%, the satellite ~5%, so the scene drew nothing). `src/domain/cloudSightings.ts` finds the
      connected cloud patches in a 24×24 px mask over 60 km (cover still read from the middle 30 km, unchanged), with
      direction, distance and width; `ui/scene/cloudSeen.ts` places up to 3 in the scene (x = the sun/moon azimuth
      projection, height from distance at an assumed 2 km base, width as seen); the air shader lifts its noise there
      (`seenLift`), so fbm still makes the edges and the afterglow/sun light them. Only for "now", only under 50% cover,
      fading with the image's age; north (behind the picture) left out. Dev: `?seen=az:km:width,...`.
      Stills: `docs/design/qa/clouds-seen.png` (16:27 without / with the patches the mask had at 16:15, and midday)
- [x] Fresher satellite: a slot is served ~15 min after its time (measured: 14:45 out at 15:00), not 30; the hook now
      tries the newest that may be out first, polls every 5 min but asks only for a slot newer than the one it holds,
      and checks again when the app comes back on screen or online
- [ ] Not verified: on a phone GPU (headless swiftshader draws all clouds faint); whether the mask's ~4–5 km pixels
      miss small cumulus often; cloud-top height (`msg_fes:cth`, same 15 min) could set the height instead of 2 km
- [ ] Later: proxy RainViewer/EUMETSAT through the Worker cache; NASA MODIS/VIIRS "photo of the day" layer (offered)


## Rain map UX — 2026-11-18 (plan: `docs/design/RADAR-UX-PLAN.md`)
- [x] Reviews: `docs/design/radar-ux-fable.md` (design, Fable), `radar-ux-tech.md` (engineering); merged into the plan
- [x] A1 Splits, no visible change: `mapPaper.ts`, `useSwipeClose.ts`, `overheadStatus.ts` (+test), `geo.ts` (+test)
- [x] A2 Outlook truth: `outlookNow` re-ages every minute and drops the outlook once the newest radar frame is over
      45 min old (before, offline kept "rain in 25 min" forever); `rainOutlook` gains `approach` (where the arriving
      rain is at frame time)
- [x] A3 `?rain=` fixture (`src/data/overhead/syntheticRain.ts`, DEV only, not in the production bundle): synthetic
      discs drive the real nowcast and are painted as Universal Blue tiles through the real recolour. Stills:
      `docs/design/qa/radar-fixture-{arrive,here,pass,far,still,none}.png` (night sheet)
- QA in this cloud sandbox: run vite with `VITE_WEATHER_API_BASE=https://shamayim-api.nehoraihadad.com` (Open-Meteo
  answers 429 here) and give Playwright's Chromium the agent proxy
- [x] B4 Verdict: `src/domain/rainVerdict.ts` (headline + detail + basis, 14 states, replaces `rainSentence.ts`); the
      headline is the dialog's h2 and takes focus; page renamed "מפת גשם ועננים"; the sheet's row shows the headline
- [x] B5 Time: "21:40 · לפני שעה וחצי" (clock first, `agoText` rounding), rail end labels, 24 px thumb; ages line gone
- [x] B6 Playback: timer chain (`playbackPlan.ts`), 400 ms a frame, rests on the newest; play/pause loops ≤ 3; reduced
      motion: no autoplay, one pass at 800 ms. The headless rAF stall seen in A3 is gone with the rAF loop
- [x] B7 Place disc + name, ring ink #4F6578 / #9DB0C4, "50 ק״מ" (25 after zoom). Ring labels at the EAST point,
      not south as planned: the south point collided with Jerusalem's label
- [x] B8 Rain ladders light/dark (Fable's values), slate cloud veil at night, theme change reloads weather tiles,
      `radarWash.contrast.test.ts`; legend lists clouds. Stills `radar-ux-day.png`, `radar-ux-night.png`
- [x] C9 Motion arrow (`motionArrow.ts`, newest frame only). Stills `radar-ux-arrow-{arrive,pass}.png`
- [x] C10 Hidden map sentence, canvas label; checked in Chromium's accessibility tree and Tab order
- [x] D11 Edge chip toward rain off the map (≤ 265 km, `edgePointer.ts`). Still `radar-ux-pointer.png`
- [x] D12 Entry row: headline + "למפת הגשם ‹" (done with B4)
- QA opens the page by clicking `[data-overhead-entry]` (the old click text "מבט מלמעלה" is gone)
- [ ] Not verified: a real rainy day (Israel coverage, clutter, real motion, wash alphas on real tiles); VoiceOver /
      TalkBack on a device; a real phone; a real sunset theme change while the page is open (the tile reload was
      checked by toggling the class by hand)
- [ ] Later, decided on a rainy day: nowcast frames on the rail (rejected for now), the 60-min motion baseline, and
      using the strongest band near the nearest echo (its edge reads "light" for a heavy storm)
## Illustration round — snow, small fixes, sun/moon — 2026-11-18 (branch `claude/illustration-round-81b0d0`)
- [x] Snow caps (`snowLine.ts`, `SnowCap.tsx`): only while it snows (codes 71–77, 85–86 or snowfall > 0); snow line =
      min(place, place + (T − 2 °C) / 6.5 °C·km⁻¹) − up to 100 m with intensity, mapped through the sampled ridge
      heights (Shadmot: below-sea scale); ragged gully edge, fades in over 2.4 s; labels go dark ink on snow
- [x] Sun at noon on a high ridge climbs ≥ 48 px above the arc base (`skyline.ts` MIN_RISE)
- [x] Moon x linear in azimuth, so its arc no longer folds back and drops/climbs straight at rise/set (`moonShape.ts`)
- [x] Mosques no longer flip with the sun: fixed form per mark (curated as drawn, generic by seed); off-side sun lit by the rig
- [x] כרמי צור houses larger + limestone; label padding 2 px (Haifa); Azrieli drum bands; Western Wall Herodian courses
- [x] Sea-level line runs from flank to flank of the near ridge when the valley floor is below it (coast keeps 96–276)
- [x] QA: `docs/design/qa/stills.mjs` (headless Chrome, 375 px at 2×, reduced motion) + `sheet.py`; stills in
      `docs/design/qa/round/` (before-*, after-*, snow-*)
- [ ] Skipped: Tiberias dot ~12 px above the sheet on a 1.3 slope (needs terrain/placement change, not a glyph fix)
- [x] Village houses (tile, flat, blocks) no longer mirror with the sun either: form by seed, off-side sun via the rig
      (`SunStrip` in `LightRig.tsx`); stills `houses-am-*` / `houses-pm-*`
- [ ] Not in data: snow depth on the ground after snowfall stops (Open-Meteo `snow_depth` not fetched); light snow
      at +3 °C on כרמי צור shows no cap (line above the summit), by design

## 2.5D scene spike — sun lighting on the ridges — 2026-11-18 (branch `claude/scene-2-5d-spike-e73d4b`)
Flag: `?scene=25d` (read once at load, works in production, default off; without it the scene markup is unchanged).
- [x] Design plan `docs/design/scene-2-5d-plan.md` — Fable (native Agent). First element: ridge lighting; clouds
      (low/mid/high) and gyro parallax ("lean") come later, parallax last (iOS permission prompt)
- [x] Technical plan + frame/battery budget `docs/design/scene-2-5d-tech.md` — Codex gpt-6.2-sol (outsourcerer).
      SVG, not GL: pure TS over <=41 points per ridge, recomputed per shown minute, zero per-frame work, no network
- [x] Build — Codex gpt-6.2-sol: `ridgeLighting.ts` (crescent, terminator, rim geometry), `ridgeLightTone.ts`
      (oklab tone, contrast caps, nulls), `RidgeLight.tsx`, App/ValleyScene wiring, two test files
- [x] Review fixes — Claude Opus 5.5: light height from the true sun altitude ×3 (the drawn disc gave ~24° at
      dawn and lit every flat top, no terminator); bands taper to a point (were cut square); wiring moved to
      `useRidgeLighting.ts` (ValleyScene back near its old size)
- [x] Owner feedback from the phone: "the light should be softer, the lines are too sharp" — the wash's lower
      edge and the rim are blurred (static SVG blur, depth/4 px), the skyline stays crisp via the clip
- [x] Nulls checked in the DOM: no overlay at night (21:00), overcast (`wx=cloud:95`), heavy haze (`wx=vis:2`)
- [x] Stills `docs/design/qa/25d/before-*.png` / `after-*.png` (06:40, 11:40, 16:25); tsc, 418 tests, lint, build
- [x] Clouds lit from the sun's side (plan §7.2), same flag. Base — Codex gpt-6.2-sol: `ui/sceneFlag.ts`, shade
      offset toward the sun, painted body/edge steps, `uWarm`. Physics pass — Claude Opus 5.5 (`atmo/gl/cloudLight.ts`,
      `airShader.ts`): shade re-centred so each cloud splits into a sun-facing and a self-shadowed half; sun face
      brighter than the sky and more opaque; thick cores darker (optical depth); low-sun reddening on the high layer
      (half on the low one); forward scattering: thick cloud before the disc darkens, thin edges get a silver lining;
      near noon the sun is behind the viewer (faces north) so light comes from above and clouds go flat and bright
- [x] Production fix (owner approved): `atmo/layout.ts` now reads `[data-sun="up"]` for everyone, so the air sees
      the disc again (sun bloom and rays return). Stills `bloom-compare.png` (left before, right after, 06:40 / 11:40)
- [x] Found: `atmo/layout.ts` took the first `[data-sun]`, the hourly strip's sunset mark, so `L.sun` was null and
      the air never saw the disc (sun bloom/rays likely off in production too). Fixed under the flag only
      (`[data-sun="up"]`); production unchanged until signed off
- [x] Stills `docs/design/qa/25d/clouds-before/after-*.png` + `clouds-compare.png` (`wx=cloud:70`); tsc, 421
      tests, lint, build
- [x] One sun for the whole scene ("a world", owner) — Claude Opus 5.5, `ui/scene/sceneLight.ts` (+ tests):
      light colour from Kasten–Young air mass × Rayleigh/aerosol depth per channel (white at noon, orange ~5°,
      red at the ridge); the disc drawn from it (hot core, limb darkening stronger in blue, refraction squash
      near 0°, halo in the sun's colour); houses' and landmarks' lit faces take that colour (`--sun-light`);
      anything whose ground is in a ridge's shadow goes flat (the village sits in the Gilead's shadow at 06:40,
      lit at noon); cast shadows lengthen as the sun drops. One shared terrain shadow test (`clearanceOf`)
      for ridges and marks. Stills `world-after-*.png`, `world-compare.png`; tsc, 426 tests, lint, build
- [x] Owner: "the halo is hard" and "the colour jumps from yellow to red" — the hard 6 px ring is gone (soft
      aureole only); the disc colour is tone-mapped like the eye (a bright sun saturates to white-yellow) and
      drawn from the true altitude from its first moment (it used to fall back to the yellow disc until the light
      reached the land, then snap). Sequence `sun-colour-sequence.png` (06:25→08:30, 16:05→16:30); 427 tests
- [x] Owner: "is a sunrise sun the same as a sunset sun?" — no; they differ by their air. The sun's colour now takes
      the shown hour's aerosol: optical depth from visibility (Koschmieder 3.912/V less Rayleigh, ×1.5 km mixed
      layer), Ångström 1.3 for fine haze (reddens) vs 0.3 for desert dust (greyer, dims); tone-mapped against the
      brightest channel (the eye adapts); the aureole widens with aerosol. `haze.visibilityKm` added to AirState.
      Stills `aerosol-compare.png` (left 40 km, right 8 km; 06:40 / 16:20)
- [x] Heavy haze (Claude, Opus 5.5): no more on/off cutoff at farFade 0.5. `hazeDirect` (sceneLight) = the share
      of direct sun the hour's aerosol lets through vs clean air, exp(−Δτ·m); it scales the ridge light, which fades
      out smoothly (gone below 8 %). Still `heavy-haze-flat-vs-lit.png` (vis 4 km, 07:30)
- [x] Afterglow on clouds (Claude, Opus 5.5): from 3° above to 5° below the horizon the scene publishes
      `data-afterglow{,-x,-rgb}` (`ui/scene/afterglow.ts`); `layout.ts` reads it into `L.afterglow`;
      `gl/afterglowLight.ts` sets uAfter/uAfterAt/uAfterCol. In the shader, clouds take light from under the
      horizon below the glow, gold → pink as the sun sinks, gated by height: Earth's shadow climbs, clouds by the
      ridge (~3 km) go grey by ~1.5° below, the top of the sky (~10 km) by ~3.5°. Dawn mirrors it.
      Still `afterglow-sequence.png` (flat 16:46 | lit 16:40, 16:46, 16:52)
- [x] Split (Claude, Opus 5.5): `useSceneSun` (disc look, world light, marks' sun x, afterglow), `FarLand`,
      `useWidth` out of ValleyScene (171 → 154); cloud GLSL into `gl/cloudShader.ts` (airShader 141 → 81)
- [x] Production (Claude, Opus 5.5): the lit scene is the default; `?scene=flat` brings back the old one
- [x] Stars (Claude, Opus 5.5, owner: "stars appear too early"): three brightness classes (`ui/starField.ts`):
      5 brightest from −4.5° (full −8°), 15 from −7° (full −12°), 26 faint from −11° (full −17°); used to be the whole
      field from −4°. Twinkle from −10° (was −6°). The moon was checked and is right: 18.11 is a 60 % waxing gibbous,
      rising ~12:50, so it really is up in the afternoon
- [x] Earth's shadow + belt of Venus (Claude): `gl/twilightShader.ts`, opposite the sun from +1.5° to −7°;
      the blue-grey band climbs ~1.1°/° of sun depression, pink band above. Still `earth-shadow-belt.png`
- [x] Sky from the hour's air (Claude): `theme/skyAir.ts` whitens a hazy day horizon (Mie, dust buff) and reddens
      the horizon at a hazy sunrise/sunset with the sun's own colour; lit scene only (`skyLight({ air })`)
- [x] Moonlight (Claude): `moonlight.ts` strength = dark sky × fraction^2.5 (phase law) × height × cloud/haze;
      owner: "the crest line is hard, light is soft" → no crest line (a bright line only with the moon behind the
      ridge); a faint translucent wash (9 % × strength), blurred, on faces toward the moon;
      cloud edges toward the moon silvered (`uMoon`, `data-moon-light`). Still `moonlight.png` (24.11 22:00)
- [x] Crepuscular rays (Claude): `gl/raysShader.ts`, low sun + 15–90 % cloud, lit and shadow shafts fanning from
      the disc; one noise lookup a pixel (no ray marching, for battery). Still `crepuscular-rays.png`
- [x] Snow and mist take `--sun-light` (Claude): gold/rose snow at a low sun, white at noon; mist lit the same.
      Still `snow-sunlit.png` (flat | 06:35 | 12:00)
- [x] Ridge shadow on the valley floor (Claude): `FloorShadow` + `shadowRuns.ts`, a soft band along the ground
      where the land toward the sun hides it, as deep as the light it takes. Still `floor-shadow.png` (06:35, 07:05, 15:55)
- [x] Sampled places checked (Claude): `SHOT_PLACE='<Place JSON>'` in `scripts/shot.mjs` opens any place; Jerusalem,
      Eilat, Majdal Shams at dawn/noon/dusk/night hold up. Snow made to read everywhere: nearly opaque (.82–.98),
      whiter, drawn under the ridge light and floor shadow so caps take the same sun and shade; floor shadow
      blue-black, wider blur, slivers < 12 units dropped (they were grey blots on snow). Still `sampled-places-snow.png`
- [x] Lying snow (Claude): hourly `snow_depth` (m, ICON + ECMWF blended) → `HourPoint.snowDepth` → `AirInput.snowDepth`;
      `snowFall` caps while snow lies ≥ 1 cm, after the fall too, melting as the depth does; the cover reaches
      100 m + 300 m × (depth/30 cm) below the place. `falling` flag: only falling snow thickens the air (heavy haze).
      Dev `?wx=depth:0.3`. Still `snow-lying.png` (Majdal 40 cm | 3 cm, Jerusalem 10 cm morning | dusk)
- [x] Big cities keep their blocks (Claude): `placeHomes` no longer drops a large place's houses when an OSM high-rise
      stands within 1 km (Petah Tikva showed 4 lone towers on an empty hill). High-rises within 0.6 km are absorbed
      into the cluster like a minaret; further ones stand beside it. Still `city-blocks-with-towers.png` (Petah Tikva, Ramat Gan)
- [ ] City skyline redesign: plan in `docs/design/CITY-SKYLINE-PLAN.md` (Fable, reviewed). Hybrid: real towers at their x +
      a built-form grid from OSM for extent/density/height; villages unchanged. Phase 1 done 2026-11-18 (Codex gpt-5.6-sol wrote P1.2–P1.4, Claude reviewed): high-rises never make houses give way,
      `REACH.blocks` 40/24, `shortlist.ts` keeps 8 + 12 high-rises (3 km band, unnamed > 260 m dropped), large places
      reserve their 2 tallest towers within 3 km (cap 6). Still `city-phase1-after-before.png` (left after, right before:
      Petah Tikva shows Kiryat Arye behind its blocks; Ramat Gan's blocks fill round the Bursa towers).
      Phase 2 done 2026-11-18 (Codex gpt-6.2-sol wrote C1–C4 + C6, Claude fixed the height chain and tuned C5): a
      built-form grid per 0.1° cell (`public/data/city/il`, 280 cells, 678 KB, cell budget 24 KB) from the extract
      (`scripts/city/build.ts`, workflow step after landmarks); `useCity` → 188 near columns × 3 depth rows;
      `composeCity` packs blocks along the real built extent (gaps 0–3 px: a 1.5–2 km deep strip of >= 12 % cover is an
      opaque silhouette; storeys from measured levels, a taller block now and then capped by the p90 height; budget 96).
      City mode only where mapped footprints back the dot (Umm al-Fahm keeps its cluster). C0 table in the plan §8.
      Still `docs/design/qa/25d/city-phase2.png` (Petah Tikva, Ramat Gan, Bnei Brak, Be'er Sheva, Karmei Tzur, Umm al-Fahm).
      Not done: night stills; the dark translucent boxes on hill slopes predate phase 2 (seen on main too).
      Phase 3 done 2026-11-18 (Codex gpt-6.2-sol wrote S1 + tower placement, Claude wrote the mass and integration):
      one height law `skyHeight = clamp(2.2·√m, 4, 34)` px for blocks and towers (`cityHeight.ts`); real towers from
      the cells' `t` lists (>= 100 m, dy ±5 km) at their true x and depth row (`towers.ts`, `cityTowers.ts`: prominence,
      2 reserved within 3 km, cap 10 at 375 px +2 per 150 px, max 16, curated dedupe 250 m); blocks beyond ±1.5 km of
      the dot merge into one path set per row (`city/massPath.ts`, `CityMass.tsx`: walls, sun face, roofs, day panes,
      night lights by `litShare`); budget 144 blocks at 375 px. `scripts/shot.mjs` takes `SHOT_TIME` for day/night stills.
      Still `docs/design/qa/25d/city-phase3.png` (top day 10:00, bottom night 21:00).
      Not done: S5 DOM budget test, S6 owner look test. Codex runs must pin `-m gpt-6.2-sol`
      Phase 4V (villages from data, plan §10, branch `city-phase4`):
      - [x] V0–V2 (9854c8f): v2 cells (form byte, place nodes), client clusters, home tier A/B/C
      - [x] V3: tier-A villages draw rows from their mapped footprint (`villageExtent.ts` `villageRows`, `homeMode.ts`):
            width = max(width law, template width), pitch 0.7×, rows by N–S band rank seated like the template
            (sink = row·ROW_STEP), reach ×2, a 10.5 px gap at the dot only on the crest row. Karmei Tzur is tier A
            from data (no hardcoded template). Checked in the pane: Nahalal, Yagur, Ein Mahil, Daliyat, Mizra, Karmei Tzur.
            Known: Daliyat gets `tile` (no tagged worship nodes, faith 0); Karmei Tzur sparse on its steep face
      - [x] V4 (6214eeb): sheds at the outer end of big-roof runs (not on the crest row by the dot), house size by
            footprint class, storeys by levels (two-storey drops to one under the dot)
      - [x] V5 (ff505ca, Codex): neighbouring clusters at true x, rows by centroid dy, pitched/flat mass
      - [ ] V6 marks inside neighbours: owner deprioritised (2026-11-18) · V7 (owner yes) · V8 owner look
      - [x] F1+F2 (Codex): `far.json` (36.6 KB, from the near cells: 500 m × 1 km grid + towers >= 80 m) built by
            `scripts/city/far.ts`; `FarCity.tsx` stepped silhouette, slabs, night glow on the far ridge where the near
            ridge does not hide it; far x = 187.5 + 6.25·dx, the far ridge samples dy = 0.
            NOT seen in the pane: the elevation API was rate-limited on 2026-11-18 (generic terrain, no far ridge).
            Check Rosh HaAyin / Modi'in at night when it is back
      - [ ] Then F3, F5, F6
      - [x] Search: places in the land sort first (ערד Negev before ערד Romania)
- [x] Rays as in reality (Claude), `gl/raysShader.ts`: need part of the sun hidden + aerosol (`beamAir`: some haze
      helps, heavy drowns) + facing the sun. Disc up: any hour with 12–95 % cloud (low sun stronger, midday/behind-
      viewer weaker); where shafts go is read from the real cloud field on two rings round the disc (`cloudAt` in
      cloudShader, shared `cloudWarp`), a fine angular pattern splits gaps into shafts; faint while the disc is clear,
      full when it is behind cloud. Disc down (3° to −6.5°): twilight rays from below the skyline, gold/pink with
      blue-grey shadow bands, from clouds past the horizon or (hazy air) the ridge, even with no cloud. Cost: 3 cloud
      lookups a pixel only while disc rays are on. Still `rays-real.png` (clear sun | noon hidden | after sunset
      cloud | after sunset hazy clear | dawn | clean clear = none)
- [ ] Owner judges on the phone (outdoors, dawn/dusk/night). ValleyScene is 160 lines (split further if it grows)

## Place search — local region names — 2026-11-18
- [x] Search finds villages OSM maps only as `landuse=residential` with a settlement `addresstype` (e.g. מעלה חבר)
- [x] Region label is local, not the API's: `src/data/region/` — land outline (no Gaza/Sinai/neighbours) +
      nearest of ~230 settlement anchors in 25 regions (גולן, גליל, שומרון, בנימין, גוש עציון, הר חברון, בקעת הירדן…)
- [x] Applied to search (Open-Meteo + Nominatim), GPS reverse lookup and saved/recent places on read
- [x] Never "הגדה המערבית": niqqud stripped, foreign naming mapped to יהודה ושומרון outside the anchors' reach
- [ ] Tune anchors if a place lands in the wrong region (add a settlement to `anchors.ts`)
- [x] Places inside the land use Asia/Jerusalem (OSM results used to carry the device's timezone)
- [x] Fixed 2026-11-18: live forecast down for every place — app asked for hourly `snow_depth` (743d753), Worker
      allowlist did not; Worker redeployed. `src/data/openMeteo/workerContract.test.ts` now runs the app's real
      request URLs through the Worker validator, so a new parameter without a Worker change fails CI


## Horizon panorama — the land as you really see it — 2026-11-18
Branch `feat/horizon-panorama`. Stills in `docs/design/qa/horizon/` (`before-*` = main e83e485, `after-*`, 375 px, DPR 2).
- [x] Land = horizon panorama from the place (`src/data/terrain/panorama.ts`): 201 rays across the scene's own
      azimuth span (305° at x 0, south in the middle, 55° at x 375, as `skyPoint`), 127 samples each out to 60 km;
      angle = atan((h − eye − d²(1−k)/2R)/d), R 6371 km, k 0.13, eye 2 m above the DEM ground. Near layer = highest
      within 5 km, far layer = highest at any distance (where it is not higher the near ridge hides it)
- [x] DEM: AWS Terrain Tiles (terrarium), zoom 10 within 12 km + zoom 8 beyond, decoded without a canvas
      (DecompressionStream + PNG unfilter, `dem.ts`; a canvas read can be noised by anti-fingerprinting). ~6–8 tiles,
      0.3–0.6 MB once per place; stored packed (`shamayim:horizon:v2:<id>`, ~9 KB) forever. Why not Open-Meteo through
      the Worker: it counts each point as a call, so 650+ points per place would hit the 600/min limit on the Worker IP.
      The Worker is unchanged (no deploy needed); `/v1/elevation` is no longer called by the app
- [x] Sea floor: tiles carry bathymetry (−20 m 1 km off Tel Aviv), raised to 0 except inside the Jordan rift box
      (Kinneret, Jordan Valley, Dead Sea keep their real depth). Sea in view = ≥ 20 % of a side's rays reach sea ≤ 8 km
- [x] One vertical scale for land and sky (`angleScale.ts`): px = 86·sin(a) + 50·tanh(a/6°) → 9.8 px/° at the
      horizon (6.5×), the sky above keeps its shape, zenith ~136 px above eye level. Options shown in
      `relief-options-*.png` (true 1.5 px/° is a 6 px strip; `mid` 6.5 px/°; `high` 9.8 px/°, chosen); `?relief=` in dev
- [x] Over a panorama the sun and moon stand on eye level (`horizonY`), not on a line between ridge points, so a body is
      hidden exactly when its altitude is below the drawn ridge. Refraction (Sæmundsson) lifts both; the sun is placed
      by its top edge. Twilight glow stands where the sun really comes over / goes behind the ridge (`sunOverRidge`)
- [x] Shadmot: the panorama replaces the hand drawing (kept as the stand-in while loading/offline). Measured: Gilead
      3.4–4.1° at 9–13 km east, western hills 2.5–3.9° at 1–2 km. Sun on 18.11: flat sunrise 06:12, over the Gilead
      ~06:29; behind the western hills ~16:20 (flat sunset 16:35) — `shadmot-rise-set-sequence.png`
- [x] Snow line per direction on each slope (`snowEdge`, mask follows the land), village dot on the near ridge due
      south, sea line where sea level meets the slopes (below sea level) or the coast (Tel Aviv: sea west)
- [x] Tests: synthetic DEM (hill at bearing/distance → expected angle; curvature hides a far hill; near vs far),
      PNG decode (filters 0/2, below-sea and fractional heights), sea side, snow edge, sun over a 4° wall later
- [x] Follow-ups (owner asked): landmarks by true bearing (`bearingOf`) on the ridge in their own direction
      (`sightLayer`: near ridge ≤ its distance + 1 km or ≤ 2 km; far only where the far horizon shows and the mark is
      within −4/+3 km of it; else hidden; north quarter out of view). OSM pick by bearing too (cache `landmarks:v3`).
      Curated fixed-x marks: homes keep their spot by the dot, ones behind the viewer (Shadmot palms) keep their x,
      the rest go by bearing (Shadmot orchard → flat floor east). Low fixed marks no longer dropped near the sides.
      Visible sunrise/sunset per day (`withVisibleSun` → `DayPoint.visibleSunrise/Set`): strip marker and pill, scene
      label, twilight glow, day detail "אור יום". Shadmot 18.11: 06:30 / 16:16 (flat 06:12 / 16:35); Tiberias sunset
      15:30 under the western slopes. Still `followups-bearing-visible-sun.png`
- [x] Decided (owner, 2026-11-18): sky theme and sentences stay on the flat sunrise/sunset. The sky's colour follows the
      sun's true altitude (dawn light fills the sky while the sun is still behind the Gilead); the sentences use sunrise
      only as the night/day boundary of the forecast windows. Direct light on the land already waits for the real ridge
- [ ] Not verified: real sunrise in Shadmot against an observation; mist band still fixed y 72–105
- [x] Owner (2026-11-18): computed Shadmot accepted; relief left to Claude → `high` kept (land reads at phone size; `mid` is near flat)


## Sunset behind the hill: wording — 2026-11-19
Branch `feat/visible-sun-wording`. Design and decision in `docs/design/VISIBLE-SUN-WORDING.md`, stills in
`docs/design/qa/visible-sun/`.
- [x] Haifa said "שקיעה 15:48" (Carmel hides the sun at the geocoder point) against 16:37 in every calendar. Owner:
      "זריחה"/"שקיעה" always mean the calendar time (strip markers, edge pill, screen-reader list, "אור יום", scene
      label); the time behind the land is shown only by the scene (disc, glow, light), with no extra number or words
- [ ] Not done on purpose (owner, too much data): second time in the chip, "שמש ישירה" row, elevation line, scrub phrase



## Moon visibility — 2026-11-18
- [x] Cloud veils the moon only from 40 % cover up (smoothstep 40→100 %; overcast hides it). It used to fade from the
      first cloud (50 % → 0.55, 70 % → 0.25), and the hour's cover counts thin high cloud and is one number for the
      whole sky, so the moon kept fading for no visible reason. Cloud layers (low/mid/high) would be better but need
      the Worker allowlist + `wrangler deploy` first — not done
- [x] Day moon: 50 % (half) to 80 % (full) of its night strength instead of a flat 35 %, near-white not pale blue,
      seas faintly kept; hidden by day only as a thin crescent (< 15 %) or above 85 % cloud
- [x] Cloud layers for the moon (owner asked; Worker deployed 2026-11-18, app query checked 200 end to end). Step 1 done on `main`: Worker allowlist takes `cloud_cover_low/mid/high`
      (hourly + current). Step 2: **deploy the Worker** (README, "Order when the app asks Open-Meteo for something new").
      Step 3: merge branch `feat/moon-cloud-layers` (the app asks for the layers) only after the curl check gives 200.
      On the branch: hourly + current `cloud_cover_low/mid/high` → `thickCloud` (low and mid as independent layers,
      capped by the satellite-corrected total for "now"); the moon and its light on the ridges go by `moonCloud`
      (thick cloud in full, thin high cloud for a fifth). Older cached answers without layers fall back to the total
- [x] Checked: the moon rising before sunset is real (first quarter → full). Test `moonrise through the month`:
      Shadmot Nov 2026 rises 06:14 new moon, 12:20 first quarter, 16:15 full, 23:02 last quarter. Still `moon-visibility.png`

## Plain seen from above — 2026-11-18 (branch `plain-view`)
- [x] Panorama v3 keeps a per-ray visibility profile (angle of the ground at each sampled distance, seen or hidden);
      stored ~57 KB per place. A third projection layer, `plain`, places targets beyond the near ridge at their true
      apparent angle when their ground (or top) is seen. Karmei Tzur: Kiryat Gat x 52 y 100, Ashdod x 14, Ashkelon x 41
- [x] Far city on the plain: built cells along each seen ray as pale patches (day, ≤ 3 paths) and amber dots (night,
      ≤ 2 paths); shortlisted landmarks on the plain at their true y
- [x] Haze by distance: Koschmieder contrast exp(−3.912·d/V), V = hourly visibility with dust, no 40 km cap; cut
      under 5 %. Night lights use the contrast over 3× the range (Allard: lights carry ~3× the daytime range)
- [ ] Not verified: real visibility values from Open-Meteo at Karmei Tzur (forecast API rate-limited today); by day
      at V≈60 km the plain is near-invisible (physically right; seen only on very clear days)
- [ ] Open (owner thinking): the sea-level line below sea level (Shadmot) reads as "sea under the village" — the home
      glyph sits on the near hill while the line is measured from the eye on far slopes. Options: drop it below sea
      level (keep "−159 מ'"), or draw it on far slopes only with "פני הים (159 מ' מעליך)"
- [ ] Next: camera rotation around the place (owner asked; needs 360° rays + design calls for the home and the sun arc)

## Panorama near skyline + sun-side swap — 2026-11-19
Plan by Fable (`docs/design/PANORAMA-SKYLINE-PLAN.md`); code by Codex gpt-6.2-sol (commits 6b0ff1d…90ffabf); sun-side fix by Claude.
- [x] Panorama shows the built mass really seen along each true-bearing ray, 0.4–6 km, three depth bands, true apparent
      angle (curvature + refraction), roofline eye ΔE, running-max occlusion; towers at true angle; night lights ≤ 220.
      Files: `terrain/sightProfile.ts`, `city/{rayWalk,cityRaster,skylineHeight,skylineData,skylineRay,skylineTowers}.ts`,
      `ui/scene/marks/city/{Skyline.tsx,skylinePaths.ts,skylineLights.ts}`. Cross-section mode unchanged.
- [x] Stills: `docs/design/qa/skyline/{before,after}-*.png` (Tel Aviv, Petah Tikva, Haifa, Jerusalem, Modi'in, Yagur; day+night).
- [x] Bug "houses rotate" (כרמי צור, late morning): when the sun crossed the cluster's x every house swapped its lit face
      in one frame. Now `sunLightOf` (LightRig.tsx) gives the side and a light share k = min(1, sin δ / sin 30°)
      (CSS `--sun-k`): the lit face, cast shadow and strip dim to the wall tone as the sun crosses behind the cluster,
      swap side at k ≈ 0, and brighten on the other side. SettlementGlyph + CityMass. Stills `docs/design/qa/sun-side/`.
- [x] Checked Tel Aviv towers: physically right (e.g. 118 m at 0.41 km = 15.9°, Azrieli Spiral 350 m at 1.46 km = 13.5°);
      the tallest top stays ~12 px under the hourly strip. Needles come from the land's 6.5× vertical scale, by design.
- [x] Elevation label: halo in the land tone (`.depth`), readable over the skyline.
- [x] MarkBuilding (landmarks) uses `sunLightOf` + `--sun-k` too; the 'w' / 'top' / 'e' jumps and SunStrip's `top` are gone.
- [x] Dev-console 403s are @fontsource files the worktree's Vite server refuses (node_modules outside its root):
      dev-only, absent in builds. 429s are the forecast API rate limit while QA reloads many places.

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

## Canvas scene release — 2026-11-20
- [x] Merged `ccr-85ec24f0-9ayxgu` (C0–C10, uniform vertical scale, sea-level fixes, sky life) — PR #7
- [x] Forecast Worker deployed with the scene hourly fields + 250 hPa air; both plan checks answer 200
- [x] `ASK_SCENE_HOURLY = true` — PR #8 (test now checks the default asks for them)
- [x] Landmarks workflow re-run (290b790); `public/data/city/bounds.json` rebuilt (2187 places, 242 boundaries) via osmium in Docker
- [x] Hotfix: live page went blank — `cancelAnimationFrame` passed bare into the loop deps → "Illegal invocation" on cleanup,
      React unmounted the app. Fixed + regression test — PR #9
- [x] Live smoke check: Haifa, Tiberias, Jerusalem, Tel Aviv load the canvas scene, hour slider scrubs, no console errors
- [ ] Perf on a real phone with `?perf=1` vs `docs/design/qa/canvas/perf.md` — skipped for now (owner)

## Polish track A — glyphs never mirror (audit #1, #23) — 2026-11-22 (branch `claude/fix-glyph-flip-8384c3`)
Briefs: `docs/briefs/track-a-glyph-flip.md`, `…round2.md`; delegate report `…REPORT.md`. Stills: `docs/design/qa/polish/track-a/`.
- [x] Each glyph has a fixed handedness (`GlyphDesc.hand`, seeded by mark seed, `scene/model/glyphHand.ts`; icons and fields 1)
- [x] One signed light (`glyphLight` = faces.left − faces.right; glyph space = hand × it); the kit weights lit/shade faces
      continuously (`kit.ts`, `kitLight.ts`); no form depends on the light; cast shadow fades to the contact shade at dx 0
- [x] `Light.side`, `sideOf` and every `litSide` removed; `Light.across` is the signed lateral light on the SHADING ramp;
      outside, trees, far cities, wear and the layer keys use it
- [x] Proving test `scene/paint/glyphs/glyphs.test.ts`: all 22 kinds, both hands, light swept −1…1 → form log identical,
      light continuous through 0; Shadmot Mehola 05:30–21:00 form identical per glyph; lamp x fixed
- Who wrote what: Claude (Opus 5.5) briefs, stills, verification and a one-line tsc narrowing in the test;
  Codex gpt-6.2-sol wrote rounds 1 and 2 (Neon gemini-4-neon-high was out of quota, then wedged at start);
  Opus subagent reviewed both rounds (Codex never reviewed its own code)
- [ ] Follow-up: `WearLight.side` (`scene/model/wear.ts`) is still a sign of `across` for the garments (out of scope)

## Polish audit track B — marks owned by the place's own footprint (audit #2) — 2026-11-21 (branch `claude/fix-mark-ownership-caed9e`)
Who wrote what: Claude (Opus 5.5) managed, measured, briefed and verified; Codex `gpt-6.2-sol` wrote round 1 (Neon was at
quota, 429); an Opus subagent reviewed round 1 (8 findings); Neon `gemini-4-neon-high` wrote round 2 (the fixes); Codex
`gpt-6.2-sol` reviewed round 2 (3 P1, 3 P2, 1 P3); Neon wrote round 3 (`BRIEF-round3.md`: landmark cache v8, evidence
per cell, seat inside the drawn block, seat by px before the 20 m gate, one ownership predicate, tests that can fail).
Codex reviewed round 3 (4 findings); Neon wrote round 4 (no-raster fallback kept, containment against the scene model's
final block, seat candidates carried past the shortlist, tests split) and round 5 (`BRIEF-round5.md`: the carried
candidates reach beyond seating only, so own portraits are unchanged; landmark cache v9). Codex reviewed rounds 4-5
(2 findings). Neon hit quota mid-round 6 (partial edits discarded), so Codex wrote rounds 6-7 and an Opus subagent
reviewed round 6: the seat budget is applied in the scene model after the final block cull (a freed slot goes to the
next viable seat), the label and skyline see only the world-width budget, the cap stays 5 on wide screens.
Notes and the before/after table: `docs/design/qa/polish/track-b/NOTES.md`.
- [x] (a) Worship heights by evidence, the same for every religion: 9 m hall; tower height only from `tower:type=minaret`,
      `building=minaret`, `man_made=tower`, `height` or levels (`src/data/landmarks/worship.ts`, `overpass.ts`). Build writes
      `heights: 'evidence'`; `loadIsrael` reads the old build's default-valued rows (all 1564 minarets at 30 m, 53 churches
      at 25 m) as halls.
- [x] (b) Own marks from the place's own footprint: `homeCluster(clusters, nameHe)` takes the cluster named after the
      place (≤ 2 km); `placeBounds` gives its mapped point the cell, reaching its farthest corner; only for a name match
      (other places keep their exact cell). City cache key `v6`, the named home reserved in the cache.
- [x] (c) A hall, high-rise or homes beyond the place within 6 km is drawn only on its town's drawn block, at its true
      size and haze (`src/world/beyondSeat.ts`, shared with `beyondTowns`, bit-identical; `beyondMarks.ts`).
- [x] Tests over the bundled data (`src/world/markOwnership.test.ts`, `worship.test.ts`): Karmei Tzur keeps שבת אחים, the
      hamlet cell without the fix does not; Safed and Rosh Pina by the same rule; seated size; hidden-block negative.
- [ ] Follow-up: rebuild `public/data/landmarks/il` from the Geofabrik extract (not on this machine) so tagged minarets
      (e.g. famous mosques in Jaffa) get their tower height back.
- [ ] Follow-up (painters): a hall-only mosque glyph for a mosque with no tower evidence.

## Polish track C — life keeps moving (audit #3, #9) — 2026-11-22 (branch `claude/fix-life-motion-740e49`)
Briefs and reports: `docs/design/qa/polish/track-c/` (`BRIEF-neon-1.md`, `BRIEF-2.md`, `IMPL-1.md`, `IMPL-2.md`, `NOTES.md`).
- [x] One `LifeClock {laidAt, sinceS}` (`useLifeClock`); the world lays 120 s of life ahead every 2 s (`world/lifeAhead.ts`);
      every bird, plane, contrail head and meteor carries a `Track` the compositor places continuously; minute handoff
      ≤ 6.4e-14 px (test reads the new model at a non-zero `sinceS`)
- [x] Scrub rest: life keeps moving in real time (whole-minute re-anchor, life offset in the world; sky/light/clouds stay
      at the shown moment); live vs scrub keyed apart — owner decision flagged in NOTES
- [x] No pop-in: a mover is laid if any of its 61 samples is in view; zero-alpha starts fade in
- [x] Contrails: fixed tangent frame registered at the head (scale error < 0.11 %), per-puff wind drift, ribbon ages
      continuously in the compositor (`scene/paint/contrail.ts`)
- [x] Birds: 3D flight per species (`scene/model/birdFlight.ts`, `birds.ts`, `scene/paint/birds.ts`): thermal circles,
      wheeling, eights, hanging on the wind, a V, rowing; bank, dihedral, wrist, underside; closed-form strip bounds
- Who wrote what: Claude (Opus 5.5) the bird flight model and painter, briefs, verification, perf profile;
  Codex gpt-6.2-sol briefs 1 and 2 (Neon out of quota); Opus subagent reviewed round 1 and the final diff
- [ ] Follow-ups: per-minute terrain sight line can step a mover's occlusion at a crest (carry it in the track);
      model cost is outside/land planes/sky, not life; `surface.ts`, `lifeSchedule.ts`, `life.ts` over 150 lines
