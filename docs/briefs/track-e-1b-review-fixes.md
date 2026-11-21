# Track E, brief 1b — review fixes for the bidi commit (d7229eb)

From the Opus review of `git show d7229eb`. Small, exact changes only.

1. `src/world/layout.ts` `textWidth`: measure the visible text only:
   `text.replace(/[⁦-⁩]/g, '').length`. (Approved exception to the "no src/world" rule: the isolates this track added made the
   height label's box 22 px too wide at 11 px.) Add a unit test next to existing layout tests: `textWidth(heightText(-137), 11)` equals
   `textWidth('−137 מ׳', 11)`.
2. `src/ui/isolateNumbers.tsx`: a hyphen directly after a digit is a range dash, not a sign — only take `[−-]` as a sign when not preceded
   by a digit (`(?<!\d)`). Add a test: "10-15" keeps "10" and "15" as two numbers and never shows "−15". Use `ReactNode` for the parts type.
3. Tests with sub-zero values for `describeHour` (stripLayout) and the DayDetail "אור יום" value (clockRange order: sunrise isolate first in
   logical order).

## Precision — pay attention to subtleties and accuracy
Exact bidi behaviour, U+2212 only for real signs, RTL order unchanged. Files < 150 lines. Run `npx tsc -b`, `npx oxlint`, targeted vitest on
the touched suites. Do not commit; report.
