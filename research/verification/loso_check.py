"""Leave-one-station-out: does a correction learned on OTHER stations help a station it never saw?
Tests national and regional bias tables (season x local hour [x lead]), fitted on train years, scored on the test year."""
import sys, json
import numpy as np, pandas as pd
sys.argv = ["x"]
import verify_temp as v

fc, meta = v.load_forecasts()
obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "td"])
obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
df = fc.merge(obs, on=["station_id", "time"]).dropna(subset=["td"]).merge(meta[["station_id", "region"]], on="station_id")
loc = df.time + pd.Timedelta(hours=2)
df["hour_local"], df["season"] = loc.dt.hour, loc.dt.month.map(v.SEASON)
out = {}
for l in v.LEADS:
    df["e"] = v.blend(df, l) - df.td
    tr, te = df[df.time < v.SPLIT], df[df.time >= v.SPLIT]
    keys = ["season", "hour_local"]
    # Sums/counts so each held-out station can be subtracted cheaply.
    def tab(by):
        return tr.groupby(by)["e"].agg(["sum", "count"])
    nat, natst = tab(keys), tab(["station_id"] + keys)
    reg, regst = tab(["region"] + keys), natst
    r_nat, r_reg, raw = [], [], []
    for sid, g in te.groupby("station_id"):
        rg = g.region.iloc[0]
        mine = natst.loc[sid] if sid in natst.index.get_level_values(0) else None
        n = nat.copy()
        r = reg.loc[rg].copy()
        if mine is not None:
            n = n.sub(mine, fill_value=0); r = r.sub(mine, fill_value=0)
        bn = (n["sum"] / n["count"]).rename("bn"); br = (r["sum"] / r["count"].where(r["count"] > 200)).rename("br")
        x = g.join(bn, on=keys).join(br, on=keys)
        raw.append(x.e.abs().mean()); r_nat.append((x.e - x.bn.fillna(0)).abs().mean())
        r_reg.append((x.e - x.br.fillna(x.bn).fillna(0)).abs().mean())
    out[l] = {"raw": round(np.mean(raw), 3), "national_loso": round(np.mean(r_nat), 3), "regional_loso": round(np.mean(r_reg), 3)}
    print(l, out[l])
json.dump(out, open(v.OUT / "loso.json", "w"), indent=1)
