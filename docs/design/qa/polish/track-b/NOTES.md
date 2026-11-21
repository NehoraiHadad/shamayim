# Track B: marks owned by the place's own footprint (audit #2)

## What was wrong (measured from the bundled data)

- **Heights without evidence.** In `public/data/landmarks/il` (built 2026-11-20), all 1564 `minaret` rows are exactly 30 m
  and all 53 `church` rows exactly 25 m, the classifier's defaults. Not one carries a tagged height. A mosque hall was
  therefore drawn as a 30 m tower, while a synagogue was a 9 m hall.
- **The wrong owner point.** The app's Karmei Tzur point (31.6047, 35.1081) is 0.85 km from its own OSM place point
  (31.60922, 35.10088, 'כרמי צור'). The nearest point to it is a farm hamlet (חוות צור יהודה, reach 0.5 km), and
  `placeBounds` gave Karmei Tzur that hamlet's cell.
- **The home cluster was rejected.** `homeCluster` turned down Karmei Tzur's own built cluster (16 squares): its
  `nearest` is 0.63 km, over the 0.45 km limit.
- **Marks floating on bare hills.** `nearBeyond` drew any mark of 20 m or more within 6 km at its true bearing, whether
  or not its town was drawn under it.

## The rule now (one rule for every place)

- **(a) Heights by evidence, the same for every religion.** `src/data/landmarks/worship.ts` sets the heights.
  - A mosque, church or synagogue is a 9 m hall: about three 3 m storeys, the synagogue's old value.
  - A tagged `height` is used as given. Otherwise `building:levels` × 3.2 m.
  - A 30 m tower needs tower evidence: `tower:type=minaret`, `building=minaret` or `man_made=tower`.
  - The new build writes `heights: 'evidence'` into `index.json`. Until the data is rebuilt, `loadIsrael` reads the old
    build's default-valued rows (minaret 30, church 25) as halls, because that build gave every such row its default.
- **(b) The place's own marks come from its own footprint.**
  - `homeCluster(clusters, nameHe)` picks the built cluster named after the place, within 2 km. Without a name match the
    old rule applies.
  - `placeBounds` takes that cluster's mapped point as the owner of the cell. Its claim reaches the cluster's farthest
    corner, so the cell covers the place's own buildings.
  - Admin boundaries are used where they exist, as before.
- **(c) A mark beyond the place stands on its own town's drawn mass.** This covers a hall, high-rise or homes within 6 km
  of the place.
  - The mark is drawn only on a town block the outside view draws: a built square of the city raster under the mark,
    seen over the crest.
  - It takes that block's base and haze, and its size comes from the same perspective (`src/world/beyondSeat.ts`, also
    used by `beyondTowns`, with identical output).
  - Its glyph must lie inside that block's drawn width, so perspective never leaves it floating beside its town.
  - Its drawn size decides, not its metres: a 9 m hall that clears the 2.5 px floor is drawn on its town. The 20 m
    gate applies only to the free-standing kinds.
  - Free-standing structures keep their old path: chimneys, masts, turbines, water towers, cooling towers.
- **Caches.** The landmark cache key is `v8` and the city cache key `v6`, so no cached row keeps the old heights. Each
  rebuilt cell carries its own `heights: 'evidence'` marker, so a stale cached index cannot misread a rebuilt cell.

## Marks per place, before → after

Bundled data, 375 px. `*` is the place's own portrait. The places without a panorama fixture are given by ownership,
not by a drawn scene.

| Place | Before | After | Why |
|---|---|---|---|
| Karmei Tzur (no fixture) | Own: none (its synagogue fell outside the hamlet cell). Beyond: 29 mosque rows at 30 m within 6 km, eligible as tall near-beyond marks, the nearest at 1.61, 1.84 and 2.09 km. | Own: synagogue שבת אחים (0.83 km). Beyond: no tall hall within 6 km. | (a), (b) |
| Rosh Pina | synagogue\* 0.33, orchard\* 2.18, **minaret 4.80 (30 m), minaret 5.24 (30 m)** | synagogue\* 0.33, orchard\* 2.18 | The two minarets east of it were halls with no height evidence. The only tall marks left beyond it are Safed's 44.8 m blocks (height from levels). They are drawn only where Safed's mass is drawn. |
| Safed (no fixture) | 20 own synagogues and 1 own mosque (admin boundary) | the same 20 synagogues and 1 mosque, the mosque now a 9 m hall | (a): the same rule as Rosh Pina |
| Shadmot Mehola | synagogue\* 0.01, solar\* 0.47 | unchanged | — |
| Tel Aviv | custom\* 1.25, minaret\* 2.29 (30 m), church\* 3.79 (25 m), chimney\* 2.74 (150 m) | custom\* 1.25, lighthouse\* 2.54, church\* 3.79 (9 m) | The Jaffa mosque is now a 9 m hall and drops out of the portrait contest. The Reading chimney and the famous Yarkon estuary lighthouse stand at the same x (199 px), and the lighthouse now wins that spot. With the old heights the old set comes back exactly. |
| Jerusalem | waterTower\* 3.91, custom\* 1.92, custom\* 2.64, waterTower 3.69 | unchanged | — |
| Haifa | custom\* 1.16, minaret\* 2.90 (30 m), cooling 5.36, church\* 1.04 (25 m) | custom\* 1.16, lighthouse\* 3.30 (Stella Maris, famous), cooling 5.36, synagogue\* 3.50 | The mosque and the church are 9 m halls now. The contest picks the famous lighthouse and a synagogue, a hall of the same height. With the old heights the old set comes back exactly. |
| Ramon Crater, Tiberias, Ein Gedi | — | unchanged | — |

Raw probes: `marks-before.txt`, `ownership-before.txt` (before), and the tables above (after).

## Known loss until the data is rebuilt

Real minarets mapped as `tower:type=minaret` are in the old build too, but that build kept no tag. So for now they read
as halls, as every other mosque does. Rebuilding `public/data/landmarks/il` from the Geofabrik extract with
`scripts/landmarks/build.ts` brings back every tagged tower by itself. The extract is not on this machine, so that
rebuild is a follow-up.

The mosque glyph is still the domed hall with its minaret, drawn at the hall's height. A separate hall-only variant for
a mosque with no tower evidence is a design follow-up for the painters.
