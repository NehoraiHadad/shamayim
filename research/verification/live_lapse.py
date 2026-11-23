"""Live correction for a place WITHOUT a station, from the whole IMS network's current errors.

At time t every station j has a current error anomaly a_j(t) = (forecast - observed) - its own climatological bias
(season x local hour, training years). For a held-out station i we estimate its anomaly from the others and use it to
correct its forecast at t+h (on top of the national hour x season table, the best static correction without a station):
  gauss20   Gaussian-weighted mean of the neighbours' anomalies (sigma 20 km)       <- Fable's method, for reference
  lapse     a(t) = c0 + c1*height, fitted over all stations at time t (the network's live lapse-rate error)
  lapse_tpi a(t) = c0 + c1*height + c2*tpi_3 (adds valley/ridge position: inversions pool in valleys)
  local     the same height+tpi regression, but Gaussian-weighted around the place (sigma 50 km)
  rk        lapse_tpi + Gaussian (20 km) mean of the neighbours' residuals from it  (regression kriging)
The forecast is the day-ahead run (previous_day1), so everything for t..t+h was issued before t (an honest stand-in).
The slope k_h (how much of the anomaly to apply h hours ahead) is fitted on the training years, scored on the test year.
Writes results/live_lapse.json.
"""
import json
import sys

import numpy as np
import pandas as pd

sys.argv = ["x"]
import verify_temp as v

H_AHEAD = [0, 1, 2, 3, 6, 12]


def main():
    terr = pd.read_csv(v.HERE / "data" / "processed" / "terrain_features.csv").set_index("station_id")
    fc, meta = v.load_forecasts()
    obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "td"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"]).dropna(subset=["td"])
    df["e"] = v.blend(df, "l1") - df.td
    df = df.dropna(subset=["e"])
    loc = df.time + pd.Timedelta(hours=2)
    df["hour_local"], df["season"] = loc.dt.hour, loc.dt.month.map(v.SEASON)
    st = sorted(set(df.station_id) & set(terr.index))
    df = df[df.station_id.isin(st)]
    tr = df[df.time < v.SPLIT]
    cell = tr.groupby(["station_id", "season", "hour_local"])["e"].agg(["mean", "count"]).reset_index()
    tot = cell.assign(s=cell["mean"] * cell["count"]).groupby(["season", "hour_local"])[["s", "count"]].sum()
    cell = cell.join(tot, on=["season", "hour_local"], rsuffix="_all")
    cell["nat"] = (cell["s"] - cell["mean"] * cell["count"]) / (cell["count_all"] - cell["count"])
    df = df.merge(cell[["station_id", "season", "hour_local", "mean", "nat"]], on=["station_id", "season", "hour_local"], how="left")
    df["anom"] = df.e - df["mean"]            # what a station knows about itself right now
    df["e_nat"] = df.e - df["nat"].fillna(0)  # the held-out place's error after the national table

    times = pd.date_range(df.time.min(), df.time.max(), freq="h")
    ti = pd.Index(times)
    S = len(st)
    sid = {s: k for k, s in enumerate(st)}
    A = np.full((len(times), S), np.nan)
    E = np.full((len(times), S), np.nan)
    r, c = ti.get_indexer(df.time), df.station_id.map(sid).to_numpy()
    A[r, c] = df.anom.to_numpy()
    E[r, c] = df.e_nat.to_numpy()

    T = terr.loc[st]
    lat, lon = T.lat.to_numpy(), T.lon.to_numpy()
    dk = np.hypot((lat[:, None] - lat[None]) * 111, (lon[:, None] - lon[None]) * 94)
    G20 = np.exp(-0.5 * (dk / 20) ** 2)
    G50 = np.exp(-0.5 * (dk / 50) ** 2)
    np.fill_diagonal(G20, 0)
    np.fill_diagonal(G50, 0)
    X1 = np.column_stack([np.ones(S), T.z / 1000])
    X2 = np.column_stack([np.ones(S), T.z / 1000, T.tpi_3 / 100])
    EYE0 = 1 - np.eye(S)  # leave the place itself out

    def wls_all(X, Wfull, a):
        """For every time and every held-out station i: weighted LS of a over the other stations, predicted at X[i]."""
        out = np.full(a.shape, np.nan)
        ok = ~np.isnan(a)
        av = np.where(ok, a, 0.0)
        for t in range(a.shape[0]):
            m = ok[t]
            if m.sum() < 12:
                continue
            W = Wfull * m[None, :]                                   # (i, j)
            XtWX = np.einsum("ij,jp,jq->ipq", W, X, X) + 1e-6 * np.eye(X.shape[1])
            XtWy = np.einsum("ij,jp,j->ip", W, X, av[t])
            beta = np.linalg.solve(XtWX, XtWy[..., None])[..., 0]
            out[t] = np.einsum("ip,ip->i", X, beta)
        return out

    def gauss_mean(Wfull, a):
        ok = ~np.isnan(a)
        av = np.where(ok, a, 0.0)
        num = av @ Wfull.T
        den = ok.astype(float) @ Wfull.T
        return np.where(den > 0.05, num / np.maximum(den, 1e-9), np.nan)

    est = {"gauss20": gauss_mean(G20, A)}
    print("fitting lapse..."); est["lapse"] = wls_all(X1, np.broadcast_to(EYE0, (S, S)), A)
    print("fitting lapse_tpi..."); est["lapse_tpi"] = wls_all(X2, np.broadcast_to(EYE0, (S, S)), A)
    print("fitting local..."); est["local"] = wls_all(X2, G50 + 1e-3 * EYE0, A)
    # Regression kriging: residuals of each station from the leave-itself-out lapse_tpi fit, Gaussian-averaged.
    resid = A - est["lapse_tpi"]
    est["rk"] = est["lapse_tpi"] + np.nan_to_num(gauss_mean(G20, resid))

    is_tr = times < v.SPLIT
    res = {"baseline_national_table_test_mae": round(float(np.nanmean(np.abs(E[~is_tr]))), 4)}
    for h in H_AHEAD:
        tgt = np.roll(E, -h, axis=0)
        if h:
            tgt[-h:] = np.nan
        row = {}
        for name, a in est.items():
            ok = ~np.isnan(a) & ~np.isnan(tgt)
            trm, tem = ok & is_tr[:, None], ok & ~is_tr[:, None]
            k = float(np.sum(a[trm] * tgt[trm]) / np.sum(a[trm] ** 2))
            base = np.abs(tgt[tem]).mean()
            corr = np.abs(tgt[tem] - k * a[tem]).mean()
            row[name] = {"k": round(k, 3), "test_mae": round(float(corr), 4), "base": round(float(base), 4),
                         "gain_pct": round(float((1 - corr / base) * 100), 2)}
        res[f"h{h}"] = row
        print(f"h={h}: " + "  ".join(f"{n} {r['gain_pct']:+.1f}% (k {r['k']})" for n, r in row.items()))
    # Night vs day at h=0/1 for the best two.
    hl = ((times + pd.Timedelta(hours=2)).hour).to_numpy()
    night = np.isin(hl, [22, 23, 0, 1, 2, 3, 4, 5])
    for h in (0, 1):
        tgt = np.roll(E, -h, axis=0)
        for part, msk in (("night", night), ("day", ~night)):
            for name in ("gauss20", "rk"):
                a = est[name]
                k = res[f"h{h}"][name]["k"]
                ok = ~np.isnan(a) & ~np.isnan(tgt) & (~is_tr & msk)[:, None]
                g = 1 - np.abs(tgt[ok] - k * a[ok]).mean() / np.abs(tgt[ok]).mean()
                res[f"h{h}"][name][f"gain_{part}_pct"] = round(float(g * 100), 2)
    json.dump(res, open(v.OUT / "live_lapse.json", "w"), indent=1)
    print(json.dumps({h: {n: (r["gain_pct"], r.get("gain_night_pct"), r.get("gain_day_pct")) for n, r in res[h].items()} for h in ("h0", "h1")}, indent=0))


if __name__ == "__main__":
    main()
