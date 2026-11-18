# Scene 2.5D: design plan

Status: advice for the spike on `claude/scene-2-5d-spike`. `ATMOSPHERE.md` stays the rendering contract; this plan
adds to it and names the two places where it needs an amendment (a third cloud layer, a new motion verb).

## 0. What the stills say today

`qa/25d/before-0640.png`, `before-1140.png`, `before-1625.png`: the two ridges are one flat tone each at every hour.
Only the sky and the disc say what time it is; cover the disc and dawn and dusk are the same picture mirrored in
nothing. That is the gap 2.5D should close. Everything else (flat fills, soft rolling line, tiny marks) is the identity
and stays.

Rule for the whole plan: **3D maths decides where a tone goes; the tone itself is a flat colour.** No textures, no
normal-mapped shading. *Amended 2026-11-18 by the owner after seeing the spike on the phone: the light's lower edge
and the rim are soft (a static blur); only the skyline stays a hard drawn edge.*

## 1. Sun geometry (read this first, it shapes the rest)

- **East is right, west is left.** `sunPath.ts`: `RISE_X = 322`, `SET_X = 53`; the 06:40 still has the disc on the
  right ridge, 16:25 on the left. The viewer therefore faces **north**, and the true noon sun (due south) is *behind
  the viewer*. RTL does not flip geography.
- **The section is exaggerated.** Near layer: 24 km over 375 px (64 m/px) against a few hundred metres over ~86 px:
  roughly 6-10x vertical exaggeration; the far layer more. Metric shadow lengths from the real elevation angle would
  be 6-10x too long for the drawn hills. Shadmot Mehola has no elevations at all.
- **Decision: light in drawn space.** One directional light for the whole scene, pointing from the valley centre
  (`centerLeft`, `centerY`) to the drawn disc (`sunAt`). The disc is already placed by real rise/set times and real
  noon height, so side, order and height are true; only lengths are in picture units. It works identically for
  sampled places and the hand-drawn valley, and the lit flank can never disagree with the disc the user sees.
- **Slope** comes from the drawn points (`nearPoints` / `farPoints`), not from metres, for the same reason.
- **Azimuth vs the section.** The in-section part of the sun vector is `cos(el)·sin(az)`: strong at rise and set
  (November rise az ~114°, sin = 0.91), zero at solar noon. The out-of-section part points south, toward the viewer's
  back: it lights the faces we look at evenly.
- **What noon looks like.** No lit side and no shadow side. Both flanks of a hill carry the same thin crescent, the
  flat valley floor and flat crests are the lightest land, colour is neutral (no warmth), and both layers get a small
  even lift (winter noon, sun 38° high and behind us: up to +0.03 oklab L; summer noon, 81°: about +0.01). Noon is the
  calmest, lowest-contrast picture of the day, and it must be visibly *symmetric*.
- Summer rise/set azimuth swings north of east/west (az ~62°): the even lift goes to zero and the rim (below) gets a
  little stronger. Optional refinement, not for the spike.

## 2. Sun lighting on the ridges

### Shapes (per layer: base + at most two more tones)
1. **Base** is today's fill, untouched (`--ridge-far`, `--ridge-near` through the haze mix). It is also the shadow
   tone: the silhouettes are already dark, so lighting only ever *adds* light. No separate shade fill.
2. **Lit crescent.** On slopes that face the light, a flat shape hugging the ridge line: top edge is the ridge, bottom
   edge is the ridge moved down by `d(x) = D · clamp(n·L, 0, 1)`, smoothed so it tapers to a point at the crest and at
   the foot. `D` = 16 px near, 9 px far. Hard edge, same Catmull-Rom smoothing as the ridge. It should read as one
   brush stroke of light per flank, not as shading.
3. **Rim.** A 1.25 px non-scaling stroke on the skyline: (a) on lit crests, (b) on the backlit skyline within ~70 px
   of the disc, whichever way it faces. Only when the sun is low (full below ~6°, gone by ~15°, judged by daylight
   fraction if elevation is not to hand). Alpha at most .45.
4. **Terminator at low sun.** A lit point must also see the sun: walk the profile toward the sun and drop the crescent
   where a higher crest blocks the ray (horizon test over <=80 points). Result: at sunrise only the upper part of the
   flank opposite the sun is lit and the valley floor is still in shade; the lit edge crawls down over the first
   ~40 minutes. This is the Jordan-valley truth and the best single proof that the maths is real.
5. **No cross-layer shadows.** Far and near are the same west-east line at two zooms (±30 km, ±12 km), not two
   ridges one behind the other; a near-on-far cast shadow would be invented geometry.

### Colour (existing tokens only)
- `warm = 1 - smoothstep(4°, 18°, sunElevation)`.
- `lightColour = color-mix(in oklab, var(--sky-horizon), var(--accent) calc(warm * 55%))`.
- `lit = color-mix(in oklab, <base fill after haze>, lightColour, S * 20%)` near, `S * 28%` far.
- Rim: `color-mix(in oklab, var(--accent) 60%, <base>)`.
- **Contrast caps** (oklab L, lit vs base): near <= 0.08, far <= 0.10. Lit far ridge stays >= 0.06 L darker than
  `--sky-horizon`, so the silhouette never dissolves into the sky. `--ridge-near` remains the darkest thing on screen.
- Labels (`−175 מ׳`, `פני הים`) and marks sit on the near layer: with the 0.08 cap their contrast holds; check it.
  Marks already take the sun's side from `sunX` (SunStrip rig): ridge and marks must read the same side from the
  same source.

### Strength `S` (0..1), one number
`S = day · (1 - smoothstep(.5, .9, cover)) · (1 - layerFade) · (precip ? .5 : 1)`
- **Overcast** (cover >= 90%): S = 0. The picture is exactly today's flat picture. Between 50 and 90% it fades.
- **Haze / dust**: the lit tone goes through the same `--far-fade` / `--near-fade` mix, and S drops with the fade. At
  `farFade > .5` the far layer shows no lighting at all; dust keeps a faint near crescent in haze colour.
- **Twilight** (sun below the ridge, glow showing): crescents off; rim only, near the glow, fading with `glow.opacity`.
- **Night**: S = 0, nothing drawn. Moonlight (illumination >= 60%, clear) is a later option: cool, S <= .25, no rim.
- **Snow caps** draw above the crescent, unchanged.
- Changes of S and colour ride the existing `--d6` fill transition; the crescent shape changes by <1 px a minute and
  needs no animation. Scrubbing: recompute per shown minute, transitions off (as `.far`/`.near` already do).

## 3. Clouds: three layers that look like weather, not noise

Needs `cloud_cover_low/mid/high` added to the forecast (not in the model today; the shader has `uCoverage`, `uLow`).
Until then the split can be faked from total cover as now. Shared rules: tones are posterised to steps (no smooth
shade ramp), the shade sample offset points *toward the sun* (today it is a fixed `(0.05, 0.09)`), and the text-band
rule `k(y)` is unchanged.

| Layer | Where | Feature size at 375 px | Tones | Alpha | Drift |
|---|---|---|---|---|---|
| High (cirrus) | top 35% of the sky | streaks 180-300 x 10-20 px, 5:1 stretch | 1 (lit only) | <= .35 | 0.3x |
| Mid | 30-60% | rows of 60-110 px puffs, flattish bases | 2: lit top, underside = lower 30% | .7 | 0.6x |
| Low | 55% to just behind the crest | 120-220 px, hard flat base line | 3: sun-side edge, body, underside | .9 | 1x |

- **Lit side** faces the disc; **underside** is `uCloudShade`, darker as low cover rises (ties to `uDarken`).
- **Low sun**: high cloud takes `--accent` first and keeps it longest (until the sun is ~6° below); low cloud
  undersides go toward `--ridge-far`. At night, the existing `#2A2F5C` rule.
- **Overcast** stays "one soft deck": layers merge, tones collapse to one, no lit side.
- **Budget**: stay at today's 6 fbm calls. High = 1 fbm, 2 octaves, no warp, no shade; mid and low share one warp.
  A layer under 10% cover is skipped. No cloud shadows on the land in this round (a third moving thing on the ridges).

## 4. Gyro parallax

A new motion verb, **lean**: caused by the hand, never ambient, never runs the GL loop. Amend SPEC §4 / ATMOSPHERE
principle 6 if adopted.

| Layer | Horizontal | Vertical |
|---|---|---|
| Sky gradient, stars, sun, moon, glow | 0 | 0 |
| High / low cloud (shader offset, only while the air loop already runs) | ±1 / ±2 px | 0 |
| Far ridge + far marks | ±2 px | ±1 px |
| Near ridge, marks, village dot, labels, sea line | ±5 px | ±2 px |
| Paper sheet, hourly strip, text | 0 | 0 |

- Sun and moon do not move: they are at infinity and their position is data.
- Input: tilt relative to a resting pose (low-pass of orientation, ~2 s), ±12° maps to full travel through a soft
  curve (tanh-like), hard clamp beyond. Output smoothed with ~120 ms time constant. `transform: translate3d` on two
  composited groups; ridge SVGs overscan 6 px each side so no edge shows.
- Sleeps after 1.5 s without a change >0.2°; off while scrubbing, when the scene is off-screen, on `document.hidden`.
- iOS needs a permission prompt from a gesture. Do not prompt on load: Android silently on, iOS off unless the owner
  wants a setting. This alone is a reason not to start here.

## 5. First element for the spike: sun lighting on the ridges

Why this one: it is a still (zero frames, zero battery), it is SVG so it survives every fallback, it is where the
"real 3D maths" claim is most visible, and it can be judged from three screenshots. Clouds need new data and shader
budget; parallax cannot be judged from stills and carries the iOS prompt.

Scope: crescent + rim + terminator on both layers, strength `S`, for Shadmot Mehola and one sampled place (a hill
town and a coastal one if time allows). Stills: `after-0640.png`, `after-1140.png`, `after-1625.png` beside the
`before-` set.

**"Looks right" at 375 px, clear sky:**
1. **Cover-the-disc test.** With the sun hidden by a thumb, dawn, noon and dusk are told apart from the land alone.
2. **Dawn 06:40** (disc right/east, low): warm crescent on the *left* ridge's east-facing flank, upper part; the
   valley floor and the right ridge's visible face stay base tone; a rim on the right skyline beside the disc.
3. **Noon 11:40**: symmetric. Both inner flanks carry equal, thin, neutral crescents; flats lightest; no rim; no dark
   side anywhere. The lowest-contrast of the three.
4. **Dusk 16:25** (disc left/west, 10 min before set): mirror of dawn and warmer; only the top third of the right
   ridge's west-facing flank is lit; rim on the left skyline. That hour is partly cloudy, so strength is visibly below
   dawn's; that is correct, not a bug.
5. **Still an illustration**: at most 3 tones per layer, every tone edge is a clean curve, nothing reads as a
   gradient or a 3D render. Squint: two silhouettes, as before.
6. **Caps hold**: tone deltas within §2; label contrast >= 4.5:1; near ridge still the darkest element.
7. **Nulls**: overcast, night and heavy-haze stills are pixel-identical to today's.
8. **Flip-book** 06:40 → 08:00 → 11:40 → 15:00 → 16:25: the light walks from one flank to the other with no jump.

If 2 or 4 fails at the caps (light too faint to see on a phone outdoors), raise the far cap to 0.12 before adding
any new shape.

## 6. Degrade path

- **Battery / heat**: lighting is plain JS over <=80 points (well under a millisecond) producing two paths and a
  stroke per layer. Recompute when the shown minute, the place, the cover or the haze changes; never per frame. No
  SVG filters, masks or blurs. A calm day stays a still picture (principle 5 intact).
- **Load**: no library, no assets, no new network call for lighting. Cloud layers add three forecast fields to an
  existing request. Lighting is synchronous with the ridge paint, so there is no pop-in.
- **Governor** (DPR 1 → fewer octaves → half particles → 30 fps → still): lighting stays on at every step. Parallax
  off from "fewer octaves" on. Clouds: at "fewer octaves" the high layer loses nothing (already cheap) and mid loses
  its underside; at "half particles" fall back to today's two layers; at "still" one frame, tones kept.
- **Reduced motion**: lighting shown (it is a still); parallax never attaches a listener; clouds as the existing
  deterministic still, with lit/underside tones.
- **No WebGL / CSS fallback**: lighting unchanged (SVG). CSS clouds get a two-tone treatment by sun side only; no
  layer split.
- **Save-Data / battery saver**: parallax off; rest as reduced motion.

## 7. Order after the spike

1. Ridge lighting (this spike) → owner judges on the phone, outdoors and at night.
2. Cloud lit side toward the sun + posterised tones in the existing two layers (one-line offset change first).
3. Low/mid/high data and the third layer.
4. Parallax, last, behind a flag, Android first.

Not doing: three.js or any mesh, cross-layer cast shadows, cloud shadows on land, specular or textured terrain,
parallax on the sun, moon or text.
