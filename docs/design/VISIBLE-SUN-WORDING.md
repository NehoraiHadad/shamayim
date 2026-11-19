# Sunset behind the hill: what to show, and in which words (Claude, 2026-11-19, waiting for owner approval)

## Problem
Haifa (geocoder point 32.813, 34.9993, ground ~65 m), 19.11: the strip and "אור יום" in the day detail say
**"שקיעה 15:48"**. Every calendar says 16:37 (sea level), or ~16:40 for the visible sunset. The math is right: toward the
sunset azimuth (~240°) the Carmel rises ~9° above the eye at that point, and the sun goes behind it at ~15:45–15:48
(checked separately against the DEM, NOAA sun position and earth curvature). What is wrong is the word: "שקיעה" next to a
time 49 minutes earlier than any calendar reads as a bug. Also, in a city with big relief the "behind the ridge" time
holds only for the point: on the Carmel itself the sun sets at ~16:40.

Today `withVisibleSun` (`src/ui/scene/visibleSun.ts`) sets `day.visibleSunrise/visibleSunset`, and they replace
`sunrise/sunset` in the strip markers (`hourly/timeline.ts`), the edge pill and its screen-reader text
(`HourlyStrip.tsx`), "אור יום" (`week/DayDetail.tsx`), the scene's screen-reader label and the glow
(`scene/sceneModel.ts`).

## Principle
Two different facts, two different names. Never one name for both.

- **"זריחה" / "שקיעה"** always mean the astronomical time (Open-Meteo, sea-level horizon with standard refraction). It
  is the time calendars and zmanim tables call שקיעה (מישורית), so it is always shown and always correct.
- **The time the sun comes over / goes behind the land** is the app's own fact. It never carries the word "שקיעה" or
  "זריחה". It is phrased as what the sun does: *נעלמת מאחורי ההר*, *מופיעה מעל ההר*.

## 1. When to show one time and when two
Show the land time only when it tells something a calendar does not:

| Condition | Shown |
|---|---|
| No panorama yet (stand-in drawing, offline first visit) | astronomical only (as today) |
| gap < **8 min** | astronomical only |
| gap ≥ 8 min and the land that hides the sun is **above** the eye (angle > 0.5°) | both |

- *gap* = visible sunset earlier than the astronomical one (or visible sunrise later). Each side is judged on its own:
  Shadmot shows both in the morning (Gilead, ~18 min) and in the evening (western hills, ~19 min); Haifa only in the
  evening; Tel Aviv neither (sea).
- Why 8 minutes: near the horizon the sun drops about 1° every 5 minutes here, so 8 minutes is ~1.5° of land, clearly
  more than DEM rounding and refraction noise (±2–3 min), and more than the spread between calendars (sea-level vs.
  "visible" vs. elevation-corrected, 1–4 min). Below that the second time looks like a disagreement over nothing.
- A high place whose sea horizon dips below eye level (the Carmel ridge) gets a visible time *later* than the
  astronomical one. That is not "behind a hill" and the gap is small (~3 min); it is never shown.
- The threshold is one number in `config/thresholds.ts` (`sunBehindLandMin: 8`).

## 2. Which time drives what

| Thing | Time | Change |
|---|---|---|
| Sun disc, glow behind the ridge, light on the land (scene) | visible | none |
| Sky theme, sentences, day/night icons in the strip | astronomical | none (owner decision 2026-11-18) |
| Strip marker and its chip | **astronomical**, plus a second hairline at the visible time when shown | changed |
| Edge pill (marker scrolled off) | astronomical | changed |
| "אור יום" in the day detail | astronomical | changed; visible time on its own row |
| Scene screen-reader label | both, by the rule above | changed |
| Scrub readout | adds a phrase only inside the gap | new |

## 3. Copy (Hebrew)

Land word: **"ההר"** when the land that hides the sun stands 150 m or more above the place (Carmel over Hadar, Gilead
over the Jordan Valley, Arbel slopes over Tiberias), **"הגבעה"** below that (Shadmot's western hills, ~50–90 m). The
panorama knows the height and distance of the hiding point (`HorizonRay.far/near`), so this needs no new data.

Naming the ridge (Carmel, Gilead) is *not* in this change: the DEM does not know names, OSM ridge names are patchy, and a
wrong name is worse than a generic word. Possible later as a short curated list (name + bearing range + region).

**Hourly strip** (chip is 18 px tall, slots 54 px; 49 minutes is ~44 px, two chips would collide):
- Solid hairline at the astronomical time, chip **"שקיעה 16:37"** (as today, the true time).
- When the land time is shown: a dashed hairline at 15:48, and the chip gets a second, smaller, muted line under it:
  **"מאחורי ההר 15:48"** (sunrise: **"מעל ההר 06:30"**). One chip, two lines, no glued phrase. If the stills show it
  cramped, fallback: second line only in the day detail and screen-reader text.
- Edge pill: **"שקיעה 16:37"** only.
- Screen readers (`visually-hidden` list): **"שקיעה ב־16:37, השמש נעלמת מאחורי ההר כבר ב־15:48"**;
  sunrise: **"זריחה ב־06:12, השמש מופיעה מעל ההר רק ב־06:30"**.

**Day detail**:
- `אור יום` **06:12–16:37** (astronomical, always).
- New row when the land time is shown: `שמש ישירה` **06:30–16:16** (both sides), **עד 15:48** (evening only),
  **מ־06:30** (morning only). "שמש ישירה" is ordinary Hebrew for the sun shining on you; clouds are the weather's job,
  told elsewhere. Alternative if the owner prefers: label `מאחורי ההר`, value `מ־15:48`.

**Scene screen-reader label** (by the next event after now):
- before the land time: "שקיעה ב־16:37. השמש תיעלם מאחורי ההר כבר ב־15:48."
- between the two: "השמש כבר מאחורי ההר. שקיעה ב־16:37."
- sunrise mirror: "זריחה ב־06:12. השמש תופיע מעל ההר רק ב־06:30." / "השמש עוד מאחורי ההר. היא תופיע ב־06:30."

**Scrub readout** (only while the shown time is inside the gap): one more part after the weather,
"השמש כבר מאחורי ההר" / "השמש עוד מאחורי ההר". The scene already shows it; the words say why the land went dark at
16:00 while the sky is still bright.

## 4. Relief: the time belongs to the point
The visible time is true at the place's point and eye height. It moves a lot with a few hundred metres only when the
hiding land is **near**. Rule: when the hiding point is **closer than 5 km**, the "שמש ישירה" row says where:
`שמש ישירה` **עד 15:48** with a muted line **"בגובה ‎65 מ׳"** (the same number the scene shows). In Haifa that tells
a Carmel resident why it is not their time; in Shadmot (Gilead ~10 km away) the whole valley shares the time, so no
line. Screen readers get the same words. Nothing more: no "on the ridge it would be" guess, which the app cannot know.

## 5. Zmanim
- "שקיעה" stays the astronomical (sea-level) time, which is what a zmanim table calls שקיעה מישורית. It is never
  replaced and never hidden.
- The land time is not offered as a halachic time and is not labelled "שקיעה נראית": calendars that print a visible
  sunset use their own elevation models and would disagree with ours by minutes.

## 6. Data shape
`withVisibleSun` keeps `visibleSunrise/visibleSunset` and adds, per side, what hid the sun:
`DayPoint.sunLand?: { rise?: SunLand; set?: SunLand }`, `SunLand = { time, angle, km, aboveM }` (only when a panorama
exists). One pure helper, `sunEvents(day, threshold)` → `{ rise: { time, land: SunLand | null }, set: … }`, decides
"one time or two" once; strip, day detail and scene all read it. Hebrew phrases live in `src/text` (`sunPhrases`).
No new Open-Meteo variable, no Worker change.

## 7. Checks
- Unit: threshold edges (7/8 min), land above vs. below eye, hill vs. mountain word, near vs. far point, sunrise-only,
  sunset-only, no panorama, phrases in each state, strip markers (one or two hairlines).
- Stills 375 px DPR 2 in `docs/design/qa/visible-sun/`: Haifa (two times in the evening, height line), Jerusalem,
  Tel Aviv (one time each side), Shadmot (both sides, no height line). Strip around sunset and the open day detail.
