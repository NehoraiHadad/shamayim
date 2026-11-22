"""Rain study, follow-ups to Q4 (what the app's own thresholds should be, given how the blend behaves):
 A. heavy-rain wording: which blended daily amount best signals an observed >= 10 mm / >= 20 mm day (the app's
    rain.heavyMm = 10, rain.floodMm = 20 are compared against the blended amount).  X tuned on training data with the
    station left out (best ETS, or frequency bias 1), scored on the test period; plus fixed X on both periods.
 B. wet hour: blended hourly amount >= X against an observed wet hour (>= 0.1 mm), exact hour and within +-1 h.
 C. reliability: what the gauge showed for each blended daily amount, by period.
 D. Jerusalem (stations 22, 23) day table, the earlier 3-station impression."""
import json, numpy as np, pandas as pd
from fable3_common import *
d = daily(); V = ['o'] + [f'{m}{L}' for m in 'ie' for L in (0, 1, 2)]
c = d.dropna(subset=V).reset_index(drop=True); tr, te = c[~c.test], c[c.test]
out = {'doc': __doc__}
def occ(w, ow):
    h = int((w & ow).sum()); m = int((~w & ow).sum()); fa = int((w & ~ow).sum())
    return dict(hits=h, miss=m, fa=fa, pod=round(h / max(h + m, 1), 3), far=round(fa / max(h + fa, 1), 3), fbias=round((h + fa) / max(h + m, 1), 3), ets=round(float(ets_arr(w, ow)), 3))
ser = lambda s, L: {'blend': 0.6 * s[f'i{L}'].values + 0.4 * s[f'e{L}'].values, 'max': np.maximum(s[f'i{L}'].values, s[f'e{L}'].values), 'ecmwf': s[f'e{L}'].values.astype(float)}
# ---- A
XS = {10.0: [4, 5, 6, 7, 8, 10], 20.0: [8, 10, 12, 14, 16, 20]}
A = {}
for L in (1, 2):
    for nm, sub in (('train', tr), ('test', te)):
        S = ser(sub, L); o = sub.o.values
        for to, xs in XS.items():
            for k in ('blend', 'max'):
                for X in xs: A[f'L{L} {nm} | obs>={to:g} | {k}>={X}'] = occ(S[k] >= X - EPS, o >= to - EPS)
    # leave-station-out tuned X
    for to, xs in XS.items():
        grid = np.arange(2, 25.5, 0.5)
        for crit in ('ets', 'fb1'):
            w_all, o_all, Xs = [], [], []
            for s in te.station_id.unique():
                a = tr[tr.station_id != s]; b = a[f'i{L}'].values * .6 + a[f'e{L}'].values * .4; ow = a.o.values >= to - EPS
                sc = [ets_arr(b >= X, ow) if crit == 'ets' else -abs(np.log(max((b >= X).sum(), 1) / ow.sum())) for X in grid]
                X = grid[int(np.nanargmax(sc))]; Xs.append(X)
                t_ = te[te.station_id == s]; w_all.append(t_[f'i{L}'].values * .6 + t_[f'e{L}'].values * .4 >= X); o_all.append(t_.o.values >= to - EPS)
            r = occ(np.concatenate(w_all), np.concatenate(o_all)); r['X_median'] = float(np.median(Xs)); r['X_range'] = [float(min(Xs)), float(max(Xs))]
            A[f'L{L} LSO train->test | obs>={to:g} | blend>=X tuned for {crit}'] = r
out['heavy_thresholds'] = A
T = pd.DataFrame(A).T; print(T[T.index.str.startswith('L1')].to_string())
# ---- C reliability by period
BINS = [-1, 0.1 - EPS, 0.5 - EPS, 1 - EPS, 2 - EPS, 5 - EPS, 10 - EPS, 20 - EPS, 1e9]; LAB = ['<0.1', '0.1-0.5', '0.5-1', '1-2', '2-5', '5-10', '10-20', '>=20']
C = {}
for nm, sub in (('train', tr), ('test', te), ('all', c)):
    b = pd.Series(ser(sub, 1)['blend'], index=sub.index); cl = pd.cut(b, BINS, labels=LAB)
    g = sub.groupby(cl, observed=True).o
    t = pd.DataFrame({'n': g.size(), 'fc_mean': b.groupby(cl, observed=True).mean().round(2), 'obs_mean': g.mean().round(2), 'obs_median': g.median().round(2),
                      'obs_p25': g.quantile(.25).round(2), 'obs_p75': g.quantile(.75).round(2),
                      'p_dry(<0.1)': g.apply(lambda x: round(float((x < 0.1 - EPS).mean()), 3)), 'p_ge1': g.apply(lambda x: round(float((x >= 1).mean()), 3)),
                      'p_ge10': g.apply(lambda x: round(float((x >= 10).mean()), 3)), 'p_ge20': g.apply(lambda x: round(float((x >= 20).mean()), 3))})
    C[nm] = t.to_dict('index'); print(f'\nobserved given blended daily amount, lead 1, {nm}'); print(t.to_string())
out['reliability_L1'] = C
# ---- D Jerusalem
J = {}
for sid in (22, 23):
    s = c[c.station_id == sid]
    for L in (1, 2):
        F = add_blends(s, L)
        for k in ('icon', 'ecmwf', 'blend.6 (app)'):
            for t in (1.0, 10.0): J[f'st{sid} L{L} {k} >={t:g}'] = {x: y for x, y in cont(F[k].values, s.o.values, t).items() if x in ('n', 'obs_wet', 'hits', 'miss', 'fa', 'pod', 'far', 'fbias')}
    J[f'st{sid} totals mm (obs, icon L1, ecmwf L1)'] = [round(float(s.o.sum())), round(float(s.i1.sum())), round(float(s.e1.sum()))]
out['jerusalem'] = J; print('\nJerusalem'); [print(k, v) for k, v in J.items() if 'L1' in k or 'totals' in k]
# ---- B hourly wet threshold
h = pd.read_parquet(f'{HERE}/data/processed/fable3_rain_hourly.parquet')
h = h[~h.station_id.isin(BAD_GAUGES)].sort_values(['station_id', 'time']).reset_index(drop=True)
ok = h[V].notna().all(axis=1); test = h.time >= pd.Timestamp('2025-11-01', tz='UTC')
ow = h.o >= 0.1 - EPS
def roll(x, k): return x.astype('int8').groupby(h.station_id).transform(lambda s: s.rolling(2 * k + 1, center=True, min_periods=1).max()).astype(bool)
ow1 = roll(ow, 1); ow3 = roll(ow, 3)
B = {}
for L in (0, 1, 2):
    b = 0.6 * h[f'i{L}'] + 0.4 * h[f'e{L}']; rules = {f'blend>={X}': b >= X - EPS for X in (0.1, 0.2, 0.3, 0.5, 1.0)}
    rules['icon>=0.1'] = h[f'i{L}'] >= 0.1 - EPS; rules['both models>=0.1'] = (h[f'i{L}'] >= 0.1 - EPS) & (h[f'e{L}'] >= 0.1 - EPS); rules['either>=0.1'] = (h[f'i{L}'] >= 0.1 - EPS) | (h[f'e{L}'] >= 0.1 - EPS)
    for nm, m in (('train', ok & ~test), ('test', ok & test)):
        for k, w in rules.items():
            r = occ(w[m].values, ow[m].values); w1 = roll(w, 1); w3 = roll(w, 3)
            r['fc_hours_with_rain_within_1h'] = round(float(ow1[m & w].mean()), 3); r['fc_hours_with_rain_within_3h'] = round(float(ow3[m & w].mean()), 3)
            r['obs_hours_caught_within_1h'] = round(float(w1[m & ow].mean()), 3); r['obs_hours_caught_within_3h'] = round(float(w3[m & ow].mean()), 3)
            B[f'L{L} {nm} | {k}'] = r
out['wet_hour_threshold'] = B
T = pd.DataFrame(B).T; print('\nwet hour rules vs observed hour >= 0.1 mm'); print(T[T.index.str.startswith('L1') | T.index.str.startswith('L0 test')].drop(columns=['hits', 'miss', 'fa']).to_string())
# ---- E. bootstrap over calendar days: gain in ETS from the proposed thresholds on the blend (fixed numbers, nothing fitted)
rng = np.random.default_rng(5); E = {}
for L in (1, 2):
    for nm, sub in (('train', tr), ('test', te)):
        b = ser(sub, L)['blend']; o = sub.o.values; ud, inv = np.unique(sub.day.values, return_inverse=True); groups = [np.where(inv == j)[0] for j in range(len(ud))]
        samples = [np.concatenate([groups[j] for j in rng.integers(0, len(ud), len(ud))]) for _ in range(400)]
        for label, (to, X0, X1) in {'any rain (obs>=0.1): blend>=0.5 instead of >=0.1': (0.1, 0.1, 0.5), 'heavy (obs>=10): blend>=7 instead of >=10': (10, 10, 7),
                                    'very heavy (obs>=20): blend>=14 instead of >=20': (20, 20, 14)}.items():
            dl = [ets_arr(b[ix] >= X1 - EPS, o[ix] >= to - EPS) - ets_arr(b[ix] >= X0 - EPS, o[ix] >= to - EPS) for ix in samples]
            E[f'L{L} {nm} | {label}'] = dict(ets_before=round(float(ets_arr(b >= X0 - EPS, o >= to - EPS)), 3), ets_after=round(float(ets_arr(b >= X1 - EPS, o >= to - EPS)), 3),
                                              gain_ci95=[round(float(x), 3) for x in np.nanpercentile(dl, [2.5, 97.5])], n_obs_events=int((o >= to - EPS).sum()), n_event_dates=int(len(np.unique(sub.day.values[o >= to - EPS]))))
out['bootstrap_threshold_gain'] = E; print('\nthreshold gains, bootstrap over days'); print(pd.DataFrame(E).T.to_string())
json.dump(out, open(f'{HERE}/results/fable3_extra.json', 'w'), indent=1, default=str)
