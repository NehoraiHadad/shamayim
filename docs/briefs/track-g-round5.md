# Track G round 5 — live vs scrub is an explicit mode, never `selected === now`

Branch `claude/fix-live-mode-8384c3`, cut from main 7ae0286. Do not commit. Write `docs/briefs/track-g-round5.REPORT.md`.
Run `npx tsc -b`, `npx oxlint` and only the vitest files you touch or add, plus `src/world/liveLight.test.ts`,
`src/world/world.test.ts`, `src/scene/react/sceneLabel.test.ts` and `src/atmo/airInput.test.ts` (`--testTimeout=180000`).
Do not touch `src/world/field/**` or `src/world/cloudField.ts` (track D owns them). Context: `docs/briefs/track-g-live.md`
and its REPORT (live is the scrub timeline evaluated at now).

## Defect (measured in review)
The scene treats "the picked minute equals now" as live:
- `src/world/world.ts:49`: `cloudsSeen: selected && selected !== now ? 0 : …`
- `world.ts:157`: `isNow = at === now`, which gates satellite sightings (`:194`) and thunder (`:204`)
- `src/App.tsx:93,95`: the same test
- check whether `src/atmo/airInput.ts:46,53` (`at === now`) has the same meaning or is only a sampling shortcut

Failure: at 13:50 the user picks the 14:00 slot and holds it. At 14:00 the clock reaches the held minute, so for one minute
satellite banks appear and lightning fires. At 14:01 both vanish. Nothing eases.

## Fix
The mode is explicit. Live means `selected === null`; any selection is a preview (scrub), whatever minute it names.
- Derive one `live` flag from the mode in one place and pass it where needed. Never compare a picked time to `now`.
- Live-only features stay live-only: satellite sightings (`seenClouds`, `cloudsSeen`) and drawn thunder.
- Check `src/ui/scrub/useSceneTime.ts` and the "now" button and release paths. Returning to now must set `selected` to `null`.
  It must never set a time equal to now. Say what you found.
- Keep the weather sampling unchanged: the world is still sampled at `selected ?? now`, with arrivals weighed at now.
- Live ↔ preview switching is a user action, so features may appear or disappear at that moment. That is not a data jump.
  Within a held preview nothing may change as the clock passes the held minute.
- `at === now` used only as a numeric shortcut (the same instant) may stay; rename it so it does not read as a mode.

## Tests
- A preview held at 14:00, built at now = 13:59, 14:00 and 14:01 with satellite sightings and a WMO 95 hour: identical
  `seenClouds`/`cloudsSeen`, thunder weight and light across the three builds.
- Live at 14:00 with the same data shows the sightings and thunder.
- `App`-level (or the hook that computes them): the sightings and `cloudsSeen` follow the mode, not equality with now.

## Precision
Pay attention to subtleties. One mode flag, from one source, no string-equality inference anywhere. No unstated approximations.
