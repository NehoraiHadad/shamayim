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
| [rays.jpg](rays.jpg) | sun rays (owner decision 13): the day's own sky (Haifa 08:00, Jerusalem, Ein Gedi, Masada 06:20), a broken sky (Tel Aviv 07:00), a hazy broken sky (Tel Aviv 12:00, Haifa 16:00, Rosh Pina 15:00) |

The weather moments are the scene harness's (`src/dev/sceneHarness.tsx` WEATHER) given to both scenes as the app's own
`?wx=` override. `?wx=` has no key for the thick share of the cloud, so under rain and thunder the fixture's own thick
share stays, and the sun shows through as a veiled disc in both scenes (the harness's rain still, with `thickCloud` 90,
hides it).

`broken` and `hazy` (rays.jpg) are the runner's own: half the sky in cloud at 25 km and at 12 km visibility.

Remake: `node e2e/scene.compare.mjs docs/design/qa/canvas/c9-review/<sheet>.jpg <place>@<HH:MM>[@<weather>] … --title=…`
(the moments of each sheet are in its row captions).

Fixed before the pack (general rules, CANVAS-SCENE-PLAN.md §6, C9 pack): the posts on Rosh Pina's crest (towers beyond
the place that the land in front hides), the vertical haze edge in Tiberias's fog (the air's share along a crest no
steeper than a set slope), the dark band under the place's own ground in snow. Open defects, ranked: §6.

**Regenerated after the defects were fixed (2026-11-19, same runner, same sheets, plus rays.jpg).** Fixed, each by a
general rule (CANVAS-SCENE-PLAN.md §6, "C9, the review's defects fixed"): (1) a backlit or overcast mass reads dark on its
ridge (walls face the sky behind the eye; nothing hazier than the land it is seen against); (2) a cloud lobe over the sun
has its silver edge and the aureole lies over the cloud; (3) the sun the place sees shows over its own mass (Haifa 06:20);
(4) the height label beside the dot on a small backing; (5) water names on their water (Netanya's and Haifa's on the sea,
Tiberias's and Masada's on the lake; Ramat Gan's, only among Tel Aviv's towers, unnamed); (6) the towns 0–6 km out drawn
with the towers beyond (Ramat Gan's edges); (7) water mirrors in linear light, the sun's path by the one light (Masada
06:20); (8) neighbours' tall structures within 6 km (Nahalal's ridge chimney); (9) far towers on a foot, in the far towns'
backlit shade; (10) the fabric's frontage from the built share (Be'er Sheva's west). New: rays where they occur.

Still open (for the owner's eye): Be'er Sheva's west stays a fairly level band (its data's own even four-storey estates);
Hadera's chimneys from Zikhron stay a thin hazy line (13 km in a 30 km visibility; their foot under the coastal ridge);
Nahalal's SVG water tower stands 1.6 km north, behind the true view; in fog (Tiberias, Nahalal 08:00) the rays and the
glare are strong, as fog beams are, which may read as much; a cloud's baked silver slides with its drift.

