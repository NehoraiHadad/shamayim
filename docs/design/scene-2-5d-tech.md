# 2.5D spike · ridge lighting

Keep ridge lighting in SVG. Compute directional crescents, self-shadow and a low-sun rim from each drawn profile, then paint flat tones directly over the existing silhouettes. This preserves the paper-cut look and works with either atmosphere renderer.

## Review against the current scene

- `ValleyScene` already owns both 375×128 SVGs and the shown time (`selected ?? now`).
  Their `preserveAspectRatio="none"` stretches the artwork on wider screens. Do lighting maths in
  viewBox units, keep the 1.25 px rim non-scaling, and keep geographic east on the right in RTL.
- `SceneTerrain` supplies west-to-east points for all places. Sampled terrain uses 41 smoothed
  points per ridge (±12 km near, ±30 km far). Shadmot and generic terrain sample drawn curves
  through `ridgePoints`; Shadmot has no elevations. These profiles overlap geographically,
  so each profile only casts shadows onto itself.
- The visible disc follows a stylised, skyline-dependent arc. True altitude and azimuth from
  `astro/sun.ts` describe a different projection. Use the displayed disc for direction and
  drawn-space shadow lengths, true altitude for low-sun colour and rim, and true azimuth for
  the south-facing contribution. No summer backlight refinement in this spike.
- Noon symmetry means equal treatment of equal slopes, even on asymmetric terrain. Blend out
  lateral bias around the middle of the drawn arc. Put the small neutral noon lift inside the
  crescent colour budget. Keep the base untouched and make flats brightest through band depth.
- SVG keeps the bands in the same coordinate space and paint order as the ridges. A GL pass
  would have to reproduce silhouette geometry, layout and occlusion, then supply an SVG
  equivalent for CSS fallback. The current WebGL1 canvas draws air and particles behind the
  land, with a low-resolution air buffer updated at 15 Hz. Add no pass or uniforms.
- Heavy haze suppresses both overlays at `farFade > .5` to satisfy the null still. Lighter dust
  can leave a faint near band. Label contrast is an open visual risk given existing label
  opacity, even at the proposed caps. Measure baseline and lit contrast separately.

## Implementation files

- **`src/App.tsx`** — read `new URLSearchParams(window.location.search).get('scene') === '25d'`
  once at module startup. Thread an optional `ridgeLight` prop only when enabled and `shown`
  exists. Supply shown precipitation/snow and the active `palette` (the same tokens as the app
  CSS). Keep `cloudCover`, `air`, `place` and time on their existing paths. No persistence,
  URL-change listener or DEV gate. Reload to change mode. Leave `devParams.ts` as-is.
- **`src/ui/scene/ValleyScene.tsx`** — mount the far and near `RidgeLight` only with that prop.
  Supply the layer path/points, `at`, site, `sun`, twilight anchor `rim`, glow opacity, haze
  and shown weather. Insert after each base path and before snow and far mist. Share the
  existing far shimmer filter across base and overlay when both are present so their edges
  displace together. Keep the original markup and filter target for the flag-off and null cases.
- **`src/ui/scene/ridgeLighting.ts`** (≤149 lines) — pure geometry.
  `ridgeLightPaths(points, { ray, noonWeight, rimX, depth }): { crescent: string; rim: string }`
  where `ray: [number, number] | null` is the east/up light vector (null in twilight),
  `rimX: number | null` is the active rim anchor, and depth is 16 near / 9 far.
  Empty strings represent absent geometry. Export `ridgeLightRay(sun, centerY)` for both layers.
- **`src/ui/scene/ridgeLightTone.ts`** (≤149 lines) — pure photometry.
  `ridgeLightTone({ altitude, azimuth, day, noonWeight, glow, cover, wet, farFade, nearFade, layer, palette })`
  returns `{ fill, rim, rimAlpha }` or null. Reuse `theme/oklab.ts`.
- **`src/ui/scene/RidgeLight.tsx`** (≤149 lines) — small SVG renderer. In the guarded ValleyScene
  memo, reuse `utcOf(at, place.timezone)` and alias the astronomy function to `sunSky`. Compute
  that solar position and drawn ray/noon weight once for both layers. The renderer memoizes geometry by
  path, profile and lighting inputs. Use one compound fill path and one compound stroke path per
  layer, with a stable `useId` clip referencing the existing silhouette path data.
- **`src/ui/scene/ValleyScene.module.css`** — add overlay classes for fill/stroke transitions
  using `--d6`. Disable them via the existing `.app[data-scrubbing]` selector and reduced-motion
  media query. Geometry snaps to the shown minute. No new effects on the original land classes.

### Geometry and tones

Let height be `h = -y`, slope `m = dh/dx` from centred differences (one-sided at endpoints),
and the section normal `normalize(-m, 1)` in east/up coordinates. The light ray rises by the
vertical distance from valley centre to disc. Its east component uses the disc x relative to
the arc midpoint (`sunAt(.5)` x), so the bias crosses zero at drawn noon even for Shadmot's
47.5% centre. Use `centerY` for the vertical origin and a small positive floor on rise for
daylight. Choose east/west from this ray for both shading and occlusion.

For low sun, compare the ray with every intervening sample on that side of the same ridge.
Use signed clearance from the strongest blocker, tapering over ~1 viewBox px at the terminator.
A near-vertical ray skips the side scan. Blend `max(0, normal·light)` toward the vertical
normal component with `noonWeight = 1 - smoothstep(0, .18, abs(t - .5))`.
At full noon use a thin band (e.g. 20% depth), with the same rule on both flanks. Taper at
visibility/facing boundaries with interpolated endpoints and close each contiguous band separately.
Extend each band's top above the ridge within its lit x interval. Use the silhouette clip
to give bands the exact top edge and a smooth monotone-in-x lower
edge between sampled depths. The clip also avoids inside/outside seams on the hand-drawn curves.
For the rim, select lit crest runs and skyline runs within 70 viewBox px of the sun/glow.
Trace the original outline via `ridgePoints` samples for rim runs, checking alignment at 375 px.
Apply the 1.25 px stroke outside the fill clip to avoid slicing its width in half.

Normalise shown cover to 0–1. Per layer use `S = day * (1 - smoothstep(.5,.9,cover)) *
(1 - layerFade) * (wet ? .5 : 1)`. Use the drawn daylight range for crescents and gate on the
disc clearing the combined skyline, with a short fade across the edge. True altitude gives
`warm = 1 - smoothstep(4,18,altitude)` and rim fade `1 - smoothstep(6,15,altitude)`.
During drawn twilight allow only the local rim, scaled by glow opacity and weather attenuation.
At full night, overcast ≥90%, or heavy haze, return no overlay. Max rim alpha is .45.

Mirror the CSS haze-base mix, including the rounded fade and 90% multiplier. Mix horizon toward
accent by `warm * .55`, then base toward that light colour by `S * .20` near / `S * .28`
far. At noon blend toward a neutral lift weighted by the true sun's south component
(`max(0, -cos(alt)*cos(az))`), capped at +.03 L before strength. Cap final band delta at
.08 near / .10 far and leave far ≥.06 L below horizon where the base permits it.
Preserve near/far tonal ordering and constrain the alpha-composited accent/base rim to the
same limits. Suppress added light when there is no headroom. Check the painted result after
gamut conversion; the .12 far cap is a review decision if the phone still reads too flat.

## Frame and battery budget

- Target ≥50 fps on Pixel 6a / iPhone 12 while air animates and during scrubbing (20 ms total
  frame budget). Steady-state added JS and GL work is zero per animation frame. At 41 samples
  per ridge the directional scan has ≤1,640 pair checks total. Budget <1 ms for geometry plus
  path strings and ≤1 ms incremental SVG style/paint on a changed frame, subject to phone traces.
- Recompute on a distinct displayed minute or relevant weather/palette/terrain change.
  Use the existing minute clock, scrub hold and rewind. Memoize by minute and primitive inputs
  so pointer events within one minute do no lighting work. During drag, paint the latest
  committed minute, skipping superseded inputs and disabling transitions. No lighting timer,
  independent rAF, geometry tween, network request or new dependency.
- Leave air scheduling alone. The contract lists DPR 1 → fewer octaves → half particles →
  30 fps → still; current `useAirLoop.ts` does DPR 1 → 2 octaves → 1 octave → stop continuous
  scheduling (state changes can kick a frame). Lighting persists at every step, in reduced
  motion and Save-Data stills, and in the no-WebGL CSS fallback.

## Verification for implementation

- Vitest in `ridgeLighting.test.ts` and `ridgeLightTone.test.ts` (each ≤149 lines).
  Cover mirrored east/west flanks, same-layer occlusion and receding shadow, symmetric noon,
  flat/repeated/empty samples, finite paths and no bridging across shadow. Test 0–100 cover,
  precipitation, twilight rim-only, night/heavy-haze nulls and colour caps across active palettes.
- At 375 CSS px in dev, use `?scene=25d&at=2026-11-18T06:40`, then `T11:40` and `T16:25`
  on the same date. Use the place time zone and a forecast fixture covering that date; `at`
  pins the clock only. Capture Shadmot and a sampled place with matched terrain/weather inputs
  and settled intro/transitions. Use clear inputs for geometry and a partly cloudy dusk variant.
- Compare `after-0640.png`, `after-1140.png`, `after-1625.png` against matching flag-off stills.
  Cover the disc: dawn should light the upper left ridge's east-facing flank and rim the right
  skyline; noon should look neutral, thin, symmetric and rimless; dusk should light the upper
  right flank, rim the left skyline and weaken with cloud. Check flats, clean edges, three tones
  max, labels ≥4.5:1 over actual backgrounds, and a smooth 06:40 → 08:00 → 11:40 → 15:00 → 16:25 sequence.
- Compare pixel buffers for flag-off versus the baseline and flagged versus flag-off at overcast,
  night and heavy haze. Freeze animation/weather for comparisons. Profile drag and idle on a
  mid phone, including reduced motion and blocked WebGL. In a production build verify the
  absent/invalid flag draws no overlay and `?scene=25d` opts in using live time or scrubbing.
  The production `at`/weather overrides stay disabled. Run build/device QA in the cloud or on
  the target phone, with live-URL testing after an explicitly authorised release.

## Out of scope

- Cloud lighting/layers and forecast fields, gyro parallax, sensors and new motion verbs.
- Meshes, textures, moonlight, cross-layer/cloud shadows and changes to the air governor.
- Source implementation, screenshot capture and deployment in this planning run.
