# Track G — merge origin/main (track F mist, track C birds) into this branch

A `git merge origin/main` is in progress in this worktree with conflicts in `src/world/world.ts`, `src/world/air.ts`,
`src/world/world.test.ts`, `src/scene/model/weather.ts`. Resolve them; do not commit, do not abort the merge, do not touch
`src/probe/`, `src/test/fixtures/scene/karmei-tzur.panorama.json` or `.env*`. Write `docs/briefs/track-g-merge.REPORT.md`.

Both sides are intended and must survive:
- **This branch (track G):** live is the scrub timeline at now (`docs/briefs/track-g-live.md` and its REPORT rounds 1–3).
  The world reads the blended `shown` weather (sampled at `selected ?? now`, observation and arrivals eased, weighed at now);
  nothing in the world reads `forecast.current` or a floored hour row; dust is the continuous `dustWeight`; every new term is
  continuous in its inputs.
- **Main (track F mist, `git log origin/main` d22b39f..a25baeb, notes in TASKS.md):** daytime mist true to nature — radiation fog
  from calm damp clear nights burning off with sun height, data fog, rain mist, marine layer, a night minimum that glides as a
  sample ages. Its `airOf({... mist: { current: forecast.current, hour: between, ... } })` and `hourVisibilityM: between?.visibility`
  read the current reading and the floored hour directly.

Resolution rule: keep track F's physics, but feed it from track G's single world state. Where the mist reads
`forecast.current` or `between`, give it the blended values (and the observation with its age/ramp weight where it needs "a
sample and its age"). Live and scrub must still be identical at now; the mist must not step at an hour, a rollForward or a data
arrival. Keep track F's own tests passing (adapting their inputs to the blended path only where the old input no longer exists,
and say so). Keep track C's birds untouched.

Run `npx tsc -b`, `npx oxlint`, and `npx vitest run` on: `src/world/world.test.ts src/world/liveLight.test.ts
src/atmo/airInput.test.ts src/scene/model/dust.test.ts` plus every mist test file track F added or changed
(`git diff --name-only cf7221e...origin/main -- 'src/**/*.test.ts'`), `--testTimeout=180000`. Add one test: live mist over
05:30–09:30 at one-minute steps and across a simulated refresh stays within a stated continuity bound.

## Precision
Pay attention to subtleties and physical accuracy. A reading is true when it was made and fades with age; the hours are the
background. No unstated approximations; list in the report every track F input you rerouted and why it is equivalent.
