# Birds travel — notes (owner: "why don't the birds move? they fly in place")

Branch `claude/fix-birds-travel`. Briefs `BRIEF-neon-1..3.md`, reports `IMPL-1..3.md`, review `REVIEW-codex-1.md`.

## Diagnosis

- Built app, live (clock running, motion allowed, no scrub), fixtures: on main (b2e250d) flocks moved 0.8–2.4 CSS px in
  9 s (`e2e/birds.motion.mjs`): wings beat and each bird circled its loop round a fixed place.
- Cause: `GROUP` (`src/world/lifeSchedule.ts`) moved a flock's centre at 0.5–2 m/s by design. At 1.5 px/deg, 1 m/s at
  500 m is 0.17 px/s. The life clock, look-ahead tracks and the compositor's per-frame `trackAt` were working.
- Production: shamayim.pages.dev and the custom domain serve the exact bundle built from main (`index-D4NQ8uZG.js`,
  `CanvasScene-DosmOuyW.js`, the latter carrying track C's `laidAt`). So the bug was the code, not a stale service worker.

## Fix

- Flocks pass at their real ground speed (pigeon 14, crow 11, swift 10, gull 9, stork 10, crane 15, bat 6 m/s; a
  raptor's thermal drifts at 2 + 0.6 × wind); storks and cranes pass nearer.
- Real speeds made ~10× more sessions a day, so laying every track up front would have cost +1 s per first build.
  Instead each flock's terrain track is laid lazily (memoised, frozen) the first time it is sampled: only the flocks
  overlapping [t, t + 120 s] are laid (4 of 245 in the test day). First build is now at or under main (haifa 895 ms,
  shadmot-mehola 456 ms node; main ~960–1391 ms).
- (Coordinator suggested a windowed schedule; lazy laying gives the same scaling while keeping the day's sequential
  MAX_FLOCKS cap exact, and the output is identical whatever was sampled before — tested.)
- A flock is laid while it is about to start inside the look-ahead, at alpha 0, and fades in (no pop-in at the rebuild);
  a bent way is flown within 0.87–1.15 × the drawn speed, with time fades at both ends.

## Measured after

- Browser probe, built branch, live: 14–37 px in 9 s (Haifa 16:00, Tel Aviv 15:00).
- `birdsTravel.test.ts`: visible flocks in the sky, 10 s, three places: median of those within 1.5 km ≥ 8 px, every
  flock within 700 m ≥ 5 px.

## Follow-up (not done)

- A strip's yaw and view are held for the minute: on a fast near pass the apparent heading can swing (Codex: a crow
  at Haifa 10:23 turns 133° in 59 s while the strip keeps its first yaw). Needs per-sample yaw in the track.
- `src/world/lifeSchedule.ts` is ~650 lines (was 583): split the flock schedule out.
