# Brief: nightly-built Israel landmark file (v6.2)

Why: public Overpass servers are often "at capacity" (seen live 2026-11-17; mirrors time out), and their own
message says automated use should not hit them. Geofabrik publishes the OSM extract
`https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf` (122 MB, refreshed nightly) — made for
exactly this. Build our landmark data from it on a schedule, ship it as static files with the site, and use
Overpass only for places outside the extract.

Rules: files ≤150 lines, DRY (reuse `classify`/`parseOverpass` in `src/data/landmarks/overpass.ts`, do not fork
the tag logic), tests with vitest, `npm test`, `npm run lint`, `npm run build` green. Do not commit.
You cannot run osmium here (Windows, no binary): make the Node half fully testable with fixtures.

## 1. Build pipeline
- `.github/workflows/landmarks.yml`: `schedule` monthly (1st, 02:00 UTC) + `workflow_dispatch`.
  ubuntu-latest, Node from `.nvmrc`, `sudo apt-get install -y osmium-tool`, download the pbf,
  `osmium tags-filter` with exactly the tag set `buildQuery` uses (derive it from one shared list, e.g. export
  `LANDMARK_FILTERS` from a small module both use, or document the osmium expressions next to `selectors`),
  `osmium export -f geojsonseq` (centroids are fine: `--geometry-types=point,polygon` then centroid in Node),
  then `node scripts/landmarks/build.ts` (use `tsx`, devDependency) → writes `public/data/landmarks/`.
  Commit and push only if the output changed, with message "Data: Israel landmarks <date>" and
  `[skip ci]`-free (Pages must rebuild). Permissions: `contents: write`. Use the default `GITHUB_TOKEN`.
- `scripts/landmarks/build.ts`: reads geojsonseq from stdin or a path, turns each feature into the Overpass
  element shape `{ id, center:{lat,lon}, tags }`, runs `parseOverpass`, then writes:
  - cells of 0.1° × 0.1°: `public/data/landmarks/il/<lat*10>_<lon*10>.json` (e.g. `316_351.json`),
    compact rows `[kind, lat (5 dp), lon (5 dp), heightM, nameHe?]`;
  - `public/data/landmarks/il/index.json`: `{ generatedAt, source: "OpenStreetMap via Geofabrik (ODbL)",
    bbox, cells: string[] }`.
  Keep homes out (the app makes those). Cap tiny buildings: only `highrise` passes the existing ≥40 m rule.
- Report the expected total size; if a cell would exceed ~150 KB, drop the lowest-ranked rows in that cell.

## 2. Client (`src/data/landmarks/`)
- New `israelData.ts`: `cellsForStrip(place)` (the near ±12 km × ±1.5 km and far ±30 km × ±3 km boxes, same
  math as `buildQuery`), `inCoverage(index, place)`, `loadIsrael(place, signal)` → fetch `index.json` once
  (memoised), fetch needed cells (missing cell = empty), decode rows to `Landmark` with `source: 'osm'`.
- `useLandmarks.ts`: order = curated → Israel files when in coverage → Overpass otherwise. Same ranking,
  same localStorage cache but bump the key to `shamayim:landmarks:v2:` (new source). Israel path failure
  falls back to Overpass.
- Service worker: make sure `/data/landmarks/**` is cached at runtime (stale-while-revalidate) and NOT
  precached (check `vite.config.ts` workbox config).
- Attribution unchanged (OSM/ODbL credit already shown when marks come from OSM).

## 3. Tests
- build: fixture geojsonseq (a water tower, a minaret node, a mosque polygon, a 120 m building, a 10 m
  building that must drop, a synagogue) → expected cell files and index.
- client: cell math for Karmei Tzur (31.6092, 35.1009) and Tel Aviv; coverage true/false; a cell 404 is empty;
  source order in `useLandmarks` (curated wins; Israel used; outside → Overpass).
- Commit a tiny sample dataset? No — `public/data/landmarks/il/` stays empty in git until the workflow runs;
  the app must work (Overpass path) when `index.json` is missing (404 in dev).

## Done when
All checks green; you list files, the osmium commands, and anything unverified. I run the workflow myself.
