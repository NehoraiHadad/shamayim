#!/usr/bin/env python3
"""Turn the cached raw IMS 10-minute data into hourly UTC tables + stations.csv.

    python3 ims_hourly.py                 # all stations found in data/raw/ims
    python3 ims_hourly.py --stations 22   # a subset (stations.csv is then not rewritten)

Outputs
  data/processed/ims_hourly/<stationId>.parquet   one hourly table per station
  data/processed/ims_hourly.parquet               all stations combined
  data/processed/ims_qa.csv                       QA counts per station x channel
  stations.csv                                    station metadata + TD coverage per year
(.csv.gz instead of .parquet when pyarrow is not installed)

Time handling
  * IMS clocks run on Israel *standard* time (UTC+2) all year. The API decorates
    the timestamps with +02:00/+03:00 following civil DST, but the wall-clock
    part never jumps (no missing/duplicated hour at DST changes, and solar noon
    stays at ~11:45 in summer). So the offset is ignored: UTC = wall clock - 2 h.
  * A timestamp labels the END of its 10-minute interval. The hourly row for
    hour H (UTC) therefore aggregates the six records H-1:10 ... H:00, i.e. the
    hour *preceding* H - the same convention Open-Meteo uses for precipitation,
    radiation and gusts. "At the hour" values are the record stamped H:00.

Hourly columns (NaN when missing or rejected by QA)
  time            hour H, UTC (tz-naive in csv, UTC-aware in parquet)
  station_id
  td              TD at H:00 (deg C)        <-> temperature_2m
  td_max, td_min  max TDmax / min TDmin over the hour
  rh              RH at H:00 (%)
  ws              mean WS over the hour (m/s)
  ws_at_hour      WS record at H:00 = mean of the last 10 min (m/s)  <-> wind_speed_10m
  ws_gust         max WSmax over the hour (m/s)
  wd              WD at H:00 (deg)
  rain            sum of Rain over the hour (mm)
  grad            mean Grad over the hour (W/m2)
Aggregates (mean/sum/max/min) need >= 4 of the 6 ten-minute values, else NaN.
"""
from __future__ import annotations

import argparse
import datetime as dt
import gzip
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
RAW_DIR = HERE / "data" / "raw" / "ims"
OUT_DIR = HERE / "data" / "processed"
HOURLY_DIR = OUT_DIR / "ims_hourly"

CHANNELS = ["TD", "TDmax", "TDmin", "RH", "WS", "WSmax", "WD", "Rain", "Grad"]
COLUMNS = ["td", "td_max", "td_min", "rh", "ws", "ws_at_hour", "ws_gust", "wd", "rain", "grad"]

UTC_OFFSET = pd.Timedelta(hours=2)      # IMS clock = Israel standard time, all year
MIN_COUNT = 4                           # of 6 ten-minute values
STUCK_STEPS = 36                        # a run of > 36 equal 10-min values = stuck > 6 h

# plausibility limits (inclusive), per channel
LIMITS = {
    "TD": (-15, 52), "TDmax": (-15, 52), "TDmin": (-15, 52),
    "RH": (0, 100),
    "WS": (0, 60), "WSmax": (0, 90),
    "WD": (0, 360),
    "Rain": (0, 60),            # mm per 10 minutes
    "Grad": (-20, 1500),        # small negative night offsets are clipped to 0 below
}
# stuck-value check: which channels, and which values are exempt (legitimately constant)
STUCK = {
    "TD": None, "TDmax": None, "TDmin": None,
    "RH": lambda v: v >= 95,    # saturated nights (fog/rain)
    "WS": lambda v: v <= 0.2,   # calm
    "WSmax": lambda v: v <= 0.2,
}

try:
    import pyarrow  # noqa: F401
    HAVE_PARQUET = True
except ImportError:
    HAVE_PARQUET = False
EXT = ".parquet" if HAVE_PARQUET else ".csv.gz"


def write_table(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name("." + path.name + ".tmp")
    if HAVE_PARQUET:
        df.to_parquet(tmp, index=False, compression="zstd")
    else:
        out = df.copy()
        out["time"] = out["time"].dt.strftime("%Y-%m-%dT%H:%M")
        out.to_csv(tmp, index=False, compression="gzip", float_format="%.4g")
    tmp.replace(path)


def read_table(path: Path) -> pd.DataFrame:
    if HAVE_PARQUET:
        return pd.read_parquet(path)
    return pd.read_csv(path, parse_dates=["time"])


def load_channel(station_dir: Path, channel: str) -> tuple[pd.Series, dict]:
    """All cached years of one channel -> QC'ed 10-minute series indexed by UTC time."""
    times: list[str] = []
    values: list[float] = []
    valid: list[bool] = []
    for f in sorted(station_dir.glob(f"{channel}_*.json.gz")):
        with gzip.open(f, "rb") as fh:
            doc = json.loads(fh.read())
        for rec in doc["data"]:
            ch = rec["channels"][0]
            times.append(rec["datetime"][:19])      # drop the (misleading) offset
            values.append(ch["value"])
            valid.append(bool(ch["valid"]))
    qa = dict(n_raw=len(times), n_invalid=0, n_duplicate=0, n_out_of_range=0, n_stuck=0, n_good=0)
    if not times:
        return pd.Series(dtype="float64"), qa
    idx = pd.to_datetime(pd.Series(times), format="%Y-%m-%dT%H:%M:%S") - UTC_OFFSET
    s = pd.Series(pd.to_numeric(pd.Series(values), errors="coerce").to_numpy(dtype="float64"),
                  index=pd.DatetimeIndex(idx))
    ok = np.asarray(valid) & s.notna().to_numpy()
    qa["n_invalid"] = int((~ok).sum())
    s = s[ok]
    dup = s.index.duplicated(keep="last")
    qa["n_duplicate"] = int(dup.sum())
    s = s[~dup].sort_index()
    # only records on the 10-minute grid are usable
    s = s[(s.index.minute % 10 == 0) & (s.index.second == 0)]

    lo, hi = LIMITS[channel]
    bad = (s < lo) | (s > hi)
    qa["n_out_of_range"] = int(bad.sum())
    s = s[~bad]
    if channel == "Grad":
        s = s.clip(lower=0)

    if channel in STUCK and len(s):
        v = s.to_numpy()
        step = np.diff(s.index.values).astype("timedelta64[s]").astype(np.int64) == 600
        new_run = np.ones(len(v), dtype=bool)
        new_run[1:] = (v[1:] != v[:-1]) | ~step
        run_id = np.cumsum(new_run)
        run_len = np.bincount(run_id)[run_id]
        stuck = run_len > STUCK_STEPS
        exempt = STUCK[channel]
        if exempt is not None:
            stuck &= ~exempt(v)
        qa["n_stuck"] = int(stuck.sum())
        s = s[~stuck]
    qa["n_good"] = int(len(s))
    return s, qa


def hour_agg(s: pd.Series, how: str) -> pd.Series:
    """Aggregate records H-1:10..H:00 into hour H, requiring MIN_COUNT values."""
    if s.empty:
        return pd.Series(dtype="float64")
    g = s.groupby(s.index.ceil("h"))
    out = g.agg(how)
    return out.where(g.count() >= MIN_COUNT)


def at_hour(s: pd.Series) -> pd.Series:
    return s[s.index.minute == 0] if len(s) else pd.Series(dtype="float64")


def process_station(station_id: int) -> tuple[int, list[dict], dict]:
    d = RAW_DIR / str(station_id)
    ser, qa_rows = {}, []
    for ch in CHANNELS:
        s, qa = load_channel(d, ch)
        ser[ch] = s
        if qa["n_raw"]:
            qa_rows.append(dict(station_id=station_id, channel=ch, **qa))
    cols = {
        "td": at_hour(ser["TD"]),
        "td_max": hour_agg(ser["TDmax"], "max"),
        "td_min": hour_agg(ser["TDmin"], "min"),
        "rh": at_hour(ser["RH"]),
        "ws": hour_agg(ser["WS"], "mean"),
        "ws_at_hour": at_hour(ser["WS"]),
        "ws_gust": hour_agg(ser["WSmax"], "max"),
        "wd": at_hour(ser["WD"]),
        "rain": hour_agg(ser["Rain"], "sum"),
        "grad": hour_agg(ser["Grad"], "mean"),
    }
    df = pd.DataFrame(cols).dropna(how="all")
    info = dict(station_id=station_id, rows=len(df))
    if df.empty:
        return station_id, qa_rows, info
    df = df.astype("float32").round(3)
    df.index.name = "time"
    df = df.reset_index()
    df["time"] = df["time"].dt.tz_localize("UTC") if HAVE_PARQUET else df["time"]
    df.insert(1, "station_id", np.int16(station_id))
    write_table(df, HOURLY_DIR / f"{station_id}{EXT}")

    td = df.loc[df["td"].notna(), "time"]
    if len(td):
        info["td_first"] = td.iloc[0].strftime("%Y-%m-%d")
        info["td_last"] = td.iloc[-1].strftime("%Y-%m-%d")
        info["td_by_year"] = td.dt.year.value_counts().to_dict()
    info["channels"] = [c for c in COLUMNS if df[c].notna().any()]
    return station_id, qa_rows, info


def hours_in_year(year: int, now: dt.datetime) -> int:
    start = dt.datetime(year, 1, 1)
    end = min(dt.datetime(year + 1, 1, 1), now)
    return max(0, int((end - start).total_seconds() // 3600))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--stations", type=int, nargs="*")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    meta = {s["stationId"]: s for s in json.loads((RAW_DIR / "stations.json").read_text("utf-8"))}
    have = sorted(int(p.name) for p in RAW_DIR.iterdir() if p.is_dir() and p.name.isdigit())
    ids = [i for i in have if not args.stations or i in args.stations]
    print(f"processing {len(ids)} stations -> {HOURLY_DIR} ({EXT})", flush=True)

    qa_rows, infos = [], {}
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for n, (sid, qa, info) in enumerate(pool.map(process_station, ids), 1):
            qa_rows += qa
            infos[sid] = info
            print(f"  [{n}/{len(ids)}] station {sid}: {info['rows']} hourly rows", flush=True)

    qa = pd.DataFrame(qa_rows)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if len(qa):
        qa.insert(1, "name", qa["station_id"].map(lambda i: meta[i]["name"]))
        tot = qa.groupby("channel")[["n_raw", "n_invalid", "n_duplicate", "n_out_of_range",
                                     "n_stuck", "n_good"]].sum().reindex(CHANNELS).dropna()
        print("\nQA counts (10-minute records):")
        print(tot.astype("int64").to_string())
    if args.stations:
        print("\nsubset run: stations.csv / combined table / ims_qa.csv not rewritten")
        return 0
    qa.to_csv(OUT_DIR / "ims_qa.csv", index=False)

    # combined table
    parts = [read_table(HOURLY_DIR / f"{i}{EXT}") for i in ids if infos[i]["rows"]]
    if parts:
        allh = pd.concat(parts, ignore_index=True)
        write_table(allh, OUT_DIR / f"ims_hourly{EXT}")
        print(f"\ncombined: {len(allh):,} rows, {allh['station_id'].nunique()} stations "
              f"-> {OUT_DIR / ('ims_hourly' + EXT)}")

    # stations.csv
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    years = list(range(2016, now.year + 1))
    rows = []
    for sid in ids:
        st, info = meta[sid], infos[sid]
        by_year = info.get("td_by_year", {})
        row = dict(stationId=sid, name=st["name"],
                   lat=st["location"]["latitude"], lon=st["location"]["longitude"],
                   active=st["active"], regionId=st.get("regionId"),
                   td_first=info.get("td_first", ""), td_last=info.get("td_last", ""),
                   hourly_rows=info["rows"], variables=" ".join(info.get("channels", [])))
        for y in years:
            row[f"td_cov_{y}"] = round(100 * by_year.get(y, 0) / hours_in_year(y, now), 1)
        rows.append(row)
    st_df = pd.DataFrame(rows)
    st_df.to_csv(HERE / "stations.csv", index=False)
    print(f"stations.csv: {len(st_df)} stations, {(st_df['td_first'] != '').sum()} with TD data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
