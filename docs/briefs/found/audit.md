# Data losses (writer "audit")

Read COMMON.md in this folder, then docs/design/DATA-AUDIT.md (rows and List 1). One commit each, each with a test written first and shown to fail
on the old code:
 1. List 1.1, live cloud layers: map `cloudHigh` into `CurrentWeather`, carry it in `rollForward`, pass the reading's layers (`hour: c`) at
    `atmo/weatherAt.ts:112`; mist and sky must read the same layering. Live 0/90/0 gives low 0, mid ~.9. Where the provider gives no layer, fall
    back as docs/design/CANVAS-SCENE-PLAN.md:696 says. Check every constructor of `CurrentWeather` (tests, fixtures, station correction, offline copy, worker).
 2. List 1.3, preceding-hour sums and maxima: precipitation (and gusts, M6) are sampled at stamp minus 30 min by one helper beside
    `bracketAt`, used by `weatherMix` and `wetBetween`; day edges and nulls stay right; a 0/4/0 hour peaks at mid-hour; the total over the
    minutes equals the provider's sum (assert). Find UI readers of the same values and leave the hourly cards (the hour's amount) as they are.
 3. List 1.2, event identity: `arrivals` returns `{ t, ordinal }` counted before thinning; ids, seeds and looks use the ordinal at all call
    sites; `meteorEvents` takes a fixed top rate (the catalogue's maximum, not the day's). Tests: one hour's rate set to 0 keeps id, t0 and seed of
    all events outside it; meteor peak x 1.05 keeps times.
 4. List 1.5, the moon's bright limb: the great-circle bearing from moon to sun, mapped by the local screen axes at the moon (the dome's own
    projection in `sky.ts`), true within 3 deg at the six listed times. With the sun also drawn the geometry stays true (the great circle's
    bearing, not the drawn line's); say what angle to the drawn sun results.
 5. List 1.9, only the trivial ones (wind direction null takes the nearest hour's; both-null hours take the neighbouring hour;
    `selected ?? now` at sceneLabel; `utcOf` monotonic in both DST hours with one `addMinutes`; M8 air past its ends holds the last value), one commit.
Leave contrail humidity, Kinneret, M1, M3, M5, M7 alone. `weatherAt.ts` near line 146 (the arrival ramp, `receivedAt`) and the liveLight and
forecastArrival tests change on a parallel branch: stay away from those lines.
