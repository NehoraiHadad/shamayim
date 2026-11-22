# Track C brief 2 — review fixes for continuous flight (Codex gpt-6.2-sol)

Repo: this worktree. Read `BRIEF-neon-1.md` and `IMPL-1.md` in this folder first: brief 1 was implemented in commit
d673f4a, and an independent review found the problems below. The manager has since moved the flock layers into
`src/scene/model/birds.ts` (`birdLayers`, `LOOKS`, `flockBirds`, `boundsOf`) and the bird painter into
`src/scene/paint/birds.ts` + `src/scene/model/birdFlight.ts`. Leave `LOOKS`, `flockBirds`, `boundsOf` and the painter
alone; the cull in `birdLayers` is yours (item 1). Do not commit.

## Fix, in this order

1. **Pop-in at the edges.** The cull tests sample 0 only (`birds.ts` `birdLayers`, the airliner head in `life.ts`/`contrail.ts`,
   `lowPlaneLayers`' `x < -10 || alpha < 0.01`). A mover that enters the view during the minute is not laid until the next
   rebuild and appears up to ~30 px inside. Keep a layer when any of its track's samples is in view (its bounds × scale)
   with alpha ≥ 0.01. In `lifeTracks.ts` the per-sample alpha is a ratio to sample 0: when sample 0's alpha is 0 every
   ratio becomes 1 and a mover that fades in stays invisible. Make it work in that case too (e.g. `placed.alpha = 1`
   and absolute alphas in the track); `placedInDepth` must still see a sensible alpha.
2. **Life freezes 120 s after the shown minute stops changing (scrubbing).** `trackAt` clamps at the end, so every
   mover stops — the original bug, and against the owner decision (while scrubbing, life keeps moving in real time and
   the set of objects follows the shown hour). Make life continue for as long as the scrub rests: e.g. the shell
   re-anchors each whole minute of real time past the anchor (`useLifeClock`), and the world samples life at the shown
   moment plus those whole minutes (`lifeAt` with a life offset in the world input; sky, light and clouds stay at the
   shown moment). The re-anchor must be seamless exactly as a live minute rebuild is. Also key the clock on
   `${at}|${selected === null}` so going back to live while `selected` equals the current minute re-anchors.
3. **Contrail scale in the fixed frame.** `contrailFrame.ts` scales by `|target| / |source|` measured from the crossing
   start (near the horizon). Gnomonic distance grows like tan θ while the dome's grows like θ, so far from the frame's
   centre the scale can be ~0.23 (the reviewer's estimate: 11 km cruise, 20 km abeam, entering at 140 km) — the trail near
   the head drawn at a quarter of its true size. Measure it first (log the trail's local px/km at the head against
   `tangentScale` at the head's altitude, for the three places' crossings). Then register on two points near the head
   (the head and a puff a few km behind) so that where the eye looks — near the plane — is true; keep the 1 px seam.
   Add a test asserting the local scale at the head within 5 %.
4. **The drift point.** `contrail.ts` takes `mid` from the visible run, so it moves each minute; use the crossing's own
   fixed centre. Then assert the far-trail residual ≤ 1 px in `lifeContinuity.test.ts` (now it is only logged, 1.06 px).
5. **Puff ageing at the rebuild.** Puffs keep their minute-T age (widths and alphas) until the rebuild, then jump by
   ~60 s of ageing. Measure the width and alpha step at the young end and the old end. If it is visible (> 0.5 px width
   or > 0.03 alpha), age them continuously; otherwise name its measured size in a comment.
6. **A genuine continuity test.** Today the old model is always read at t = 60 exactly, a sample, so 0 px is guaranteed;
   the "one frame + 1 px" check follows from px ≤ 1. Read the new model at a non-zero `sinceS` too, so interpolation
   between samples is exercised; assert the jump against the previous frame's motion without the 1 px slack where it
   means something; and check that a layer present in both minutes keeps its surface (`sky`/`land`) and its land-side
   copy (`.front`) — or report how often the per-minute sight line flips it, and the jump that causes.
7. Remove the vestigial meteor pulse `every: [1e9, 1e9]` if nothing needs it.

## Precision

Pay attention to subtleties and physical accuracy: real speeds, angles and scale in their units (km, deg, sky px at
`geom.s`); measure before and after each fix and put the numbers in the report. Name every remaining approximation in a
comment with its size.

## Rules

Same as brief 1: painters and the model stay pure (no clock), seeded rng only, no `ctx.filter`, no point fixes, files
under ~150 lines for new modules (do not grow `surface.ts`, `life.ts`, `remoteCache.ts`, `layerCache.ts`: move code out
if you must touch them), DRY, no dead code. Green before you hand back: `npx tsc -b`, `npx oxlint`, and targeted
`npx vitest run` of `src/scene/model/c10*.test.ts`, `flight.test.ts`, `continuity.test.ts`, `lifeContinuity.test.ts`,
`lifeTracks.test.ts`, `src/scene/react/useLifeClock.test.ts`, `src/scene/compose/compose.test.ts`,
`src/world/lifeSchedule.test.ts` (use `--maxWorkers=2 --testTimeout=60000`). Then write `IMPL-2.md` here: per item what
changed, the before/after measurements, and anything left.

Never use a multi-line `npx tsx -e "..."` (it hangs on this Windows shell waiting on stdin): write a temp script file and run `npx tsx <file>`.
