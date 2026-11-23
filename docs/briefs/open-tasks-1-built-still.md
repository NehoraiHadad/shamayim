# Open tasks 1: a CI still of the real built page that fails when the sky is hidden

You work in this git worktree. Do not commit, do not switch branch, do not touch files other than those named here.

## Why
The CI `stills` job renders `scene.html` (the scene harness) only. A `<body>` background once covered the whole sky of the
production page for hours with CI green (hotfix 0b21d13). `src/bootStyle.test.ts` now guards index.html's text only; a rule in
any CSS file, or a covering element, would still pass.

## What exists
`e2e/scene.app.mjs` already drives the app (`--built`: `dist/` under `vite preview`, service worker blocked, `--page`: the whole
first screen at 375x812, place + recorded panorama in storage, clock shifted, forecast answered from the fixture, every other
host refused). `e2e/harness.mjs` has `startPreview`, `forecastFor(pageUrl)` (a recorded real day
`forecast-<place>-<day>.json` when there is one), `launch`, `root`, `DEFAULT_DAY`.

## Do
1. `e2e/scene.app.mjs`: accept `<place>@<YYYY-MM-DDTHH:MM>` as well as `<place>@<HH:MM>` (default day `DEFAULT_DAY`). The shifted
   clock must be the true instant of that wall-clock minute in Asia/Jerusalem (2026-03-15 is +02:00, summer is +03:00: derive the
   offset with Intl, never hardcode it). Forecast for the moment's day from the recorded day's fixture. A day's still name
   carries the day, so two days never overwrite each other (default day names unchanged).
2. Share instead of copy: use harness `startPreview` (drop the local copy; make its `close` really close the http server), export a
   `forecastForDay(...)` from the harness that `forecastFor` also uses. Move the app-page opening (place lookup, context, routes,
   storage + clock init script) into a new `e2e/appPage.mjs` so `scene.app.mjs` gets shorter; every file under ~150 lines.
3. New `e2e/skyShown.mjs`: `skyProblem(page)` gives null or a one-line description. Over the sky (from the top of the page to the
   scene figure's top, the full 375 px width), from real screenshots at css scale with transitions and animations off:
   a. the boot colour check: the colour the page boots with (what a fresh load without storage paints: parse it from the served
      index.html's `--boot-bg` fallback; say why). Fail when more than 20 % of the sky pixels lie within 12/255 (max channel
      difference) of it.
   b. the general check: take the screenshot again with `[data-sky]` set to `visibility: hidden` and restore it. Where the sky is
      truly what one sees, hiding it changes the pixel. Fail when fewer than 60 % of the sky pixels change by more than 6/255 in any
      channel. (Text, buttons and the strip stay; that is why not 100 %.) This catches a covering of ANY colour, also one equal to
      the sky's. Print both numbers on success too. Measure the true values on a good build and tell me the margin.
   c. the sky canvas inside `[data-sky]` must exist, have a non-zero backing size and not be fully transparent.
   Decode screenshots without a new dependency (in the page with createImageBitmap + OffscreenCanvas, as scene.stills.mjs does).
4. `scene.app.mjs` runs `skyProblem` for every moment whatever the flags, before the keyboard checks; a problem is a FAIL line and
   exit 1. The PNG is written before the checks, so a red CI run still carries the picture.
5. `.github/workflows/ci.yml`, job `stills`: one new step named "Built app still", BEFORE "Render stills" with the latter running
   whatever it gave (a red still must not hide the others; the job stays red), running
   `npx vite build` (no tsc: the check job has it) and
   `node e2e/scene.app.mjs ci-stills/app haifa@2026-03-15T12:00 --built --page --dpr=2`. The PNG must be in the stills artifact.
   Keep added time small: report the local wall time of each part. `.env.production` must not be edited.
   Waiting: replace the fixed `waitForTimeout(3500)` by waiting for what is needed (the sky painted: two equal consecutive
   screenshots, bounded at 15 s), if that is reliable; otherwise keep it and say why.
6. Prove it: (i) `npx vite build` + the command green; (ii) add `body { background: #070B1E }` to index.html temporarily -> red, with
   which numbers; (iii) the same with `body { background: #3f74ad }` (a sky-like opaque colour) -> red; (iv) revert both;
   `git diff index.html` empty. Quote the outputs in your report.

## Precision
Attend to fine detail and physical/engineering accuracy: exact pixel region, dpr, colour spaces (sRGB screenshots), DST, races
(the app fades its colours with transitions), no flake. State every threshold with the measured value it guards. No unstated
approximations. Code style: as around it (single quotes, no semicolons, lines <= ~130 chars, short comments that say why).
Local machine is a Windows laptop: run only this. Playwright's browsers: use the installed ones; if `playwright` cannot launch,
look at PLAYWRIGHT_BROWSERS_PATH/SCENE_CHROMIUM in harness.mjs before anything else; install nothing.
Write your report to `docs/briefs/open-tasks-1-built-still.REPORT.md` (short: what changed, numbers, what is not verified).
