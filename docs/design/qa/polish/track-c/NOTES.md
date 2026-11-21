# Track C — life keeps moving (audit #3, #9) — notes

Branch `claude/fix-life-motion-740e49`. Briefs: `BRIEF-neon-1.md`, `BRIEF-2.md`. Reports: `IMPL-1.md`, `IMPL-2.md`.

## What changed

- **One life clock.** `LifeClock {laidAt, sinceS}` (`scene/model/types.ts`, `LIFE_START` in `lifeTracks.ts`) from
  `useLifeClock(at, selected, timezone)`. The world lays 120 s of life ahead every 2 s (`world/lifeAhead.ts`); every
  mover carries a track (`Track`, `trackAt`: x, y, scale, alpha, turn) and the compositor places it at
  `phase − laidAt + sinceS`. A minute rebuild lands on the same pose: handoff ≤ 6.4 × 10⁻¹⁴ px against up to 0.06 px of
  real motion per 30 fps frame (IMPL-2 §6).
- **Birds (Claude).** A small 3D flight model (`scene/model/birdFlight.ts`): each bird flies its own loop round its
  place in the flock (thermal circles for storks and raptors, wheeling for pigeons, eights for swifts, a hang on the
  wind for gulls, a V for cranes, rowing for crows, zigzags for bats), banks into its turns, and is seen from the
  flock's real heading and height above the horizon (yaw in 0.05 rad steps, view in whole degrees). Wing beats and
  soaring share by species (`LOOKS` in `scene/model/birds.ts`); the painter (`scene/paint/birds.ts`) draws all eight
  kinds from the pose (span, dihedral, wrist bend, the underside when banked).
- **Planes, contrails, meteors (Codex).** Airport movements and airliners on the same tracks; the contrail ribbon ages
  continuously and is drawn by the compositor in a fixed tangent frame registered at the head (scale error < 0.11 %);
  puffs drift with the wind each on its own (rebuild residual < 10⁻⁶ px); meteors are one-shot pulses.
- **Edges.** A mover is laid if any of its 61 samples is in view, so nothing pops in up to ~59 px inside the edge.

## Owner decision (please confirm)

While scrubbing, life keeps moving in real wall time and the set of objects follows the shown hour: a resting scrub
re-anchors each whole real minute (life samples the shown moment plus those minutes; sky, light and clouds stay at the
shown moment). Reduced motion holds the pose. Going back to live re-anchors even at the same HH:MM.

## Perf (CI, 375 px, CPU ×4, p95 ms unless noted)

| Place | modelCold: c5c5077 / main 2fd0c1e / this | scrub.model p95: c5c5077 / main / this | anim frame p95 | memory |
| --- | --- | --- | --- | --- |
| Haifa | 40.0 / 49.2 / 77.0 | 13.5 / 21.9 / 26.7 | 2.5 / 2.6 / 2.9 | 29.6 MB, same |
| Tel Aviv | 36.2 / 48.6 / 62.3 | 14.7 / 20.9 / 24.2 | 2.4 / 2.8 / 3.1 | 27.4 → 28.3 MB |
| Shadmot Mehola | 21.3 / 27.5 / 30.0 | 10.8 / 13.3 / 17.2 | 1.6 / 2.2 / 2.5 | 24.6 MB, same |

c5c5077 is main before track A on a quiet runner; main 2fd0c1e ran the same hour as this branch's 3a4489f (CI run
44961984301), so compare those two. The runner varies by ±15 % or more between runs. Against main this branch costs
+3–4 ms p95 per scrub model at CPU ×4 (≈ 1 ms unthrottled: the life tracks, measured below) and +3–28 ms on the
cold first model (more code to compile on first call). The anim frame stays inside its 4 ms budget. The strip bounds
were made closed-form to halve the flock cost (0.45–0.76 → 0.21–0.34 ms in node); the rest is the 61-sample tracks
themselves.

Node profile of the model per layer (mean ms over 30 minutes, same fixtures): life layers (birds + low + high planes +
meteors) were 0.2–0.5 ms before and are 0.5–1.1 ms now (the 61-sample tracks; low planes 0.8 ms at Tel Aviv's airport). The
model's real costs are elsewhere: outside 1.7–2.9, land planes 1.6–2.9, sky 1.4–2.7, clouds 0.6–1.0. So #9's premise —
that the life keys force the model rebuild cost — does not hold: the minute rebuild costs the same with or without
life, and life now costs ~1 ms of it in exchange for continuous motion between rebuilds. The scrub.model budget
(10 ms) was already exceeded at p95 before this track; that is land/outside/sky work, out of scope here.

## How it was made

- Neon was out of quota: Codex `gpt-6.2-sol` wrote brief 1 (`d673f4a`) and brief 2 (`96e6bda`), run directly with the
  Codex CLI (outsourcerer's job wedged at start on C:'s full disk; `OSRC_HOME=P:/osrc-home` fixed the gate; Codex's
  workspace sandbox could not start a process, so it ran unsandboxed with the prompt scoped to the worktree).
- A Claude Opus subagent reviewed round 1 (pop-in, contrail scale, a 120 s freeze on scrub, a tautological test, puff
  ageing steps, a moving drift point, a vestigial meteor repeat); round 2 fixed all seven, measured in IMPL-2.
- Claude (Opus 5.5) wrote the bird flight model and painter, the briefs, and verified (bird sheet: eight kinds × two
  headings × eight frames; CI stills and perf).

## Follow-ups (not done here)

1. Front-copy membership and land depth still follow the per-minute terrain sight line: a bird or plane crossing a
   crest can step its occlusion once a minute (upper bound 27.8 px vertical extent at alpha 0.34, Haifa; IMPL-2 §6).
   Fix: carry the sight line in the track.
2. Large files predating this track: `scene/model/surface.ts` (358 lines), `world/lifeSchedule.ts` (~580),
   `scene/model/life.ts` (264).
3. `src/world/weather.test.ts:161` times out at 5 s on CI now and then (pre-existing, unrelated).
4. Model cost (#9 proper): outside, land planes and sky dominate; profile those. Low planes at an airport (Tel Aviv,
   0.4 ms of poses) could be culled on a coarse sample before the full track.
5. Bird nits from the final review: the pigeon flash and raptor pale bar ignore the sun's direction (only its
   strength); `view` rounds to whole degrees, so birds shift ~0.6 px inside the strip when a flock's height crosses a
   degree at a rebuild; `scene/model/lifeContinuityMetrics.ts` is a non-test module importing vitest's `expect`.

## Final review (Opus subagent, after round 2)

Nothing blocking: seams, scrub re-anchor, life offset (life only), culling, contrails, purity and file sizes check
out. Four bird errors fixed after it: a flock's way is now measured against its own bearing, not the camera heading
(a flock 120° off centre flew tail-first); swifts and bats bank with the eight's real curvature (192/400 samples banked
away before, 0 now); a gull holds the flock's way with a 15° sway and rolls into it (it spun 358° every 4 s before);
storks and raptors step 0.8–1.2 px a frame at 4 fps on a 9 px circle (2.7–4.4 px at 2 fps before).
