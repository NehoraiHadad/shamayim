# Round-3 / round-4 offline stills

Rendered by `e2e/scene.stills.mjs` with generic `--flat`, 375 CSS px, DPR 2, 2026-11-17 12:00.
Both places have no recorded panorama: every image is labelled **Offline flat 100 m** in its pixels and filename.
Bundled forecast, city, landmark and land-cover data only; the runner refuses external requests.

Decision B is a 4 CSS px floor with a 2× cap. Eleazar's three previous neighbours need 2.73–3.23×, so they are
culled. Both after-stills contain only the own synagogue. The crops honestly show their absence; they do not
supply an invented legible neighbour. Positive 4 px / ≤2× near and far cases are covered by the tests.

The crop is the full-width neighbour/home band at CSS y=375–428. Its existing DPR-2 pixels are magnified 4×
with nearest-neighbour sampling (3000×424 PNG). It changes the review image only, not scene glyph sizes.

## Karmei Tzur

[Before, round 3](osm-way-462664109-1200-flat100m-r3.png) · [After, round 4](osm-way-462664109-1200-flat100m.png) · [4× neighbour crop](osm-way-462664109-1200-flat100m-crop4x.png)

All values below are CSS px / km. “Owned” true px is the composed portrait height, outside Decision B.

| Stage / source | Kind | True px | Drawn px | Factor | Gap | Slide | Haze km |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| R3 `il-synagogue-31.6097-35.10159` | synagogue | 9.500000 | 9.500000 | 1.000000 | owned | 0.000000 | 5.445100 |
| R4 `il-synagogue-31.6097-35.10159` | synagogue | 9.500000 | 9.500000 | 1.000000 | owned | 0.000000 | 5.445100 |

## Eleazar

[Before, round 3](il-31.6607-35.1415-1200-flat100m-r3.png) · [After, round 4](il-31.6607-35.1415-1200-flat100m.png) · [4× neighbour crop](il-31.6607-35.1415-1200-flat100m-crop4x.png)

All values below are CSS px / km. “Owned” true px is the composed portrait height, outside Decision B.

| Stage / source | Kind | True px | Drawn px | Factor | Gap | Slide | Haze km |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| R3 `il-minaret-31.65388-35.16033` | minaret | 1.239746 | 1.239746 | 1.000000 | 41.257034 | 0.000000 | 7.000000 |
| R3 `il-synagogue-31.65729-35.12548` | synagogue | 1.396326 | 1.396326 | 1.000000 | 17.801865 | 0.000000 | 6.500000 |
| R3 `il-synagogue-31.65685-35.15055` | synagogue | 1.466699 | 1.466699 | 1.000000 | 9.972311 | -0.218845 | 6.500000 |
| R3 `il-synagogue-31.6603-35.14278` | synagogue | 9.500000 | 9.500000 | 1.000000 | owned | 0.000000 | 5.973214 |
| R4 `il-synagogue-31.6603-35.14278` | synagogue | 9.500000 | 9.500000 | 1.000000 | owned | 0.000000 | 5.973214 |

| R3 neighbour culled in R4 | True px | Required factor for 4 px | R4 true-distance haze km | Reason |
| --- | ---: | ---: | ---: | --- |
| `il-minaret-31.65388-35.16033` | 1.239746 | 3.226467 | 7.254069 | cap >2× |
| `il-synagogue-31.65729-35.12548` | 1.396326 | 2.864661 | 7.254069 | cap >2× |
| `il-synagogue-31.65685-35.15055` | 1.466699 | 2.727213 | 5.945958 | cap >2× |

Karmei Tzur uses the production gazetteer coordinate 31.6092, 35.1009. The bundled mosque row is a 9 m hall;
the separate regression supplies the observed 17 m tower at the same ID. Its 1.48 px true visible height would
need 2.70× and also fails Decision B. Eleazar uses 31.66073, 35.14148. No place-specific production rule exists.
R3 neighbour haze values are the old supporting block's half-kilometre bin; R4 values use far-town bins.
Adjacent JSON files describe the actual emitted glyphs; `round4-still-evidence.json` records source decisions.

```powershell
$env:NODE_PATH = 'C:/Users/Nehorai/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules'
$env:SCENE_CHROMIUM = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/stills 'osm:way:462664109@12:00' '--flat=31.6092,35.1009,כרמי צור' --dpr=2 --describe --crop4x
node e2e/scene.stills.mjs docs/design/qa/polish/worship-ownership/stills 'il-31.6607-35.1415@12:00' '--flat=31.66073,35.14148,אלעזר' --dpr=2 --describe --crop4x
```

Playwright was already cached and Chrome already installed. No downloads or live services were used.
