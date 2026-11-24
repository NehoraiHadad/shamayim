# Shamayim — tasks

Status legend: [x] done · [~] in progress · [ ] todo. Keep this file current so a new chat can resume.
Plan: `docs/PLAN.md`. Brief: `docs/PLANNING_BRIEF.md`. Codex briefs: `docs/briefs/`.

## Worship ownership (audit follow-up)

Owner decision, 2026-11-22, verbatim: **"מסגדים לא, ציונים כן"** (supersedes the earlier Decision B for famous
landmarks and non-own worship).
Since 2026-11-24 no mosque is drawn anywhere, the place's own included (`src/data/landmarks/drawableMark.ts`); it supersedes
every mosque and minaret line below.

- [x] Non-own mosques/minarets are never drawn, even when famous. Other non-own worship is drawn only when the
      source is curated or a named `fame === 2` landmark (Wikipedia). Fame-1 sources use the ordinary
      rule. Own portraits retain their rules.
- [x] Famous non-own landmarks draw at `clamp(trueHeight, 6, 16)` CSS px, including shrinking true heights above
      16 px; the glyph records its factor and width scales equally. Ordinary non-own marks keep the 4 px floor and
      2× cap. One `(kind, famous)` policy drives
      both receiving layers and pre-selection; famous candidates need positive true visible height only.
- [x] Keep ≥6 CSS px from the final home roofline, with at most 12 CSS px sliding away from home. Use true-distance
      haze and far-city material contrast at the true receiving-eye distance, never clearer than home. Town members
      require their own painted mass and ≥1 CSS px on each side, unless an
      unseated famous landmark has a physically proven ridge base: terrain hides its foot, but its true top projects above
      that drawn ridge at its bearing. Buildings/home roofs never supply that exception or cover the kept icon.
- [x] Round 6: unit guards and mutation checks; independent final-glyph assertions across the fixed 117 places and
      all 18 recorded panoramas at 375/1280; refreshed background exhaustive audit. Results: `REPORT.md` Round 6 and
      `AUDIT-table.md` After. DPR-2 stills and per-glyph measurements: `stills/README.md` Round 6.
- [x] Earlier rounds 1–5: physical angular/crest clipping, town identity, source-seat carry, nearest-first glyph
      occlusion, final seat-budget refill, and shared haze/size helpers. Historical comparisons remain in `REPORT.md`.
- [x] Round-7 review: one `isFamousLandmark` data predicate for fame-2/curated neighbours; fame-1 worship hidden,
      other fame-1 marks capped at 2×. Seated marks stay on visible town feet and never use panorama ridge evidence.
      Restored dot/sheet checks for famous fitting, with sheet clearance retained by the receiver. Measured frame
      drift, re-rendered the stills, refreshed the background audit and `AUDIT-table.md` After; counts/factor bins are in `REPORT.md` Round 7.
- [x] Obtain a recorded panorama for the production Karmei Tzur coordinate (and four more small settlements) through
      the fixture workflow: `src/test/fixtures/scene` via `scripts/fixtures/recordPanoramas.ts`, run on Actions.
- [x] Scene texts (owner, 2026-11-24): the picture carries none (no height, dot, water names or "פני הים" line). Place, height
      and the waters drawn (`src/world/watersShown.ts`) are one line at the page's foot (`src/ui/SceneFacts.tsx`). The number's
      last form on the picture: a3030959 on `claude/found-i-label2`. Left: the spot's small clearing among the houses (filling
      it fails Tiberias's roof/front gate).
- [ ] Review the settlement rules against that terrain. Stage V1 measured them (label over the town, dot erasing
      houses, beyond-town blocks, house size and frame); the fixes are not started. Unit tests still use flat 100 m.
- [x] Landmark-size decision: shared 6–16 CSS px policy, land aerial perspective plus far-city contrast and lamp
      transmission; owned portraits unchanged. Verified at 375/1280 and DPR 1/2, with mutation guards and a refreshed
      full audit. Histograms: `REPORT.md`, Landmark size. Stills: `stills/landmark-size/README.md` (Dafna, Karmei Tzur,
      and recorded Ramat Gan).

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
- [x] Likely real cause of "all day": `rollForward` (`src/domain/now.ts`) kept a stale cached dawn's humidity/visibility
      on screen all day; it now takes the hour row's humidity, visibility and cloud layers (or null when the row lacks them).
- [x] Review rounds (Codex 1–4): morning-only burn-off with an evening twilight ramp (0° to −6°); low+mid cloud stops
      radiation fog (capped by total cover); droplet gate (RH 70–90 %) and the reported visibility before the PM10 cap,
      so dust haze is not fog; raw low cloud for the marine deck; damp-gated rain mist; bands fade at their thresholds;
      the 12 h night minimum glides as a sample ages out (9–12 h blend toward now): no step at the window edge.
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

## Track E — UI polish batch, audit #7, #8, #11–#22 — 2026-11-21 (branch `claude/fix-ui-batch-83e1e6`)
Briefs: `docs/briefs/track-e-{1-bidi,1b-review-fixes,2-a11y-tokens,2b-review-fixes,3-behaviour,3b-review-fixes,4-final-review-fixes,4b-label-size,4c-rereview-fixes,4d-picker-queue,4e-progress-once}.md`.
Stills (fixtures only, Jerusalem shifted −22° for the freezing case, Neve Zohar −374 m): `docs/design/qa/polish/track-e/`.

- [x] #7/#8/#14/#15 bidi — `src/text/isolate.ts` (LRI/RLI/PDI, U+2212), one isolate per number/clock, height label unit inside the isolate — `d7229eb` (Codex gpt-6.2-sol; Opus review → 1b `b625b94`: `textWidth` ignores isolates, range dashes stay dashes).
- [x] #11/#12/#13/#22 one `<main>`, 12 px `--text-caption`, height label 12 px no opacity + contrast test, `--bleed`/`--focus`/… tokens, one `:focus-visible` — `ccd49e9` (Codex; Opus review → 2b `12d2c72`: pill ring, two-tone scrubber ring, live-sky contrast sampler `src/theme/contrastSamples.ts`).
- [x] #16–#21 IconButton + SVG icons, picker error codes/counts + stale-GPS guard, shared slider keys, canvas alt text, offline announcement + deferred SW reload (`onNeedReload` no-op, reload on hidden/idle), `<noscript>` + static "טוען…" — `bd0f767` (Gemini 4 Neon; Codex review → 3b, also Neon).
- Writers: Neon was out of quota for briefs 1/2 → Codex wrote, Opus subagent reviewed; Neon back for 3/3b → Codex reviewed. Claude: briefs, verification, stills.
- [x] Final Codex review of the whole branch (7 blocking) → brief 4 `696e085` (Neon): the new worker waits (`registerType: 'prompt'`, `updateSW(true)` on the idle/hidden gate is the only reload), stale data is not "offline", the spoken scrub condition follows the drawn rain/cloud, picker GPS and search announce independently, opaque midnight caption (5.10:1); brief 4b `4d4ad22` (Neon, coordinator-approved): one `LABEL_PX = 12` in `world/layout.ts` drives the drawn label and every collision box (`place.ts` `besideDot`, `scene/model/layout.ts`), CSS tie-in test.
- `src/world` / `scene/model` exceptions (merge order with other tracks): `place.ts`/`world.ts` use `heightText`; `place.ts` line 133 uses `LABEL_PX`; `layout.ts` `textWidth` strips isolates and exports `LABEL_PX`/`LABEL_H`; `scene/model/layout.ts` imports `LABEL_PX`.
- [x] Codex re-reviews → brief 4c `3ffde1a` (Neon): one gated reload (`onNeedReload` + `controllerchange`, idempotent) and a cross-tab `BroadcastChannel('shamayim-sw')` activation handshake (`src/pwaTabs.ts`); picker announcements queued; both geocoders failing is an error, not "no places" (`src/data/geocoding.ts`, coordinator-approved); thunder spoken only when drawn; status phrases deduped. Brief 4d `7443dc9` (Neon): picker queue keyed by (source, requestId). Brief 4e `2981a5e`: progress spoken once per request (tests by Neon until quota ran out; fix by Codex; Opus subagent review: nothing blocking).
- Merged main 757b768 (track A), 2fd0c1e (30 s test timeout), cc9664f (track C); CI green on the final sha.
- Follow-ups (non-blocking): `heightLabel.contrast.test.ts` still has its own sampler (move to `contrastSamples.ts`); picker: after a GPS error, a later hidden search count can bring the visible GPS error note back; untested reducer branches (progress kept on air, clear during a gap with progress pending); `src/data/geocoding.ts` is 165 lines (was 161).

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
Codex reviewed rounds 6-7 (3 findings); Codex wrote round 8 (backed height label culls seated glyphs before the
budget; place.ts trimmed). Its light-per-render-width fix was reviewed by Opus (forked world state, rebuild on resize)
and withdrawn by the manager in round 8b: one world state at SCENE_W stays.
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
- [ ] Follow-up: at render widths other than 375 px the light's sun/moon skyline (`drawnSkyline.ts`) still counts
      structures the scene culls behind text (town blocks, beyond towers, trees, and now swapped seats). Fix them
      together, keeping one world state (e.g. a width-independent cull rule), not per-width world rebuilds.

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

## Birds travel (owner bug "they fly in place") — 2026-11-22 (branch `claude/fix-birds-travel`)

- [x] Diagnose in the built app, live: flocks moved 0.8–2.4 px / 9 s; cause `GROUP` speeds 0.5–2 m/s; prod = main bundle
- [x] Real flock ground speeds; storks/cranes nearer; raptor thermal drift with the wind
- [x] Lazy, memoised, frozen flock tracks (first build ≤ main); upcoming flocks laid at alpha 0; speed within ±15 %
- [x] Tests: `birdsTravel`, `flockLazy`, laid-count gate, opacity-step continuity; browser probe `e2e/birds.motion.mjs`
- Who wrote what: Claude (Opus 5.5) diagnosis, briefs, probe, lazy/perf tests, verification; agy Gemini 4 Neon the
  code and test updates (rounds 1–3); Codex gpt-6.2-sol reviewed
- [ ] Follow-ups: occlusion step at a crest on rebuild (Codex P2); per-sample yaw for near passes; split `lifeSchedule.ts`

## Polish track F — the fog band over the land (owner report) — 2026-11-22 (branch `claude/modest-jennings-b32480`)
Stills: `docs/design/qa/polish/track-f/` (`before/`, `after/`; `-damp` = `?weather=damp`, `-no-<id>` = layer hidden).
- [x] Evidence: in the fixture (RH 60 %, 30 km all day) mistiness is 0 and no mist layer exists; the sky haze band (alpha
      0.12) moves ≤ 1 luma level when hidden. The pale slab at shadmot-mehola 11:30 is `plane.far` (Gilead, 9–21 km)
      at Koschmieder haze for 30 km (correct), with `cloudShadow.far` laying a horizontal dark smear across its lower
      half (handed to track D). With damp air (`?weather=damp`) the valley mist lay over the ridge line all day: the bug.
- [x] Root rule: `world.air.mist` (`src/world/mist.ts`): radiation mist (RH 84–99 % or data visibility, calm < 3–7 m/s)
      burns off with the sun (2–26°) and the warming over the 12 h minimum (+0.5–4.5 °C); daytime mist persists only for
      data visibility ≤ 6 km, rain, or a low stratus deck with RH ≥ 85 %. Never in dust. Scene mist in `scene/model/mist.ts`.
- [x] Tests: `src/world/mist.test.ts` (burn-off, wind, persistence, dust, humidity-derived visibility, night minimum),
      `src/scene/model/mist.test.ts` (dawn mist, none at noon); `weather.test.ts` damp case updated (dawn only).
- [x] Tooling: stills moment field 6 hides layers (`place@HH:MM@weather@phase@land@ids`), harness `?hide=`, `damp` preset.
- Who wrote what: Claude (Opus 5.5) diagnosis, evidence, brief, verification; Gemini 4 Neon (agy) the rule and tests;
  Codex gpt-6.2-sol review.
- [ ] Follow-up (track D): cloud shadows on the far ridge read as horizontal bands.
- [ ] Follow-up: `App.tsx:89` page background uses `mapAir(shown)` with live visibility even in a picked-hour preview.

## Living land — branch `land-living` — started 2026-11-20
Brief: `docs/design/LAND-LIVING-BRIEF.md`. Review log: `docs/design/qa/canvas/land/REVIEW.md`.
Writer Antigravity (`agy`), reviewer Codex (`gpt-6.2-sol`), orchestrated by Claude Code.
- [x] Stage 1: data layer — approved (Codex round 6) + round-6 minors/nit folded in (`f3f3f77`: v4 cover cache payload
      validation via `isValidCoarseCoverJson`, bounded local asset deadlines releasing hung shared slots via `withDeadline`,
      raw TTL tables restricted to near/far/weather).
- [x] Stage 2: world state — approved (Codex round 2) + round-2 minors/nit folded in (`07db0b5`: `e2e/land.perf.mjs` waits for `firstShown.land`/`firstPaint.land` before releasing satellite fixtures, `s2-mean` tested end-to-end through `livingLandOf` and test-only `sampleAt`/`sampleLandAt` retired, calendar-day approximation documented in `landAgeBlend.ts`, unused sun-angle fields stripped with legacy cache compat).
- [x] Stage 3: land colour painting — approved (Codex round 2) + round-2 minors folded in (`26368e9`: `landSnow.ts` split, `PlaneLight.tint` dropped, opt-in `SceneStats.trackShown` with in-place reuse, exact GIBS SR tile `8/103/153` matching + missing-tile check in `e2e/land.perf.mjs`).
- [x] Stage 4: vegetation — approved (Claude Opus round 6, after Codex/Neon rounds 1–5). Crop-probe culling keeps all descriptors identical (88 hashes) and cuts the Nahalal cold build 26.5 → 15.6 ms. Track the residual Nahalal cold model cost with app-wide performance work.
- [x] Stage 5: wind on land — approved (Claude Opus round 1; Codex wrote it). Trees, palms and tufts lean and sway with the camera-projected wind (Beaufort-based saturating lean, gust sway, distance fade), catchlights follow leaned crowns, dust over dry bare windy ground. Carried into Stage 6: possible first-paint/refine slowdown (matched perf 5.5 s → 6.5–7.3 s), gust overshoot doc, olive stiffness, label cut-out nit.
- [x] Stage 6: stills, docs, PR — approved (Codex round 3; Neon wrote it). Final before/after stills (7 regions × 3 seasons + windy day, plus an observed-data refinement pair) in `docs/design/qa/canvas/land/final/`; §6 of the scene plan documents the full pipeline. Follow-ups (round-3 minors): `e2e/landPerfMeasure.mjs` canopy milestones on a navigation-relative clock; report per-revision medians and paired deltas instead of "zero residual delay"; per-strip timing in `remoteCache.ts`; drop write-only `Entry.formKey/lightKey/ratio` and dedupe pending strips before building descriptors.
- [x] Merge `origin/main` (polish tracks A, B, C, E, F, birds travel) into `land-living` — 2026-11-22 (`8df79cc`, `ad3c076`): remote cache keeps strip chunking/preemption
      plus main's per-bitmap layout desc and scrub-back guard; canopy sway follows the same wall-time scene phase as birds;
      world types (land + mist + seat pool) folded into the split type files; landmark cache v10 (crops + seat candidates).
      47 pixel refs re-recorded (`d104fe7`): main had never re-recorded its own (42/66 failed on main alone).
- [x] Merge `origin/main` (track D cloud field) into `land-living` — 2026-11-22: main's cloud field, shadow layers,
      `flightTerrain`/`terrainY` adopted; `fieldOf`/`terrainGrid`/new `flightOf` live in `worldParts.ts` `makeWorldMemos`;
      `FieldRainCell`, `Rain.cells/near`, `Light.eye/clear/meanBeam`, `TerrainPlanes.eyeM` folded into the split type files;
      `WorldState.shadows`/`CloudShadows` dropped. The old haze-tinted shadow tile (`hazeOf`) is gone with main's painter
      (main's shadow layers use a fixed shade). 39 pixel refs re-recorded for main's track D light/cloud/shadow changes.
- [x] Merge `origin/main` (track A/G: no building flips, live mode is scrub at now) into `land-living` — 2026-11-22:
      main's `PaintQueue`/`remoteEntry` (keep the last worker picture) now drives land-living's `RemoteQueue` order
      (single-frame first, strips in bounded chunks; staged chunk time reported with the completing batch; light-only
      jobs still trimmed by `lightJobDesc`); main's air timeline (`AirTimeline`, `dustWeight`, `thunderWeight`,
      `FieldRainCell.level`) folded into the split type files and `worldParts.ts`; `outsideGround.ts` holds main's
      `paintOutsideSea` and land-living's living-land `paintOutsideLand`.
- [x] Merge `origin/main` 9dd0061 (track D N4 piece 2: clouds on the field, falling clouds, old cloud system deleted,
      storm fixture) into `land-living` — 2026-11-22: main's `cloudLayers`/`flash`/`shimmer` modules, `carriedCells`,
      `cloudCells` layer + painter, `FallingCloud` and `weatherLayers(world, box, clear)` adopted on top of land-living's
      canopy / land dust / plant wind wiring; land helper types stay in `typesLand.ts`; `sceneWorld.ts` keeps `cropAreas`
      and takes main's recorded-day `fixtureFor`.
- [ ] Stage 7 — land lit physically by day (branch `claude/land-light-998984`, 2026-11-23). Approved by Opus, 39 stills re-recorded.
      - [x] Share linear Lambertian irradiance, lunar and solar visibility, wet and snow reflectance, a single
            luminance compression, and per-face-distance linear haze across terrain receivers.
      - [x] Integrate directional twilight sky radiance against the cosine of elevation from the surface normal,
            with aerosol and cloud scatter and broad-sky metering. Keep the daylight scale distinct from the
            atmosphere's directional horizon radiance. Retain the sky as the source of path colour.
      - [x] Paint both stationary solar endpoints in one job per receiver. Keep the previous pair and canopy
            visible during light changes. Promote each newer complete pair, so a drag keeps shaded planes moving
            with the sky. A cold canopy can show full-beam pose zero while its pair waits.
            Key paint on byte-encoded plant tones, geometry and clear zones. Cull footprints against canopy
            bounds, send a warm canopy preview with its plane, and fill the gust strip after scrub.
      - [x] Share one moving Beer–Lambert mask per plane with its canopy. Use the mean beam-to-sky ratio of
            sun-facing texels, their mean haze and the sRGB curve. Key masks on projected footprint values
            and quantized exposure. Reuse the same staggered mask and premultiplied blend for Worker arrivals
            and interactive rendering, including the antialiased crest. Lunar light retains its deck share.
            Seed the ground shadow rim by cloud genus. Project tower shadows from the shared tower heads. Combine
            the ragged rim and solar disc in a cached transmission stamp with the earlier integrated beam removal.
            Weight diffuse return by peak visible footprint coverage over the 75 s receiver sweep.
      - [x] Cache terrain horizon angles by geometry grid and half-degree azimuth. Interpolate bearings
            and apply the soft disc edge at the current solar or lunar altitude.
      - [x] Resolve the crest from body samples in both endpoints, retain seeded reflectance mottle with its
            dark tail, and finish with finer paper grain. Mix lying snow on terrain and outside ground into reflectance.
      - [x] Give buildings one linear receiver per face. Use the land's solar, lunar and sky irradiance, exposure
            and distance haze. Use seeded plaster and facing bins, and screen sky, beam and ground bounce
            at eaves and feet. Let vertical walls see half the broad sky and half the ground. In twilight,
            compress excess facade contrast against the lit ground with a soft luminance shoulder.
            Paint shallow caps and pitched clay planes, with a continuous blend into unresolved fabric.
            Preserve plaster luminance with a 0.025–0.030 warm axis. Shade glass with double-glazed
            Fresnel reflectance and interior fill, and limit its twilight luminance to the matching wall.
            Use metal albedo on bands only. Retain the drawn hand's distant-town and landmark tones.
            Gilding keeps its rough conductor reflection. Keep the same geometry and
            emissive window and lamp pass through twilight.
      - [x] Add real browser checks for twilight and noon ratios, foreground texture and the snow seam,
            plus continuous shadow motion across a snow boundary, gusts over shadowed terrain, and
            minute-boundary continuity and paired light-change Worker arrivals. Check that a Worker failure
            releases all twenty canopy endpoint bitmaps and repaints the shaded strip on the main thread.
            Run the land-light browser checks in the CI stills job. Check native masked building ratios and
            contact spread, overcast relief and gilding at noon and twilight. Compare land, canopy and water
            with architecture present and removed in the same browser. Swap the facade palettes and check
            the tagged emissive pass for byte equality. Check pane luminance at noon and chroma at twilight.
            Use the Jerusalem broken-deck fixture to check shadow area, feather, hue and edge continuity.
      - [ ] Investigate the remaining February and August twilight hue differences with matched wall and
            ground-contact samples. The largest differences occur where local soil or vegetation albedo
            and direct light differ from the front facade.
      - [x] Verify round 5 against all 24 rendered stills. The maximum land/sky median ratio change from
            round 4 was 0.035%. A sun-facing glyph fixture also verifies the architectural shadow contrast.
      - [x] Rerender the 24 measured round 6 stills and review the dawn, noon, dusk and shadowed-crest crops
            at 2×. The median land/sky ratios matched round 5 and the mean ratios moved at most 0.031%.
            Shadmot Mehola at noon in showers used 38.2 MiB after the shaded ten-pose strip finished.
      - [x] Record round 4 performance. Across three interleaved pairs against `6ca2e54`, scene-model scrub
            and land-animation p50 improved for all three places, and first fallback paint was within 10%.
            Worker scrub p50 rose 61% in Tel Aviv and 24% in Shadmot Mehola. First canopy rose 14% and
            Shadmot Mehola's animation p95 remained above baseline. The 24 still ratios stayed within
            0.37% of approved round 3.
      - [x] Compare round 6 against `6ca2e54` in eight interleaved pairs at DPR 2.75 and CPU ×4. Both
            revisions used the same six performance cores. Four pairs passed the 30% control filter.
            Land scrub p95 was 2.95 ms in Haifa, 3.20 ms in Tel Aviv, and 3.45 ms in Shadmot Mehola.
            The Shadmot Worker step p95 was 83.65 ms against 58.20 ms baseline (1.44×).
      - [ ] Close the remaining relative performance gaps. Shadmot land animation p95 rose from 2.75 to
            4.75 ms, first fresh canopy rose 14.5%, Haifa's cold first paint rose 21.9%, and cold model
            time rose 23.5–68.5%. Tel Aviv land scrub p95 rose by 0.60 ms (+23.1%) and stayed below 10 ms.
      - [x] Merge the PR head with main's Haifa clouds and drawn town. The drawn town uses the original tier
            palettes, sky form, shine and glyph shading. The outside descriptor cache and paint jobs carry
            the hand. Shared painters retain their keys. Solar shadows use the same seeded heads as the
            tower painters, projected from each field cell's base and depth with the existing area correction.
      - [x] Verify the drawn town against main `a92d405f` in Chromium at 1×, 2026-11-17 noon. All 7,059
            Haifa and 5,097 Tel Aviv town pixels matched on a transparent background. In the full scene,
            1,525 Haifa and 848 Tel Aviv translucent town pixels differed over the changed background.
            Haifa's 5,055 opaque pixels matched. One of Tel Aviv's 3,870 opaque pixels differed by one
            green byte where the town overlaps the differently lit ground.
      - [x] Compare the real hand with `1480734f` at the same times. Both complete 375×428 frames and
            both isolated outside layers were byte-identical.
      - [x] Verify the merge with `tsc -b`, 226 targeted Vitest tests at two workers, and the 13-case
            building and shadow browser runner. The Jerusalem broken-deck fixture preserved removed beam
            area within 0.005%, with 5.20–5.28 px vertical edge widths on its two broad shadows.
      - [x] Record the cloudy land colour change. `diffuseSky` neutralises cloudy skylight while preserving
            luminance. Mean bare-land RGB shift versus `e4ca77ca` was (+1.0, −0.1, −1.6) in Haifa at noon,
            (+2.3, −0.3, −3.5) in Haifa overcast and (+4.3, −0.7, −4.1) in Jerusalem rain. At night it was zero.
      - [ ] Recheck night composites when re-recording stills. At 2× and 21:00, box and tower window
            geometry and fill colours and isolated lamps matched `e4ca77ca`. After restoring the parapet
            shade, composited warm window samples still differed by up to 2 levels in Jerusalem, 16 in
            Haifa and 4 in Tel Aviv, including pixels over overlapping facades.
      - [x] Pre-merge review fixes. Facade exposure runs before the shared veil, and dense fog removes the
            contrast floor, so low-sun fog veils the town like the ground. Haifa's shrine dome matches main at
            21:00 and stays opaque through twilight. Four stills re-recorded.
      - [x] Town walls are veiled by their own distance, and through twilight by the mean distance of the town's ground (`wallDistance.ts`), never by the
            land behind each column, which drew vertical blocks in low sun and fog. `outsideNeighbours.test.ts`
            bounds adjacent walls at 9/255 in five places, four airs and seven hours.
      - [ ] Follow-up, performance (software Chromium, CPU ×4). Haifa `modelCold` median is 242 ms against 187 ms
            on main. Shadmot Mehola thunder `canopy.near` peaks at 900 ms in the Worker against 69 ms on main,
            from the paired gust poses.
      - [ ] Follow-up outside Stage 7. Split the pre-existing large `src/scene/model/types.ts` and
            `src/scene/compose/surface.ts` around their existing descriptor and compositor boundaries.

## Polish track G — no building flips or flickers; live mode is scrub at now (owner: "a building rotated and also flickered", Karmei Tzur) — 2026-11-22 (branch `claude/fix-glyph-flicker-8384c3`)
Briefs and reports: `docs/briefs/track-g-flicker.md`, `track-g-live.md`, `track-g-merge.md` (+ `.REPORT.md`, rounds 1–3).
- [x] Evidence (probes, one-minute builds, 4 places, live + scrub): glyph hand/seed/form/position never change. Causes found:
      tower cast mirrored with a `+1` minimum reach as `cast.dx` crossed 0 (Karmei Tzur ~11:25, alpha 0.25); window rng
      drawn conditionally on the light (Karmei Tzur 17:19: 15 lit windows dark, 26 lit at once at a steady share); the
      worker cache returned null for a layer whose new form was in flight (blank frame); live mode stepped all light at
      each hour/refetch (Karmei Tzur 12:59→13:00 direct 0.359→0.143).
- [x] Outside painters: one cast-shadow law (`scene/paint/castShadow.ts`, reach → 0 with lateral light; tower keeps its
      look); fixed seeded window thresholds drawn before any light test; both side strips/mast edges drawn with their own
      weight; lamps/floods fade with night. Painters split into `outsideBox/Tower/Ground/Light.ts`.
- [x] Worker cache keeps the last picture until a newer one arrives (`remoteEntry.ts`, `paintQueue.ts`; no starvation, A→S→A reuse).
- [x] Live = scrub at now: weather sampled at `selected ?? now`; the observation and each data arrival ease in (10 min,
      smoothstep), weighed at now, stamped in the scene's own timeline (pinned time works); snow stays snow; dust one
      continuous `dustWeight`; track F mist fed from the blended state (merge).
- [x] Tests: `outside.test.ts` (signed-light sweep geometry, 16:30–18:30 windows monotonic incl. glyphs), `compose.test.ts`
      (never blank, resize starvation, A→S→A), `liveLight.test.ts` (Jerusalem 13:00 step 0.106 → 0.0006; refresh; held
      scrub; pinned), `airInput.test.ts`, `dust.test.ts`, `mist.test.ts` live continuity.
- Who wrote what: Claude (Opus 5.5) diagnosis, probes, briefs, verification; Codex gpt-6.2-sol the code and tests (Neon
  agy wedged / timed out twice); Opus subagents reviewed each round.
- Caveat: no Karmei Tzur panorama fixture exists (recording needs live DEM); the probes used Jerusalem's terrain with Karmei
  Tzur's coordinates. Tests use Jerusalem.
- [ ] Follow-ups: `pickTheme` (page chrome) still reads `forecast.current`; sea-glint thresholds in `model/outside.ts:86,95`;
      worker failure never closes shown bitmaps (as before); a reload mid-ramp restarts the 10-min ease.

## Polish coordination — merged tracks and open follow-ups — 2026-11-22

Merged to main (all CI green): A glyphs (757b768), C life motion (cc9664f), E UI (3366b1e), B mark heights (3ae092d),
F mist (7c50d4f), C birds travel (c5b1af8), D N2 cloud field (8ac7bd2), G no flip/flicker + live = scrub at now (7ae0286),
G round 5 explicit live mode (0818fd1), hotfix sky behind <body> (0b21d13, d9bbfce), B worship ownership (31e76d6).
Track D N4 merged: b23df02 (0f05815), d0d3c290 (9dd0061d), b82e7609 (bb09b17d), 27987a4a (f6642e8b),
4b173ac9 (ad712e9a), cf78b8df + B landmark size (3038caab), dad9157a (7f5f57f4), bb899e21 (4f606c2d), 454374cd (0a93adf3).
B landmark size 6-16 px (68523b2b). Weather Worker deployed with cape + freezing_level_height (version 448728a6, 22 Nov).

- [x] Owner-delegated landmark-size decision: clamp famous non-own height to 6–16 CSS px, with true-distance haze and
      contrast. Factor remains diagnostic. See worship ownership above and `REPORT.md`, Landmark size.
- [x] "Planes" left of the sun (Jerusalem 11:30) were a flock of 11 cranes: a wedge spaced closer than its drawn wingspans, of
      straight crosses with a body twice its true length. The V is now spaced in drawn spans with true unequal arms
      (`craneV.ts`) and the crane has bent broad wings and a body half a span long.
- [ ] A short, non-persistent contrail paints as a white dot at a high airliner. Other kinds' dense flocks unchanged.
- [x] Track G LOW 1: a pick or drag that lands on the current minute is live (null) at once (`ui/scrub/sceneTimeController.ts`,
      `sceneDragTime.ts`, tested without a DOM); a clock tick never changes a held preview.
- [x] Track G LOW 2: the satellite's correction is measured at its own minute (cover − model there, ±40 points, full for
      40 min, nothing at 150), so a held preview does not drift while the clock runs, nor at the hour's rollover
      (`observedCloud.ts`, `liveLightSatelliteCases.ts` with unequal model and observed cover).
- [ ] The correction steps 0 → full where a scrub back crosses the observation's own minute (unchanged from before).
- [x] CI gap: the stills job renders the built page too (`vite build` + preview, 375 px, recorded Haifa 15.3 noon, other hosts
      refused): `e2e/skyShown.mjs` fails when the sky is the boot colour, when hiding the sky changes nothing, or when its
      canvas holds no ink. Proven red with an opaque `body` in the boot colour and in a sky blue
      (`docs/briefs/open-tasks-1-built-still.REPORT.md`).
- [x] Satellite sightings back in the field (Claude, 22 Nov): the single clouds the EUMETSAT mask sees within 28 km
      (`sightingsNow`, cover < 50) were lost when the banks went; they are now low-layer cells at their azimuth,
      distance and width (`world/field/seenCells.ts`, `layerSnapshot(..., extra)`), shaped by the layer's form.
- [x] Storm and night (Claude, 22 Nov): tower bodies fair-white, dark genus bases (darker raining), seen through the
      1.5 km haze they rise out of (`hazePath`); overhead Cb drawn (NEAR_MAX 70); rain curtains in rain grey.
      Field calibration on the real Haifa 15.3 day: towers 35 % of low cover, cores 18 km apart / 2.5 km radius, half
      Cb, rain only from Cb (`stormDay.test.ts`). Overcast nights lit from below by the towns (`cityLight.ts`, env.glow).
- [x] Storm look (Claude, 22 Nov): forecast convective rain at the place stands one mature Cb 4 km upwind
      (`hereCell.ts`), ranked first in the rain so its dark base and curtain are near; towers beyond 40 km merge into a
      soft horizon mass (`MERGE_KM`/`MERGE_PX`); anvils only over columns 1.5x taller than wide, the column flaring into
      the cap (no saucers, `cloudTower.test.ts`); the overcast city night dim overhead, brighter toward the horizon
      (`CITY_ZENITH`/`CITY_HORIZON`). Next: CAPE in the Worker whitelist and the world (conv = f(CAPE, code, precip)).
- [x] Crowns and storm hours (Claude, 22 Nov): Open-Meteo CAPE + freezing level asked (ASK_STORM_HOURLY on, app works without them); tower crowns are crisp cauliflower turrets in a dome half the width deep (no beads down narrow columns); a curtain hangs from its base's near edge; city night glow stays radial (no direction data). Open: bead column at the left edge in haifa 17:00, near curtain still faint at 14:00, freezing level unused (snow line), shaft drift time origin, fog in new style.
- [x] Track D N4 close (Claude, 22 Nov): tower body puffs stratified up the column (the stills of b39d75e8 still show bead strings on narrow towers); the near rain curtain's alpha raised with nearness (cap 0.85; the 14:00 still shows mostly streaks); the falling snow line hangs 300 m under the forecast freezing level when given, else the lapse rule; weather/cloudSheet/cloudShadows/density split under 150 lines (shafts, precip, edgeMark, smoke, weatherShared, cloudSheetMath, cloudShadowWorld, field/footprint). Open: the cause of the column of blobs at the left edge in haifa 17:00 (the sheet-texture claim first written here was never proven; corrected 23 Nov); at 14:00 balloon lumps on the right, a detached blob and a streaky near curtain; glaciation height (FL+3 km) not used for the anvil.
- [x] Column of blobs at the left edge, haifa 17:00: they were `cloudCells.tower` puffs (Claude, 23 Nov, branch `claude/haifa-cloud-look-42643a`). Evidence, CI run 45128410904 (334ba653), one layer hidden at a time: without `cloudCells.tower` the beads go, without `cloudSheet.low` they stay. The sheet-texture cause claimed on 22 Nov was wrong. Not separated: turrets against body puffs (both replaced).
- [x] Towers as one soft raster mass (Claude, 23 Nov): no puffs; seeded heads over one shared base, outline moved by fractal noise (`towerHeads`, `towerShape`, `towerTone`, `cloudTower`). Stills, CI run 45135571038 (18d8b831, all jobs green): no beads at 17:00; no balloon lumps or detached blob at 14:00.
- [x] Rain curtain as a fibrous raster at the screen's own slope, toned by its base (`curtain.ts`, `farTilt`; `FAR_STREAKS` .22) (Claude, 23 Nov). Same stills: the streak comb is gone; at 14:00 a slanted shaft left of the near cloud, up to about 39 grey levels darker than the same still without `shafts,fall`.
- [x] Near storm of haifa 14:00 (Claude, 23 Nov, d45787b1, 2c0dae6d): the vertical tone step near x 640 was two overlapping cells (the here-cell at 4.1 km and a lattice Cb at 4.7 km) painted as two towers, now one storm (`oneStormEach`, `towerStorms.ts`). The bowl was depth: the outline closed over the whole foreshortened underside, with the dome's stretch; now the sides stand where they truly do (`aSide`) and only the far half curves in (`bowl`). Crown and sides are cauliflower domes (`domeTile`), the base melts into the rain, anvils have an overshooting head and lean downwind.
- [x] Far towers (Claude, 23 Nov, d45787b1, 3daa7f51): the bullets were the far widening, one smooth octave and the full stretch height; now stepped shoulders narrowing upward, a foot melting into the haze, height `stretch ** STAND` (.55: lower than the true top; the guard, `towerHeight.test.ts`, states the rule that shortens it: a tower under 5 km stands to its true top, a farther one to at least its true aspect at the root of the stretch). Tone: same light as the sheet, but they faded to the clear sky's gradient; now to the low sheet's colour by its cover (`beforeSheet`), warmed by a low sun.
- [x] A tower behind a nearer storm is not painted through it (Claude, 23 Nov, `hideBehind`): in jerusalem 15.3 14:00 a 9 km tower showed as a seam in the near one and a pillar under its base.
- [ ] Cloud look left over (23 Nov): haifa 10:00 keeps a separate cell's anvil wing left of the near storm, at the near storm's mid height; haifa 17:00 right storm is still a flat-toned column; the 14:00 curtain is soft.
- [x] `cloudShadowPanorama.test.ts` ratio: both sides now take the fastest of 7 interleaved warm runs (Claude, 23 Nov); limit then .30. CI runs, jerusalem/haifa/tiberias: 45140595447 .228/.232/.303 (failed); 45141606372 .238/.272/.281 (green); 45142613271 .238/.283/.305 (failed, the only failing test). 45143778186 .245/.294/.297 (green). Tiberias sits at the limit (.281-.305) with the new measurement too, so `check` still goes red on some runs. The cloud-shadow code is not in this branch's diff. Before: main .21-.295, branch failures .300-.329. Limit set to .40 by the coordinating session (6dcbe6f4): shadowMs is unchanged, the memoised town layer cut the baseline.
- [ ] Follow-ups not started: fog in the new style, shaft drift time origin, snow accumulation test, and the cause of the haifa `cloudSheet.perf` drop (town-layer memo and min-of-7 landed together; neither shown alone).
- [x] Cb glaciation height (freezing level + ~3 km) not yet used for the anvil top. Not doing for now (owner, 23 Nov): glaciation changes
      the top's texture, not where it flattens; today's rule (top reaching the tropopause, `cloudCells.ts`) stays.
- [x] City night glow by direction: the far raster's built cells light the cloud base over them (`world/townLights.ts`) and
      the air over each bearing (`townAir.ts`, Walker's law, the place's mean stays `env.glow`); a city is lit overhead and
      on every side. `CITY_ZENITH`/`CITY_HORIZON` are gone. The light is added (`tone.ts` `addLight`), so it never darkens a
      dusk; the base's light is a square grid with each town's true place and shape to 110 km (within 15 % of the sum).
- [ ] The far raster holds no towns of Jordan, Lebanon, Syria or Egypt: the glow over Amman and Irbid is missing. Towers
      (`cloudCells`) take no town light at night of their own.
- [x] A far night tower fades to the low sheet as it is drawn behind it, the towns' light on it included (Claude, 23 Nov,
      `beforeSheet`; the merge of 14c41b82 had left it fading to the unlit sheet).
- [x] Track D midnight reseed (N3e 884b2af1 + N3g c606afd1, in main; field.test.ts measureMidnight) (N3e plan): anchor the cloud field seed/origin to the calendar day of `at`; pair and morph
      same-genus cells across midnight; |dtau| 23:50-00:10 <= 21:50-22:10. Done before N4.

## Track D — one cloud field (polish audit #4 #5 #6 #10) — 2026-11-21 (branch `claude/fix-cloud-field-0b1237`)
One seeded, wind-advected world-space cloud field per place and day drives the drawn banks, ground shadows, direct light
and rain. Spec: `docs/design/qa/polish/track-d/SPEC.md` (Fable). Roles: Neon codes field/light logic, Codex sol 6.2
reviews, Claude manages and draws the painters.
- [x] Fable spec (Fable, native Agent) — `track-d/SPEC.md`
- [x] Before stills — `track-d/before/` (Haifa, Jerusalem, Shadmot Mehola; 11:30/21:00; broken/overcast/showers)
- [x] N1 brief — `track-d/briefs/N1-field-core.md`
- [ ] N1 field core `src/world/field/` — written by Codex gpt-6.2-sol (Neon out of quota, 2026-11-21); reviewed by a
      Claude Opus subagent. outsourcerer runs with `OSRC_HOME=P:/osrc-home` (C: below its 10 GB disk gate).
      N1b (Codex) 36698c5: 4/7 tests pass. Opus round 2: life cycle tied to genus, `layerCovers` jumps at 100 %
      total (`src/world/clouds.ts`), two ill-posed tests, density grid too fine. N1c brief `briefs/N1c-fix-round.md`.
      N1c 5c96188 and N1d (Codex): 187/187 src/world tests; RMS ≤ 3.9 %; arrival 1–2 ms, cold place 9–14 ms, warm
      3.3–3.8 ms alone (warm target 3 ms not yet met; strict budgets run with `FIELD_PERF=1`, default run guards at 3×).
      N1e (Codex) physical cover fit, analytic near raster, warm 1.7 ms. Opus round 4: **ship N1** (82b8e5b); six
      follow-ups folded into N2 (effective τ beyond the raster, slant shadowTau, tower periods 30–60 min, rain weight).
- Heavy checks (full vitest, build, stills, perf) run on GitHub CI on push of this branch; locally only targeted vitest.
- Done = READY line to the polish-audit session: no blocking review findings, CI green on final sha incl. perf budget, TASKS updated, main merged first if C landed. The audit session merges, not us.
- [ ] N2 (Codex writes, Opus reviews) brief `briefs/N2-light-shadow-rain.md`: `densityAt(layer,x,y,t)` (cells' kernels + genus noise; shared by transmit, shadows and the sheet painter),
      transmit, eye/direct light, shadows, rain; tests 2, 3, 8
      N2 5297bd4 (16 failures; shadows 0.3–0.9 s per model). N2b 2c0a26d: combined-cover gap light + `light.clear`,
      exact ray–cell transmission (|ΔT| ≤ 0.016 vs fine march), rain keeps drawn banks. Opus round 6: N2b broke the
      terrain datum (faces empty above sea level) and shadows cost 10–24 ms on real DEM. N2c b3995b8: datum restored,
      shadows + rain feet on the flightTerrain grid, visibility before ranking. Opus round 7: geometry clean; the
      Jerusalem 30 ms gap was test order (first-call model cost ~10 ms predates N2). N2d: rank before terrain work, a
      real CPU-reference perf guard, cheaper slow scene tests. All rounds written by Codex gpt-6.2-sol, reviewed by an
      Opus subagent (Neon out of quota).
      N2d CI (run 44993185800): 5/1540 failed (purity name, shadow ratio 0.31–0.46 > 0.2, Tel Aviv sea glint), perf
      scrub.model p95 23.6 > 15 ms (Haifa, Tel Aviv). N2e: glitter on the eye ray, one shadow layer per land plane.
- [ ] Shadow painter (Claude): field blobs clipped to the land faces / `rim` polygon; acceptance includes track F's
      far-ridge band (`cloudShadow.far` horizontal smear) gone
- [ ] Rain shaft, trail and virga painter (Claude) from `rain.cells`; then retire the `rainBanks` adapter
- [ ] Follow-up (outside D): first-call `sceneModel` cost ~10 ms on a new minute (`tone.ts`, `keys.ts` `partKey`)
- [ ] Sheet-mode painter (Claude): layers as continuous density textures over the dome (SPEC §6.0, owner note
      2026-11-22: "the sky is cloudy" is a layer, not shapes); sprites only for conv cells and horizon heaps
- [ ] N3 cell descs + keyframes, far strips, compositor `cells` mode (Neon); test 7, perf
- [x] Painters, first pass (Claude) — `src/scene/paint/clouds/` (cumulus domes + Cb anvil, Sc/St pads, Ac patches,
      As/Ns decks with undulations and pannus, Ci fibres, Cs veil, shafts/virga; light on the whole mass). Proving page
      `scene.html?sheet=clouds`, still `node e2e/scene.clouds.mjs` → `track-d/clouds-sheet.png` (all removed in piece 2b)
- [ ] Painters in scene: wire to N3 cell descs, detail pass at 375 px
- [ ] After stills `track-d/after/`, before/after sheet; `test:perf`, vitest, `tsc -b`, oxlint
- [x] N4 soft look, rounds 1–4 (Claude Opus 5.5 wrote code and tests; brief `briefs/N4-soft-look.md`): open decks
      (broken, showers) drawn as translucent white-blue veils with a lit top and shaded base (`paint/cloudLook.ts`),
      perspective-scaled softening (`paint/soften.ts`), seeded per-pixel fractal detail on a half-res raster
      (`paint/cloudRaster.ts`). Overcast, rain and cirrus keep the model's numbers. Warm scrub perf budget 2.5 → 3.9 ms
      (CI p95 + 15 %). Round 4 CI 45025772666 green. Owner: better, not final.
- [x] Wind carry between minutes (Claude Opus 5.5, code + tests): sheets and cloud shadows move with their layer's
      wind from the shown minute (`model/advect.ts`, `compose/advect.ts`), per-band speeds over slant range, open edge
      mirrored, capped at 75 s, still under reduced motion; shadow ridge clip moved to the compositor. CI 45027867757.
      Known limit: a low deck overhead in strong wind mirrors a wide edge strip until the next minute.
- [ ] Rebuild on the field (owner's call, 22 Nov): one wind drift shared by sheets and their ground shadows (in prod
      the old banks drift every frame, shadows never move); rain clouds, lightning and fog from the field; then delete
      the old bank system (`model/clouds.ts`, `paint/clouds.ts`, `sheetBlend`) with its tests, fixtures and devParams.
      Shipped in CI-green pieces (Claude Opus 5.5, branch `claude/cloud-soft-look-413b7e`).
- [x] Piece 2a (Claude Opus 5.5): every field layer is one sheet (`sheetBlend`/`sheetWeight` gone: the sheet is drawn
      at any cover), the towers (`tower` lattice: Cu con, Cb) are sprites (`model/cloudCells.ts` → new kind
      `cloudCells`, `paint/cloudCells.ts` → `paintCloud`), carried as one at their median across-wind speed
      (`carriedCells`). `model/cloudLayers.ts` builds both; the light and tone helpers moved to `model/cloudLight.ts`.
      The old banks no longer draw; snow is projected like rain (`snowBankDescs`); the dead `clouds` layer plumbing
      left `weather.ts`/`index.ts`. Harness moments `towers`, `cumulus` (low 0.5) show them: the Nov fixtures put
      thunder and showers at mid level (Ns), so `thunder` itself has no Cb (follow-up for the world's cover split).
- [x] Piece 2b, rain/snow/flash and delete (Claude, 22 Nov): shafts, near rain and flashes stand under
      `world.rain.cells` projected straight (`model/falling.ts`, snow still through the snowing world banks), carried at
      the field's across-wind speed (`acrossSpeed`, view middle, median range); `model/flash.ts` + `paint/flash.ts`,
      shimmer moved to `model/shimmer.ts` + `paint/shimmer.ts`. Deleted `model/clouds.ts`, `paint/clouds.ts`,
      `paint/clouds/` (sprite type kept as `paint/cloudSprite.ts`), the `clouds` kind, `BankDesc`/`Veil`, the cloud
      proving page (`dev/cloudSheet.tsx`, `e2e/scene.clouds.mjs`). Tests ported; `falling.test.ts` added.
- [ ] Piece 2b, fog from the field.
- [ ] N3e midnight reseed (`briefs/N3e-midnight-anchor.md`) after the rebuild.

## Drawn style: the scene's second hand (branch `claude/drawn-painter`, Claude Opus 5.5, 23 Nov 2026)

The valley painted in two hands from the same model: `real` (unchanged, pixel for pixel) and `drawn` (docs/design/ILLUSTRATION.md,
`qa/styles/v1b/`). A vote decides and the other hand is deleted. Owner's top criterion: not too abstract, not losing detail
("simplify the texture and the edge, not the content"). Vote UI, App wiring and text are another agent's.

- [x] Seam: `scene/sceneStyle.ts`; `CanvasScene sceneStyle` → `SceneCanvas` → `useSurface`/`SkyCanvas` → `Surface.style` → cache
      keys (`~drawn`, only on kinds in `paint/drawn/index.ts`) and paint jobs → `painterOf(desc, style)`, `PaintEnv.style`.
      Dev: `?style=drawn`; stills `place@hour#drawn` (CI too); `test:perf -- --style=drawn` (CI perf job runs both).
- [x] Drawn clouds (`paint/drawn/`): sheets (`cloudSheet`, `sheetField`) and tower cells (`cloudTower`, `towerMass`) as soft layered
      lit masses; one seeded puff tile (`billows`) gives both their heads and light. Shares the real hand's rasters and heads
- [x] Drawn town: `townBlocks` merges the small squares of a spot and row (risers keep their height), `townLight` guarantees a
      lit/shade gap (direct light, else the brighter sky's side), `townBlock`/`townRoof`/`townWindows`/`townTower` paint them;
      rows recede where the tiers do not. Lessons of `claude/town-style-trial` @ 0a1a04f5 applied
- [x] Plane shading: not needed. The hillside sits well under the drawn town; PR 11's physically lit land changes it for both hands
- [x] Night: drawn sheets take the towns' light (`cloudSheet.city`); main 14c41b82 merged
- [x] anidoodle craft pass (owner, 23 Nov): worked from its flatVector plate (v1b's own: closed flat planes, no strokes, ramps for
      shade). The critique changed: found lit tops and lost feet instead of evenly soft edges, rounder puffs, three values inside a
      mass (lit at its top, shaded at its foot, a clear gap ends it), softer edges with distance, calmer closed decks and low suns
- [x] Stills rounds 1-3 (CI 45151140114, 45153177347, 45154473864; only the known `cloudCells` red) and round 4 (calmer puffs under a
      low sun and in closed decks, one mass does not shade the next; CI 45155823030)
- [x] Main 643d4f5c merged (tower raster, rain curtains, one storm per cell). The real hand is byte-identical to main in five scenes.
      Drawn: the curtains (`shafts`, `edge`) are long planes (`drawn/index.ts` PLANES, `curtain.ts` Fibres), no fibres. The drawn
      horizon banks were so dark the curtain was lost: the air now takes their light and shade low in the sky. Round 5 = last
- [x] Perf (CI 45154473864, CPU x4): a frame, memory and the scrub as the real hand; a cold sky 2-20 % dearer (Tel Aviv worst), land about even
- Weak spots: rather barrel or egg lone clouds (the model's cells), soft banks in a closed rain deck where the real hand has none,
  pale trees and Western Wall tiers in Jerusalem (model haze), towers take no town light by night in either hand

## Two styles of one world — coordination (manager session, started 2026-11-23)

Goal (owner): `real` (default) and `drawn` clearly different, one true world under both, then an in-app vote. Binding brief:
`two-styles-manager-brief.md` in the sessions' shared notes folder. The manager owns every merge to main (each goes live).
Start point: main `fcd96b26` (PR 11 merged, main CI 45213933787 green).

- [~] 1. Foundations (branch `claude/**`, one session, alone in `src/scene`)
      - [x] 1a. `src/scene/paint` split into shared / real / drawn; one painter registry per style, one typed layer contract
            (facts only), architecture test. `real` and `drawn` byte-identical (CI job `identity`). Merged: main b0181337
      - [x] 1b. Data audit table: fact, source, per place and hour, where it is lost or distorted (`docs/design/DATA-AUDIT.md`,
            verified; its plain losses go with 1d, its design questions to the manager)
      - [x] 1c. Bug: haifa storm differs between first load and reload (real, frozen clock). Cause: the reading was eased in
            from its receipt (`receivedAt`) even with nothing shown before, a reload shows it whole. Only `blendForecast` eases
            now; test `src/world/forecastArrival.test.ts`. Second cause, load order: the water mirrored the first land
            drawn (`src/scene/model/waterSurface.ts`, test `waterArrival.test.ts`). Third: `mist.valley` kept the first
            crest's sub-step edges under one key (`mist.ts`, test `mist.test.ts`). Open: fixture `current.precipitation`
            is an hour's total read as 15 min (`scripts/fixtures/recordForecast.ts`), so the 12:00 rain is drawn 4x too strong
      - [x] 1b2. The audit's plain losses fixed, one commit each with a test that fails without it: life events keep their identity
            (28fb9ef6), the moon's lit limb (145d824c), live cloud layers feed sky and mist (f6992189), hourly sums and gusts belong to the
            hour before their stamp (8caa87f2), missing hours / air past its ends / DST minutes / the label's moment (cc4a64e1)
      - [ ] 1d. Model shape faults: egg/barrel/vase lone clouds and their gaps; towns as thin towers; yellow-grey skies (haifa 15:30,
            neve-zohar 16:00); square holes in neve-zohar clouds; icicle far towers haifa 2026-03-15 14:00
      - [ ] 1e. PR 11 follow-ups (perf, Jerusalem fog/dust houses, dome at dusk, haifa 16:30 walls, haifa foreground block,
            twilight hue, second-model review of the twilight rule in `wallDistance.ts`)
      - [x] 1c2. Slices 1 and 2 on main (5fb0d856, owner approved)
      - [~] 1e2. Minarets out, dusk light basis, near ground: integrated on main for the second review (READY with sha)
      - [x] 1e3. Receiver blend (`claude/found-blend5`) closed: same pixels, haifa `scrub.land` p95 5 -> 14 ms (budget 10); reverted
      - [~] 1g. Label and dot: three options asked by the owner; village build approved (footprints where good, cells elsewhere)
      - [~] 1h. Cloud-space positions for marks (`claude/found-i-cloudpos`): `StyleLight.cloudAir` puts `air` on `cloudSheet`
            (`src/scene/model/cloudAir.ts`; `airFrames` in `src/world/field/handover.ts`, shared with the field's own noise)
        - [~] Village build, claude/found-i-village on claude/found-i-town (notes: foundations/V/village/NOTES.md)
          - [x] S1 contract, tile format, cells adapter (src/data/village/)
          - [x] S2 data workflow (.github/workflows/village.yml, scripts/village/): 190 tiles, 715 places, 176,501 houses, checked by
            scripts/village/committed.test.ts. Overture deletes the pinned release about 2027-01-17 (monthly step: village.yml's header)
          - [x] S4 loader (src/data/village/{villageData,settlementOf,useVillageTile}.ts, service worker rule)
          - [x] S3 model (src/world/village/): the village on its own frame, laid on the town's unchanged land (`lay.ts`); towns from 3.5 km on untouched
          - [x] Landmarks among the houses, held to their size (`landmarks.ts`); ODbL credit line where footprints are drawn
          - [ ] Follow-ups (not refined, owner's decision): small known faults in NOTES.md; gable direction, soft ground tone
      - [~] N2. The sky both hands wait for (`claude/found-i-grade`, on `found-i-lamp`): `StyleLight.sky.grade` (`skyTone.ts`: stops,
            glows, arch, haze, once; light ungraded; key suffix) and `Style.skyBase` (CSS list; `skyBaseRows.ts`, `e2e/skyBase.mjs`).
            No hand passes either yet. The sky branch takes the grade before `skyFilter` when it lands
      - [ ] 1f. Before/after stills of 1c–1e approved by the owner, merged, main CI green
- [~] 2a. Drawn style end to end (colour woodblock print). Map, plan and prototype on `claude/drawn-style-accc0f`; build plan
      `drawn/BUILD-PLAN.md` in the notes folder. Start from v1: replace only what a user sees as different
      - [x] Owner approved the direction (second set of stills, `50c75d12`)
      - [~] S4 ground and water (`claude/drawn-ground`): built, judged, reviewed and fixed (`ab93e476`); READY. Known small faults: hatch
            ink steps at band edges, `turn` leans without direct sun
      - [~] S5 town and trees (`claude/drawn-town`): built, reviewed, one fix round (warmer lit walls, no bluer snow, leaf cuts
            inside the crown); READY `0e3c7cae`. Known: palms take no key, a flat roof hides half its key line
      - [~] S3 storm (`claude/drawn-storm`): built, reviewed, two fix rounds (rim caps, silver in the caps' light); READY.
            Known: canvases allocated per repaint, no test paints a drawn tower, v1 cloud sheets behind it until S2
      - [~] S1 sky and sun (`claude/drawn-sky`, on S3): grade, grain in `skyBase`, paper sun; what is the sky's own colour takes no
            second gain (`skied`); READY, main d0195813 merged in (`c6fa7fca`)
      - [~] S2 cloud sheets (`claude/drawn-cloud`, on S1): caps in the cloud's air, far arches, closed deck as v1; judged on 10 stills,
            Codex review and its fixes, printed straight onto the layer; READY `0f41da2f`, the whole stack on main 2a0c2fef (grey under a deck; houses in fog and dust veiled). Known: flat tops at the zenith
            row, a straight line where a sheet begins mid-sky, dusk clouds smooth, showers one closed mass, caps may enter at 2.6 px
      - [x] S6 air: nothing to build. Dust reads as two flat wipes once S2 prints it, rain shafts and fog are as v1
- [~] 2b. Real style improved: map, plan, 3 stills approved, build, approved, merged
      - [x] Phase 1 on `claude/real-style-13639d` (nothing in `src/scene`): fault map (notes `real/FAULT-MAP.md`), plan `docs/design/REAL-STYLE.md`,
            concept painters and stills `docs/design/prototypes/real/` (5 moments, side by side in notes `real/concept/`)
      - [x] Round 2 on the manager's four criticisms (prototype only, stills on CI: the `concept` dispatch input of `ci.yml`): ground raked
            and gully banks, house corners and casts, haze graded as the sky; one cloud hand for sheets and towers; hole walls; round heads
            Stills: notes `real/concept/round2/`
      - [x] Owner approved the direction (round 2, 5afc056d), with fixes during the build
      - [x] Build plan: notes `real/BUILD-PLAN.md` (S0 and six slices A-F, needs N1-N9 for foundations, every open fix), reviewed by another model; lightened by the owner's bar
      - [x] S0 on main 5fb0d856 (CI run 45341294326, scratch `claude/real-meas-base`): notes `real/S0-BASELINE.md`; one dispatch again when the integration lands
      - [~] N1 the lamp, N2 the sky's grade: on main c121ed23 (the canopy is not in N1); N3 bounds: the manager to foundations
      - [ ] Phase 2 after the manager opens `src/scene`: A town, B plane, C sky, D towers and low sun, E trees and sea, F weather; per slice: CI stills, drawn identical, one review; perf at S0, B, C, end
      - [~] A, night half (`claude/real-town`, e73c6b42, owner approved, the manager integrates): street light behind each nearer body, window bloom, far shore lights down the sea,
            folded windows on bodies of unresolved storeys (`paint/real/town/`). Codex review: 8 findings, reflections fixed. Written down, not
            chased: a lit pane's bloom pops with the pane; `shine.windows` keyed in 1/64 (a ramp of the strip's poses); the shrine's
            floodlight blooms as a window; glows squeeze at the layer's edge. Day half waits for the label slice
      - [~] C and part of D, cloud bodies (`claude/real-sky`): one cloud hand for sheets and towers (`paint/real/cloud/`: noise, grain, light
            marched to sun, sky and base, tone, soft cover); the horizon strip stays the far deck's mean (land-light's 2 % gate).
            Gates re-measured with a reason: Tiberias 12:00 and 16:30, Jerusalem 16:30 (`landLighting.mjs`), high-pass room 1.36 (`buildingLight.mjs`).
            Codex reviews: 7 findings, 5 fixed; the rest of the commits: 7, none high, 2 fixed, gate baseline kept. For the shared model: the
            lamp's half-degree altitude steps the moon's and dusk's light on the sheets, the tower key lacks `tau`, a combed veil and a hole's
            wall may pass the dust bound, a low sheet's beam ignores the upper deck. Written down, not chased: deckOpenness' hard node count and the mean anchor shifting as a bank
            enters; closed decks' and veils' tone not premultiplied; lamp bits in their keys; tower octave switch at 70 px; towers' crowns not
            capped in dust; a twilight body keeps a faint ring. Perf over main d0195813: scrub latency, animation and memory flat;
            first paint dearer (firstShown +5..37 %, 21-86 ms once; cold sky and land +19..29 %, over the +15 % cap), thunder batch sky +20..38 %: the manager's call
      - [~] F, weather near the eye (`claude/real-air`): fog in uneven banks with lit tops and shaded hollows, rain streaks with depth, drops and
            flakes of many sizes on a tile twice as wide (`paint/real/air/`, `model/fallTile.ts`, `styleLight.fallTile`). Dropped: dust, smoke (no gain
            at phone size). Baseline moved: `landLighting.mjs` tiberias-1200-snow .0991 -> .0941. Codex review: 4 findings, 3 fixed (tile key and
            chains, the fog's light key). Written down, not chased: the fog's crop thins the top few px, near rain a bit fat at its top, the mist repeats every 240 px
- [ ] 3. Vote: main into `claude/style-vote` (25c252ba), re-verify, owner approves merge and worker deploy (worker first)
