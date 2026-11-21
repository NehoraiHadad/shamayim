# App-wide polish audit — 2026-11-21

Read-only audit of the canvas valley scene and the UI on `main` at `296f907`. No app code was changed.
Evidence was taken from the recorded fixtures (`src/test/fixtures/forecast-*.json`) through `scene.html?place=&at=&weather=`
and vitest probes over the bundled data. Live services were not called.

Owner rules the proposed fixes keep:
- true to nature, automatic from data, one world state drives everything;
- no point fixes for particular places;
- painters pure in time and phase, seeded rng, no clock in painters, no `ctx.filter`.

## Prioritised findings

| # | Sev | Area | Symptom | Root cause (file:line) | Proposed general fix | Effort |
|---|---|---|---|---|---|---|
| 1 | P0 | Buildings / light | Asymmetric buildings flip mirror-image 4–6 times a day, even at k≈0.001. Seen at Shadmot Mehola's synagogue and Karmei Tzur's mosques. | `src/scene/paint/glyphs/index.ts:86,89` mirrors the whole shape when `glyphSide` (`:100`) returns side −1. The side is the sign of `faces.left − faces.right` with no dead band. `kit.ts:13,53` assumes "symmetric at k=0, so mirroring never shows", which is false for `minaret`, `synagogue`, `church`, `homes` and `castle` in `glyphs/buildings.ts`. | Never mirror form. Each mark gets a fixed handedness, seeded or from its true orientation. Only the light layer follows the light: lit and shade faces weighted continuously by the signed face difference, plus the cast shadow, the way `SIDED` icons already work. Delete the sign switch. | M |
| 2 | P0 | Marks / ownership | Karmei Tzur is drawn with mosques, while its own synagogue is missing. Same bias at Rosh Pina: 30 m minarets 5 km away show, while Safed's 9 m synagogues do not. | (a) `src/data/landmarks/overpass.ts:37` gives every mosque, `building=mosque` included, a default height of 30 m. Synagogues get 9 m (`:38`) and churches 25 m (`:41`). (b) `src/world/marks.ts:203-204` `nearBeyond` shows any mark ≥ 20 m (`:47`) within 6 km. (c) `ofPlace` (`:50`) uses `placeBounds` (`src/data/city/bounds.ts`), a hamlet-weighted cell (reach 0.5 km) that leaves out Karmei Tzur's own synagogue at 0.83 km. | (a) Heights by evidence, with symmetric defaults across religions: a hall height for any house of worship, and a minaret or tower height only from `tower:type`, `building=minaret` or a height tag. (b) Ownership from the place's own built footprint (home cluster or admin boundary); the cell reach should come from that cluster. (c) A beyond mark is drawn only on its own settlement's mass, at that distance's size and haze, never floating on bare hills. | M |
| 3 | P0 | Life motion | Birds and planes stand still, then jump every minute. Low planes jump up to about 30 px. Flocks only sway ≤ 5 px. | `src/world/lifeSchedule.ts:187,556` evaluates positions at the shown HH:MM only. The world is rebuilt by `src/ui/useNow.ts:11` every 60 s. `src/scene/model/life.ts:224-262` gives flocks a 24 s sway (`SWAY_S`, `:217`). Aircraft get a fixed `placed` and no flight track. | The model emits a `flight` Track for each mover: its own path over the next 60–120 s in sky px, relative to `placed`, not looping. The compositor plays it at (loop phase − the phase when that minute's world was laid) through the existing `trackAt` / `animated.flight` (`scene/model/anim.ts:158`). Painters stay pure. Each minute rebuild continues from where the track was. The same applies to contrails, meteors and cloud banks. | M–L |
| 4 | P1 | Light vs clouds | The sun stands in clear sky while the land is dull, or a dark smudge lies under a nearly clear sky. Examples: Jerusalem 12:00 broken, Haifa 09:00 broken, Shadmot 10:00. | `src/world/light.ts:39-41,120` sets the land's direct light from `cloudTransmit(covers)`, an average over the cover, not from whether the drawn disc is behind a drawn cloud. `src/scene/model/cloudShadows.ts:68,87` seeds shadow patches by place and band and advects them since midnight. They have no relation to the drawn banks. | One world-space cloud field per place and day, advected by the wind integrated since an epoch. From it come both the drawn banks and the ground shadows, projected along the sun or moon ray. Direct share = transmission along the actual line to the disc. Each land patch is lit or shaded by the same field. | L |
| 5 | P1 | Clouds | The cloud layout is identical at every hour, day and season for a place (matrix sheets: 01:15 and 07:15 match). | `src/world/clouds.ts:90-91` `banksOf` seeds positions by place and bank index only ("so they never jump"). | Covered by #4: seed by place and day, and move by integrated wind, so the clouds change smoothly with time and never jump. | (in #4) |
| 6 | P1 | Clouds | The drawn sky looks much clearer than the stated cover: 50 % broken draws about 2 clouds over Jerusalem. | `banksOf` bank count and size against cover (`src/world/clouds.ts:91-112`). | Calibrate the drawn coverage fraction, the projected sky area actually covered, to the cover value. Add a test that measures covered area per cover. | S–M |
| 7 | P1 | Hebrew / bidi | Below-zero temperatures read "3°-" in the headline sentence (Mitzpe Ramon, Hermon, snowy Jerusalem nights). | `src/text/phrases.ts:65` builds the minus from an ASCII hyphen. `src/ui/isolateNumbers.tsx:2` matches only U+2212. | Make `deg()` use `formatTemp` (U+2212). Let `isolateNumbers` accept `[−-]`, or have the text layer emit the isolate itself. Add a compose test with a negative temperature. | S |
| 8 | P1 | Hebrew / bidi | The hero line "מרגיש כמו −5°" puts the sign on the wrong side. | `src/ui/Hero.tsx:19,42` shows the raw string. | Route every numeric string through one isolating helper. | S |
| 9 | P1 | Perf | Model cost is over budget at every perf place. `modelCold` p95 is 49–65 ms against a budget of 10. `scrub.model` p95 is 34–68 ms. The animation frame p95 is 6.9–13.2 ms against a budget of 4. | Every bird and aircraft layer id carries the minute, so a scrub repaints all of them (see the perf log's "scrub repainted" list). The model rebuilds life on each scrub. | Fix #3 makes movers keyed by identity, not by minute, so a scrub only moves their tracks. After that, profile `modelCold`. The machine was loaded during this run, so re-measure before acting. | M |
| 10 | P2 | Rain | In showers (Jerusalem 16:30) rain streaks cover the whole sky, gaps included. | Rain is drawn over the full sky width, not under the raining banks (`rainFrom` / raining banks). To be verified. | Rain falls only from banks that rain, in the same cloud field as #4. | S–M |
| 11 | P2 | A11y | Only the top block is in `<main>`. The wear card, week list, rain-map entry and attribution sit outside any landmark. | `src/App.tsx:129-143`. | Put both blocks in one `<main>`. | S |
| 12 | P2 | A11y / contrast | The height label over the canvas is 11 px at opacity .68, with no contrast test. | `src/scene/react/Scene.module.css:275-290`, `SceneOverlay.module.css:242-249`, `tokens.css:23`. | Minimum 12 px, no opacity, add a contrast test. | M |
| 13 | P2 | Small text | Many captions are 10.5–11 px. | `tokens.css:23`, `OverheadPage.module.css:131`, `MapMarks.module.css:38`, `WearCard.module.css:23`, `markers.module.css:18,42,114`. | One minimum caption token, 12 px. | S |
| 14 | P3 | Hebrew / bidi | The height label can render as "−137 מ׳" with the unit on the wrong side. | `src/scene/react/SceneOverlay.tsx:22` strips the unit and appends it outside the `<bdi>`. The text is built in `world/place.ts:76` and `world/world.ts:83`. | Build the label with a single isolate (number + unit) in the text layer. | S |
| 15 | P3 | Hebrew / bidi | The daylight range "05:40–17:00" reads left to right. | `src/ui/week/DayDetail.tsx:383`. | Isolate each clock separately. | S |
| 16 | P3 | RTL icons | ▶ points backward on the RTL rain timeline. Close buttons use mixed glyphs. | `TimeRail.tsx:37`, `OverheadPage.tsx:117`, `PlacePicker.tsx:184-188`. | Shared SVG icons in one `IconButton`. | S |
| 17 | P3 | Place picker | Geolocation denied, timeout and unavailable all say "no permission". There is no result count for screen readers. The offline search error does not mention the network. | `src/ui/PlacePicker.tsx:163,167,206`, `PlacePickerSearch.ts:33-36`. | Separate messages per error code. Announce through the existing `role=status` element. Check `navigator.onLine`. | S |
| 18 | P3 | Keyboard | The valley slider lacks Up/Down and PageUp/PageDown. | `src/scene/react/SceneScrubber.tsx:210-218`. | Add the keys with the hourly strip's RTL mapping. | S |
| 19 | P3 | Alt text | The canvas label omits the place and the weather. | `src/scene/react/sceneLabel.ts:7-14`. | Add both. | S |
| 20 | P3 | Offline / PWA | Going offline with cached data is not announced. A new service worker reloads the page mid-use. | `src/ui/StatusLine.tsx:446,468`, `src/pwa.ts:11-17`. | Live announcement. Defer the reload until the page is idle or hidden, or prompt. | S–M |
| 21 | P3 | Loading | Before JS runs the page is an empty navy screen. | `index.html:20-22`. | A Hebrew `<noscript>` and a static "טוען…". | S |
| 22 | P3 | Consistency | Gutters, focus rings and colours are re-declared by hand across modules. | `src/index.css:52`, `Sheet.module.css:5`, `HourlyStrip.module.css:4-21`, focus rings in 13 modules, colours in `States.module.css:21` and others. | Tokens `--bleed`, `--focus`, a single `:focus-visible` rule, and contrast tests for the new pairs. | M |
| 23 | P3 | Light | Light side snaps between left, null and right at ±0.02. | `src/world/light.ts:44` `sideOf`. | Once #1 lands, nothing needs a side sign. Expose the signed continuous value only. | S |

Suggested order: #1, then #2, then #3 (which also clears most of #9), then #4 with #5, #6 and #10 as one cloud-field change, then the UI batch #7, #8 and #11–#22.

## The four known items

### 1. Life motion (#3)

How movement works now:
- `lifeSchedule` already holds continuous paths, `trackPoint(track, speed·(t − t0))`.
- It is evaluated only at `secondsOf(at)` (HH:MM), and `useNow` rebuilds the world every 60 s.
- Between rebuilds a flock only sways (≤ 5 px over 24 s) and flaps, and a plane is static.

Measured per real minute on 2026-11-17 fixtures, at 1.5 px/deg (`domain/camera.ts:28`):

| Mover | Angular step per minute | Jump on screen |
|---|---|---|
| Birds | 1–10° | up to about 15 px |
| Low aircraft | up to 20.8° | up to about 30 px |
| High aircraft | 1–7.5° | up to about 11 px |

The fix keeps one world state: the model samples the same continuous path ahead and hands the compositor a Track. Only the compositor knows the loop phase.

Open owner decision: while scrubbing, should life keep moving in real wall time, with the set of objects following the shown hour? That is our reading of the owner's wording.

### 2. Karmei Tzur drawn with mosques (#2)

From the bundled data, with the place at 31.6047, 35.1081:

| Mark | Distance | Height used | Drawn? |
|---|---|---|---|
| מסגד עסירה (`building=mosque`) | 1.61 km | 30 m (default) | yes, as beyond (≥ 20 m) |
| mosque | 1.84 km | 30 m | yes |
| Beit Ummar mosques | 2.09–2.64 km | 30 m | yes |
| "ديوان آل الواوي" (tagged as a minaret) | — | 30 m | yes |
| שבת אחים synagogue (Karmei Tzur's own) | 0.83 km | 9 m | **no**: outside the cell, under 20 m |

The place's bounds are a reach-weighted cell around a hamlet point (kind 3, reach 0.5 km). Everything of Karmei Tzur's own falls outside that cell.

So the neighbours' tall-by-default mosques are drawn at their true bearings, with no neighbouring town mass under them, and read as the place's own. This is a data-honesty and ownership bug, not a Karmei Tzur bug: Rosh Pina shows the same asymmetry against Safed.

The panorama harness has no Karmei Tzur fixture, so this was verified from the data rather than a still.

### 3. Buildings flipping by hour (#1)

`glyphSide` on 2026-11-17 for Shadmot Mehola (same pattern at Rosh Pina and Jerusalem):

| Time | Side | k |
|---|---|---|
| 06:30–11:00 | +1 | |
| 11:30 | −1 | 0.064 |
| 14:00–14:30 | 0 | (cloud) |
| 15:00 | −1 | 0.001 |
| 16:30 | 0 | |
| 17:30 (moon) | +1 | 0.007 |
| from 18:00 | −1 | |

That is 4–6 shape mirrors a day. The cache is not stale: the light key includes side and faces, so the flip is the mirror itself.

This is a regression. `TASKS.md` (2026-11-19) records that the old SVG scene fixed "houses rotate" at Karmei Tzur by swapping at k≈0. The canvas mirror brought it back for every asymmetric glyph.

Stills: `flip/shadmot-mehola-{0700,0930,1130,1230,1430,1600,2100}.png` and `flip/shadmot-synagogue-strip.png`.

### 4. Sun and moon light and shade versus clouds (#4, #5, #6, #10)

Three independent random sources now decide what should be one fact:
1. The drawn banks: seeded by place and index, identical at every hour.
2. The land's direct light: the mean over the cover.
3. The cloud-shadow patches: seeded by place and band, advected since midnight.

None knows where the others are. Examples in `clouds-sheet.png`:
- Shadmot 10:00 broken: a big dark patch on the right under a nearly clear sky.
- Jerusalem 12:00 broken: a clear sun over dull land.
- Jerusalem 16:30 showers: rain over the clear gaps.

The fix is one cloud field that all three read from (see table #4).

The 22° halo at noon on every matrix date comes from the fixture's cirrus. It is correct, not a bug.

## Sweep coverage

- **Weather stills (dpr 2, 375 px):** Haifa, Shadmot and Jerusalem; broken, overcast and showers; day and night. See `clouds-sheet.png`.
- **Matrix (dpr 1, 375 px):** Jerusalem, Haifa, Ein Gedi and Ramon Crater × 06:30, 12:00 and 18:30 × 2026-01-15, 04-15 and 07-15. See `matrix-0115.png`, `matrix-0415.png` and `matrix-0715.png`.
- **Flip strip:** Shadmot Mehola through a day, in `flip/`.
- **UI sweep (RTL, a11y, loading, offline, consistency):** from reading the code. The bidi cases were checked on a static RTL page in headless Chromium. Items #7, #8 and #11–#22 come from it.

Checked and fine:
- tap targets, focus visibility and reduced motion;
- error and offline states, other than #17 and #20;
- sky-text contrast and Hebrew grammar in `src/text/`;
- the "‹" direction on the rain-map entry.

Gaps:
- No desktop-width stills; the UI sweep covered desktop only from code.
- No Karmei Tzur still, because there is no fixture.
- No real-device frame timing; the perf run used CPU ×4 under load.

## Perf (`npm run test:perf`, exit 1, over budget ×1.5)

| Place | modelCold p95 | scrub.model p95 | anim frame p95 | arrive frame p95 | memory |
|---|---|---|---|---|---|
| haifa | 65.0 ms | 34.2 ms | 13.2 ms | 9.4 ms | 29.6 MB |
| tel-aviv | 61.3 ms | 67.9 ms | 6.9 ms | 7.0 ms | 27.4 MB |
| shadmot-mehola | 49.1 ms | 48.9 ms | 8.1 ms | 4.1 ms | 24.6 MB |

Budgets: model 10 ms, frame 4 ms, memory 48 MB. The land and sky paint stages are within budget.

The scrub repaints every bird, aircraft and contrail layer, because their ids carry the minute.

The run shared the machine with a vitest run and a headless browser, so the absolute numbers are pessimistic. Re-measure on an idle machine before acting.

## Unit tests, typecheck and lint

**vitest:** 1180 passed and 50 failed, across 120 files in 290 s. Every one of the 50 failures is `Test timed out` (5 s default), on a machine also running perf and a headless browser. Three of the failing files (`planes`, `world` and `wear`) re-run alone: 88/88 passed.

A P3 follow-up: the heaviest model suites sit near the 5 s default even on an idle machine. Share the built world per place across tests, or give those suites an explicit timeout.

**`tsc -b`:** clean.

**oxlint:** exit 0, with warnings only:
- an unused import in `docs/design/prototypes/canvas-scene/styleMid.ts`;
- `set-state-in-effect` in `src/data/land/useLand.ts:34`.
