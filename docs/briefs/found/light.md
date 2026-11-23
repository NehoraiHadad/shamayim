# Town and ground light (writer "light")

Read COMMON.md, light.diagnosis.md and wall-distance-review.md in this folder first. In this order, separate commits; measure before changing; if a
piece turns out true or not worth its cost, say so with numbers instead of forcing it.
 1. Fault 1 (far-right Jerusalem houses in fog and dust) and the second-model review of the twilight rule: one veil distance for a foot and
    the wall standing on it. Planes of an outside view take `beyondKm` (A), and inside the place's own ground its row's km (B), blended by the
    near line's true `own` share; read for the VEIL only in `planeGeometry.ts` (albedo keeps its measured distance; `planeGeometryKey` holds the new
    km; crop evidence, dust and vegetation unchanged). Then remove the `wallAir`/`townGroundKm` cap (`wallDistance.ts`): its review found six faults
    and its reason goes once ground and walls agree. Prove that the twilight case it was made for (walls paler than their ground between
    sun +15 and -18 deg) stays fixed without it, in both styles (the drawn hand skipped the rule). Test as in the diagnosis: |haze wall - haze
    ground at the foot| p90 <= .15 at 8 places x fog, dust, 15:30, 16:30 (say where geometry cannot reach it), no step over .12 in the ground's
    veil over 3 px.
 2. Fault 3 (haifa's foreground block): `world/face.ts` `visible()` maps the profile onto the drawn line instead of dropping points; under 700 m
    the albedo is sampled along each ray at its own east/north, faded by km, and the 21-column palette is interpolated or refined so no
    vertical edge stands. Test: no face column empty in an outside view; the foot row's km steps < x1.3 between neighbouring columns.
 3. Fault 4 (violet clear-twilight sky light): one basis for `diffuseSky` and `skyReflection` (chroma = the cosine integral, luminance kept).
    Test |dxy| < .03 at sun +1.4 and -5 deg, clear.
 4. Fault 5 (dome lobe): light the lobe with the painted low sunward sky, beam colour only on the beam lobe; `GOLD_F0` as measured data.
    Test: peak sector's hue within 8 deg.
 5. Fault 2 (haifa 16:30 walls): only if still > 1 L* off after 1; else close it with numbers.
Others: "town" edits `outsideView.ts`, `lookOf`, `fabricOf`, `heightAt` and `outsideShape.ts`'s trimming; "perf" moves faces out of `buildingLight.ts` and
adds compile hints; "sky" edits `world/afterglow.ts` (`pinked`) and `sceneLight.ts`. Keep your hunks there minimal.
Report modelCold and plane geometry ms before/after (must not grow by more than 3 %).
