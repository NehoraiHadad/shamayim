# Forecast verification – observation side (IMS stations)

Goal of the study: measure how the forecasts Shamayim shows (Open-Meteo
`icon_seamless` / `ecmwf_ifs025`) err against real station measurements across
Israel – by place, hour of day, season and lead time – so they can be corrected.
This folder holds the observation half: 10-minute data from the Israel
Meteorological Service (IMS) API, reduced to hourly UTC tables.

Everything under `data/` is git-ignored (raw cache ≈ 1.5 GB, processed ≈ 0.1 GB).

## Requirements

Python ≥ 3.11 with `requests`, `pandas`, `numpy`; `pyarrow` optional (without it the
tables are written as `.csv.gz` instead of `.parquet`). An IMS API token
(free, request from IMS) in the `IMS_TOKEN` environment variable – never put it in a file.

## 1. Download – `ims_fetch.py`

```sh
export IMS_TOKEN=...            # your token
python3 ims_fetch.py            # everything; safe to interrupt and rerun
python3 ims_fetch.py --stations 22 178 64     # just a few stations
python3 ims_fetch.py --refresh-current        # re-download the running year
```

* One request per station × channel × calendar year, cached as
  `data/raw/ims/<stationId>/<channel>_<year>.json.gz` (raw API response, gzipped;
  `<channel>_<year>.empty` marks "no data"). Finished pieces are skipped on reruns,
  files are written atomically. The current year is cached like any other –
  use `--refresh-current` to extend it later.
* Channels: `TD`, `TDmax`, `TDmin` from 2016; `RH`, `WS`, `WSmax`, `WD`, `Rain`,
  `Grad` from 2022. `*_1m` one-minute rain gauges are skipped.
* Politeness: ≤ 4 concurrent requests, 120 s timeout, exponential backoff, a 429
  pauses all workers (and aborts after 6 in a row).
* The API serves ~1 MB/s of uncompressed JSON (a station-channel-year is ~7.5 MB),
  so the full download takes roughly 10 hours. Order: TD first, then the 2022+
  channels, then pre-2022 TDmax/TDmin – an interrupted run is still useful.

## 2. Hourly tables – `ims_hourly.py`

```sh
python3 ims_hourly.py           # needs no token; ~ a few minutes
```

Writes

| file | content |
| --- | --- |
| `data/processed/ims_hourly/<stationId>.parquet` | hourly table per station |
| `data/processed/ims_hourly.parquet` | all stations combined |
| `data/processed/ims_qa.csv` | QA counts per station × channel |
| `stations.csv` (committed) | id, name, lat, lon, active, first/last TD date, % TD coverage per year |

Hourly columns (row = hour `H`, UTC; aggregates cover the hour *ending* at `H`,
records `H-1:10 … H:00`, like Open-Meteo's precipitation/radiation/gusts):

| column | definition | Open-Meteo counterpart |
| --- | --- | --- |
| `time`, `station_id` | hour (UTC), IMS station id | |
| `td` | TD at `H:00`, °C | `temperature_2m` |
| `td_max`, `td_min` | max of TDmax / min of TDmin over the hour | |
| `rh` | RH at `H:00`, % | `relative_humidity_2m` |
| `ws` | mean WS over the hour, m/s | |
| `ws_at_hour` | WS record at `H:00` (10-min mean), m/s | `wind_speed_10m` (mind the units) |
| `ws_gust` | max WSmax over the hour, m/s | `wind_gusts_10m` |
| `wd` | WD at `H:00`, ° | `wind_direction_10m` |
| `rain` | sum of Rain over the hour, mm | `precipitation` |
| `grad` | mean global radiation over the hour, W/m² | `shortwave_radiation` |

QA applied to the 10-minute records before aggregating (counts in `ims_qa.csv`):
`valid=false` dropped; out-of-range dropped (TD −15…52 °C, RH 0–100 %, WS 0–60,
WSmax 0–90 m/s, WD 0–360°, Rain 0–60 mm/10 min, Grad −20…1500 W/m², negatives
clipped to 0); stuck sensors dropped (same value for > 6 h on TD/TDmax/TDmin, RH
below 95 %, wind above 0.2 m/s). Hourly aggregates need ≥ 4 of 6 values, else NaN.

## IMS API notes

* Base `https://api.ims.gov.il/v1/envista`, header `Authorization: ApiToken <token>`.
* **Timestamps are Israel standard time (UTC+2) all year.** The API appends
  `+03:00` during civil DST, but the wall clock never jumps (no gap at the DST
  switch; solar noon stays ≈ 11:45). `ims_hourly.py` ignores the offset and
  subtracts 2 h. Trusting the offset would shift every summer observation by 1 h.
* A timestamp labels the end of its 10-minute interval.
* `to=` is exclusive (`from=2023/01/01&to=2024/01/01` is exactly the year 2023).
* Channel ids differ per station; map by monitor name. No gzip transfer encoding.
* HTTP 204 = no data in the range.
