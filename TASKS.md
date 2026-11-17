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
- [ ] Next: climate-relative thresholds (what is "hot"/"windy" depends on the place), place-aware sentences

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
- [ ] Stale service worker kept an old bundle on prod until unregistered → add an update prompt / skipWaiting
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

## Known gaps / polish
- [ ] Hero meta column hugs the left edge on wide phones; village dot tight against sheet edge
- [ ] Rain/dust/heat seen via `?wx=` overrides, not yet in real weather
- [ ] Screen-reader pass on a real device (VoiceOver/TalkBack)
- [ ] Lighthouse PWA/perf pass on a deployed build

## Next (proposed)
- IMS (Israel Meteorological Service) warnings
- Radar (RainViewer tiles), Capacitor wrap
- Verify blend weights against observed station data (IMS station near Shadmot Mehola / Tirat Zvi)
