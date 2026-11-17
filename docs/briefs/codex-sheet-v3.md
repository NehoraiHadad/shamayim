# Codex brief: v3 sheet lane (lane B)

Read these first:
- `docs/design/SPEC.md`, which has the final decisions;
- `docs/design/review-fable.md` §2 (sheet wireframe), §5 (hierarchy on the sheet, week-row changes) and §6 (copy).

Another engineer is building the sky lane in parallel. **Edit only the files listed under "Files you own".**

## Files you own
- `src/ui/Sheet.tsx`, `Sheet.module.css`
- `src/ui/WearCard.tsx`, `WearCard.module.css`
- `src/ui/WeekList.tsx`, `WeekList.module.css`
- `src/ui/DayRow.tsx`, `DayRow.module.css`
- `src/ui/RangeBar.tsx`, `RangeBar.module.css`
- `src/ui/week/DayDetail.tsx`, `DayDetail.module.css` (you may add files in `src/ui/week/`)
- `src/ui/States.tsx`, plus a new `src/ui/States.module.css`
- `src/ui/Attribution.tsx`, plus a new `src/ui/Attribution.module.css`
- `src/text/format.ts`: only `uvLabel` and `airLabel`, plus any new helpers. Leave `updatedAgo` as it is.
- Tests for the code above, for example `src/text/format.test.ts`.

**Do not touch:** `src/index.css`, `src/App.tsx`, `src/ui/hourly/*`, `src/theme/*`, or anything else.
- The `.state*`, `.skeleton*` and `.attribution` rules in `index.css` stay for now; I will delete them after you finish. Your new module CSS must fully replace them.
- `App.tsx` renders `<Attribution withAir={...} />` and `<ErrorState message onRetry />` and `<LoadingState />`. Keep those props.

## Tokens available
- On the root, from `themeVars`: `--sheet`, `--sheet-ink`, `--sheet-muted`, and the new `--sheet-accent`. `--sheet-accent` is the sky's mid tone and reads at 4.5:1 or better on every paper.
- The root has class `dark-sheet` when the sheet is dark (dusk and night). The old name `is-night` is gone; I already renamed it in your CSS files.
- `src/ui/tokens.css` is coming from me, with `--ease-out: cubic-bezier(.22,.8,.2,1)` and `--ease-in: cubic-bezier(.4,0,1,1)`. Use those names with literal fallbacks, for example `var(--ease-out, cubic-bezier(.22,.8,.2,1))`.

## Work

1. **Sheet**
   - Remove the handle.
   - Padding: 20 px inline, 16 px top.
   - Keep radius 28 on the top corners only, and keep the shadow.
   - Transition background and color over 520 ms.

2. **Wear note** (`WearCard`)
   - Remove the card: no background and no t-shirt icon.
   - Add a 3 px inline-start rule in `--sheet-accent` (in RTL that is the right edge), with 12 px padding beside it.
   - The label "מה ללבוש {when}" is 13 px, weight 600, `--sheet-muted`.
   - The text is 18 px Frank Ruhl Libre 500, line-height 1.4.
   - Add 24 px of space below it.

3. **Week** (`WeekList`, `DayRow`, `RangeBar`)
   - Title: "השבוע הקרוב", 13 px, weight 600, muted.
   - Row: 56 px min-height. Grid `4.5rem 2.5rem 1fr 16px`.
   - Put the rain % (11 px) under the icon, not beside it.
   - Use a 1 px hairline between rows only, at sheet-ink 8%.
   - Chevron: 16 px, stroke 1.6, in a 44 px hit area (the whole row is the button, so this is fine).
   - Tags sit beside the date as plain 11 px muted text, with no border:
     - `lowConfidence` days: "הערכה";
     - `confidence === 'low'` near days: "עשוי להשתנות".
     - Always keep the date.
   - Range bar:
     - 8 px high.
     - Draw the model spread as faded extensions at 30% opacity. They extend by `day.spread.tempMin` past the min end and by `day.spread.tempMax` past the max end, on the same scale.
   - **Open day:** a "well" behind the row and its panel. Background sheet-ink 4%, radius 16; the hairlines next to it are hidden. Only one day is open at a time, as today.
   - **Disclosure animation** (the panel stays mounted):
     - Wrapper: `display:grid; grid-template-rows: 0fr` when closed, `1fr` when open.
     - Open: 320 ms with `--ease-out`. Close: 240 ms with `--ease-in`.
     - The inner element has `overflow:hidden; min-height:0`.
     - Content opacity goes 0 → 1 over 160 ms after a 100 ms delay; on close it fades over 100 ms with no delay.
     - A closed panel has the `inert` attribute instead of `hidden`. Keep `aria-expanded` and `aria-controls`.
     - Render `DayDetail` lazily: on first open, then keep it mounted.
     - After opening, if the panel's bottom is below the viewport, call `scrollIntoView({block:'nearest', behavior: reduced ? 'auto' : 'smooth'})`.
     - Chevron rotates over 240 ms.
   - **Remove every entrance animation** in your files: `rowIn`, `cardIn`, `grow`, and the `animationDelay` style. Instead:
     - put `data-intro="bar"` on the range fill element;
     - put `style={{'--i': index}}` on each `li`.
     - I write the choreography CSS that targets those attributes.

4. **Day detail** (`DayDetail`)
   - Replace the tiles with a two-column fact list (`dl`): label on the right, value on the left.
     - Rows are 32 px, with no boxes and no dividers.
     - Label 13 px muted, value 15 px weight 600.
   - Facts, in this order:
     - "גשם": either "40%, כ־3 מ״מ" or "לא צפוי";
     - "רוח": "משבים עד 21 קמ״ש";
     - "אור יום": `<bdi>06:08–16:36</bdi>`, one row replacing sunrise and sunset;
     - "קרינת UV": "גבוהה (6)";
     - "אוויר": "נקי / סביר / אובך / אובך כבד".
   - Hourly strip:
     - Keep it for other days, using `<HourlyStrip slots label tone="sheet" />` with its API unchanged.
     - **Do not render it for today**: the top of the page already shows it. Detect today by comparing `day.date` with `now.slice(0,10)`.
   - Confidence meter: keep the 3 bars and use the new copy:
     - high: "תחזית יציבה";
     - medium: "ייתכנו שינויים קלים";
     - low: "תחזית לא יציבה, כדאי לבדוק שוב מחר".
   - `uvLabel` uses feminine forms, with the number in parentheses: נמוכה, בינונית, גבוהה, גבוהה מאוד, קיצונית. Add a small unit test.

5. **States and attribution**
   - Move the styles into CSS modules. Copy:
     - loading, for screen readers: "מביאים את התחזית…";
     - error: title "אין תחזית כרגע", text "לא הצלחנו להתחבר. בדקו את הרשת ונסו שוב.", button "לנסות שוב".
   - Do not render the raw error message; `console.error` it once.
   - Attribution:
     - Sources separated by commas: "נתונים: Open-Meteo, DWD ICON, ECMWF" and ", CAMS" when there is air data.
     - Then: "התחזית משלבת שני מודלים אירופיים. כשהם לא מסכימים, היום מסומן ״עשוי להשתנות״. מהיום השישי והלאה זו הערכה כללית בלבד."
     - 12 px muted, centred, with a 1 px hairline above it.
     - It sits at the bottom of the sheet with safe-area bottom padding. It keeps `background: var(--sheet)` and fills the remaining height (`flex: 1`), because it renders as a sibling after `<Sheet>` inside `.lower`.

## Rules
- Hebrew RTL. `<bdi>` only for pure numbers and times, never Hebrew text.
- Keep every file under 150 lines and readable: no compressed multi-statement lines.
- Remove anything you make unused.
- Respect `prefers-reduced-motion`: the disclosure is instant and nothing slides.
- Finish with these, all passing:
  - `npm run typecheck`
  - `npm run lint`
  - `npx vitest run`
  - `npm run build`
- Do not commit. Report the files you changed.
