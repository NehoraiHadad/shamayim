# Landmark size — 2026-11-22

All three stills are 375 CSS px, DPR 2, at 12:00. The crops magnify the rendered land pixels 4× with nearest-neighbour
sampling; they do not rerender or enlarge the source glyphs. Heights, gaps and slides below are CSS px.

| Place / terrain | Full still | Existing-pixel crop | Model measurements |
| --- | --- | --- | --- |
| Dafna, flat 100 m, labelled **no recorded panorama** | [Still](sample-33.23037-35.63926-1200-flat100m.png) | [4× crop](sample-33.23037-35.63926-1200-flat100m-crop4x.png) | [JSON](sample-33.23037-35.63926-1200-flat100m.json) |
| Karmei Tzur, flat 100 m, labelled **no recorded panorama** | [Still](osm-way-462664109-1200-flat100m.png) | [4× crop](osm-way-462664109-1200-flat100m-crop4x.png) | [JSON](osm-way-462664109-1200-flat100m.json) |
| Ramat Gan, bundled recorded panorama | [Still](ramat-gan-1200.png) | [4× crop](ramat-gan-1200-crop4x.png) | [JSON](ramat-gan-1200.json) |

Every drawn glyph is listed, including owned glyphs. Negative owned gaps describe their deliberate overlap with the
home group; the ≥6 px gap applies to non-own marks. A dash means owned material uses the existing portrait lighting,
without the new non-own contrast coefficient.

| Place / source | Kind | Own? | True px | Drawn px | Factor | Haze km | Contrast | Gap px | Slide px | Base |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Dafna / `il-orchard-33.22998-35.64404` | orchard | yes | 7.300000 | 7.300000 | 1 | 5.577812 | — | -42.912188 | 0 | foot |
| Dafna / `il-orchard-33.23452-35.64241` | orchard | yes | 7.300000 | 7.300000 | 1 | 5.056199 | — | -47.793649 | 0 | foot |
| Dafna → Nimrod / `il-castle-33.25267-35.71505` | castle | no | 0.883242 | 6.000000 | 6.793153 | 7.471905 | 0.377443 | 102.701871 | 0 | ridge:near |
| Karmei Tzur / `il-synagogue-31.6097-35.10159` | synagogue | yes | 9.500000 | 9.500000 | 1 | 5.445100 | — | -26.234449 | 0 | foot |
| Ramat Gan / `il-synagogue-32.08155-34.81205` | synagogue | yes | 9.500000 | 9.500000 | 1 | 3.589859 | — | -51.310867 | 0 | foot |
| Ramat Gan → Metzudat Ze’ev / `il-highrise-32.07282-34.77491` | highrise | no | 2.367127 | 6.000000 | 2.534718 | 5.037991 | 0.518428 | 73.064689 | 0 | ridge:near |

Both famous neighbours have the same 6 px drawn height. Nimrod is farther away and receives less material contrast
than Metzudat Ze’ev. Their haze is their true receiving-eye distance, never a distance inferred from the 6 px icon.
The Dafna castle remains small relative to the home group. Karmei Tzur has only its own synagogue and no non-own
worship. In Ramat Gan, the kept highrise is the small separate icon to the right of the home skyline.

Reproduce offline from the repository root (with Playwright available to Node and a local Chromium executable;
this run used the installed Google Chrome via `SCENE_CHROMIUM`):

```powershell
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/stills/landmark-size 'sample-33.23037-35.63926@12:00' '--flat=33.23037,35.63926,דפנה' --dpr=2 --describe --crop4x
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/stills/landmark-size 'osm:way:462664109@12:00' '--flat=31.6092,35.1009,כרמי צור' --dpr=2 --describe --crop4x
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/stills/landmark-size 'ramat-gan@12:00' --dpr=2 --describe --crop4x
```
