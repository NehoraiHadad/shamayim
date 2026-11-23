# Built app sky still

The `stills` job now builds and captures the first screen of the production app at Haifa on March 15. The scene harness
stills and artifact upload run after a failure, and the app still step keeps the job red. The app runner writes
`ci-stills/app/haifa-2026-03-15-1200.png` before the sky and keyboard checks. The PNG is 750 × 1624 at DPR 2.

The app and scene harness share forecast selection and Vite preview. The app page seeds the place and panorama, serves
the forecast fixture and blocks other hosts. The dated run uses `forecast-haifa-2026-03-15.json`. The Intl conversion
mapped noon in Asia/Jerusalem to `10:00Z` on March 15 and `09:00Z` on July 1. At DPR 1 the cropped dev run passed with
the short, March and July inputs and wrote three separate files, including the unchanged `haifa-1200.png` name. Dates
without a recording use the synthetic fixture with its timestamps shifted by calendar days.

## Pixel checks

The built run measured 163,500 pixels, the full 375 CSS px width and the 436 whole rows from the page top to the scene
figure. Chromium captured sRGB screenshots at CSS scale with transitions and animations disabled. The readiness wait
requires a compositor paint and two equal consecutive screenshots within 15 seconds. The comparison temporarily hides
`[data-sky]` with `visibility: hidden`, so the text, controls and strip keep their places.

| Check | Failure threshold | Clean builds | Margin to failure threshold |
| --- | --- | --- | --- |
| Near the boot colour | More than 20% of pixels at a maximum RGB channel distance of 12/255 or less | 0.000% (0/163,500) | 20.000 percentage points |
| Changed when the sky is hidden | Fewer than 60% of pixels change by more than 6/255 in any RGB channel | 96.941% and 96.946% | 36.941 and 36.946 percentage points |
| Sky canvas | Missing, zero backing width or height, or every alpha byte zero | 750 × 1624 backing, with nonzero alpha present | Pass |

The boot check reads `#070b1e` from the served `index.html` fallback for `--boot-bg`, which is the colour painted on a
fresh load with empty storage. The canvas check reads backing pixels independently of the canvas's CSS gradient.

## Windows worktree proof

Used the installed Chromium and Playwright with `npx vite build` and the command below. The two cover runs used
separate temporary output directories and each saved a PNG. Times are local elapsed wall times.

```text
node e2e/scene.app.mjs ci-stills/app haifa@2026-03-15T12:00 --built --page --dpr=2
```

| `index.html` condition | Build | App still | App exit |
| --- | ---: | ---: | ---: |
| Clean | 22.004 s | 12.283 s | 0 |
| `body { background: #070B1E }` | 34.269 s | 10.920 s | 1 |
| `body { background: #3f74ad }` | 26.322 s | 5.928 s | 1 |
| Restored and rebuilt | 10.437 s | 6.852 s | 0 |

```text
ok   sky 375x436 CSS px  boot #070b1e 0.000% (0/163500)  sky-hide 96.941% (158498/163500)  canvas 750x1624
FAIL haifa-2026-03-15-1200  boot-colour pixels > 20.000%, pixels changed by hiding sky < 60.000%  sky 375x436 CSS px  boot #070b1e 87.861% (143652/163500)  sky-hide 0.000% (0/163500)  canvas 750x1624
FAIL haifa-2026-03-15-1200  pixels changed by hiding sky < 60.000%  sky 375x436 CSS px  boot #070b1e 0.000% (0/163500)  sky-hide 0.000% (0/163500)  canvas 750x1624
ok   sky 375x436 CSS px  boot #070b1e 0.000% (0/163500)  sky-hide 96.946% (158507/163500)  canvas 750x1624
```

The keyboard slider reported `0→60→0` in all four runs. A temporary copy of the checked-in source plus this patch also
reproduced both cover failures while a concurrent scrubber edit was in progress in the worktree. A local preview-server
probe confirmed that connections were refused after `close()`. The existing `scene.stills.mjs` runner also saved its
dated Haifa still through the shared forecast selector.

Both temporary rules were reverted. `git diff index.html` and `git diff -- .env.production` were empty. The workflow
step order, failure handling and upload path were checked locally. The GitHub-hosted run and upload remain unverified.
