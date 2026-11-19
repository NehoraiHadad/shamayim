# C9 review pack: SVG against canvas, every place (2026-11-19)

For the owner's review before the switch (CANVAS-SCENE-PLAN.md C9; nothing is switched yet). Each sheet is the app
itself on the dev server (`e2e/scene.compare.mjs`), dpr 2: per row the SVG scene on the left and the canvas scene
(`?canvas=1`) on the right, each panel 375 px wide in CSS (750 px in the image), with the sky above the figure and the
forecast strip, as on a phone. The day is the fixture's (2026-11-17, its recorded forecast).

Hours: sunrise 06:20, 11:00, golden hour 16:30, night 21:00.

| Sheet | What |
|---|---|
| [places-1-gush-dan-sharon.jpg](places-1-gush-dan-sharon.jpg) | Tel Aviv, Ramat Gan, Netanya × 4 hours |
| [places-2-carmel-valley.jpg](places-2-carmel-valley.jpg) | Haifa, Zikhron Ya'akov, Nahalal × 4 hours |
| [places-3-jerusalem-galilee.jpg](places-3-jerusalem-galilee.jpg) | Jerusalem, Rosh Pina, Tiberias × 4 hours |
| [places-4-jordan-dead-sea.jpg](places-4-jordan-dead-sea.jpg) | Shadmot Mehola, Ein Gedi, Masada × 4 hours |
| [places-5-negev.jpg](places-5-negev.jpg) | Be'er Sheva, Ramon crater × 4 hours |
| [weather-1-rain-showers-thunder.jpg](weather-1-rain-showers-thunder.jpg) | rain (Haifa, Tel Aviv, Jerusalem 12:00); showers (Haifa 14:00, Jerusalem 12:00 with the edge mark, Tiberias 12:00); thunder (Haifa 15:00, Tiberias 12:00) |
| [weather-2-fog-dust-snow-gale.jpg](weather-2-fog-dust-snow-gale.jpg) | fog (Tiberias 12:00, Nahalal 08:00); dust (Jerusalem, Be'er Sheva 12:00); snow (Jerusalem, Rosh Pina 12:00); gale (Rosh Pina, Netanya 12:00) |

The weather moments are the scene harness's (`src/dev/sceneHarness.tsx` WEATHER) given to both scenes as the app's own
`?wx=` override. `?wx=` has no key for the thick share of the cloud, so under rain and thunder the fixture's own thick
share stays, and the sun shows through as a veiled disc in both scenes (the harness's rain still, with `thickCloud` 90,
hides it).

Remake: `node e2e/scene.compare.mjs docs/design/qa/canvas/c9-review/<sheet>.jpg <place>@<HH:MM>[@<weather>] … --title=…`
(the moments of each sheet are in its row captions).

Fixed before the pack (general rules, CANVAS-SCENE-PLAN.md §6, C9 pack): the posts on Rosh Pina's crest (towers beyond
the place that the land in front hides), the vertical haze edge in Tiberias's fog (the air's share along a crest no
steeper than a set slope), the dark band under the place's own ground in snow. Open defects, ranked: §6.
