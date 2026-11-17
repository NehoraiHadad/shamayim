# Shamayim design review and plan (Fable)

Scope: review of `docs/design/current/1–6` and the code listed in `docs/briefs/design-review.md`. Plan only; no source was changed.
I did not run the app. Contrast ratios below are my own hand calculations and must be confirmed in `src/theme/contrast.test.ts`.

## Summary

- **Sun arc:** remove it as a separate chart. It costs about 125 px to show two times that the hourly strip already shows, and at night it is an empty dome with a dot.
- **Signature moment:** turn the generic ridge into a cross-section of the Jordan Valley with a sea-level line drawn above the village, and let the real sun rise from behind the Gilead and set behind Samaria.
- **Layout:** the sheet starts at about 526 px instead of 585–617 px, so the wear advice, today and tomorrow are all above the fold.
- **Motion:** three verbs only. The sun travels, data lines draw themselves, text fades. Only the sheet slides.

---

## 1. Critique, ranked by impact

| # | Problem | Where | Why it matters |
|---|---|---|---|
| 1 | **The sun is shown up to five times.** Strip slot, dashed arc, arc captions, and two of the four tiles in the expanded day. | 2, 4, 5 | The arc block (`SunArc` plus `margin-top:auto` and 18 px padding) takes about 125 px of the fold and adds nothing. This is the owner's complaint. |
| 2 | **The same numbers repeat three times above the fold.** Hero `↑26 ↓17`, the sentence ("עד 26°", "סביב 17°") and the curve labels. | 1, 2 | The first 400 px say one thing three times. Nothing above the fold says what to do. |
| 3 | **The actionable content is below or on the fold.** The wear card is cut by the fold at night and the week list is never visible. | 1, 2, 4 | The product's job is "what to do about it". |
| 4 | **White text on a light horizon fails contrast.** Hour labels and curve temperatures sit on roughly `#8A93A0` in cloudy (about 3.1:1). Arc captions sit on `#B9BFC9` (about 1.8:1) and on orange at dusk (about 2:1). clearDay, heat, dust and dawn have the same structure. | 2, 4 | The existing test only checks ink on `top` (4.5) and `mid` (3). Text actually sits lower, where the gradient is lighter. |
| 5 | **Dusk flips the sheet to navy while the sky is still bright.** `is-night` includes `dusk`, which starts 40 minutes before sunset. | 4 | A hard dark slab under an orange horizon. It reads as a bug. Stars also appear over an orange pre-sunset sky. |
| 6 | **Expanded day is a pile of unrelated parts.** Tinted header row, a second hourly strip with a smudged fill, four identical grey tiles, a meter. Nothing groups them or marks where the day ends. | 5 | Hard to read; the tile grid is the "identical rounded cards" tell. For today the strip duplicates the one at the top. |
| 7 | **The top bar spends 75 px on text that never changes.** Place name at 25.6 px serif is the third-largest text in a single-place app. | all | Costs fold space; pushes the hero down. |
| 8 | **Every block has its own fade-and-slide-up.** `appear`, `cardIn`, `rowIn`, `slotIn`, `rise`, `grow`, `open`, with unrelated delays. | code | No choreography. The count-up starts at target − 8, so a wrong temperature is on screen for 600 ms. |
| 9 | **Sun slot breaks the hourly rhythm.** It takes a full 54 px column with no temperature, so the curve has an unlabelled gap. A 14 px probability row is reserved even when it is empty. Midnight is unmarked. | 2, 4 | The strip is harder to scan and 16 px taller than needed. |
| 10 | **Hero has a dead quadrant and no icon.** The meta block is bottom-aligned, leaving about 45% of the width empty beside the digits. The arrows `↑ ↓` are fallback-font glyphs, joined by a `·`. | 1, 2 | Wasted space next to the most-read element. |
| 11 | **Hero and sentence can disagree.** "מעונן חלקית" (now) above "היום מעונן" (day-dominant). At night the hero still shows today's maximum, which is over. | 1, 2 | Looks like an accuracy error, which is the owner's other bar. |
| 12 | **Wear card is the weakest surface on the sheet.** 16% accent tint: yellow in clearDay, invisible grey in cloudy, mint in rain. 13 px muted title. | 1, 2, 6 | The most useful sentence has the least presence. |
| 13 | **False affordance and small targets.** The sheet handle suggests a draggable sheet; it is a normal page. The refresh pill is 32 px high (target should be 44). | all | Users will try to drag. |
| 14 | **Week rows.** The "מגמה" dashed tag replaces the date and looks like a placeholder. The probability slot leaves a wide gap between icon and name. Model spread is not shown where it matters (on the bar). | 3 | Uncertainty is labelled but not visualised. |
| 15 | **Stars collide with text.** A star sits inside the depth chip and reads as a full stop ("מתחת.לפני"). | 1, 4 | Small, but it is in the header of two screenshots. |

Smaller items:
- `uvLabel` uses masculine adjectives under a feminine label ("קרינת UV: גבוה").
- The error state prints the raw English error.
- Twelve different font sizes are in use between 11 px and 26 px.
- `html` background is always night navy, so a daytime cold start flashes dark.
- Screenshots 1, 3, 4 and 5 show an 8 px strip beside the sheet on the left. It is probably the RTL scrollbar gutter in the capture; check on a device.

---

## 2. Information architecture

### The sun-arc answer

Delete `SunArc`. Do not shrink it.
- Sunrise and sunset stay in the hourly strip, as a thin marker between hours rather than a full column.
- The scene (section 3) shows the sun's real position and one label: the next event only ("שקיעה 16:36" by day, "זריחה 06:08" at night).
- In the expanded day, the two sun tiles become one row: "אור יום 06:08–16:36".

Net effect: sun information goes from about 125 px plus two tiles to zero dedicated pixels.

### Order above the fold (375 × 812)

1. Now: temperature, condition icon and label, feels-like or wind.
2. The sentence: what will happen.
3. Hours: when.
4. The valley scene: where, and where the sun is.
5. Wear advice: what to do.
6. Today and tomorrow rows.

### Demoted, merged, removed

| Item | Decision |
|---|---|
| Sun arc | Removed. See above. |
| Depth chip | Removed from the header. The fact moves into the scene as the sea-level line. |
| Hero `↑max ↓min` | Removed. The sentence states the maximum (or tonight's low), and today's row with its range bar is now above the fold. |
| Hero second line | Shows "מרגיש כמו 27°" when it differs by 2° or more; otherwise wind when it is 20 km/h or more; otherwise nothing. |
| Place name | 20 px serif on one line; region at 13 px under it. |
| Sheet handle | Removed. |
| Wear card | Becomes an unboxed note at the top of the sheet. |
| Tiles in expanded day | Become a plain two-column fact list. Sunrise and sunset merge. |
| Hourly strip inside today's expansion | Removed for today only (it duplicates the top strip). Other days keep it. |
| Humidity, pressure | Not added. Feels-like already carries humidity, and pressure gives a resident nothing to act on. |

### First screen

Right side is the start (RTL). Numbers at the left are y positions in px.

```
  0 ┌───────────────────────────────────────┐
 18 │ (⟳ לפני 10 דק׳)            שדמות מחולה │  20px serif
    │                             בקעת הירדן │  13px
 62 ├───────────────────────────────────────┤
 74 │   ☁ 40px                      ██  ███ │
    │   מעונן חלקית  24px serif     ██  ███ │  142px Karantina
    │   מרגיש כמו 27°  15px         ██  ███°│
194 │                                       │
210 │            היום מעונן וחמים, עד 26°. │  24px serif, up to 3 lines
274 │                                       │
290 │  17   16 │☼  15    14    13    עכשיו  │  hours 13px
    │  ☁    ☁  │16:36 ☁   ☁    ☁     ⛅     │  icons 24px
    │ 23°  25°   25°   26°   26°   25°●    │  curve band 58px
410 │▒▒▒▒▒▒ night wash under night hours    │
418 │                        ☀              │
    │ שקיעה 16:36      .  '     ' .     ▟██ │  Gilead (east)
    │ ▙▄                               ▟███ │
    │ ███▙▄    - - פני הים - - - -   ▟█████ │  dashed sea-level line
    │ ██████▙▄      ●  −175 מ׳     ▟███████ │  village below the line
526 │╭─────────────────────────────────────╮│  sheet, radius 28
    ││▌מה ללבוש היום                        ││  13px label
    ││▌חולצה קצרה בצהריים, שרוול ארוך דק    ││  18px serif
    ││▌בערב.                                ││
622 ││ השבוע הקרוב                          ││
646 ││ ˅  17° ▬▬▬●▬ 26°      ☁       היום  ││  56px row
702 ││ ˅  16° ▬▬▬▬▬ 26°      ⛅       מחר   ││
758 ││ ˅  16° ▬▬▬▬▬ 27°      ☁     חמישי  ││  cut by the fold: signals scroll
812 └┴─────────────────────────────────────┴┘
```

With a two-sentence summary (three lines) everything below it moves down 32 px and the third day row leaves the fold. That is acceptable.

### Sheet, with one day open

```
╭───────────────────────────────────────╮
│▌מה ללבוש היום                          │
│▌חולצה קצרה בצהריים, שרוול ארוך דק בערב.│
│                                        │
│ השבוע הקרוב                            │
│ ˅ 17° ▬▬▬●▬ 26°        ☁        היום  │
│────────────────────────────────────────│
│╭──────────────────────────────────────╮│  one tinted well, radius 16
││ ˄ 16° ▬▬▬▬▬ 26°       ⛅        מחר  ││
││ 22   20   18 │☼ 16   14   12 …       ││  2-hour strip, no area fill
││ ───●────●────●────●────●────●──       ││
││ גשם          לא צפוי                  ││  label 13px muted, value 15px/600
││ רוח          משבים עד 21 קמ״ש         ││
││ אור יום      06:08–16:36              ││
││ קרינת UV     בינונית (5)              ││
││ אוויר        נקי                      ││
││ ▮▮▮ תחזית יציבה                       ││
│╰──────────────────────────────────────╯│
│ ˅ 16° ░▬▬▬▬░ 27°       ☁      חמישי   │
│────────────────────────────────────────│
│ ˅ 18° ░░▬▬▬░░ 27°      ☁      ראשון   │  wider faded ends = model spread
│                         23.11  הערכה   │
│                                        │
│   נתונים: Open-Meteo, DWD ICON, ECMWF   │
╰───────────────────────────────────────╯
```

---

## 3. Signature moment: the valley section and the sea-level line

One idea: **the horizon is a cross-section of the Jordan Valley at Shadmot Mehola, with sea level drawn as a line in the air above the village, and the sun as the only moving actor.**

No other weather app can show sea level above the user's head. It replaces three existing things (generic ridge, sun arc, depth chip) with one object.

### What is drawn

A band 128 px high and full width, at the bottom of the sky area. The sheet overlaps its lowest 20 px. It follows the map convention: west on the left, east on the right. That also matches the RTL time axis: the sun rises on the right and sets on the left.

- **Samaria hills (west, left):** a lower, gentler slope from the left edge down to the valley floor.
- **Gilead (east, right):** higher and steeper, rising to the right edge.
- **Valley floor:** flat, y = 100 px, roughly x = 150 to 236.
- **Village:** a 4 px dot in `--accent` on the floor at x ≈ 178, with the label `−175 מ׳` (11 px, ink at 80%).
- **Sea-level line:** 1 px dashed (`stroke-dasharray: 1 4`, ink at 55%), 24 px above the floor, spanning only the open air between the two slopes. Label "פני הים" (11 px) at its left end.
- **Two fills:** far layer `--ridge-far`, near layer `--ridge-near`, as today. No drift animation.

Starting paths for a 375 × 128 viewBox (to be tuned):
- near: `M0 128V62C28 54 52 50 78 58S118 84 150 100H236C258 88 276 52 300 40S346 26 375 30V128Z`
- far: `M0 128V50C40 38 80 44 120 58S170 80 190 84S230 70 262 44S330 14 375 18V128Z`

Trace the final shapes from a real elevation profile along latitude 32.35° N. Do not invent the skyline; accuracy is the brand. The vertical scale below sea level is exaggerated (24 px for 175 m) so the gap is readable.

### The sun

- An 18 px disc in `--accent`, as an absolutely positioned `div` so it stays round when the SVG stretches.
- Glow: `box-shadow: 0 0 0 6px accent/18%, 0 0 32px 8px accent/45%`. The existing `.glow` in `Sky` moves here and is centred on the disc.
- Position: `t = daylightFraction(now, sunrise, sunset)`. `x = 322 − 269·t` px (of 375). `y = 70 − 52·sin(π·t)`.
- It is drawn behind both ridge layers. Near sunrise and sunset the ridge really occludes it.
- When `t < 0` or `t > 1` there is no disc. We have no moon data, so no moon is drawn.
- Before sunrise, a glow behind the Gilead crest grows from 0 to 50% opacity over the last 60 minutes.
- One caption, 13 px, ink at 90%: by day "שקיעה 16:36" above the Samaria crest (left); at night "זריחה 06:08" above the Gilead crest (right). At night it must be the next sunrise, not today's.

### How it connects to the rest

- On load, the sun travels from the Gilead crest to its current position (section 4).
- Selecting an hour in the strip moves the sun to that hour (320 ms). Nothing else changes; the theme does not follow.
- Optional refinement: scale the arc height by the real noon elevation, `90° − 32.35° + declination`. The November sun then rides visibly lower than the June sun.

Accessibility: the band is `role="img"` with a label such as "השמש מעל הבקעה. שקיעה ב־16:36. היישוב 175 מטר מתחת לפני הים."

---

## 4. Motion system

### Tokens

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 0.8, 0.2, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| Durations | 160, 240, 320, 520, 900, 1600 ms |

Three verbs: the sun **travels**, data lines **draw**, text **fades** (opacity only, no translate). The sheet is the only thing that slides, once. CSS and Web Animations only; no library.

### Page load (one sequence, about 1.3 s)

The sky gradient and ridge silhouettes are painted at 0 ms with no animation. They are the stage.

| Start | What | Animation | Duration, easing |
|---|---|---|---|
| 0 ms | Sun | Travels along its path from `t = 0` to the current `t` (CSS `offset-path` or a WAAPI keyframe set). Glow follows. | 900 ms, `--ease-out` |
| 120 ms | Hero digits | Mask reveal: `translateY(28%) → 0` inside `overflow: hidden`. No count-up on first load. | 520 ms, `--ease-out` |
| 260 ms | Icon, condition, feels-like | Opacity 0 → 1 | 240 ms, linear |
| 300 ms | Sheet | `translateY(24px) → 0` | 520 ms, `--ease-out` |
| 340 ms | Sentence | Opacity 0 → 1 | 320 ms, linear |
| 480 ms | Hourly curve | `stroke-dashoffset` 1 → 0 from the "now" point (`pathLength=1`) | 700 ms, `--ease-in-out` |
| 560 ms | Hour labels and temperatures | Opacity 0 → 1, first 7 slots, 24 ms stagger | 160 ms each |
| 700 ms | Range bars | `scaleX(0) → 1` from the cold end, 30 ms stagger. Rows themselves do not move. | 520 ms, `--ease-out` |

- On a warm return (cache fresh, last visit under 30 minutes ago): only the sun moves, from `t − 0.08`, over 320 ms.
- Before first paint, an inline script in `index.html` reads the last theme id from `localStorage` and sets the `html` background and `theme-color`, so daytime does not flash navy.

### Theme transitions

- Sky custom properties: 1600 ms, `--ease-in-out` (now 1.2 s `ease`).
- Sheet background and ink: 520 ms.
- Stars, clouds, rain and dust stay mounted and cross-fade by opacity: stars 1600 ms, clouds 900 ms, rain and dust 520 ms. Today they pop in and out with conditional rendering. Pause their animations while opacity is 0.
- Stars are tied to the sun: opacity 0 until sunset, 1 at sunset + 25 minutes.

### Day expand and collapse

- Panel height: `grid-template-rows: 0fr → 1fr`, 320 ms, `--ease-out`. Collapse: 240 ms, `--ease-in`.
- Panel content: opacity 0 → 1, 160 ms, 100 ms delay. On collapse it fades in 100 ms with no delay.
- Chevron: rotate 180°, 240 ms, `--ease-out`.
- The tinted well fades in over 240 ms.
- The day's curve draws in 520 ms, starting at 120 ms.
- Opening one day closes the other in the same frame.
- After opening, if the panel bottom is below the viewport, `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.
- Keep the content mounted until the collapse transition ends. Today `{open && detail}` unmounts at once, so collapse cannot animate. Use `inert` on the closed panel instead of `hidden`.

### Hourly strip

- Native momentum scroll; keep `scroll-snap-type: x proximity`.
- **Tap a slot to select it.** The dot grows from r = 2 to 4.5 (160 ms, `--ease-out`), and a 1 px hairline runs from the dot to the hour label. The slot gets a background of ink at 10%, radius 12.
- A one-line readout appears under the strip (opacity, 160 ms): "15:00: מעונן, 26°, רוח 14 קמ״ש".
- The sun in the scene moves to that hour (320 ms, `--ease-out`).
- Selection clears after 6 s, or on a tap outside. The sun returns in 520 ms.
- After scrolling more than three slots from "now", a 32 px chip "עכשיו" fades in at the leading edge (160 ms). Tapping it scrolls back smoothly.

### Refresh feedback

- No custom pull-to-refresh. It fights iOS rubber-banding on a document scroll, and Android's native pull already reloads the page. The existing refresh on `visibilitychange` and `online` covers the rest.
- Tap the pill: the icon rotates 360° every 800 ms, linear, for at least 600 ms so it is always seen.
- Success: the icon becomes a check for 1200 ms and the text cross-fades (160 ms) to "עודכן עכשיו".
- If the temperature changed, the hero digits count from the old value to the new one in 400 ms. This is the only use of the count-up.
- Failure: the pill switches to the warning style with a 160 ms cross-fade. No shake.

### Reduced motion

Under `prefers-reduced-motion: reduce`:
- No travel, draw-on, slide or count-up. The sun is placed directly; the curve and bars are drawn complete.
- Opacity fades are kept and capped at 160 ms.
- Sky colour transitions drop to 320 ms.
- Stars, clouds and rain are static. Rain shows as a still streak texture at half opacity.
- Expand and collapse are instant; `scrollIntoView` uses `behavior: 'auto'`.

---

## 5. Visual system

### Type scale

Six sizes replace the current twelve.

| Size / line height | Face, weight | Used for |
|---|---|---|
| 142 px / 0.82 | Karantina 700 | Hero temperature only |
| 24 px / 1.32 | Frank Ruhl Libre 500 | Sentence, hero condition |
| 18 px / 1.4 | Frank Ruhl Libre 500 | Place name (20 px), day names, wear text |
| 15 px / 1.45 | Assistant 400 and 600 | Hour temperatures, row min and max, fact values, body |
| 13 px / 1.4 | Assistant 400 and 600 | Hour labels, labels, captions, pill, dates |
| 11 px / 1.3 | Assistant 600 | Rain %, scene labels, tags |

All numerals use `font-variant-numeric: tabular-nums`. Karantina stays reserved for the one number.

### Spacing and shape

- Spacing scale: 4, 8, 12, 16, 24, 32 px. Page gutter 20 px in both sky and sheet (now 20 and 18).
- Radii: sheet 28 px (top corners), open-day well 16 px, selected hour slot 12 px, pill 999 px. Nothing else is rounded.
- Shadow: the sheet only (`0 -12px 40px rgba(0,0,0,.12)`).

### Hierarchy on the sheet

| Level | Element | Treatment |
|---|---|---|
| 1 | Wear note | No background. A 3 px rule in `--sheet-accent` on the right (inline-start) edge, 12 px padding beside it. Label 13 px muted, text 18 px serif. No icon. |
| 2 | Day rows | 56 px high, 1 px hairline between rows (sheet ink at 8%). No backgrounds. |
| 3 | Open day | One well: sheet ink at 4%, radius 16, wrapping the row and its panel. The hairlines above and below it are hidden. |
| 4 | Facts inside the well | Two-column list, label right, value left, 32 px rows, no boxes, no dividers. |

Dividers appear only between day rows.

### Week row changes

- Grid: `4.5rem 2.5rem 1fr 16px`. The rain % sits under the icon (11 px) instead of beside it.
- Range bar 8 px high (now 6).
- Model spread drawn on the bar: faded extensions at both ends, at 30% opacity, as wide as `spread.tempMin` and `spread.tempMax` on the same scale.
- Trend days keep their date. The tag "הערכה" sits beside the date as plain 11 px muted text, with no dashed border.

### Hourly strip changes

- Height 120 px (now 144 plus a 22 px margin). The probability row collapses when no slot in the window has a value.
- Sun events are a 1 px vertical marker at their true x position between hours, with a 16 px glyph and the time at 11 px. They are no longer a 54 px slot.
- Night hours get a wash behind the band: `rgba(0,0,0,.14)`.
- Midnight gets a 1 px divider with the label "מחר" (or the weekday).
- When rain is forecast: bars at the bottom of the band, 4 px wide, height 0–20 px for 0–5 mm, `#7FD3EE`.
- On the sheet: remove the area fill under the curve (it smudges on paper in screenshot 5).

### Colour fixes per theme

**Sky gradient.** Attach it to the sky area, not the viewport, with stops `top 0%, mid 60%, mid 76%, horizon 100%`. All text ends by 76%; the light horizon colour lives only in the scene band. Raise the test for ink on `mid` from 3 to 4.5.

| Theme | Change | Reason |
|---|---|---|
| clearDay | `mid` `#2F7CC0` → `#2A74B8` | White on the old value is about 4.4:1; the new one about 4.9:1. |
| heat | `mid` `#B85A22` → `#A84F1C` | About 4.3:1 → about 5.2:1. |
| dusk | Own sheet: `#211A33`, ink `#F4EEF7`, muted `#B3A9C9` | Plum, in the family of `ridgeNear`, so the sheet reads as ground under the orange horizon rather than a navy slab. |
| cloudy | Cloud blobs capped at `rgba(255,255,255,.12)` behind the text rows | A bright blob sits behind the hero in screenshot 2. |
| night, dusk | Stars at 40% alpha inside x 30–100 vw, y 12–40 svh | Keeps stars from reading as punctuation next to right-aligned text. |

**Paper tint.** One cream for six themes is the generic look the brief warns about. Tint the paper slightly by the sky:

| Theme | `sheet` | `sheetAccent` (new token) |
|---|---|---|
| dawn | `#FAF1EC` | `#8E4A6E` |
| clearDay | `#F3F5F7` | `#2A74B8` |
| heat | `#FBF3E6` | `#A84F1C` |
| cloudy | `#F1F2F3` | `#5E6979` |
| rain | `#EEF3F4` | `#2C6E7F` |
| dust | `#F6EFDF` | `#8A6538` |
| dusk | `#211A33` | `#FFC27A` |
| night | `#12162B` | `#F2D58A` |

`--accent` is tuned for dark sky and vanishes on paper, so the sheet needs its own accent. Each one is the sky's `mid` colour, which ties the paper to the sky above it. Check `sheetMuted` (`#6B645A`) against each new paper in the contrast test.

---

## 6. Micro-copy

| Place | Now | Proposed |
|---|---|---|
| Update pill, fresh | עודכן לפני 10 דק׳ | לפני 10 דק׳ (aria-label keeps "עודכן לפני 10 דקות. רענון") |
| Update pill, over 60 min | עודכן לפני 3 שע׳ | נכון ל־14:05 |
| Update pill, busy | מעדכן… | מעדכן… |
| Update pill, just done | עודכן עכשיו | עודכן עכשיו |
| Update pill, offline | עודכן לפני 3 שע׳ · אין חיבור | אין חיבור, נכון ל־14:05 |
| Banner when data is over 6 h old | none | התחזית מ־08:10 וייתכן שכבר אינה מדויקת. |
| Depth chip | 175 מ׳ מתחת לפני הים | In the scene: "פני הים" on the line and "‎−175 מ׳" at the village |
| Week title | 7 הימים הקרובים | השבוע הקרוב |
| Trend tag | מגמה | הערכה |
| Low-confidence tag | לא ודאי | עשוי להשתנות |
| Confidence, high | המודלים מסכימים | תחזית יציבה |
| Confidence, medium | הבדלים קלים בין המודלים | ייתכנו שינויים קלים |
| Confidence, low | המודלים חלוקים, תחזית פחות ודאית | תחזית לא יציבה, כדאי לבדוק שוב מחר |
| Fact: wind | משבי רוח: עד 21 קמ״ש | רוח: משבים עד 21 קמ״ש |
| Fact: sun | זריחה / שקיעה (two tiles) | אור יום: 06:08–16:36 |
| Fact: UV | קרינת UV: 6 · גבוה | קרינת UV: גבוהה (6). Feminine forms: נמוכה, בינונית, גבוהה, גבוהה מאוד, קיצונית |
| Fact: air | איכות אוויר: סביר | אוויר: נקי / סביר / אובך / אובך כבד |
| Fact: rain | 40% · 3 מ״מ | 40%, כ־3 מ״מ |
| Loading (screen reader) | טוען את התחזית… | מביאים את התחזית… |
| Error title | לא הצלחנו להביא את התחזית | אין תחזית כרגע |
| Error text | בדקו את החיבור לאינטרנט ונסו שוב. | לא הצלחנו להתחבר. בדקו את הרשת ונסו שוב. |
| Error detail | Raw English message | Hidden; log it to the console only |
| Error button | נסו שוב | לנסות שוב |
| Attribution line 2 | התחזית משלבת שני מודלים; כשהם חלוקים היום מסומן "לא ודאי". | התחזית משלבת שני מודלים אירופיים. כשהם לא מסכימים, היום מסומן ״עשוי להשתנות״. |
| Attribution line 3 | הימים השישי והשביעי הם מגמה, פחות ודאיים. | מהיום השישי והלאה זו הערכה כללית בלבד. |
| Attribution separators | `·` between sources | Commas |

Sentence engine (`compose.ts`):
- When the current condition differs from the day's dominant sky, start with "בהמשך היום" instead of "היום" ("בהמשך היום מעונן וחמים, עד 26°."). This removes the apparent contradiction with the hero.
- No other wording changes; the sentences read well.

---

## 7. Build list

Item F0 goes first and is done by one person. After it, lane A (sky) and lane B (sheet) touch disjoint files. Keep every file under 150 lines.

### F0. Foundation (blocks everything else)

| Work | Files |
|---|---|
| Type, spacing, radius and motion tokens | `src/ui/tokens.css` (new), `src/main.tsx` (import) |
| Sky gradient attached to the sky area with the new stops; gutter 20 px | `src/index.css` |
| `sheetAccent` token, paper tints, dusk sheet, `mid` fixes | `src/theme/skyThemes.ts` |
| Tests: ink on `mid` ≥ 4.5; `sheetMuted` and `sheetAccent` on each paper | `src/theme/contrast.test.ts` |
| New layout order; remove `SunArc` and `Ridge`; render a stub `ValleyScene`; lift `selectedHour` state; `is-night` no longer includes dusk | `src/App.tsx`, `src/ui/scene/ValleyScene.tsx` (stub) |
| Pre-paint theme script | `index.html` |

### Lane A: sky area

| # | Work | Files |
|---|---|---|
| A1 | Valley scene: ridges, sea-level line, village, sun, caption, glow. Unit-test the sun position. Delete the old components. | `src/ui/scene/ValleyScene.tsx`, `ValleyScene.module.css`, `sunPath.ts`, `sunPath.test.ts`; delete `src/ui/SunArc.*`, `src/ui/Ridge.*` |
| A2 | Top bar on 44 px; pill with 44 px hit area, states and new copy | `src/ui/TopBar.tsx`, `TopBar.module.css`, `StatusLine.tsx`, `StatusLine.module.css`, `src/text/status.ts` (new, takes over `updatedAgo`) |
| A3 | Hero: icon in the empty quadrant, drop max/min, feels-like or wind line, count-up only on refresh | `src/ui/Hero.tsx`, `Hero.module.css`, `useCountUp.ts` |
| A4 | Hourly strip: 120 px, sun markers, night wash, midnight divider, rain bars, collapsing probability row, tap to select with readout, "עכשיו" chip | `src/ui/hourly/HourlyStrip.tsx`, `HourlyStrip.module.css`, `timeline.ts`, `timeline.test.ts`, `HourReadout.tsx` (new) |
| A5 | Sky layers stay mounted and cross-fade; stars tied to sunset and dimmed behind text; cloud cap; remove `.glow` | `src/ui/Sky.tsx`, `Sky.module.css` |
| A6 | "בהמשך היום" rule | `src/text/compose.ts`, `compose.test.ts` |

### Lane B: sheet

| # | Work | Files |
|---|---|---|
| B1 | Remove the handle; wear note without card | `src/ui/Sheet.tsx`, `Sheet.module.css`, `WearCard.tsx`, `WearCard.module.css` |
| B2 | Week rows: grid, 8 px bar, spread ends, tags, title, open-day well | `src/ui/DayRow.tsx`, `DayRow.module.css`, `RangeBar.tsx`, `RangeBar.module.css`, `WeekList.tsx`, `WeekList.module.css` |
| B3 | Expanded day: fact list, merged daylight row, no strip for today, new confidence copy, feminine UV labels, animated open and close | `src/ui/week/DayDetail.tsx`, `DayDetail.module.css`, `src/text/format.ts` |
| B4 | Loading, error and attribution copy; move their styles out of `index.css` | `src/ui/States.tsx`, `States.module.css` (new), `Attribution.tsx`, `Attribution.module.css` (new), `src/index.css` (delete those blocks only) |

### C. Choreography (after A and B merge; one person)

| # | Work | Files |
|---|---|---|
| C1 | Load sequence driven by `data-intro` attributes and `.app[data-phase]`; warm-return variant; reduced-motion rules. Each A and B item removes its own entrance animation and adds its `data-intro` attribute, so C1 edits no component CSS. | `src/ui/motion/intro.css` (new), `src/ui/motion/useIntroPhase.ts` (new), `src/main.tsx` |
| C2 | Optional: seasonal sun height from solar declination | `src/ui/scene/sunPath.ts`, `sunPath.test.ts` |

### Suggested order

1. F0.
2. In parallel: A1 and B2 (the two largest), then A4 and B3, then A2, A3, A5, A6 and B1, B4.
3. C1, then device checks at 375 × 812 in all eight themes, with screen reader and reduced motion.
