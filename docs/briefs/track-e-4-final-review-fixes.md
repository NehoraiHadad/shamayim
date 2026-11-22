# Track E, brief 4 — blocking fixes from the final Codex review (`git diff 80800e2..f2a5fdb`)

Repo: Shamayim, Hebrew RTL weather PWA (React + TS + Vite, CSS modules, vitest, oxlint). Work only in this checkout.
First reproduce each finding (read the code, run or write the failing test); if one turns out to be wrong, say so with evidence
instead of changing code. Then fix it exactly. Keep everything else as it is.

1. **Service-worker takeover (`src/pwa.ts`, `vite.config.ts`).** Today the new worker activates at once (`skipWaiting` +
   `clientsClaim`, `registerType: 'autoUpdate'`), deletes the old precache, and only the page reload is deferred. While the page
   waits, a lazy chunk from the old build can 404. Fix: the new worker must WAIT. Use `registerType: 'prompt'` and remove
   `skipWaiting`/`clientsClaim` (the default for `prompt`), keep `onNeedRefresh` noting that an update is waiting, and when the
   existing gate says "safe" (page hidden, or idle ≥ 60 s with no `<dialog open>` and no `data-scrubbing`) call
   `updateSW(true)` — this activates the waiting worker and reloads once. Check in `node_modules/vite-plugin-pwa` and
   `workbox-window` what `updateSW(true)` does in prompt mode (it posts SKIP_WAITING and reloads on `controlling`), make sure
   that is the ONLY reload path (no extra `location.reload`), and that the first install of an uncontrolled page never reloads.
   Tests: no activation while a dialog is open or while scrubbing; one activation later; none on first install. Keep
   `pwa.ts` < 100 lines and `pwa.test.ts` < 150 lines (merge the dialog and scrub cases into one table test; drop the
   no-op duplicate-reload case that only exercises a mock).
2. **Stale data is not offline (`src/ui/statusLive.ts`, `src/text/status.ts`, `StatusLine.tsx`).** Data older than 12 h while
   `navigator.onLine` is true and no request failed must not be announced as "אין חיבור". Keep connectivity (online/offline
   events + failed fetch) separate from age; age may still show the existing visible stale text, without an "offline" live
   announcement. A notice that is still waiting to be spoken must not be dropped when the problem changes during a refresh:
   queue it or merge both into one sentence. Reducer unit tests for both cases.
3. **Scrubbed canvas label (`src/scene/react/sceneLabel.ts`).** At 14:20 in the review fixture the world draws rain
   (0.8 mm/h interpolated) while the label says "שמשי", because the weather code flips at the half-hour but precipitation is
   interpolated. Derive the spoken condition from the same rendered input the scene uses (`airInput` / the world's precip and
   cloud values), so the words match what is drawn. Tests on both sides of the half-hour (e.g. 14:20 and 14:40 between a clear
   14:00 and a rainy 15:00).
4. **Picker live region (`src/text/placePicker.ts`, `PlacePicker*.tsx`).** While GPS is pending, search results and errors are
   suppressed. If the search succeeds and GPS then fails, the count is never spoken. Track the search outcome and the GPS outcome
   separately so each reaches the `role=status` region (one message at a time, the newest event wins, nothing lost silently).
   Pure-function tests for the order "search ok → GPS error" and "GPS error → search ok".
5. **Midnight caption contrast (`src/ui/hourly/markers.module.css`).** The 12 px caption has 85% opacity → 4.14:1 on the
   clear-day mid sky (< 4.5:1). Keep the text fully opaque; fade only the divider line. Add the composited caption colour to the
   live-sky contrast test (use `src/theme/contrastSamples.ts`; don't copy a sampler).

## Out of scope
- The 11 px label-width estimate in `src/world/place.ts` / `src/scene/model/layout.ts` (`LABEL_PX`): do not touch, being decided
  separately.
- Anything else in `src/scene/model`, `src/scene/paint`, `src/world`.

## Precision — pay attention to subtleties and accuracy
Exact bidi (U+2212, every number in Hebrew text isolated through `src/text/isolate.ts`), RTL time (later is left), WCAG AA
(4.5:1 text, 3:1 focus, composited colours, never a tautology), live regions speak once, all listeners and timers cleaned up,
natural Hebrew. Files < 150 lines, DRY, no dead code. Finish with `npx tsc -b`, `npx oxlint`, targeted `npx vitest run` on the
touched suites — all green. Never the full suite, never network. Do NOT commit; report per item (what you found, what changed).

Never run a multi-line `npx tsx -e "..."` (it waits on stdin and hangs on this Windows shell): write a temp script file and run `npx tsx <file>`.
