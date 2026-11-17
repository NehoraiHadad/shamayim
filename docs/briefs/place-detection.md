# Brief: find every place, always draw the place's own houses (v6.1)

Context: Shamayim, Hebrew RTL weather PWA (React 19, Vite, TS, vitest). Landmarks design: `docs/design/LANDMARKS.md`.
Rules: files ≤150 lines, DRY, remove dead code, keep `npm test`, `npm run lint`, `npm run build` green. Do not commit.

Live test case: כרמי צור (Gush Etzion, 31.6092, 35.1009, ~950 m). Today:
- Search finds nothing. Open-Meteo geocoding (GeoNames) has no entry for Karmei Tzur, Efrat, Alon Shvut, Bat Ayin.
  Nominatim does: `nominatim.openstreetmap.org/search?format=json&q=כרמי צור` → village, 31.6092242, 35.1008772.
- The scene shows the ridge and nothing else. The OSM request to overpass-api.de failed (status 0, no body) and the
  village has no houses because `fallback()` in `useLandmarks.ts` needs `featureCode` PPL*, which only Open-Meteo gives.

## 1. Search: Open-Meteo + Nominatim (`src/data/geocoding.ts`)
- Run both in parallel. Open-Meteo first, then Nominatim results that are not duplicates
  (same name, or within 2 km of an Open-Meteo result). Max 6 total. One failing source must not fail the search.
- Nominatim: `format=jsonv2`, `accept-language=he`, `addressdetails=1`, `extratags=1`, `limit=6`,
  keep only `category=place` (city, town, village, hamlet, suburb, neighbourhood, isolated_dwelling, locality) or
  boundary=administrative with a place-like `addresstype`. Respect its policy: the picker's existing debounce must be
  ≥ 500 ms for typed queries (check `PlacePicker.tsx`), no request on < 2 chars.
- Map a Nominatim result to `Place`: id `osm:<osm_type>:<osm_id>`, nameHe = `name`, regionHe from address
  (state/county), timezone from device, `usesOsm: true`, `featureCode` from place type
  (city→PPLA, town→PPL, village/hamlet/isolated_dwelling→PPL, suburb/neighbourhood→PPLX, locality→PPLL),
  `population` from `extratags.population` when numeric. Elevation is unknown: leave it unset (the app already
  samples terrain from Open-Meteo elevation; check the elevation shown for the place still works).
- `reversePlace` (GPS): also set `featureCode` the same way from the address type it used (village/town/city).
- Pure mapping functions with tests (fixture: the Karmei Tzur response above, a Tel Aviv city, a non-place result
  that must be dropped, dedupe against an Open-Meteo result).

## 2. The place's own houses, always (`useLandmarks.ts`, `placeMarks.ts`)
- Today homes appear only when OSM returns nothing. Change: for any non-curated populated place (featureCode PPL*
  or usesOsm from a settlement type) add the `homes` mark at the centre in addition to the OSM marks, so the village
  itself is never just a dot. Size: population if known; otherwise from place type (hamlet/village → small,
  town → medium, city/PPLA → large).
- If OSM returns highrises within 1 km of the centre (a real skyline), skip the homes mark for large places.
- The homes mark sits at the village dot and must not be pushed away by `spread`; other marks avoid it.
- Tests: Karmei Tzur place with no OSM → homes-small; with OSM minarets 6 km west → homes plus minarets;
  curated places unchanged (Shadmot, Jerusalem, Tel Aviv, Haifa snapshots in `landmarks.test.ts`).

## 3. Overpass robustness (`useLandmarks.ts`, `overpass.ts`)
- Find out why only one host was requested in the browser (the mirror loop exists). Fix whatever it is.
- Hosts in order: overpass-api.de, overpass.private.coffee, overpass.kumi.systems. Per-host timeout 12 s
  (AbortSignal.any with the effect's signal, or a manual timer).
- A failure is remembered for 1 hour, not a day. An empty result is cached like a success (it is an answer).
- Add `nwr[amenity=place_of_worship][religion=jewish][building]` and the same for mosques only if they are already
  covered; synagogues map to kind `synagogue` ONLY if a glyph exists — otherwise skip (do not invent a glyph now).

## 4. Data fixes in `curated.ts` (verified online 2026-11-17; put the source URL in a comment per line)
- haifa-bab heightM 40 → 11 (the building is ~11 m; en.wikipedia.org/wiki/Shrine_of_the_Báb). It must still read:
  markHeight's 10 px floor keeps it visible; check its glyph does not look squashed.
- haifa-dagon heightM 47 → 65, lat/lon → 32.82297, 34.99526 (he Wikipedia / Hamichlol "ממגורות דגון").
- tel-aviv-shalom 130 → 142 (architectural height; skyscrapercenter.com). Same convention as Azrieli/Sail.
- haifa-cooling: one of the two Bazan towers collapsed in June 2020 and was demolished from 2021
  (timesofisrael.com/iconic-haifa-oil-refinery-tower-collapses). Draw ONE tower, not two; rename nameHe to
  'מגדל הקירור בבזן'. Height 75 stays (unverified — say so in the comment).
- tel-aviv-reading: plant retired 2024, chimney kept by plan (timesofisrael.com/tel-avivs-iconic-power-station-to-close-become-apartments-report);
  height 150 unverified — comment only, no value change. Turn off any "operating" life (smoke) on it if there is any.
- Leave jerusalem-ymca 46, jerusalem-david 30, jerusalem-wall 34 with an "unverified" comment.
- Update the matching lines in `docs/design/LANDMARKS.md`.

## Done when
Tests cover 1–3, all checks green, and you list: files changed, what caused the single-host request, anything
you could not do. I verify in the browser myself.
