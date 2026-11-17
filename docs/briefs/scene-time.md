# Brief: scene/time lane — astronomy, time scrubbing, continuous light

Repo: Shamayim (Vite + React 19 + TS, Hebrew RTL weather PWA). Work ONLY in this worktree. Read `TASKS.md`,
`docs/design/SPEC.md` §4, `docs/design/ATMOSPHERE.md` first. House rules: files under ~150 lines (split into modules),
DRY, meaningful names, comments say *why*. Checks that must pass: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`. Do NOT touch: `src/data/**`, `src/text/compose.ts`, `src/ui/WearCard*`, `src/ui/week/**`,
`src/ui/DayRow*` (other lanes own them). Do not draw the moon (Claude draws it). Do not deploy, do not push.
Commit your work on the current branch with clear English messages when your part is green.

Design decisions (Fable, final):
1. The valley scene is the touch scrubber; the strip keeps native scroll/snap/tap.
2. Release holds the pick 6 s after the last touch, then time plays back to now over 900 ms ease-out (a real rewind
   through the minutes, not a crossfade). A "עכשיו" chip returns at once. Reduced motion: cut, no tween.
3. While time is moved, the whole sky gradient + ink follow the shown time; the paper sheet stays on now.
4. Sky colour is continuous from sun altitude (table below), interpolated in OKLab, then cloud / wet / PM10 modifiers,
   then a contrast guard.

---

## Part A — `src/astro/` (new files only; job "astro")

Small, dependency-free astronomy, low-precision Meeus / suncalc-class (sun ≤0.05°, moon ≤0.3°).
- `src/astro/utc.ts`: `utcOf(local: LocalTime, timeZone: string): Date` — "2026-11-17T14:05" wall clock in an IANA
  zone → the instant. DST-safe via `Intl.DateTimeFormat` (iterate the offset twice).
- `src/astro/sun.ts`: `sunPosition(at: Date, lat: number, lon: number): { altitude: number; azimuth: number }` in
  degrees; azimuth from north, clockwise (90 = east). Export the equatorial helper you need for the moon.
- `src/astro/moon.ts`: `moonPosition(at, lat, lon): { altitude; azimuth; distanceKm }` (topocentric altitude:
  include parallax, ~1°), and `moonIllumination(at): { fraction: number /*0–1 lit*/; phase: number /*0 new, .5 full*/;
  waxing: boolean }`.
- `src/astro/astro.test.ts` (or split): known events —
  - Full moon 2026-11-24 ~14:53 UTC: fraction > 0.99. New moon 2026-11-09 ~07:02 UTC: fraction < 0.01.
  - Total solar eclipse 2026-08-12 ~17:46 UTC: geocentric sun–moon separation < 0.7°.
  - Total lunar eclipse 2026-03-03 ~11:33 UTC: moon within 0.7° of the antisolar point.
  - Jerusalem (31.778, 35.235) 2026-06-21 solar noon (~09:38 UTC): sun altitude 81.6° ± 0.3.
  - Sun altitude ≈ −0.83° ± 0.3 at a known sunrise (Jerusalem 2026-11-17 06:16 local, Asia/Jerusalem).
  - `utcOf` Asia/Jerusalem 2026-07-01T12:00 → 09:00Z; 2026-12-01T12:00 → 10:00Z.
  - Waxing flag true on 2026-11-17, false on 2026-11-28.

## Part B — scrubbing + continuous light (job "scrub-light")

### B1 Continuous light — `src/theme/oklab.ts`, `src/theme/skyLight.ts` (+ tests)
`skyLight({ altitude, rising, cloudCover, wet, pm10 }) → SkyTheme`-shaped colours for `top, mid, horizon, ink, accent,
ridgeFar, ridgeNear` (the sheet fields are NOT derived; the sheet stays on `pickTheme(now)` as today).
Clear-sky keyframes by sun altitude (OKLab interpolation between rows):

| Alt | Top | Mid | Horizon |
|---|---|---|---|
| ≤ −18 | #070B1E | #131C3F | #2A2F5C |
| −12 | #0B1230 | #1C2452 | #3A3A6A |
| −6 | #1A2248 | #5A3A66 | #C9785A |
| −2 rising | #1F2A52 | #7E3F62 | #F6B26B |
| −2 setting | #2B2350 | #7E3A5E | #F2994A |
| 0 | #24376E | #8A4A66 | #F8BE78 |
| 4 | #1B4480 | #4A6A9C | #F3CF98 |
| 10 | #124A90 | #2F70B0 | #EDD5AC |
| ≥ 20 | #0E4C96 | #2A74B8 | #E9D3A8 |

ink/accent/ridgeFar/ridgeNear: interpolate between the anchor themes in `SKY_THEMES` (night ≤ −12, dawn/dusk at −2,
clearDay ≥ 10).
Modifiers, in this order: cloud → mix toward `SKY_THEMES.cloudy` by `smoothstep(30, 90, cover) × 0.85`, with the
target darkened to the current night luminance when the sun is low (night clouds are not daytime grey); wet → the target
is `SKY_THEMES.rain` at weight ≥ 0.7; PM10 → mix toward `SKY_THEMES.dust` from `THRESHOLDS.dust.light` up to 0.9 at
`THRESHOLDS.dust` severe (look at `src/config/thresholds.ts`), × daylight (0 below −6°, 1 above 4°), horizon weight
1.3× top. Heat does NOT change the sky colour.
Contrast guard (after all mixing): lower OKLab L of `top` and `mid` until `ratio(ink, top|mid) ≥ 4.6` and
`--sky-rain` (tokens.css) on mid ≥ 4.6. Use `src/theme/contrast.ts`.
Tests (`src/theme/skyLight.test.ts`): sweep altitude −20…70 every 0.5°, rising/setting, cover {0, 50, 100}, wet
{false, true}, pm10 {null, 80, 300}: ink on top ≥ 4.5, ink on mid ≥ 4.5, `--sky-rain` on mid ≥ 4.5; continuity — no
channel of top/mid/horizon jumps more than 0.03 OKLab ΔE between neighbouring 0.5° samples (same other inputs);
anchors: alt 30 clear == clearDay colours within ΔE .01, alt −20 == night.
Wire-up: `App.tsx` computes the light for the shown time (sun altitude from `airInput`'s `sunElevation` for now — a
later step swaps in `src/astro`), and the root style uses `themeVars(themeId)` overlaid with the light's sky vars
(`--sky-top/mid/horizon`, `--ink`, `--accent`, `--ridge-far`, `--ridge-near`). `?theme=` (forcedTheme) keeps the
old discrete vars. `Atmosphere` gets the continuous palette (airPalette takes a SkyTheme — pass the merged one) and
`night = altitude < −6`. `Sky` stars: `clamp((−alt − 4) / 8) × (1 − .9 cloud)`, no longer per theme. `useThemeChrome`
takes the computed top colour.

### B2 Scene time + scrubbing
- Replace `src/ui/useHourSelection.ts` with `src/ui/scrub/useSceneTime.ts`: state `at: LocalTime | null`
  (minute resolution, null = now) and `scrubbing: boolean`. API: `pick(hour | null)` (tap/keys: holds 6 s, then
  rewinds), `scrub(t)` (live, no timer), `release()` (starts the 6 s hold), `toNow()` (immediate). Rewind: rAF from
  `at` to now over 900 ms `--ease-out` stepping whole minutes; `prefers-reduced-motion` → set null at once.
  Pure helpers (minute arithmetic on LocalTime strings: add minutes across midnight, minutes between dates) go in a
  tested module, e.g. `src/domain/minutes.ts` + test.
- Strip highlight = the hour of `at` (floor). Strip `selected`/`onSelect`/keyboard/Home/End/aria-pressed keep working.
  Strip mouse/pen drag (`pointerType !== 'touch'`) over the track maps x → time continuously (slot centre = :00 of
  that hour; RTL: later is left; use `stripLayout` maths, export a `timeAtX`/`xAtTime` pair with tests). Touch on the
  strip keeps native scroll. While `at` changes from outside the strip, the strip scrolls that hour into view
  (`behavior: 'auto'` while scrubbing, smooth otherwise, never when reduced motion).
- Scene scrubber: a transparent overlay element over the scene (the `figure` is `pointer-events: none`; marks must stay
  inert) with `touch-action: pan-y`, pointer capture, ~4 min per px, RTL (finger moving left = later), clamped to the
  strip's first..last hour. `role="slider"`, `aria-label="שעה בעמק"`, `aria-valuemin/max/now` (minutes from now),
  `aria-valuetext` = "HH:MM, <describeHour of that hour>"; arrow keys step one hour (ArrowLeft later), Home/End,
  Escape → now. Focus ring visible.
- Readout in the scene while `at` is set: "HH:MM · <describeHour of the hour>" + a small "עכשיו" chip button
  (44 px hit area) that calls `toNow()`. Reuse existing readout styles.
- Everything that follows `at`: sun (`sunPosition` is minute-exact already), `airInput` (interpolate numeric hourly
  fields between the floor hour and the next — temperature, cloudCover, windSpeed, windGusts, precipitation, humidity
  — weatherCode from the nearest hour; extend `airInput`'s test or add one), sky light, `mapMarks`/lit windows
  (already from localHour + sunElevation), twilight glow (`twilight(day, at)` instead of now).
- While scrubbing, CSS transitions on the sun position and on `--sky-*` must be off (`data-scrubbing` on `.app`), so the
  scene tracks the finger; Atmosphere `glide` 120 while scrubbing, 320 on a pick, 900 on the rewind.
- Docs: amend `docs/design/ATMOSPHERE.md` §Hour preview and `docs/design/SPEC.md` §4 "Hour select" with the decisions
  above (short).

Report at the end: files changed, test counts, anything not done.
