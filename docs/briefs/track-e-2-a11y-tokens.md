# Track E, brief 2 — landmark, legible small text, shared tokens (audit #11, #12, #13, #22)

Repo: Shamayim, a Hebrew RTL weather PWA (React + TS + Vite, CSS modules, vitest, oxlint). Work only in this checkout.
Read first: `docs/design/qa/polish/AUDIT.md` rows #11, #12, #13, #22 and `docs/design/qa/polish/ui-sweep.md` rows 3, 4, 5, 15, 16, 17.
Line numbers there may be stale: find code by content. Design tokens live in `src/ui/tokens.css`; contrast helpers in
`src/theme/contrast.ts` (`ratio`, `mix`, `cssTokens`); see `src/ui/PlacePicker.contrast.test.ts` and `src/theme/contrast.test.ts` for the
pattern. Themes: `src/theme/skyThemes.ts` (`SKY_THEMES`), live sky colours: `src/theme/skyLight.ts`.

## #11 one `<main>`
`src/App.tsx`: today `<main className="sky-area">` closes before `<div className="lower">` (scene, sheet with wear card, week list,
rain-map entries, attribution). Make ONE `<main>` that holds both the sky area and `.lower`. Keep `.sky-area` as a `<div>` with the same class
and `data-air-band` so CSS and the scene keep working. The `<footer>`/attribution may stay inside `.lower` (a footer inside main is fine) or move
right after `</main>` — pick whichever keeps the layout pixel-identical. No visual change at all.

## #12 the canvas height label
`.depth` in `src/scene/react/Scene.module.css` (11 px, `opacity: .68`, halo in `--ridge-near`) and `.backed` in `SceneOverlay.module.css`
(`opacity: .85`, `--ridge-near` 72 % backing). Make it: font-size the new caption token (below, 12 px), NO opacity on text (if the design
wants it quieter, mute the colour by a mix that is still tested, not by opacity), keep the halo/backing. Add
`src/scene/react/heightLabel.contrast.test.ts`: for every `SKY_THEMES` entry, the label's text colour against `--ridge-near` ≥ 4.5:1, and
against the `.backed` backing (`--ridge-near` 72 % over the theme's land/sky behind — use the darkest and lightest plausible backdrop the
theme defines) ≥ 4.5:1. If `skyLight` computes `ink`/`ridgeNear` live, also sample it across a day (dawn, noon, dusk, night) for one place
and assert the same. If any pair fails, fix the colour tokens, not the test.

## #13 one minimum caption size
Add `--text-caption: 0.75rem; /* 12 px: the smallest text the app sets */` to `tokens.css`. Replace every text use of `--text-xs` and the
hard-coded 0.65625rem / 0.6875rem sizes (`OverheadPage.module.css`, `MapMarks.module.css`, `WearCard.module.css`,
`hourly/markers.module.css` ×3, `hourly/HourlyStrip.module.css`, `Scene.module.css`) with `--text-caption`. Then delete `--text-xs` if nothing
non-text still needs it. grep the whole `src` for any `font-size` under 12 px (rem < 0.75, px < 12) and fix those too. Check that the hourly
strip slot (54 px wide) still fits its labels at 12 px — no overflow or ellipsis (report what you checked).

## #22 tokens and one focus rule
- `--page-pad` (the page's side padding, today 16 px on `.lower` in `src/index.css`) and `--bleed: calc(-1 * var(--page-pad))`; use them
  in `src/index.css`, `Sheet.module.css`, `Attribution.module.css`, `Scene.module.css`, `hourly/HourlyStrip.module.css` instead of the
  hand-typed 16/14/20/8 px negatives — but only where the value IS the page pad; a different number with a different meaning stays, with a
  short comment. Layout must stay pixel-identical (compare before/after at 375 px).
- `--focus` token: ink on the sky, sheet ink on paper (set it in the theme/sheet var blocks that already set `--ink`/`--sheet-ink`).
  One `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` base rule in `src/index.css`; delete the 13 per-module
  copies (`grep -rn "outline: 2px" src`), keeping only offset overrides where a control needs them. Keep forced-colors rules.
- Hard-coded colours to tokens: `--on-accent` (error button text, `States.module.css`), `--warn` (`StatusLine.module.css`),
  `--ok/--mid/--bad` (confidence meter, `week/DayDetail.module.css`), `--scrim` (the duplicated `rgb(5 9 20 / 50%)` backdrop in
  `PlacePicker.module.css` and `overhead/OverheadPage.module.css`). Same values as today unless a contrast test fails.
- Extend `src/theme/contrast.test.ts` (or a sibling test under 150 lines) for the new text pairs: `--on-accent` on `--accent` for every theme,
  `--warn` text on its pill, `--focus` against the sky top and the paper ≥ 3:1 (WCAG 1.4.11 non-text).

## Precision — pay attention to subtleties and accuracy
- WCAG AA: 4.5:1 for text under 18.66 px bold / 24 px regular, 3:1 for focus rings and UI marks. Compute, don't eyeball.
- RTL: use logical properties (`padding-inline`, `margin-inline`, `inset-inline`) for anything you touch; never introduce left/right.
- No visual change except the label (bigger, opaque) and captions (12 px). Keep `prefers-reduced-motion` and forced-colors behaviour.
- Keep files under ~150 lines, DRY, no dead tokens, no unused imports. Don't touch `src/scene/model`, `src/scene/paint` or `src/world`.
- Finish with `npx tsc -b`, `npx oxlint`, and targeted vitest (`npx vitest run src/theme src/ui src/scene/react/heightLabel`), all green.
  Do NOT commit; report what changed per finding and the test output.
