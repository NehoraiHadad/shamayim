# Atmosphere system: motion and rendering design

## Position

Build this as a deliberately shallow 2.5D compositor, not a miniature weather game. One full-bleed WebGL canvas owns the air behind the UI and above the base sky colour; one instanced/point-sprite particle pass owns precipitation and airborne matter. The existing DOM/SVG valley, labels, and sun remain authoritative and sit above or between explicitly separated atmosphere layers. The shader creates continuity; the valley cross-section remains the signature object.

The memorable moment is **weather crossing the valley**: a gust or rain shaft visibly sweeps from the meteorological upwind side, catches the sunlight, and disappears behind the near ridge. It is spatially tied to Shadmot Mehola rather than being generic wallpaper. It should happen only when the measurements justify it. Clouds, haze, shimmer, stars, and routine particle motion stay low-contrast and slow.

## Inputs and normalization

Use the already-fetched current fields: temperature, apparent temperature, cloud cover, wind speed, gust, direction, precipitation, snowfall, visibility, plus nearest-time PM10/dust/UV and the existing calculated sun point. The request already includes `wind_direction_10m`, current `precipitation`, `snowfall`, and `visibility`; no request change is needed for v1. Add `relative_humidity_2m` only in a later cloud-quality pass, because it improves cloud-base plausibility but is not needed to ship. Separate `rain` and `showers` are not worth extra coupling until convective cells have a distinct visual treatment.

All visual drivers are pure functions returning a clamped `AtmosphereState`. Smooth live updates toward new values over 8 s for continuous quantities and cross-fade categorical changes over the existing 1600 ms theme duration. Never feed raw values directly to animation code. Wind direction is meteorological (where wind comes **from**): convert to screen travel with `to = (direction + 180) % 360`, then project onto the screen plane. With north at the top and east at screen-right, `vx = sin(to)`, `vy = -cos(to)`. Because this is a cross-section rather than a map, cap the vertical screen component to 35% and preserve the sign; the result communicates direction without making southerly wind look like falling air.

## Concrete mapping

The table gives inclusive breakpoints; interpolate linearly inside each range. Densities are targets at the baseline render size of 375 × 812 and are scaled by render-pixel area, with hard caps unchanged. Speeds are CSS pixels per second so DPR does not change perceived motion.

| Driver | Measurement bands | Visual mapping | Layer |
|---|---|---|---|
| Sustained wind | `< 8`, `8–19`, `20–34`, `35–49`, `≥ 50 km/h` | `<8`: no streaks; cloud drift 1–3 px/s. `8–19`: 4–10 faint streaks, 18–34 px/s. `20–34`: 10–22 streaks, 35–65 px/s. `35–49`: 22–38 streaks, 66–105 px/s. `≥50`: cap at 48 streaks and 145 px/s. Streak length maps 12→34 px from 8→50 km/h; alpha 0.04→0.14. Cloud advection maps 3→18 px/s. | Air shader for cloud advection; rear particle pass for streaks |
| Gust excess | `g = max(0, gust − speed)`; `<5`, `5–14`, `15–29`, `≥30 km/h` | No pulse below 5. Above it, spawn a 0.7–1.3 s density/speed envelope every `max(4, 14 − 0.25g)` s, with deterministic jitter. Envelope multiplier `1 + min(0.9, g/35)`. Gust never changes mean direction. | Particle uniforms; one shared gust envelope |
| Wind direction | `0–359° from` | Travel uses the converted `to` vector. Rain gets a horizontal deflection `dx/dy = clamp(vx × windSpeed / 55, −0.75, 0.75)`; snow uses `/35`; dust uses full projected vector. Streak angle follows `atan2(vy,vx)`, but stays within ±20° of horizontal for readability. | All moving air/particles |
| Current precipitation rate | `0`, `0.01–0.19`, `0.2–0.99`, `1–3.9`, `4–9.9`, `≥10 mm/h` | `0`: none. Trace: 12 drops, 300–420 px/s, 1 px × 8 px, alpha .12. Light: 28–70, 420–560 px/s, 1 × 11. Moderate: 70–145, 560–720 px/s, 1–1.25 × 15. Heavy: 145–240, 720–900 px/s, 1.25 × 20 plus a horizon rain-curtain opacity .06→.14. `≥10`: cap 300 drops, 980 px/s, 1.5 × 24 and curtain .18. Density is proportional to `sqrt(rate)`, not rate, to avoid saturation. `precipProb` never drives current particles; it belongs to the hourly UI. | Front particle pass; shader curtain behind valley |
| Snowfall | `0`, `0.01–0.09`, `0.1–0.49`, `0.5–1.49`, `≥1.5 cm/h` | `0`: none. Otherwise 10–28 / 28–65 / 65–110 / max 150 flakes. Fall 22–42 / 35–60 / 50–78 / max 95 px/s; radius 1.2–3.2 px. Horizontal wander amplitude 3–10 px at 0.15–0.45 Hz plus wind. Snow replaces rain for the snowfall fraction; do not draw both at full density. At valley temperatures above 2 °C, restrict snow to the upper 45% and ridge area to imply ridge snow rather than impossible valley accumulation. | Rear particles, clipped/faded before the text safe zone; optional ridge mask |
| Temperature | `<5`, `5–31`, `32–37`, `38–42`, `>42 °C`; apparent-temp delta | Cold `<5`: slightly clearer air, no invented frost. `5–31`: neutral. `32–37`: heat shimmer only in lowest 18% of sky/above ridges, displacement 0.3–0.8 px. `38–42`: 0.8–1.6 px at 0.10–0.18 Hz. `>42`: cap 2 px at 0.22 Hz. Add up to 0.4 px when feels-like exceeds actual by 4 °C. Never distort text, sun disc, or SVG ridges. Low temperature alone does not create snow. | Air shader, masked to horizon band |
| Cloud cover | `0–9`, `10–29`, `30–59`, `60–84`, `85–100%` | Coverage target 0 / .10–.28 / .28–.58 / .58–.82 / .82–.96 of cloud domain. Use 2 octave domain-warped FBM plus a broad shape field; opacity .08→.52 by day and .06→.38 at night. Cloud base spans 18–58% of viewport, with a 30% clear exclusion centered behind hero text. At `>85%`, reduce internal contrast rather than piling on noise. Drift follows wind but caps at 18 px/s. | Air fragment shader |
| Dust and PM10 | Dust concentration preferred; PM10 fallback. `dust <20`, `20–79`, `80–199`, `≥200 µg/m³`; PM10 fallback `<45`, `45–99`, `100–199`, `≥200` | Clear / haze .04–.10 / haze .10–.20 plus 10–28 motes / haze .20–.30 plus 28–55 motes. Motes 0.8–2.5 px, 8–38 px/s; alpha ≤.12. Dust suppresses cloud contrast by up to 35% but does not erase rain. Use at most one particulate field: never add separate PM10 and dust layers. | Air shader haze; rear particle motes |
| Visibility | `≥20`, `10–20`, `4–10`, `<4 km` | Horizon veil 0 / 0→.08 / .08→.20 / .20→.34; desaturate far ridge by 0 / 8 / 18 / 30%, and reduce far-ridge contrast. Visibility multiplies the dust mapping, it does not add a second veil. Never veil the near ridge or text. | Air shader behind valley; CSS/SVG token/filter for far ridge |
| Sun elevation | `<−6°`, `−6–0°`, `0–8°`, `8–25°`, `>25°` | Night: no rays. Twilight: broad horizon glow, max alpha .16. Low sun: at most 2 soft ray lobes, 6–14° wide, alpha .05–.12, visible only when cloud cover is 25–80% or dust/veil exists. Mid sun: ray alpha falls to .04. High sun: no rays; UV can raise local halo from .08 to max .16. Rays originate at the existing sun position and are occluded by a coarse ridge mask. | Air shader behind the DOM sun and ridges |
| Time of day | dawn `−6–0°`, day `>0°`, dusk `0→−6°`, night `<−6°` | Existing theme palette remains the colour authority. Dawn/dusk increases horizon scattering only; night reduces particle luminance 25% and cloud opacity 20%. Stars remain the existing deterministic field and fade under cloud/dust based on transmission `(1−cloud/100) × (1−veil)`. | Theme uniforms; CSS stars initially |

### Text-safe compositing

Define a responsive rounded rectangular safe mask covering the top bar, hero, sentence, and hourly strip (approximately `x=12–363`, `y=8–418` at the reference viewport). It is not a hard hole: cloud/ray/dust contrast is attenuated 70%, particle alpha 85%, and heat displacement 100% inside it, with a 28 px feather. Rain may cross the area at low alpha because removing it looks artificial, but its maximum combined alpha is .10 there. The base theme gradient already passes contrast and remains visible beneath every effect. A conservative luminance limiter caps atmosphere-induced lightening/darkening in the safe region to ±6% relative luminance; keep the existing theme contrast test and add mapping/state tests rather than trusting visual inspection.

## Rendering architecture

Use a single fixed, pointer-transparent `<canvas>` with a transparent framebuffer and three logical stages:

1. **Rear air pass (fragment shader):** full-screen triangle; analytic gradient-independent haze, two-octave cloud field, horizon rain curtain, low-sun rays, and heat displacement of only its own procedural air colour. It samples no DOM screenshot and therefore cannot blur text. WebGL 2 uses one GLSL ES 3 shader; WebGL 1 uses the same math with compatible syntax.
2. **Rear particle pass:** wind streaks, dust motes, and snow. WebGL 2 instanced quads; WebGL 1 point sprites except elongated wind streaks/rain, which use a small static quad buffer instanced through `ANGLE_instanced_arrays`, falling back to batched triangles when absent. Particle state lives in typed arrays on the CPU and is integrated at a fixed 30 Hz; rendering interpolates at display refresh. No transform feedback is needed at these counts.
3. **Front precipitation pass:** rain can render above the ridge to make a storm present; snow/dust remain mostly behind it. In implementation this can be a second canvas or, preferably, the same canvas split by a DOM composition boundary only if the valley is moved into the canvas. Since the existing SVG valley must remain authoritative, ship two thin canvases sharing one controller/context budget: `AtmosphereBack` below `ValleyScene`, `PrecipitationFront` above the scene but below all text. On devices where a second WebGL context is risky, make the front pass Canvas2D and keep WebGL for the back air pass.

The controller owns normalized state, deterministic seeds, visibility, quality tier, and time. React updates uniforms/state only when weather or selection changes; the animation loop does not set React state. Resize via `ResizeObserver`, allocate only when dimensions/tier change, and reuse every buffer. Pause `requestAnimationFrame` on `document.hidden`; on resume, reset the time origin instead of simulating missed frames. Clamp frame delta to 50 ms.

Keep modules below 150 lines by separating `mapAtmosphere` pure mappings, quality selection, GL setup/programs, shader source strings, particle pools, and the React shell. Unit-test every threshold, clamp, interpolation endpoint, direction conversion, precipitation/snow partition, and safe-mask policy.

## Layer order and existing scene

Back to front:

1. Existing CSS theme gradient/background.
2. Stars (CSS initially; masked by computed atmospheric transmission).
3. Back WebGL air: haze, clouds, rays, distant rain curtain, shimmer.
4. Rear particles: dust, wind streaks, snow.
5. Existing sun disc. It stays DOM-driven by `sunPath.ts`; publish its normalized position as shader uniforms so rays agree with it.
6. Existing `ValleyScene` far ridge, sea line, near ridge, village, and labels.
7. Front rain pass, clipped to end at the paper boundary and attenuated in the text-safe mask.
8. All main UI and paper sheet.

Do not paint the ridge into the air shader. Give the shader a tiny 64 × 32 single-channel ridge occlusion mask generated from the existing FAR/NEAR paths when rays need terrain occlusion. This preserves the future swap: a 3D terrain renderer can provide the same occlusion texture/depth contract while the air shaders and particle mappings remain untouched.

## The signature moment

The memorable moment is **weather crossing the valley cross-section at the real sun angle**: near sunrise or sunset, one restrained shaft opens through moving cloud or dust, catches the valley haze, and disappears behind the correct ridge as the existing sun travels. In rain, the same spatial composition becomes a distant curtain crossing the far ridge before sparse foreground drops reach the viewer. This is one responsive valley portrait, not a collection of effects.

Everything else is supporting evidence. Wind streaks stay nearly subliminal; dust motes are visible only against the horizon; heat shimmer never climbs into the interface; snow is slow and sparse; stars do not twinkle. Allow at most one emphasis channel at a time: precipitation outranks rays, rays outrank shimmer, and shimmer outranks motes. When an effect wins, reduce the others' opacity by 40–70%. Calm weather gets clouds drifting at 1–3 px/s and nothing else. This priority rule is what keeps the system from becoming a screensaver.

### Hour selection

The selected hour should preview the air, but only after an explicit tap/keyboard selection and with honest data limits. Cross-fade cloud cover, precipitation, temperature, wind speed, and gust from `HourPoint` over 320 ms, matching the sun movement. Hourly data currently lacks wind direction, snowfall, visibility, and air quality, so retain current direction and environmental haze and mark these internally as held values; do not infer them. For a fully truthful preview, add hourly `wind_direction_10m`, `snowfall`, and `visibility`. When selection clears after 6 s, return to live state over 520 ms. Never let the preview alter the current hero copy or theme unless the existing product explicitly chooses that behavior; it is a scene preview.

### Intro and theme changes

The atmosphere is already present at the first painted frame at 70% of its target contrast, then settles to 100% over 900 ms. It does not receive a fourth motion verb or delay the established sun/hero/sheet choreography. Particles begin after 260 ms and ramp density over 520 ms; this prevents rain from obscuring the hero reveal. Under reduced motion they appear immediately as a static distribution.

On theme changes, keep both old and new palette uniforms and blend colour/scattering over the existing 1600 ms. Particle populations remain alive; interpolate their colour and target density rather than clearing/reseeding, so no pop occurs. The 520 ms sheet/ink transition remains independent.

## Performance contract

Baseline target: a 4–6 core mid-range Android device, 375 × 812 CSS px, Chrome, at 60 fps. Treat 16.7 ms as the total app budget, not the atmosphere budget.

| Resource | 60 fps tier | 30 fps degraded tier | Hard limit |
|---|---:|---:|---:|
| Atmosphere GPU time | ≤3.5 ms p50, ≤5 ms p95 | ≤7 ms p95 | Trigger downgrade after 45 frames over budget |
| Atmosphere CPU/frame | ≤1.2 ms p50, ≤2 ms p95 | ≤3 ms p95 | No per-frame allocation |
| Canvas DPR | `min(devicePixelRatio, 1.5)` | 1.0 | 1.5 |
| Back-buffer pixels | about 0.69 MP at reference size/DPR 1.5 | 0.30 MP | 0.9 MP after resize |
| Air shader | 1 full-screen pass, 2 FBM octaves, ≤28 texture/ALU-noise evaluations | 1 octave, rays disabled | No blur kernels or framebuffer ping-pong |
| Live particles | ≤360 total (rain 300; all others share 60) | ≤160 total | Fixed pools; closest visual priority wins |
| Draw calls | 3 preferred, 5 maximum | 2–3 | No draw call per effect |
| GPU memory | ≤12 MB incremental | ≤8 MB | Recreate buffers only on resize/tier change |

Quality selection is empirical. Measure rolling rAF frame time only while visible and after a 2 s warm-up. If p75 exceeds 19 ms for 45 of 60 frames, step down once: DPR 1.5→1, halve particles, remove one cloud octave, then disable rays/shimmer. If p75 still exceeds 28 ms, render at 30 fps by skipping alternate frames. Step up only after 10 s below 14 ms and never more than once per session, preventing oscillation. `navigator.deviceMemory ≤4`, Save-Data, or battery saver signals start one tier lower; do not assume Android model names.

## Fallbacks and accessibility

**Reduced motion:** no temporal noise, drift, falling, shimmer, ray movement, or gust pulses. Render one deterministic still frame representing the measured state: angled rain/snow marks at the correct density, cloud coverage, visibility veil, dust tint, and sun scattering. Theme fades max 320 ms as already specified. The still image must not imply clear weather merely because animation is disabled.

**Canvas2D/no WebGL:** use one DPR-capped canvas with precomputed offscreen cloud blobs (6 max), a linear horizon veil, and pooled particles. Redraw clouds at 15 fps, particles at 30 fps; composite them in one visible draw. Skip volumetric rays and true shimmer. Preserve numeric density bands, direction, rain/snow distinction, dust veil, safe mask, and layer clipping.

**CSS-only:** for canvas failure, severe thermal throttling, or explicit low-power mode, set state classes and custom properties. Use a static multi-radial cloud background, a linear visibility/dust veil, and one SVG/data-free repeating pattern each for rain or snow rotated to the mapped wind angle. No animated gradients. Five density classes (`none`, `trace`, `light`, `moderate`, `heavy`) preserve meaning.

**Save-Data/low battery:** start in CSS still or the 30 fps Canvas2D tier; never download atmosphere imagery. If the Battery Status API is unavailable, do not guess. Pause fully when hidden and after 30 s with the app covered by a modal. Respect forced-colors by removing decorative canvas layers. Canvas remains `aria-hidden`; the existing semantic weather text and ValleyScene label carry meaning. Do not use flashing lightning in v1. No effect may exceed three luminance changes per second, and gust pulses change spatial density rather than full-screen brightness.

## Hand-painted assets

Do not paint clouds, rain, dust, glow, or texture plates: they would fight measured coverage/direction and add downloads. Keep the current procedural/SVG ridge silhouettes for v1 because their geometry drives the sea-level story, masks, and eventual terrain interface. If illustration is commissioned, limit it to two monochrome ridge silhouette paths (far Samaria/Gilead and near valley) authored as SVG, with no baked sky colour, lighting, haze, grain, or sun. They must share the current 375 × 128 coordinate contract and be reducible to the 64 × 32 occlusion mask. A 64 × 64 blue-noise texture generated at build time is acceptable but should be procedural/repository-local, not hand-painted.

## Delivery order

1. Pure mappings and tests, including threshold fixtures for Shadmot Mehola extremes.
2. Back air shader with cloud, haze, safe mask, visibility pause, and quality governor.
3. Rain/wind particle pool, then snow/dust using the same pool and uniforms.
4. Sun/ridge mask integration, hourly preview, theme cross-fade.
5. Canvas2D and CSS still fallbacks, reduced-motion snapshots, contrast/perf instrumentation.

Ship behind a capability/feature flag and compare screenshots at 0, 10, 30, 60, 90, and 100% cloud; wind 0/10/25/50 km/h from cardinal directions; rain 0/.1/1/5/12 mm/h; snow .1/1.5 cm/h; visibility 2/8/20 km; and temperatures 4/34/40/44 °C.

## Risks and cuts

The largest risk is visual overstatement: procedural layers compound even when each is subtle. Centralize opacity in one energy budget: cloud + haze + rays may darken/lighten the non-text sky by at most 35%, and text-safe sky by 6%. Second is mobile fill rate; DPR and full-screen noise matter more than particle count, so downgrade DPR/octaves before removing meaningful precipitation. Third is WebGL context loss; handle `webglcontextlost/restored`, immediately expose the CSS still, and rebuild from normalized state without losing the app.

Cut in this order if schedule or performance tightens:

1. Animated god rays (retain a static low-sun glow).
2. Heat shimmer (retain the heat palette).
3. Individual dust motes (retain measured haze/visibility).
4. Wind streak particles (retain cloud/rain directional movement and gust mapping).
5. Volumetric cloud domain warp (retain one-octave coverage shapes).

Do **not** cut truthful rain/snow distinction, wind direction, visibility/dust veil, reduced-motion stills, contrast masking, pause-on-hidden, or the ridge/sun alignment. Those are the atmosphere system's meaning, not polish.
