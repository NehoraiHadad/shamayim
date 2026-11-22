# Track E, brief 1 — one isolating path for numbers (audit #7, #8, #14, #15)

Repo: Shamayim, a Hebrew RTL weather PWA (React + TypeScript + Vite, vitest, oxlint). Work only in this checkout.
Read first: `docs/design/qa/polish/AUDIT.md` (rows #7, #8, #14, #15) and `docs/design/qa/polish/ui-sweep.md` (rows 1, 2, 6).
Line numbers in those notes may be stale: find the code by content.

## The bug
In an RTL paragraph a bare `−3°` (or `-3°`) renders visually as `3°−`: the sign lands on the wrong side.
Only an isolate that contains the sign, the digits and the degree mark renders it as `−3°`.
Today `deg()` in `src/text/phrases.ts` uses `Math.round(n)` (ASCII hyphen) and `src/ui/isolateNumbers.tsx` matches only U+2212,
so the headline sentence can say "הלילה קר, סביב 3°-". `Hero.tsx` `secondLine()` returns "מרגיש כמו −5°" as plain text, unisolated.

## The design (do exactly this)
1. New module `src/text/isolate.ts` (under 40 lines), the single source of bidi isolation for text the app builds:
   - constants `LRI = '⁦'`, `RLI = '⁧'`, `PDI = '⁩'`;
   - `ltr(s)` → `LRI + s + PDI`; `rtl(s)` → `RLI + s + PDI`;
   - `tempText(n)` → `ltr(formatTemp(n))` (formatTemp from `src/text/format.ts` already uses U+2212 and rounds; reuse it, do not re-implement);
   - `heightText(m)` → `rtl(ltr(signed rounded m with U+2212) + ' מ׳')`: one isolate holding number + unit, robust even when the
     containing element is LTR (the canvas overlay is). Visual result, left to right: `מ׳ −137` (number on the right, unit on its left, the
     minus touching the digits).
   - `clockRange(a, b)` → `ltr(a) + '–' + ltr(b)` (en dash), each clock its own isolate so the RTL paragraph orders them: the first clock
     (sunrise) on the right, matching the app's RTL time axis (the hourly strip: now on the right, later to the left).
   - Every export gets a one-line doc comment saying why.
2. `src/text/phrases.ts`: `deg = (n) => tempText(n)`. `upTo`/`around` keep their U+00A0. Check every `deg(` caller (`compose.ts`, `normal.ts`)
   still reads naturally.
3. `src/ui/Hero.tsx`: `secondLine` uses `tempText(feels)`.
4. `src/ui/isolateNumbers.tsx`: widen the sign to `[−-]?` and make it skip text already inside an `LRI…PDI` / `RLI…PDI` span
   (don't double-wrap). It stays the renderer for bare clocks in strings.
5. `src/scene/react/SceneOverlay.tsx` height label: render the string as-is (no `.replace(' מ׳','')`, no extra `<bdi>`).
   The label text is built twice, identically, in `src/world/place.ts` (`const label = { text: ... }`) and `src/world/world.ts`
   (`unknownPlace`). Replace both template literals with `heightText(rounded)` — that one-line import + expression change is the ONLY edit
   allowed in `src/world/`; touch nothing else there (other tracks own the model).
6. `src/ui/week/DayDetail.tsx` "אור יום" tile: `clockRange(clockOf(day.sunrise), clockOf(day.sunset))` instead of one `<bdi>` around both.
7. grep `src/ui`, `src/text`, `src/scene/react` for any other user-visible string (including `aria-label`) that interpolates `formatTemp(` or a
   signed number into Hebrew prose without isolation; route it through `tempText`. Leave a `formatTemp` that is already the sole child of a
   `<bdi>` alone.

## Tests (vitest; run only the suites you touch, e.g. `npx vitest run src/text`)
- `src/text/isolate.test.ts`: tempText(−3) === `⁦−3°⁩`, tempText(-0.4) === `⁦0°⁩` (no "−0"), tempText(5), heightText(−137),
  heightText(788), clockRange.
- Update the existing `compose*.test.ts` / `normal.test.ts` expectations to the isolated form (search for `°`).
- Add compose tests with negative temperatures: a freezing night (min −3) → contains `סביב ⁦−3°⁩`; a day max of −1;
  assert no ASCII hyphen-minus before a digit anywhere in the output (`/-\d/` never matches).
- A small render test (the repo already uses @testing-library or react-dom/server — check what exists) for Hero with feelsLike −5.

## Precision — pay attention to subtleties and accuracy
- Exact bidi behaviour: the sign must be inside the same isolate as its digits; isolates must always be closed (balanced PDI).
- U+2212 for minus everywhere in user text, never U+002D. Never print "−0°".
- RTL direction: earlier time on the right. Hebrew copy unchanged except where named here; it must stay natural Hebrew.
- Keep files under ~150 lines, DRY (one helper, no second copy of the sign logic), meaningful names, no unused imports.
- Do not touch scene model or painter files (`src/scene/model`, `src/scene/paint`), and nothing in `src/world` beyond item 5.
- Finish with: `npx tsc -b`, `npx oxlint`, and the targeted vitest suites, all green. Do NOT commit; report the diff summary and test output.
