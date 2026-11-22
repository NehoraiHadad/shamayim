# Track E, brief 4c — blocking items from the Codex re-review of briefs 4/4b

Repo: Shamayim, Hebrew RTL weather PWA. Work only in this checkout. Reproduce each finding first (a failing test), then fix it.
If a finding is wrong, show the evidence instead of changing code.

1. **One reload, and no tab interrupted by another tab (`src/pwa.ts`, `src/pwa.test.ts`).**
   a. Double reload: in prompt mode `virtual:pwa-register` (read `node_modules/vite-plugin-pwa/dist/client/build/register.js`) attaches a
      `controlling` → reload handler from both the external `installed` and the `waiting` paths, so one update reloads twice. Make the reload
      ours and idempotent: pass `onNeedReload` (or listen to `controlling` once) so the plugin never calls `location.reload` itself, and
      reload at most once per page through the same gate (`shouldReloadNow`). Check whether `onNeedReload` is honoured in prompt mode in this
      plugin version; if it is not, handle `navigator.serviceWorker` `controllerchange` yourself and say which you used and why.
   b. Cross-tab: `updateSW(true)` in one hidden tab takes over every tab, including one with a dialog open or mid-scrub. Before activating,
      ask the other tabs over a `BroadcastChannel('shamayim-sw')`: post `{ type: 'may-activate', id }`; any tab whose own gate says "not
      now" answers `{ type: 'busy', id }`; activate only if no `busy` arrives within 300 ms, else retry on the normal schedule. A tab whose
      controller changes because another tab activated reloads only through its own gate (a). Close the channel in the cleanup.
      No BroadcastChannel (old browser) → behave as today.
   c. Tests (fake timers, a fake BroadcastChannel pair): one update → exactly one reload; a busy second tab blocks activation, then allows
      it once idle; a takeover started elsewhere does not reload a tab with an open dialog until it closes; first install → no reload.
   Keep `pwa.ts` ≤ 150 lines — split the cross-tab handshake into `src/pwaTabs.ts` if needed; `pwa.test.ts` < 150 lines (a second test file is fine).
2. **Picker live region loses outcomes (`src/text/placePicker.ts`, `src/ui/PlacePicker.tsx`, `src/ui/PlacePickerSearch.ts`).**
   a. A search success and a GPS failure arriving before one React commit leave only the newest in the region. Queue terminal
      announcements: each finished outcome (search count/empty/error, GPS error) is spoken in turn — set the text, clear it after ~1.5 s (or
      when the next arrives after a short gap), then the next. Never two at once, nothing dropped, nothing repeated. Pure reducer + tests for
      "search ok and GPS error in the same tick" both reaching the region in order.
   b. Total search outage: `src/data/geocoding.ts` `searchPlaces` catches each provider to `[]`, so when BOTH fail the picker says "לא נמצאו
      מקומות". Minimal change (approved one-file exception): if both providers rejected (not aborted), throw; if one succeeded, return its
      results as today. The picker then shows the existing search-failure message (offline variant when `navigator.onLine === false`).
      Test with mocked `fetch` (no network): both fail → rejects; one fails → results of the other; abort → still throws the abort reason.
3. **Scrubbed thunder (`src/scene/react/sceneLabel.ts`).** Preview rain sets `thunder: false` (`src/world/rain.ts`), so no lightning is
   drawn, but a WMO 95–99 code still returns `'thunder'` through `isWet(codeKind)`. Speak thunder only when `world.rain?.thunder` is true;
   a thunder code without drawn thunder is spoken as rain (or drizzle by rate). Test with a complete world from the real builder at 14:40
   between a clear hour and a WMO 95 hour, and the non-preview "now" case where thunder is drawn.
4. **Non-blocking, cheap:** `src/ui/statusLive.ts` merged notice repeats phrases after two offline/online cycles in one refresh — keep only
   the newest sentence per kind (or dedupe identical sentences). One test.

## Precision — pay attention to subtleties and accuracy
Exact bidi (U+2212, every number isolated via `src/text/isolate.ts`), RTL, WCAG AA live regions (speak once, never drop, never repeat),
every listener, timer and channel cleaned up. Files < 150 lines, DRY, no dead code. Don't touch `src/scene/model`, `src/scene/paint`,
`src/world` (read-only for item 3). Finish with `npx tsc -b`, `npx oxlint`, targeted `npx vitest run` on the touched suites — all green;
never the full suite, never network. Never run a multi-line `npx tsx -e "..."` (it hangs on this Windows shell): write a temp script file
and run `npx tsx <file>`. Do NOT commit; report per item.
