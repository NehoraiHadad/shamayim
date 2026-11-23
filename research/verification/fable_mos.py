"""Location-free correction test ("MOS without a station"): regress the lead-1 blend error on forecast-side regime
features + static location features. Fit: train period (<2025-11-01) AND stations outside the fold.
Score: test period, held-out stations (5 station folds). So nothing of the scored station or period is seen."""
import json, numpy as np, pandas as pd
from fable_common import *
m = pd.read_parquet(f'{HERE}/data/processed/fable_regime_features.parquet')
m = m.dropna(subset=['e', 'rh', 'gust', 'dis', 'rev', 'f_anom', 'f_dtr', 'pr']).reset_index(drop=True)
coast = np.interp(m.lat, [29.5, 31.2, 31.6, 32.0, 32.5, 32.8, 33.1], [34.25, 34.25, 34.5, 34.75, 34.88, 34.98, 35.1])
m['dcoast'] = ((m.lon - coast) * 94).clip(0, 80)
night = ((m.lst >= 20) | (m.lst <= 6)).astype(float)
calm = np.clip((15 - m.gust) / 15, 0, 1)
dry = np.clip((80 - m.rh) / 60, 0, 1)
F = {
 'dis': m.dis, 'dis_abs': m.dis.abs(), 'rev': m.rev, 'rh': (m.rh - 60) / 20, 'gust': (m.gust - 20) / 15, 'anom': m.f_anom / 4,
 'dtr': (m.f_dtr - 10) / 4, 'wet': (m.pr > 0).astype(float), 'calm': calm, 'calm_dry': calm * dry, 'tf': (m.t_d1_bl - 20) / 8,
}
S_ = {'elev': m.elev / 500, 'dcoast': m.dcoast / 30, 'lat': m.lat - 31.8, 'coastal': (m.dcoast < 8).astype(float), 'low': (m.elev < -100).astype(float)}
def design(names_f, names_s, inter=()):
    cols = [np.ones(len(m))] + [F[k].values for k in names_f] + [S_[k].values for k in names_s]
    cols += [F[a].values * S_[b].values for a, b in inter]
    return np.column_stack(cols).astype('float64')
sets = {
 'A hod x season table only (national)': ([], [], ()),
 'B + model disagreement & revision': (['dis', 'rev'], [], ()),
 'C + all forecast regime features': (list(F), [], ()),
 'D + static location (elev, coast dist, lat)': (list(F), list(S_), ()),
 'E + regime x location interactions': (list(F), list(S_), [('calm', 'elev'), ('calm', 'dcoast'), ('calm_dry', 'elev'), ('calm_dry', 'low'), ('rh', 'coastal'), ('gust', 'coastal'), ('dtr', 'elev'), ('dtr', 'dcoast'), ('dis', 'coastal'), ('dis', 'elev'), ('calm', 'coastal'), ('tf', 'coastal'), ('tf', 'elev')]),
 'F location only (no regime features)': ([], list(S_), ()),
}
sids = np.sort(m.station_id.unique()); rng = np.random.default_rng(7); perm = rng.permutation(sids)
fold = pd.Series(np.arange(len(perm)) % 5, index=perm); fo = m.station_id.map(fold).values
tr = (m.time < SPLIT).values; te = ~tr
cellid = (m.hod.values * 4 + m.sea.values)
y = m.e.values.astype('float64')
res = {}; preds = {}
for name, (nf, ns, inter) in sets.items():
    X = design(nf, ns, inter); p = np.full(len(m), np.nan)
    for k in range(5):
        for c in range(96):       # one small ridge regression per hour-of-day x season cell
            rows = cellid == c
            a = rows & tr & (fo != k); b = rows & te & (fo == k)
            if b.sum() == 0: continue
            Xa = X[a]; G = Xa.T @ Xa + 50.0 * np.eye(X.shape[1]); G[0, 0] -= 50.0
            beta = np.linalg.solve(G, Xa.T @ y[a]); p[b] = X[b] @ beta
    preds[name] = p
    e2 = y[te] - p[te]
    ps = pd.DataFrame(dict(s=m.station_id.values[te], raw=np.abs(y[te]), new=np.abs(e2))).groupby('s').mean()
    res[name] = dict(mae=float(np.abs(e2).mean()), bias=float(e2.mean()), p_over3=float((np.abs(e2) > 3).mean() * 100), stations_improved=int((ps.new < ps.raw).sum()), stations=len(ps),
                     mae_station_mean=float(ps.new.mean()), worst_station_delta=float((ps.new - ps.raw).max()))
    print(name, {k: round(v, 3) for k, v in res[name].items()})
res['raw'] = dict(mae=float(np.abs(y[te]).mean()), bias=float(y[te].mean()), p_over3=float((np.abs(y[te]) > 3).mean() * 100))
print('raw', res['raw'])
# day/night split of the best
dn = m.dn.values[te]
for nm in ('A hod x season table only (national)', 'E + regime x location interactions'):
    for d in ('day', 'night', 'trans'):
        k = dn == d
        print(nm[:1], d, 'raw', round(np.abs(y[te][k]).mean(), 3), '->', round(np.abs(y[te][k] - preds[nm][te][k]).mean(), 3))
        res[f'{nm[:1]}_{d}'] = dict(raw=float(np.abs(y[te][k]).mean()), new=float(np.abs(y[te][k] - preds[nm][te][k]).mean()))
# --- optimal global ICON weight per lead (fit on train, score on test), raw and after per-model national table
mm = load(); mm = mm[mm.td.notna()]
mm['sea'] = (mm.mon % 12) // 3
wres = []
for L in LEADS:
    d = mm.dropna(subset=[f't_d{L}_icon', f't_d{L}_ec'])
    trn, tst = d[d.time < SPLIT], d[d.time >= SPLIT]
    ws = np.linspace(0, 1, 21)
    f = lambda dd, w: np.abs(w * dd[f't_d{L}_icon'] + (1 - w) * dd[f't_d{L}_ec'] - dd.td).mean()
    wb = ws[int(np.argmin([f(trn, w) for w in ws]))]
    wres.append(dict(lead=L, w_app=0.6 if L < 5 else 0.4, mae_app=float(f(tst, 0.6 if L < 5 else 0.4)), w_best_train=float(wb), mae_best=float(f(tst, wb)),
                     mae_icon=float(f(tst, 1)), mae_ec=float(f(tst, 0)), mae_w05=float(f(tst, .5)), mae_w08=float(f(tst, .8))))
print(pd.DataFrame(wres).round(3).to_string()); res['blend_weights'] = wres
json.dump(res, open(f'{HERE}/results/fable_mos.json', 'w'), indent=1)
