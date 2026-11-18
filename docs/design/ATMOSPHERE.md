# Atmosphere v4: merged spec

Sources: `atmo-codex.md` (rendering, perf, fallbacks) and `atmo-fable.md` (felt experience, numbers).
Where they differ, the decision and the reason are given here. This file wins.

## Principles
1. **Air comes from numbers, never from the theme.** `mapAir(input) → AirState` is pure and tested.
   The theme supplies colour only. WebGL, the reduced-motion still and the CSS fallback all draw the same state.
2. **One carrier per variable.** Wind shows through what is already in the air (rain slant, dust, cloud
   drift). Dedicated streaks only in dry air at ≥20 km/h. (Fable)
3. **At most two moving systems plus clouds.** Priority: precipitation > dust > wind streaks > heat
   shimmer > god rays. Losers are dropped, not dimmed. (Fable; stricter than Codex's 40–70% dimming)
4. **Text band gets ~40% of the weather, the valley gets 100%.** Legibility profile `k(y)`.
5. **A calm day is a still picture.** Cloud <10%, wind <20, no precip, <35 °C, clean air → draw one
   frame and stop the loop.
6. New motion verb: **drift** (ambient, data-paced, never triggered by touch). SPEC §4 updated.

## Mapping (numbers from Fable unless noted; interpolate inside bands)
- **Wind** `u = −sin(dir)` (+1 = moves left→right, westerly). Along-valley (`|u|<0.35`) foreshortens
  streaks to 30%. Streaks: count `44·clamp((kmh−18)/34)`, speed `12·kmh` px/s, length 40→220 px,
  alpha .24→.40 (Fable's .10→.18 was invisible on a phone), ×0.3 when rain ≥0.5 or dust active. Cloud drift `max(1.5, 0.4·kmh)` px/s.
  **Gusts** when `gust−speed ≥ 15`: swell every 5–9 s, attack 300 ms, decay 900 ms, wind → gust.
- **Rain** (mm/h; current `precipitation`, code says rain and rate <0.1 → 0.2): count `min(480, 90√r)`,
  length `min(36, 6+6√r)`, speed `min(1600, 500+220√r)`, slant `atan(windEff·|u| / fall)`,
  fall 60 km/h-equivalent (20 when r<0.5 so drizzle drifts), cap 50°, length cap 28 (tuned by eye:
  Fable's 32/65° read as scratches, not rain). Alpha .18→.32. Colour `#DCF0FF`.
  Showers (80–82) breathe ±35% over 8–14 s. ≥7.5 mm/h: sky top darkens 8%, far ridge fade +0.3.
- **Snow** (cm/h): count `min(220, 90√s)`, flakes 5–10 px across (tuned up by eye), fall 60–120 px/s, sway ±12 px @0.4 Hz.
- **Heat** `max(temp, feelsLike)`, daylight, cloud <60%, dry: 35–39 shimmer band 24 px/0.6 px;
  40–44: 40 px/1.2 px, sun bloom 32→56 px, horizon bleach +6%; ≥45: 56 px/1.8 px. Never above the scene.
- **Cloud** `coverage = smoothstep(.1,.9,cover)` thresholds the noise (amount of sky, not opacity).
  <10% none; coverage is linear in cover (20% = a couple of separate clouds, 45% scattered, 80%+ mostly covered; threshold calibrated to the measured GPU fbm range 0.22–0.6); high layer always, low layer >30%. Overcast = one soft deck. Night clouds `#2A2F5C` ≤55%,
  stars × `(1 − .9·cover)`.
- **Visibility** (`visibility`, else `1300/pm10` km, clamp 1–40): `farFade = (clamp(1−(v−3)/22))^1.5`,
  `nearFade = .6·clamp(1−(v−1)/5)`. Dust grains 60–200 at `6·kmh` px/s when dust ≥150 µg/m³.
  Haze colour: dust `#D7BE8C`, mist `#C9D2D8`, rain `#6F8FA0`, heat `#F2CF92`.
- **Sun**: god rays only at cover 30–75%, elevation 4–30°, no rain; 3–5 shafts, alpha ≤.10.
  Dust turns the sun into a coin (halo off). Clouds veil the disc using the *shown* hour's cover.
- **Thunder** (95–99): in-cloud flash every 9–25 s, never in hour preview. Max 3 luminance changes/s.

## Rendering (decided)
- **One WebGL1 context**, one fixed full-viewport canvas inside `Sky`, between the CSS gradient/stars
  and the page. Ridges (SVG) and all text sit above it, so rain falls *behind* the ridges. Front-of-ridge
  rain is cut for v1 (both reviewers list it first to cut).
- **Air pass** (clouds, haze, rays, glow, heat band) renders to a framebuffer at ⅓ resolution, refreshed
  at 12–20 Hz, upsampled linearly. Premultiplied alpha over the CSS sky; never paints the sky itself.
- **Particles are stateless** (Fable): position computed in the vertex shader from seed + time + uniforms.
  One static buffer of quads, uploaded once; no per-frame JS allocation. One draw call.
- **Far ridge stays SVG** (Codex; keeps the 3D-swap contract). Haze drives it via CSS vars `--far-fade`,
  `--near-fade`; labels switch ink when `farFade > .5` (`data-haze="heavy"`).
- DPR ≤1.5. Pause on `document.hidden`. Calm → one frame. Governor: avg frame >20 ms for 2 s → step down
  (DPR 1 → fewer octaves → half particles → 30 fps → still), never step back up in a session.

## Hour preview
The valley is a minute-resolution touch scrubber; the strip keeps native touch scrolling and adds mouse/pen dragging.
The shown minute drives particles, cloud, haze, wind, rain, sun, twilight, landmarks, and the continuous sky palette;
hourly numeric fields interpolate while direction and visibility stay live. Release holds for 6 s, then rewinds through
time over 900 ms; reduced motion cuts directly to now. The paper sheet stays on now. No lightning in preview.

## Intro
Air present on the first frame at 70%, settles over 900 ms; particles begin at 260 ms, ramp 520 ms.

## Fallbacks
Reduced motion → one deterministic still frame (slanted streaks at the right density). No WebGL →
current CSS layers (clouds/rain/dust) with rain angle from the state. Save-Data → still frame.

## Assets
No painted clouds/rain/textures (they would fight the data). anidoodle may later redraw the two ridge
silhouettes as richer SVG on the same 375×128 contract; not in v4 scope.

## Order of work
1. `mapAir` + tests · 2. GL shell, loop, governor · 3. air shader · 4. particles · 5. scene hookup
(fades, labels, sun coin) · 6. hour preview · 7. still/CSS fallbacks · 8. visual matrix QA.
