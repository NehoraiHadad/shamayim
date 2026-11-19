# The place seen from outside: skyline study (2026-11-19)

Design only: nothing shipped changes. Dev flag `?skyline=a|b|c` (`src/data/city/outsideView.ts`,
`src/ui/scene/marks/city/OutsideSkyline.tsx`, `outsideScene` in `hillScene.ts`). Sheets: one per city (current, A, B,
C stacked) and `overview-1100.png`; Tel Aviv and Haifa also at 16:30 (the lit side follows the sun).

## The shared rule (all three variants)
- **One viewpoint, outside the place.** The eye stands north of the place, looking south, `1.4 ×` the place's depth
  back from its north edge (near / far ≈ 1.7). The place is its home cluster in the built-up map, clipped to its portrait
  reach (≤ 5 km), plus 1 km of fields for a village. Left–right by true east–west (east left, the dot stays at the
  centre), depth by north–south (north nearer: lower by up to 9 px, larger; south smaller and hazier, a third of the
  way to the far ridge's tone at the far edge). A city spans 90 % of the width, a village less.
- **Real height in that perspective:** 0.18 px a metre at the middle depth, so a 300 m tower always stands over a 90 m
  one (Jerusalem's 57 m blocks are now 8–14 px, not 34–52; Tel Aviv's 89 m Museum Tower about a third of ToHa 2).
- **Everything in the place** by this rule: towers, the built squares (each ~118 × 232 m square a box at its real
  width and roof height, hidden ones culled), the portrait marks (Azrieli, St Peter's, Hassan Bek, Reading, the Chords
  Bridge, the Mount Scopus water tower now stand where they are east–west, at their depth). For a city the composed
  blocks round the dot go: its built squares are its blocks. A village keeps its composed houses; its marks move by the
  rule. Beyond the place the scene stays true (ridges, sun, water, far cities, towers outside the frame).
- **Dedupe:** two rows within 15 m and 15 % in height are one building (G Tel Aviv, a Jerusalem block); twin towers
  45 m apart (Da Vinci) stay two. Tel Aviv's tower list had 46 such rows.
- **Fame:** the nearest raster tower within 120 m of a named, famous OSM high-rise takes its name and fame.
  A hand-drawn icon stands in only for towers of about its height (Azrieli; the Chords Bridge no longer swallows the
  175 m Migdal Merom).
- **Levels of detail:** the famous and the ≥ 150 m (at most 10, the famous first) get the full high-rise glyph; the
  others a small real silhouette (2–3.5 px by width class, flat / setback / mast top, lit strip on the sun's side, a
  few lit windows by night).
- **Marks:** a mark beyond the place (outside its frame + 1 km and its reach + 1 km) needs a name and fame, or to be
  ≥ 200 m (Nahalal's chimney, Rosh Pina's Golan turbines and the unnamed minaret 4.8 km east go). An unnamed mark is
  never a landmark (Haifa's unnamed famous water tower is an ordinary one now).

## The variants (how density reads)
| | Tel Aviv | Ramat Gan | Haifa | Jerusalem | Be'er Sheva | Netanya |
|---|---|---|---|---|---|---|
| current: glyphs + sticks | 14 + 184 | 14 + 333 | 11 + 42 | 11 + 12 | 14 + 17 | 14 + 51 |
| towers in the place | 301 | 301 | 105 | 92 | 104 | 75 |
| A: glyph / silhouette / left out | 10 / 88 / 203 | 10 / 83 / 208 | 6 / 57 / 42 | 3 / 57 / 32 | 0 / 65 / 39 | 2 / 39 / 34 |
| B: glyph / spire / folded | 10 / 54 / 237 | 10 / 53 / 238 | 6 / 9 / 90 | 3 / 8 / 81 | 0 / 22 / 82 | 2 / 17 / 56 |
| C: glyph / alone or rising / in blocks | 10 / 9 / 282 | 10 / 4 / 287 | 6 / 19 / 80 | 3 / 14 / 75 | 0 / 8 / 96 | 2 / 7 / 66 |

- **A, silhouettes.** Every tower its own silhouette, thinned per 10 px slot of the screen by a soft budget
  (`6 (1 − e^(−n/6))`: more drawn where there are more, never more than six, the tallest first). Over low-rise fabric
  (the built squares, roofs to 16 m). Legible, but in Tel Aviv two thirds of the towers are simply left out.
- **B, mass and spires.** The built squares at their real heights (to 60 m) make one jagged mass; each tower, shortest
  first, folds into the mass (raising it where it stands) unless it clears it by 7 px, then it rises as a spire. Every
  tower counts: dense Tel Aviv / Ramat Gan become a high, dense mass with the spires and named glyphs out of it;
  Jerusalem and Be'er Sheva read as what they are, a mid-rise city with a few towers.
- **C, clusters.** No raster mass over the fabric: towers within 3 px of each other on the screen (four or more)
  become one stepped block, its tallest one (two for twelve or more) rising out of it. Reads well in Tel Aviv; on a
  slope (Haifa) and in mid-rise cities the blocks turn into flat slabs.

**Recommendation: B.** It is the only one where density reads true everywhere without dropping towers (dense cities
dense, mid-rise cities mid-rise), and the famous / very tall still stand out of the mass. Take A's slot budget for B's
spires if the spires crowd (Tel Aviv: 54).

## The coastal city's own sea (evaluated, not drawn)
From outside, Tel Aviv's (and Netanya's) west edge is the coast: the right of the city is empty in the stills, and the
16:30 sun sets there. From the north the sea is part of the place (beach and sea at the city's west, the sun's path
over it at dusk), and it would fill that gap truthfully. Drawn as a band from the coast to the edge at the place's
depth (on the near ridge's line), not as a sea horizon: the true scene beyond the place keeps its own horizon. Needs
the water mask in the scene (it is loaded only for the true spans today); Ramat Gan already shows how it reads, since
its true view sees the sea just past the city.

## Left to make B the default
1. Fold `outsideScene` into `hillScene` (drop the true skyline's slabs and glyphs, `splitSkylineTowers`, the composed
   city blocks in panorama mode, `portraitX` for cities and villages alike), remove the flag, re-record the baselines.
2. Towers beyond the frame (between the 5 km cap and the true skyline's 6 km, or outside the home cluster) still use
   the old true sticks; give them the same detail levels (Eshkol Tower, 5.8 km from Hadar, is still a stick).
3. The place sits on the true near ridge's line: on a steep face (Haifa's Carmel) the city lines the crest and the face
   below it stays empty. Decide whether the depth may also lift a row up the face.
4. Sea for the coastal cities (above). Haifa's famous cooling tower is named "לבניה" in OSM: it passes the rule; a data
   fix, not a rule.
5. The hand-drawn Azrieli icon now scales by its real height but keeps its own dark tone; it should take the same haze
   and lit side. Very wide places (Ramat Gan's frame takes most of Tel Aviv) may want the frame cut at the place's own
   boundary rather than its built-up cluster.
6. Canvas layer (TRUE-SCENE-PLAN, order of work 1–2): the boxes and silhouettes are plain rects, ready for it; the
   fabric is ~400–900 boxes a city after culling.

## Done in the canvas (C5, 2026-11-19)
B became the canvas scene's rule for every place, villages included (one builder, owner decision 11 in
`CANVAS-SCENE-PLAN.md`); items 2–5 above are answered there (towers beyond the frame with the same levels of detail,
rows climbing the slope, the coastal sea, icons in the hour's light, the frame cut at the place's own boundary). The
"לבניה" cooling tower is a named landmark by its own data (its article "הלבניות", Halebeniyot). Comparison sheet:
`qa/canvas/c5/sheet-skyline-b.png`.

