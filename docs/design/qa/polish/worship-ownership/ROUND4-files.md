# Round-4 file inventory

Production changes are relative to the saved R3 snapshot; earlier rounds remain uncommitted.

| Change | Production file |
| --- | --- |
| Modified | `src/world/beyondMarks.ts` |
| Modified | `src/world/beyondSeat.ts` |
| Modified | `src/world/beyondSeatFixture.ts` |
| Modified | `src/world/farCities.ts` |
| Added | `src/world/farCityTypes.ts` |
| Added | `src/world/farTownField.ts` |
| Added | `src/world/markContext.ts` |
| Added | `src/world/markFitting.ts` |
| Modified | `src/world/markGeometry.ts` |
| Modified | `src/world/markPerspective.ts` |
| Modified | `src/world/marks.ts` |
| Added | `src/world/neighbourSize.ts` |
| Modified | `src/world/outside.ts` |
| Modified | `src/world/outsideSeats.ts` |
| Modified | `src/world/place.ts` |
| Modified | `src/world/types.ts` |
| Added | `src/data/landmarks/homeMarks.ts` |
| Added | `src/data/landmarks/markAppearance.ts` |
| Added | `src/data/landmarks/perspectiveFields.ts` |
| Modified | `src/data/landmarks/placeMarks.ts` |
| Added | `src/data/landmarks/portraitSelection.ts` |
| Modified | `src/data/landmarks/types.ts` |
| Modified | `src/data/city/cityRaster.ts` |
| Modified | `src/data/city/grid.ts` |
| Modified | `src/data/city/plainData.ts` |
| Added | `src/data/city/townFootprints.ts` |
| Added | `src/scene/model/cityMass.ts` |
| Added | `src/scene/model/evaluateNeighbour.ts` |
| Modified | `src/scene/model/farCities.ts` |
| Added | `src/scene/model/farNeighbourMarks.ts` |
| Added | `src/scene/model/farTownSupport.ts` |
| Modified | `src/scene/model/index.ts` |
| Added | `src/scene/model/markDescriptor.ts` |
| Modified | `src/scene/model/markOcclusion.ts` |
| Modified | `src/scene/model/marks.ts` |
| Modified | `src/scene/model/neighbourClearance.ts` |
| Added | `src/scene/model/neighbourDisplay.ts` |
| Modified | `src/scene/model/neighbourPlacement.ts` |
| Modified | `src/scene/model/outside.ts` |
| Modified | `src/scene/model/outsideMarks.ts` |
| Added | `src/scene/model/ownSkyForm.ts` |
| Modified | `src/scene/model/types.ts` |
| Modified | `src/dev/glyphSheet.tsx` |
| Modified | `src/dev/sceneFixture.ts` |
| Modified | `src/dev/sceneHarness.tsx` |
| Modified | `e2e/harness.mjs` |
| Modified | `e2e/scene.stills.mjs` |

Tests and shared fixture/assertion helpers changed or added in R4:

- `src/data/city/townFootprints.test.ts`
- `src/world/neighbourSize.test.ts`
- `src/world/beyondSeat.test.ts`
- `src/scene/model/neighbourPolicy.test.ts`
- `src/scene/model/outsideFrame.test.ts`
- `src/scene/model/worshipVisibility.test.ts`
- `src/scene/model/settlementOwnership.test.ts`
- `src/scene/paint/glyphs/glyphs.test.ts`
- `src/test/bundledWorld.ts`
- `src/test/bundledTerrain.ts`
- `src/test/settlementCases.ts`
- `src/test/neighbourAssertions.ts`
- `src/test/worshipAssertions.ts`

Offline probes/evidence under `src/test/probe-worship/`:

- `audit.test.ts`
- `auditCollect.ts`
- `auditTypes.ts`
- `auditUtils.ts`
- `neighbourDecisions.ts`
- `audit-round3.json`
- `neighbours-round3.json`
- `audit-after.json`
- `neighbours-after.json`
- `summary-after.txt`
- `round3-sources.json`
- `before-round1-sources.json`
- `stage.config.ts`
- `mutation.config.mjs`
- `runRound4Mutations.mjs`
- `round4-audit-run.txt`
- `round4-before1-run.txt`
- `round4-evidence.test.ts`
- `round4-far-landmarks.json`
- `round4-far-run.txt`
- `round4-farReasons.test.ts`
- `round4-fast-run.txt`
- `round4-layers-before1.json`
- `round4-layers-round3.json`
- `round4-layers-round4.json`
- `round4-layers.test.ts`
- `round4-line-baseline.json`
- `round4-lint.txt`
- `round4-mutation-run.txt`
- `round4-mutations.json`
- `round4-round3-run.txt`
- `round4-round4-run.txt`
- `round4-still-evidence.json`
- `round4-targeted-command.txt`
- `round4-targeted-run.txt`
- `round4Docs.py`
- `round4Mutations.mjs`

Removed obsolete R3 helpers: `round3-neighbours.test.ts`, `round3OtherSources.ts`.

Docs: `TASKS.md`, this inventory, `REPORT.md`, `AUDIT-table.md`, `AUDIT-table.tsv`, `stills/README.md`.

Stills/descriptions (R3 files renamed; R4 files/crops added):

- `stills/il-31.6607-35.1415-1200-flat100m-crop4x.png`
- `stills/il-31.6607-35.1415-1200-flat100m-r3.json`
- `stills/il-31.6607-35.1415-1200-flat100m-r3.png`
- `stills/il-31.6607-35.1415-1200-flat100m.json`
- `stills/il-31.6607-35.1415-1200-flat100m.png`
- `stills/osm-way-462664109-1200-flat100m-crop4x.png`
- `stills/osm-way-462664109-1200-flat100m-r3.json`
- `stills/osm-way-462664109-1200-flat100m-r3.png`
- `stills/osm-way-462664109-1200-flat100m.json`
- `stills/osm-way-462664109-1200-flat100m.png`
