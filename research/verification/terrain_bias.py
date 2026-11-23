"""Can terrain explain the local, non-transferable part of the forecast bias?

For each lead, every station's bias in each season x local-hour cell is learned on the training years. A model maps
terrain features (terrain_features.py) to that bias and is applied to a station it never saw (leave-one-station-out),
on the test year. Compared with the national hour x season table (the current best for a place without a station).
Models: per-cell ridge regression on the features, and one gradient-boosted model over (features, hour, season).
The ridge strength is chosen on the training years only (LOSO error of the cell biases), never on the test year.
Writes results/terrain_bias.json.
"""
import json
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold

sys.argv = ["x"]
import verify_temp as v

FEATS = ["z", "tpi_1", "tpi_3", "tpi_10", "above_min3", "dz_cell7", "dz_cell25", "sea10", "sea25", "coast_km", "slope1"]
ALPHAS = [3, 10, 30, 100, 300]


def ridge_loso(X, y, w, alpha):
    """Leave-one-out predictions of a weighted ridge fit (intercept unpenalised), one row at a time."""
    n = len(y)
    pred = np.empty(n)
    for i in range(n):
        m = np.ones(n, bool)
        m[i] = False
        Xm, ym, wm = X[m], y[m], w[m]
        mu = np.average(ym, weights=wm)
        A = (Xm * wm[:, None]).T @ Xm + alpha * np.eye(X.shape[1])
        beta = np.linalg.solve(A, (Xm * wm[:, None]).T @ (ym - mu))
        pred[i] = mu + X[i] @ beta
    return pred


def main():
    terr = pd.read_csv(v.HERE / "data" / "processed" / "terrain_features.csv")
    fc, meta = v.load_forecasts()
    obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "td"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"]).dropna(subset=["td"])
    loc = df.time + pd.Timedelta(hours=2)
    df["hour_local"], df["season"] = loc.dt.hour, loc.dt.month.map(v.SEASON)
    st = sorted(set(df.station_id) & set(terr.station_id))
    T = terr.set_index("station_id").loc[st, FEATS]
    Xs = ((T - T.mean()) / T.std()).to_numpy()
    sidx = {s: i for i, s in enumerate(st)}
    out = {}
    for l in v.LEADS:
        df["e"] = v.blend(df, l) - df.td
        tr, te = df[df.time < v.SPLIT], df[df.time >= v.SPLIT]
        cell = tr.groupby(["station_id", "season", "hour_local"])["e"].agg(["mean", "count"]).reset_index()
        cell = cell[cell.station_id.isin(st)]
        res = {}
        # --- national LOSO table (baseline): cell mean over other stations, count-weighted.
        tot = cell.assign(s=cell["mean"] * cell["count"]).groupby(["season", "hour_local"])[["s", "count"]].sum()
        cell = cell.join(tot, on=["season", "hour_local"], rsuffix="_all")
        cell["nat"] = (cell["s"] - cell["mean"] * cell["count"]) / (cell["count_all"] - cell["count"])
        # --- ridge per cell; alpha chosen by LOSO error of the training cell biases.
        best = None
        for a in ALPHAS:
            preds = []
            for (se, h), g in cell.groupby(["season", "hour_local"]):
                X = Xs[[sidx[s] for s in g.station_id]]
                preds.append(pd.Series(ridge_loso(X, g["mean"].to_numpy(), np.sqrt(g["count"].to_numpy()), a), index=g.index))
            p = pd.concat(preds)
            rmse = float(np.sqrt(np.average((p - cell["mean"]) ** 2, weights=cell["count"])))
            res[f"train_cell_rmse_ridge_a{a}"] = round(rmse, 4)
            if best is None or rmse < best[0]:
                best = (rmse, a, p)
        res["train_cell_rmse_national"] = round(float(np.sqrt(np.average((cell["nat"] - cell["mean"]) ** 2, weights=cell["count"]))), 4)
        cell["ridge"] = best[2]
        res["alpha"] = best[1]
        # --- gradient boosting over all cells, station-grouped folds (predicts the cell bias of unseen stations).
        F = cell[["season", "hour_local"]].copy()
        F["season"] = F.season.map({"winter": 0, "spring": 1, "summer": 2, "autumn": 3})
        F[FEATS] = T.loc[cell.station_id].to_numpy()
        gb = np.empty(len(cell))
        for trn, tst in GroupKFold(n_splits=12).split(F, groups=cell.station_id):
            mdl = HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=300, min_samples_leaf=40,
                                                categorical_features=[0], random_state=0)
            mdl.fit(F.iloc[trn], cell["mean"].iloc[trn], sample_weight=np.sqrt(cell["count"].iloc[trn]))
            gb[tst] = mdl.predict(F.iloc[tst])
        cell["gbm"] = gb
        res["train_cell_rmse_gbm"] = round(float(np.sqrt(np.average((cell["gbm"] - cell["mean"]) ** 2, weights=cell["count"]))), 4)
        # --- score on the test year.
        t = te[te.station_id.isin(st)].merge(cell[["station_id", "season", "hour_local", "nat", "ridge", "gbm"]],
                                            on=["station_id", "season", "hour_local"], how="left")
        res["test_mae_raw"] = round(float(t.e.abs().mean()), 4)
        for k in ("nat", "ridge", "gbm"):
            res[f"test_mae_{k}"] = round(float((t.e - t[k].fillna(0)).abs().mean()), 4)
        per = t.groupby("station_id").apply(lambda g: pd.Series({k: (g.e - g[k].fillna(0)).abs().mean() for k in ("nat", "ridge", "gbm")}),
                                           include_groups=False)
        res["stations_better_ridge_vs_nat"] = int((per.ridge < per.nat).sum())
        res["stations_better_gbm_vs_nat"] = int((per.gbm < per.nat).sum())
        res["n_stations"] = len(per)
        out[l] = res
        print(l, {k: v_ for k, v_ in res.items() if k.startswith("test") or k.startswith("stations") or k in ("alpha",)})
    # Which features carry the signal (ridge, lead 1, all cells pooled): correlation of station mean bias with each feature.
    df["e"] = v.blend(df, "l1") - df.td
    sb = df[df.time < v.SPLIT].groupby("station_id")["e"].mean().reindex(st)
    night = df[(df.time < v.SPLIT) & df.hour_local.isin([2, 3, 4, 5])].groupby("station_id")["e"].mean().reindex(st)
    aft = df[(df.time < v.SPLIT) & df.hour_local.isin([14, 15, 16])].groupby("station_id")["e"].mean().reindex(st)
    out["feature_correlations_l1"] = {f: {"all": round(float(np.corrcoef(T[f], sb)[0, 1]), 2),
                                          "night": round(float(np.corrcoef(T[f], night)[0, 1]), 2),
                                          "afternoon": round(float(np.corrcoef(T[f], aft)[0, 1]), 2)} for f in FEATS}
    print(json.dumps(out["feature_correlations_l1"], indent=0))
    json.dump(out, open(v.OUT / "terrain_bias.json", "w"), indent=1)


if __name__ == "__main__":
    main()
