# Track G — merge origin/main 8ac7bd2 (track D N2: cloud field, shadows, light, rain)

A `git merge origin/main` is in progress in this worktree, with conflicts in `src/scene/model/clouds.ts`, `sky.ts`, `weather.ts`,
`src/world/rain.ts`, `src/world/world.ts` (and TASKS.md, which Claude resolves; do not edit TASKS.md). Resolve the source
conflicts; do not commit or abort the merge; do not touch `.env*`. Write `docs/briefs/track-g-merge2.REPORT.md`.

Both sides are intended and must survive:
- **This branch (track G):** live is the scrub timeline at now (see `docs/briefs/track-g-live.md`, `track-g-merge.md`, and their
  REPORTs). The world reads the blended `shown` weather sampled at `selected ?? now`, with the observation and each data arrival
  eased in and weighed at now. Nothing in the world reads `forecast.current` or a floored hour row for drawing. Dust is the
  continuous `dustWeight`. Thunder is the continuous `thunderWeight`. Rain cover is `max(rate, snowCloudRate)`. Every new term is
  continuous in its inputs.
- **Main (track D N2):** read `git log c5b1af8..origin/main` and its TASKS.md entry and briefs for the cloud field, shadows, light
  and rain.

Resolution rule: keep track D's physics and drawing, but feed it from track G's single world state. Wherever D reads
`forecast.current`, `between`, `hour`, `weatherCode` or a boolean that track G replaced with a continuous weight, give it the
blended value. Live and scrub must stay identical at now. Nothing may step at an hour, at a rollForward or when data arrives.
Keep track D's tests passing; adapt their inputs only where the old input no longer exists, and say so.

Run `npx tsc -b` and `npx oxlint`. Run `npx vitest run` with `--testTimeout=180000` on every test file either side changed
(`git diff --name-only 309f094 origin/main -- 'src/**/*.test.ts'` plus `git diff --name-only c5b1af8 HEAD -- 'src/**/*.test.ts'`).
Also run `src/scene/model/c9.test.ts` and `src/scene/react/sceneLabel.test.ts`.

## Precision
Pay attention to subtleties and physical accuracy. List in the report every track D input you rerouted and why it is
equivalent at whole hours with a fresh observation. No unstated approximations.
