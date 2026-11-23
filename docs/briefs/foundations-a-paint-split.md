# Foundations A: split `src/scene/paint` into shared / real / drawn (refactor only)

Worktree: this folder, branch `claude/scene-foundations-2b66cc`. Read first: the headers of `src/scene/paint/index.ts`, `hand.ts`,
`drawn/index.ts`, `src/scene/sceneStyle.ts`, `src/scene/compose/{layerCache,paintJob,paintWorker,remoteCache,surface}.ts`,
`src/scene/model/{index,types,outside,buildingLight,glyphSurfaces,landmarkAtmosphere,farCities,drawnOutsideLight,drawnTones,drawnHaze,
drawnArchitectureLight,ownSkyForm,metalLight,glassLight,buildingIncidence,weather}.ts`, `src/world/{drawnLight,world}.ts`.

Goal: it is obvious which file belongs to which style; what both hands need exists once; a style is removed by deleting its folder and
its one registry line. Both styles stay **byte-identical**: same arithmetic, same operation order, same rng draw order, same canvas call
order, same cache keys' equality behaviour. No tuning, no "while I'm here" fixes, no reference stills re-recorded. If you see a bug, list
it in the report and leave it.

## Target

```
src/scene/paint/
  contract.ts    Painter<K>, Painters (total over every painted LayerKind: a missing kind is a type error), Style
  styles.ts      STYLES = { real: REAL, drawn: DRAWN } (the registry), painterOf(desc, style), styleKey(desc, style)
  shared/        base/ sky/ cloud/ weather/ land/ town/ (with glyphs/, icons/) life/ wear/, and painters.ts (SHARED)
  real/          index.ts exporting REAL: Style, and the painters only the real hand has
  drawn/         index.ts exporting DRAWN: Style, and the painters and light only the drawn hand has
```

1. **Contract.** `Style = { id, painters: Painters, light: StyleLight }`. `Painters` is a total map (`contrail` is laid by the surface, not
   painted here: exclude it by type, do not add a dummy). Each registry lists its painters as `{ ...SHARED, <its own kinds> }`, where
   `SHARED` (`shared/painters.ts`) holds only the kinds both hands paint with the same object; its type must not include a kind a style
   has to supply itself (type-checked, not a comment). `form: paintNothing / formless` boilerplate becomes one helper
   (`lightOnly(paint)`), keeping the same observable behaviour.
2. **Style names.** `SceneStyle = keyof typeof STYLES`, `SCENE_STYLES = Object.keys(STYLES)`: the registry is the only place the union is
   spelled. Keep `src/scene/sceneStyle.ts` as the light entry point only if it adds no runtime import cycle and does not drag the painters
   into a chunk that had none (check who imports it: `ui/devParams.ts`, React props); otherwise move it and update importers. Report
   the main-chunk size before/after from `npx vite build` (once, at the end).
3. **styleKey.** Today: `''` where the style shares the real painter, `~drawn` where it has its own. Make it general: `~<id>` exactly when
   the style's painter for the kind is not the default style's painter object (identity), else `''`. Same strings as today for all kinds.
4. **The model must not know styles.** Today the style's NAME runs through `sceneModel → outsideLayer / farCitiesLayer / marksLayers /
   buildingLight / glyphSurfaces / landmarkAtmosphere / farNeighbourMarks`, `SkyForm` is an optional field of the outside desc, and the
   drawn hand's palettes live in the model. Replace by one typed hook the model owns (`model/styleLight.ts`):
   `StyleLight { key: string; screen?: (irr: LandIrradiance) => TwilightScreen; outside?: (facts…) => OutsideLook }`, passed as a value.
   Real's is the empty one. The model imports types only, never a style; the React and dev callers pass `STYLES[style].light`.
   Caches keyed by the style name become `WeakMap<StyleLight, WeakMap<WorldState, …>>` (or equal), one entry per light object. Code used
   only by the drawn hand moves to `paint/drawn/light/`: `drawnOutsideLight`, `drawnArchitectureLight` (the screen), `ownSkyForm`/
   `SkyForm`. The outside desc in the contract loses `form`; the drawn hook returns a desc that extends it and the drawn painter reads
   its own extension (one narrow typed accessor, no `any`). `farCities`' light key keeps distinguishing the hands (`light.key`).
5. **Names that lie.** `drawnTones`, `drawnHaze`, `drawnLight` (world) are used by the REAL hand too (the shrine's floodlit dome, the dust
   grains' sky, `world.ts` optics): they are the shared illustrated palette. Rename them (`illustratedTones`, `illustratedHaze`,
   `halfDepthLight` or better names that say what they compute) and keep them in the model/world. Nothing outside `paint/drawn`, the
   registry, tests of the drawn hand and CI/e2e parameters may mention the drawn style; nothing outside `paint/real` and the registry may
   mention real as a special case, except the one exported `DEFAULT_STYLE`.
6. **Where files go.** A painter used by both hands (through a registry or an import) goes to `shared/`; a painter only one hand uses goes
   to that hand. Today real only: `cloudSheet` painting, `cloudLook` (except `deckOpenness`), `cloudRaster`, `cloudTower` painting,
   `towerShape`, `towerTone`, `outside`, `outsideBox`, `outsideRoof`, `outsideTower`, `outsideWindows`, real's `FIBRES`. Split the mixed
   files: `resampleRows`/`ROW`, `deckOpenness`, `layTower`/`TowerBody`, `stripPhase`, `TOWER_CONTACT`/`TOWER_CAST`, `roundGradient`
   (gilding imports it from `drawn/glyphLight`), curtains and edge (parameterised by `Fibres`, no default argument: each hand passes its
   own) go to `shared/`. No function in `shared/` takes a style or a flag that means a style. Do not merge code that merely looks alike.
   `CloudSprite`/`SpriteGenus` are contract types the model fills: move them to the model. Check every symbol's real users; the list here
   is from a scan, not proof.
7. **Dead code.** `PaintEnv.style` (nobody reads it), unused exports and parameters, stale header comments that name old files or say the
   vote deletes a hand "temporarily": delete or correct. Keep comments that explain physics or craft.
8. **Sizes.** Every file you touch in `paint/` ends ≤ ~150 lines, tests included: split `wear.ts` (515), `weather.ts` (262), `sky.ts` (169),
   `outside.test.ts`, `glyphs.test.ts` by subject. `model/types.ts` (584) is the layer contract: split into `model/layers/*.ts` by surface
   or subject with `types.ts` as the barrel (types only). Leave `compose/surface.ts` alone.
9. **Architecture test** `src/scene/paint/architecture.test.ts`: parses imports (static, dynamic, `export … from`, `import('…')` types,
   `new URL`) of every file under `src`, resolves them, and asserts: real ↛ drawn, drawn ↛ real (types too), generally any style folder
   ↛ any other style folder, found from the folders of `STYLES`; shared ↛ any style folder or the registry; model, world, compose ↛ a
   style folder (compose and React only through `styles.ts`/`contract.ts`/`shared`); no source file outside the style's folder and
   the registry names a non-default style id as a string. Prove it bites: unit-test the checker on small in-memory sources with each violation.
   The folders below `paint/` are exactly `shared` plus one per registry entry.
10. `purity.test.ts` keeps scanning all of it. Tests move next to what they test. `compose/sceneStyle.test.ts` should iterate
    `SCENE_STYLES` rather than name styles where that keeps it meaningful.
11. e2e and docs: fix every path that names a moved file (`e2e/*.mjs` import `/src/scene/...` URLs at run time, `docs/design` only where a
    path is given as current, `scripts/`, dev pages). Grep for each moved path afterwards.

Use `git mv` so history follows. Work in small commits (contract and registry; model hook; moves; splits; architecture test), English
messages ending with a blank line and `Co-Authored-By: Codex gpt-6.2-sol <noreply@openai.com>`. Do not push. Do not touch `.env*`,
`TASKS.md`, `.github/`, `e2e/styleIdentity.mjs` (another writer's). No new dependency.

## Verify (locally, targeted only; full suites run on CI)
`npx tsc -b`; `npx oxlint`; `npx vitest run src/scene/paint src/scene/compose src/scene/purity.test.ts --maxWorkers=2`, plus the model
tests of every model file you changed. On Windows no multi-line `npx tsx -e`.
Byte identity aid: before starting, write a throw-away script in your temp dir (not in the repo) that records, for at least haifa, jerusalem,
tel-aviv fixtures at noon, 16:30, 21:00, each style, a hash of `JSON.stringify(sceneModel(...).layers)` (numbers untouched) on the base
commit, and compare after; the only allowed differences are fields you moved by design (say which).

Report to `docs/briefs/foundations-a-paint-split.REPORT.md` (≤ 120 lines): the final tree with line counts, what moved where and why
shared, deviations from this brief with reasons, hashes before/after, bugs seen and left, commands run and their results.
