"""Rain study Q4: simple corrections that need no station, fitted on the training period (< 2025-11-01) with the
verified station left out, scored on that station in the test period (>= 2025-11-01); all 84 stations pooled.
Also the swap (fit on the test period, score on the training period) as a check on stability between rain years.
Daily amounts, leads 1 and 2:
  app           0.6*ICON + 0.4*ECMWF
  lin_ls        a*ICON + b*ECMWF, least squares (no intercept)
  scaled_w      k*(w*ICON + (1-w)*ECMWF), k makes the training total equal the observed total; w = 0.6 (app), 0.5, 0.3, 0
  scaled_opt    the same with w chosen for the lowest training RMSE
  qm_blend      quantile mapping of the app blend onto the gauge distribution (national, all days)
  qm_each       quantile-map each model, then average 50/50
  max           max(ICON, ECMWF)
Occurrence rules: 'wet day' if <series> >= X, X tuned on training data for the best ETS, or for frequency bias = 1."""
import json, numpy as np, pandas as pd
from fable3_common import *
d = daily()
V = ['o'] + [f'{m}{L}' for m in 'ie' for L in (0, 1, 2)]
c = d.dropna(subset=V).reset_index(drop=True)
TH = [0.1, 1.0, 5.0, 10.0, 20.0]
PQ = np.unique(np.concatenate([np.linspace(0.5, 0.9, 41), 1 - np.logspace(-1, -4, 60)]))
def qm_fit(f, o):
    fq, oq = np.quantile(f, PQ), np.quantile(o, PQ)
    fq, ix = np.unique(fq, return_index=True); ix2 = np.r_[ix[1:] - 1, len(oq) - 1]     # for tied forecast quantiles take the highest obs quantile
    return fq, oq[ix2]
def qm_apply(par, f):
    fq, oq = par; y = np.interp(f, fq, oq, left=0.0)
    top = f > fq[-1]; y[top] = f[top] * (oq[-1] / fq[-1]) if fq[-1] > 0 else f[top]
    return np.where(f <= 0, 0.0, y)
def fit(tr, L):
    i, e, o = tr[f'i{L}'].values.astype(float), tr[f'e{L}'].values.astype(float), tr.o.values.astype(float)
    P = {}
    A = np.c_[i, e]; P['lin_ls'] = np.linalg.lstsq(A, o, rcond=None)[0]
    best = None
    for w in np.round(np.arange(0, 1.01, 0.1), 1):
        b = w * i + (1 - w) * e; k = o.sum() / b.sum(); r = np.sqrt(((k * b - o) ** 2).mean())
        P[f'scaled_{w}'] = (w, k)
        if best is None or r < best[0]: best = (r, w, k)
    P['scaled_opt'] = best[1:]
    b = 0.6 * i + 0.4 * e
    P['qm_blend'] = qm_fit(b, o); P['qm_i'] = qm_fit(i, o); P['qm_e'] = qm_fit(e, o)
    # occurrence thresholds
    series = {'icon': i, 'ecmwf': e, 'blend.6': b, 'blend.5': .5 * i + .5 * e, 'blend.3': .3 * i + .7 * e, 'max': np.maximum(i, e), 'min': np.minimum(i, e)}
    XS = np.array([0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0])
    for to in (0.1, 1.0):
        ow = o >= to - EPS
        for k_, s in series.items():
            ets = [ets_arr(s >= X - EPS, ow) for X in XS]; fb = [abs(np.log((s >= X - EPS).sum() / ow.sum())) for X in XS]
            P[f'X_ets {to} {k_}'] = XS[int(np.nanargmax(ets))]; P[f'X_fb1 {to} {k_}'] = XS[int(np.argmin(fb))]
    return P
def predict(P, te, L):
    i, e = te[f'i{L}'].values.astype(float), te[f'e{L}'].values.astype(float); b = 0.6 * i + 0.4 * e
    R = {'app': b, 'icon': i, 'ecmwf': e, 'max': np.maximum(i, e), 'lin_ls': P['lin_ls'][0] * i + P['lin_ls'][1] * e}
    for w in (0.6, 0.5, 0.3, 0.0):
        w_, k = P[f'scaled_{w}']; R[f'scaled_w{w}'] = k * (w * i + (1 - w) * e)
    w_, k = P['scaled_opt']; R['scaled_opt'] = k * (w_ * i + (1 - w_) * e)
    R['qm_blend'] = qm_apply(P['qm_blend'], b); R['qm_each'] = 0.5 * qm_apply(P['qm_i'], i) + 0.5 * qm_apply(P['qm_e'], e)
    series = {'icon': i, 'ecmwf': e, 'blend.6': b, 'blend.5': .5 * i + .5 * e, 'blend.3': .3 * i + .7 * e, 'max': np.maximum(i, e), 'min': np.minimum(i, e)}
    W = {}
    for to in (0.1, 1.0):
        for k_, s in series.items():
            W[f'{to} | {k_} >= thr (as is)'] = s >= to - EPS
            W[f'{to} | {k_} >= X_ets'] = s >= P[f'X_ets {to} {k_}'] - EPS
            W[f'{to} | {k_} >= X_fb1'] = s >= P[f'X_fb1 {to} {k_}'] - EPS
    return R, W
def lso(fit_set, eval_set, L):
    R, W = {}, {}; idx = []
    for s in eval_set.station_id.unique():
        P = fit(fit_set[fit_set.station_id != s], L); te = eval_set[eval_set.station_id == s]
        r, w = predict(P, te, L); idx.append(te.index.values)
        for k, v in r.items(): R.setdefault(k, []).append(v)
        for k, v in w.items(): W.setdefault(k, []).append(v)
    idx = np.concatenate(idx)
    return {k: np.concatenate(v) for k, v in R.items()}, {k: np.concatenate(v) for k, v in W.items()}, eval_set.loc[idx]
def amount_scores(f, o):
    wet = o >= 1
    r = dict(mae=round(float(np.abs(f - o).mean()), 3), rmse=round(float(np.sqrt(((f - o) ** 2).mean())), 3), mae_obs_wet=round(float(np.abs(f - o)[wet].mean()), 2),
             mae_sqrt=round(float(np.abs(np.sqrt(f) - np.sqrt(o)).mean()), 4), total_ratio=round(float(f.sum() / o.sum()), 3), corr=round(float(np.corrcoef(f, o)[0, 1]), 3))
    for t in TH:
        s = cont(f, o, t); r[f'ets{t:g}'] = s['ets']; r[f'fb{t:g}'] = s['fbias']
    return r
def occ_scores(w, ow):
    h = int((w & ow).sum()); m = int((~w & ow).sum()); fa = int((w & ~ow).sum())
    return dict(hits=h, miss=m, fa=fa, pod=round(h / (h + m), 3), far=round(fa / max(h + fa, 1), 3), fbias=round((h + fa) / (h + m), 3), ets=round(float(ets_arr(w, ow)), 3))
out = {'doc': __doc__}
tr, te = c[~c.test], c[c.test]
out['n'] = dict(train_station_days=len(tr), test_station_days=len(te), stations=int(c.station_id.nunique()), test_obs_ge1=int((te.o >= 1).sum()), test_obs_ge10=int((te.o >= 10).sum()),
                test_obs_ge20=int((te.o >= 20).sum()), train_obs_ge1=int((tr.o >= 1).sum()), train_obs_ge10=int((tr.o >= 10).sum()), train_obs_ge20=int((tr.o >= 20).sum()),
                test_rain_dates=int(te[te.o >= 1].day.nunique()), train_rain_dates=int(tr[tr.o >= 1].day.nunique()))
print(out['n'])
keep = {}
for L in (1, 2):
    for nm, (a, b) in (('train->test (leave-station-out)', (tr, te)), ('swap: test->train (leave-station-out)', (te, tr))):
        R, W, ev = lso(a, b, L); o = ev.o.values.astype(float)
        am = {k: amount_scores(v, o) for k, v in R.items()}
        oc = {k: occ_scores(v, o >= float(k.split(' | ')[0]) - EPS) for k, v in W.items()}
        out[f'L{L} {nm}'] = dict(amounts=am, occurrence=oc)
        print(f'\n=== lead {L} {nm}: amounts'); print(pd.DataFrame(am).T.to_string())
        print(f'--- occurrence rules'); print(pd.DataFrame(oc).T.to_string())
        if nm.startswith('train'): keep[L] = (R, W, ev)
    P = fit(tr, L); P2 = fit(te, L); P3 = fit(c, L)
    def par(P): return dict(lin_ls=[round(float(x), 3) for x in P['lin_ls']], scaled={k: [round(float(x), 3) for x in v] for k, v in P.items() if k.startswith('scaled')},
                            X={k: float(v) for k, v in P.items() if k.startswith('X_')},
                            qm_blend_knots={f'{f:.2f}': round(float(o_), 2) for f, o_ in zip(*[np.asarray(z) for z in P['qm_blend']]) if f in P['qm_blend'][0][::6]})
    out[f'L{L} parameters'] = dict(train=par(P), test_period=par(P2), all=par(P3))
    print(f'\nparameters lead {L}: train', par(P)['lin_ls'], par(P)['scaled'], '\n test-period fit', par(P2)['lin_ls'], par(P2)['scaled'], '\n all', par(P3)['lin_ls'], par(P3)['scaled'])
    print(' X train', par(P)['X']); print(' X test-period', par(P2)['X'])
    print(' qm knots train', par(P)['qm_blend_knots']); print(' qm knots test-period', par(P2)['qm_blend_knots'])
# ---- fixed, round-number candidates (no fitting at all), scored on train and test separately, by region; bootstrap over days on test
def fixed(sub, L):
    i, e = sub[f'i{L}'].values.astype(float), sub[f'e{L}'].values.astype(float)
    return {'app 0.6i+0.4e': 0.6 * i + 0.4 * e, '0.5i+0.5e': 0.5 * i + 0.5 * e, '0.3i+0.7e': 0.3 * i + 0.7 * e, 'ecmwf': e, '0.6i+0.8e': 0.6 * i + 0.8 * e, '0.5i+0.9e': 0.5 * i + 0.9 * e,
            '0.4i+1.0e': 0.4 * i + e, '1.4*(0.5i+0.5e)': 0.7 * i + 0.7 * e, 'max': np.maximum(i, e), '1.2*max': 1.2 * np.maximum(i, e)}
fx = {}
for L in (1, 2):
    for nm, sub in (('train', tr), ('test', te), ('all', c)):
        fx[f'L{L} {nm}'] = {k: amount_scores(v, sub.o.values.astype(float)) for k, v in fixed(sub, L).items()}
        print(f'\nfixed candidates lead {L} {nm}'); print(pd.DataFrame(fx[f'L{L} {nm}']).T.to_string())
    fx[f'L{L} all by region'] = {r: {k: {x: y for x, y in amount_scores(v, s.o.values.astype(float)).items() if x in ('mae', 'rmse', 'total_ratio', 'ets1', 'fb1', 'ets10', 'fb10')} for k, v in fixed(s, L).items() if k in ('app 0.6i+0.4e', '0.6i+0.8e', '0.4i+1.0e', 'max')} for r, s in c.groupby('region')}
    fx[f'L{L} all by rain year'] = {str(r): {k: {x: y for x, y in amount_scores(v, s.o.values.astype(float)).items() if x in ('mae', 'rmse', 'total_ratio', 'ets1', 'fb1', 'ets10', 'fb10')} for k, v in fixed(s, L).items() if k in ('app 0.6i+0.4e', '0.6i+0.8e', '0.4i+1.0e', 'max')} for r, s in c.groupby('ryear')}
print('\nby region, lead 1 (all period)'); print(pd.DataFrame({(r, k): v2 for r, v in fx['L1 all by region'].items() for k, v2 in v.items()}).T.to_string())
print('\nby rain year, lead 1'); print(pd.DataFrame({(r, k): v2 for r, v in fx['L1 all by rain year'].items() for k, v2 in v.items()}).T.to_string())
out['fixed_candidates'] = fx
# wet-day threshold applied to fixed candidates: 'show rain' if value >= X, against observed >= 0.1 and >= 1
wt = {}
for L in (1, 2):
    for nm, sub in (('train', tr), ('test', te)):
        o = sub.o.values; F_ = fixed(sub, L)
        for k in ('app 0.6i+0.4e', '0.6i+0.8e', '0.4i+1.0e', 'ecmwf', 'max'):
            for X in (0.1, 0.2, 0.3, 0.5, 1.0, 1.5, 2.0):
                for to in (0.1, 1.0):
                    wt[f'L{L} {nm} | {k} >= {X} vs obs >= {to}'] = occ_scores(F_[k] >= X - EPS, o >= to - EPS)
out['wet_day_threshold_fixed'] = wt
T = pd.DataFrame(wt).T
for L in (1,):
    for to in (0.1, 1.0):
        s = T[T.index.str.contains(f'vs obs >= {to}') & T.index.str.startswith(f'L{L}')]
        print(f'\nwet-day threshold, lead {L}, observed >= {to}: ETS (fbias)')
        tab = {}
        for ix, r in s.iterrows():
            a, b = ix.split(' | '); k, X = b.split(' >= ')[0], b.split(' >= ')[1].split(' vs')[0]
            tab.setdefault((a.split()[1], k), {})[X] = f"{r.ets:.3f} ({r.fbias:.2f})"
        print(pd.DataFrame(tab).T.to_string())
# bootstrap over days (test): candidate minus app
rng = np.random.default_rng(3)
bs = {}
for L in (1, 2):
    o = te.o.values.astype(float); F_ = fixed(te, L); days = te.day.values; ud, inv = np.unique(days, return_inverse=True)
    groups = [np.where(inv == j)[0] for j in range(len(ud))]
    def stats(f, ix): 
        oo, ff = o[ix], f[ix]
        return np.array([np.abs(ff - oo).mean(), np.sqrt(((ff - oo) ** 2).mean()), ets_arr(ff >= 1 - EPS, oo >= 1 - EPS), ets_arr(ff >= 10 - EPS, oo >= 10 - EPS), ets_arr(ff >= 20 - EPS, oo >= 20 - EPS)])
    samples = [np.concatenate([groups[j] for j in rng.integers(0, len(ud), len(ud))]) for _ in range(400)]
    base = np.array([stats(F_['app 0.6i+0.4e'], ix) for ix in samples])
    for k in ('0.6i+0.8e', '0.4i+1.0e', '0.5i+0.5e', 'ecmwf', 'max'):
        dlt = np.array([stats(F_[k], ix) for ix in samples]) - base
        q = np.nanpercentile(dlt, [2.5, 50, 97.5], axis=0).round(3)
        bs[f'L{L} {k} - app'] = {m: q[:, j].tolist() for j, m in enumerate(('mae', 'rmse', 'ets1', 'ets10', 'ets20'))}
out['bootstrap_test_fixed_minus_app_ci95'] = bs
print('\nbootstrap over test days, candidate minus app [2.5, 50, 97.5]'); print(pd.DataFrame(bs).T.to_string())
json.dump(out, open(f'{HERE}/results/fable3_improve.json', 'w'), indent=1, default=str)
