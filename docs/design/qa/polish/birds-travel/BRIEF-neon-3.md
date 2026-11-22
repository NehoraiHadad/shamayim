# Brief 3 — birds travel: Codex review fixes (REVIEW-codex-1.md)

Same branch and rules as briefs 1–2 (commit in English ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no push; no live services). Read REVIEW-codex-1.md first.
Fix findings 1, 3, 4, 5, 6 as below. Finding 2 (a strip's yaw held for the minute) is NOT in scope: leave it.

## 1. No pop-in for a flock that starts inside the minute (P1)

`lifeAt` (`src/world/lifeSchedule.ts`) lays only flocks under way at `tt`; a flock starting at tt+20 s enters at the next
rebuild already 60 s in (a bat: across its whole 330 m fade). Lay a flock if its session overlaps `[tt, tt + AHEAD_S]`
(`e.t0 <= tt + AHEAD_S && tt <= e.t1`). For one not yet started (`tt < e.t0`): its Flock at `tt` is its pose at `e.t0`
with `fade: 0`, and each look-ahead sample `tau < e.t0` is the pose at `e.t0` with `fade: 0`; from `e.t0` on, as now.
Same treatment for nothing else (planes are out of scope). The bird layer must then fade in from 0 on the composite
path with no step: check that `trackBaseAlpha`/`poseTrack` (`src/scene/model/lifeTracks.ts`) carry each sample's fade
into the track's alpha so the layer is invisible until t0 and ramps after; if they use only sample 0's fade, make the
per-sample fade drive the alpha (birds only), keeping planes byte-identical.
Test (continuity.test.ts): remove the `fromStart` exemption Codex cites; across the fixtures, no bird layer's laid
opacity steps by more than 0.05 between the old minute's pose at phase 60 and the new minute's at phase 0.

## 3. Ground speed stays the drawn speed (P3)

In `lay()`: `rate = clamp(trackLength / dur, 0.87 * speedMs, 1.15 * speedMs)` (speedMs = the drawn speed). When the
track is longer than `rate * dur`, fly its middle: `s(t) = offset + rate * (t − t0)` with
`offset = (trackLength − rate * dur) / 2` (shorter: offset 0 and it ends early, held at the end with fade 0).
Add a time fade so the session's ends are invisible whatever the distance fade says:
`fade = min(distanceFade, smoothstep(t0, t0 + 0.08 * dur, t), 1 − smoothstep(t1 − 0.08 * dur, t1, t))`.
Update `lifeSchedule.test.ts:58`'s bound to use the DRAWN speed × 1.15 (not the reported rate). Add a test: over the
fixture schedules (as Codex probed, ≥ 500 events), every reported speed is within [0.87, 1.15] × drawn.

## 4. The laid track is not writable by callers (P4)

Return the laid object frozen (`Object.freeze` on the object and its `track`), type `LaidFlock` and `FlockTrack` fields
`readonly` where it compiles cleanly, and copy `home` into the closure (`{ ...home }`) instead of sharing it.

## 5. Laziness is tested deterministically (P5)

Add `laid: () => boolean` to `FlockEvent` (true once `lay` has run). In `lifeSchedule.test.ts`: build a day schedule,
sample `lifeAt` at one moment, and expect the number of laid events to equal the events overlapping
`[tt, tt + AHEAD_S]` (and be < 25 % of the day's events). Keep the timing test in `flockLazy.test.ts` as a log plus a
generous ceiling (it is a smoke test; the count test is the gate).

## 6. The travel checks measure what is seen (P6)

- `birdsTravel.test.ts`: measure a layer only if its laid pose is inside the sky (`0 ≤ x ≤ width`, `0 ≤ y ≤ horizon`)
  and its laid opacity ≥ 0.2 at BOTH phase 0 and phase 10. Same thresholds as now; if they fail, stop and report.
- `e2e/birds.motion.mjs`: exit 1 if no cluster was followed in any moment (`no flock measured`).

## Then

`npx tsc -b`, `npx oxlint`, `npx vitest run --maxWorkers=4 src/world src/scene/model` all green. Write IMPL-3.md: each
finding, what changed, the numbers (speed ratio distribution, opacity step max, laid count vs overlapping, travel table).
