# Shamayim UI/UX and motion review

## Direction

Preserve the valley sky, Gilead ridge, and paper sheet. Edit the composition so the first screen answers: **what is it now, what changes next, and what should I do?** Design target: 375×812.

## 1. Critique, ranked by impact

1. **The sun arc takes 130–210 px without earning it.** In screenshots 1, 2, 4, and 6 it repeats sunrise/sunset already in the hourly strip and expanded tiles, pushing advice below the fold. At night its centered dot is nearly meaningless.
2. **Priority is inverted.** Hourly detail and astronomy precede the actionable clothing recommendation in screenshots 1, 2, 4, and 6.
3. **The temperature is oversized and unstable.** `38vw` Karantina dominates screenshot 4; condition/meta become secondary and the detached degree resembles a badge. Cap it at 104 px.
4. **Information repeats.** Max/min occur in hero, curve, and today row; sunrise/sunset occur in strip, arc, and tiles. Each datum needs one primary home.
5. **The hourly strip is dense and its scrollability unclear.** The edge mask clips content (especially the left side); time, icon, probability, curve, dot, and temperature compete.
6. **The sheet handle promises dragging that does not exist.** Remove it until the sheet has real drag/snap behavior.
7. **The sheet is a stack of equally rounded containers.** Advice, expanded row, tiles, and sheet have similar weight in screenshots 3 and 5. Use flat rows and rules, reserving a tinted surface for advice.
8. **Week rows scan poorly in RTL.** Day, icon, range, and tiny far-left chevron lack a clear column rhythm. Give disclosure a 44 px target and add one shared min/max legend.
9. **Touch targets are undersized.** Refresh is 32 px and the disclosure glyph 14 px. All controls need a 44×44 px minimum target.
10. **Contrast varies dangerously by theme.** White text crosses the cloudy pale horizon (2), dusk orange (4), and rain lines (6). Pills cannot rely on blur or shadow for AA contrast.
11. **Three fonts plus many 11–13 px labels weaken hierarchy.** Attribution and “מגמה” in screenshot 3 are especially small. Functional text must be ≥12 px.
12. **Status/error copy is ambiguous.** A combined timestamp/action pill does not clearly confirm refresh; stale/offline is easy to miss.
13. **Motion is scattered.** Hero, sentence, slots, rows, cards, bars, sun, ridge, and weather layers each animate separately instead of forming one sequence.
14. **Accessibility is partly good but incomplete.** `bdi`, focus styles, and `aria-expanded` are strong; the focusable scroller lacks keyboard instructions, panels unmount before an exit animation, and charts depend heavily on visual reading.

## 2. Information architecture

Above the fold, in order:

1. Place/subtitle and 44 px updated/refresh control.
2. Current temperature, condition, and feels-like only when delta ≥2°C.
3. Maximum two-line summary; hazard takes precedence.
4. Today max/min plus one relevant fact: rain ≥20%, else gust ≥35 km/h, else UV ≥6.
5. A 118 px next-12-hours viewport, horizontally scrollable through 24 hours.
6. Ridge.
7. Full action/clothing recommendation, visible by y=760 px.

Demote elevation to `בקעת הירדן · ‎175- מ׳`. **Remove the large sun arc.** Its unique daylight-position information is not actionable and does not justify its height. Replace it in the sheet with a 44 px row: `זריחה 06:08  |  10:28 שעות אור  |  שקיעה 16:36`, optionally with a 2 px progress rule. Keep sun events in expanded details for other days. Do not add humidity or pressure; humidity is justified later only if it drives heat-index advice.

```text
┌──────────────────────────────────┐
│ שמיים — שדמות מחולה  [↻ לפני 2 ד׳]│
│ בקעת הירדן · ‎175- מ׳             │
│                                  │
│ 25°  מעונן חלקית  ↑26° ↓17°      │
│ היום מעונן וחמים, עד 26°.         │
│ בערב מתקרר.                       │
│ עכשיו  13  14  15  16  17  ›     │
│ 25° ───26°──26°──25°──23°        │
│          ~ רכס הגלעד ~           │
├──────────────────────────────────┤
│ מה כדאי לעשות היום        [חולצה]│
│ חולצה קצרה בצהריים; שרוול דק בערב│
└──────────────────────────────────┘
```

```text
╭──────────────────────────────────╮
│ advice band                      │
├──────────────────────────────────┤
│ זריחה 06:08 ━━━●━━ שקיעה 16:36  │
│ השבוע       מזג   מינ׳ ─ מקס׳    │
│ היום 17.11   ☁    17 ━━━ 26 [⌄] │
│ מחר  18.11  🌤    16 ━━━ 26 [⌃] │
│ ┃ 10  12  14  16  18             │
│ ┃ 21°──24°──26°──25°──23°        │
│ ┃ גשם: לא צפוי | משבים: 21 קמ״ש │
│ ┃ תחזית יציבה — המודלים מסכימים │
│ חמישי ...                        │
│ מקורות ושיטת החיזוי [מידע נוסף] │
╰──────────────────────────────────╯
```

Only one day stays open. Opening another closes the old one; scroll only enough to retain the row and first detail line.

## 3. Signature moment: live valley horizon

Use one flourish: the temperature curve travels toward the Gilead ridge and ends in a 7 px “now” disc above it, with a 1 px light thread extending 24 px into the ridge. Within ±20 minutes of sunrise/sunset, the disc becomes `#FFD28A`, emits one 450 ms halo, and the far ridge shifts 3 px while the near ridge stays fixed. Otherwise it is static except on data update. Implement with SVG/CSS and `--accent`, no library/canvas. Reduced motion keeps the static disc/thread only.

## 4. Motion system

Tokens: fast 140 ms; standard 240 ms; spatial 360 ms; theme 900 ms. Easings: `cubic-bezier(.22,1,.36,1)` enter/spatial, `cubic-bezier(.2,0,0,1)` state, `cubic-bezier(.4,0,1,1)` exit.

**One page-load sequence:** after usable data, top/hero resolves 0–240 ms; summary 120–360 ms; curve draws via `stroke-dashoffset` 240–600 ms (labels do not stagger); ridge and sheet rise together 8 px from 480–840 ms. Remove independent `appear`, `slotIn`, `rowIn`, `cardIn`, and range-grow entrances.

**Themes:** interpolate sky colors 900 ms; ink/ridge/sheet 600 ms starting 100 ms later. Keep outgoing/incoming stars/cloud/rain/dust mounted for a 500 ms crossfade. Do not replay load motion. Update browser theme color halfway through.

**Day disclosure:** WAAPI height 0→measured `scrollHeight` plus clip-path over 360 ms; detail opacity 90–260 ms; chevron 240 ms. Close in 260 ms, then set `hidden`; reverse an active animation on rapid retap. Update `aria-expanded` immediately and do not move focus.

**Hourly strip:** native touch scrolling and proximity snap. Fade `החליקו לשעות הבאות` after 12 px of interaction. Nearest centered dot grows 4→7 px in 140 ms. Arrow keys move one logical hour (RTL: Right earlier, Left later); Page Up/Down moves four; programmatic scroll 240 ms. After 500 ms idle announce `מוצגות השעות 14:00 עד 20:00`.

**Refresh:** stable-width 44 px control; rotate once per 800 ms with `מעדכן…`. On success stop at a whole turn, crossfade to check in 160 ms, show `עודכן עכשיו` 1.5 s. On failure show `לא הצלחנו לעדכן` plus retry. Do not add pull-to-refresh because it conflicts with browser/PWA scrolling.

**Reduced motion:** eliminate count-up, ambient layers, halo, ridge drift, curve draw, smooth scroll, and height interpolation; use static refresh progress text; theme switch ≤100 ms. Preserve all final/status/focus states.

## 5. Visual system

Type at 375 px: current temperature Karantina 700, 104/88; place Frank Ruhl Libre 600, 26/30; condition Frank 500, 24/28; summary Frank 500, 24/32; section heading Assistant 700, 16/22; body Assistant 400–600, 16/24; label Assistant 600, 13/18; metadata Assistant 400, 12/16. Karantina is only for current temperature, Frank only for place/primary summary, Assistant elsewhere. Use tabular numerals and `bdi`; no Hebrew letter-spacing.

Spacing scale: **4, 8, 12, 16, 24, 32, 48 px**. Sky inset 20, sheet inset 16, row inline padding 12, sheet-section gap 24.

- Sheet: day `#FCFAF5`, night `#11162A`, top radius 28, shadow `0 -8px 28px rgba(4,8,20,.16)`; no handle.
- Advice: 10–12% accent wash, radius 12, padding 14×16, 3 px inline-start accent rule, no shadow.
- Day rows: transparent, 1 px 10%-ink dividers; open row 5%-ink fill/radius 10.
- Detail: 2 px inline-start rule; ruled two-column metric grid, not rounded tiles.
- Only interactive controls get rounded surfaces; refresh radius 12, not a pill.

Theme corrections: clear-day top `#083F82`; cloudy mid `#505C6D` and accent `#F3C969`; rain top scrim `#123044` and rain opacity ≤.12 behind content; dust noise `.08`; dusk bright horizon begins below 62svh; night muted sheet text `#ADB6D8`. Control backgrounds: dawn `#352A52CC`, clear `#0A3C78D9`, heat `#65220FE0`, cloudy `#313946DE`, rain `#10202BE6`, dust `#4B351CE6`, dusk `#302347D9`, night `#171D35E6`. Validate functional text at 4.5:1 and large text at 3:1 at its actual gradient position; shadow does not count.

## 6. Hebrew microcopy

| Context | Copy |
|---|---|
| Title | `שמיים — שדמות מחולה` |
| Updating/success | `מעדכן…` / `עודכן עכשיו` |
| Stale/offline | `הנתונים מלפני 20 ד׳ — אין חיבור` |
| Refresh failure | `לא הצלחנו לעדכן` |
| Loading | `טוענים תחזית לשדמות מחולה…` |
| Error | `התחזית לא זמינה כרגע` |
| Empty hourly/air | `אין כרגע נתונים לפי שעה` / `אין כרגע נתוני איכות אוויר` |
| Advice | `מה כדאי לעשות היום` / `מחר` |
| Week | `השבוע` |
| Confidence | `תחזית יציבה — המודלים מסכימים`; `התחזית עשויה להשתנות מעט`; `התחזית עדיין לא יציבה` |
| Long range | `מגמה בלבד` (spoken: `תחזית לטווח רחוק, עשויה להשתנות`) |
| Rain | `לא צפוי גשם`; unknown: `אין נתוני גשם` |
| Hint/detail | `החליקו לשעות הבאות`; `התחזית לפי שעה` |
| Attribution | `מקורות ושיטת החיזוי` |

Avoid duplicating feels-like in summary and hero. Prefer neutral `כדאי לקחת מטרייה` over `קחו מטרייה`. Keep generated copy to one decision plus one change.

## 7. Prioritized, parallel build list

Each wave has no cross-engineer file overlap; integrate before the next wave.

1. **A—hero/IA:** `App.tsx`, `TopBar*`, `Hero*`, `Sentence*`, new `DaylightRow*`. Remove arc, compact header/hero, reorder content. **B—copy:** `text/compose.ts`, `text/wear.ts`, `States.tsx`, `StatusLine.tsx`, `week/DayDetail.tsx`.
2. **A—hourly:** `hourly/HourlyStrip*`, `hourly/timeline.ts`, `hourly/curve.ts`. 12-hour viewport, hint, keys, announcements, horizon hook. **B—sheet/week:** `Sheet*`, `WeekList*`, `DayRow*`, `week/DayDetail.module.css`, `Attribution.tsx`. Remove handle, fix RTL grid, flatten metrics, disclose sources.
3. **A—signature/load:** `index.css`, `Ridge*`, `RangeBar.module.css`, `hourly/HourlyStrip*`. Unified sequence and horizon moment. **B—disclosure motion:** `WeekList.tsx`, `DayRow*`, `week/DayDetail.module.css`. Reversible WAAPI panel.
4. **A—themes:** `theme/skyThemes.ts`, `theme/pickTheme.ts`, `Sky*`, `index.css`. Contrast tokens/layer crossfade/reduced motion. **B—refresh/accessibility:** `StatusLine*`, `States.tsx`, `hourly/HourlyStrip.tsx`. State machine, targets, semantics.

Acceptance: at 375×812 all eight themes show current conditions, summary, ≥5 hourly slots, ridge, and full advice; no arc/false handle; all controls ≥44 px; touch/keyboard/screen-reader flows work; actual-position contrast passes AA; reduced motion removes all nonessential movement; theme change never replays load; rapid day toggles keep focus, visibility, and ARIA coherent; unknown values are never rendered as zero.
