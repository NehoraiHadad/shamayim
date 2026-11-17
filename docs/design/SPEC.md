# Shamayim v3: UI and motion spec

This spec merges two reviews: `review-fable.md` and `review-codex.md`. Where they disagree, the decision recorded here is final. Exact values that this file does not repeat come from the Fable review. Design target: 375 × 812.

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Sun arc | **Deleted**, not shrunk. The sun now appears in three places: the valley scene, a thin marker in the hourly strip, and an "אור יום" row in the day detail. | The owner's complaint. It used about 125 px to repeat two times shown elsewhere. |
| Signature moment | **Valley cross-section**, from Fable: Samaria in the west (left), the Gilead in the east (right), a dashed sea-level line above the village at ‎−175 מ׳, and the real sun moving behind the ridges. | This is the one place to be bold. It replaces the ridge, the arc and the depth chip. Codex's "now disc" idea is dropped. |
| Hero | Temperature in Karantina at **112 px** (Fable suggested 142, Codex 104). Centred, with the sentence centred under it (top bar, strip and sheet stay edge-aligned). No condition icon or label: the strip's "עכשיו" slot shows the icon right below and the sentence says it in words; screen readers hear it with the temperature. One secondary line: feels-like when it differs by 2° or more, else gusts when they reach 20 km/h or more, else nothing. The ↑max ↓min line is dropped. | Shows each number once. The sentence already gives the maximum. |
| Top bar | One line: place name in 18 px serif, "בקעת הירדן" muted beside it in 13 px (it truncates first). Status pill is a 32 px round icon while data is under 30 min old; it shows the age or "אין חיבור" only when that matters. 44 px hit area. Depth chip removed. | Frees about 30 px. |
| Hourly strip | About 120 px tall. Sun events become a 1 px marker between hours. The probability row collapses when the window has no rain. A midnight divider carries the weekday. Tap an hour to select it: a readout line appears and the sun in the scene moves to that hour. Arrow keys work. | Clearer rhythm; makes the strip and the scene work together. |
| Sheet | No handle. Paper tinted per theme, with a new `sheetAccent` token. Dusk gets a plum sheet. The wear note has no box: a 3 px inline-start rule and 18 px serif text. Rows are 56 px with hairlines. The open day sits in a well with radius 16. Facts are a two-column list. | Gets rid of the "identical cards" look. |
| Uncertainty | Model spread is drawn as faded ends on the range bar. Tags: "הערכה" for days 6–7 and "עשוי להשתנות" for an uncertain near day. | Shows uncertainty visually instead of only labelling it. |
| Contrast | The gradient keeps all text on `top` or `mid`. The contrast test raises ink-on-mid to 4.5 and adds `sheetAccent` and `sheetMuted` against each paper. | Light horizons failed the contrast check. |
| Night classes | `dark-sheet` (dusk and night) controls the sheet colours. Stars appear only in night, and in dusk at 40% opacity. | The navy slab under an orange sky read as a bug. |
| Pull-to-refresh | None. A tap on the pill gives the feedback, as both reviews agree. | Avoids fighting iOS scrolling. |

## 2. Layout at 375 × 812

```
  0  place 18px serif · בקעת הירדן 13px, one line      (⟳ 32px; words only when 30+ min old or offline)
 74  112px temperature, centred; מרגיש כמו 27° under it when it applies
210  sentence, 24px serif, 1–3 lines, centred
290  hourly strip, 120px  (selection readout line when an hour is tapped)
418  VALLEY SCENE, 128px (the sheet overlaps the lowest 14px, straight cut)
526  sheet: wear note → "השבוע הקרוב" → today, tomorrow…
```

## 3. Tokens (`src/ui/tokens.css`)

- Type: 112/0.82 Karantina. 24/1.32, 18/1.4 and 20 Frank Ruhl Libre. 15/1.45, 13/1.4 and 11/1.3 Assistant. Numerals are tabular.
- Space: 4, 8, 12, 16, 24, 32. Gutter 20 px in both the sky area and the sheet.
- Radius: picker sheet 28, well 16, selected slot 12, pill 999. Nothing else is rounded. The sheet has no corner radius or shadow: its top edge is a straight cut, the base line of the valley cross-section.
- Easing:
  - `--ease-out: cubic-bezier(.22,.8,.2,1)`
  - `--ease-in-out: cubic-bezier(.4,0,.2,1)`
  - `--ease-in: cubic-bezier(.4,0,1,1)`
- Durations: `--d1` 160, `--d2` 240, `--d3` 320, `--d4` 520, `--d5` 900, `--d6` 1600 ms.

## 4. Motion

There are four verbs: the sun **travels**, lines **draw**, text **fades** (opacity only), and the air **drifts** (ambient, paced by the data, never triggered by touch; see `ATMOSPHERE.md`). The sheet is the only element that slides, and it slides once.

- **Load**, one sequence driven by `.app[data-intro]` (see `src/ui/motion/intro.css`):

  | Start | Element | Motion |
  |---|---|---|
  | 0 ms | sun | travels from the ridge, 900 ms |
  | 120 ms | hero digits | mask reveal, 520 ms |
  | 260 ms | condition | fades in |
  | 300 ms | sheet | rises 24 px, 520 ms |
  | 340 ms | sentence | fades in |
  | 480 ms | curve | draws, 700 ms |
  | 560 ms | hour labels | 24 ms stagger |
  | 700 ms | range bars | grow with a 30 ms stagger |

  - The entrance animations that live in individual components are removed.
  - There is no count-up on first load. A count-up plays only after a refresh changes the value, over 400 ms.
- **Theme change:** sky colours 1600 ms. Sheet and ink 520 ms. The layers stay mounted and cross-fade. The load animation does not replay.
- **Day disclosure:**
  - The panel animates `grid-template-rows` from 0fr to 1fr in 320 ms with `--ease-out`, and closes in 240 ms with `--ease-in`.
  - Content fades in over 160 ms after a 100 ms delay.
  - A closed panel is `inert` and is not unmounted.
  - Only one panel is open at a time. After opening, `scrollIntoView` with `block: 'nearest'`.
- **Hour select:**
  - The dot grows to r 4.5 in 160 ms.
  - The slot gets a 10% ink wash with radius 12.
  - The readout fades in over 160 ms.
  - The sun moves to that hour in 320 ms.
  - The valley scrubs at about four minutes per horizontal pixel (left is later); the strip also supports mouse/pen
    drag while touch keeps native scrolling. Both expose the minute-exact shown time and keyboard controls.
  - Release holds for 6 s, then rewinds through the intervening minutes over 900 ms; the “עכשיו” chip returns at once.
    Reduced motion cuts to now. The continuous sky and air follow shown time; the paper sheet stays on now.
- **Refresh:**
  - The icon spins once every 800 ms, for at least 600 ms.
  - On success it shows a check for 1200 ms with "עודכן עכשיו".
  - On failure it cross-fades to the warning style. No shake.
- **Reduced motion:**
  - No travel, draw, slide or count-up.
  - Fades last at most 160 ms; sky transitions 320 ms.
  - Layers are static; disclosure is instant.

## 5. Theme colour changes (`skyThemes.ts`)

- `mid`: clearDay `#2A74B8`, heat `#A84F1C`. Any other theme that fails 4.5 is darkened until the test passes.
- `sheet` and `sheetAccent` per theme come from the table in review-fable.md §5. Dusk: sheet `#211A33`, ink `#F4EEF7`, muted `#B3A9C9`.
- The gradient uses content-tied stops: `top 0`, `mid 12rem`, `mid 27rem`, `horizon 33rem` (was svh, which let short viewports put the pale horizon under the strip and the scene caption). The horizon colour appears only behind the scene; sky text near it carries a soft `--sky-mid` halo.
- `index.html` has a pre-paint script that reads the last theme from localStorage and sets the `html` background and `theme-color`.

## 6. Copy

Adopt the review-fable.md §6 table as written:

- pill copy, "השבוע הקרוב", "הערכה", "עשוי להשתנות";
- confidence wording, feminine UV forms, error copy, attribution with commas.

Also:
- The sentence starts with "בהמשך היום" when the current condition differs from the day's dominant one.
- The scene's label for screen readers: "השמש מעל הבקעה. שקיעה ב־16:36. היישוב 175 מטר מתחת לפני הים."

## 7. Who builds what

1. **F0, me:** tokens, theme colours and test, pre-paint script, App layout with SunArc/Ridge removed, `dark-sheet`.
2. **Lane A (sky), me:**
   - `src/ui/scene/*`, TopBar, StatusLine, Hero, `hourly/*`, Sky, compose "בהמשך היום";
   - the intro choreography in `src/ui/motion/*`.
3. **Lane B (sheet), Codex:**
   - Sheet, WearCard, DayRow, RangeBar, WeekList, `week/DayDetail`, `text/format.ts`, States, Attribution;
   - new `States.module.css` and `Attribution.module.css`.
   - Brief: `docs/briefs/codex-sheet-v3.md`. Codex must not touch `index.css` or any lane A file.
