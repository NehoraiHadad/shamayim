# N4: the pleasant cloud look (owner's call, 22 Nov), and finishing Track D

You take over Track D from the session that built the cloud field. Start from `claude/fix-cloud-field-0b1237` at
8732240 (CI green, run 45017033651). Work in your own worktree on a new branch `claude/cloud-soft-look-<suffix>` cut
from that sha, and push only that branch. Never push to main, never force-push, never open a PR.

## What the owner said
- The realism push made the clouds unpleasant to look at.
- The reference is the first WebGL sky: `docs/design/qa/clouds-45.jpg`. It has soft, translucent, white-blue veils,
  few of them, and a lot of open blue. Quoting the owner: "not exactly that, it can be improved, the idea was pleasant."
- Option A was chosen: bring the clouds back to that language. Lighter and more translucent, less blur. Soft shapes,
  not fog.

## Where it stands (see the before/after: CI stills of runs 45015699942 and 45017033651)
- **The world model (keep it):** `src/world/field/*` and `src/scene/model/cloudSheet*.ts`, `clouds.ts`. One seeded field
  decides where cloud is, its τ, ground shadows, direct light and rain. Its gates are green. Don't re-tune physics for
  the look.
- **The painter (your job):** `src/scene/paint/cloudSheet.ts` resamples the model's 144 × 73 grid (alpha + tone) and
  `soften.ts` blurs it over `SOFT = 9` px.
  - Result: no stair-steps, but broken Sc reads as a blurred grey photo.
  - The horizon element rows melt into haze.
  - Showers are a heavy grey blob.
- **Good already, leave alone:** overcast (soft CIE gradient) and the cirrus/Cs veil.

## Must do
1. **A look pass in the painter only**, driven by the model's numbers, with nothing per place:
   - Map alpha through a gentle opacity curve, so thin parts are clearly translucent and only thick cores near-opaque.
   - Pull the broken-deck tone toward the lit/body colours: whiter, sky-tinted, with grey only in genuinely thick cores
     or rain.
   - Make the softness smaller and perspective-aware: it shrinks with the row spacing toward the horizon, so far rows
     stay small soft puffs and don't fog.
   - Every constant gets a one-line reason. Pure, seeded, no clock, no `ctx.filter`, scratch surfaces only from
     `env.canvas()`. Files ≤ ~150 lines.
2. **Judge by eye on CI stills at 375 px**, not by adding numeric gates. Each round:
   - run `gh workflow run CI --ref <your branch> -f stills="haifa@11:30@overcast jerusalem@11:30@broken
     shadmot-mehola@11:30@broken haifa@11:30@showers jerusalem@07:15@cirrus"`;
   - make a before/after strip;
   - send it to the owner with SendUserFile.
   - Iterate until the owner says it's pleasant.
3. **Don't break the field's tests.** Run `tsc -b`, oxlint on the touched files, and targeted vitest only:
   - `src/scene/paint/cloudSheet.test.ts`, `src/scene/model/cloudSheet*.test.ts`, `sky.test.ts`, `weather.test.ts`,
     `model.test.ts`, `c10fixes.test.ts`;
   - `src/world/field/*.test.ts`.
   Heavy checks run on CI.
4. **Finish Track D:**
   - merge `origin/main` (now d9bbfce or later, which includes the production sky-background hotfix);
   - update the Track D section of `TASKS.md` (line ~901), naming who wrote what;
   - when CI is fully green, send `READY <sha> — <summary> — CI run <url>` to the audit session
     local_32d9a49f-5543-47c6-879e-d9d99fa2d0d8.

## Context worth reading
- `docs/design/qa/polish/track-d/N2-report.md`, Rounds 12–17, and `briefs/N3*.md`: what the field does and why.
- `docs/design/qa/polish/track-d/shelved/N3k-coverage.patch`: texel-coverage alpha. Shelved because the cold snapshot
  rose to 20 ms.
- Memory note "Pleasant over exact".

## Clean code (the owner asked for this explicitly)
- **Small, single-purpose functions** with names that say what they do. Keep the look's constants together at the top
  of one file, each with its reason.
- **No dead code:** remove what a change replaces (no unused `soften` options, no commented-out code, no leftover
  experiments or temp scripts in the repo).
- **DRY:** the colour/tone helpers live in one place.
- **Readable at a glance.** If a function grows past ~30 lines or a file past ~150, split it.
- **One tidy commit per round**, with a clear message; the final diff should read like it was written once.

## Rules
- Commits in English, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Avoid track A's files (glyph lighting and faces) and track C's (`life.ts`, `lifeSchedule.ts`, `lifeAhead.ts`, planes,
  birds).
- Never run a multi-line `npx tsx -e`. Use a temp script and `./node_modules/.bin/<tool>`.
