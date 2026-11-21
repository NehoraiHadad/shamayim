# Track E, brief 3b — review fixes for brief 3 (uncommitted work in the tree)

From the Codex review of the brief-3 diff. Fix each item exactly; keep everything else as is.

1. **High — two reload paths (`src/pwa.ts`).** `vite.config.ts` uses `registerType: 'autoUpdate'` with `skipWaiting` + `clientsClaim`.
   Read the generated register code (`node_modules/vite-plugin-pwa` — find what `virtual:pwa-register` does in autoUpdate mode, e.g. a
   workbox-window `controlling` listener calling `window.location.reload()`) and report what you found. Make the deferred `tryReload` the
   ONLY reload path. Prefer the smallest change that is provably correct: if autoUpdate's own reload can be disabled from `registerSW`
   options, do that; otherwise switch `registerType` to `'prompt'` in `vite.config.ts` (allowed for this item only) while keeping
   `skipWaiting`/`clientsClaim` so updates still activate, and say why. Add a test that a controller change while a dialog is open or while
   scrubbing triggers no reload, and that it reloads exactly once later.
2. **Medium — `src/pwa.ts` controller tracking.** Don't freeze `hadController`: skip only the very first claim of an uncontrolled page,
   then honour later replacements. When an update arrives and the page is already idle ≥ 60 s, reload without waiting another minute
   (don't call `touch()` on update). Clear the retry timer before reloading.
3. **Medium — `src/ui/StatusLine.tsx` offline announcement.** Also listen to `window` `online`/`offline` events (cleanup on unmount), so
   losing the network with a fresh cache is announced; keep "once, then clear after ~3 s". The live region must mount empty and receive the
   text after mount (a pre-filled `role=status` is often not spoken). A refresh's own "מעדכן…" must not swallow a problem notice: queue it
   after or merge them into one sentence.
4. **Medium — `src/scene/react/sceneLabel.ts` while scrubbing.** Describe what the canvas actually shows for the selected minute: reuse the
   same input the scene uses for that time (`airInput` or whatever builds the scrubbed world's condition and interpolated temperature) —
   don't pick the floored hour separately. Test: 14:40 between a clear 14:00 and a rainy 15:00 describes what the canvas draws.
5. **Medium — `src/ui/PlacePicker.tsx` stale GPS.** A geolocation/reverse-geocode result arriving after the picker closed or after a manual
   choice must be ignored (request id or AbortController-style guard; clear it on close/select). Test the guard as a pure function or via a
   small hook test.
6. **Low.**
   - `SceneScrubber.tsx` `aria-valuetext` and `src/text/status.ts` freshness clocks/counts: isolate numbers with `ltr`.
   - The one-minute form is "לפני דקה" (not "לפני 1 דקות"). Check the 2-minute form ("לפני שתי דקות" or "לפני 2 דקות", as the file already does).
   - `src/ui/hourly/HourlyStrip.tsx` is 198 lines: extract the sun-tag code into its own module so the file is under 150.

## Parallel writers
Brief 2b runs at the same time and owns `StatusLine.module.css`, `Scene.module.css`, `WearCard.module.css`, `Attribution.module.css` and
`src/theme/*.test.ts`, `src/scene/react/*.contrast.test.ts`, test helpers it creates: do not edit those.

## Precision — pay attention to subtleties and accuracy
Exact bidi (U+2212, every number in Hebrew text isolated), WCAG AA live-region behaviour (speak once), RTL time direction (later is left),
natural Hebrew. Files < 150 lines, DRY, no dead code, listeners and timers always cleaned up. Run `npx tsc -b`, `npx oxlint`, targeted
vitest on touched suites. Do not commit; report per item.
