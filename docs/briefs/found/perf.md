# Model cold cost (writer "perf")

Read COMMON.md, perf.diagnosis.md and perf.patch in this folder first.
Do item 1 (the compile hint on every runtime model file that lacks it, consistently with what `vite.config.ts` says, including files the paint
split moved or made) and item 3 (surface before air: `surfaceFaces` once per world, each distance tier only adds its air). Do NOT do item 2
(`townGroundKm`): another writer, "light", is replacing that rule. Keep your hunks in `buildingExposure.ts` small; split `buildingLight.ts`
(165 lines) into `buildingFaces.ts`.
Then look for more EQUAL-OUTPUT gains: `outsideShape`'s `neighbourhood` (137,695 pairs checked for 37,930 hits: a spatial grid or sorted sweep with
the same result order), `planeGeomOf` (geometry key, `demAcrossSlope`, `measuredFaceAt`), `farCities`, `canopyTones`: anything that saves >= 3 ms of
modelCold in Node at haifa 06:00 without changing one byte of `JSON.stringify(sceneModel(...))`. Prove equality by fingerprints as the
diagnosis did (8 places x >= 6 cases x both styles) and report paired medians.
Tests: faces at 3 distances equal those of a fresh world; neighbourhood equals the brute-force result on several places.
