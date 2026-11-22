"""Relative humidity: Open-Meteo past forecasts (pass2) against IMS stations. Same split and methods as verify_temp.py:
bias/MAE by model, lead (0, 1), region and hour; best ICON weight; national season x hour correction scored
leave-one-station-out on the test year. Writes results/rh_summary.json."""
import gzip, json, sys
from pathlib import Path
import numpy as np, pandas as pd
sys.argv = ["x"]
import verify_temp as v

def load_pass2():
    frames = []
    for f in sorted((v.HERE / "om-archive" / "pass2").glob("*.json.gz")):
        h = json.loads(gzip.open(f).read())["hourly"]
        df = pd.DataFrame({"time": pd.to_datetime(h["time"]), "station_id": int(f.name.split("_")[0])})
        for m, mk in v.MODELS.items():
            for l, var in (("l0", "relative_humidity_2m"), ("l1", "relative_humidity_2m_previous_day1")):
                df[f"{m}_{l}"] = pd.array(h.get(f"{var}_{mk}", [None] * len(df)), dtype="Float64").astype(float)
        frames.append(df)
    return pd.concat(frames, ignore_index=True)

def main():
    fc = load_pass2()
    _, meta = v.load_forecasts()
    obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "rh"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"]).dropna(subset=["rh"]).merge(meta[["station_id", "region"]], on="station_id")
    loc = df.time + pd.Timedelta(hours=2)
    df["hour"], df["season"] = loc.dt.hour, loc.dt.month.map(v.SEASON)
    res = {"stations": int(df.station_id.nunique()), "rows": int(len(df)), "period": [str(df.time.min()), str(df.time.max())]}
    print(res)
    for l in ("l0", "l1"):
        i, e = df[f"icon_{l}"], df[f"ecmwf_{l}"]
        ok = i.notna() & e.notna()
        d = df[ok]
        r = {}
        for name, f in (("icon", d[f"icon_{l}"]), ("ecmwf", d[f"ecmwf_{l}"]), ("blend06", 0.6 * d[f"icon_{l}"] + 0.4 * d[f"ecmwf_{l}"])):
            r[name] = v.stats(f - d.rh)
        tr = d.time < v.SPLIT
        ws = np.linspace(0, 1, 11)
        maes = [float(((w * d[f"icon_{l}"] + (1 - w) * d[f"ecmwf_{l}"] - d.rh)[tr]).abs().mean()) for w in ws]
        wb = float(ws[int(np.argmin(maes))])
        f_new = wb * d[f"icon_{l}"] + (1 - wb) * d[f"ecmwf_{l}"]
        err = (f_new - d.rh).rename("e")
        r["best_weight_train"] = wb
        r["test_blend06"] = v.stats((0.6 * d[f"icon_{l}"] + 0.4 * d[f"ecmwf_{l}"] - d.rh)[~tr])
        r["test_bestweight"] = v.stats(err[~tr])
        # national season x hour table, leave-one-station-out
        dd = d.assign(e=err)
        trd, ted = dd[tr], dd[~tr]
        sums = trd.groupby(["station_id", "season", "hour"]).e.agg(["sum", "count"])
        tot = sums.groupby(level=[1, 2]).sum()
        corr = []
        for s, g in ted.groupby("station_id"):
            t = tot.sub(sums.loc[s], fill_value=0) if s in sums.index.get_level_values(0) else tot
            b = (t["sum"] / t["count"]).rename("b")
            x = g.join(b, on=["season", "hour"])
            corr.append(x.e - x.b.fillna(0))
        r["test_bestweight_plus_national_table"] = v.stats(pd.concat(corr))
        # own-station table (upper bound with a station)
        own = trd.groupby(["station_id", "season", "hour"]).e.mean().rename("b")
        x = ted.join(own, on=["station_id", "season", "hour"])
        r["test_own_station_table"] = v.stats(x.e - x.b.fillna(0))
        r["by_region_bias"] = {k: round(float(g.e.mean()), 1) for k, g in dd.groupby("region")}
        r["by_hour_bias"] = {int(k): round(float(g.e.mean()), 1) for k, g in dd.groupby("hour")}
        res[l] = r
        print(l, {k: (x["mae"], x["bias"]) if isinstance(x, dict) and "mae" in x else x for k, x in r.items() if not k.startswith("by_")})
        print("  regions", r["by_region_bias"]); print("  hours", r["by_hour_bias"])
    json.dump(res, open(v.OUT / "rh_summary.json", "w"), ensure_ascii=False, indent=1)

main()
