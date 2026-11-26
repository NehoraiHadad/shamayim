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

## Cloud cover verification

On 24 November 2026 at 17:00 and 18:00 Israel time, Meteosat's cloud mask showed
0% around Shadmot Mehola. The corresponding Open-Meteo archive values were 47%
and 46% from ICON-EU, entirely low cloud, and 0% at both hours from ECMWF IFS.
ICON Global gave 6% and 11%. The app's old 60% ICON blend yielded 28.2% and
27.6%, while the hourly strip took the partly cloudy code from ICON. The
current snapshot in a multi-model response came from the first model, so it
also exposed the full ICON cloud estimate before satellite adjustment.

Run the seasonal comparison from this directory with Python and Pillow.

```sh
python3 verify_cloud.py 2026-01 2026-04 2026-07 2026-10 2026-11 --through 2026-11-25
```

The script samples seven places at 08:00, 11:00 and 18:00 UTC every fourth day
starting on the second day of each month. It compares cloudy pixel share in
the central 30 km of the MSG cloud mask with Open-Meteo's Previous Runs series
at the same valid UTC hour. The CSV records one row per place, valid hour and
lead with both forecasts available. Three requested satellite frames were
missing, and model coverage varies with lead.

| Previous Runs lead | Paired place-hours | Mean absolute error with 60% ICON | Mean absolute error with 40% ICON |
|---:|---:|---:|---:|
| Latest run for each hour | 777 | 16.7 pp | 15.8 pp |
| 24 h | 777 | 19.9 pp | 18.8 pp |
| 48 h | 714 | 21.2 pp | 19.8 pp |
| 72 h | 735 | 22.0 pp | 21.2 pp |
| 96 h | 756 | 23.5 pp | 22.3 pp |

At 120 and 144 hours the previous weighting was already 40% ICON. At 24 hours
the new weight reduced false cloud classifications from 149 to 118 and
increased missed clouds from 31 to 38 at a 30% cover threshold. November on its
own shows a 24-hour mean absolute error of 22.1 → 19.2 pp. January takes a
small loss at 24 hours, from 24.6 to 24.9 pp.

The satellite measures area cover from above. A person sees a different
footprint, and the mask is sensitive to low sun, cold land and fog. The
comparison measures total cloud agreement and provides limited information on
each cloud layer. The 40% ICON weight applies to the layers as well so they
use the same model mix as the total. This comparison provides no calibration
for precipitation or other forecast variables. The scene uses the layers for
mist, light and the visibility of the moon, so those effects use the revised
inputs as well.

[Open-Meteo Previous Runs](https://open-meteo.com/en/docs/previous-runs-api) ·
[EUMETSAT EUMETView](https://view.eumetsat.int/)

### Shadmot Mehola case and short-range verification

The model runs initialized at 06:00 UTC on 24 November 2026 already disagreed
for 17:00 Israel time. Cloud totals in the Single Runs API were identical
with Open-Meteo's default elevation and with `elevation=nan`, which exposes
the models' own grid elevations.

| Model | Native grid point | Native elevation | Low cloud at 17:00 | RH at 925 hPa |
|---|---|---:|---:|---:|
| ICON-EU | 32.375°N, 35.5625°E | −223 m | 53% | 74% |
| ICON Global | 32.375°N, 35.5000°E | −59 m | 0% | 59% |
| ECMWF IFS | 32.250°N, 35.5000°E | −99 m | 0% | 72% |

The difference is present in ICON-EU's low-cloud output before the app
renders it. The models represent the valley with different cells and
elevations. The archived humidity values at these pressure levels do not
identify the internal cloud-formation process that produced the difference.

A short-range forecast can estimate that the recent observed cover will
persist and blend that estimate with the existing correction to the weather
model. Shamayim now does this inside Israel when it has three consecutive
Meteosat masks. Agreement between the masks strengthens the estimate. Fast
changes in the model and large model-mask discrepancies in low light weaken
it. The same correction limit still applies. The extra weight vanishes
105 minutes after the newest image. A preliminary experiment advecting
the masks by the measured translation of nearby cloud did not consistently
improve on the existing method over 45–75 minutes.

Run `python3 research/verification/verify_cloud_nowcast.py` from the repo
root. The script compares both versions of the app's correction against
later Meteosat masks. It uses the 00:00 UTC archived model runs and three
satellite frames at or before each reference time. At the typical 15-minute
publication lag, a target 60 minutes after the last photo is approximately
45 minutes ahead of the app. The archive supplies hourly model fields for
interpolation. The app can also use the provider's quarter-hour current
reading.

| Lead from the latest image | Place-times on eight held-out dates | Model MAE | Previous correction MAE | New correction MAE |
|---:|---:|---:|---:|---:|
| 30 min | 168 | 16.00 pp | 5.08 pp | 4.53 pp |
| 45 min | 168 | 15.48 pp | 6.90 pp | 5.89 pp |
| 60 min | 168 | 15.87 pp | 9.21 pp | 7.92 pp |
| 75 min | 168 | 15.94 pp | 10.57 pp | 9.36 pp |
| 90 min | 168 | 15.87 pp | 11.47 pp | 10.95 pp |

At 60 minutes with a 30% cover threshold, false cloud classifications
fell from 10 to 8, while missed clouds went from 5 to 6. The dates span
June to November and the seven places listed in the script. Adjacent
places and hours share weather and satellite frames. The results measure
agreement with the cloud mask over 30 km and leave errors common to the
satellite algorithm unresolved. For the 16:30 frame in the Shadmot Mehola
case, the 17:30 forecast goes from 2.86% to 0.93% cover. The 17:30 mask
shows 0% at the same sampling scale.

[Open-Meteo Single Runs](https://open-meteo.com/en/docs/single-runs-api) ·
[Reproducible replay](verify_cloud_nowcast.py)

### Source of the low-cloud forecast at Shadmot Mehola

The app requests `icon_seamless` and `ecmwf_ifs025` through Open-Meteo.
For the 24 November 2026 case at 15:00 UTC (17:00 Israel time), the
archived Open-Meteo response for the 06:00 UTC ICON-EU run gives 53% low
cloud. The corresponding original DWD grid file gives 53.016% `CLCL`
at 32.375°N, 35.5625°E, the same total `CLCT`, and zero `CLCM` and
`CLCH`. The four closest grid points give 21–53% low cloud and the 24
grid centers in an approximately 30 km square around the site average
33%. The Meteosat mask gives 0% in that area. The 12:00 UTC run for the
same valid time gives 55.5% low cloud at the same grid point and 41%
over the square. Both runs already contained the cloud in DWD's output.
[06:00 run GRIB](https://data.source.coop/dynamical/dwd-icon-grib/icon-eu/regular-lat-lon/2026-11-24T06/clcl/icon-eu_europe_regular-lat-lon_single-level_2026112406_009_CLCL.grib2.bz2) ·
[12:00 run GRIB](https://data.source.coop/dynamical/dwd-icon-grib/icon-eu/regular-lat-lon/2026-11-24T12/clcl/icon-eu_europe_regular-lat-lon_single-level_2026112412_003_CLCL.grib2.bz2) ·
[Archive provenance](https://source.coop/dynamical/dwd-icon-grib)

In both runs, model level 63, between 1,018 and 1,214 m above sea level,
accounts for the strongest cloud signal in the 29 lowest model levels.
The table uses the published level fraction `CLC`, the prognostic fields
`QC` and `QI`, and relative humidity over liquid water computed from
`QV`, `T` and `P` at that grid point.

| Run initialized (UTC) | Lead | Level 63 `CLC` | Relative humidity | `QC` / `QI` |
|---|---:|---:|---:|---:|
| 06:00 | 9 h | 56.77% | 93.0% | 0 / 0 kg/kg |
| 12:00 | 3 h | 58.77% | 94.3% | 0 / 0 kg/kg |

DWD's diagnostic scheme can assign cloud to part of a model cell based
on estimated variability within it. The diagnostic liquid and ice
can differ from the prognostic grid-scale `QC` and `QI`. This explains
how the model can report substantial cloud in a layer with zero
prognostic condensate. The archived fields identify the layer and the
diagnosed cover. An observed humidity profile near the site or further
model diagnostics would be needed to distinguish an overly humid
forecast layer from an error in the cloud parameterization.
[06:00 level 63 GRIB](https://data.source.coop/dynamical/dwd-icon-grib/icon-eu/regular-lat-lon/2026-11-24T06/clc/icon-eu_europe_regular-lat-lon_model-level_2026112406_009_63_CLC.grib2.bz2) ·
[12:00 level 63 GRIB](https://data.source.coop/dynamical/dwd-icon-grib/icon-eu/regular-lat-lon/2026-11-24T12/clc/icon-eu_europe_regular-lat-lon_model-level_2026112412_003_63_CLC.grib2.bz2) ·
[DWD ICON tutorial §3.8.7](https://www.dwd.de/EN/ourservices/nwp_icon_tutorial/pdf_volume/icon_tutorial2025_en.pdf?__blob=publicationFile&v=3)

### Cross-check with Israeli Meteorological Service observations

The Worker already uses IMS station temperatures for the live correction.
The research importer also retrieves near-surface humidity and other
station measurements where available. IMS's public archive returned the
following records for 24 November at 15:00 UTC, paired with the 06:00 UTC
ICON-EU run through Open-Meteo at the coordinates of each station.

| IMS station | Distance from Shadmot Mehola | Temperature, observed / ICON-EU | Surface RH, observed / ICON-EU |
|---|---:|---:|---:|
| Sede Eliyyahu | 10.5 km | 23.6 / 23.3 °C | 57 / 55% |
| Eden Farm | 14.1 km | 23.3 / 22.9 °C | 58 / 55% |

The model was close to the surface measurements at those stations during
the incident. That check does not measure the humidity of the cloud layer.
The nearest location with a total cloud report in the 26 November hourly
XML snapshot was Zefat Har Kenaan, about 70 km away. The snapshot covers a
rolling 12-hour window and does not include the incident.
[Live temperature ingest](../../worker/src/live.ts) ·
[IMS station records](https://ims.gov.il/he/envista_station_all_data_time_range/366%26206/TD%26RH%26Grad%26Rain/202611241300/202611241610) ·
[IMS hourly observations feed](https://ims.gov.il/sites/default/files/ims_data/xml_files/observ.xml)

IMS also published a balloon profile for 24 November. The file for the
12:00 UTC cycle records a launch at 11:03 UTC from Bet Dagan, 78 km from
Shadmot Mehola. Compared with the same ICON-EU run at 11:00 UTC at the
nearest Bet Dagan grid point (32.000°N, 34.8125°E), the measured drop in
humidity near 1 km was sharper. The observed means below are vertically
averaged over the model layer bounds using linear interpolation by height.

| Height above sea level | IMS balloon RH | ICON-EU RH |
|---|---:|---:|
| 838–997 m | 81.6% | 60.2% |
| 997–1,168 m | 27.1% | 37.5% |

Meanwhile at the Shadmot grid point, the same run's 1,018–1,214 m layer
went from 46% RH at 11:00 UTC to 93% at 15:00 UTC. The forecast specific
humidity rose from 5.73 to 9.46 g/kg and temperature fell from 15.7 to
12.5 °C. The Bet Dagan comparison shows a vertical-profile error at the
coastal station. It leaves the size of any humidity error in the valley
unresolved because the observation is from a different place and time.
[IMS balloon measurement](https://ims.gov.il/sites/default/files/ims_data/map_images/physical/physical_202611241200_202611241441.txt) ·
[IMS upper-level observing program](https://ims.gov.il/en/UpperLevelObservations)

The existing forecast log is a separate source. The six-hour IMS city
file includes a weather code and its closest location is Bet Shean,
about 17 km away. The IMS hourly INCA file covers Eden Farm with
temperature, surface humidity and wind, and provides no cloud cover
field. The city codes can be tested against observations for the
locations and valid times they cover. The production forecast archive
requires Cloudflare KV access and was unavailable in this workspace.
[Forecast logging code](../../worker/src/forecastLog.ts) ·
[IMS XML product descriptions](https://ims.gov.il/he/CurrentDataXML)

### Comparison of forecast sources

Fixed 00:00 UTC runs from the valid day and the preceding day were sampled
at 09:00, 14:00 and 18:00 UTC at the seven sites in `verify_cloud.py`. The
reference is the 30 km Meteosat cloud mask at the same place and time.
Seventeen dates from April to November 2026 had complete matching data for
all sources in the table. Each lead range has 357 matched place-hours, of
which 51 are at Shadmot Mehola. The `icon_seamless` and `icon_eu` values
were identical on these cases. Scores are mean absolute error in percentage
points for total cloud cover. The app blend is evaluated before local
satellite correction.

The matched dates are 04-10, 04-18, 07-10, 07-18, 07-22, 08-08, 09-03,
10-10, 10-14, 10-22, 10-28, 11-03, 11-06, 11-10, 11-18, 11-20 and
11-22. June 12 and November 14 and 24 had incomplete model data.

| Forecast | Seven sites, 9–18 h | Seven sites, 33–42 h | Shadmot, 9–18 h | Shadmot, 33–42 h |
|---|---:|---:|---:|---:|
| ECMWF IFS 0.25° | 15.65 | 17.39 | 17.52 | 19.49 |
| ECMWF IFS 0.1° | 16.02 | 17.81 | 15.93 | 17.23 |
| UK Met Office global 10 km | 16.09 | 17.16 | 12.30 | 13.63 |
| App blend, 40% ICON-EU / 60% IFS 0.25° | 15.87 | 18.75 | 15.86 | 19.94 |
| ICON-EU | 19.92 | 23.76 | 17.60 | 22.80 |
| ICON Global | 19.49 | 22.97 | 15.61 | 20.91 |
| GFS Seamless | 19.97 | 20.00 | 16.78 | 21.29 |

Using 30% as the threshold for both forecast and reference, 281 of the
357 place-hours were below the threshold. At 9–18 hours, ICON-EU, the
app blend and IFS 0.25° respectively crossed the threshold on 93, 34
and 22 of those cases. They missed 13, 21 and 34 of the 76 cases with
at least 30% observed cover. At 33–42 hours, false positives were 113,
50 and 31, and misses were 13, 21 and 44.

In a separate Shadmot Mehola check on eight other dates at 08:00, 11:00
and 18:00 UTC (24 cases per lead range), UKMO, IFS 0.25° and the app blend
scored 14.67, 17.25 and 16.24 pp at 8–18 hours. At 32–42 hours, the same
sources scored 23.33, 15.86 and 20.06 pp. IFS 0.25° improves on ICON-EU
across the two lead ranges in the main seven-site test. The local
results favor UKMO at the shorter leads in both samples and reverse
the ranking at the longer leads. This comparison covers total cloud and
uses Meteosat for verification. Local model archives and independent
surface reports would support verification of low-cloud performance.
[Open-Meteo ECMWF](https://open-meteo.com/en/docs/ecmwf-api) ·
[Open-Meteo UK Met Office](https://open-meteo.com/en/docs/ukmo-api) ·
[IMS model data access](https://ims.gov.il/en/node/179) ·
[IMS hourly visual observations](https://ims.gov.il/en/CurrentDataXML)

### Lowering the influence of isolated low cloud

A separate comparison used the Previous Runs API and the same seven sites,
three daily observation hours and 30 km Meteosat mask. We fitted candidate
weights on 37 dates in January, April, July, October and November 2026.
The held-out sample covers 45 dates in February, March, May, June, August
and September. Each row below uses the same 2,688 place-hour-lead pairs
with all three models available, pooling latest, 24 h and 48 h Previous
Runs offsets. Errors are computed before satellite correction. The
threshold for classifying both observed and predicted cover is 30%.

| Forecast | Cloud-cover MAE (pp) | False cloudy | Missed cloudy |
|---|---:|---:|---:|
| 40% ICON / 60% IFS baseline | 15.43 | 276 | 112 |
| 20% ICON / 80% IFS | 14.33 | 184 | 175 |
| IFS alone | 13.91 | 153 | 237 |
| UKMO alone | 16.78 | 249 | 269 |
| 10% ICON / 60% IFS / 30% UKMO | 13.92 | 207 | 171 |

Among forecasts in which ICON predicted considerably more cloud than IFS,
the largest isolated errors often coincided with ICON predicting more
low cloud. A derived candidate reduces the contribution from ICON's
excess low cloud when IFS expects nearly clear skies. It uses the same
two providers. Here `i` and `e` are ICON and IFS total cover, and `iLow`
and `eLow` are their low-cloud covers. Inputs represent percentage points.

```text
spread = i - e
lowExcess = min(max(iLow - eLow, 0), max(spread, 0))
influence = (1 - smoothstep(5, 15, e))
          * smoothstep(15, 30, spread)
          * smoothstep(0.55, 0.80, lowExcess / max(spread, 1))
cover = 0.4 * i + 0.6 * e - 0.4 * lowExcess * influence
```

`smoothstep(a, b, x)` applies the cubic `t²(3−2t)` to `t` equal to
`(x−a)/(b−a)` clamped to 0–1. The correction needs both models and both
low-cloud fields. The Shadmot Mehola case at 17:00 gives 21.2% with the
fixed blend and 0% with the candidate, before any satellite adjustment.

The candidate was then run on another 42 dates, using the 5th, 13th,
21st and 29th of each month from January through 25 November where
available. Only the latest Previous Runs forecast exposes cloud layers.
Each date contributed 21 cases at 08:00, 11:00 and 18:00 UTC. Of 882 total
cases, the candidate changed 132 by at least a percentage point.

| Confirmation sample | Cases | Baseline MAE (pp) | Candidate MAE (pp) |
|---|---:|---:|---:|
| All matched cases | 882 | 13.85 | 13.16 |
| Change of at least 1 percentage point | 132 | 14.83 | 10.25 |
| Daylight, all matched cases | 588 | 14.62 | 14.54 |
| Night, all matched cases | 294 | 12.32 | 10.41 |
| Shadmot Mehola, all matched cases | 126 | 12.69 | 11.87 |

Across all confirmation cases, false cloudy classifications fell from
98 to 96 and misses rose from 29 to 30. A paired whole-date bootstrap
gave a 95% interval of −1.01 to −0.40 pp for the difference in total
cover MAE. The largest gains were at night. The masks verify total
cover and are less certain in low light. Longer-range or layer-specific
claims require archived runs with cloud layers and validation against
local sky observations. The candidate has been evaluated offline.
The app applies it at every lead in the calibration region
(`src/domain/correction/cloud.ts`, `lowExcessShift`), to the total and the
low layer alike, before the ground-trained near-term fit below. It was
verified on the latest forecast only; at longer leads it rests on ICON's
false cloudy count growing with lead in the table above.
[Open-Meteo Previous Runs](https://open-meteo.com/en/docs/previous-runs-api) ·
[Satellite sampling code](verify_cloud.py) ·
[IMS hourly visual observations](https://ims.gov.il/he/CurrentDataXML)

### Forecast verification against visual cloud observations

The official IMS historical hourly archive has `cld_ttl_cvr` and
`cld_low_cvr` for staffed stations. The 2026 download included Bet Dagan
(2520), Zefat Har Kenaan (4640) and Sede Eliyyahu (9375). Sede Eliyyahu is
about 10.5 km from Shadmot Mehola and reported at 06:00 UTC. The archive
in this check ended on 31 October. The rolling XML feed is a separate
product and did not contain the 24 November incident.

The archive was requested in UTC. Valid 0–8 cloud codes were converted
to percentage in eighths. Blank and obscured totals were excluded.
The low-cloud amount was set to zero when the low-cloud type code was
0, and otherwise checked against total cover. We matched 7,303 valid
station-hours to the latest archived forecast from all three models at
the station coordinates. The two older Previous Runs offsets had 6,796
and 6,581 matches. Site sizes differ, with Bet Dagan supplying the
majority of the sample.
[IMS historical hourly archive](https://ims.gov.il/he/data_gov) ·
[IMS archive user guide](https://ims.gov.il/sites/default/files/2022-09/short_guidebook.pdf) ·
[Example query for staffed stations and cloud fields](https://ims.gov.il/he/archive_data/T-60/9375%262520/cld_ttl_cvr%26cld_low_cvr%26cld_low_hgt%26cld_low_type%26cld_med_type%26cld_high_type/202610180000/202610222300/1/U/C/M/W)

On 239 station-hours matched to 30 km Meteosat masks, the observers
reported 35.2% mean cover and the mask detected 28.0% on average. At
the 30% threshold there were 44 cases cloudy only in the surface report
and 3 cloudy only in the mask. For the same 62 cases where the isolated
low-cloud rule changed the forecast by at least 1 pp, it reduced the
error against the mask from 15.00 to 11.32 pp and increased the error
against the observer from 14.44 to 18.51 pp. The mask samples horizontal
area and the observers estimate the visible sky from below. The paired
result makes the difference in verification target consequential for
the illustration.

At fixed 00:00 UTC model runs, the isolated low-cloud rule also reduced
error against the mask from 12.16 to 11.29 pp at 8–18 h and from 12.96
to 12.15 pp at 32–42 h. The matched test had 336 and 315 pairs at these
leads across 16 dates in May, June, August and September. The date
bootstrap interval at 32–42 h includes zero. Averaging four nearby
forecast points to represent the same 30 km footprint changed error
against the mask from 19.72 to 19.47 pp on a separate 14-date Previous
Runs sample. The effect at its latest offset was 17.36 to 17.30 pp.
[Open-Meteo Single Runs](https://open-meteo.com/en/docs/single-runs-api) ·
[EUMETSAT EUMETView](https://view.eumetsat.int/)

### Calibration for the view from the ground

The forecast blend was tested against the IMS reports, with the even
months reserved for evaluation. The residual calibration uses the cloud
layers and precipitation of ICON and IFS, their disagreement, and the
time of day. It learns observed minus blended cover from the odd months.
The regularized histogram gradient-boosting model uses absolute error,
40 iterations, five leaves per tree, depth at most three, at least 45
training samples per leaf, learning rate 0.08 and L2 penalty 15. It has
no station identifier or location features. The initial test used a
separate fit for total and low cloud.

| Latest forecast vs. IMS, 3,806 test station-hours | Total cover MAE (pp) | False cloudy ≥30% | Missed cloudy ≥30% |
|---|---:|---:|---:|
| 40% ICON / 60% IFS baseline | 15.99 | 300 | 597 |
| 20% ICON / 80% IFS | 17.21 | 189 | 828 |
| IFS alone | 19.58 | 158 | 969 |
| UKMO alone | 21.70 | 258 | 837 |
| 10% ICON / 60% IFS / 30% UKMO | 16.94 | 212 | 801 |
| Isolated low-cloud reduction | 17.31 | 280 | 634 |
| Simple median regression with cloud-cover hinges | 15.24 | 342 | 530 |
| Ground-trained residual correction | 14.30 | 369 | 455 |
| Half of the learned correction, exploratory | 14.84 | 332 | 511 |

After bounding low cover by the calibrated total, the full correction
reduced low-cloud error from 13.82 to 12.64 pp. Training only on
January–June and testing on July–October reduced total cover error
from 14.49 to 13.63 pp on 3,705 matches. Training on the other two
stations and testing on Sede Eliyyahu reduced total cover error from
14.46 to 13.88 pp on 117 matches. The date-bootstrap interval for that
station's difference was −1.88 to +0.70 pp. The direction improved
also when Bet Dagan or Zefat Har Kenaan was held out. At a fixed 30%
threshold the correction has a higher false-cloud count overall and
fewer misses. A separate train-through-June quantile calibration of
the 24 h and 48 h offsets had confidence intervals spanning zero.

The results favor testing ground-trained calibration for the illustrated
sky with the two existing forecast inputs. Recent satellite imagery
remains a local observation for the near-term forecast. A replay of the
original model input at Shadmot Mehola puts the learned raw estimate
around 18%, compared with 21% from the base blend and 0% in the mask
and the user's observation. The generic calibration alone therefore
does not reconstruct that particular clear sky. All results are from
offline forecasts and observations, with a limited number of staffed
stations for the ground comparison.

#### Application calibration

The app fits the total- and low-cloud corrections to all 7,303 paired
observations after validation. In Israel it uses half of each learned
adjustment for the nearest three hours, tapering to zero by six hours
ahead. Later local dates use the base blend. Half strength is a
conservative choice for the illustration given the higher false-cloud
count at full strength. An hour with incomplete model data uses the
ordinary blend. The current reading interpolates the adjustments from
the surrounding hours. The app applies the satellite correction to that
forecast when drawing live and during a scrub.

Regenerate the checked-in model from the matched IMS/Open-Meteo CSV
using numpy, pandas and scikit-learn 1.8.

```sh
python research/verification/build_cloud_calibration.py \
  research/verification/data/cloud_sources/extended/ground-matched.csv
```
