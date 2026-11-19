# Sunset behind the hill: the words keep the calendar time, the picture keeps the hill (2026-11-19)

Decided by the owner on 2026-11-19, after a first, richer proposal (below) and a consult with Fable.

## Problem
Haifa (geocoder point 32.813, 34.9993, ground ~65 m), 19.11: the strip and "אור יום" in the day detail said
**"שקיעה 15:48"**. Calendars say 16:37 (sea level), or ~16:40 for the visible sunset. The math was right: toward the
sunset azimuth (~240°) the Carmel rises ~9° above the eye at that point, and the sun goes behind it at ~15:45–15:48. The
word was wrong: "שקיעה" next to a time 49 minutes earlier than any calendar reads as a bug. It is also true only at the
point: Haifa is on the sea, and from most of the city (the lower city, Bat Galim, the ridge) the sun is seen setting over
the sea at the calendar time.

## Decision
- **"זריחה" / "שקיעה" always mean the calendar time** (Open-Meteo, flat horizon with standard refraction, which is
  what a zmanim table calls שקיעה מישורית): hourly strip markers and their chips, the edge pill, the strip's
  screen-reader list, "אור יום" in the day detail, the scene's screen-reader label.
- **The time the sun comes over / goes behind the land is shown only by the picture**: the disc sinks behind the
  drawn ridge, the glow stands where it goes behind, direct light leaves the land (unchanged, `visibleSunrise/Set`).
  The owner: you see it with your own eyes in the scene, so no number and no extra words. Nothing is added anywhere.
- Sky theme and sentences keep the calendar times (owner decision 2026-11-18, unchanged).

| Thing | Time |
|---|---|
| Sun disc, twilight glow, light on the land | visible (`visibleSunrise/Set`) |
| Sky theme, sentences, day/night icons | calendar |
| Strip markers, chips, edge pill, screen-reader list | calendar (was visible) |
| "אור יום" in the day detail | calendar (was visible) |
| Scene screen-reader label (`nextSunEvent`) | calendar (was visible) |

## Why not more
Considered and dropped as too much data for the screen (owner: "I don't want to overload or confuse"):
a second line in the strip chip ("מאחורי ההר 15:48"), a "שמש ישירה" row in the day detail, an elevation line
("בגובה ‎65 מ׳") for the relief problem, a scrub-readout phrase ("השמש כבר מאחורי הרכס"), a gap threshold
(8–10 min), and generic land words (ההר / הגבעה / הרכס). Fable's consult preferred one muted line in the day detail
("השמש מאחורי הרכס מ־15:50 בערך") plus the scrub phrase; kept here in case it is wanted later. Naming ridges (Carmel,
Gilead) was ruled out: the DEM knows no names and a wrong name is worse than none.

## Checks
- Tests: strip markers stay on the calendar sunset when `visibleSunset` is earlier (`timeline.test.ts`); the scene
  label's next event is the calendar time while the glow still peaks at the visible one (`visibleSun.test.ts`).
- Stills 375 px DPR 2, 19.11 (`docs/design/qa/visible-sun/`): Haifa 15:20 (chip "שקיעה 16:36", day detail
  "אור יום 06:13–16:36") and 16:05 (sun already behind the Carmel in the scene, glow on its left, chip still
  "שקיעה 16:36"); Jerusalem "שקיעה 16:38"; Tel Aviv "שקיעה 16:39"; Shadmot 06:20 (sun still behind the Gilead with
  its glow, the next event is "שקיעה 16:35", day detail "אור יום 06:10–16:35").
