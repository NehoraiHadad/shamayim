# Handoff: a truer valley scene (2026-11-19)

For the next session. The owner wants the main scene (the south panorama everyone sees) to stay as true to nature as
possible, and to gain what proved good in the turning-view experiment. **First task: show the owner how it would look
(stills), before building it** — see §5.

## 1. What happened on this branch (`ccr-85ec24f0-9ayxgu`)
- Explored a turning view (`?view=turn`): a 360° world, a camera you turn with a compass, the place on a "stage" seen
  from a pole, real land colours, fast strip rendering, rain where the radar sees it. Built end to end (phases 1–3 of
  `TURN-VIEW-PLAN.md`; review in `camera-fable.md`).
- Verdict (owner, agreed): it reads as a weak drawing. The scene's style is a composed, fixed illustration; turning it
  breaks the composition, the pole-vs-eye mix looks pasted, and satellite tints over flat illustration land in between.
  **The turning view's UI is to be removed** (TurnScene, Backdrop, Compass, stage, useHeading, sector strip, the
  `TURN_VIEW` flag and the turn-only branches in ValleyScene/App). Its history stays in git.

## 2. What is kept (infrastructure, all tested, default scene byte-identical)
- `src/domain/camera.ts` — the one place that maps an azimuth to x (today: heading 180, mirrored, 1.5 px/°).
- `src/data/world/world.ts` — the horizon every 1.25° (today's south panorama is an exact subset).
- Physics: visible sunrise/sunset, rim glow and sunlight are judged against the land in the sun's own direction.
- `src/data/land/` — land cover (ESA WorldCover 10 m → `public/data/land/il`, 625 cells, 1.9 MB gz, workflow
  `land.yml`) and this week's colour (Sentinel-2 L2A window read in the browser, `geotiff` lazy-loaded, 5-day cache).
- `src/data/world/rainView.ts` — rain along any direction from the radar grid (`RadarOutlook.grid`), cloud base and
  storm-top heights; `rainMark` (the one-line Hebrew summary).
- `src/ui/scene/sceneBaseline.test.ts` — six real places (recorded panoramas) × four hours, pinned (React ids
  normalised). Any visible change to the main scene shows here and needs stills + re-record in the same commit.
- `ridgeLightPaths` takes an optional per-x light direction (`rayAt`).

## 3. What is not true in the main scene today
1. **The village sits on the near ridge's crest due south** (`panoramaTerrain.ts` `centerY`, `hillScene.ts`), not where
   it is. Shadmot Mehola (−175 m, valley floor) is drawn ~17 px *above* eye level, on a hill several km away.
2. **Marks within ~2 km stand on the near ridge in their direction**, not on the ground at their distance (Shadmot's solar
   field, 600 m away, is drawn on a ridge kilometres off). `project.ts` `sightLayer`.
3. **Hand-set positions** (`curated.ts` `x`): Shadmot's palms are ~2 km *north* (behind the viewer) yet drawn in front.
4. **Mirror:** the view shows the south with east on the right. Someone facing south sees east on the left; landmarks
   (Jerusalem, Tel Aviv) appear reversed against what people see. Owner decision pending (§6).
5. **Loading stand-in:** a hand-drawn cross-section, then the real land pops in.
6. **Vertical exaggeration:** angles near the horizon are stretched ~6.5× (`angleScale.ts`, `RELIEF.high`; `?relief=true|mid|high`
   in dev). Chosen so the real horizon (a few degrees) is visible at all. The owner wants this **re-thought** in favour
   of truth (§5).

## 4. How the village is placed truly (the core of "stage 0")
The eye is 2 m above the place's ground; eye level (0°) is the horizon line. Ground at distance d is seen at −atan(2/d):
50 m → −2.3°, 200 m → −0.6°, 500 m → −0.2°. A 6 m roof at 300 m is +0.8°. So the village is **a band hugging the horizon
line**: bases just below it, roofs just above, near houses larger and lower, far ones small and close to the line. The
ridges stand behind it (they are farther); the dot "you are here" is at the bottom centre. Houses come from the
built-up raster (`data/city`, ~118 × 232 m squares) at their real bearing and distance, drawn in the existing house
style; on a slope they sit on the DEM (needs a finer read of the tiles within ~600 m). Room under the horizon must be
guaranteed (today 15 px at Shadmot, less on hilltops).

## 5. First task for the new session: show it before building
Make stills for the owner, **current vs proposed**, for Shadmot Mehola, Jerusalem, Rosh Pina and Makhtesh Ramon (a non-
settlement), at one daytime hour:
- the village as a band at its true angles (houses from the raster), near marks on the ground at their distance,
  no hand-set marks;
- **three vertical scales side by side**: true (no stretch), mid, high (today) — so the owner can see what truth costs
  in legibility and choose (or a new middle, e.g. stretch only the far land, or a taller scene);
- optionally the un-mirrored view (east on the left).
A quick prototype behind a dev flag or a standalone script is fine; the point is the picture. Explain each still in
plain Hebrew. Then wait for the owner's choice before building.

How to make stills here: Open-Meteo rate-limits this container, so serve the recorded forecast
(`src/test/fixtures/forecast-multi-2026-11-17.json`) with Playwright `page.route(/\/v1\/forecast/)`; pin the time with
`?at=2026-11-17T11:00` (dev only); places via `localStorage['shamayim:place:v1']`; recorded panoramas for the six places
are in `src/test/fixtures/scene/`.

## 6. Decisions for the owner
- Mirror: keep east on the right, or the true view (facing south, east on the left)? Recommendation: true view.
- Houses: from the data in the existing style (recommended), or the illustrated glyph moved to its true height?
- Vertical scale: after seeing §5's stills.

## 7. After stage 0 (agreed order)
Land colour (season / this week, subtle tint) → vegetation (orchards, trees, shrubs, fields where WorldCover says) →
rain in its true direction (cloud over the right ridge; an edge mark when out of view) → wind (dust, cloud drift,
tree lean). Each with stills of the six places, baseline re-recorded deliberately.
