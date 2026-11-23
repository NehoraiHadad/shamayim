"""Task 3: does the *current* forecast error (forecast - obs now) predict the error 1..24 h ahead,
at the same station and when borrowed from other stations at various distances?

Issue-time handling. The archive has no per-run series. `d0` (temperature_2m_<model>) is stitched from the first
hours of successive runs, so d0(t0+h) for h beyond the run cadence comes from a run issued AFTER t0 (not available
at t0, and already influenced by later observations). `d1` (previous_day1) is the same stitching one day older:
every d1 value for t0..t0+24h was issued before t0, and neighbouring hours come from the same or adjacent runs, so
d1 is an honest (slightly pessimistic: lead 24-48 h instead of 0-24 h) stand-in for "the run the app holds now".
Both are reported; d1 is the one to trust for h > 3.

Fitted on < 2025-11-01, scored on >= 2025-11-01. Blend = app blend (0.6 ICON / 0.4 ECMWF).
"""
import json, sys, numpy as np, pandas as pd
from fable_common import *
m = load(); mt = meta()
HS = [1, 2, 3, 6, 9, 12, 18, 24]
times = pd.date_range(m.time.min(), m.time.max(), freq='h')
out = {}
def wide(col):
    w = m.assign(e=m[col] - m.td).pivot(index='time', columns='station_id', values='e').reindex(times)
    return w
for src in ('d1', 'd0'):
    W = wide(f't_{src}_bl')
    # stations with enough data both sides
    tr_mask = (times < SPLIT)
    good = [s for s in W.columns if W[s][tr_mask].notna().sum() > 4000 and W[s][~tr_mask].notna().sum() > 2000]
    W = W[good]; sids = np.array(good); S = len(sids)
    E = W.values.astype('float64'); T = len(times)
    hod = times.hour.values; sea = ((times.month.values % 12) // 3)
    cell = hod * 4 + sea
    # climatological bias per station x hod x season (train only)
    B = np.full((96, S), np.nan)
    for c in range(96):
        B[c] = np.nanmean(E[tr_mask & (cell == c)], axis=0)
    Bown = B[cell]                                   # T x S
    Bloso = ((np.nansum(B, axis=1, keepdims=True) - B) / (S - 1))[cell]   # mean of other stations' tables
    A = E - Bown                                     # anomaly from own climatological bias
    mtx = mt.set_index('station_id').loc[sids]
    D = dist_km(mtx.lat.values[:, None], mtx.lon.values[:, None], mtx.lat.values[None, :], mtx.lon.values[None, :])
    np.fill_diagonal(D, np.inf)
    order = np.argsort(D, axis=1)
    te = ~tr_mask
    def mae(x, mask=None):
        return float(np.nanmean(np.abs(x[te] if mask is None else x[te & mask])))
    def slope(x, y):   # no-intercept LS on train rows
        ok = np.isfinite(x) & np.isfinite(y); ok[te] = False
        return float((x[ok] * y[ok]).sum() / (x[ok] ** 2).sum())
    def shift(X, h):   # value at t+h aligned to row t
        Y = np.full_like(X, np.nan); Y[:-h] = X[h:]; return Y
    res = []
    # IDW of k nearest anomalies / raw errors at t0
    def knn(X, k):
        num = np.zeros_like(X); den = np.zeros_like(X)
        for j in range(k):
            idx = order[:, j]; w = 1.0 / (D[np.arange(S), idx] + 5.0)
            v = X[:, idx]; okv = np.isfinite(v)
            num += np.where(okv, v * w, 0); den += np.where(okv, w, 0)
        return np.where(den > 0, num / np.where(den > 0, den, 1), np.nan)
    A_nn1, A_nn3, A_nn5 = knn(A, 1), knn(A, 3), knn(A, 5)
    E_nn1 = knn(E, 1); E_nn3 = knn(E, 3)
    for h in HS:
        Eh, Ah = shift(E, h), shift(A, h)
        Bown_h, Bloso_h = shift(Bown, h), shift(Bloso, h)
        valid = np.isfinite(Eh) & np.isfinite(E) & np.isfinite(A_nn3) & np.isfinite(A_nn1)
        def M(x):
            return float(np.nanmean(np.abs(np.where(valid, x, np.nan)[te])))
        r = dict(src=src, h=h, n=int(valid[te].sum()))
        r['raw'] = M(Eh)
        # --- station WITH own history
        r['own_clim'] = M(Ah)
        a = slope(E, Eh); r['own_live_raw'] = M(Eh - a * E); r['a_own_raw'] = a
        a = slope(A, Ah); r['own_clim+live'] = M(Ah - a * A); r['a_own_anom'] = a
        # --- place WITHOUT a station (leave-one-out): no own table, no own obs
        Lh = Eh - Bloso_h                               # after national (other-stations) climatological table
        r['loso_clim'] = M(Lh)
        for nm, X in (('nn1', A_nn1), ('nn3', A_nn3), ('nn5', A_nn5)):
            a = slope(X, Lh); r[f'loso_clim+live_{nm}'] = M(Lh - a * X); r[f'a_{nm}'] = a
        a = slope(E_nn1, Eh); r['live_rawerr_nn1_only'] = M(Eh - a * E_nn1)
        a = slope(E_nn3, Eh); r['live_rawerr_nn3_only'] = M(Eh - a * E_nn3)
        a = slope(A_nn3, Eh); r['live_anom_nn3_only'] = M(Eh - a * A_nn3)
        # hour-of-day dependent slope (24 slopes) for nn3
        P = np.full_like(Lh, np.nan)
        for hh in range(24):
            rows = hod == hh
            x, y = A_nn3[rows], Lh[rows]; ok = np.isfinite(x) & np.isfinite(y) & ~te[rows][:, None]
            ah = (x[ok] * y[ok]).sum() / (x[ok] ** 2).sum()
            P[rows] = ah * A_nn3[rows]
        r['loso_clim+live_nn3_hodslope'] = M(Lh - P)
        res.append(r)
    df = pd.DataFrame(res)
    pd.set_option('display.width', 250)
    print(src, 'stations', S)
    print(df.drop(columns=['src']).round(3).T.to_string())
    out[src] = res
    # --- by distance: borrow anomaly from the j-th nearest station, bin by distance
    bins = [0, 5, 10, 20, 40, 80, 160, 500]
    rows = []
    ranks = [0, 1, 2, 4, 7, 12, 20, 35, 60]
    for h in (1, 3, 6, 12, 24):
        Eh = shift(E, h); Lh = Eh - shift(Bloso, h); Ah = shift(A, h)
        acc = {}
        for j in ranks:
            idx = order[:, j]; d = D[np.arange(S), idx]
            X = A[:, idx]
            b = np.digitize(d, bins) - 1
            for bi in np.unique(b):
                cols = b == bi
                x, y = X[:, cols], Lh[:, cols]; ya = Ah[:, cols]
                ok = np.isfinite(x) & np.isfinite(y)
                a_ = acc.setdefault(int(bi), dict(sxy=0., sxx=0., xs=[], ys=[], yas=[], n_pairs=0))
                oktr = ok & tr_mask[:, None]
                a_['sxy'] += (x[oktr] * y[oktr]).sum(); a_['sxx'] += (x[oktr] ** 2).sum()
                okte = ok & te[:, None]
                a_['xs'].append(x[okte]); a_['ys'].append(y[okte]); a_['yas'].append(ya[okte]); a_['n_pairs'] += int(cols.sum())
        for bi, a_ in sorted(acc.items()):
            x, y, ya = np.concatenate(a_['xs']), np.concatenate(a_['ys']), np.concatenate(a_['yas'])
            a = a_['sxy'] / a_['sxx']
            okc = np.isfinite(ya)
            rows.append(dict(h=h, km=f'{bins[bi]}-{bins[bi+1]}', pairs=a_['n_pairs'], n=len(x), slope=a,
                             corr_anom=float(np.corrcoef(x[okc], ya[okc])[0, 1]),
                             mae_loso_clim=float(np.abs(y).mean()), mae_with_live=float(np.abs(y - a * x).mean())))
    dd = pd.DataFrame(rows); dd['gain_pct'] = 100 * (1 - dd.mae_with_live / dd.mae_loso_clim)
    print(dd.round(3).to_string())
    out[src + '_by_distance'] = dd.to_dict('records')
    # same-time correlation of anomalies between stations (h=0) by distance
    if src == 'd1':
        rows = []
        for j in ranks:
            idx = order[:, j]; d = D[np.arange(S), idx]
            for s in range(S):
                x, y = A[te, s], A[te, idx[s]]; ok = np.isfinite(x) & np.isfinite(y)
                if ok.sum() > 500:
                    rows.append((d[s], np.corrcoef(x[ok], y[ok])[0, 1]))
        cc = pd.DataFrame(rows, columns=['km', 'r']); cc['bin'] = pd.cut(cc.km, bins)
        t = cc.groupby('bin', observed=True).r.agg(['size', 'mean', 'median']).round(3)
        print('same-hour anomaly correlation between stations\n', t)
        out['same_hour_anom_corr_by_km'] = t.reset_index().astype({'bin': str}).to_dict('records')
json.dump(out, open(f'{HERE}/results/fable_live.json', 'w'), indent=1)
