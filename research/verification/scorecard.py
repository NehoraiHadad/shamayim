"""Scorecard: what the app would have shown at each past hour, scored against IMS stations.

    python3 research/verification/scorecard.py                 # all variables, held-out period
    python3 research/verification/scorecard.py --split 2026-05-01  # another hold-out start

Inputs (not in this repo; see the private data repo's README):
  data/processed/ims_hourly.parquet      IMS 10-minute readings reduced to hourly UTC (ims_hourly.py)
  om-archive/pass{1,2,3}/<id>_<year>.json.gz   Open-Meteo Previous Runs at the stations (om_fetch.mjs)

What is replayed (mirrors src/data/openMeteo/mapHours.ts, mapDays.ts and src/domain/correction/):
  temperature   ICON share 0.8/0.6/0.4 by day (temperatureIconWeight) + national lead x season x hour table
                (HOURLY_ADD); daily max + DAILY_MAX_ADD; live anomaly from nearby stations for "now" and the next hours
  humidity      ICON share 0.8/0.6 (humidityIconWeight) + HUMIDITY_ADD table, clipped to 0..100
  gusts         plain blend + GUST_ADD table, never below the hour's mean wind
  wind speed    plain blend (no correction in the app)
  rain          plain blend of hourly precipitation: hit / false alarm / miss for "rain in the hour" and "rain on the day"
Plain blend = ICON 0.6 for day offsets 0..4, 0.4 after (iconWeight); a missing model falls back to the other one.

Honesty rules:
  * Every correction table is REFITTED here from training data only: hours before --split, and leave-one-station-out
    (the scored station never contributes to its own table). The shipped tables were fitted on all stations and all
    years, so scoring them on the same data would flatter them; they are scored too, but labelled "in-sample".
  * Every variant of one row is scored on the same station-hours (all of them available), so the numbers compare.
  * Leads are Previous Runs offsets: l0 is the stitched latest run (first hours of each run, close to an analysis:
    better than what the app shows for later today), l1 the run issued a day before, l2/l4/l6 two/four/six days.
    Groups: today = l0, tomorrow = l1, 3+ days = l2, l4, l6 (the third day onward).

Output: results/scorecard.json (everything) and results/scorecard.md (the plain-language tables).
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent
ARCH = HERE / "om-archive"
OBS = HERE / "data" / "processed" / "ims_hourly.parquet"
OUT = HERE / "results"
SRC = HERE.parent.parent / "src" / "domain" / "correction"
KMH = 3.6
SEASONS = ["winter", "spring", "summer", "autumn"]
SEASON_OF_MONTH = {12: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3}
CENTRE_DOY = np.array([15, 105, 196, 288])
LEAD_DAYS = {"l0": 0, "l1": 1, "l2": 2, "l4": 4, "l6": 6}
LEAD_GROUP = {"l0": "today", "l1": "tomorrow", "l2": "3+ days", "l4": "3+ days", "l6": "3+ days"}
MODELS = {"icon": "icon_seamless", "ecmwf": "ecmwf_ifs025"}

# variable -> (pass, {lead: Open-Meteo column})
COLUMNS = {
    "t": ("pass1", {"l0": "temperature_2m", "l1": "temperature_2m_previous_day1", "l2": "temperature_2m_previous_day2",
                    "l4": "temperature_2m_previous_day4", "l6": "temperature_2m_previous_day6"}),
    "gust": ("pass2", {"l0": "wind_gusts_10m", "l1": "wind_gusts_10m_previous_day1"}),
    "rh": ("pass2", {"l0": "relative_humidity_2m", "l1": "relative_humidity_2m_previous_day1"}),
    "wind": ("pass3", {"l0": "wind_speed_10m", "l1": "wind_speed_10m_previous_day1", "l2": "wind_speed_10m_previous_day2"}),
    # Open-Meteo keeps the probability for the latest run only (previous_dayN columns come back empty).
    "pop": ("pass4", {"l0": "precipitation_probability"}),
    "rain": (None, {"l0": ("pass3", "precipitation"), "l1": ("pass2", "precipitation_previous_day1"),
                    "l2": ("pass3", "precipitation_previous_day2")}),
}

# ---------------------------------------------------------------------------------------------------------- app logic


def icon_weight(day):  # domain/blend.ts iconWeight
    return 0.6 if day < 5 else 0.4


def temperature_icon_weight(day):  # correction/temperature.ts
    return 0.8 if day <= 2 else 0.6 if day <= 4 else 0.4


def humidity_icon_weight(day):  # correction/windHumidity.ts
    return 0.8 if day <= 2 else 0.6


def blend_number(i, e, w):
    """domain/blend.ts blendNumber: weighted mean, or the one model that answered."""
    out = w * i + (1 - w) * e
    return out.where(i.notna() & e.notna(), i.fillna(e))


def season_weights(doy):
    """correction/table.ts seasonWeights: linear between the two nearest season centres, wrapping over New Year."""
    doy = np.asarray(doy, float)
    w = np.zeros((len(doy), 4))
    ext = np.concatenate([CENTRE_DOY - 365, CENTRE_DOY, CENTRE_DOY + 365])
    idx = np.searchsorted(ext, doy, side="right") - 1
    f = (doy - ext[idx]) / (ext[idx + 1] - ext[idx])
    w[np.arange(len(doy)), idx % 4] += 1 - f
    w[np.arange(len(doy)), (idx + 1) % 4] += f
    return w


def smooth_read(tab, sw, hour):
    """Value of a [season][hour] table at each row, smoothed by season weights."""
    return np.einsum("ns,sn->n", sw, tab[:, hour])


def read_ts_tables():
    """The shipped tables, parsed from the generated TypeScript (for the in-sample comparison)."""
    def arrays(path, name):
        text = (SRC / path).read_text()
        start = text.index(f"export const {name}")
        start = text.index("=", start) + 1
        depth, i = 0, start
        while True:
            c = text[i]
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        return np.array(json.loads(re.sub(r",\s*]", "]", text[start:i + 1])))
    return {
        "HOURLY_ADD": arrays("nationalTables.ts", "HOURLY_ADD"),
        "DAILY_MAX_ADD": arrays("nationalTables.ts", "DAILY_MAX_ADD"),
        "GUST_ADD": arrays("moreTables.ts", "GUST_ADD"),
        "HUMIDITY_ADD": arrays("moreTables.ts", "HUMIDITY_ADD"),
    }

# --------------------------------------------------------------------------------------------------------------- data


def coast_lon(lat):
    return float(np.interp(lat, [31.2, 31.6, 32.0, 32.5, 32.8, 33.1], [34.25, 34.5, 34.75, 34.88, 34.98, 35.1]))


def region(lat, lon, elev):  # same regions as verify_temp.py
    if 31.0 < lat < 31.85 and lon > 35.3:
        return "Dead Sea and Judean Desert"
    if elev < -100 and lon > 35.3:
        return "Jordan Valley"
    if lat < 31.0 and elev < 350 and (lon > 35.0 or lat < 29.7):
        return "Arava and Eilat"
    if lat < 31.35:
        return "Negev"
    if lon - coast_lon(lat) < 0.12 and elev < 120:
        return "Coastal plain"
    if lat > 32.7 and lon > 35.65 and elev > 200:
        return "Golan and Hermon"
    if elev >= 450:
        return "Mountains (Jerusalem, Samaria, Galilee)"
    return "Lowlands, valleys and inland"


def load_forecasts():
    stations = {s["id"]: s for s in json.load(open(HERE / "om_stations.json"))}
    wanted = {}  # pass -> [(out column, om column)]
    for var, (p, leads) in COLUMNS.items():
        for l, col in leads.items():
            pp, cc = (p, col) if p else col
            for m, mk in MODELS.items():
                wanted.setdefault(pp, []).append((f"{var}_{m}_{l}", f"{cc}_{mk}"))
    per_pass = []
    for p, cols in wanted.items():
        frames = []
        for f in sorted((ARCH / p).glob("*.json.gz")):
            sid = int(f.name.split("_")[0])
            d = json.loads(gzip.open(f).read())
            h = d["hourly"]
            df = pd.DataFrame({"time": pd.to_datetime(h["time"]), "station_id": sid})
            for out, src in cols:
                df[out] = pd.array(h.get(src, [None] * len(df)), dtype="Float64").astype("float32")
            stations[sid]["grid_elev"] = d.get("elevation")
            frames.append(df)
        if frames:
            per_pass.append(pd.concat(frames, ignore_index=True))
    fc = per_pass[0]
    for other in per_pass[1:]:
        fc = fc.merge(other, on=["station_id", "time"], how="outer")
    meta = pd.DataFrame(stations.values()).rename(columns={"id": "station_id"})
    meta = meta[meta.station_id.isin(fc.station_id.unique())]
    meta["region"] = [region(r.lat, r.lon, r.grid_elev if r.grid_elev == r.grid_elev and r.grid_elev is not None else 0)
                      for r in meta.itertuples()]
    return fc, meta


def load(split):
    fc, meta = load_forecasts()
    obs = pd.read_parquet(OBS, columns=["time", "station_id", "td", "td_max", "td_min", "rh", "ws_at_hour", "ws_gust", "rain"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"], how="inner")
    std = df.time + pd.Timedelta(hours=2)  # Israel standard time, as the tables are kept
    df["hour"] = std.dt.hour.astype("int8")
    df["season"] = std.dt.month.map(SEASON_OF_MONTH).astype("int8")
    df["doy"] = std.dt.dayofyear.astype("int16")
    df["day"] = std.dt.normalize()
    df["test"] = df.time >= split
    df = df.merge(meta[["station_id", "region", "lat", "lon"]], on="station_id", how="left")
    return df, meta

# ------------------------------------------------------------------------------------------------------------ fitting


def loso_table(df, err, train):
    """[season][hour] mean of `err` over training rows, without each row's own station: array per row (n, 4, 24)
    is too big, so return a function station -> table."""
    d = pd.DataFrame({"s": df.station_id, "season": df.season, "hour": df.hour, "e": err})[train & err.notna()]
    sums = d.groupby(["s", "season", "hour"]).e.agg(["sum", "count"])
    tot = sums.groupby(level=[1, 2]).sum()

    def grid(t):
        g = (t["sum"] / t["count"]).unstack().reindex(index=range(4), columns=range(24))
        return g.to_numpy(dtype=float)

    full = grid(tot)
    stations = set(sums.index.get_level_values(0))
    cache = {}

    def without(s):
        if s not in stations:
            return full
        if s not in cache:
            cache[s] = grid(tot.sub(sums.loc[s], fill_value=0))
        return cache[s]
    return without, full


def apply_loso(df, mask, table_for, sign=-1.0):
    """Per-row smoothed table value (sign -1: the table holds mean errors, the app adds their negative)."""
    out = np.full(len(df), np.nan)
    idx = np.flatnonzero(mask)
    sub = df.iloc[idx]
    sw = season_weights(sub.doy.to_numpy())
    for s, rows in sub.groupby("station_id").indices.items():
        tab = table_for(s)
        out[idx[rows]] = sign * smooth_read(tab, sw[rows], sub.hour.to_numpy()[rows])
    return out


def shipped_read(df, mask, table3, lead_index):
    """Shipped [lead][season][hour] table at a fixed lead index."""
    out = np.full(len(df), np.nan)
    sub = df[mask]
    sw = season_weights(sub.doy.to_numpy())
    out[mask] = smooth_read(np.asarray(table3[lead_index], float), sw, sub.hour.to_numpy())
    return out

# ------------------------------------------------------------------------------------------------------------ scoring


def cont_stats(f, o):
    e = (f - o)
    if e.size == 0:
        return {"n": 0, "mae": float("nan"), "bias": float("nan")}
    return {"n": int(e.size), "mae": round(float(np.abs(e).mean()), 3), "bias": round(float(e.mean()), 3)}


def score_continuous(df, obs, variants, keys):
    """variants: {name: array}; scored on rows where obs and every variant exist. keys: breakdown columns."""
    ok = obs.notna().to_numpy().copy()
    for v in variants.values():
        ok &= ~np.isnan(v)
    out = {"all": {k: cont_stats(v[ok], obs.to_numpy()[ok]) for k, v in variants.items()}}
    for key in keys:
        col = df[key].to_numpy()
        out[key] = {}
        for g in pd.unique(col[ok]):
            m = ok & (col == g)
            if m.sum() < 200:
                continue
            out[key][str(SEASONS[g] if key == "season" else g)] = {
                k: cont_stats(v[m], obs.to_numpy()[m]) for k, v in variants.items()}
    return out


def cat_stats(f, o):
    hits = int((f & o).sum()); fa = int((f & ~o).sum()); miss = int((~f & o).sum()); cn = int((~f & ~o).sum())
    pod = hits / (hits + miss) if hits + miss else float("nan")
    far = fa / (hits + fa) if hits + fa else float("nan")
    csi = hits / (hits + fa + miss) if hits + fa + miss else float("nan")
    fbias = (hits + fa) / (hits + miss) if hits + miss else float("nan")
    r = lambda x: None if x != x else round(x, 3)
    return {"n": hits + fa + miss + cn, "observed": hits + miss, "hits": hits, "false_alarms": fa, "misses": miss,
            "pod": r(pod), "far": r(far), "csi": r(csi), "freq_bias": r(fbias)}


def score_categorical(df, obs_yes, variants, ok, keys):
    out = {"all": {k: cat_stats(v[ok], obs_yes[ok]) for k, v in variants.items()}}
    for key in keys:
        col = df[key].to_numpy()
        out[key] = {}
        for g in pd.unique(col[ok]):
            m = ok & (col == g)
            if m.sum() < 200:
                continue
            out[key][str(SEASONS[g] if key == "season" else g)] = {k: cat_stats(v[m], obs_yes[m]) for k, v in variants.items()}
    return out

# --------------------------------------------------------------------------------------------------------- variables


def temperature(df, shipped):
    res, daily = {}, {}
    obs = df.td.astype(float)
    train, test = (~df.test).to_numpy(), df.test.to_numpy()
    for li, (l, day) in enumerate(LEAD_DAYS.items()):
        i, e = df[f"t_icon_{l}"].astype(float), df[f"t_ecmwf_{l}"].astype(float)
        plain = blend_number(i, e, icon_weight(day))
        tw = blend_number(i, e, temperature_icon_weight(day))
        table_for, _ = loso_table(df, tw - obs, train)
        add = apply_loso(df, test, table_for)
        ship = shipped_read(df, test, shipped["HOURLY_ADD"], li)
        v = {"ICON alone": i.to_numpy(), "ECMWF alone": e.to_numpy(), "plain blend": plain.to_numpy(),
             "app": tw.to_numpy() + add,
             "app without ICON-weight change": plain.to_numpy() + add,
             "app without hourly table": tw.to_numpy(),
             "app with shipped table (in-sample)": tw.to_numpy() + ship}
        res[l] = score_continuous(df[test], obs[test], {k: x[test] for k, x in v.items()}, ["season", "region"])
        # Daily max over the Israel-standard-time day (the app reads Open-Meteo's daily max of the same hours)
        d = pd.DataFrame({"s": df.station_id, "day": df.day, "o": df.td_max, "test": df.test, "region": df.region,
                          "season": df.season, **{k: x for k, x in v.items() if k in ("ICON alone", "ECMWF alone", "plain blend")},
                          "tw": tw})
        g = d.groupby(["s", "day"]).agg(o=("o", "max"), no=("o", "count"), n=("tw", "count"), test=("test", "first"),
                                        region=("region", "first"), season=("season", "first"),
                                        **{k: (k, "max") for k in ("ICON alone", "ECMWF alone", "plain blend", "tw")}).reset_index()
        g = g[(g.n == 24) & (g.no >= 20)]
        tr = g[~g.test]
        sums = (tr.tw - tr.o).groupby(tr.s).agg(["sum", "count"])
        S, N = sums["sum"].sum(), sums["count"].sum()
        te = g[g.test].copy()
        own = sums.reindex(te.s).fillna(0).to_numpy()
        loso_bias = (S - own[:, 0]) / (N - own[:, 1])
        dv = {"ICON alone": te["ICON alone"].to_numpy(), "ECMWF alone": te["ECMWF alone"].to_numpy(),
              "plain blend": te["plain blend"].to_numpy(), "app": te.tw.to_numpy() - loso_bias,
              "app without ICON-weight change": te["plain blend"].to_numpy() - loso_bias,
              "app without daily-max offset": te.tw.to_numpy(),
              "app with shipped offset (in-sample)": te.tw.to_numpy() + shipped["DAILY_MAX_ADD"][li]}
        daily[l] = score_continuous(te, te.o, dv, ["season", "region"])
    return res, daily


def humidity(df, shipped):
    res = {}
    obs = df.rh.astype(float)
    train, test = (~df.test).to_numpy(), df.test.to_numpy()
    for li, l in enumerate(["l0", "l1"]):
        day = LEAD_DAYS[l]
        i, e = df[f"rh_icon_{l}"].astype(float), df[f"rh_ecmwf_{l}"].astype(float)
        plain = blend_number(i, e, icon_weight(day))
        hw = blend_number(i, e, humidity_icon_weight(day))
        table_for, _ = loso_table(df, hw - obs, train)
        add = apply_loso(df, test, table_for)
        ship = shipped_read(df, test, shipped["HUMIDITY_ADD"], li)
        clip = lambda x: np.clip(x, 0, 100)
        v = {"ICON alone": i.to_numpy(), "ECMWF alone": e.to_numpy(), "plain blend": plain.to_numpy(),
             "app": clip(hw.to_numpy() + add), "app without ICON-weight change": clip(plain.to_numpy() + add),
             "app without humidity table": hw.to_numpy(), "app with shipped table (in-sample)": clip(hw.to_numpy() + ship)}
        res[l] = score_continuous(df[test], obs[test], {k: x[test] for k, x in v.items()}, ["season", "region"])
    return res


def wind(df):
    res = {}
    obs = df.ws_at_hour.astype(float) * KMH
    test = df.test.to_numpy()
    for l in ["l0", "l1", "l2"]:
        i, e = df[f"wind_icon_{l}"].astype(float), df[f"wind_ecmwf_{l}"].astype(float)
        v = {"ICON alone": i.to_numpy(), "ECMWF alone": e.to_numpy(),
             "plain blend = app": blend_number(i, e, icon_weight(LEAD_DAYS[l])).to_numpy()}
        res[l] = score_continuous(df[test], obs[test], {k: x[test] for k, x in v.items()}, ["season", "region"])
    return res


def gusts(df, shipped):
    res = {}
    obs = df.ws_gust.astype(float) * KMH
    train, test = (~df.test).to_numpy(), df.test.to_numpy()
    for li, l in enumerate(["l0", "l1"]):
        day = LEAD_DAYS[l]
        i, e = df[f"gust_icon_{l}"].astype(float), df[f"gust_ecmwf_{l}"].astype(float)
        plain = blend_number(i, e, icon_weight(day))
        speed = blend_number(df[f"wind_icon_{l}"].astype(float), df[f"wind_ecmwf_{l}"].astype(float), icon_weight(day))
        floor = speed.fillna(-np.inf).to_numpy()
        table_for, _ = loso_table(df, plain - obs, train)
        add = apply_loso(df, test, table_for)
        ship = shipped_read(df, test, shipped["GUST_ADD"], li)
        v = {"ICON alone": i.to_numpy(), "plain blend": plain.to_numpy(),
             "app": np.maximum(floor, plain.to_numpy() + add),
             "app with shipped table (in-sample)": np.maximum(floor, plain.to_numpy() + ship)}
        if e.notna().any():
            v["ECMWF alone"] = e.to_numpy()
        res[l] = score_continuous(df[test], obs[test], {k: x[test] for k, x in v.items()}, ["season", "region"])
    return res


def rain(df):
    """Hit / false alarm / miss for 'it rains' in the hour (>= 0.2 mm) and on the day (>= 1 mm)."""
    res = {"hour": {}, "day": {}}
    test = df.test.to_numpy()
    for l in ["l0", "l1", "l2"]:
        i, e = df[f"rain_icon_{l}"].astype(float), df[f"rain_ecmwf_{l}"].astype(float)
        plain = blend_number(i, e, icon_weight(LEAD_DAYS[l]))
        o = df.rain.astype(float)
        ok = test & o.notna().to_numpy() & i.notna().to_numpy() & e.notna().to_numpy()
        v = {"ICON alone": i.to_numpy() >= 0.2, "ECMWF alone": e.to_numpy() >= 0.2, "plain blend = app": plain.to_numpy() >= 0.2}
        res["hour"][l] = score_categorical(df, o.to_numpy() >= 0.2, v, ok, ["season", "region"])
        d = pd.DataFrame({"s": df.station_id, "day": df.day, "o": o, "i": i, "e": e, "p": plain, "test": df.test,
                          "season": df.season, "region": df.region})
        d = d[d.o.notna() & d.i.notna() & d.e.notna()]
        g = d.groupby(["s", "day"]).agg(o=("o", "sum"), n=("o", "count"), i=("i", "sum"), e=("e", "sum"), p=("p", "sum"),
                                        test=("test", "first"), season=("season", "first"), region=("region", "first"))
        g = g[(g.n >= 22) & g.test].reset_index()
        v = {"ICON alone": g.i.to_numpy() >= 1, "ECMWF alone": g.e.to_numpy() >= 1, "plain blend = app": g.p.to_numpy() >= 1}
        res["day"][l] = score_categorical(g, g.o.to_numpy() >= 1, v, np.ones(len(g), bool), ["season", "region"])
    return res


def reliability(p, o):
    """p in %, o boolean. Brier score, its skill against always forecasting the period's rain frequency, and the
    observed frequency per 10 %-wide bin of the shown probability."""
    q = p / 100
    brier = float(((q - o) ** 2).mean())
    clim = float(o.mean())
    ref = clim * (1 - clim)
    bins = []
    for lo in range(0, 100, 10):
        m = (p >= lo) & ((p < lo + 10) if lo < 90 else (p <= 100))
        if m.sum():
            bins.append({"shown": f"{lo}-{lo + 10}%", "n": int(m.sum()), "mean_shown": round(float(p[m].mean()), 1),
                         "rained": round(float(o[m].mean() * 100), 1)})
    return {"n": int(len(p)), "observed_freq": round(clim * 100, 2), "brier": round(brier, 4),
            "brier_skill": round(1 - brier / ref, 3) if ref else None, "bins": bins}


def rain_probability(df):
    """Reliability of the shown probability of rain (Open-Meteo: chance of > 0.1 mm), hourly and the day's maximum.
    Only the latest run (l0) exists in the archive, so this covers 'today' only."""
    if "pop_icon_l0" not in df or df.pop_icon_l0.notna().sum() == 0:
        return None
    test = df.test.to_numpy()
    i, e = df.pop_icon_l0.astype(float), df.pop_ecmwf_l0.astype(float)
    o = df.rain.astype(float)
    ok = test & i.notna().to_numpy() & e.notna().to_numpy() & o.notna().to_numpy()
    app = blend_number(i, e, icon_weight(0))
    obs = o.to_numpy() >= 0.1
    res = {"hour": {k: reliability(v.to_numpy()[ok], obs[ok]) for k, v in
                    {"ICON alone": i, "ECMWF alone": e, "plain blend = app": app}.items()}}
    d = pd.DataFrame({"s": df.station_id, "day": df.day, "o": o, "i": i, "e": e})[ok]
    g = d.groupby(["s", "day"]).agg(o=("o", "sum"), n=("o", "count"), i=("i", "max"), e=("e", "max"))
    g = g[g.n >= 22]
    gi, ge = g.i.astype(float), g.e.astype(float)
    res["day"] = {k: reliability(v.to_numpy(), g.o.to_numpy() >= 0.1) for k, v in
                  {"ICON alone": gi, "ECMWF alone": ge, "plain blend = app": blend_number(gi, ge, icon_weight(0))}.items()}
    return res


def live(df, meta):
    """The live anomaly (Worker /v1/live + correction/live.ts) on the l0 forecast, `k` hours after the stations
    measured. Each scored station is treated as a place without a station: its own anomaly is left out."""
    DECAY_H = [0, 1, 2, 3, 6, 12, 18]
    DECAY = [0.87, 0.782, 0.641, 0.521, 0.306, 0.151, 0]
    train, test = ~df.test, df.test
    i, e = df.t_icon_l0.astype(float), df.t_ecmwf_l0.astype(float)
    f08 = blend_number(i, e, 0.8)
    err = f08 - df.td.astype(float)
    # station's usual error (worker/src/stations.ts), fitted on the training period
    usual = np.full(len(df), np.nan)
    sums = pd.DataFrame({"s": df.station_id, "season": df.season, "hour": df.hour, "e": err})[train & err.notna()]
    tabs = {s: g.groupby(["season", "hour"]).e.mean().unstack().reindex(index=range(4), columns=range(24)).to_numpy()
            for s, g in sums.groupby("s")}
    sw = season_weights(df.doy.to_numpy())
    for s, rows in df.groupby("station_id").indices.items():
        if s in tabs:
            usual[rows] = smooth_read(np.nan_to_num(tabs[s]), sw[rows], df.hour.to_numpy()[rows])
    anom = pd.DataFrame({"time": df.time, "s": df.station_id, "a": err.to_numpy() - usual})
    A = anom.pivot_table(index="time", columns="s", values="a")
    st = meta.set_index("station_id").loc[A.columns]
    lat, lon = np.radians(st.lat.to_numpy()), np.radians(st.lon.to_numpy())
    dlat, dlon = lat[:, None] - lat[None, :], lon[:, None] - lon[None, :]
    h = np.sin(dlat / 2) ** 2 + np.cos(lat[:, None]) * np.cos(lat[None, :]) * np.sin(dlon / 2) ** 2
    km = 2 * 6371 * np.arcsin(np.sqrt(h))
    G = np.exp(-0.5 * (km / 20) ** 2)
    G[G < 1e-3] = 0
    np.fill_diagonal(G, 0)  # leave the place's own station out
    vals = A.to_numpy()
    has = ~np.isnan(vals)
    W = has.astype(float) @ G  # (time, station) total weight from other stations
    S = np.nan_to_num(vals) @ G
    field = np.where(W >= 0.05, S / np.where(W > 0, W, 1), np.nan)
    field = pd.DataFrame(field, index=A.index, columns=A.columns)
    # app forecast at l0 (with its hourly table, refit LOSO on train)
    table_for, _ = loso_table(df, f08 - df.td.astype(float), train.to_numpy())
    app = f08.to_numpy() + apply_loso(df, test.to_numpy(), table_for)
    base = pd.DataFrame({"time": df.time, "s": df.station_id, "app": app, "o": df.td.astype(float), "test": df.test,
                         "season": df.season, "region": df.region})
    base = base[base.test & base.o.notna() & ~np.isnan(base.app)]
    out = {}
    long = field.stack().rename("anom").reset_index().rename(columns={"level_1": "s"})
    for k in [0, 1, 2, 3, 6, 12]:
        dec = float(np.interp(k, DECAY_H, DECAY))
        shifted = long.assign(time=long.time + pd.Timedelta(hours=k))
        b = base.merge(shifted, on=["time", "s"], how="inner")
        v = {"app without live": b.app.to_numpy(), "app": b.app.to_numpy() - dec * b.anom.to_numpy()}
        out[f"+{k}h"] = score_continuous(b, b.o, v, ["season", "region"])
    return out

# ------------------------------------------------------------------------------------------------------------- report


def md_cont(title, res, unit, leads):
    lines = [f"### {title}", "", f"Mean absolute error ({unit}), held-out period and stations; bias in brackets "
             "(positive = forecast too high).", ""]
    names = list(next(iter(res.values()))["all"].keys())
    lines.append("| lead | n | " + " | ".join(names) + " |")
    lines.append("|---|---:|" + "---:|" * len(names))
    for l in leads:
        if l not in res:
            continue
        a = res[l]["all"]
        n = next(iter(a.values()))["n"]
        lines.append(f"| {l} ({LEAD_GROUP.get(l, l)}) | {n:,} | " + " | ".join(
            f"{a[k]['mae']:.2f} ({a[k]['bias']:+.2f})" for k in names) + " |")
    return lines + [""]


def md_breakdown(title, res, lead, key, a="app", b=None):
    r = res[lead][key]
    names = list(next(iter(r.values())).keys())
    lines = [f"#### {title}: {lead} by {key}", "", "| " + key + " | n | " + " | ".join(names) + " |",
             "|---|---:|" + "---:|" * len(names)]
    for g, row in sorted(r.items()):
        n = next(iter(row.values()))["n"]
        lines.append(f"| {g} | {n:,} | " + " | ".join(f"{row[k]['mae']:.2f}" for k in names) + " |")
    return lines + [""]


def md_cat(title, res):
    lines = [f"### {title}", "", "Hits / false alarms / misses; CSI = hits ÷ (hits + false alarms + misses); "
             "frequency bias > 1 = forecasts rain too often.", "",
             "| lead | forecast | observed events | hits | false alarms | misses | POD | FAR | CSI | freq. bias |",
             "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for l, r in res.items():
        for k, s in r["all"].items():
            lines.append(f"| {l} ({LEAD_GROUP[l]}) | {k} | {s['observed']:,} | {s['hits']:,} | {s['false_alarms']:,} | "
                         f"{s['misses']:,} | {s['pod']} | {s['far']} | {s['csi']} | {s['freq_bias']} |")
    return lines + [""]


def check_against_app(n=400):
    """The replay's table reads against the app's TypeScript (scorecard_check.ts) on random hours and leads."""
    import subprocess
    import tempfile
    rng = np.random.default_rng(1)
    shipped = read_ts_tables()
    rows, py = [], []
    lead_list = list(LEAD_DAYS.values())
    for t, lead in zip(pd.Timestamp("2024-01-01") + pd.to_timedelta(rng.integers(0, 24 * 1000, n), unit="h"),
                       rng.choice(lead_list, n)):
        wall = t + pd.Timedelta(hours=2)
        rows.append({"time": wall.strftime("%Y-%m-%dT%H:%M"),
                     "now": (wall - pd.Timedelta(days=int(lead))).strftime("%Y-%m-%dT%H:%M"), "lead": int(lead), "gust": 80.0})
        one = pd.DataFrame({"doy": [wall.dayofyear], "hour": [wall.hour]})
        m, li = np.array([True]), lead_list.index(lead)
        py.append([shipped_read(one, m, shipped["HOURLY_ADD"], li)[0], shipped_read(one, m, shipped["GUST_ADD"], min(li, 1))[0],
                   shipped_read(one, m, shipped["HUMIDITY_ADD"], min(li, 1))[0], shipped["DAILY_MAX_ADD"][li]])
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(rows, f)
    root = HERE.parent.parent
    ts = json.loads(subprocess.check_output([str(root / "node_modules" / ".bin" / "tsx"),
                                             str(HERE / "scorecard_check.ts"), f.name], cwd=root))
    diff = np.abs(np.array(ts) - np.array(py)).max(0)
    print("replay vs app, max difference (temperature, gust, humidity, daily max):", diff.round(6))
    if diff.max() > 1e-6:
        raise SystemExit("the replay no longer matches the app: update scorecard.py")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="first compare the replay with the app's TypeScript (needs npm ci)")
    ap.add_argument("--split", default="2025-11-01", help="first day of the held-out period (UTC)")
    args = ap.parse_args()
    if args.check:
        check_against_app()
    split = pd.Timestamp(args.split)
    shipped = read_ts_tables()
    df, meta = load(split)
    info = {"split": str(split.date()), "stations": int(df.station_id.nunique()),
            "train_hours": int((~df.test).sum()), "test_hours": int(df.test.sum()),
            "first": str(df.time.min()), "last": str(df.time.max())}
    print(info)
    R = {"info": info}
    R["temperature"], R["temperature_daily_max"] = temperature(df, shipped)
    print("temperature done")
    R["temperature_live"] = live(df, meta)
    print("live done")
    R["humidity"] = humidity(df, shipped)
    R["wind"] = wind(df)
    R["gust"] = gusts(df, shipped)
    R["rain"] = rain(df)
    R["rain_probability"] = rain_probability(df)
    OUT.mkdir(exist_ok=True)
    json.dump(R, open(OUT / "scorecard.json", "w"), indent=1, ensure_ascii=False)

    L = ["# Forecast scorecard", "",
         f"Generated by `research/verification/scorecard.py`. Held-out period from {info['split']} "
         f"to {info['last'][:10]}; {info['stations']} IMS stations; corrections refitted on the hours before the split "
         "and without the scored station (leave-one-station-out). \"in-sample\" rows use the shipped tables, which "
         "were fitted on these same hours and stations: they are an upper bound, not a fair score.", "",
         "Leads: l0 = Open-Meteo's stitched latest run (first hours of each run, close to an analysis); l1 = issued a "
         "day before; l2/l4/l6 = two/four/six days before.", ""]
    L += md_cont("Temperature, hourly", R["temperature"], "°C", LEAD_DAYS)
    L += md_cont("Temperature, daily maximum", R["temperature_daily_max"], "°C", LEAD_DAYS)
    L += md_cont("Temperature at l0 with the live station anomaly, k hours after the stations measured",
                 R["temperature_live"], "°C", list(R["temperature_live"]))
    L += md_cont("Relative humidity, hourly", R["humidity"], "% RH", ["l0", "l1"])
    L += md_cont("Wind speed (10-minute mean at the hour)", R["wind"], "km/h", ["l0", "l1", "l2"])
    L += md_cont("Gusts (hourly maximum)", R["gust"], "km/h", ["l0", "l1"])
    L += md_cat("Rain in the hour (≥ 0.2 mm)", R["rain"]["hour"])
    L += md_cat("Rain on the day (≥ 1 mm, Israel standard-time day)", R["rain"]["day"])
    L += ["### Shown chance of rain (today only: Open-Meteo keeps no older runs of it)", ""]
    if R["rain_probability"] is None:
        L += ["Not scored yet: om-archive/pass4 (precipitation_probability) is not downloaded.", ""]
    else:
        for span, r in R["rain_probability"].items():
            L += [f"**Per {span}** (event: > 0.1 mm{' in the hour' if span == 'hour' else ' on the day; shown = the day maximum'})", "",
                  "| forecast | n | rained | Brier | skill vs climatology |", "|---|---:|---:|---:|---:|"]
            for k, x in r.items():
                L.append(f"| {k} | {x['n']:,} | {x['observed_freq']} % | {x['brier']} | {x['brier_skill']} |")
            L += ["", "Reliability of the app's number (shown → how often it rained):", "",
                  "| shown | n | mean shown | rained |", "|---|---:|---:|---:|"]
            L += [f"| {b['shown']} | {b['n']:,} | {b['mean_shown']} % | {b['rained']} % |" for b in r["plain blend = app"]["bins"]]
            L.append("")
    L += ["## Breakdowns", ""]
    for lead in ("l1", "l4"):
        L += md_breakdown("Temperature", R["temperature"], lead, "season")
    L += md_breakdown("Temperature", R["temperature"], "l1", "region")
    L += md_breakdown("Relative humidity", R["humidity"], "l1", "region")
    L += md_breakdown("Gusts", R["gust"], "l1", "season")
    (OUT / "scorecard.md").write_text("\n".join(L))
    print("wrote", OUT / "scorecard.md")


if __name__ == "__main__":
    main()
