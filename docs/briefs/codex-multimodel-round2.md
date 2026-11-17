# Codex brief, round 2: review fixes for multi-model blending

The reviewer read your round-1 work (blend.ts, confidence.ts, suffix.ts, mapForecast.ts). The logic is good. Fix these three issues. The ownership limits from `docs/briefs/codex-multimodel.md` still apply: you may touch `src/data/**`, `src/domain/**` and `src/test/**` only.

1. **Readability.** `src/data/openMeteo/mapForecast.ts` packs several statements onto one line (`;` chains, one-line interfaces), only to stay under 150 lines. That is not acceptable. Use one statement per line with normal formatting.
   - To stay under 150 lines per file, split the work into modules: `mapCurrent.ts`, `mapHours.ts`, `mapDays.ts`, with `mapForecast.ts` as a thin composer.
   - Apply the same formatting to `suffix.ts`, which needs blank lines and a doc comment.

2. **Semantics of `lowConfidence`.** It must keep its original meaning: the day is beyond the high-resolution ICON-EU horizon, that is `offset >= HIGH_RES_DAYS`. The UI labels such days "מגמה" (trend).
   - Today it is set to `confidence === 'low'`, which wrongly labels a near day with model disagreement as a trend day.
   - `confidence` stays as you computed it. Add a test that checks a near day with a precipProb spread ≥ 40 has `confidence: 'low'` and `lowConfidence: false`.

3. **Types.** `DayPoint.confidence` should use the `Confidence` type. Move `Confidence` into `src/domain/types.ts` and import it in `confidence.ts`, so the union is not duplicated.

Done means `npm run typecheck`, `npm run lint` and `npm test` (the full suite) all pass. Do not commit. Print a short summary at the end.
