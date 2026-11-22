"""Temperature verification: Open-Meteo's past forecasts (om-archive/pass1) against IMS station observations.

Measures how icon_seamless, ecmwf_ifs025 and the app's blend err, by lead time, region, hour, season and weather, then
tests simple corrections on data they were not fitted on (train: until 2025-10-31, test: 2025-11-01 onward):
  1. bias by station x hour of day x season          ("where a station is, the model is off this much at this hour")
  2. 1 + per-station blend weights between the models
  3. bias borrowed from the nearest *other* stations  (what a place without a station would get)
Writes results/temp_summary.json and prints the tables. Usage: python3 verify_temp.py
"""
import gzip
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent
ARCH = HERE / "om-archive" / "pass1"
OBS = HERE / "data" / "processed" / "ims_hourly.parquet"
OUT = HERE / "results"
# "l0" is the archive's stitched latest-run series (first hours of each run): close to an analysis, not a forecast the
# app holds for later today. Read l1 (issued a day ahead) as the honest headline.
LEADS = {"l0": "temperature_2m", "l1": "temperature_2m_previous_day1", "l2": "temperature_2m_previous_day2",
         "l4": "temperature_2m_previous_day4", "l6": "temperature_2m_previous_day6"}
MODELS = {"icon": "icon_seamless", "ecmwf": "ecmwf_ifs025"}
SPLIT = pd.Timestamp("2025-11-01")
SEASON = {12: "winter", 1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
          6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn", 11: "autumn"}


def coast_lon(lat):
    # Israel's Mediterranean coastline, roughly, south to north.
    return float(np.interp(lat, [31.2, 31.6, 32.0, 32.5, 32.8, 33.1], [34.25, 34.5, 34.75, 34.88, 34.98, 35.1]))


def region(lat, lon, elev):
    if 31.0 < lat < 31.85 and lon > 35.3:
        return "ים המלח ומדבר יהודה"
    if elev < -100 and lon > 35.3:
        return "בקעת הירדן"
    if lat < 31.0 and elev < 350 and (lon > 35.0 or lat < 29.7):
        return "ערבה ואילת"
    if lat < 31.35:
        return "נגב"
    if lon - coast_lon(lat) < 0.12 and elev < 120:
        return "מישור החוף"
    if lat > 32.7 and lon > 35.65 and elev > 200:
        return "גולן וחרמון"
    if elev >= 450:
        return "הרים (ירושלים, שומרון, גליל)"
    return "שפלה, עמקים ופנים הארץ"


def load_forecasts():
    stations = {s["id"]: s for s in json.load(open(HERE / "om_stations.json"))}
    frames = []
    for f in sorted(ARCH.glob("*.json.gz")):
        sid = int(f.name.split("_")[0])
        d = json.loads(gzip.open(f).read())
        h = d["hourly"]
        df = pd.DataFrame({"time": pd.to_datetime(h["time"])})
        for m, mk in MODELS.items():
            for l, var in LEADS.items():
                df[f"{m}_{l}"] = pd.array(h.get(f"{var}_{mk}", [None] * len(df)), dtype="Float64").astype(float)
        df["station_id"] = sid
        stations[sid]["grid_elev"] = d.get("elevation")
        frames.append(df)
    fc = pd.concat(frames, ignore_index=True)
    meta = pd.DataFrame(stations.values()).rename(columns={"id": "station_id"})
    meta["region"] = [region(r.lat, r.lon, r.grid_elev if r.grid_elev is not None else 0) for r in meta.itertuples()]
    return fc, meta


def blend(df, lead):
    # The app: ICON weighted 0.6 for the first 5 days, ECMWF 0.6 after (README "Data").
    wi = 0.6 if lead in ("l0", "l1", "l2", "l4") else 0.4
    i, e = df[f"icon_{lead}"], df[f"ecmwf_{lead}"]
    out = wi * i + (1 - wi) * e
    return out.where(i.notna() & e.notna())


def stats(err):
    err = err.dropna()
    if len(err) == 0:
        return {"n": 0}
    return {"n": int(len(err)), "bias": round(float(err.mean()), 2), "mae": round(float(err.abs().mean()), 2),
            "rmse": round(float(math.sqrt((err ** 2).mean())), 2),
            "p_over2": round(float((err.abs() > 2).mean() * 100), 1),
            "p_over3": round(float((err.abs() > 3).mean() * 100), 1)}


def table(df, col, by):
    return {str(k): stats(g[col]) for k, g in df.groupby(by, observed=True)}


def main():
    OUT.mkdir(exist_ok=True)
    fc, meta = load_forecasts()
    obs = pd.read_parquet(OBS, columns=["time", "station_id", "td"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"], how="inner").dropna(subset=["td"])
    df = df.merge(meta[["station_id", "region", "lat", "lon", "grid_elev", "name"]], on="station_id")
    local = df["time"] + pd.Timedelta(hours=2)
    df["hour_local"] = local.dt.hour
    df["month"] = local.dt.month
    df["season"] = df["month"].map(SEASON)
    for l in LEADS:
        df[f"blend_{l}"] = blend(df, l)
        for m in ("icon", "ecmwf", "blend"):
            df[f"err_{m}_{l}"] = df[f"{m}_{l}"] - df["td"]
    print(f"{len(df):,} station-hours, {df.station_id.nunique()} stations, {df.time.min()} .. {df.time.max()}")

    res = {"period": [str(df.time.min()), str(df.time.max())], "stations": int(df.station_id.nunique()),
           "rows": int(len(df))}
    # 1. Overall by model and lead.
    res["overall"] = {f"{m}_{l}": stats(df[f"err_{m}_{l}"]) for l in LEADS for m in ("icon", "ecmwf", "blend")}
    # 2. By region / hour / season / station (blend, day-1 lead: what "tomorrow" looks like in the app).
    e = "err_blend_l1"
    res["by_region"] = table(df, e, "region")
    res["by_region_model"] = {m: table(df, f"err_{m}_l1", "region") for m in ("icon", "ecmwf")}
    res["by_hour"] = table(df, e, "hour_local")
    res["by_season"] = table(df, e, "season")
    res["by_region_hour"] = {r: table(g, e, "hour_local") for r, g in df.groupby("region")}
    st = {}
    for sid, g in df.groupby("station_id"):
        m = meta.set_index("station_id").loc[sid]
        st[int(sid)] = {"name": m["name"], "region": m["region"], "lat": m["lat"], "lon": m["lon"],
                        "grid_elev": m["grid_elev"], **stats(g[e]),
                        "icon": stats(g["err_icon_l1"]), "ecmwf": stats(g["err_ecmwf_l1"])}
    res["by_station"] = st
    # 3. Weather situations.
    # Selected on the forecast (what the app knows in advance), never on the observation: conditioning on the
    # outcome manufactures a bias (regression to the mean).
    hot = df["blend_l1"] >= 35
    cold = df["blend_l1"] <= 5
    pre_dawn = df["hour_local"].isin([2, 3, 4, 5, 6])
    res["situations"] = {"forecast hot (>=35°C)": stats(df.loc[hot, e]), "forecast cold (<=5°C)": stats(df.loc[cold, e]),
                         "pre-dawn 02-06": stats(df.loc[pre_dawn, e]),
                         "afternoon 13-16": stats(df.loc[df.hour_local.isin([13, 14, 15, 16]), e])}

    # 4. Corrections, fitted on train, scored on test.
    train, test = df[df.time < SPLIT], df[df.time >= SPLIT].copy()
    corr = {}
    for l in LEADS:
        # (a) bias per station x local hour x season, shrunk toward the station's overall bias when data is thin.
        col = f"err_blend_{l}"
        g = train.groupby(["station_id", "season", "hour_local"])[col].agg(["mean", "count"]).reset_index()
        sb = train.groupby("station_id")[col].mean().rename("st_mean")
        g = g.merge(sb, on="station_id")
        k = 30  # shrinkage strength (hours)
        g["b"] = (g["mean"] * g["count"] + g["st_mean"] * k) / (g["count"] + k)
        t = test.merge(g[["station_id", "season", "hour_local", "b"]], on=["station_id", "season", "hour_local"],
                       how="left")
        t["b"] = t["b"].fillna(0)
        corrected = t[col] - t["b"]
        # (b) per-station best blend weight (grid search) + the same hour/season bias on that blend.
        wbest = {}
        for sid, gg in train.groupby("station_id"):
            ok = gg[[f"icon_{l}", f"ecmwf_{l}"]].notna().all(axis=1)
            gg = gg[ok]
            if len(gg) < 500:
                continue
            ws = np.linspace(0, 1, 11)
            maes = [((w * gg[f"icon_{l}"] + (1 - w) * gg[f"ecmwf_{l}"]) - gg["td"]).abs().mean() for w in ws]
            wbest[sid] = float(ws[int(np.argmin(maes))])
        fallback = 0.6 if l != "l6" else 0.4
        tw = test["station_id"].map(wbest).fillna(fallback)
        test_w = tw * test[f"icon_{l}"] + (1 - tw) * test[f"ecmwf_{l}"]
        trw_w = train["station_id"].map(wbest).fillna(fallback)
        train_w_err = trw_w * train[f"icon_{l}"] + (1 - trw_w) * train[f"ecmwf_{l}"] - train["td"]
        tr2 = train.assign(e2=train_w_err)
        g2 = tr2.groupby(["station_id", "season", "hour_local"])["e2"].agg(["mean", "count"]).reset_index()
        g2 = g2.merge(tr2.groupby("station_id")["e2"].mean().rename("st_mean"), on="station_id")
        g2["b"] = (g2["mean"] * g2["count"] + g2["st_mean"] * k) / (g2["count"] + k)
        t2 = test.assign(e2=test_w - test["td"]).merge(g2[["station_id", "season", "hour_local", "b"]],
                                                        on=["station_id", "season", "hour_local"], how="left")
        both = t2["e2"] - t2["b"].fillna(0)
        # (c) no own station: borrow (a) from the 3 nearest other stations, weighted by distance and height similarity.
        pos = meta.set_index("station_id")
        borrowed = []
        for sid, gt in t.groupby("station_id"):
            me = pos.loc[sid]
            others = pos.drop(index=sid)
            others = others[others.index.isin(g.station_id.unique())]
            dk = np.hypot((others.lat - me.lat) * 111, (others.lon - me.lon) * 94)
            dz = (others.grid_elev - me.grid_elev).abs() / 100  # 100 m of height ~ 1 km of distance... x10 below
            score = dk + 10 * dz
            near = score.nsmallest(3)
            wts = 1 / (near + 5)
            gb = g[g.station_id.isin(near.index)].copy()
            gb["w"] = gb.station_id.map(wts)
            bb = gb.groupby(["season", "hour_local"]).apply(lambda x: np.average(x.b, weights=x.w),
                                                            include_groups=False).rename("bb").reset_index()
            x = gt.merge(bb, on=["season", "hour_local"], how="left")
            borrowed.append(x[col] - x["bb"].fillna(0))
        borrowed = pd.concat(borrowed)
        # (d) borrow from the single nearest other station, scored by how far it is.
        nearest_rows = []
        for sid, gt in t.groupby("station_id"):
            me = pos.loc[sid]
            others = pos.drop(index=sid)
            others = others[others.index.isin(g.station_id.unique())]
            dk = np.hypot((others.lat - me.lat) * 111, (others.lon - me.lon) * 94)
            nid = dk.idxmin()
            bb = g[g.station_id == nid][["season", "hour_local", "b"]].rename(columns={"b": "bn"})
            x = gt.merge(bb, on=["season", "hour_local"], how="left")
            nearest_rows.append({"station_id": int(sid), "km": float(dk.min()),
                                 "dz": float(abs(others.loc[nid].grid_elev - me.grid_elev)),
                                 "raw": float(x[col].abs().mean()),
                                 "own": float((x[col] - x["b"].fillna(0)).abs().mean()),
                                 "nearest": float((x[col] - x["bn"].fillna(0)).abs().mean())})
        nr = pd.DataFrame(nearest_rows)
        nr["bin"] = pd.cut(nr.km, [0, 5, 10, 20, 100], labels=["<5 km", "5-10 km", "10-20 km", ">20 km"])
        nearest_by_km = {str(b): {"stations": int(len(gg)), "raw": round(gg.raw.mean(), 2), "own": round(gg.own.mean(), 2),
                                  "nearest": round(gg.nearest.mean(), 2)} for b, gg in nr.groupby("bin", observed=True)}
        nr_same = nr[nr.dz < 100]
        nearest_by_km_same_height = {str(b): {"stations": int(len(gg)), "raw": round(gg.raw.mean(), 2),
                                              "nearest": round(gg.nearest.mean(), 2)}
                                     for b, gg in nr_same.groupby("bin", observed=True)}
        corr[l] = {"raw_blend": stats(test[col]), "icon": stats(test[f"err_icon_{l}"]),
                   "ecmwf": stats(test[f"err_ecmwf_{l}"]), "bias_corrected": stats(corrected),
                   "weights_plus_bias": stats(both), "borrowed_from_neighbours": stats(borrowed),
                   "nearest_by_km": nearest_by_km, "nearest_by_km_same_height": nearest_by_km_same_height}
        if l == "l1":
            t["corr_err"] = corrected
            res["test_by_region"] = {r: {"raw": stats(gg[col]), "corrected": stats(gg["corr_err"])}
                                     for r, gg in t.groupby("region")}
            res["test_by_station"] = {int(s): {"raw": stats(gg[col])["mae"], "corrected": stats(gg["corr_err"])["mae"]}
                                      for s, gg in t.groupby("station_id")}
            res["best_weights_l1"] = {int(k): v for k, v in wbest.items()}
    res["corrections_test"] = corr
    res["test_period"] = [str(SPLIT), str(df.time.max())]
    json.dump(res, open(OUT / "temp_summary.json", "w"), ensure_ascii=False, indent=1)

    print("\nOverall (test+train), MAE °C:")
    for l in LEADS:
        print(f"  {l}: " + "  ".join(f"{m}={res['overall'][f'{m}_{l}']['mae']} (bias {res['overall'][f'{m}_{l}']['bias']:+})"
                                    for m in ("icon", "ecmwf", "blend")))
    print("\nCorrections on the test year (MAE °C):")
    for l, c in corr.items():
        print(f"  {l}: " + "  ".join(f"{k}={v['mae']}" for k, v in c.items() if 'mae' in v))
    print("\nBorrow from nearest station (day 1):", corr["l1"]["nearest_by_km"])
    print("  ...same height (<100 m apart):", corr["l1"]["nearest_by_km_same_height"])
    print("\nBy region (blend, day 1):")
    for r, s in sorted(res["by_region"].items(), key=lambda x: -x[1]["mae"]):
        tr = res["test_by_region"].get(r, {})
        print(f"  {r}: bias {s['bias']:+} mae {s['mae']}  | test raw {tr.get('raw', {}).get('mae')} -> corrected {tr.get('corrected', {}).get('mae')}")
    print("\nBy hour (local), blend day 1 bias:", {h: s["bias"] for h, s in res["by_hour"].items()})
    print("Situations:", res["situations"])


if __name__ == "__main__":
    main()
