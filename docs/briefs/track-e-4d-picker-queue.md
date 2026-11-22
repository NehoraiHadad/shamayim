# Track E, brief 4d — picker announcement queue keyed by request (from the Codex re-review of 3ffde1a)

Scope: `src/text/placePicker.ts` (queue reducer), `src/ui/PlacePickerSearch.ts`, `src/ui/PlacePicker.tsx` if wiring needs it, and
`src/text/placePicker.test.ts`. Nothing else. Reproduce each case as a failing reducer test first.

1. **Same count from a newer search is dropped.** Refining a query during the 1.5 s hold, with new results of the same count, is discarded
   because dedupe compares text. Dedupe by `(source, requestId)`, not by text: an outcome from a newer request plays (after the normal clear
   gap) even when its sentence equals the one on air.
2. **Superseded search outcomes still play.** A search count queued behind a GPS error plays even after the input was cleared or a new search
   started. Each queued entry carries `source` ('search' | 'gps') and `requestId`. Starting a new search, or clearing the input, removes queued
   search entries of older requests (GPS entries stay). A pending search's progress ("מחפש…") is kept as the visible/current progress and is not
   lost because a terminal announcement is on hold; it simply does not interrupt the one on air.
3. Tests: same-count refine during hold → announced once after the gap; GPS error on air + search count queued + input cleared → the count
   never plays; new search during hold → old queued count dropped, new result announced; GPS and search outcomes still both play in order.

## Precision — pay attention to subtleties and accuracy
Live region speaks every current outcome once, never a superseded one, never two at once. Timers cleaned up. Files < 150 lines, DRY, no dead
code. Finish with `npx tsc -b`, `npx oxlint`, `npx vitest run src/text/placePicker.test.ts src/ui` — all green; never the full suite, never
network. Never run a multi-line `npx tsx -e "..."` (it hangs on this Windows shell): use a temp script file. Do NOT commit; report per item.
