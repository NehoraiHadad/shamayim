# Open tasks 2: live mode LOW 1 (a scrub that lands on now is live) and LOW 2 (a held preview keeps its cloud cover)

You work in this git worktree. Do not commit, do not switch branch. Another lane edits `e2e/` and `.github/`: do not touch them.
Files: `src/ui/scrub/useSceneTime.ts` (+ new helper/test beside it), `src/scene/react/SceneScrubber.tsx`, `src/ui/hourly/useStripScrub.ts`
only if needed, `src/domain/observedCloud.ts` + test, `src/atmo/airInput.ts` (+ test), `src/world/liveLight.test.ts`.
Read first: `docs/briefs/track-g-live.md`, `track-g-round5.md` (live is explicit: `selected === null`; a held preview stays a
preview when now passes it). Product rule: "live mode is scrub at now".

## LOW 1
`scrub(time)` / `pick(time)` can set `at` to exactly `now`: a preview (no satellite sightings, no thunder) of the very moment that is
live, until the 6 s hold rewinds. Rule: a move of time that LANDS on now selects live (`at = null`), in ONE place (useSceneTime), so
every caller (strip drag, valley drag, slider keys, tap) gets it:
- `scrub(now)` -> at null, `scrubbing` stays true while the finger is down (the next move to another minute is a preview again);
  `release()` then starts no hold. `pick(now)` -> like `toNow`.
- A held preview whose minute now later passes stays a preview (do not touch that: only a landing by the user snaps).
- Compare with the freshest now (`nowRef` is written in an effect: make sure a landing in the same commit as a minute tick cannot use
  a stale now).
- `SceneScrubber.move` ignores `clientX === d.x`, so a drag can never come back to the moment it started from (from now: +-4 min,
  never now itself). Let it: after the first real movement, coming back to the start x emits the start moment. If that start was live
  now and now has ticked meanwhile, coming back must land on live, not on the old minute (think about what `d.at` should be for a drag
  that began live). A press with no movement still emits nothing.
Tests: there is no DOM test environment (vitest `node`; add no dependencies). Move the logic out of the hook into a small pure
controller (a file beside it, e.g. `sceneTimeController.ts`; vi fake timers) that the hook wraps, and the scrubber's drag arithmetic
into a pure function; test those. Each regression test must FAIL on today's logic: say how you showed it.
Keep rewind, hold (6 s), reduced motion and `data-scrubbing` behaviour exactly as they are otherwise.

## LOW 2 (measured, Jerusalem 17 Nov fixture, held preview of 14:00, satellite 13:45 cover 80, model 97)
While the preview is HELD and only `now` advances 13:45 -> 14:00, the previewed cover drifts 83.28 -> 80.00 and direct light
0.266 -> 0.398 (0.022 a minute). Same for 16:00: cover 89.9 -> 85.0 over 40 min. Cause: `correctCloudCover` weighs the observation by
`now -> at` (DECAY) and `obs.at -> now` (FRESH/STALE) and takes the model error against the model at NOW. So the estimate of a fixed
minute from an unchanged observation depends on when one looks, and scrub-to-X differs from what live shows at X.
Rule (one world state): the correction of minute `at` by an observation is a function of the observation and `at` only:
  shift(at) = clamp(obs.cover - model(obs.at), +-MAX_SHIFT) * trust(at - obs.at), and 0 for `at < obs.at`,
with `model(obs.at)` the model's cover at the observation's own minute (what the satellite really checked), and `trust` = 1 up to
FRESH_MIN (40) falling linearly to 0 at 150 min of age (the documented "~2.5 h" fade; name the constant and say in its comment why).
`now` stays only in the receipt ease (`nowMs`, `blendObservations`): a newly arrived observation still eases in over 10 min.
`observationWeight` (FRESH 40 / STALE 100, against now) stays for `sightingsNow` (single clouds shown live only).
- `airInput`: pass the model's cover at each sample's own minute (the chain in `blendObservations` has one `at` per sample). Sample
  lazily (never for `at < obs.at` or trust 0) and at most once per minute and call; it is a hot path (every scrub frame).
- `withObservedCloud` (card + hourly strip): the model's cover at `obs.at` is the hourly rows' straight-line value there (first/last
  row clamp); reuse an existing interpolation helper if there is one; card and scene must not disagree in rule.
  Mind `rollForward` (App.tsx:71): at 14:00 `current` becomes the hour row; the corrected card value must not jump because of it.
- Remove what becomes dead (`decay`, `now` parameters).
Tests (each must FAIL before the fix; show it):
 1. `liveLight.test.ts` held preview: satellite cover far from the model (e.g. model 25 and 97, observed 80 / 5), now 13:45..14:20
    by the minute with `rollForward` applied as App does: cover, clouds, field and light of the held preview are EQUAL.
 2. scrub at X equals live at X for the same observation (cover and light).
 3. continuity live: minute steps of cover and direct light stay below the existing `bound` across 40 and 150 min of age.
Update existing expectations that encoded the old decay (observedCloud.test.ts: 10:00 was 18) with the new exact value and a comment
of the arithmetic.

## Precision
Fine detail and physical accuracy: units are percentage points, minutes, local wall-clock strings (DST safe via
`minutesBetweenLocal`); every constant gets its reason. Files under ~150 lines, DRY, dead code removed, style as around (single
quotes, no semicolons, lines <= ~130 chars).
Run only targeted tests: `npx vitest run src/domain src/atmo src/ui src/world/liveLight.test.ts`, `npx tsc -b`, `npx oxlint`.
Report to `docs/briefs/open-tasks-2-live-lows.REPORT.md`: what changed, before/after numbers of the held preview, failing-before
proof, open doubts.
