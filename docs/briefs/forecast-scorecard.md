# Brief: rebuild the verification data, then score what the app shows

## Why

The owner builds the product (the forecast, what to wear, the animated scene). They are not a meteorologist and cannot
judge whether the existing corrections help. The numbers in `research/verification/README.md` were never checked
independently. Work from evidence: a correction stays only if it beats the raw models on data it was not fitted on.

Ground truth is what was measured in Israel: IMS station readings (temperature, humidity, wind, gusts, rain) and the
satellite cloud mask for clouds. ICON and ECMWF (via Open-Meteo) are the forecasts under test. The IMS's own
forecasts (XML, logged by the Worker since 2026-11-23) are a candidate source, to be weighed only once they show they win.

## 0. Setup (the owner does this before the session)

- **IMS token** as a network secret on the environment: host `api.ims.gov.il`, header `Authorization`, value
  `ApiToken <token>`. Never in a file, env var or chat.
- **A private repo for the data** (e.g. `shamayim-data`), added to the session. The data must not go into this repo:
  it is public, and the IMS data's redistribution terms are unchecked.

## 1. Rebuild the data (all of it was lost; only derived tables, results and scripts remain here)

| Source | Script | Notes |
|---|---|---|
| IMS 10-minute station readings, ~95 stations | `research/verification/ims_fetch.py`, `ims_hourly.py` | TD since 2016; RH, WS, WSmax, WD, Rain, Grad since 2022. ~600 MB raw, ~40 MB hourly. Read "IMS API notes" in the README (standard time all year, end-of-interval stamps). |
| Open-Meteo Previous Runs at the stations, 2024 on, leads 0/1/2/4/6 days | `research/verification/om_fetch.mjs` | ~50 MB. Add `precipitation_probability` (not fetched so far). Answered 429 from this environment on 2026-11-26: pace it. Part of it may still be in older branches of this repo. |
| AWS terrain tiles | `terrain_features.py` | Minutes. |
| Satellite cloud mask | `verify_cloud.py` | For cloud cover. |

Keep only the processed tables in the private repo (~90 MB), with a README saying how each was made.

## 2. The scorecard (the first deliverable)

One script that replays what the app would have shown at each past hour and scores it against the stations, by lead
(today, tomorrow, 3+ days), season and region:

- temperature and wind: mean absolute error and bias;
- rain: reliability of the shown probability (does "30 %" rain ~30 % of the time), Brier score, hits / false alarms /
  misses for rain yes/no;
- cloud cover: against the satellite mask.

Each against baselines: ICON alone, ECMWF alone, the plain blend, and the app with each correction switched off in
turn. Hold out time (a period not used for fitting) and stations (leave-station-out). Report plainly, including where
a correction hurts.

Corrections to score: `src/domain/correction/` (temperature, humidity/gust, live anomaly, clouds) and the satellite
cloud nowcast (`src/domain/observedCloud.ts`).

**Pending:** commit `b4432a3` on branch `ccr-80d67d95-sjfxvc` (not on main) applies the README's "isolated low cloud"
candidate at every lead. Merge it only if the scorecard shows it helps beyond the short leads it was verified at.

## 3. Then, by what matters to users

Rain first (no correction exists; the umbrella decision rests on it), then temperature, wind, clouds. Candidates to
test, each kept only if it wins: calibrated rain probability, ensemble-based probability (Open-Meteo ensemble API),
UKMO, the IMS forecasts from the Worker's log once a season has been logged. Make the scorecard re-runnable monthly
on the Worker's log, so a silent regression shows.
