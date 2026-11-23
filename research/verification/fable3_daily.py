"""Rain study Q1+Q2: daily (local day) rain occurrence and amounts, ICON / ECMWF / blends, leads 0-2.
Lead L = Open-Meteo previous_dayL for every hour of the day (L=0: the stitched latest-run series, a near-analysis,
reference only; L=1 ~ what the app shows for tomorrow, L=2 ~ the day after).  Sample: station-days where the gauge and
both models at leads 0,1,2 are complete.  Station-days on one date are strongly correlated (one rain system wets many
gauges), so uncertainty is from a bootstrap over calendar days, not station-days."""
import json, numpy as np, pandas as pd
from fable3_common import *
d = daily()
V = ['o'] + [f'{m}{L}' for m in 'ie' for L in (0, 1, 2)]
c = d.dropna(subset=V).copy()
out = {'doc': __doc__, 'n_station_days': len(c), 'n_stations': int(c.station_id.nunique()), 'n_days': int(c.day.nunique()),
       'test_station_days': int(c.test.sum()), 'period': [str(c.day.min().date()), str(c.day.max().date())]}
# how many distinct rain dates there are (the real sample size)
nat = c.groupby('day').agg(n=('o', 'size'), wet1=('o', lambda x: (x >= 1).mean()), mean=('o', 'mean'))
out['rain_dates'] = {f'{k}': dict(dates_with_any_station_ge1mm=int((nat.wet1[idx] > 0).sum()), dates_with_ge20pct_stations_ge1mm=int((nat.wet1[idx] >= .2).sum()))
                     for k, idx in (('all', nat.index), ('train', nat.index[nat.index < SPLIT_DAY]), ('test', nat.index[nat.index >= SPLIT_DAY]))}
out['obs_wet_station_days'] = {str(t): dict(all=int((c.o >= t - EPS).sum()), test=int(((c.o >= t - EPS) & c.test).sum())) for t in THR}
print({k: v for k, v in out.items() if k != 'doc'})
def table(sub, L, names=None):
    F = add_blends(sub, L); o = sub.o.values; rows = {}
    for k, f in F.items():
        if names and k not in names: continue
        rows[k] = {str(t): cont(f.values, o, t) for t in THR}
    return rows
# ---------- Q1 occurrence
occ = {}
for per, sub in (('all', c), ('train', c[~c.test]), ('test', c[c.test])):
    occ[per] = {f'L{L}': table(sub, L) for L in (0, 1, 2)}
out['occurrence'] = occ
MAIN = ['icon', 'ecmwf', 'blend.6 (app)', 'max', 'min']
out['occurrence_by_region'] = {r: {f'L{L}': table(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('region')}
out['occurrence_by_season'] = {r: {f'L{L}': table(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('sea')}
out['occurrence_by_rain_year'] = {str(r): {f'L{L}': table(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('ryear')}
def show(tab, title, keys=('n', 'obs_wet', 'hits', 'miss', 'fa', 'pod', 'far', 'fbias', 'ets')):
    print('\n' + title)
    for t in THR:
        print(pd.DataFrame({k: {x: v[str(t)][x] for x in keys} for k, v in tab.items()}).T.to_string(header=True).replace('\n', f'\n'), f'   <- thr {t}')
for L in (0, 1, 2): show(occ['all'][f'L{L}'], f'ALL period lead {L}')
show(occ['test']['L1'], 'TEST lead 1')
for r, v in out['occurrence_by_region'].items():
    print('\nregion', r); print(pd.DataFrame({(k, t): {x: v['L1'][k][str(t)][x] for x in ('obs_wet', 'pod', 'far', 'fbias', 'ets')} for k in MAIN[:3] for t in (1.0, 10.0)}).T.to_string())
for r, v in out['occurrence_by_season'].items():
    print('\nseason', r); print(pd.DataFrame({(k, t): {x: v['L1'][k][str(t)][x] for x in ('obs_wet', 'pod', 'far', 'fbias', 'ets')} for k in MAIN[:3] for t in (1.0, 10.0)}).T.to_string())
# ---------- bootstrap over days: ETS differences (lead 1, all period)
rng = np.random.default_rng(1); days = c.day.unique(); idx_by_day = c.groupby('day').indices
def boot(fn, B=400):
    v = []
    for _ in range(B):
        s = rng.choice(len(days), len(days)); ix = np.concatenate([idx_by_day[days[j]] for j in s]); v.append(fn(ix))
    v = np.array(v); return [round(float(x), 3) for x in np.nanpercentile(v, [2.5, 50, 97.5], axis=0)] if v.ndim == 1 else np.nanpercentile(v, [2.5, 50, 97.5], axis=0).round(3).tolist()
bs = {}
for L in (1, 2):
    F = {k: v.values for k, v in add_blends(c, L).items()}; o = c.o.values
    for t in THR:
        ow = o >= t - EPS
        for a, b in (('ecmwf', 'icon'), ('blend.6 (app)', 'icon'), ('blend.6 (app)', 'ecmwf'), ('blend.4', 'blend.6 (app)'), ('max', 'blend.6 (app)')):
            fa_, fb_ = F[a] >= t - EPS, F[b] >= t - EPS
            bs[f'L{L} thr{t} ETS {a} - {b}'] = boot(lambda ix: ets_arr(fa_[ix], ow[ix]) - ets_arr(fb_[ix], ow[ix]))
out['bootstrap_ets_diff_ci95'] = bs
print('\nbootstrap (days) ETS differences [2.5%, median, 97.5%]'); [print(k, v) for k, v in bs.items()]
# ---------- Q2 amounts
def amounts(sub, L, names=None):
    F = add_blends(sub, L); o = sub.o.values; rows = {}
    wet = o >= 1; n = len(o)
    for k, f in F.items():
        if names and k not in names: continue
        f = f.values; fw = f >= 1
        both = wet & fw
        rows[k] = dict(n=n, total_ratio=round(float(f.sum() / o.sum()), 3) if o.sum() > 0 else None, mae_all=round(float(np.abs(f - o).mean()), 3),
                       rmse_all=round(float(np.sqrt(((f - o) ** 2).mean())), 2),
                       n_obs_wet=int(wet.sum()), ratio_on_obs_wet=round(float(f[wet].sum() / o[wet].sum()), 3) if wet.any() else None,
                       mae_obs_wet=round(float(np.abs(f - o)[wet].mean()), 2) if wet.any() else None,
                       median_ratio_both_wet=round(float(np.median(f[both] / o[both])), 3) if both.any() else None,
                       fc_mm_on_obs_dry=round(float(f[~wet].sum() / f.sum()), 3) if f.sum() > 0 else None,
                       corr_sqrt=round(float(np.corrcoef(np.sqrt(f), np.sqrt(o))[0, 1]), 3))
    return rows
out['amounts'] = {per: {f'L{L}': amounts(sub, L) for L in (0, 1, 2)} for per, sub in (('all', c), ('train', c[~c.test]), ('test', c[c.test]))}
out['amounts_by_region'] = {r: {f'L{L}': amounts(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('region')}
out['amounts_by_season'] = {r: {f'L{L}': amounts(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('sea')}
out['amounts_by_rain_year'] = {str(r): {f'L{L}': amounts(s, L, MAIN) for L in (1, 2)} for r, s in c.groupby('ryear')}
for L in (0, 1, 2): print(f'\namounts ALL lead {L}'); print(pd.DataFrame(out['amounts']['all'][f'L{L}']).T.to_string())
print('\namounts TEST lead 1'); print(pd.DataFrame(out['amounts']['test']['L1']).T.to_string())
for nm in ('amounts_by_region', 'amounts_by_season', 'amounts_by_rain_year'):
    print('\n' + nm + ' lead 1')
    print(pd.DataFrame({(r, k): {x: v['L1'][k][x] for x in ('n_obs_wet', 'total_ratio', 'ratio_on_obs_wet', 'mae_obs_wet', 'fc_mm_on_obs_dry')} for r, v in out[nm].items() for k in MAIN[:3]}).T.to_string())
# smearing: share of station-days per class
BINS = [-1, 0.1 - EPS, 1 - EPS, 5 - EPS, 10 - EPS, 25 - EPS, 1e9]; LAB = ['dry <0.1', '0.1-1', '1-5', '5-10', '10-25', '>=25']
def classes(sub, L):
    F = add_blends(sub, L); F = {'observed': sub.o, **{k: F[k] for k in MAIN}}
    return {k: (pd.cut(v, BINS, labels=LAB).value_counts(normalize=True).reindex(LAB) * 100).round(2).to_dict() for k, v in F.items()}
out['class_share_pct'] = {f'L{L}': classes(c, L) for L in (0, 1, 2)}
out['class_share_pct_winter'] = {f'L{L}': classes(c[c.sea == 'winter DJF'], L) for L in (1, 2)}
print('\nclass shares % (all days), lead 1'); print(pd.DataFrame(out['class_share_pct']['L1']).T.to_string())
print('\nclass shares % winter, lead 1'); print(pd.DataFrame(out['class_share_pct_winter']['L1']).T.to_string())
# conditional: what was observed when the app's blend said light rain
F = add_blends(c, 1); b = F['blend.6 (app)']
cls = pd.cut(b, BINS, labels=LAB)
cond = c.groupby(cls, observed=True).o.agg(n='size', obs_dry_pct=lambda x: round(float((x < 0.1 - EPS).mean() * 100), 1), obs_ge1_pct=lambda x: round(float((x >= 1).mean() * 100), 1),
                                           obs_mean=lambda x: round(float(x.mean()), 2), obs_median=lambda x: round(float(x.median()), 2))
cond['fc_mean'] = b.groupby(cls, observed=True).mean().round(2)
out['observed_given_blend_class_L1'] = cond.to_dict('index'); print('\nobserved given app-blend class, lead 1'); print(cond.to_string())
# model agreement as a crude probability (the archive has no precipitation_probability)
ag = {}
for L in (1, 2):
    for t in (0.1, 1.0):
        iw = c[f'i{L}'] >= t - EPS; ew = c[f'e{L}'] >= t - EPS
        k = np.select([iw & ew, iw & ~ew, ~iw & ew], ['both', 'icon only', 'ecmwf only'], 'neither')
        g = c.groupby(k).o.agg(n='size', p_obs_ge_0_1=lambda x: round(float((x >= 0.1 - EPS).mean()), 3), p_obs_ge_1=lambda x: round(float((x >= 1).mean()), 3), obs_mean=lambda x: round(float(x.mean()), 2))
        ag[f'L{L} model>= {t}'] = g.to_dict('index'); print(f'\nagreement L{L} thr {t}'); print(g.to_string())
out['model_agreement'] = ag
json.dump(out, open(f'{HERE}/results/fable3_daily.json', 'w'), indent=1, default=str)
