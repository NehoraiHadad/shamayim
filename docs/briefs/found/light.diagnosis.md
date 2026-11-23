# E / town-light: PR 11's follow-ups on the town (fcd96b26)

No patch (numbers come from scratch scripts that replace one step; worktree clean). Y = linear luminance of the drawn colour; L* C h =
CIELAB; "walls" = the front faces of 64 seeded receivers. 2026-11-17 fixtures unless dated.

| follow-up | verdict | cause |
|---|---|---|
| 1 far-right Jerusalem houses lighter than the ground in fog and dust | FAULT, of the ground | ground km from the place's centre, wall km from the portrait's eye |
| 2 haifa 16:30 walls near the ground's tone | PARTLY: mostly true; ~half of the drawn step is taken by the shoulder | exposure gamma + `facadeScale` |
| 3 haifa's soft-edged foreground block | PARTLY: left edge and green are data, right edge and straight sides are faults | face points discarded, 21-column palette |
| 4 Feb/Aug twilight wall hue | wall against ground TRUE; the violet cast both share is a FAULT | `diffuseSky` at clear twilight |
| 5 dome strong orange at dusk | TRUE (sunward sector ~11 deg too red) | glow lobe has the beam's colour |

## 1. The far-right houses
Jerusalem 07:00 fog, x 325: house 5.9 km from the portrait's eye; the ground painted under its foot is 0.40 km. Haze 1.00 (tone = air, Y .307)
against .42 (Y .205). Dust 12:00 (vis 3 km): wall Y .246, ground .132. The wall is right, the ground is too dark.
Own km / painted km at the feet, p10/50/90: jerusalem 1.06/1.58/4.33, haifa 1.40/4.26/10.5, tel-aviv .41/9.8/22, rosh-pina
2.18/2.80/6.30, shadmot 3.8/4.5/4.9, beit-shean 1.9/6.2/8.8, neve-zohar 2.5/4.1/11.8, ein-gedi 1.2/1.3/1.5.
`wallAir`'s cap (`wallDistance.ts:43-46`) cannot help: town mean 3.20 km, itself taken from the wrong km.

Root cause: `outsideItemKm` and `outsideRidge` (`world/outsideDepth.ts:8-35`) move distances to the portrait's eye (`beyondKm`); walls, marks and
`landBehind` use them. The painted ground does not: `faceAtY` (`scene/model/faceProjection.ts`) gives the panorama's km from the place's centre, and
`planeGeometry.ts:94-98` -> `planeLight.ts:28` make the veil of it. And `drawnTerrain` (`world/outside.ts:430-434`) puts the place's own ground
in place of the near line while `sightAt`/`groundAt` stay the panorama's, so `world/face.ts:81` drops the profile points above the drawn line.
Columns left with no point (they get the crest x .35 ramp): haifa 40/126, beit-shean 29, neve-zohar 21, rosh-pina 11; others
clamp to .40 km below the last point (x 275-365 at Jerusalem).

Fix, general: one veil distance for a foot and the wall on it.
 A. planes of an outside view: km = beyondKm(frame, baseKm, km sin az, km cos az), as `outsideRidge` already does for the crest;
 B. inside the place's own ground: km = its row (`rowKm`), blended by `nearLine.own[]` (the own share the near line already carries).
Read it in `planeGeometry.ts` for the veil only (albedo keeps its measured distance). Afterwards `townGroundKm`/`wallAir`'s cap can be deleted.
Prototype (B with a log-distance kernel over the rows' feet, 14 x 5 px). |haze wall - haze ground at the foot| p50/90/99; the last column is
the largest step of the ground's veil over 3 px:

| case | before | A+B | step before -> after |
|---|---|---|---|
| jerusalem 07:00 fog | .000/.085/.580 | .000/.000/.000 | .29 -> .00 |
| jerusalem 12:00 dust | .020/.328/.733 | .000/.011/.021 | .36 -> .00 |
| jerusalem 15:30 | .163/.464/.615 | .028/.124/.195 | .42 -> .05 |
| haifa 07:00 fog | .105/.565/.570 | .000/.001/.025 | .57 -> .00 |
| haifa 15:30 | .299/.456/.545 | .024/.084/.182 | .25 -> .06 |
| haifa 16:30 | .070/.338/.338 | .022/.075/.156 | .21 -> .05 |
| tel-aviv 12:00 dust | .724/.735/.735 | .004/.179/.404 | .14 -> .08 |
| tel-aviv 15:30 | .383/.697/.733 | .033/.137/.259 | .03 -> .08 |
| rosh-pina 07:00 fog | .065/.519/.533 | .000/.003/.013 | .40 -> .00 |
| rosh-pina 10:00 | .076/.127/.142 | .012/.029/.046 | .11 -> .02 |
| shadmot 12:00 dust | .268/.298/.341 | .000/.000/.002 | .32 -> .00 |
| ein-gedi 12:00 dust | .002/.004/.008 | .000/.001/.001 | .49 -> .00 |
| beit-shean 12:00 dust | .668/.716/.724 | .019/.319/.568 | .73 -> .13 |
| neve-zohar 16:00 | .054/.080/.119 | .034/.078/.095 | .28 -> .09 |

A alone settles fog but overshoots in clear air (own/painted at Jerusalem .33/.48/.89, 15:30 p50 .232); B alone leaves the steps outside the portrait.
Price: where the air is hazy the ground under a town gets lighter (Y at the feet, p50: haifa 15:30 .110 -> .178, 16:30 .029 -> .044, tel-aviv
dust .123 -> .242, shadmot dust .198 -> .243). That is the real air path of a portrait seen from km away; judge it on stills, since it changes every
town still. Risks: `ground.ts`, `landVegetation.ts`, `vegCropEvidence.ts`, `landDust.ts` share `faceAtY` (change only the veil); cloud shadows read
the litField haze; `planeGeometryKey` must hold the new km. Test, 8 places x fog, dust, 15:30, 16:30: p90 <= .15 of that difference
(before up to .735; my kernel still fails at tel-aviv and beit-shean, so the true `own` field is required).

## 2. Haifa 16:30 walls against the ground
Radiance wall/ground p10/50/90: 1.30/1.42/1.66 (albedo .47 against .157; a wall sees half the sky). Drawn Y ratio 1.09/1.11/1.13
with the shoulder, 1.14/1.19/1.29 without it. Where it goes: exposure r^.6 (`landRadiance.ts`) 1.42 -> 1.23, haze .08 -> 1.19, `facadeScale`
(`buildingExposure.ts:20-27`) -> 1.11. L* wall minus ground, with / without the shoulder: 15:30 2.7/3.0, 16:00 1.8/3.1, 16:30 1.3/2.2, 17:00 .9/1.5;
clear 16:30 .6/1.1; jerusalem and tel-aviv 16:30 1.3/2.2; rosh-pina 1.4/3.1; shadmot 1.4/2.6; ein-gedi 1.0/1.6.
Truth: at dusk a 1.4x radiance step is real but weak, so walls do merge; nothing is inverted. The shoulder (PR 11, on purpose)
compresses a step that the albedos justify. General fix (after 1): measure the excess above the sky-lit plaster's own level,
`excess = y - streetY * max(1, (rhoWall/rhoGround) * (view share)) ^ EXPOSURE_GAMMA`, so only facades brighter than that are softened. Gain at
most +.9 L* (haifa), +1.7 (rosh-pina). Test: median wall/ground Y at 16:30 in 5 places >= .95 of the uncompressed ratio. Risk: the 9/255
neighbour bound (`outsideNeighbours.test.ts`). Note fault 1's fix lightens the ground under the far rows: walls must then use their own km too.

## 3. Haifa's foreground block
Still px at 15:30, y 842: x 260 (88,89,87), x 290 (62,67,58), x 350 (77,84,72), x 440 (80,87,75), x 470 (85,91,81), x 500 (84,87,81), x 560 (87,87,85). The same at
16:30, 21:00 and 2026-03-15, so not light or weather. Two steps add up, both from the same km: veil haze .13 -> .01, and albedo at the foot row
(112,110,108) at 1.2 km to (92,97,86) at .40 km, because `landPalette.ts` (`distM < 700`, ownW <= .55) blends ground under 700 m to ONE sample
of the place's centre (WorldCover tree, (76,86,68), L* 35). The local 9-point grid says L* 35-38 at .4 km on every ray: the green is data.
Left edge (ref x 113-140; km at y 124 is 1.5, .72, .40): the hillfoot is real (DEM -36 m at 110, +20 m at 230), but the edge is
vertical because the palette has 21 columns of 18.75 px (`PALETTE_COLS`) and the veil takes the nearest 3 px column.
Right edge (x 235-250): FAULT. From x 245 the columns have no face points, so the ramp gives .56 km at y 124 and a 46.6 L* albedo one row up,
although the DEM's .4 km ground is right there (x 245: +3.3 deg at .4 km, 8.4 deg at 1.4 km; the drawn crest is the place's own line, not the DEM's).
Fix, data-driven: in `world/face.ts` `visible()` map the profile onto the drawn line where it was replaced (y' = crest + (y - crestDEM) (foot - crest)
/ (foot - crestDEM)) instead of dropping points; fault 1's fix removes the veil half (largest step .25 -> .06). For the albedo half feed `sampleLocalField`
at the ray's east/north under 700 m rather than one centre sample, and fade with km. Derived, not prototyped. Test: no face column empty in an outside
view (40/126 haifa now) and the foot row's km steps < x1.3 between neighbouring columns.

## 4. Feb/Aug twilight hue
These dates have no forecast in the fixtures (cloud 0, vis 30): clear air. Hue of the walls p10/50/90 against the ground:
haifa 02-15 17:15 (sun 1.2 deg) 291/295/311 vs 292; 08-15 19:15 288/299/309 vs 288; jerusalem 02-15 17:15 290/294/310 vs 291, 17:45 304/305/317 vs 304.
Rosh-pina 08-15 19:30 (sun -2) b* -12.8 walls, -7.1 ground. Medians match within 1-11 deg. The outliers (45,39,53 beside 38,39,62) are
facades that meet the sun's red beam; rosh-pina's gap is brown soil under a blue sky, plaster being near neutral. TRUE, it follows data.
What both share is wrong: clear-twilight irradiance is xy (.22,.20) at +1.3 deg and (.245,.199) at -5. No blackbody passes (.240,.234); measured daylight
there is roughly x,y .26-.30 (Hernandez-Andres 2001, Spitschan 2016; from memory, not re-read). The same file's other sky disagrees:

| clear | `diffuseSky` (walls, land) xy | `skyReflection` (glass, accent 0), cosine integral xy |
|---|---|---|
| haifa 11-17 16:30 (.8 deg) | .225,.201 | .315,.267 |
| 02-15 17:15 (1.2) | .221,.200 | .304,.273 |
| 08-15 19:15 (1.4) | .220,.202 | .303,.275 |
| 02-15 17:45 (-4.9) | .242,.196 | .287,.226 |
| 11-17 16:30 as forecast (cloud .87) | .291,.298 | .299,.300 |

Cause: `landSkyIrradiance.ts`, `diffuseSky`'s `integrated` (mid + top x DOME.zenith + glow) leaves out the painted warm horizon (246,157,102),
which `skyReflection` has (`.16 * (horizon - mid)` and its low lobe). Fix: one basis; `diffuseSky`'s chroma = the cosine integral of the basis
`skyReflection` samples (precompute the low lobe in DOME), luminance kept as now, so exposure does not move. Cloudy hours barely change. It recolours all
clear twilight land, so agree it with the sky-colour topic. Test: |xy difference| < .03 at sun +1.4 and -5, clear (now .10 and .05).

## 5. The shrine dome at dusk
Haifa 16:30 (cloud .87, sun .78 deg): model mean (106,68,55) L33 C21 h44, sunward peak (137,65,53) L37 C37 h36; still median (92,66,58) L31 C14 h43;
by day 15:30 (146,133,102) C19 h91. It stands out because the hill behind it is grey.
Which light: direct beam Y 0.0000 (deck); all of it is reflected sky. In white metal the peak is (133,71,82) h12, so the light is red: the sunward low
sky carries Y 3.4 against 1.4 away (the `forwardAccent 5.7` lobe; with 0 it is 1.9 and [1.48 .84 1.12] instead of [2.94 .47 .55]).
Truth: gold (measured F0 1,.766,.336) mirroring the PAINTED sky's pixels gives h61 C19 (whole sky), h57 C20 (sunward half), h47 C30 (the low glow) at the
dome's luminance. So a red-orange dome is true; only the sunward sector is 8-11 deg redder than its own painted glow (mean h44 vs 57-61).
Cause: the lobe's colour is `light.afterglow.rgb` = `afterglowColour` (`world/afterglow.ts:20-25`) = the direct beam [1,.17,.0003], blue zero, not the sky it lights.
`GOLD_F0` (`metalLight.ts:14`, [1,.75,.28]) vs measured: mean h 44 -> 40, i.e. a little redder at dusk and greyer by day; negligible, use the
measured value as data. Floodlights are 0 until -6 deg. 17:00: mean (66,40,40), peak h26.
Fix: in `skyReflection` light the lobe with the painted low sky (horizon colour, or `sky.ts` at the sun's azimuth) and keep the beam's colour only on the beam lobe.
Test: the peak sector's hue within 8 deg of F0 x the painted low sunward sky at 16:30 (forecast and clear). Glass already uses accent 0.

## Not proven
No still of any fix here was rendered. Fault 1 uses a kernel, not the true `own` field; fault 3's right edge is derived. Feb/Aug are clear-air defaults, not
those days' weather. Chromaticity references are from memory.
