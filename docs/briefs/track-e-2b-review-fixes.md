# Track E, brief 2b — review fixes for the tokens commit (ccd49e9)

From the Opus review of `git show ccd49e9`. Exact, small changes.

1. Status-line focus ring (regression). `src/ui/StatusLine.module.css`: the shared `:focus-visible` rule now outlines the transparent
   44 px `.status` hit area, a rectangle around empty space. Restore the ring on the visible pill:
   `.status:focus-visible { outline: none }` and `.status:focus-visible .pill { outline: 2px solid var(--focus); outline-offset: 2px }`,
   and point the forced-colors `Highlight` rule at `.pill` again. Check every other control whose visible shape is an inner element
   (grep for the same pattern: a transparent hit area with `::after` or padding around a visible child) and do the same there if needed.
2. Scrubber ring on the light horizon (`src/scene/react/Scene.module.css`, the slider's focus): white ink on a light horizon is ~1.5:1.
   Give the ring a two-tone edge so it is ≥ 3:1 on any backdrop: `outline: 2px solid var(--focus)` plus
   `box-shadow: 0 0 0 4px var(--ridge-near)` just outside it (or the inverse, whichever reads correctly). Test: the pair ink/ridge-near ≥ 3:1
   for every theme and live sample — one of the two edges must clear 3:1 against the horizon colour.
3. Focus and on-accent tests that test real surfaces (`src/theme/contrast.test.ts` or a sibling `focus.contrast.test.ts`, < 150 lines):
   - `--focus` (ink) against the sky top, the sky mid (where the hourly strip sits), the horizon (scrubber, via the two-tone rule), the
     place picker panel (the same mix as `PlacePicker.contrast.test.ts`), and `--sheet-ink` against the sheet and the dark sheet: ≥ 3:1.
   - Run the focus and `--on-accent`/`--accent` checks over live `skyLight` samples too (dawn, noon, dusk, night × clear, cloudy, wet),
     the same sampler `heightLabel.contrast.test.ts` uses — extract that sampler to one shared test helper (DRY) instead of copying it.
4. Leftovers: `WearCard.module.css` magic `line-height: 0.962rem` → `1.4`; restore offset 0 on the attribution links if they had it before
   (the rain-page close button becomes brief 3's IconButton) (`git show ccd49e9^:<file>`). (Leave `OverheadPage.module.css` alone: another writer owns it now.)

## Precision — pay attention to subtleties and accuracy
WCAG 2.2: 3:1 for focus indicators against adjacent colours, 4.5:1 for text. Compute from the composed colours, never a tautology. RTL:
logical properties only. No other visual change. Files < 150 lines, DRY. Run `npx tsc -b`, `npx oxlint`, targeted vitest
(`src/theme`, `src/ui`, `src/scene/react/*.contrast*`). Do not commit; report.

## Parallel writers
Brief 3 runs at the same time and owns `src/ui/overhead/*`, `PlacePicker*`, `StatusLine.tsx`, `SceneScrubber.tsx`, `HourlyStrip.tsx`, `src/text/*`, `index.html`, `src/pwa.ts`: do not edit those.
