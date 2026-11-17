# Brief: landmarks in the scene (v6) — design note request

Shamayim (Hebrew RTL weather PWA, React 19 + Vite, live at shamayim.pages.dev) draws a west–east
cross-section of the place under the weather: `src/ui/scene/ValleyScene.tsx` (viewBox 375×128,
`preserveAspectRatio="none"` so it stretches horizontally on wide screens, height fixed 128 px), far and
near ridge paths from `src/data/terrain/` (hand-drawn for Shadmot Mehola, sampled from Open-Meteo
elevation elsewhere: 41 points over ±12 km near, ±30 km far, west on the left), sun path, village dot,
sea line. Air and weather live in `src/atmo/` (contract: `docs/design/ATMOSPHERE.md`); calm-day life
(birds, mist, meteors, twinkle) in `docs/design/CALM-LIFE.md`. Read those three first.

The user wants: "לצייר גם איזה אלמנטים חשובים במקומות הרלוונטיים… אם עיר מוכרת דברים שמייצגים אותה
(ירושלים: הכותל, מגדל דוד, גשר המיתרים, בניינים)… במיקום ובצורה המתאימה… וכך לתת להם 'חיים' בהתאם
למזג האוויר". Small places too: something that represents them.

## What I need from you (design, not code)
Write `docs/design/LANDMARKS.md`, ≤ 140 lines, that an implementer (Codex) can build from:
1. **What gets drawn and where it comes from.** A curated list for well-known places (which cities, which
   2–4 landmarks each, why) vs. an automatic source for everywhere else (e.g. OpenStreetMap via Overpass:
   water towers, towers, minarets, church/synagogue domes, bridges, silos, tall buildings — pick the tags,
   ranking, radius, caching, failure fallback, ODbL attribution). What a small kibbutz/moshav like
   Shadmot Mehola shows (it must not be empty, must not be fake). Honest rule: never draw something that
   is not there.
2. **Placement.** Project lat/lon onto the cross-section (x from east–west offset, max perpendicular
   distance to count as "on the line"), which layer (far vs near) by distance, base sits on the terrain
   height at that x, how the stretched SVG is handled (silhouettes must not distort: likely an overlay with
   fixed aspect, positioned in %), min spacing, max count, collision with village dot / labels / sun.
   Note the city itself: the place is at the centre; a city skyline is a cluster there.
3. **Drawing style.** Must belong to the existing flat ridge art (two tones, haze-faded far layer), read at
   12–40 px tall on a 375 px phone. Silhouette vocabulary per type, how the curated ones are drawn
   (simplified, recognizable), honest vertical scale (landmarks are exaggerated like the terrain? by how
   much). Colour per theme/night/haze.
4. **Life from weather** (data-driven, never decoration, battery-aware like CALM-LIFE — no new rAF loop):
   lit windows at night, flags/cranes swaying with wind speed+direction, wet sheen in rain, snow caps,
   heat haze, lightning-lit in storms, fog swallowing far ones. Exact triggers, amplitudes, reduced motion.
5. **Data shapes and modules** (`src/data/landmarks/…`, files ≤150 lines), the pure functions and their test
   cases, the curated data format, and the order to build it in (MVP first: curated Jerusalem + Tel Aviv +
   Haifa + Shadmot; then the automatic source).
Keep the priorities of ATMOSPHERE.md (weather first, text legibility, max two moving systems).
