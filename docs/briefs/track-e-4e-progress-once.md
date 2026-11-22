# Track E, brief 4e — progress is spoken once per request (from the Codex re-check of 7443dc9)

Scope: `src/text/placePicker.ts` (live reducer) and `src/text/placePicker.test.ts` only (`src/ui/PlacePicker.tsx` only if wiring must change).

Bug: tap "my location", "מאתר מיקום…" plays; search while GPS is still pending; when the search result's 1.5 s hold ends, `idleOrProgress`
republishes the same GPS progress, so it is spoken twice. Fix: remember which progress (source + requestId/progressSeq) has already been
spoken; when a hold ends, restore a pending progress that was already spoken as the VISIBLE note only, not into the live region (live region
goes empty); a progress never spoken yet (e.g. a search started during the hold) is spoken once. First add a failing reducer test for the
scenario above, plus one that a never-spoken search progress still speaks after the hold. Keep all existing tests green.

## Precision — pay attention to subtleties and accuracy
Live region speaks every current outcome once, never twice, never a superseded one. Files < 150 lines, no dead code. Finish with
`npx tsc -b`, `npx oxlint`, `npx vitest run src/text/placePicker.test.ts src/ui` — all green; never the full suite, never network. Never run a
multi-line `npx tsx -e "..."` (it hangs on this Windows shell): use a temp script file. Do NOT commit; report.
