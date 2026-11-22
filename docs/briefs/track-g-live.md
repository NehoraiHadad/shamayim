# Track G (live) — live mode never steps the light (owner decision via the coordinator)

Branch `claude/fix-glyph-flicker-8384c3`. Another delegate is editing `src/scene/paint/**` and `src/scene/compose/**` in the
same worktree right now: do not touch those. Do not commit. Write `docs/briefs/track-g-live.REPORT.md` (what changed,
file:line, test output). Run only `npx tsc -b`, `npx oxlint` and the vitest files you touch or add
(`--testTimeout=180000`); never the whole suite.

## Measured

Live mode (`selected === null`) builds its air from `forecast.current` (`src/atmo/airInput.ts:32`, the branch after
`if (hour)`). `rollForward` (`src/domain/now.ts:18`, called in `src/App.tsx:70`) replaces `current` with the hour's row
whenever the hour changes, and each 15-minute refetch (`src/data/cache.ts` `FRESH_MS`) replaces it again. Scrub mode
interpolates between the hour rows instead (`hour`/`next`/`fraction`). So live mode steps the whole scene's light. With the
fixture at Karmei Tzur, 12:59 → 13:00 live: `shine.direct` 0.359 → 0.143, faces.right 0.507 → 0.092, faces.top
0.629 → 0.114. The same minutes scrubbed change by under 0.01.

## Decision (the owner's, via the coordinator)

There is one world state: live is the scrub timeline evaluated at now.
- Take the world from the same interpolation that scrub uses at the current minute.
- Blend `forecast.current` in at its own observation time, then ease toward the hourly rows. `rollForward` must not lie about
  the observation time: keep the real one, wherever the blend needs it.
- A rollForward or a refetch never steps the light: it changes the target, and the world eases toward it over a few minutes.
  The easing is deterministic from (data, time) with no clock and no stored state. For example, the current observation's
  weight ramps in from the moment it was fetched (`forecast.fetchedAt`) over a few minutes, then fades toward the hourly
  rows with its age. Choose it so that both the arrival of a new observation and the loss of the old one are continuous;
  state in the report exactly what you chose and why.
- Fields read straight from `current` in both branches (`windDirection`, `visibility`, `snowfall`) follow the same rule.

## Tests (measured)

A new test next to `airInput` (or in `src/world/`) using the fixture forecast (`src/test/sceneWorld.ts`, `worldInput`) and
`makeWorldBuilder`. In live mode, one-minute steps across 12:30–14:30 (two hour boundaries) and across a simulated refetch
(the same forecast with a different `current` and a later `fetchedAt`, swapped in mid-sweep):
- the change in `light.direct` and in each face light between consecutive minutes stays under a stated bound (derive it from
  the scrub sweep's own largest minute step; at most 2× that, plus 0.01);
- at the minute of a refetch, the first minute after it differs from the minute before by no more than that bound.

## Precision

Pay attention to subtleties and physical accuracy. An observation is true at the moment it was made and grows less telling
with age; the forecast's hours are the background it eases back into. Nothing in the sky or the light may jump because data
arrived. Pure functions of (data, time): no `Date.now()` in the world. No unstated approximations.

## Round 2 (review findings; append `## Round 2` to the REPORT)

1. **Arrival ramps run on now, not on the scrubbed instant.** `blendForecast` weighs `previous` at `selected ?? now`
   (`airInput.ts:138`, `world.ts:297`): scrubbed past times show the outgoing snapshot, scrubbed future times jump at receipt.
   Sample the weather at `selected ?? now`, but weigh every arrival (forecast receipt, observation fetch, satellite) at `now`
   (the app's minute, an input). Live is unchanged; scrub then eases with data arrival exactly as live does.
2. **Arrivals stamped in the scene's own timeline.** With a pinned `now` (`ui/useNow.ts`, `pinnedTime()`), `receivedAt =
   Date.now()` is never reached, so fetched data never shows. Stamp `receivedAt` from the same `now` source the scene uses, and
   make the observation's ramp run from that receipt stamp (not from the server's `fetchedAt`, which may be older or in another
   timeline). State the rule.
3. **Snow stays snow.** `hourly()` sets `snowfall: 0` (the hourly request has none), so on snow codes liquid rain fades in as the
   observation ages (`airInput.ts:88`). In the hourly rows, on snow codes (71–86) or at/below the snow temperature the existing
   code uses, precipitation is snow, not rain: derive the snowfall rate from it, and liquid rain is 0. Do not change the request.
4. **Restore the snow-raising cloud** (`world.ts:323`, `lifeDay.ts:127`): HEAD fed `max(0.1, snowfall)` while `snow.falling`;
   keep that behaviour (continuously, from the blended values).
5. **No `.current` in the scene:** `App.tsx:90` `sightingsNow(observed, now, forecast.current.cloudCover)` steps the seen clouds
   on rollover/refetch. Use the blended cover at now, and make the `BUSY_COVER` gate a ramp. A new satellite sighting set fades in
   over the same receipt ramp while the old fades out, instead of replacing it. Also `lifeDay.ts:130` reads the floored hour's
   `windAloft.high`: use the blended one. (`pickTheme` colours only the page chrome: leave it, name it in the report.)
6. **No midpoint flips of discrete fields** (`airInput.ts:44,52` `nearest = t < 0.5 ? a : b`). Everything the scene draws from the
   weather code (thunder, snow amount `CODE_AMOUNT`, drizzle fallback) is blended as its continuous derived amount; only fields
   nothing draws from may pick the nearest. `isDay` is computed from the sun, not picked.
7. **Missing values:** when one side lacks humidity or pm10, use the other side's value, never a made-up 50.
8. **Revert the satellite correction reaching 60–120 minutes into the past** (`observedCloud.ts:214`): a correction never applies
   before the observation was made. Keep only the receipt ramp there.
9. **Tests that can fail.** The fixture reading (04:30, `fetchedAt: 0`) is aged out over 12:30–14:30, so `live == scrub` is true by
   construction. Use the **Jerusalem** place and fixture (`src/test/fixtures/scene/karmei-tzur.panorama.json` is a copy of
   Jerusalem's and will be deleted: do not use it). Add: (a) a live reading at 12:50 with `rollForward` applied at 13:00, as the app
   does, and show that HEAD's code would exceed the bound (assert the old step size in a comment from a measured value);
   (b) a refresh whose `fetchedAt` is older than its receipt; (c) scrub held at 10:00 and at tomorrow 10:00 across a refresh:
   the change per minute of `now` stays within the bound; (d) a snow hour as the observation ages: liquid rain stays 0;
   (e) a pinned `now` earlier than real time still shows fetched data after the ramp.
10. **Hygiene:** `airInput.ts` is 154 lines: split it. Keep the files' original line endings (airInput.ts and airTypes.ts were
    rewritten CRLF → LF). Reuse `smoothstep` from `src/world/ridgeLighting.ts` (move it to a shared math module if needed) instead of
    a second copy. Make `Air.dustWeight` required and drop the `?? Number(dust)` fallbacks. Haze colour still steps at dust 50 and
    rain 0.5 mm/h (`airParts.ts:83`): make it continuous. State the wind interpolation convention (angle + speed, shortest arc).

## Round 3 (re-review of the model side; append `## Round 3` to the REPORT)

1. **Dust is one continuous quantity.** `air.dust` is still `pm10 >= 50` (`world/air.ts:49`) and drives `mistiness`
   (`scene/model/weather.ts:250`), `grainLayers` (`weather.ts:317`) and wear dust (`wear.ts:158`), so as pm10 eases through 50,
   mist, grains and wear jump while the sun colour eases. Drive all of them from `dustWeight` (the same smoothstep 40–60); keep a
   boolean only where nothing is drawn from it. Grains fade by alpha with fixed geometry.
2. Finish round 2 item 10 if not done: `scene/model/sky.ts:123` `dustWeight ?? Number(dust)`, `world/types.ts:178` optional
   `dustWeight`; `world/world.ts:232` duplicates `coinOf`: use one.
3. Test: pm10 swept 30→70 in small steps: mist, grain alpha, wear dust and sun colour each change by at most a stated bound per step.
