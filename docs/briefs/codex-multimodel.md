# Codex brief: multi-model blending (ICON + ECMWF) with confidence

Repo: Shamayim, a Hebrew RTL weather PWA (React 19 + Vite 8 + TypeScript, vitest, oxlint).
Read `docs/PLAN.md` and `src/domain/types.ts` first. You own ONLY these paths:
`src/data/**`, `src/domain/types.ts`, `src/domain/blend*.ts`, `src/test/**`.
Do not touch `src/ui/**`, `src/text/**`, `src/theme/**`, `src/App.tsx`, or CSS. Another engineer is editing those.

## Goal
Today the app requests `models=icon_seamless` only. Request two models in ONE call,
`models=icon_seamless,ecmwf_ifs025`. Open-Meteo then suffixes every hourly and daily key, e.g.
`temperature_2m_max_icon_seamless` and `temperature_2m_max_ecmwf_ifs025`. The `current` block stays
unsuffixed. A real response is saved at `src/test/fixtures/forecast-multi-2026-11-17.json`.

Blend the two models into the existing `Forecast` shape, so that every consumer keeps working unchanged.

## Rules
- Per-day weights. ICON is the 7 km regional model and resolves the Jordan Valley (−175 m) better at short range; ECMWF is better at medium range.
  - Days within `HIGH_RES_DAYS` (5) of today: ICON 0.6, ECMWF 0.4.
  - Later days, and yesterday: ICON 0.4, ECMWF 0.6.
  - Hourly rows use the weight of their date.
- Blend these fields by weighted mean:
  - temperatures, which are then rounded to 0.1;
  - precipitation probability. If only one model has it, use that model's value;
  - precipitation, cloud cover, wind and gusts.
- Weather code: take the model with the higher weight, except that a wet code (≥ 51) from either model wins when that model's precipitation probability is ≥ 40.
- `sunrise` and `sunset`: from ICON.
- If one model's column is missing or all null (for example, beyond its horizon), fall back to the other model for that row. Never throw because of a single model.
- Add to `DayPoint`, while keeping `lowConfidence`:
  - `confidence: 'high' | 'medium' | 'low'`;
  - `spread: { tempMax: number; tempMin: number; precipProb: number }`, holding the absolute differences between the models.
  - Confidence is `low` if the tempMax spread is > 4, or the precipProb spread is ≥ 40, or the day is beyond `HIGH_RES_DAYS`. It is `medium` if the tempMax spread is > 2 or the precipProb spread is ≥ 20. Otherwise it is `high`.
  - Put these thresholds in `src/config/thresholds.ts`, under a new `confidence` key. Only append to that file; it is safe to edit.
- Add `models: string[]` to `Forecast`. Change `source` to `'Open-Meteo · DWD ICON + ECMWF'`.
- Keep the cache key versioned: bump it to `shamayim:v2:` in `src/data/cache.ts`, because the shape changed.
- Keep every file under 150 lines. Split the code into small modules, for example:
  - `src/data/openMeteo/suffix.ts` to read model-suffixed columns;
  - `src/domain/blend.ts` with the pure blending functions;
  - `src/domain/confidence.ts`.
- DRY: reuse the guards in `src/data/openMeteo/guards.ts`.
- API times are local wall-clock strings. Never pass them to `new Date()`.

## Tests (vitest)
- Unit-test the blend weights, the fallback when one model is missing, wet-code precedence and the confidence levels.
- Write a mapper test against the new fixture. For example, on 2026-11-16 (index 0) the precipProb spread is 25, so confidence is medium.
- Update `src/test/makeForecast.ts` so that the existing tests still compile, by giving its days default `confidence: 'high'` and a zero spread.
- Keep the old single-model fixture test only if it still applies. Otherwise delete it together with that fixture.

## Done means
`npm run typecheck`, `npm run lint` and `npm test` all pass. Do not run `npm run dev`. Do not commit; leave the changes in the working tree.
At the end, print a short summary of the files changed and any open questions.
