# Common rules (every writer)

Shamayim: a Hebrew weather app; the scene is canvas 2D drawn from live data in two styles of ONE true world: `real` (default) and
`drawn`. The paint code is split: `src/scene/paint/{shared,real,drawn}`, contract `contract.ts`, registry `painters.ts`/`styles.ts`; the
model (`src/scene/model`, layer types in `model/layers/*`) knows no style, `src/world` is the state. You work alone in this worktree.

Rules. Physically and factually true, automatic from data, general (no fix per place, hour or screenshot). Pleasant over exact: physics
places, the painter softens. DRY; small files (aim for <= 150 lines, split when over); seeded rng, no clock, no `ctx.filter`; nothing in
`shared`/model/world takes a style; `src/scene/paint/architecture.test.ts` and `purity.test.ts` must stay green. Both styles must gain. No
mosques drawn, landmarks yes. Fine detail and physical accuracy: every constant has a source or a stated derivation in a short comment; no
hidden tuning knobs. Cache keys: anything new that changes pixels must be in the key; nothing else may be.
Never raise a limit, loosen a test or re-record a reference to get green. Where a test's expectation contradicts the truth proven in the
brief, change it and say which one and why. Every fault gets a test that fails before your change and passes after (prove it: run the test
on the old code first). Keep cost down: measure the function you change before and after (interleaved, several runs) and report it.
Never open any `.env*` file. No network, no installs, no deploys. Do not touch `TASKS.md`, `.github/`, `docs/` (reading
`docs/briefs/found/` and `docs/design/` is fine), nor files named as another writer's. Windows: no multi-line `npx tsx -e`; scratch scripts go in a temp
dir, not the repo. `geotiff` may be missing locally: ignore that one tsc error. Run locally only targeted tests:
`npx vitest run <files> --maxWorkers=2`, `npx tsc --noEmit -p tsconfig.app.json`, `npx oxlint <files>`. If the sandbox stops vitest/tsc, say
so exactly. Do NOT commit (the git dir is outside your sandbox): leave the work in the tree; if it holds several commits' worth, list at
the end which files (or hunks) belong to which commit, in order, and keep each commit's files disjoint where you can.
The prototype patch was made on `fcd96b26` before the paint split: read it as a proposal, re-derive, improve, place it in the present files.
Do not trust it blindly.
Final message: what changed per file; what you measured (before -> after numbers); tests (failed before / pass after); what is not done
and why; risks.
