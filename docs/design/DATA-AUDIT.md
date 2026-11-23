# Data audit: does every fact reach the scene complete and true? (stage 1b, 23 Nov 2026)

Read-only audit of main `fcd96b26`: weather, sky and light; land, towns and landmarks; life, motion, wear and time. Three Sonnet auditors
wrote 59 rows; an Opus verifier then tried to refute each against the same commit. This is the verified result. Plain losses (one right
fix, no change of design) are to be fixed in stage D with their own commits and stills; design questions are for the manager
(listed first, so they can be answered one by one). Nothing here was judged by eye: no still or live API call was made.

Design questions for the manager: which is true at the live minute, ICON's raw reading or the blended, corrected hours (M1); the scene's
rain from the hour or the nowcast; the Dead Sea's level and the neighbours' towns (data that must be chosen or built); the smoke's
activity, Shabbat and holidays, light pollution on stars; the vertical scale of towns (see stage D, `town`).


Verdicts: CONFIRMED / REFUTED / DECISION / UNPROVEN. Kind: plain (one right fix, no design change) or design.
Paths are under `src/` unless they start with docs/, scripts/, worker/, public/, TASKS. PLAN = docs/design/CANVAS-SCENE-PLAN.md.
Proof: [run] = a script on the real function or committed data (or a copy of the loop, where said); [read] = read in code;
[api] = provider contract from knowledge, no live call. No stills were rendered: every "picture" line is derived from model values, not seen.

## 1. Weather, sky, light

| fact | verdict | file:line | evidence | severity | kind |
|---|---|---|---|---|---|
| Live high cloud | CONFIRMED, mechanism corrected | data/openMeteo/mapCurrent.ts:9-21, request.ts:12, atmo/weatherAt.ts:110-113, world/cloudsCover.ts:41-45 | High is asked and dropped, but the larger loss is that the live branch calls `layerCovers` with no `hour`, so thick cloud is split evenly low = mid and high is a residual. [run] 66 % with 0/20/55 gives .106/.106/.575, with layers 0/.20/.575; a 90/0/0 stratus and a 0/90/0 altostratus give the same sky (.684/.684/0). The audit's "high 0 only because dropped" is wrong (that fixture's raw reading is 75/55/0). PLAN:696 allows the even split only for unknown layers. Mist reads the raw low/mid (weatherAt.ts:104-109): one reading, two layerings | high | plain |
| Air quality, scrub hours | REFUTED for the scene | App.tsx:145-158, worker/src/routes.ts:130 | Scrub reaches only the next 24 h, inside the 2 air days. Only the week UI (middaySky.ts:59, DayDetail.tsx:36-41) meets the gap. Residue: M8 | low | design |
| Nowcast and radar not in the scene | DECISION | PLAN:699, docs/design/TURN-VIEW-PLAN.md:76, weatherAt.ts:114-115 | Kept for the rain outlook on purpose. The x4 is right [api]: the live interval is 900 s | none | design |
| Satellite mask gives the total only | REFUTED | useObservedCloud.ts:46-51, world/cloudField.ts:45, TASKS.md:472-484, 1084 | `cloudSightings` places low cells at observed positions. No layer or top height: a listed follow-up (TASKS.md:484) | low | design |
| Stars seeded; no light pollution | DECISION (stars), CONFIRMED (glow) | PLAN:1139; world/nightSky.ts:58-64, 118 | Seeded field chosen. Town glow is left out of the faintest magnitude by a comment, yet dims the Milky Way | low | design |
| Moon veil vs sun veil | REFUTED for the light, CONFIRMED for the discs | world/light.ts:109-127; scene/model/bodies.ts:33, 43-56 | Both lights use one `cloudLight`/`transmitAlong`. The moon's disc uses `moonLook` times `light.clear`, so cloud counts twice; documented "as the SVG scene shows it" | low-medium | design |
| LCL computed twice | CONFIRMED, half on purpose | world/field/field.ts:101-118; cloudField.ts:33, clouds.ts:107 | The field uses model T/RH on purpose; the drawn base uses corrected values, against that intent (M4) | low | design |
| Snow vs rain phase | CONFIRMED | request.ts:14-19; weatherAt.ts:56-60; world/snowLine.ts:74-75 | Hourly `snowfall` not asked; phase comes from code, temperature, freezing level | low | design |
| Null becomes clear and calm | CONFIRMED, narrower | data/openMeteo/mapHours.ts:50-68, domain/blend.ts:9-13 | One model null already falls to the other; only both-null gives 0. No fixture has one. Gust null gives 0 under any wind | low | plain |
| Current wind direction `?? 0` | CONFIRMED | mapCurrent.ts:24 | Missing direction becomes north | low | plain |
| Visibility clamp 1-40 km | CONFIRMED as fact | world/airParts.ts:76-83 | A chosen display range | low | design |
| Precipitation semantics | CONFIRMED, severity up | domain/bracket.ts:5-10, atmo/weatherMix.ts:75-76; world/worldParts.ts:42-59 | [api] The hourly value is the preceding hour's sum; it is lerped as an instant at its end stamp, so rain peaks about 30 min late, behind the live reading; ground wetness too | medium | plain |
| rainView.ts unused | CONFIRMED | data/world/rainView.ts | No importer. Delete, or keep if TURN-VIEW-PLAN.md:76 is near | low | plain |
| Fixed steering heights | CONFIRMED | world/field/advect.ts:7 | Standard 850/700/300 hPa heights; geopotential not asked | low | design |
| Hourly interpolation | Correct for instants | domain/bracket.ts | Not for sums and maxima (precipitation row, M6) | - | - |

## 2. Land

| fact | verdict | file:line | evidence | severity | kind |
|---|---|---|---|---|---|
| Building height stretch | DECISION | world/outside.ts:120-123, 290-299; PLAN about 605-611, 1891-1892 | "Towers and houses keep their own legible sizes." The audit's ratios reproduce | none | design |
| Building width | CONFIRMED as fact | data/city/outsideView.ts:189-192, 274-282; outside.ts:184 | Fixed glyph widths, documented as C9 defect 10 | medium | design |
| Squares with built share < .2 | CONFIRMED, severity down | outside.ts:156-158 (height) vs :183-184 (frontage, built > 0) | [run] 66,009 of 119,725 squares are below .2; 64,929 of them have footprints; levels >= 3 in 26,086, p90 >= 13 m in 13,807. Their median typical roof is 7.2 m and only about 40 % exceed the 7.7 m fallback. The audit's per-city medians are scrambled and use max(levels, p90). `rasterBoxes` (outsideView.ts:304-330) never runs in the app (outside.ts:859-860 passes `fabric`). The same gate in world/beyondSeat.ts:28-41 is documented | medium | plain |
| Raster at desert places | REFUTED as a loss | public/data/city/il | No source footprints (Ein Gedi 1 of 37) | low | design |
| Tower and landmark heights | Mostly REFUTED | data/landmarks/shortlist.ts:20-31, 66; industrial.ts:20, 85; public/data/landmarks/il | [run] "Gaza 250 m" is the Ashkelon power-station chimney; 250/300 m at 32.47 is Orot Rabin; 250 m at 30.96,34.73 is the Ashalim solar tower: all real. The three Tel Aviv towers are named and kept by a written rule. Wrong: a 412 m castle (323_352.json) and two unnamed 400 m "highrises" in the Rotem plain (309_350.json), by their look elevations in the height tag. shortlist.ts:66 drops those two, but `panoramaShortlist` has no such test and `landmarkBeyond` passes anything >= 200 m, so they can enter the scene pool of a place within 30 km (Dimona, about 12 km). That they are drawn is not proven | low-medium | plain |
| Raster p90 cap | REFUTED as a loss | scripts/city/raster.ts:33; data/city/skylineHeight.ts | Stored to 255 on purpose, capped at 60 m on display; only the plan's "80" is stale | low | doc |
| Storey height | CONFIRMED | data/city/skylineHeight.ts:1 (3.1) vs scripts/city/heights.ts:15, 24, 48, raster.ts:32, data/landmarks/worship.ts LEVEL_M (3.2) | Two constants for one fact | low | plain |
| Squares with no height (10 m) | REFUTED as a loss | docs/design/CITY-SKYLINE-PLAN.md section 8 | Source has none; stored as "levels 0 (unknown)". 25,631 of 53,716 usable squares | low | design |
| Haze distance per building | DECISION, documented | world/beyondSeat.ts:20-25; outside.ts:861 | The outside view's eye is set back, so "distance from the place" is the wrong yardstick; base is the near ridge's sight distance | low-medium | design |
| Minaret, church defaults | REFUTED | data/landmarks/israelData.ts:81, worship.ts:10; world/neighbourPolicy.ts:7-10, TASKS.md:8 | Legacy 30 m and 25 m become 9 m on load; other towns' minarets are hidden by owner decision. The real problem is M3 | none | - |
| Landmarks beyond the strip | Partly REFUTED | shortlist.ts:64-75; data/city/farData.ts:45-50; world/beyondMarks.ts:17-20; docs/design/LANDMARKS.md | The strip is a documented band; far highrises >= 80 m come from far.json (442). Remaining: tall chimneys, turbines, masts outside the cells. [run] outside the cells, within 12 km and >= 40 m: Tel Aviv 12, Jerusalem 2 chimneys, Haifa, Tiberias, Rosh Pina, Ein Gedi 0 | low-medium | design |
| Towns of Jordan, Lebanon, Syria, Egypt | CONFIRMED, already known | TASKS.md:1113; world/builtCells.ts:7-10 | The extract is Israel + Palestine. WorldCover cells in public/data/land/il reach lon 35.9+, a second source on another basis (land-cover share, not footprints) | high at night in the Jordan valley, else low | design |
| Dead Sea level | CONFIRMED | world/outside.ts:376 (lowest wet DEM sample), data/terrain/fetchPanorama.ts:9-27; TASKS.md:693-694 | DEM about -415, today about -438; Ein Gedi's drop reads 119 m, true about 142 m. No second path: the mask says which body, never its height | medium | design (a dated level must be chosen; the shore moves too) |
| Kinneret level | CONFIRMED | outside.ts:376; PLAN:1934 | Samples run -211 to -223 and the minimum one sets the picture's bottom, up to about 10 m of the 73 m drop | low-medium | plain |
| Peak heights | UNPROVEN | - | References unreliable: Masada is about +58 m, not -50; Mt Sdom about -170, not +170; Arbel 60 and Gilboa 342 are off the summits. Equal z8 and z12 for Meron suggests offset coordinates, not smoothing | low | - |
| Relief exaggeration | DECISION | data/terrain/angleScale.ts:25-35; PLAN decision 14 | Options were shown to the owner | none | design |
| Ray start | REFUTED (audit agrees) | fetchPanorama.ts | The 49x49 local grid covers it | none | - |
| Hermon from Rosh Pina | DECISION | docs/design/TURN-VIEW-PLAN.md | The view cone faces south | none | design |
| Rivers, ponds | DECISION, documented | data/water/waterMask.ts:3-8; scripts/land/water.ts:12; scene/model/landPalette.ts:61 | "Not seen as water from a distance". Side effect: WorldCover water is excluded from albedo, so a pond is neither land nor water | low-medium | design |
| Roof kind | DECISION (2026-11-19) | world/place.ts:24-34 | Owner's roof rule | none | design |
| Wall material | CONFIRMED as fact | scene/model/buildingMaterial.ts | No data carried; a new source | low | design |
| Trees | CONFIRMED, kind changed | outside.ts:205-206 | Fixed heights; canopy height is a source never taken, not a lost one | low-medium | design |
| Climatology dryness | CONFIRMED, fallback only | data/land/climatology.ts:85-98 | Cosine peaking mid-July: April about .40, October about .58; documented heuristic | low | design |
| Lit windows share | DECISION, documented | scene/model/marks.ts:44-45; world/night.ts:14-24 | "About two windows in five" | low | design |
| Far-town night lights | CONFIRMED, known: same as the Jordan row | world/townLights.ts, builtCells.ts | One cause, one fix | as Jordan row | design |

## 3. Life and time

| fact | verdict | file:line | evidence | severity | kind |
|---|---|---|---|---|---|
| Event identity across refresh | CONFIRMED | world/lifeSchedule.ts:220-227; indices at 283, 292, 332, 409-426, 464-466, 479, 492-493; lifeDay.ts:71-74 | `arrivals` draws candidates, thins, and the index is taken after thinning. [run, copy of that loop, one hour's rate set to 0] 63 to 62 arrivals: 20 survivors keep their index, 42 are renumbered (new id, seed, look) | medium | plain |
| Moon bright-limb tilt | CONFIRMED | world/moonShape.ts:30-42; scene/model/bodies.ts:64 | [run, independent spherical bearing] errors 27, 21, 14, -28, -34 degrees (audit's numbers right), 15 for a young crescent. `sunDirection` uses sin(azimuth), so it does not even point at the drawn sun (x 312 vs 288 at azimuth 247). TASKS.md:339 says only "lit side towards the sun" | medium | plain at night; design when the sun is drawn too |
| Contrail humidity basis | CONFIRMED by evidence | data/openMeteo/mapHours.ts:34, 75; world/contrails.ts:68-69 | [run, Haifa fixture] ICON max 62 % (106 % over ice, plausible). ECMWF max 100 %, which read as over water is 176 % over ice (4 h above 130 %, not physical): ECMWF looks over ice, ICON over water, yet they are blended and read as over water. Provider page not read (offline) | medium | plain |
| Contrail drift at 300 hPa | CONFIRMED, documented | lifeSchedule.ts:423-424, lifeDay.ts:47, 55 | About 1 km below cruise; needs a new field and the Worker allowlist | low | plain, deferred |
| Dust text vs tint | CONFIRMED as two scales | world/airParts.ts:66; config/thresholds.ts:14, hazard.ts:22; docs/design/atmo-fable.md:125, 130 | The tint is colour only (amount follows visibility); the text uses pm10 alone | low | design |
| Two wind-lean curves | CONFIRMED, number refuted | scene/model/landWind.ts:11-36, marks.ts:47-49; scene/paint/glyphs/nature.ts:35 | .34 vs .157 compares different units (land lean is multiplied by tree travel .055-.18 of height). Both approved (TASKS.md:919, C7) | low | design |
| Label sun event | CONFIRMED | scene/react/sceneLabel.ts:49 | Uses the live `now` while a time is selected | low | plain |
| SHAPES.speedMs | CONFIRMED | world/life.ts:166-176 vs lifeSchedule.ts:62-70 | Unread, and contradicts GROUP (swift 20 vs 10) | low | plain |
| Dead facts | Partly REFUTED | lifeSchedule.ts:405-421, 488; scene/model/contrailFrame.ts:29; world/sunPath.ts:11-19 | `meteors.perHour` and `HighPlane.speedMs` are read. Unread: the WorldState copies, Flock.score/speedMs; sunPath `declination`/`noonElevation` only call each other outside tests (confirmed) | low | plain |
| Flock and bird sizes | CONFIRMED as fact | world/life.ts, scene/model/birds.ts | Readability caps (MAX_FLOCKS) | low | design |
| Bird seasons, hours | CONFIRMED as fact | world/life.ts `birdScores` | Species list is a choice | low | design |
| Airliners only with a trail | CONFIRMED; "no night planes" REFUTED | lifeSchedule.ts:405-408; world/airports.ts:27 | Airport traffic runs at night (LLBG 8/h); cruise planes do need a trail | low | design |
| Airport traffic | Partly REFUTED | world/airports.ts:27, 31 | Ramon (LLER) is Eilat's airport and is present; Ovda closed to civil traffic in 2019. No Shabbat dip | low | design |
| Smoke and steam | CONFIRMED as fact | scene/model/smoke.ts:19-43 | No activity or T/RH term | low | design |
| One wind scalar across the view | CONFIRMED as fact | domain/camera.ts `lateral` | Wrong at the edges of 250 degrees | low | design |
| Wear advice | CONFIRMED as fact | text/wear.ts:34-37 | UI text, not the scene | low | design |
| Calendar, Shabbat | CONFIRMED absent | - | No logic in src | low | design |
| DST | CONFIRMED | astro/utc.ts:37-52; domain/minutes.ts:8, domain/time.ts:38 | [run] 2026-03-27 02:30 gives 00:30Z, 03:00 gives 00:00Z; 2026-10-25 00:59 gives 21:59Z, 01:00 gives 23:00Z (the first 01:00 unreachable). Two `addMinutes` | low | plain |
| Time zone outside Israel | CONFIRMED | data/geocoding.ts:46, 70 | Device zone | low | design |

## List 1. Confirmed plain losses: the smallest general fix

1. **Live layers (high).** `cloudHigh` in `CurrentWeather` (domain/types.ts:15-18), filled in mapCurrent, carried in `rollForward` (domain/now.ts:37-38); pass `hour: c` to `layerCovers` at weatherAt.ts:112. Picture: the live sky gets its real layers, and now and +1 h agree. Test: live 0/90/0 gives low 0, mid about .9 (today .684/.684).
2. **Event identity (medium).** `arrivals` returns `{ t, ordinal }`, the ordinal counted before thinning; ids and seeds use it at all call sites. `meteorEvents` takes a fixed top rate, not `max(rate)`. Picture: a refresh no longer swaps birds, planes and meteors. Tests: one hour's rate set to 0, every event outside it keeps id, t0 and seed; the meteor peak times 1.05, events keep their times.
3. **Precipitation and gust timing (medium).** Sample preceding-hour values at stamp minus 30 min (one helper beside `bracketAt`, used by weatherMix and `wetBetween`). Picture: rain and wet ground come half an hour earlier, in step with the live reading. Test: 13:00 = 0, 14:00 = 4, 15:00 = 0 peaks at 13:30 (today 14:00).
4. **Contrail humidity (medium).** Convert the ECMWF 250 hPa column to over-water (times satIce/satWater at its temperature) in mapHours before the blend, after confirming the basis on the provider's page. Picture: fewer and shorter persistent trails in ECMWF-moist hours. Test: one vapour amount given in each model's basis gives one blended value; today the two differ by about 70 %.
5. **Moon tilt (medium, night).** `brightLimbAngle` from the great-circle bearing moon to sun, mapped by the local screen axes at the moon. Picture: the moon turns by up to 34 degrees. Test: the six times of section 3 within 3 degrees. With the sun also drawn it is the owner's call (a true tilt does not point at the drawn sun).
6. **Height of thin squares (medium).** `heightAt` (outside.ts:156-158) uses the raster when `levels > 0 || p90 > 0`; share stays for frontage. Remove the dead `rasterBoxes`. Picture: thin squares with three or more storeys (about 26,000 nationally) rise above the default, and low ones fall to their own size. Test: share 2/15, levels 5 gives a roof above 7.7 m.
7. **Kinneret noise (low-medium).** One level per lake body (the median of its wet samples) instead of the minimum at outside.ts:376. Picture: Tiberias's vertical scale stops hanging on one sample. Test: one sample 12 m low must not move `loM`.
8. **Bad heights (low-medium).** A per-kind cap at load (castle 60 m, unnamed highrise 260 m), shared by shortlist and panoramaShortlist. Picture: none for most places, no 400 m tower near Dimona. Test: the castle and the two Rotem marks never enter `sceneMarks`.
9. **Small ones (low, one commit).** Direction null at mapCurrent.ts:24 (take the nearest hour's); both-null hours take the neighbouring hour (test: never 0); `selected ?? now` at sceneLabel.ts:49 (test: scrubbed label); one STOREY_M; delete rainView.ts, SHAPES.speedMs, unread Flock and sunPath fields; one `addMinutes`; `utcOf` monotonic in both DST hours (test: the four stamps above). Picture: almost none.

## List 2. Missed by all three audits (at most 10)

| # | fact | proof | effect | severity | kind |
|---|---|---|---|---|---|
| M1 | The live reading is one model, uncorrected; the hours are a blend with station corrections | docs/briefs/codex-multimodel.md:11 (`current` stays unsuffixed); mapCurrent.ts:19-28 vs mapHours.ts:56-63 (`correctGust`, `correctHumidity`, temperature add); `applyLive` (domain/correction/live.ts:46) shifts temperature only. [run] fixture forecast-multi-2026-11-17 04:30: cloud 66 %, gust 5.4; blended hours 42-45 % (ICON 64-68, ECMWF 10-11), gust 7.2-7.6 | As the reading's weight falls (15-45 min) the sky goes 66 to about 43 % with no weather reason; humidity and gust step too | medium-high | design (which is truth); plain for gust and humidity correction |
| M2 | Meteor times depend on the day's peak rate | lifeSchedule.ts:488-492. [run, copied loop] peak +5 %: 0 of 67 arrivals keep their time | All meteors move on refresh; closed by list 1.2 | medium | plain |
| M3 | Worship-tower evidence never reached the client | scripts/landmarks/build.ts `EvidenceCell`; [run] all 260 committed cells in public/data/landmarks/il are legacy bare arrays | Every church and minaret is a 9 m hall, real towers included | medium | plain (rebuild data) |
| M4 | Drawn cloud base uses corrected T and RH | cloudField.ts:33, clouds.ts:107 against the comment in world/types.ts | Base and field differ by the station correction | low | plain |
| M5 | Rain without a rain class | domain/blend.ts:29-38 keeps the dry code unless the wet model's probability is >= 40 %, while the amount blends above 0; atmo/fieldWeather.ts:12-21 reads the code | Rain falls from a sky with neither steady nor shower structure | low-medium | design |
| M6 | Hourly gusts (preceding-hour maxima) read as instants | [api], weatherMix.ts | Gusts about 30 min late; closed by list 1.3 | low | plain |
| M7 | Hourly apparent temperature never asked | request.ts:14-19; weatherAt.ts:59, now.ts:32 set feelsLike = temperature; airParts.ts:96-104 `heat()` | Heat differs between now and the same minute scrubbed | low-medium | design |
| M8 | Air falls to 0 past its ends | weatherAt.ts:29 (exact match), 71 (`opticalPm10` lerps to 0) | Haze drains within an hour, in a copy held past midnight | low | plain |
| M9 | Stills exaggerate rain | scripts/fixtures/recordForecast.ts records an hourly sum as `current.precipitation`, weatherAt.ts:114-115 multiplies by 4. [read] Haifa 2.8 gives 11.2 mm/h | CI stills only | low | plain (fixture) |
| M10 | A square gives width but not height | outside.ts:157 vs :183-184 | Rows of true frontage at default height; closed by list 1.6 | medium | plain |

## Summary (ten lines)

1. All 59 rows checked. The audits are broadly sound, but many "plain losses" are owner decisions, documented choices or absent sources.
2. Highest: the live sky loses its cloud layers; the cause is the missing `hour: c` at weatherAt.ts:112 more than the unmapped high cloud.
3. Missed by all: the live reading is ICON alone and uncorrected against blended, corrected hours; in the fixture cloud drifts 66 to about 43 % within 45 min.
4. Medium plain: event ids taken after thinning (42 of 62 survivors renumbered in my run); meteors all move when the peak rate changes.
5. Medium plain: hourly rain and gusts read as instants, about 30 min late.
6. Medium plain: moon tilt wrong by 14 to 34 degrees; contrail humidity mixes over-ice ECMWF with over-water ICON (inferred from data, provider page not read).
7. Medium plain: thin raster squares lose their height, but only about 40 % exceed the default roof, so the audit overstated it.
8. Data, not code: worship evidence never shipped (260 legacy cells); Dead Sea about 22 m high (a level must be chosen); Jordan-side towns absent (known).
9. Refuted: air range in the scene, satellite total only, minaret 30 m, "Gaza" 250 m, no night planes, no Eilat airport, part of the dead facts. Unproven: peak heights.
10. Suggested order: list 1.1, 1.2, 1.3, the M1 decision, M3 rebuild, 1.4 after the provider page, 1.5, 1.6, then the small ones.
