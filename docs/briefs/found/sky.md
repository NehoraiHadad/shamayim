# Sky colour and dust (writer "sky")

Read COMMON.md, sky-colour.diagnosis.md and sky-colour.patch in this folder first.
Do the recommended fixes 1+2 (cloud beam at the cloud's height, lit tone in linear light, never darker than the body) as commit 1 and 3 (clouds
seen through dust) as commit 2, with the diagnosis's tests. Also solve, physically and in general, what the diagnosis left open (measure
first; if one is true or not worth it, say so with numbers):
 a. the faint pink patch left at haifa 16:30 (low Sc, sun .78 deg): a low cloud under cover .76 whose beam is ~0 at its height must not
    differ in hue from its neighbours;
 b. the 16:30 -> 16:40 drop of the low lit tone (L .78 -> .36): lit falls to the night body in ten minutes. Trace which function steps
    (the day ramp -8..3 and a body not lit by the twilight sky) and make the sheet's tones follow the sky's own light continuously through
    sunset and civil twilight. Test: no step of L above .05 per 10 min between sun +5 and -8 deg, in clear and broken cover;
 c. haifa 16:30 gets paler (sky mean L .58 -> .68). Check the warm light the sunlit upper deck relays against physics: at sun < 3 deg the beam
    at 4-9 km still carries red/orange. Replace the tuned `RELAYED = .35` by a derivation (solid angle and albedo of the lit deck above), so
    a sunset is as warm as the data says, no more and no less. Report the mid/high lit tones from 15:30 to 17:00;
 d. dust sky darker than truth: only report it; the UI palette (white ink contrast) is the owner's.
The drawn hand's `lowLight` constant: prefer removing the dependence on an absolute warmth threshold over re-tuning it; say what it does for
2026-03-15 07:00. Another writer, "clouds", edits `cloudCells.ts` (tower aspect) and `cloudSheet.ts` (outline): keep your hunks there minimal,
colour only. `throughAir.ts` serves both hands: it belongs in `paint/shared/cloud`.
Cost: report cloudBeam/litTone ms per layer and the dust multiply; clean air must take exactly the old raster path.
