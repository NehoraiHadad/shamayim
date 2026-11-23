# D / sky-colour: yellow-grey skies, the dust arc, the 16:30 smudge (base fcd96b26)

Patch: `sky-colour.patch` (prototype, uncommitted; `src/scene/paint` hunks are small, re-apply by hand). Pictures, pairs before/after:
`sky-colour-1.png` haifa 15:30, neve-zohar 16:00 (real) | haifa 16:30 real, drawn | ramon dust real, drawn. `sky-colour-2.png` haifa 03-15 07:00, 12:00, 17:30 (real, drawn) |
jerusalem 07:00, rosh-pina 10:00 (real). `sky-colour-3.png` FINAL drawn: 03-15 07:00, 17:30 | 11-17 16:30 haifa; and tel-aviv 16:30 real.
1 and 2 predate the last two tweaks (tower through=1, drawn `lowLight`); their drawn "after" panels are superseded by 3.
Numbers come from the real painters run on a software canvas at 375x428 css px, no browser; that render matches the base stills by eye.
L, C, h = Oklab; Duv = distance from the black-body locus (+ green); lit/body/shade = the sheet's three tones.

## Verdicts
| fault | verdict |
|---|---|
| khaki/straw/olive clouds at haifa 15:30, neve-zohar 16:00 | **fault** (general: every Nov place at sun 6-13 deg, 07:00 too; 2-52 % of the sky's pixels). Part true: a low sun IS warm, but only on cloud it reaches |
| "lit" darker than the body on Nov afternoons | **fault**, same line (Nov 14:00: lit L .67 v body .82; all sheets 14:00-16:30. Not everywhere: 03-15 low sheets have dark bodies, lit is above them) |
| dust / AOD as cause in November | **no**: dustWeight 0, vis 12-17 km |
| haifa 16:30 dark red smudge | **fault**, same line |
| ramon dust: brown arc | **fault**: not a drawn layer; it is a HOLE in the mid deck |
| ramon dust: brown cloud blocks | **fault**, same lit line (lit #907553) + the deck is not seen through the dust |
| dust sky itself brown (top #5E4424) | partly true in hue (h 71-85 is right for dust), too dark; owner UI palette for white ink, not touched |

## 1. The yellow: physics or fault
Inputs haifa 15:30: sun 11.95 deg, m 4.73, vis 12.4 km, AOD550 .456; low Sc cover .60, mid .85, high .32; light.direct .027, diffuse .94.
neve-zohar 16:00: 6.96 deg, m 7.77, vis 16.8, AOD .332; low .44 under mid .82; direct 0. Truth = spectral sun (ASTM E-490 20 nm,
Rayleigh, aerosol Angstrom 1.3, 300 DU ozone, CIE 1931 Wyman fit):
| sun / AOD | truth | app `sunLight` | app's own 3-band T encoded linear->sRGB |
|---|---|---|---|
| 12 deg / .456 | #ffbb67 3008 K Duv +.0024 h70 | #ffe579 3855 K **+.0187 h96** | #ffc16e +.0037 h73 |
| 7 deg / .33 | #ffab46 +.0027 h67 | #ffd645 **+.0202 h92** | (same shape) |
| 20 deg / vis 30 | #ffddb1 4311 K +.0022 h75 | #fff9dd +.0069 h97 | |
Same truth beam at the cloud, 12 deg: .5 km 3341 K, 1 km 3646 K, 4 km #ffe7c7 4805 K. Sunlight is never greener than about Duv +.003.
An overcast/broken deck lies near the daylight locus, CCT about 5500-7500 K (Condit & Grum 1964; Hernandez-Andres et al. 2001; Lee &
Hernandez-Andres 2005: from memory, not re-read). Our body #bdc4cc = 7256 K, Duv +.0038: true. Our lit 5722 K, Duv **+.0098**, 12 % darker: not.
Energy check, haifa 15:30: beam/sky on the low Sc = 7.62 x T(z) x above .152 / diffuse, so its lit end may differ from the body by only
dL ~ .01 (6719 K); on the mid deck (above .979, 4 km) by dL ~ .07, cream. So warm cream on high/mid lit edges is true; khaki is not.

## 2. Cause, `src/scene/model/cloudLayers.ts:60` (towers: `cloudCells.ts:134`)
`lit = mixRgb(body, mixRgb(beam, behind, fade), light.sun || under > 0 ? 1 : ...)`, four errors:
- a. A light is *mixed toward the sky behind* (`behind` = `skyStops` mid, #53647a, kept dark by `skyLight.guard` for ink contrast; not airlight) at
  `.85 air.fade(3 km)` = 52 % here, while the body gets no fade by day. Result replaces the body, so it is DARKER than it. The body's own sky light
  is dropped. Yellow h96 + slate h255 are both a<0 in Oklab: the mix runs through green.
- b. The amount is 1 for any sun: `above` (share through upper cloud, .152 for the Sc) and beam strength are ignored.
- c. Beam colour is `sunLight` (`sceneLight.ts:45`), the disc's per-channel `1-exp(-4T)` map: hue 70 -> 96. Right for the disc (owner, TASKS 570), wrong as illuminant.
- d. Beam taken at the ground, not at the cloud: too much haze.
Then `paint/cloudLook.ts` `openLook` keeps >=45 % `lit` over every open deck, and the far unresolved rows of the low deck too: that is the straw band.
Replace one step at a time (lit tone; body #bdc4cc L.82):
| | haifa 15:30 low | neve-zohar 16:00 low | haifa 16:30 low |
|---|---|---|---|
| as is | #a2a492 L.71 h113 +.0098 | #aca481 L.72 h97 +.0105 | #a25e61 L.56 C.089 h18 |
| a. no mix with behind | #ffeda4 L.94 | #ffe181 | #ff745a |
| c. linear beam | #a3998d h72 +.0018 | #ad9580 -.0015 | #a16161 |
| d. beam at the cloud's height | #a29c93 h80 | #ad9b87 | #a16763 |
| b. x above | #b9bfc3 L.80 h236 | #babfbf L.80 | #aea1a9 L.72 |
| a+b+c+d | #c7c8c8 L.83 +.0033 | #c9c7c3 L.83 +.0029 | #c5adab L.77 |
c alone cures the green but not the dark; b alone cures the low deck but not the mid (above ~1): all four are needed.
Not a cause: body and shade (neutral blue-grey), `addLight`, cloud-field tone, halo/glows, dust.

## 3. haifa 16:30 smudge
Layer-out at css (175,115): all #925f67; without high or mid unchanged; without **cloudSheet.low** = clear sky #232d4a. It is the low Sc: a
core-of-column node with alpha 1.000, tone **.078** (almost fully `lit`) where neighbours stand at tone .487-.755 (left pixel #a2878f, above #a0868f, right #897581).
Lit = #a25e61: sun #ff2b00 (ground beam at .78 deg) mixed with indigo `behind` #2c3759, weight 1. The Sc at .6 km is under cover .76 and at m ~ 32 with
AOD .4 the truth beam there is ~0 (T650 ~ 5e-5); the mid deck at 4 km stands above most of the haze. So warm colour on mid/high is true, red on this low patch is not, darker is never.
Drawn: #9b6469, same layer. After: smudge #ada0a8 L.72, left .76, above .75, right .68 (before: .54, .65, .64, .59). Not gone: a faint pink, 4 % darker than its left, is still visible (sky-colour-1, row 2).

## 4. ramon-crater 15:00 dust
Arc at css (0-100, 40-170). Leave-out: without high unchanged; without low unchanged; without **mid**, the whole sky is brown (#654d31); sky alone at the arc
#634b2f / #6f5535, i.e. arcTop #806d55 is the dust sky seen through a gap in the mid As (alpha 0 at the node; deck nearby alpha 1). No halo, aureole, cell, shaft
or dust sheet. (Halo: impossible in dust, none drawn; a dust aureole would surround the sun, whose x is 268; the arc is at the upper left; the sun glow has alpha 0 there.) Cause: the
deck is drawn at full alpha in its clean-air body #bdc4cc L.82 over a sky that already carries the dust as airlight (`skyLight.ts` pm10 mix).
CANVAS-SCENE-PLAN 1054 says dust fades clouds; the by-day `base` (`cloudLayers.ts`) bypasses `tones.body`'s fade. Truth: Koschmieder tau550 = 1.94 at vis 3;
through it T = exp(-tau(1-e^(-z/1.5)) m): mid deck .16 overhead, about .03 at 30 deg. Gap and deck must be almost the same colour.
Before: gap L.55 v deck L.80-.81. After: .47 v .50-.51, no arc. The mid deck all but vanishes into the dust; the low Sc stay visible as paler buff clouds (no brown blocks), the far low deck is gone.

## 5. Fix (recommended, all three; 1+2 are one change)
1. `sceneLight.solarBeam(alt, air, zKm)`: Rayleigh x e^(-z/8.4), haze x e^(-z/1.5) (default 0 = unchanged). `sunLight` (disc, glow, land light colour) untouched.
2. New `scene/model/cloudBeam.ts`: `cloudBeam(world, layer)` = beam colour at base+v/2 (linear T, one sRGB encode, existing white adaptation .25-.70 kept), ratio =
   7.62 (land's `SUN_TO_SKY`) x strength/REF_BEAM / [IES diffuse (.8+15.5 sqrt(sin h)) / value at 38 deg x (1 + 1.25 diffuse)]; `relayed` = .35 x litUnderside (the sunlit upper cloud lights the lower: the only tuned number,
   the knob for how red a sunset is). `litTone(body, light, through, fade)` = mean of body and beam by shares in linear light, r/(1+r), topped up so it is never darker. Used by sheets (through `above`) and towers (through 1: `litA` already has it).
   `pinked` (afterglow) is shared so the colour is continuous across sunset. Moon branch unchanged.
3. `cloudSheetMath.dustTransmission` per row -> optional `cloudSheet.through` (in key) -> `paint/throughAir.ts` scales the finished raster's alpha in both hands. Only `dustWeight > 0`; clean air: absent.
   Alternative 3b rejected: scale `alpha` in the model: breaks `deckOpenness` and the detail grain (prototyped, gave scraps). Alternative for 1-2: change `sunLight` only (cures hue, leaves dark lit and the smudge); rejected.
Also one painter constant, `drawn/light.ts lowLight` .08-.30 -> .18-.36: it reads the lit tone's warmth against the body, and true lit tones are warmer by day (else 03-15 07:00 drawn loses its puffs).

## 6. Before -> after (share of sky pixels with T<6400 K, Duv > +.006, C > .008: "olive")
Nov 17, real (drawn in brackets where it differs a lot):
| place | 07:00 | 10:00, 12:00 | 15:30 | 16:00 |
|---|---|---|---|---|
| haifa | .188->.000 | 0 | .239->.000 | .474->.000 (.518) |
| jerusalem | .151->.002 | 0 | .128->.000 | .443->.000 (.530) |
| tel-aviv | .203->.001 | 0 | .090->.000 | .523->.000 (.587) |
| rosh-pina | .167->.003 | 0 | .073->.000 | .189->.000 (.378) |
| shadmot-mehola | .168->.003 | 0 | .186->.000 | .314->.000 (.534) |
| ein-gedi | .144->.003 | 0 | .019->.000 | .378->.000 |
| beit-shean | .163->.002 | 0 | .099->.000 | .269->.000 |
| neve-zohar | .159->.001 | 0 | .017->.000 | .270->.000 |
haifa 03-15: 06:30 .654->.008, 07:00 .036->.000, 10:00-16:00 0, 17:30 .025->.000. Dark-red share at 16:30: haifa real .028->0, drawn .148->0; tel-aviv .095->0.
Low-sheet lit at 15:30/16:00: L .71 (dL -.107) -> .83 (dL +.01), mid #dcdad3 L.89 Duv +.004. rosh-pina 10:00: lit #c8d5e2 -> #e9eae9. Mean sky L (Nov, real): 10:00 +.01-.03, 12:00 +.01-.03, 07:00 and 15:30/16:00 +.02-.06; 16:30 +.10 (haifa .579->.684, tel-aviv .626->.733).
03-15: -.006 (17:30) to +.03. Drawn olive shares for Nov/03-15 were measured before the drawn `lowLight` retune; re-measured after it only at 03-15 07:00, 12:00, 17:30, 11-17 16:30: 0-.001.
10-minute series haifa, lit low (= lit mid on base). Base hue 238 234 228 219 201 183 163 138 122 113 106 102 95 78 42 18 (14:00..16:30), L .67 -> .72 (15:40) -> .56, dL to body -.10..-.21;
largest steps 25 deg (chroma ~.01) and 36 deg (16:10->16:20). After: low L .83 (14:00-16:00) .82 .82 .78 (16:30), dL +.002..+.011, chroma <= .02 (its hue turns 253->328->27->3 but that is grey);
mid L .87 -> .89 (15:30-16:00) .88 .86 .82 (16:30), hue 243 -> 96 -> 64 through grey, C <= .045; steps <= .02 L to 16:20, then .04. 16:30->16:40 low L .78 -> .36 (base .56 -> .36):
pre-existing (lit falls to the night body), NOT fixed, and the drop is now larger because 16:30 is paler.
Towers (03-15, top/lit, body/side, shade): 10:00 #e5e7e7/#a3adb8/#475461 -> #ededeb/#a4aeb8/#495460; 14:00 #eaecec/#919ba7/#414d5b -> #f0f0ee/#919ba6/#424d5a; 12:00 #e1e4e5 -> #eaeae9; 16:00 lit #e5e6da (h108) -> #eee8db (h86);
17:30 #ecba6f/#bfac90/#4a5159 -> #e3c5af/#b9afab/#474e57. Hue is continuous in both; no jump.

## 7. Test that fails before, passes after
`src/scene/model/cloudBeam.test.ts` (in the patch; haifa 15:30+16:30, neve-zohar 16:00, ramon dust): lit L >= body L and no hue 92-240 at C > .02; beam hue 70+-6 at 12 deg while the disc stays; dust `through` present (mid < .25), absent in clean air.
Base values violate it (dL -.107, h113). Run: 4/4 pass; 47/48 in 9 related files (cloudCells, sheetLook, sheetContinuity, sceneLight, afterglow, paint, drawn); the one failure is `cloudSheet.test` "maintains cover" timing out at 30 s under load: not shown to pass, needs CI.
After the last tweaks only cloudBeam, cloudCells, drawn and cloudSheetLook were re-run (20/20). "Fails before" is shown by base values, not by running the file on base (it imports new modules).

## 8. Risks / not proven
- Owner taste: the all-red 16:30 becomes peach/cream/grey; knob `RELAYED`. Sunset *bodies* stay daylight grey at sun 0-3 deg (`day` ramp -8..3, body not lit by the beam): follow-up, not done; it now shows more (mean L +.10).
- Not changed: other users of the skewed illuminant (`sky.ts:155,170`, `rays.ts:108`, `shimmer.ts:33`, `theme/skyAir.ts:20`, `world/light.ts:131`, horizon glow). They may carry the same green-yellow; a later topic.
- Cost: cloudBeam once per layer, litTone once per cell, throughAir one multiply per raster pixel in dust only; not profiled in a browser.
- Dust tint amount is checked on one node set; dust by night and a dusty deck with city light were not looked at; dust sky is still darker than truth (UI palette). One dust case only (forced pm10 400, vis 3).
- Software canvas, 1x; no CI stills yet: needs the real haifa/tel-aviv 16:30 + ramon dust stills on the final tree. ESLint could not run (no config found). Full suite not run (brief).
