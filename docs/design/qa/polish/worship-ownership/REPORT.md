# Worship ownership fix

## Round 1

The scene now tests non-owned glyph feet against the surviving foreground geometry. Beyond seats use the supporting town block's angular height scale and haze tier. Selection refills from the visible candidates after final screen containment and occlusion.

The Karmei Tzur regressions pass at 375 and 1280 px. They retain שבת אחים and drop the Halhul minaret. The local bundled landmark row contains the legacy 30 m default, loaded as a 9 m hall. The production regression supplies the observed 17 m height and reconstructs the measured seat and foreground roof. Its complete production panorama is unavailable locally. The bundled-world regression uses flat 100 m terrain at the production coordinate.

### Scale and visibility

- The default panorama relief is `1.5 / RAD × sin(a × RAD) + 50 × tanh(a / 6)` px, with `a` in degrees. At the horizon its slope is **9.833333 px/°**, including a 6.56× vertical stretch relative to the 1.5 px/° base scale.
- The own town's land retains its relief-dependent `verticalScale`, bounded to 0.06–0.3 px/m. Its frame height scale is `min(1.2, 0.18 × (5 / max(0.3, extentKm))^0.8)` px/m at the middle depth. The low fabric also receives the legible-house boost in `lookOf`. Beyond blocks and glyphs now use `atan2(heightM, distanceKm × 1000) × 180 / π × horizonSlope()`. Far-town storey heights use the same projection helper.
- A seated mark's distance for angular size is the slant distance from the outside view's displaced eye. An unseated far mark uses its geodesic distance from the panorama eye at the place. Resizing stretches x while retaining the vertical scene-pixel scale.
- A 17 m tower at 6.46 km subtends 0.1508° and projects to approximately **1.48 px**. A 9 m hall at 16.24 km projects to 0.312 px.
- The glyph legibility floor is **1 px**. Smaller glyphs cannot carry a distinct silhouette and are culled. No glyph is enlarged to reach that floor. Town raster roofs retain their existing 0.8 px visibility threshold.
- Foot occlusion tests the glyph's entire horizontal span against surviving skyline boxes, towers, nearer beyond blocks, selected nearer seated glyphs and the drawn ridge segments. The terrain contact allowance for a town seat is **1 px**, matching the support block's overlap with its ridge to close their seam. Box and glyph occlusion have zero margin.
- Seated marks receive the exact supporting block's `tonesAt` distance input, including the land-behind cap and 0.5 km quantization. Far glyphs use the far towns' geometric distance bins. Both paths use the existing `aerialFor` haze function. Painters receive the resulting scene descriptions.

### Verification

- The final targeted run passed **309 tests in 16 files**, taking **79.90 s**, with one worker. It included the requested seven files and the directly affected mark, outside-layer, model, world, landmark and plain-visibility tests. The command enumerated every file.
- Each safeguard was disabled independently through a temporary Vitest transform. Removing foot occlusion failed the Karmei Tzur foreground regression at both widths. Inflating seat height by 10% failed the independently calculated angular-height assertion. Removing the seat floor admitted a 0.9 px mark. Removing the far floor admitted the 9 m hall at 16.24 km. Replacing the support's haze input with the mark's raw distance failed the tier-equality assertion. All five mutations produced the expected assertion failures, and the temporary configuration was removed.
- `npx tsc -b` passed using the configured build caches.
- `npx oxlint` passed with 12 existing warnings in the design prototypes, city geometry and land hook.
- The earlier full-run weather failures were 30 s timeouts. Both cases passed when selected alone, taking 32.40 s together.
- The all-settlement audit passed at 375 and 1280 px in **542.4 s**. It covered 1,781 places, with 18 recorded panoramas and 1,763 flat 100 m fixtures. It checked 238 seated and 2,988 unseated non-owned glyphs across all kinds. Every drawn worship glyph matched a source landmark.

### Changed expectations

- Rosh Pina's 9 m hall falls below one pixel from the outside camera. The shortlist transport regression now uses a 16 m hall that clears the floor and remains below its 30 m decoys in rank.
- Jerusalem's 9 m minaret at `il-minaret-31.763-35.26575` previously drew at 2.95 px through the portrait height boost. Its angular height falls below one pixel, so its seat disappears. The own city portraits still agree with and without extra seat candidates.
- The C9 beyond-town test verifies surviving blocks and their angular upper bound. Haifa has 10 qualifying blocks, replacing the old requirement of more than 20. Its small angular roofs now meet the existing 0.8 px threshold without the portrait boost.
- The synthetic Track B containment and budget fixtures use a flat backdrop below their feet. Their expected selected sets remain the same. Dedicated foreground and backfill regressions exercise occlusion.
- The measured Karmei Tzur fixture assigns its own foreground roof the observed nearer distance of 3.85 km. This corrects the fixture's former farther row assignment, which allowed the minaret through at both widths.

### Commands

```powershell
npx vitest run src/scene/model/worshipVisibility.test.ts src/scene/model/markOcclusion.test.ts src/scene/model/outsideSeats.test.ts src/scene/model/c9.test.ts src/world/beyondSeat.test.ts src/world/portraitContest.test.ts src/world/seatBudget.test.ts src/world/markOwnership.test.ts src/scene/model/marks.test.ts src/scene/model/outside.test.ts src/scene/model/model.test.ts src/data/landmarks/landmarks.test.ts src/data/landmarks/placeHomes.test.ts src/data/landmarks/shortlist.test.ts src/data/terrain/plainVisibility.test.ts src/world/world.test.ts --maxWorkers=1
npx vitest run src/scene/model/weather.test.ts --maxWorkers=1 -t 'weather: (tel-aviv|haifa).*rains and snows only from the banks'
npx vitest run src/test/probe-worship/audit.test.ts --maxWorkers=1
npx tsc -b
npx oxlint
git diff --check
```

The local folder-wide test run was stopped. Subsequent test commands use explicit files. The audit loads bundled data through a stubbed fetch and calls the real world builder and scene model at both widths.

### Audit counts

Paired counts use the original 1,780 places and both widths. The separate production point contributes its own synagogue at each width in the after export, giving 1,908 worship rows across all 1,781 places. Its measured baseline and flat-terrain follow-up are listed separately in the audit.

| Measure | Before | After |
| --- | ---: | ---: |
| All worship glyph rows | 2,876 | 1,906 |
| Synagogue-only worship rows | 894 | 686 |
| Synagogue-only non-synagogue rows | 204 | 32 |
| A · Neighbouring named town | 70 | 66 |
| B · Own footprint | 618 | 618 |
| C · Beyond seat overlapping own x span | 24 | 0 |
| D · Remaining | 182 | 2 |

The 32 remaining non-synagogue rows are 16 minarets at each width, all on visible neighbouring blocks outside the own horizontal span. The two D rows are one minaret at both widths, seated on drawn block `319_351:54:18` whose cluster has no name. All drawn non-owned glyphs satisfy the same geometry, scale and haze assertions.

### Files changed

- `AUDIT-table.md` records the saved phase-1 baseline, findings, production point and paired after results.
- `AUDIT-table.tsv` provides the same audit and comparison as tab-separated data.
- `REPORT.md` records the geometry choices, validation, changed expectations and file inventory.
- `src/data/terrain/apparentHeight.ts` defines the shared angular projection and one-pixel glyph floor.
- `src/data/landmarks/markProjection.ts` holds the existing elevation interpolation beside projection.
- `src/data/landmarks/placeMarks.ts` sizes non-owned candidates before ranking and requires visible plain ground.
- `src/data/landmarks/rank.ts` carries candidate viewing distance and height through selection.
- `src/data/landmarks/types.ts` carries viewing distance into placed-mark geometry.
- `src/world/beyondSeat.ts` projects raster roofs and seated marks with the same angular scale.
- `src/world/beyondMarks.ts` applies the shared glyph floor to candidate seats.
- `src/world/marks.ts` renders non-owned glyphs at their projected heights and retains viewing distance.
- `src/world/markGeometry.ts` documents the angular scale carried by non-owned glyph geometry.
- `src/world/farCities.ts` uses the shared angular projection for far-town storeys.
- `src/world/outside.ts` supplies the beyond-town projection with its frame and base distance.
- `src/world/outsideSeats.ts` carries the full pool through final containment and clearance.
- `src/scene/model/markOcclusion.ts` checks feet against drawn masses and ridge segments.
- `src/scene/model/landBehind.ts` holds the existing land-behind haze rule.
- `src/scene/model/farTownHaze.ts` shares far-town haze distance bins.
- `src/scene/model/farCities.ts` uses those shared bins in the far-town layer.
- `src/scene/model/index.ts` supplies surviving outside and far-city masses to far glyphs.
- `src/scene/model/marks.ts` culls far glyph feet and supplies far-town haze distance tiers.
- `src/scene/model/outside.ts` collects surviving foreground and far-city boxes, rechecks visibility and preserves form keys when the glyph set stays the same.
- `src/scene/model/outsideMarks.ts` culls blocked seats, refills the budget and shares support haze.
- `src/scene/model/types.ts` retains far-town mass distances in final scene descriptors.
- `src/scene/model/worshipVisibility.test.ts` covers Karmei Tzur, terrain, backfill, haze and far glyphs.
- `src/scene/model/markOcclusion.test.ts` checks far-block left edges and interior ridge peaks at both widths.
- `src/scene/model/c9.test.ts` checks the angular scale of beyond-town blocks.
- `src/scene/model/outsideSeats.test.ts` isolates the Track B containment fixtures from foreground geometry.
- `src/world/beyondSeat.test.ts` checks angular height, the floor and transport of a legible hall.
- `src/world/beyondSeatFixture.ts` finds raster seats using angular height.
- `src/world/portraitContest.test.ts` verifies own portraits and Jerusalem's subpixel hall.
- `src/test/bundledCityClusters.ts` reconstructs all named home clusters and each raster square's owner.
- `src/test/worshipAssertions.ts` checks final height, foot visibility and haze at both widths.
- `src/test/probe-worship/audit.test.ts` drives the all-settlement audit and geometry assertions.
- `src/test/probe-worship/auditFetch.ts` caches parsed bundled data and decoded land cover for the probe.
- `src/test/probe-worship/auditLoad.ts` builds a real world and ownership context for each place.
- `src/test/probe-worship/auditPlaces.ts` enumerates the audit points and the separate production coordinate.
- `src/test/probe-worship/auditCollect.ts` matches the final drawn glyphs to source landmarks.
- `src/test/probe-worship/auditTypes.ts` preserves the phase-1 row and place-summary schema.
- `src/test/probe-worship/auditUtils.ts` reads height evidence and supports fixture projection and matching.
- `src/test/probe-worship/auditOutput.ts` writes the after records, counts and assertion coverage.
- `src/test/probe-worship/check-beyond-sizes.test.ts` removes unused imports found by TypeScript.
- `src/test/probe-worship/inspect-data.test.ts` removes an unused import found by TypeScript.
- `src/test/probe-worship/audit-after.json` contains post-change glyph and place records.
- `src/test/probe-worship/summary-after.txt` contains post-change counts, coverage and runtime.

All changes remain uncommitted.

## Round 2

Outside comparisons now use one anchored distance frame. Structure depths and haze use `beyondKm(frame, baseKm, dx, dy)`. Their angular size uses `outsideDistance(eyeN, dx, dy)`. Skyline descriptors retain their source offsets where available, and normalized row coordinates are reconstructed in the same frame. The near ridge's panorama distances are transported to that frame before foot or haze-cap comparisons. The own land is anchored at the outside near-edge distance.

Unseated outside marks retain physical height and outside viewing distance through placement. Their final height is computed at the final drawn base. The Karmei Tzur silo `il-silo-31.56601-35.10073` now measures approximately 2.2 px and is culled behind the nearer blocks at both widths. The visible-silo fixture separately verifies its haze distance, and the shared assertions cover every non-owned kind.

Far-city masses at z 16 and far/back ridges are excluded from the outside foot test. Its terrain occluders are the near ridge and own land. Far-city masses remain occluders for the far marks layer. Outside geometry painted over that layer occludes by painter order without comparing kilometres from different eyes. Outside shape caching depends on the view, width and text zones, with no visibility or far-city dependency.

Projection now uses `anglePx(a0 + rise) - anglePx(a0)`, where `rise = atan2(heightM, distanceKm * 1000)` in degrees and `a0` is recovered from the actual drawn base. The 9.8333 px/degree value describes the horizon slope. Each glyph and block uses the relief scale at its own elevation. Beyond raster towers use that same projection and the shared 1 CSS px coverage floor. The floor is sourced from the reference canvas pixel unit and is independent of display DPR.

The own skyline's height composition is preserved. Its enlarged painted roofs are the correct occluders because those exact roof pixels stand in front of a hidden glyph foot in the image. The cull uses the scene's final box geometry, including that deliberate enlargement. Its depth and haze comparisons now use the outside frame.

### Changed expectations

- The former far-city-block test now keeps the outside seat because the city layer paints beneath it. A far-layer glyph regression still requires the same nearer far-city block to hide the glyph foot.
- Angular-height assertions now evaluate the relief difference at each actual base angle. Tests at -20, -6, 0, 6 and 20 degrees verify the inverse projection and the changing vertical scale.
- Beyond raster towers clear the shared 1 px floor. The Haifa crest test replaces its former greater-than-2 px requirement and verifies both the one-pixel minimum and the visible-height upper bound.
- The C9 coverage bounds require at least 349, 25 and 9 qualified raster roofs in Ramat Gan, Tel Aviv and Haifa. These are the bundled recorded fixtures' roofs clearing the existing 0.8 px angular-and-crest threshold. Each roof also has both a lower and an upper projected-height assertion. Haifa's round-1 count was 10 under the horizon-only scale.
- The haze-cap regression now compares with transported outside-frame ridge kilometres. Comparing against the panorama-eye distance mixed two origins.
- The noon-light regression checks positive contrast above both backlit readings. The larger corrected haze distances attenuate Jerusalem's noon contrast below the old fixed 0.08 RGB-luminance delta. Both backlit readings still meet the original dark-silhouette bound.
- The durable sample contains all 18 recorded panoramas, every one of the 91 synagogue-only places with a phase-1 non-synagogue row, and eight additional home clusters selected by a fixed hash seed. It builds one world per place and checks both widths. Flat 100 m terrain is explicit where no panorama is recorded.

### Verification

The durable 117-place test passed in 37.04 s. It checked 59 seated glyphs, 73 unseated glyphs and 648 raster towers. Its regular test file and compact phase-1 place fixture live outside the excluded probe directory. The full audit remains a probe.

The explicit 18-file affected run passed all 319 tests in 69.03 s with one worker. The final run repeated those files plus the durable sample with the filesystem transform cache disabled: all 320 tests in 19 files passed in 121.05 s. The sample itself took 37.04 s in that run. `npx tsc -b` passed. `npx oxlint` passed with the same 12 existing warnings. `git diff --check` passed. Existing files already over 150 lines did not grow, and `rank.ts` is 139 lines.

Five independent temporary Vitest transforms disabled the new safeguards. Using the panorama eye for the silo failed its viewing-distance assertion. Using geodesic depth failed its independently calculated outside depth (4.802536 versus 10.307928 km). Reintroducing far-city occluders hid the outside seat and failed its retained-glyph assertion. Reverting to horizon-only projection failed the off-horizon height assertion (1.482386 versus 0.219172 px). Inflating raster tower height by 10% failed its angular-height assertion (1.593141 versus 1.448310 px). Every transform produced the intended assertion failure. These runs disabled Vitest's filesystem transform cache so each mutation was applied independently. The temporary scripts and configuration were removed.

The full offline audit passed in 483.4 s (484.84 s including Vitest startup). It covered 1,781 places at both widths, with 18 recorded panoramas and 1,763 flat 100 m fixtures. It verified 523 seated glyphs, 1,301 unseated non-owned glyphs across all kinds and 7,366 raster towers. Every drawn worship glyph matched a source. The production coordinate retains only `il-synagogue-31.6097-35.10159` at both widths. Its full panorama remains unavailable locally, so the report distinguishes the flat-terrain world from the measured foreground regression.

### Audit counts

These paired counts exclude the separate production coordinate and cover the original 1,780 places at both widths. Full round-2 worship rows including that coordinate total 2,179. The audit table and TSV list every place as phase 1 → round 1 → round 2.

| Measure | Phase 1 | Round 1 | Round 2 |
| --- | ---: | ---: | ---: |
| All worship glyph rows | 2,876 | 1,906 | 2,177 |
| Synagogue-only worship rows | 894 | 686 | 756 |
| Synagogue-only non-synagogue rows | 204 | 32 | 52 |
| A · Neighbouring named town | 70 | 66 | 134 |
| B · Own footprint | 618 | 618 | 618 |
| C · Beyond seat overlapping own x span | 24 | 0 | 0 |
| D · Remaining | 182 | 2 | 4 |

Round 1 → round 2 adds 288 worship rows and removes 17, changing 251 place/width glyph lists. Correct painter order and the transported ridge frame admit previously hidden neighbouring seats. Corrected base-angle size and outside-eye depth also remove invalid rows. The increase of 20 non-synagogue rows on synagogue-only places is entirely neighbouring minarets seated outside the own horizontal span. All 52 surviving rows meet the same assertions (25 phone, 27 desktop). The four D rows are two such minarets at both widths, `il-minaret-31.93823-35.16806` and `il-minaret-32.07157-35.24342`, on unnamed built clusters. Own rows remain 618 and group C remains zero.

### Commands

All local tests name explicit files. Fetch is stubbed to bundled public fixtures. The exhaustive audit is the specifically allowed probe.

```powershell
npx vitest run src/data/terrain/apparentHeight.test.ts src/scene/model/outsideFrame.test.ts src/scene/model/worshipVisibility.test.ts src/scene/model/markOcclusion.test.ts src/scene/model/outsideSeats.test.ts src/scene/model/c9.test.ts src/world/beyondSeat.test.ts src/world/portraitContest.test.ts src/world/seatBudget.test.ts src/world/markOwnership.test.ts src/scene/model/marks.test.ts src/scene/model/outside.test.ts src/scene/model/model.test.ts src/data/landmarks/landmarks.test.ts src/data/landmarks/placeHomes.test.ts src/data/landmarks/shortlist.test.ts src/data/terrain/plainVisibility.test.ts src/world/world.test.ts src/scene/model/settlementOwnership.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/scene/model/settlementOwnership.test.ts --maxWorkers=1
npx vitest run src/test/probe-worship/audit.test.ts --maxWorkers=1
npx tsc -b
npx oxlint
git diff --check
```

### Round-2 files

- `src/data/terrain/apparentHeight.ts` projects rises at their base elevation and documents the pixel floor's source.
- `src/data/terrain/apparentHeight.test.ts` checks inverse projection and rises at five base angles.
- `src/data/landmarks/types.ts` carries perspective metadata and the candidate schema.
- `src/data/landmarks/rank.ts` re-exports the candidate type and returns below 150 lines.
- `src/data/landmarks/markProjection.ts` uses `SCENE_W` for elevation interpolation.
- `src/data/landmarks/placeMarks.ts` accepts the caller's layer-specific perspective.
- `src/world/markPerspective.ts` computes outside-frame metadata and reprojects final bases.
- `src/world/marks.ts` retains the correct depth and physical-height metadata through placement.
- `src/world/outsideDepth.ts` transports ridge distances and reconstructs source offsets for skyline descriptors.
- `src/world/beyondSeat.ts` sizes town roofs and seats at their actual bases.
- `src/world/outside.ts` sizes beyond raster towers with the same angular projection and floor.
- `src/world/farCities.ts` projects far structures at their actual bases.
- `src/scene/model/markOcclusion.ts` documents distance frames and limits occluders to the correct layers.
- `src/scene/model/outside.ts` uses outside depths for skyline haze and removes air-dependent shape caching.
- `src/scene/model/outsideMarks.ts` uses frame depth for ordinary marks and simplifies visible-seat selection.
- `src/scene/model/landBehind.ts` transports ridge haze distances before capping outside items.
- `src/scene/model/index.ts` retains far-city occluders for far marks and respects foreground layer order.
- `src/scene/model/marks.ts` delegates the far foot check and restores the original spacing.
- `src/scene/model/outsideFrame.test.ts` checks the silo frame, visible haze, cache reuse and far-layer occlusion.
- `src/scene/model/worshipVisibility.test.ts` corrects the outside-over-far-city expectation.
- `src/scene/model/markOcclusion.test.ts` checks that far/back ridges cannot occlude outside feet.
- `src/scene/model/c9.test.ts` restores physically qualified roof-count bounds and lower height checks.
- `src/scene/model/outside.test.ts` checks the shared tower floor and common-frame haze and lighting.
- `src/scene/model/settlementOwnership.test.ts` supplies the regular 117-place coverage test.
- `src/world/beyondSeat.test.ts` checks height at the seat's actual base angle.
- `src/world/beyondSeatFixture.ts` finds legible candidates using their base angles.
- `src/test/drawnGeometryAssertions.ts` independently checks projection, crest visibility and frame depth.
- `src/test/worshipAssertions.ts` checks every non-owned kind and drawn raster towers in the correct frame.
- `src/test/bundledWorld.ts` shares the real offline world-loading path between the regular test and probe.
- `src/test/bundledFetch.ts` shares parsed public-fixture and land-cover caches.
- `src/test/bundledTerrain.ts` shares the stated flat-terrain fixture and ownership classification.
- `src/test/fixtures/worship-ownership-phase1.json` preserves the 91 phase-1 problem places for regular tests.
- `src/test/probe-worship/auditLoad.ts` re-exports the shared offline world loader.
- `src/test/probe-worship/auditFetch.ts` re-exports the shared bundled-fetch stub.
- `src/test/probe-worship/auditUtils.ts` re-exports terrain helpers while retaining probe-specific utilities.
- `src/test/probe-worship/audit.test.ts` additionally checks raster-tower projection in the exhaustive probe.
- `src/test/probe-worship/auditOutput.ts` records raster-tower assertion coverage.
- `src/test/probe-worship/audit-round1.json` preserves the preceding run for paired round-2 comparisons.
- `src/test/probe-worship/audit-after.json` records the final round-2 glyphs, source matches and place summaries.
- `src/test/probe-worship/summary-after.txt` records round-2 counts, runtime and assertion coverage.
- `AUDIT-table.md` receives the three-stage per-place After comparison and final findings.
- `AUDIT-table.tsv` supplies the same three-stage comparison as tab-separated data.
- `REPORT.md` records round-2 geometry, changed expectations, counts and verification.

All changes remain uncommitted.

## Round 3

Owner decision, 2026-11-22, verbatim:

> מסגדים של כפרים שכנים שבאמת נראים מהיישוב — אבל צריך להיות ברור שזה של ישוב שנמצא ליד ולא נראה בתוך הישוב. גם אם זה מתרחק מעט מהאמת.

The final scene keeps a neighbour only when its own town visibly surrounds it and separates from home. The whole glyph footprint keeps **6 CSS px** from the final home skyline span, including surviving own towers. Six pixels are about two 2–3 px home houses at the reference scene scale, enough space to separate perceptual groups. The source raster square must retain painted town fabric at the foot and **1 CSS px on both sides** of the whole glyph. The search selects the exact nearest valid position from interval boundaries, always away from the home span's centre, within **12 CSS px** of the true bearing. At the exact centre either side may move away, so the nearer supported side wins. Boundaries come from source mass, the home gap, text boxes, viewport edges and the exact near-ridge crossing of the foot. A 1e-7 px contact epsilon resolves floating-point boundary contact, below the independent 1e-6 px geometry tolerance. This is a deliberate bounded horizontal departure from truth. It never migrates onto an unrelated block whose screen position happens to overlap.

Screen-width-specific placement follows final block/text culling and precedes the visible-seat budget. Each failed candidate frees its slot for backfill. Height, base and physical viewing distance are preserved during a slide. Foot checks include the surrounding side strips, nearer surviving structures and selected glyphs. The existing 1 px terrain contact allowance remains the town/crest seam allowance, with zero allowance against roof or glyph masses. The same rule applies to every non-owned glyph kind. Ordinary non-owned marks carry their source-square ID too; a floating silo without that visible support is culled. The coarse far-town field does not retain source-square ownership proof, so non-owned far glyphs are culled rather than attached to arbitrary distant fabric.

The glyph takes the exact haze tier of its supporting block. Its haze distance must be at least the maximum tier distance of the final home roofs. The tests compare the monotone air-fade amount, independently of RGB luminance: haze can move a dark roof toward brighter air, so a colour's brightness alone is not haze thickness. Own skyline sizing and styling remain unchanged.

### True sizes, including the final section of the brief

Non-own far blocks now use their complete physical base-angle projection, with no 0.5 px inflation or 7 px cap. Far towers no longer receive a 1.2 px shaft minimum. Their invented low podiums have been removed because there is no physical height evidence for them. The real projected town field can still supply surrounding mass. Beyond raster roofs now use the same **1 CSS px coverage floor** as glyphs and towers, replacing the former 0.8 px roof threshold; subpixel structures are culled. No structure is enlarged to that floor. Far block metre heights retain the existing raster storey/seed model; towers retain their source metre heights. Projection preserves those input heights.

The remaining `min(angularHeight, visibleOverCrest)` operations are physical terrain occlusion: only the portion hidden below intervening terrain is removed. They are not decorative size caps. Own skyline/trees retain their existing illustrated composition. Glyph specification minima define the glyph's internal coordinates; `glyphAtHeight` scales the final pixels back to the true height. The portrait-only fit rules remain restricted to owned marks. Width/LOD choices, rank score caps, light dots and terrain raster coverage do not impose a clamp on non-owned building height.

### Changed expectations

- C9's physically qualified recorded roofs change from 349/25/9 to **244/14/2** for Ramat Gan/Tel Aviv/Haifa under the shared 1 px angular-and-crest floor. Their lower and upper true-height checks remain. Rosh Pina has no surviving one-pixel roofs, so seating/containment fixtures now use Ramat Gan's recorded panorama rather than requiring nonexistent Rosh Pina supports.
- The shortlist transport fixture now uses a **22 m** legible synthetic hall. Its decoys use 60 m heights, with nine own 80 m reserve fixtures to occupy the top-eight pool and its extra portrait minaret reserve. This isolates transport/backfill without lowering the physical floor or relying on a city's unrelated curated-icon ranks. The 9 m subpixel hall and non-settlement 20 m gate still cull as before.
- Synthetic final-block containment fixtures include the required pixel of town on each side. Their text strip covers every viable position above the supporting mass, so an otherwise valid slide cannot bypass the intended blocked/backfill case.
- The isolated unseated silo fixture now expects culling when its town mass is absent. The real Karmei Tzur silo remains correctly sized and culled behind the foreground. The tall far-hall fixture retains its correct angular geometry in the world but is absent from the final scene because its own town cannot be proven by the coarse far field.
- C9 no longer demands an invented low hall under every far tower. It checks evidenced heights and the shared floor. New far-size regressions require unclipped heights above 7 px, reject subpixel blocks/towers and reject an invented second podium.
- All 18 recorded panoramas currently retain no neighbour glyph under the combined support, side-strip, home-gap and haze rule. The regular coverage set and stills document that result instead of enlarging glyphs or weakening the support condition.

### Verification

The final explicit affected-file run passed **356 tests in 22 files in 116.89 s**, with one worker and filesystem transform caching disabled. The regular **117-place test passed in 32.89 s** within that combined run, below its 60 s limit. It checks all 18 recorded panoramas, all 91 phase-1 synagogue-only problem places and eight seeded extra clusters, at 375 and 1280 px. It verified 27 seated glyphs and 648 raster towers, plus true sizes of every generated far structure. No unseated non-owned glyph has the required visible support in this sample. New independent assertions derive the home span, support pixels, gap, slide direction/limit, visible side strips and haze from final painted descriptors.

Ten temporary Vitest transforms disabled safeguards independently, with the filesystem transform cache disabled. Removing the gap check returned x 126 instead of 128. Removing the side width, extending the slide maximum, allowing a move toward home, bypassing visible mass or weakening home haze each admitted a fixture that must be culled. Ignoring the exact occlusion boundaries failed the nearest-position check (154 versus 153.03 px). Restoring the far-block clamp failed the requirement for a true height above 7 px. Removing the floor admitted subpixel blocks. Restoring the tower's 1.2 px minimum admitted an unsupported subpixel shaft. All ten produced the intended assertion failures, recorded in `round3-mutations.json`. Temporary mutation files were removed.

The exhaustive offline probe passed **1,781 places at both widths in 503.5 s** (508.41 s including startup). It verified 242 seated glyphs, no retained unseated non-owned glyphs, 7,366 raster towers and zero unmatched worship glyphs. A supplementary 47-place replay completed the all-kind neighbour export: 241 worship rows and one high-rise, exactly matching the exhaustive checked-neighbour count. The replay took 24.302 s; its combined run with the recorded-place inspection passed both probes in 52.49 s including startup. The candidate filter contains all 42 high-rise/home sources without a replacing tower in their own loaded source cell, within a conservative 6.1 km search around the audit places.

`npx tsc -b`, `npx oxlint` and `git diff --check` passed. Lint retains the same 12 existing warnings. Existing files over 150 lines did not grow; the new placement and assertion modules stay below 150 lines. All fetches use bundled fixtures, and no live service or deployment was used.

### Audit counts

Paired counts exclude the separate production point and use the original 1,780 places at both widths. The current full export includes that point's own synagogue twice, for 1,903 worship rows. Own worship rows across all places remain unchanged.

| Measure | Phase 1 | Round 1 | Round 2 | Round 3 |
| --- | ---: | ---: | ---: | ---: |
| All worship rows | 2,876 | 1,906 | 2,177 | 1,901 |
| Synagogue-only worship rows | 894 | 686 | 756 | 684 |
| Synagogue-only non-synagogue worship rows | 204 | 32 | 52 | 37 |
| A · Neighbouring named town | 70 | 66 | 134 | 64 |
| B · Own footprint | 618 | 618 | 618 | 618 |
| C · Beyond seat overlapping own x span | 24 | 0 | 0 | 0 |
| D · Remaining | 182 | 2 | 4 | 2 |

Round 2 → round 3 adds 23 worship rows by backfill and removes 299, a net reduction of 276. The 37 non-synagogue worship rows on synagogue-only places are minarets: 17 phone and 20 desktop. They satisfy the same visible-town and separation rules as every kind. The two D rows are `il-minaret-31.93823-35.16806` at both widths on an unnamed built cluster. The extra non-worship neighbour is an Or Yehuda high-rise seen from Nehalim at 1280 px, with a 268.871412 px home gap.

The complete **242-row neighbour list** in `AUDIT-table.md` and its TSV records every kept source, supporting town/square, viewport, gap and slide. The minimum gap is **6.000000 px**. Fifty rows slide, with maximum magnitude **11.574090 px**. Per-place worship lists retain all four stages, including places with zero glyphs and the separate production coordinate.

### Stills and open follow-ups

The existing stills CI job uses `e2e/scene.stills.mjs` with `src/dev/sceneHarness.tsx`. Both requested stills are saved and visually inspected under `stills/`, with rendered-geometry JSON and a README listing what they show. Karmei Tzur has no recorded panorama, and none of the 18 recorded panoramas retains a neighbour, so the tooling now accepts a generic, explicitly labelled flat-100 m fixture. The Karmei Tzur still retains its own synagogue and no neighbour. Eleazar retains a minaret with a 41.257034 px gap and two neighbouring synagogues with 17.801865 and 9.972311 px gaps; the latter slides 0.218845 px away from home. These use the bundled forecast and source data, not a production panorama or live service. The separate production regression still supplies the observed 17 m tower evidence.

Open follow-ups are a recorded production-coordinate panorama and source-to-town ownership evidence for any far glyphs that should return. The owner decision, implemented rule and attribution are also recorded in `TASKS.md`: Neon wrote the audit probe; Codex gpt-6.2-sol implemented rounds 1–3; Opus subagent supplied review.

### Commands

```powershell
npx vitest run src/data/terrain/apparentHeight.test.ts src/scene/model/neighbourPlacement.test.ts src/scene/model/neighbourClearance.test.ts src/world/farCities.test.ts src/scene/model/outsideFrame.test.ts src/scene/model/worshipVisibility.test.ts src/scene/model/markOcclusion.test.ts src/scene/model/outsideSeats.test.ts src/scene/model/c9.test.ts src/world/beyondSeat.test.ts src/world/portraitContest.test.ts src/world/seatBudget.test.ts src/world/markOwnership.test.ts src/scene/model/marks.test.ts src/scene/model/outside.test.ts src/scene/model/model.test.ts src/data/landmarks/landmarks.test.ts src/data/landmarks/placeHomes.test.ts src/data/landmarks/shortlist.test.ts src/data/terrain/plainVisibility.test.ts src/world/world.test.ts src/scene/model/settlementOwnership.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/scene/model/settlementOwnership.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/test/probe-worship/audit.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/test/probe-worship/round3-neighbours.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/test/probe-worship/round3-inspect.test.ts --maxWorkers=1 --no-fsModuleCache
npx tsc -b
npx oxlint
git diff --check
```

Stills commands, cached Playwright/installed Chrome setup and offline guarantees are recorded in `stills/README.md`. No whole source folder test command was run in round 3.

### Round-3 files

- `src/scene/model/neighbourPlacement.ts` defines the gap, side strip, slide bound and source-square placement rule.
- `src/scene/model/neighbourPlacement.test.ts` checks every glyph kind, fractional and narrow supports, the home-centre case and all rejection conditions.
- `src/scene/model/neighbourClearance.ts` derives exact centre-position boundaries from painted obstacles, text, viewport and ridge intersections.
- `src/scene/model/neighbourClearance.test.ts` independently checks fractional ridge and text boundaries.
- `src/scene/model/outsideMarks.ts` applies final placement before budgeting and shades every neighbour with its support tier.
- `src/scene/model/outside.ts` supplies final surviving home roofline and complete support-block geometry.
- `src/scene/model/markOcclusion.ts` exposes exact forbidden foot spans and rejects unsupported non-owned far glyphs.
- `src/scene/model/marks.ts` uses that far ownership eligibility rule.
- `src/scene/model/index.ts` removes now-inapplicable far-glyph mass acquisition.
- `src/world/markPerspective.ts` retains each non-owned source square's identity through placement.
- `src/data/landmarks/types.ts` carries the support-square identity in perspective and candidate metadata.
- `src/data/landmarks/placeMarks.ts` transports that identity into placed marks.
- `src/world/outsideDepth.ts` memoizes transported ridge geometry per immutable world/ridge.
- `src/world/beyondSeat.ts` applies the shared one-pixel height floor to roofs and crest visibility.
- `src/world/farCities.ts` removes aesthetic height clamps and invented podiums, retaining physical height evidence.
- `src/world/types.ts` carries far structures' physical height and optional terrain-visible portion.
- `src/world/farCities.test.ts` checks true heights above the former cap, subpixel culls and absence of invented podiums.
- `src/world/beyondSeat.test.ts` uses surviving recorded Ramat Gan supports and explicit shortlist-reserve fixtures.
- `src/scene/model/outsideSeats.test.ts` gives fixtures visible side mass and covers all viable text-blocked slide positions.
- `src/scene/model/outsideFrame.test.ts` verifies unsupported silo/far-hall culls while retaining angular geometry checks.
- `src/scene/model/c9.test.ts` checks physical roof counts and evidenced far structures.
- `src/scene/model/settlementOwnership.test.ts` retains all 117 places and adds every far structure's height assertion.
- `src/test/neighbourAssertions.ts` independently checks final home gaps, visible support, slide bounds/direction and haze.
- `src/test/worshipAssertions.ts` calls the neighbour assertions and checks the shared floor and far physical heights.
- `src/dev/sceneFixture.ts` adds a generic, explicit offline flat-terrain input for the development harness.
- `src/dev/sceneHarness.tsx` accepts that labelled fixture without changing the app's terrain path.
- `e2e/scene.stills.mjs` records labelled flat fixtures, safe filenames and optional rendered geometry descriptions.
- `src/test/probe-worship/auditCollect.ts` records gaps, bounded slides and support identity, with optional glyph-kind selection.
- `src/test/probe-worship/auditTypes.ts` carries the gap, slide and support fields in audit rows.
- `src/test/probe-worship/auditUtils.ts` matches final bounded slides back to their source identity.
- `src/test/probe-worship/audit.test.ts` permits the supported-only result to contain no unseated glyphs.
- `src/test/probe-worship/audit-round2.json` preserves the previous result for paired comparisons.
- `src/test/probe-worship/audit-after.json` stores the final round-3 worship rows and assertion coverage.
- `src/test/probe-worship/summary-after.txt` records the exhaustive counts and runtime.
- `src/test/probe-worship/round3-neighbours.test.ts` completes and reconciles the all-kind kept-neighbour list.
- `src/test/probe-worship/round3OtherSources.ts` enumerates non-worship replay candidates with the production same-cell tower-replacement predicate.
- `src/test/probe-worship/neighbours-after.json` stores every kept neighbour of every kind and its measured gap/slide.
- `src/test/probe-worship/round3-inspect.test.ts` locates an honest kept-neighbour still fixture and measures recorded roof counts.
- `src/test/probe-worship/round3-recorded.json` records that recorded-place inspection and the first qualifying flat fixture.
- `src/test/probe-worship/round3-mutations.json` records the ten expected safeguard assertion failures.
- `AUDIT-table.md` adds round-3 group counts, every kept neighbour's gap and four-stage place comparisons.
- `AUDIT-table.tsv` supplies the same comparisons and complete neighbour list as tab-separated data.
- `REPORT.md` records the owner decision, implementation, changed expectations, evidence and open follow-ups.
- `TASKS.md` records the requested audit-follow-up decision, rule, attribution and remaining work.
- `stills/README.md` labels the offline fixtures and explains the screenshots and reproduction commands.
- `stills/osm-way-462664109-1200-flat100m.png` shows the Karmei Tzur fixture with only its own synagogue.
- `stills/osm-way-462664109-1200-flat100m.json` records that still's actual home span and glyph description.
- `stills/il-31.6607-35.1415-1200-flat100m.png` shows the separated neighbours in the Eleazar fixture.
- `stills/il-31.6607-35.1415-1200-flat100m.json` records their actual gaps, sizes and slides.

All changes remain uncommitted.

## Round 4

Decision B implements the owner's “גם אם זה מתרחק מעט מהאמת”: every retained non-own glyph uses
`max(trueHeight, LEGIBLE_PX=4)` CSS px, with `factor ≤ MAX_EXAGGERATION=2` and the same width scaling.
A source below 2 px is culled. The glyph specs use 17 units for a minaret and 9.5 for a synagogue: at DPR 2,
4 CSS px supply eight physical raster rows for the minaret/cone versus hall/dome silhouettes. One pixel loses
that distinction. `world/neighbourSize.ts` is the shared helper for all 22 kinds, without place exceptions.
Owned portraits keep their composed size and factor 1. Every scene glyph carries a factor; neighbours also
record physical visible height, true receiver distance, haze distance, town membership and support identity.

### General visibility and the two guards

Every kept non-own mark in either layer needs a visible foot and a drawn-box gap of ≥6 CSS px from the complete
final home roofline span (surviving boxes and towers). The exact closest valid position is at most 12 CSS px
from its original bearing, away from home. Text, viewport, ridges, foreground masses and selected nearer glyphs
constrain that position. Enlargement happens before all gap, support and occlusion checks.

Worship/homes always need their own town. Other kinds need town support when their source lies inside mapped
built fabric (the local raster's ≥20% built threshold). Known empty cells are distinct from unavailable cells.
Without local coverage, use the far raster's built footprint. Thus a castle inside town needs support too;
a castle, antenna, water tower or lighthouse outside town fabric needs no invented town.

Near support is the exact source square's surviving beyond block, with its actual foot and 1 CSS px of painted
mass on both sides of the enlarged glyph. Unseated sources can use it too; their base is anchored to its foot.
Far support is final painted far-city ground carrying the source connected footprint ID, never an arbitrary
nearby block. Eight-neighbour components retain that identity through patch projection, material smoothing and
final scene/text/air culls. At most one half-pixel material row aligns ground contact. Only the supporting mass
ID is excluded from foot occluders; different foreground masses remain occluders regardless of support depth.
Outside foreground covers far glyphs by painter order, not by comparing incompatible distance frames.
A full world/scene test retains a visible standalone far castle at both widths.

Haze uses the far-town bin of the landmark's true receiving-layer distance: `2 × 1.22^tier × 1.1`, tier clamped
0…18. It never uses `km/factor` or distance inferred from enlarged height. Outside distances use the outside
eye/depth frame; far distances use the panorama eye. Seated marks now carry their own source distance instead
of their supporting square centre's. Haze cannot be lighter than any painted home roof. This replaces round 3's
requirement to copy the support's half-kilometre bin.

### Per-layer outcomes and famous far landmarks

| Set | Layer | Before round 1: all / non-own | After round 3: all / non-own | After round 4: all / non-own |
| --- | --- | --- | --- | --- |
| 18 recorded | outside | 88 / 14 | 74 / 0 | 74 / 0 |
| 18 recorded | marks.far | 2 / 2 | 0 / 0 | 0 / 0 |
| 117 total | outside | 640 / 324 | 343 / 27 | 355 / 39 |
| 117 total | marks.far | 234 / 234 | 0 / 0 | 0 / 0 |

These sum both widths. The 18 recorded places retain no non-own glyph under the combined physical visibility,
Decision B and grouping rules. The 117-place set retains 39 non-own near glyph rows (R3: 27), all unseated
standalone sources. Restoring eligibility does not force a landmark through a hidden foot or 2× cap. No far
mark survives these real fixtures. Positive full-path far rendering and own-far-town support tests distinguish
an eligible far renderer from the previous blanket cull.

The replay uses base HEAD production source, the R3 snapshot and final R4 source with identical cases/data.
Before R1 retained 234 far rows in the 117-place set, of which 222 were named/famous. This table lists all
38 distinct named/famous sources. `exaggeration-cap` means visible angular height <2 px
(including zero terrain-visible height); `terrain-hides-foot` means its top projects but its ground foot is
hidden. Reasons can differ by place view. These are upstream source/terrain culls before the final receiver,
not claims that a hidden foot was supported. `round4-far-landmarks.json` records each view, width and projection.

| Famous/name | ID | Before R1 far rows | R3 | R4 | R4 reason per view/width |
| --- | --- | --- | --- | --- | --- |
| מבצר יחיעם | `il-castle-32.99434-35.22198` | 2 | 0 | 0 | 2 exaggeration-cap |
| מבצר נמרוד | `il-castle-33.25267-35.71505` | 2 | 0 | 0 | 2 exaggeration-cap |
| כנסיית בן האלמנה | `il-church-32.63064-35.35011` | 4 | 0 | 0 | 4 exaggeration-cap |
| כנסיית ההשתנות הקתולית | `il-church-32.68626-35.39242` | 10 | 0 | 0 | 10 exaggeration-cap |
| כנסיית החתונה | `il-church-32.74695-35.33865` | 6 | 0 | 0 | 6 exaggeration-cap |
| פטרוס הקדוש | `il-church-32.8805-35.57538` | 6 | 0 | 0 | 6 exaggeration-cap |
| כנסיית הר האושר | `il-church-32.88077-35.55592` | 2 | 0 | 0 | 2 exaggeration-cap |
| Church of our Lady of Baram | `il-church-33.04347-35.41413` | 20 | 0 | 0 | 20 exaggeration-cap |
| לבניה | `il-cooling-32.79335-35.05157` | 2 | 0 | 0 | 2 exaggeration-cap |
| מגדל מרום | `il-highrise-31.78832-35.20193` | 6 | 0 | 0 | 6 terrain-hides-foot |
| מגדל לייטהאוס | `il-highrise-32.00567-34.74166` | 2 | 0 | 0 | 2 terrain-hides-foot |
| מגדל אפטאון מגורים | `il-highrise-32.01332-34.75222` | 2 | 0 | 0 | 2 terrain-hides-foot |
| מגדל ביונד משרדים | `il-highrise-32.08019-34.79879` | 2 | 0 | 0 | 2 terrain-hides-foot |
| מגדל נמרודי | `il-highrise-32.0934-34.82545` | 2 | 0 | 0 | 2 terrain-hides-foot |
| עתידים מגדל ויז'ן בניין 8 | `il-highrise-32.11569-34.84299` | 6 | 0 | 0 | 2 exaggeration-cap; 4 terrain-hides-foot |
| מגדלי בריגה | `il-highrise-32.27686-34.83816` | 8 | 0 | 0 | 2 exaggeration-cap; 6 terrain-hides-foot |
| מגדל לגון דרומי | `il-highrise-32.30429-34.84542` | 12 | 0 | 0 | 12 terrain-hides-foot |
| מגדלי אופרת הים | `il-highrise-32.34024-34.85385` | 2 | 0 | 0 | 2 terrain-hides-foot |
| מגדל אשכול | `il-highrise-32.76283-35.01768` | 4 | 0 | 0 | 4 terrain-hides-foot |
| Ibn Othman Mosque | `il-minaret-31.4998-34.46938` | 2 | 0 | 0 | 2 exaggeration-cap |
| مسجد علي البكاء | `il-minaret-31.5283-35.10379` | 6 | 0 | 0 | 6 exaggeration-cap |
| مسجد الخالدي | `il-minaret-31.54784-34.45576` | 2 | 0 | 0 | 2 exaggeration-cap |
| مسجد عمر | `il-minaret-31.70454-35.2054` | 8 | 0 | 0 | 8 exaggeration-cap |
| מסגד עומר | `il-minaret-31.77787-35.22965` | 2 | 0 | 0 | 2 exaggeration-cap |
| Jamal Abdel Nasser Mosque | `il-minaret-31.90408-35.20741` | 14 | 0 | 0 | 14 exaggeration-cap |
| נבי רובין | `il-minaret-31.92913-34.73364` | 2 | 0 | 0 | 2 exaggeration-cap |
| מסגד אל-עומרי | `il-minaret-31.95297-34.89942` | 8 | 0 | 0 | 8 exaggeration-cap |
| מסגד סידנא עלי | `il-minaret-32.18783-34.80582` | 12 | 0 | 0 | 12 exaggeration-cap |
| Mosque | `il-minaret-32.20448-35.13156` | 4 | 0 | 0 | 4 exaggeration-cap |
| المسجد الأبيض | `il-minaret-32.70347-35.29766` | 8 | 0 | 0 | 8 exaggeration-cap |
| זה השער לה | `il-synagogue-31.89576-34.8168` | 2 | 0 | 0 | 2 exaggeration-cap |
| ישיבת בית אל | `il-synagogue-31.94255-35.22212` | 6 | 0 | 0 | 6 exaggeration-cap |
| בית הכנסת היכל הקודש דחסידי ברסלב | `il-synagogue-32.70302-35.50359` | 4 | 0 | 0 | 4 exaggeration-cap |
| קבר רבי שמעון בר יוחאי | `il-synagogue-32.98079-35.44056` | 2 | 0 | 0 | 2 exaggeration-cap |
| ישיבת מעלות יעקב | `il-synagogue-33.01319-35.28716` | 2 | 0 | 0 | 2 exaggeration-cap |
| מגדל המים בבארי | `il-waterTower-31.43082-34.46595` | 2 | 0 | 0 | 2 exaggeration-cap |
| גשר המיתרים | `jerusalem-bridge` | 20 | 0 | 0 | 12 exaggeration-cap; 8 terrain-hides-foot |
| מרכז עזריאלי | `tel-aviv-azrieli` | 16 | 0 | 0 | 2 exaggeration-cap; 14 terrain-hides-foot |

### Exhaustive audit and still evidence

The completed offline probe covers 1,781 places at both widths: 18 recorded,
1,763 flat 100 m; runtime 371.16 s. It checks 18 seated,
620 unseated neighbours of every kind, plus 7,366 raster towers.
All 1,662 own worship rows retain the same R3 IDs and painted height/x bounds (zero changes).
AUDIT-table.md's After section gives kept/cull totals and factor histogram; its R3 detail is explicitly
historical. Final-receiver culls and upstream projection culls use separate, stated denominators.

Both before-stills were preserved with `-r3`; after-stills and 4× crops were saved and visually inspected.
They are 375 CSS px at DPR 2 using generic `--flat`, labelled offline flat 100 m. Eleazar's old three neighbours
are 1.239746, 1.396326 and 1.466699 px and would need 3.226467, 2.864661 and 2.727213×. They are culled rather
than presented as newly legible. Karmei Tzur likewise keeps its own synagogue; the observed-17 m regression
has a 1.48 px tower. `stills/README.md` gives each emitted glyph's kind, true/composed height, drawn height,
factor, gap, slide and haze, and the culled Eleazar candidates. The crops magnify existing DPR pixels 4×.

N=6 is measured in the drawn scene's CSS px. Median own house widths: Karmei Tzur 5.839259 px at 375 and
19.931339 at 1280; Eleazar 5.336473 and 18.215162. Thus the gap is about 1.03/1.12 median houses on phone and
.30/.33 at 1280. It is not “two houses” at every width: houses stretch horizontally, glyph silhouettes do not.
A floor-height minaret is 3.294118 px wide and synagogue 4.631579 px; the 6 px empty gap is 1.82/1.30 glyph
widths at either viewport, separating perceptual groups. `round4-still-evidence.json` records the box widths.

### Re-review repairs and changed expectations

The seat crest clip is restored: height is the lesser of base-angle projection and visible height over terrain.
Independent assertions calculate both. The new 60 m synthetic source has a known 1 px exposed crest and must
clip to it. Seated supports precede the near-line blend; ordinary angular marks use the final drawn ridge.
Assertions use the appropriate actual ridge for each. The old 22 m fixture now expects the crest minimum too.

The measured 17 m source is below Decision B's threshold; its production-point test still checks that cull.
Separate positive/negative occlusion fixtures use a synthetic 2.5 px source and 8 px support, so removing
occlusion changes the result. A 20 px foreground roof section makes the negative work at 1280 without being
culled by the height label. Haze expects the far-town true-distance bin rather than the support's old tier.
New policy tests isolate corrected base, own-ID exclusion, standalone near/far eligibility, mapped-town
membership, other foreground, far-city ownership, enlarged gap and enlarged side margins.

Removed `footHidden`, `seatsOnScreen`, `TownBlockSpan`, dead `sightKm` ternary and `BEYOND_MIN_PX` alias.
`farMasses`, far-layer foot spans and their independent assertion remain because restored far placement uses
them in production. Removed the obsolete selective R3 highrise/home replay helpers; the full audit now exports
every kind directly. Their R3 JSON evidence is preserved.

`markPerspective` and still viewport/geometry tooling use `SCENE_W`. Missing still sources throw before any
dereference. `squareKey` is shared and `sceneFixture` reuses `FLAT_ELEV_M`. The .8 px beyond-block and 1.2 px
raster-tower width floors are documented coverage floors (1.6/2.4 physical px at DPR 2), not height boosts or
Decision B exceptions. Those actual widths must still contain an enlarged glyph.

Line packing is undone through small fitting, home/appearance/portrait selection, descriptor, city-field and
sky-form modules. Maximum line lengths: sceneHarness 150 (base 158, R3 182); world/marks 142 (160, 202);
placeMarks 140 (140, 162); outsideMarks 133 (140, 183). The latter three files are below 150 lines; the inherited
harness shrank from 286 to 285. The production inventory is generated from actual R3-source differences.
Earlier round file lists describe historical states, including their subsequently replaced/deleted files.

### Verification

The final explicit 29-file test batch passes 405 tests; its exact command is saved in
`round4-targeted-command.txt`. The initial batch exposed a new crest fixture error: its 22 m source subtended
.986764 px, so changing it to 60 m made the 1 px crest decisive. The corrected crest and full-path far tests
passed, as did the affected seating/ownership/budget files and appearance/home/portrait extraction checks.
The full 117-place test passes ten groups in 41.63 s including startup, maximum group 5.24 s. A 90 s group
timeout provides over 17× measured headroom, above the requested 3×. Each place still builds one world for both
widths. This replaces the unreliable single 60 s timeout and old 32.89 s claim.

The full offline audit and comparison probes pass. `npx tsc -b`, `npx oxlint` and `git diff --check` pass;
oxlint retains 12 existing warnings in unrelated prototypes, geometry and useLand. No whole-folder suite,
commit, push, deploy, live service, package download or `src/test/probe/` modification was made.

Mutations use a Vitest pre-transform with filesystem module caching disabled, leaving production files
unchanged. All nine mutations cause assertion failures; exact tests are saved in `round4-mutations.json`.
Positive near/far controls prevent a blanket cull from satisfying the renderer checks.

| Changed safeguard | Explicit test file | Expected failing tests | Assertion failure |
| --- | --- | --- | --- |
| floor | src/world/neighbourSize.test.ts | 22 | True |
| cap | src/world/neighbourSize.test.ts | 22 | True |
| trueDistanceHaze | src/scene/model/neighbourPolicy.test.ts | 1 | True |
| gap | src/scene/model/neighbourPolicy.test.ts | 1 | True |
| townSides | src/scene/model/neighbourPolicy.test.ts | 1 | True |
| supportIdentity | src/scene/model/neighbourPolicy.test.ts | 2 | True |
| crest | src/world/beyondSeat.test.ts | 1 | True |
| homeHaze | src/scene/model/neighbourPolicy.test.ts | 1 | True |
| descriptorFactor | src/scene/model/worshipVisibility.test.ts | 1 | True |

```powershell
# The 29 explicit target files are in src/test/probe-worship/round4-targeted-command.txt
npx vitest run src/scene/model/settlementOwnership.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/test/probe-worship/audit.test.ts --maxWorkers=1 --no-fsModuleCache
$env:WORSHIP_STAGE = 'before1' # then round3 for the second historical replay
npx vitest run src/test/probe-worship/round4-layers.test.ts --config src/test/probe-worship/stage.config.ts --no-fsModuleCache --maxWorkers=1
$env:WORSHIP_STAGE = 'round4'
npx vitest run src/test/probe-worship/round4-layers.test.ts src/test/probe-worship/round4-evidence.test.ts src/test/probe-worship/round4-farReasons.test.ts --maxWorkers=1
node src/test/probe-worship/runRound4Mutations.mjs
npx tsc -b
npx oxlint
git diff --check
```

### Round-4 files

[ROUND4-files.md](ROUND4-files.md) lists actual production, test, probe, evidence and documentation changes,
including the two removed R3 helpers. Open follow-up: obtain a recorded production Karmei Tzur panorama through
the fixture workflow; current screenshots remain explicitly flat 100 m.

## Round 5

Completed the seven review fixes. `LEGIBLE_PX` and `MAX_EXAGGERATION` remain single exported constants,
unchanged pending the product decision. `NEIGHBOUR_MIN_TRUE_PX` is their exported quotient; no production
pre-selection code repeats its value. The existing glyph floor/cap, gap, town support and true-distance haze
rules remain in force.

### Selection and final glyph occlusion

`placeMarks` filters perspective candidates before `fewLandmarks` or `select`; `beyondMarks` filters before
its seat budget; `seatMark` rejects a clipped projected height below the same derived threshold. The final
angular fitting pass uses it too. Raw terrain/roof existence floors remain distinct physical-data rules.
Regression tests place five high-priority sub-floor sources ahead of a viable castle, and two doomed
minarets ahead of a viable minaret. Removing either respective filter makes its test fail. A separate known
crest fixture proves the source-seat threshold itself, independently of the later pool filter.

Both near and far receivers now call `nearestMarks`: evaluate nearest first, then add each kept glyph's
mass at its final slid x before evaluating farther feet. Near candidates combine seated and unseated marks.
Seat budgeting preserves the world-width and per-kind caps; a rejected selected seat releases its slot and
refills from the viable pool. Each retry starts with the original foreground, so an unselected or rejected
seat cannot leave an occluder behind. Owned marks retain their existing eligibility and join foreground mass.

The new same-position regression leaves one valid home-gap position between home and a foreground wall.
Each farther source can occupy that position alone, but is culled behind the retained nearer glyph. It
passes with both unseated, with the nearer mark seated, and with the farther mark seated. Removing the
shared mass insertion fails these assertions; the test cannot pass merely by culling all marks.

### Independent assertions and DRY repairs

`assertNeighbour` derives mandatory town membership from worship/homes glyph kinds, independently of the
renderer's `town` flag. It requires `town === true` for those kinds and a nonempty support ID for every town
mark. Positive supported, false-town and missing-ID tests prove these checks. The complete audit calls the
same independent geometry assertions for every final neighbour, including worship outside the fast set.

Only `evaluateNeighbour` performs the home-haze guard; `placeNeighbour` now handles geometry alone. The
haze mutation therefore admits a lighter glyph and fails the positive rejection test, rather than hitting
a duplicate guard. Evaluator evidence reuses the factor returned by the shared size helper; rejected size
candidates have no drawn factor. `visibleMarkHeight` is the sole clipped base-angle formula used by both
world perspective sites and `neighbourDisplay`. Test expectations import the product constants too.

The far-mass assertion explicitly documents its independent reimplementation. Production omits material
boxes without a source distance; the assertion uses `b.km ?? tier.km` to check the painted tier conservatively,
rather than silently exempting incomplete evidence. It deliberately does not call production `farMasses`.

### Size limits and formatting

`NeighbourEvidence` holds the neighbour descriptor fields. Far tier typing also moves into the existing
small city-mass module: `scene/model/types.ts` is 605 lines versus HEAD 608. `world/outside.ts` stays at HEAD's
870 lines, with the coverage explanation integrated into its existing comment. `beyondSeat.test.ts` is
118 lines, maximum 127 characters (limits 150 / HEAD 130); carry and crest cases have separate test files.
`beyondMarks.ts` maximum is 130 (limit 133); `e2e/scene.stills.mjs` is 127 (limit 131). All new TS/TSX/MJS
files against HEAD, including the offline helpers, have no line over 120. Existing user `src/test/probe/`
files are untouched. Long offline log templates were split without changing their resulting strings.

The old recorded 22 m seating fixtures do not clear the derived threshold. They now use 60 m positive
sources, with taller unseatable/own decoys keeping the shortlist test decisive. The short-hall test expects
a null seat. The crest test uses the derived minimum rather than a hard-coded one-pixel viable mark. The
far-town negative fixture now clears the size floor before testing missing ownership support.

### Per-layer kept counts: before → after this round

Every glyph at each of 375 and 1280 contributes one row; each world is built once. Non-own membership uses
source coordinates and the same own-footprint predicate in both exports. Sources, the fixed 117 places,
18 recorded panoramas and explicitly flat 100 m fallbacks are unchanged.

| Set | Layer | Before R5: all / non-own | After R5: all / non-own |
| --- | --- | --- | --- |
| 18 recorded | outside | 74 / 0 | 74 / 0 |
| 18 recorded | marks.far | 0 / 0 | 0 / 0 |
| 117 total | outside | 355 / 39 | 353 / 37 |
| 117 total | marks.far | 0 / 0 | 0 / 0 |

The fast set has five removed and three added neighbour rows, a net 39 → 37; they are all near-layer rows.
These are real eligibility/occlusion changes, not changed sample membership or weakened assertions:

| Change | Place | Width | Source |
| --- | --- | --- | --- |
| Removed | il-31.7078-35.1114 | 375 | il-waterTower-31.68297-35.14509 |
| Removed | il-31.7078-35.1114 | 1280 | il-waterTower-31.68297-35.14509 |
| Removed | il-32.2357-35.3316 | 375 | il-chimney-32.21048-35.29857 |
| Removed | il-32.2357-35.3316 | 1280 | il-chimney-32.21048-35.29857 |
| Removed | il-32.3345-35.0123 | 375 | il-chimney-32.34882-35.06231 |
| Added | il-32.1924-35.2651 | 375 | il-chimney-32.20478-35.22852 |
| Added | il-32.1924-35.2651 | 1280 | il-chimney-32.20478-35.22852 |
| Added | il-32.7188-35.5474 | 1280 | il-waterTower-32.70472-35.5941 |

### Famous far landmarks: before → after this round

No named far glyph is retained before or after R5 in this fixed set. To make the unchanged zero inspectable,
the table includes every famous/named far source from the historical comparison, with its measured upstream
reason before and after R5. `exaggeration-cap` means visible angular height below the derived minimum;
`terrain-hides-foot` means a projecting top whose physical foot is hidden. Counts are place/width observations,
not numbers of unique landmarks. The full-path visible-far positive control still passes.

| Name | Source ID | Far kept R4 → R5 | Before reason / view rows | After reason / view rows |
| --- | --- | --- | --- | --- |
| מבצר יחיעם | `il-castle-32.99434-35.22198` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| מבצר נמרוד | `il-castle-33.25267-35.71505` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| כנסיית בן האלמנה | `il-church-32.63064-35.35011` | 0 → 0 | exaggeration-cap ×4 | exaggeration-cap ×4 |
| כנסיית ההשתנות הקתולית | `il-church-32.68626-35.39242` | 0 → 0 | exaggeration-cap ×10 | exaggeration-cap ×10 |
| כנסיית החתונה | `il-church-32.74695-35.33865` | 0 → 0 | exaggeration-cap ×6 | exaggeration-cap ×6 |
| פטרוס הקדוש | `il-church-32.8805-35.57538` | 0 → 0 | exaggeration-cap ×6 | exaggeration-cap ×6 |
| כנסיית הר האושר | `il-church-32.88077-35.55592` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| Church of our Lady of Baram | `il-church-33.04347-35.41413` | 0 → 0 | exaggeration-cap ×20 | exaggeration-cap ×20 |
| לבניה | `il-cooling-32.79335-35.05157` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| מגדל מרום | `il-highrise-31.78832-35.20193` | 0 → 0 | terrain-hides-foot ×6 | terrain-hides-foot ×6 |
| מגדל לייטהאוס | `il-highrise-32.00567-34.74166` | 0 → 0 | terrain-hides-foot ×2 | terrain-hides-foot ×2 |
| מגדל אפטאון מגורים | `il-highrise-32.01332-34.75222` | 0 → 0 | terrain-hides-foot ×2 | terrain-hides-foot ×2 |
| מגדל ביונד משרדים | `il-highrise-32.08019-34.79879` | 0 → 0 | terrain-hides-foot ×2 | terrain-hides-foot ×2 |
| מגדל נמרודי | `il-highrise-32.0934-34.82545` | 0 → 0 | terrain-hides-foot ×2 | terrain-hides-foot ×2 |
| עתידים מגדל ויז'ן בניין 8 | `il-highrise-32.11569-34.84299` | 0 → 0 | exaggeration-cap ×2; terrain-hides-foot ×4 | exaggeration-cap ×2; terrain-hides-foot ×4 |
| מגדלי בריגה | `il-highrise-32.27686-34.83816` | 0 → 0 | exaggeration-cap ×2; terrain-hides-foot ×6 | exaggeration-cap ×2; terrain-hides-foot ×6 |
| מגדל לגון דרומי | `il-highrise-32.30429-34.84542` | 0 → 0 | terrain-hides-foot ×12 | terrain-hides-foot ×12 |
| מגדלי אופרת הים | `il-highrise-32.34024-34.85385` | 0 → 0 | terrain-hides-foot ×2 | terrain-hides-foot ×2 |
| מגדל אשכול | `il-highrise-32.76283-35.01768` | 0 → 0 | terrain-hides-foot ×4 | terrain-hides-foot ×4 |
| Ibn Othman Mosque | `il-minaret-31.4998-34.46938` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| مسجد علي البكاء | `il-minaret-31.5283-35.10379` | 0 → 0 | exaggeration-cap ×6 | exaggeration-cap ×6 |
| مسجد الخالدي | `il-minaret-31.54784-34.45576` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| مسجد عمر | `il-minaret-31.70454-35.2054` | 0 → 0 | exaggeration-cap ×8 | exaggeration-cap ×8 |
| מסגד עומר | `il-minaret-31.77787-35.22965` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| Jamal Abdel Nasser Mosque | `il-minaret-31.90408-35.20741` | 0 → 0 | exaggeration-cap ×14 | exaggeration-cap ×14 |
| נבי רובין | `il-minaret-31.92913-34.73364` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| מסגד אל-עומרי | `il-minaret-31.95297-34.89942` | 0 → 0 | exaggeration-cap ×8 | exaggeration-cap ×8 |
| מסגד סידנא עלי | `il-minaret-32.18783-34.80582` | 0 → 0 | exaggeration-cap ×12 | exaggeration-cap ×12 |
| Mosque | `il-minaret-32.20448-35.13156` | 0 → 0 | exaggeration-cap ×4 | exaggeration-cap ×4 |
| المسجد الأبيض | `il-minaret-32.70347-35.29766` | 0 → 0 | exaggeration-cap ×8 | exaggeration-cap ×8 |
| זה השער לה | `il-synagogue-31.89576-34.8168` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| ישיבת בית אל | `il-synagogue-31.94255-35.22212` | 0 → 0 | exaggeration-cap ×6 | exaggeration-cap ×6 |
| בית הכנסת היכל הקודש דחסידי ברסלב | `il-synagogue-32.70302-35.50359` | 0 → 0 | exaggeration-cap ×4 | exaggeration-cap ×4 |
| קבר רבי שמעון בר יוחאי | `il-synagogue-32.98079-35.44056` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| ישיבת מעלות יעקב | `il-synagogue-33.01319-35.28716` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| מגדל המים בבארי | `il-waterTower-31.43082-34.46595` | 0 → 0 | exaggeration-cap ×2 | exaggeration-cap ×2 |
| גשר המיתרים | `jerusalem-bridge` | 0 → 0 | exaggeration-cap ×12; terrain-hides-foot ×8 | exaggeration-cap ×12; terrain-hides-foot ×8 |
| מרכז עזריאלי | `tel-aviv-azrieli` | 0 → 0 | exaggeration-cap ×2; terrain-hides-foot ×14 | exaggeration-cap ×2; terrain-hides-foot ×14 |

### Exhaustive audit and verification

The background audit passed across 1,781 places at both widths: 18
recorded and 1,763 flat 100 m fixtures. Probe runtime 421.50 s;
18 seated and 676 unseated neighbour rows, and
7,366 raster towers, independently checked. Own worship rows: 1662 → 1662; ID additions/removals 0/0; changed height/x geometry among common IDs: 0.
`audit-round4.json` and `neighbours-round4.json` freeze the prior results; `audit-after.json` and
`neighbours-after.json` now contain R5. The current After section and TSV are updated accordingly.

All 412 tests in 34 explicit target files pass (97.24 s). The separate ten-group 117-place check passes in
46.32 s including startup, maximum group 5.38 s, with the 90 s timeout retaining over 16× measured headroom.
The fixed-set and far-reason probes pass. All 13 safeguard mutations cause assertion failures:

| Mutation | Test file | Expected failing tests |
| --- | --- | --- |
| selectionFloor | src/world/neighbourPreselection.test.ts | 1 |
| seatPoolFloor | src/world/neighbourPreselection.test.ts | 1 |
| seatSourceFloor | src/world/beyondCrest.test.ts | 1 |
| nearerGlyph | src/scene/model/nearOcclusion.test.ts | 3 |
| floor | src/world/neighbourSize.test.ts | 22 |
| cap | src/world/neighbourSize.test.ts | 22 |
| trueDistanceHaze | src/scene/model/neighbourPolicy.test.ts | 1 |
| gap | src/scene/model/neighbourPolicy.test.ts | 1 |
| townSides | src/scene/model/neighbourPolicy.test.ts | 1 |
| supportIdentity | src/scene/model/neighbourPolicy.test.ts | 2 |
| crest | src/world/beyondCrest.test.ts | 2 |
| homeHaze | src/scene/model/neighbourPolicy.test.ts | 1 |
| descriptorFactor | src/scene/model/worshipVisibility.test.ts | 1 |

`npx tsc -b`, `npx oxlint` and `git diff --check` pass. Oxlint reports the same existing 12 unrelated warnings.
No whole-folder suite, live service, package download, commit, push or deployment was performed. Stills from
R3/R4 remain preserved; this brief requests an audit/comparison refresh rather than new stills.

```powershell
# Exact explicit-file command: src/test/probe-worship/round5-targeted-command.txt
npx vitest run src/scene/model/settlementOwnership.test.ts --maxWorkers=1 --no-fsModuleCache
npx vitest run src/test/probe-worship/audit.test.ts --maxWorkers=1 --no-fsModuleCache
$env:WORSHIP_STAGE = 'round5'
npx vitest run src/test/probe-worship/round4-layers.test.ts src/test/probe-worship/round4-farReasons.test.ts `
  --maxWorkers=1
node src/test/probe-worship/runRound4Mutations.mjs
npx tsc -b
npx oxlint
git diff --check
```

### Full file list against HEAD — all rounds

This is the complete current tracked diff plus untracked files, one line per file with its purpose.
Earlier round inventories are historical. User-supplied briefs and pre-existing user probes are labelled;
listing them does not claim they were edited. Removed intermediate files absent from HEAD and the worktree
are not invented diff entries.

- `TASKS.md` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/AUDIT-table.md` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/AUDIT-table.tsv` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/BRIEF-audit.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/BRIEF-fix.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/BRIEF-round2.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/BRIEF-round3.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/BRIEF-round4.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/BRIEF-round5.md` — User-supplied task brief, retained unchanged.
- `docs/design/qa/polish/worship-ownership/REPORT.md` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/ROUND4-files.md` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/stills/README.md` — Document decisions, implementation, full inventory, audit comparisons or still reproduction.
- `docs/design/qa/polish/worship-ownership/stills/il-31.6607-35.1415-1200-flat100m-crop4x.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `docs/design/qa/polish/worship-ownership/stills/il-31.6607-35.1415-1200-flat100m-r3.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `docs/design/qa/polish/worship-ownership/stills/il-31.6607-35.1415-1200-flat100m-r3.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `docs/design/qa/polish/worship-ownership/stills/il-31.6607-35.1415-1200-flat100m.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `docs/design/qa/polish/worship-ownership/stills/il-31.6607-35.1415-1200-flat100m.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `docs/design/qa/polish/worship-ownership/stills/osm-way-462664109-1200-flat100m-crop4x.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `docs/design/qa/polish/worship-ownership/stills/osm-way-462664109-1200-flat100m-r3.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `docs/design/qa/polish/worship-ownership/stills/osm-way-462664109-1200-flat100m-r3.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `docs/design/qa/polish/worship-ownership/stills/osm-way-462664109-1200-flat100m.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `docs/design/qa/polish/worship-ownership/stills/osm-way-462664109-1200-flat100m.png` — Preserved before/after screenshot or magnified neighbour-region evidence.
- `e2e/harness.mjs` — Offline stills, shared scene width, guarded geometry descriptions and review crops.
- `e2e/scene.stills.mjs` — Offline stills, shared scene width, guarded geometry descriptions and review crops.
- `src/data/city/cityRaster.ts` — Preserve raster coverage and town ownership through projected city geometry.
- `src/data/city/grid.ts` — Preserve raster coverage and town ownership through projected city geometry.
- `src/data/city/plainData.ts` — Preserve raster coverage and town ownership through projected city geometry.
- `src/data/city/townFootprints.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/data/city/townFootprints.ts` — Preserve raster coverage and town ownership through projected city geometry.
- `src/data/landmarks/homeMarks.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/markAppearance.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/markProjection.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/perspectiveFields.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/placeMarks.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/portraitSelection.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/rank.ts` — Preserve ownership/perspective evidence and filter viable candidates before landmark selection.
- `src/data/landmarks/types.ts` — Carry source, projection and scene evidence through small typed modules.
- `src/data/terrain/apparentHeight.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/data/terrain/apparentHeight.ts` — Shared physical angular-height projection and explicit existence threshold.
- `src/dev/glyphSheet.tsx` — Support explicit offline fixtures and complete typed glyph descriptions in development tooling.
- `src/dev/sceneFixture.ts` — Support explicit offline fixtures and complete typed glyph descriptions in development tooling.
- `src/dev/sceneHarness.tsx` — Support explicit offline fixtures and complete typed glyph descriptions in development tooling.
- `src/scene/model/c9.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/cityMass.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/evaluateNeighbour.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/farCities.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/farNeighbourMarks.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/farTownHaze.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/farTownSupport.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/index.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/landBehind.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/markDescriptor.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/markOcclusion.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/markOcclusion.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/marks.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/nearOcclusion.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/nearestMarks.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/neighbourClearance.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/neighbourClearance.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/neighbourDisplay.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/neighbourEvidence.ts` — Carry source, projection and scene evidence through small typed modules.
- `src/scene/model/neighbourPlacement.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/neighbourPlacement.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/neighbourPolicy.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/outside.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/outside.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/outsideFrame.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/outsideMarks.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/outsideSeats.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/ownSkyForm.ts` — Apply final drawn-box support, gap, haze and nearest-first visibility to scene glyphs.
- `src/scene/model/settlementOwnership.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/model/types.ts` — Carry source, projection and scene evidence through small typed modules.
- `src/scene/model/worshipVisibility.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/scene/paint/glyphs/glyphs.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/test/bundledCityClusters.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/bundledFetch.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/bundledTerrain.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/bundledWorld.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/drawnGeometryAssertions.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/fixtures/worship-ownership-phase1.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/neighbourAssertions.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/test/neighbourAssertions.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/probe-worship/analysis.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/analyze.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/audit-after.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit-raw.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit-round1.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit-round2.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit-round3.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit-round4.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/audit.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditCollect.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditFetch.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditLoad.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditOutput.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditPlaces.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditTypes.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/auditUtils.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/before-round1-sources.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/check-beyond-sizes.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/check-beyond-sizes.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/inspect-bc.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/inspect-bc.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/inspect-data.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/mutation.config.mjs` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/neighbourDecisions.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/neighbours-after.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/neighbours-round3.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/neighbours-round4.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round3-inspect.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round3-mutations.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round3-recorded.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round3-sources.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-audit-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-before1-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-evidence.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round4-far-landmarks.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-far-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-farReasons.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round4-fast-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-layers-before1.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-layers-round3.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-layers-round4.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-layers-round5.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-layers.test.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round4-line-baseline.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-lint.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-mutation-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-mutations.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-round3-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-round4-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-still-evidence.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round4-targeted-command.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4-targeted-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round4Docs.py` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round4Mutations.mjs` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/round5-audit-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-core-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-far-landmarks.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round5-fast-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-file-list.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round5-layers-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-layers.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round5-lint.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-mutation-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-mutations.json` — Bundled fixture, audit evidence, geometry export or historical source snapshot for local verification.
- `src/test/probe-worship/round5-targeted-command.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5-targeted-run.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/round5Docs.py` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/runRound4Mutations.mjs` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/stage.config.ts` — Offline audit, comparison, mutation or documentation tooling; long lines wrapped for review.
- `src/test/probe-worship/summary-after.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe-worship/summary.txt` — Recorded audit analysis, exact command or local verification output.
- `src/test/probe/marksTable.test.ts` — Pre-existing user probe; left untouched by rounds 4–5.
- `src/test/probe/own2.test.ts` — Pre-existing user probe; left untouched by rounds 4–5.
- `src/test/probe/ownership.test.ts` — Pre-existing user probe; left untouched by rounds 4–5.
- `src/test/probe/ta.test.ts` — Pre-existing user probe; left untouched by rounds 4–5.
- `src/test/settlementCases.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/test/worshipAssertions.ts` — Shared bundled fixtures or independent geometry/ownership assertions for the explicit tests.
- `src/world/beyondCarry.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/beyondCrest.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/beyondMarks.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/beyondSeat.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/beyondSeat.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/beyondSeatFixture.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/farCities.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/farCities.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/farCityTypes.ts` — Carry source, projection and scene evidence through small typed modules.
- `src/world/farTownField.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/markContext.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/markFitting.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/markGeometry.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/markPerspective.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/marks.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/neighbourPreselection.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/neighbourSize.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/neighbourSize.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/outside.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/outsideDepth.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/outsideSeats.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/place.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.
- `src/world/portraitContest.test.ts` — Regression coverage for source ownership, physical scale, final placement or the affected renderer.
- `src/world/types.ts` — Carry source, projection and scene evidence through small typed modules.
- `src/world/visibleMarkHeight.ts` — Project physical geometry and propagate source ownership, distance and viability into the scene.

## Merge with main

Completed the merge follow-up for `origin/main` / `MERGE_HEAD` `0818fd1cac33f3f247f8fb0ae84cf36d240b2c55`
against ownership HEAD `453e7d6f7a4f33f55f29cb85f9f8d7a91b061d40`. No commit or merge abort was performed.
The completion fixes are staged, and the merge remains open for the owner to commit.

### Conflict resolutions checked

- `src/scene/model/outside.ts`: `Shape` contains main's cached `bounds` and ownership's `mass` and `home`.
  The cache stores all three, bounds feed the final outside layer, and the mass/home accessors feed neighbour
  placement. Main's eye-light glint changes and stable bounds remain intact. `git ls-files -u` is empty.
- `e2e/scene.stills.mjs`: main's sixth `@hide` segment reaches the scene URL and screenshot filename. Ownership's
  generic flat fixture, guarded descriptions and 4× crop remain. The usage comment was wrapped without changing
  CLI semantics. One offline invocation exercised every option together; the labelled PNG was visually inspected.
  See [merge-stills/README.md](merge-stills/README.md) for the command, full PNG, description and crop.

### Required glyph evidence

A full TypeScript build reproduced the two missing-factor literals from main. Grep of the merged GlyphDesc
fixtures and the subsequent clean build confirmed the fixes. All four owned/test literals in the two affected
painter files now spread one `OWN_GLYPH_EVIDENCE` default from `src/test/glyphEvidence.ts`, with factor 1.
Production evidence remains required; no optional field or weakened production type was introduced.

### Jerusalem failure: isolated main versus the combination

An isolated detached worktree of `origin/main` at exactly `0818fd1` was created in the temporary scratchpad.
It reused already-installed dependencies through a verified junction. Running only the Jerusalem mass-form
case in `src/scene/model/outside.test.ts` passed on main (1 passed, 112 skipped, 13.99 s). The identical case in
the merged tree failed at 0.3712631127 against an unhazed sky sample of 0.3596308486. The detached checkout
and its dependency junction were removed after the comparison; this merge was neither reset nor aborted.

The algorithms for `skyFormOf` and `tonesAt` match main. The ownership branch's transported distance/haze frame
adds the more distant displayed tiers that expose an invalid test bound under main's new atmosphere.
The recovered row coordinate agrees with `outsideProject`: `dy = frame.s + near × (frame.n - frame.s)`,
so the larger depth is not an arbitrary brightness change. At
Jerusalem 16:30 the 11.5 km tier's wall is already 0.3712631127 before the roof adjustment, and its roof equals
that wall. Atmospheric haze is 0.4544742863. Requiring the roof both to be at least its wall's brightness and
below the 0.3596308486 unhazed sky is contradictory. Path radiance can make a distant surface brighter than a
sample of the sky in another direction; the surface albedo bound applies before that atmospheric contribution.
The diagnostic values are retained in `src/test/probe-worship/merge-light.json`.

This is the brief's physically-wrong-expectation exception: no production lighting, true distance or haze was
clamped to conceal the failure. The existing test now bounds observed mass by the sky/path-haze envelope,
retaining its top ≥ wall, face ≥ wall, foot < wall, strength, side and night checks. The new
`src/scene/model/ownSkyForm.test.ts` adds a stricter known-distance comparison against sky through the **same**
atmospheric path at 0, 10.5, 11.5 and 12.5 km, at noon and 16:30. Its zero-distance control still requires the
roof below the unhazed sky; the far control requires the legitimate path-radiance brightening. Both new tests
and the three original cities' mass-form cases passed, without a changed production rendering result.

### Validation and completion files

The explicit shared-file run passed all 488 tests in 31 files (427.22 s).
The selection contains all nine files named in the brief, the new sky-form regression, and every main-changed
test importing an ownership-changed module (including type/schema imports). The exact command is retained in
`src/test/probe-worship/merge-targeted-command.txt`, with its import intersection in `merge-shared-tests.json`.
No folder-wide suite was run. Pure-main and initial combined outputs are retained separately as
`merge-outside-main.txt` and `merge-outside-combined.txt`; corrected focused results are in `merge-light-fixed.txt`.

`npx tsc -b` and `npx oxlint` pass. Lint has 13 warnings outside this completion patch, including the incoming
harness hook-dependency warning. `git diff --check` and `node --check e2e/scene.stills.mjs` pass.
The default full staged whitespace check flags CRLF in 16 incoming files; every affected staged blob is
byte-identical to `origin/main`. The full staged check passes with
`core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol`, preserving main's line endings rather
than normalizing unrelated files. No repository/global whitespace setting was changed. The combined
stills command uses cached Playwright, installed Chrome and bundled fixtures, with external requests blocked.
No live service, package download, deployment, push or commit was performed.

Completion changes:

- `src/test/glyphEvidence.ts`: shared owned/test factor-1 evidence.
- `src/scene/paint/glyphs/glyphs.test.ts`: use that default for all typed fixture literals.
- `src/scene/paint/outside.test.ts`: use the same required default for its new glyph fixtures.
- `src/scene/model/outside.test.ts`: include atmospheric path light in the physically valid mass-form bound.
- `src/scene/model/ownSkyForm.test.ts`: zero-distance and same-path albedo regression controls.
- `e2e/scene.stills.mjs`: preserve the resolved combined CLI and wrap its usage documentation.
- `merge-stills/`: offline smoke-check PNG, geometry, crop and reproduction notes.
- `REPORT.md`: this conflict review, isolated comparison, physical reasoning and validation record.
