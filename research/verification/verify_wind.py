"""Wind speed and gusts: Open-Meteo past forecasts against IMS stations (same split as verify_temp.py).

Forecast (km/h): wind_speed_10m l0/l1/l2 (pass3), wind_gusts_10m l0/l1 (pass2); instantaneous wind at the hour and the
hour's maximum gust. Observed: IMS ws_at_hour (10-min mean ending at the hour, m/s) and ws_gust (max of WSmax over the
hour ending at it, m/s), converted to km/h.
Measures bias/MAE by model, the best ICON weight, national corrections (additive season x hour table, and a scale
factor), scored leave-one-station-out on the test year, plus strong-gust detection and the daily maximum gust.
Writes results/wind_summary.json.
"""
import gzip
import json
import sys

import numpy as np
import pandas as pd

sys.argv = ["x"]
import verify_temp as v

KMH = 3.6
VARS = {  # name -> (pass, {lead: column})
    "wind": ("pass3", {"l0": "wind_speed_10m", "l1": "wind_speed_10m_previous_day1", "l2": "wind_speed_10m_previous_day2"}),
    "gust": ("pass2", {"l0": "wind_gusts_10m", "l1": "wind_gusts_10m_previous_day1"}),
}
OBS = {"wind": "ws_at_hour", "gust": "ws_gust"}


def load(var):
    p, leads = VARS[var]
    frames = []
    for f in sorted((v.HERE / "om-archive" / p).glob("*.json.gz")):
        h = json.loads(gzip.open(f).read())["hourly"]
        df = pd.DataFrame({"time": pd.to_datetime(h["time"]), "station_id": int(f.name.split("_")[0])})
        for m, mk in v.MODELS.items():
            for l, col in leads.items():
                df[f"{m}_{l}"] = pd.array(h.get(f"{col}_{mk}", [None] * len(df)), dtype="Float64").astype(float)
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def loso_table(tr, te, col, keys):
    sums = tr.groupby(["station_id"] + keys)[col].agg(["sum", "count"])
    tot = sums.groupby(level=list(range(1, len(keys) + 1))).sum()
    out = []
    for s, g in te.groupby("station_id"):
        t = tot.sub(sums.loc[s], fill_value=0) if s in sums.index.get_level_values(0) else tot
        b = (t["sum"] / t["count"]).rename("b")
        out.append(g.join(b, on=keys)["b"])
    return pd.concat(out).reindex(te.index)


def loso_scale(tr, te, f, o):
    """Per held-out station: sum(obs)/sum(fc) over the other stations' training hours."""
    s = tr.groupby("station_id").agg(o=(o, "sum"), f=(f, "sum"))
    O, F = s.o.sum(), s.f.sum()
    k = ((O - s.o) / (F - s.f)).rename("k")
    return te.join(k, on="station_id")["k"].fillna(O / F)


def main():
    _, meta = v.load_forecasts()
    obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "ws_at_hour", "ws_gust"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    res = {}
    for var, (p, leads) in VARS.items():
        fc = load(var)
        df = fc.merge(obs[["time", "station_id", OBS[var]]], on=["station_id", "time"]).dropna(subset=[OBS[var]])
        df["o"] = df[OBS[var]] * KMH
        df = df.merge(meta[["station_id", "region"]], on="station_id")
        loc = df.time + pd.Timedelta(hours=2)
        df["hour"], df["season"] = loc.dt.hour, loc.dt.month.map(v.SEASON)
        df["day"] = loc.dt.normalize()
        r = {"stations": int(df.station_id.nunique()), "rows": int(len(df)), "obs_mean": round(float(df.o.mean()), 2)}
        for l in leads:
            icon_only = df[f"ecmwf_{l}"].isna().all()  # Open-Meteo keeps no ECMWF previous-day gusts
            if icon_only:
                df[f"ecmwf_{l}"] = df[f"icon_{l}"]
            d = df.dropna(subset=[f"icon_{l}", f"ecmwf_{l}"]).copy()
            tr, te = d[d.time < v.SPLIT], d[d.time >= v.SPLIT].copy()
            rr = {"icon_only": bool(icon_only)}
            for name in ("icon", "ecmwf"):
                rr[name] = v.stats(d[f"{name}_{l}"] - d.o)
                rr[name]["mean_fc"] = round(float(d[f"{name}_{l}"].mean()), 2)
            ws = np.linspace(0, 1, 11)
            maes = [float((w * tr[f"icon_{l}"] + (1 - w) * tr[f"ecmwf_{l}"] - tr.o).abs().mean()) for w in ws]
            wb = float(ws[int(np.argmin(maes))])
            rr["best_icon_weight_train"] = wb
            te["app"] = 0.6 * te[f"icon_{l}"] + 0.4 * te[f"ecmwf_{l}"]
            te["best"] = wb * te[f"icon_{l}"] + (1 - wb) * te[f"ecmwf_{l}"]
            tr = tr.assign(best=wb * tr[f"icon_{l}"] + (1 - wb) * tr[f"ecmwf_{l}"])
            rr["test_app_blend"] = v.stats(te.app - te.o)
            rr["test_best_weight"] = v.stats(te.best - te.o)
            # national additive season x hour table (leave-one-station-out)
            tr["e"] = tr.best - tr.o
            b = loso_table(tr, te, "e", ["season", "hour"])
            rr["test_best_plus_table"] = v.stats(te.best - b.fillna(0) - te.o)
            # national scale factor (multiplicative), and scale by season x hour
            k = loso_scale(tr, te, "best", "o")
            rr["scale_mean"] = round(float(k.mean()), 3)
            rr["test_best_scaled"] = v.stats(te.best * k - te.o)
            # own-station table (with a station)
            own = tr.groupby(["station_id", "season", "hour"]).e.mean().rename("b")
            x = te.join(own, on=["station_id", "season", "hour"])
            rr["test_own_station_table"] = v.stats(x.best - x.b.fillna(0) - x.o)
            rr["by_region_bias_app"] = {k_: round(float((g.app - g.o).mean()), 1) for k_, g in te.groupby("region")}
            rr["by_hour_bias_app"] = {int(k_): round(float((g.app - g.o).mean()), 1) for k_, g in te.groupby("hour")}
            if var == "gust":
                # Strong gusts: detection of observed >= 50 km/h by forecast >= T, per model.
                det = {}
                for name, f in (("icon", te[f"icon_{l}"]), ("ecmwf", te[f"ecmwf_{l}"]), ("app", te.app)):
                    obs_hi = te.o >= 50
                    for T in (40, 50, 60):
                        fc_hi = f >= T
                        hits = int((obs_hi & fc_hi).sum())
                        det[f"{name}_fc>={T}"] = {"POD": round(hits / max(1, int(obs_hi.sum())), 3),
                                                  "FAR": round(1 - hits / max(1, int(fc_hi.sum())), 3),
                                                  "fc_events": int(fc_hi.sum())}
                det["observed_events"] = int((te.o >= 50).sum())
                rr["strong_gusts_test"] = det
                # Daily maximum gust (the app's 7-day view): local day, full days only.
                dm = te.groupby(["station_id", "day"]).agg(o=("o", "max"), app=("app", "max"), best=("best", "max"),
                                                           icon=(f"icon_{l}", "max"), ecmwf=(f"ecmwf_{l}", "max"),
                                                           n=("o", "count"))
                dm = dm[dm.n >= 22]
                rr["daily_max_test"] = {c: v.stats(dm[c] - dm.o) for c in ("app", "best", "icon", "ecmwf")}
            r[l] = rr
            print(var, l, "| icon", rr["icon"]["mae"], rr["icon"]["bias"], "| ecmwf", rr["ecmwf"]["mae"], rr["ecmwf"]["bias"],
                  "| w", wb, "| test app", rr["test_app_blend"]["mae"], "best", rr["test_best_weight"]["mae"],
                  "+table", rr["test_best_plus_table"]["mae"], "scaled", rr["test_best_scaled"]["mae"], f"(k {rr['scale_mean']})",
                  "own", rr["test_own_station_table"]["mae"])
        res[var] = r
    json.dump(res, open(v.OUT / "wind_summary.json", "w"), ensure_ascii=False, indent=1)
    g = res["gust"]["l1"]
    print("strong gusts l1:", json.dumps(g["strong_gusts_test"]))
    print("daily max gust l1:", {k: (x["mae"], x["bias"]) for k, x in g["daily_max_test"].items()})
    print("wind l1 by region:", res["wind"]["l1"]["by_region_bias_app"])
    print("gust l1 by region:", g["by_region_bias_app"])
    print("wind l1 by hour:", res["wind"]["l1"]["by_hour_bias_app"])


if __name__ == "__main__":
    main()
