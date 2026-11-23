"""Task 3 addendum (d1 blend): h=0 nowcast transfer, Gaussian-kernel regional anomaly, day/night split, per-station spread."""
import json, numpy as np, pandas as pd
from fable_common import *
m = load(); mt = meta()
times = pd.date_range(m.time.min(), m.time.max(), freq='h')
W = m.assign(e=m.t_d1_bl - m.td).pivot(index='time', columns='station_id', values='e').reindex(times)
tr = times < SPLIT; te = ~tr
good = [s for s in W.columns if W[s][tr].notna().sum() > 4000 and W[s][te].notna().sum() > 2000]
W = W[good]; sids = np.array(good); S = len(sids); E = W.values.astype(float)
hod = times.hour.values; cell = hod * 4 + ((times.month.values % 12) // 3)
B = np.stack([np.nanmean(E[tr & (cell == c)], axis=0) for c in range(96)])
A = E - B[cell]; L = E - ((np.nansum(B, 1, keepdims=True) - B) / (S - 1))[cell]
mx = mt.set_index('station_id').loc[sids]
D = dist_km(mx.lat.values[:, None], mx.lon.values[:, None], mx.lat.values[None, :], mx.lon.values[None, :]); np.fill_diagonal(D, np.inf)
def kern(X, sig):
    Wt = np.exp(-0.5 * (D / sig) ** 2)              # S x S, zero on the diagonal
    ok = np.isfinite(X)
    num = np.where(ok, X, 0) @ Wt.T; den = ok.astype(float) @ Wt.T
    return np.where(den > 1e-3, num / np.maximum(den, 1e-9), np.nan), den
def shift(X, h):
    if h == 0: return X
    Y = np.full_like(X, np.nan); Y[:-h] = X[h:]; return Y
def slope(x, y, rows):
    ok = np.isfinite(x) & np.isfinite(y) & rows[:, None]
    return (x[ok] * y[ok]).sum() / (x[ok] ** 2).sum()
out = []
day = (hod >= 6) & (hod <= 14)     # 08-16 local standard
for sig in (10, 20, 40):
    K, den = kern(A, sig)
    for h in (0, 1, 2, 3, 6, 12):
        Lh = shift(L, h)
        a = slope(K, Lh, tr)
        P = a * K
        v = np.isfinite(Lh) & np.isfinite(K)
        base = np.where(v, np.abs(Lh), np.nan); new = np.where(v, np.abs(Lh - P), np.nan)
        r = dict(sigma_km=sig, h=h, slope=round(float(a), 3), loso_clim=float(np.nanmean(base[te])), with_live=float(np.nanmean(new[te])))
        r['gain_pct'] = 100 * (1 - r['with_live'] / r['loso_clim'])
        tday = shift(np.broadcast_to(day[:, None], E.shape).astype(float), h) > 0.5
        for nm, mk in (('day', tday), ('night', ~tday)):
            r[f'gain_pct_{nm}'] = 100 * (1 - np.nanmean(new[te][mk[te]]) / np.nanmean(base[te][mk[te]]))
        ps_b = np.nanmean(base[te], axis=0); ps_n = np.nanmean(new[te], axis=0)
        r['stations_improved'] = int((ps_n < ps_b).sum()); r['stations'] = S
        r['worst_station_change_pct'] = float((100 * (ps_n / ps_b - 1)).max()); r['best_station_change_pct'] = float((100 * (ps_n / ps_b - 1)).min())
        out.append(r)
df = pd.DataFrame(out); pd.set_option('display.width', 250); print(df.round(3).to_string())
# how much of the error variance is "shared" (regional) vs local? variance of kernel-mean anomaly vs station anomaly
K, _ = kern(A, 20)
print('var station anomaly', np.nanvar(A[te]), 'var regional(20km) anomaly', np.nanvar(K[te]), 'var raw err', np.nanvar(E[te]), 'var of station clim bias table', np.nanvar(B))
json.dump(dict(kernel=out, var_station_anom=float(np.nanvar(A[te])), var_regional_anom=float(np.nanvar(K[te])), var_raw=float(np.nanvar(E[te]))), open(f'{HERE}/results/fable_live2.json', 'w'), indent=1)
