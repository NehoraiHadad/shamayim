# Track E, brief 3 — icons, picker, slider keys, alt text, offline, loading (audit #16–#21)

Repo: Shamayim, a Hebrew RTL weather PWA (React + TS + Vite, CSS modules, vitest, oxlint). Work only in this checkout.
Read first: `docs/design/qa/polish/AUDIT.md` rows #16–#21 and `docs/design/qa/polish/ui-sweep.md` rows 7–14.
Line numbers there may be stale: find code by content. Briefs 1 and 2 (`docs/briefs/track-e-1-bidi.md`, `track-e-2-a11y-tokens.md`) already
landed: reuse `src/text/isolate.ts` (`ltr`, `tempText`, `clockRange`) for any number in new Hebrew strings, and the `--focus`, `--scrim`,
`--text-caption` tokens and the single `:focus-visible` rule. Put all new Hebrew copy in `src/text/` (not inline in components) where that
module already exists for the area (e.g. `src/text/status.ts`); otherwise a small new `src/text/*.ts`.

## #16 one IconButton, SVG icons
- New `src/ui/icons.tsx` (CloseIcon, PlayIcon, PauseIcon; 24×24 viewBox, `stroke="currentColor"`/`fill="currentColor"`, `aria-hidden`)
  and `src/ui/IconButton.tsx` (+ `IconButton.module.css`): a `<button type="button">` with required `label` (aria-label), 44×44 px hit area,
  focus from the global rule. Use it for: the rain page close (`overhead/OverheadPage.tsx`, today a text "✕"), the place picker close
  (`PlacePicker.tsx`, today an inline SVG), and the rain timeline play/pause (`overhead/TimeRail.tsx`, today "▶︎"/"❚❚").
- Direction: on the RTL rain timeline time advances to the LEFT, so the play triangle must point LEFT. Do it with
  `:dir(rtl)` / `[dir=rtl]` `transform: scaleX(-1)` on the play icon (a logical flip, not a hard-coded left arrow), so an LTR context would
  point right. Pause is symmetric, no flip.
- Delete the now-duplicated `.close` styles from `PlacePicker.module.css` and `OverheadPage.module.css`. Same visual size as today.

## #17 place picker messages and announcements
- Geolocation error by `GeolocationPositionError.code`: 1 PERMISSION_DENIED → "אין הרשאה למיקום. אפשר לחפש יישוב בשדה למעלה.";
  2 POSITION_UNAVAILABLE → "לא הצלחנו לקבוע את המיקום כרגע. אפשר לחפש יישוב בשדה למעלה."; 3 TIMEOUT → "איתור המיקום לקח יותר מדי זמן.
  אפשר לנסות שוב או לחפש יישוב." Keep "שירותי המיקום אינם זמינים במכשיר הזה" for no `navigator.geolocation`. (Check the hint matches the
  real layout: if the search field is not above the button, say "בשדה החיפוש" instead of "למעלה".)
- Search failing while `navigator.onLine === false` → "אין חיבור לאינטרנט, אי אפשר לחפש כרגע." (in `PlacePickerSearch.ts`).
- The existing `role="status"` note announces: "מאתר מיקום…" while locating; "מחפש…" while searching; after results arrive
  "נמצא מקום אחד" for 1, "נמצאו N מקומות" for N ≥ 2 (N isolated with `ltr`), and the existing "לא נמצאו מקומות" for 0 (check where that
  string lives today and don't duplicate it). Hebrew number agreement must be correct. Visible text may stay as it is today if the count is
  only for screen readers — then make that span visually hidden with the existing `visually-hidden` class, keeping errors visible.
- Unit tests for the message mapping (pure function in `src/text/`).

## #18 slider keys
`src/scene/react/SceneScrubber.tsx` (`role=slider`) and `src/ui/hourly/HourlyStrip.tsx` each have their own key map. Make ONE pure helper
(e.g. `src/ui/scrub/keyStep.ts`) both use: ArrowLeft = +1 h (later, RTL), ArrowRight = −1 h, ArrowUp = +1 h, ArrowDown = −1 h,
PageUp = +6 h, PageDown = −6 h, Home = first, End = last; all clamped to [first, last]; Escape stays the scrubber's "back to now". In the strip
the unit is one slot index instead of an hour — express the helper in steps so both callers fit. Add a short visually-hidden hint to the
slider's `aria-describedby`: "חיצים: שעה. Page Up/Down: שש שעות. Escape: חזרה לעכשיו." Unit-test the helper.

## #19 canvas alt text
`src/scene/react/sceneLabel.ts`: prepend the place name and the current condition (use `conditionLabel(conditionOf(code), isDay)` from
`src/domain/conditions` and the temperature via `tempText`), e.g. "ירושלים, מעונן חלקית, 14°. השמש מעל האופק. שקיעה ב־16:41. גובה היישוב 790
מטר." When a time is selected (scrubbing), describe that hour's condition and temperature instead of now's. Keep it short (one line per fact);
update its callers and add/extend a unit test with a negative temperature. Where does the place name come from — the forecast or a prop?
Pass what exists; do not invent a new data path.

## #20 offline announcement and deferred SW reload
- `src/ui/StatusLine.tsx`: when `problem` changes to offline/service (not on every clock tick), put the problem sentence in the live
  `role=status` span once (e.g. "אין חיבור. מוצגת התחזית מ־14:05." — use/extend the existing `freshnessText` in `src/text/status.ts`, the
  time isolated). Clear it after it was spoken (~3 s) so it is not re-read. Coming back online → "החיבור חזר." once.
- `src/pwa.ts`: on `controllerchange` (not the first install) do not reload immediately. Reload when `document.visibilityState` becomes
  `hidden` (the user left), or after the page is idle (no pointer/key/scroll input for 60 s AND no `<dialog open>` AND not scrubbing
  — `data-scrubbing` on `.app`). Pure decision function + test; keep the file < 60 lines. No toast UI.

## #21 before JS
`index.html`: inside `#root` a static `<p class="boot">טוען…</p>` (React's `createRoot().render` replaces it) styled inline in `<head>`
(centred, the sky ink colour on `--boot-bg`, `font: 1rem system-ui`, `role="status"`), and a `<noscript>` line: "שמיים צריך JavaScript כדי
להציג את התחזית. אפשר להפעיל אותו בהגדרות הדפדפן." Check `src/main.tsx` really replaces `#root` content.

## Precision — pay attention to subtleties and accuracy
- Exact bidi: every number or clock in a Hebrew string goes through `src/text/isolate.ts`; U+2212 for minus.
- RTL direction: later time is to the LEFT, consistent with the hourly strip; arrow keys follow what you see.
- WCAG AA: icons inherit text colour already tested; 44 px targets; live regions speak once, never on every tick.
- Hebrew copy natural and correct (gender/number agreement, ״/׳ marks, ־ maqaf after ב/ל/מ before a digit).
- Files under ~150 lines, DRY, no dead code. Don't touch `src/scene/model`, `src/scene/paint`, `src/world`.
- Finish with `npx tsc -b`, `npx oxlint`, targeted vitest on the files you touched — all green. Do NOT commit; report per finding.

## Parallel writers
Brief 2b runs at the same time and owns `StatusLine.module.css`, `Scene.module.css`, `WearCard.module.css`, `Attribution.module.css` and `src/theme/*.test.ts`: do not edit those. Also remove the double blank line in `OverheadPage.module.css` while you are there.
