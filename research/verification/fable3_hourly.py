"""Rain study Q3: hour-by-hour placement of rain.  Hourly values are the hour ending at the UTC stamp.
Note: ecmwf_ifs025 precipitation in the Open-Meteo archive is 3-hourly, spread evenly over three hours (the three
hours ending 03,06,..UTC are equal), so ECMWF cannot place rain better than a 3 h block; ICON is truly hourly.
Wet hour: >= 0.1 mm (the app's nowcast.wetMm) and >= 1 mm.  Sample: hours where gauge and both models (leads 0-2) exist."""
import json, numpy as np, pandas as pd
from fable3_common import *
h = pd.read_parquet(f'{HERE}/data/processed/fable3_rain_hourly.parquet')
h = h[~h.station_id.isin(BAD_GAUGES)].sort_values(['station_id', 'time']).reset_index(drop=True)
V = ['o'] + [f'{m}{L}' for m in 'ie' for L in (0, 1, 2)]
h['ok'] = h[V].notna().all(axis=1)
h['day'] = h.time.dt.tz_convert('Asia/Jerusalem').dt.tz_localize(None).dt.floor('D')
out = {'doc': __doc__}
# ECMWF block check
e = h[h.e1 > 0]; blk = e.groupby([e.station_id, (e.time - pd.Timedelta(hours=1)).dt.floor('3h')]).e1.agg(['nunique', 'size'])
out['ecmwf_3h_blocks'] = dict(share_blocks_all_equal=round(float((blk['nunique'] == 1).mean()), 4), share_blocks_3_hours=round(float((blk['size'] == 3).mean()), 4)); print(out['ecmwf_3h_blocks'])
def F(L):
    i, e = h[f'i{L}'], h[f'e{L}']
    return {'icon': i, 'ecmwf': e, 'blend.6 (app)': 0.6 * i + 0.4 * e, 'max': np.maximum(i, e)}
# ---- 1. scores at 1 h, and for 3 h / 6 h / 24 h block sums (UTC blocks) -> how much is timing error
res = {}
for L in (0, 1, 2):
    f = F(L); T = pd.DataFrame({'o': h.o, **f}); T['ok'] = h.ok; T['sid'] = h.station_id
    res[f'L{L}'] = {}
    for w in (1, 3, 6, 24):
        if w == 1: A = T[T.ok]
        else:
            key = (h.time - pd.Timedelta(hours=1)).dt.floor(f'{w}h')
            g = T.groupby([T.sid, key]); A = g[['o'] + list(f)].sum()[g.ok.sum() == w]
        res[f'L{L}'][f'{w}h'] = {k: {str(t): cont(A[k].values, A.o.values, t) for t in (0.1, 1.0, 5.0)} for k in f}
out['block_scores'] = res
for L in (1,):
    for t in ('0.1', '1.0', '5.0'):
        print(f'\nlead {L}, >= {t} mm per block: ETS / POD / FAR / fbias (n obs wet)')
        print(pd.DataFrame({(k, w): {x: res[f'L{L}'][w][k][t][x] for x in ('obs_wet', 'pod', 'far', 'fbias', 'ets')} for k in ('icon', 'ecmwf', 'blend.6 (app)', 'max') for w in ('1h', '3h', '6h', '24h')}).T.to_string())
# ---- 2. neighbourhood in time: an observed wet hour is 'caught' if a forecast wet hour lies within +-k h, and v.v.
def within(x, k):  # rolling max over +-k hours within a station (x: bool Series aligned with h)
    if k == 0: return x
    return x.astype('int8').groupby(h.station_id).transform(lambda s: s.rolling(2 * k + 1, center=True, min_periods=1).max()).astype(bool)
nb = {}
okk = h.ok & h.ok.groupby(h.station_id).transform(lambda s: s.rolling(13, center=True, min_periods=1).min()).astype(bool)   # full +-6 h window
for L in (0, 1, 2):
    f = F(L); nb[f'L{L}'] = {}
    for to, tf in ((0.1, 0.1), (1.0, 0.1), (1.0, 1.0)):
        ow = (h.o >= to - EPS)
        for k_, fv in f.items():
            fw = (fv >= tf - EPS); r = {}
            for k in (0, 1, 2, 3, 6):
                r[f'pm{k}h'] = dict(pod=round(float(within(fw, k)[ow & okk].mean()), 3), n_obs_wet=int((ow & okk).sum()),
                                    hit_rate_of_fc=round(float(within(h.o >= 0.1 - EPS, k)[fw & okk].mean()), 3), n_fc_wet=int((fw & okk).sum()))
            nb[f'L{L}'].setdefault(f'obs>={to} fc>={tf}', {})[k_] = r
out['neighbourhood'] = nb
for key, v in nb['L1'].items():
    print(f'\nlead 1 {key}: share of observed wet hours with a forecast wet hour within +-k (POD) | share of forecast wet hours with observed rain (>=0.1) within +-k')
    print(pd.DataFrame({k_: {**{f'POD {k}': r[k]['pod'] for k in r}, **{f'FCok {k}': r[k]['hit_rate_of_fc'] for k in r}, 'n_obs': r['pm0h']['n_obs_wet'], 'n_fc': r['pm0h']['n_fc_wet']} for k_, r in v.items()}).T.to_string())
# ---- 3. lag correlation (sqrt mm), positive lag = forecast rain comes later than observed
lag = {}
hh = h[h.ok]; so = np.sqrt(h.o)
for L in (0, 1, 2):
    f = F(L)
    for k_ in ('icon', 'ecmwf', 'blend.6 (app)'):
        sf = np.sqrt(f[k_]); r = {}
        for s in range(-6, 7):
            x = sf.groupby(h.station_id).shift(-s); m = h.ok & x.notna()
            r[s] = round(float(np.corrcoef(so[m], x[m])[0, 1]), 3)
        lag[f'L{L} {k_}'] = r
out['lag_corr_sqrt'] = lag; print('\nlag correlation of sqrt hourly rain (all hours); lag>0: forecast later'); print(pd.DataFrame(lag).T.to_string())
# ---- 4. per rain day: onset, centroid, number of wet hours, peak hour
on = {}
for L in (0, 1, 2):
    f = F(L)
    for k_ in ('icon', 'ecmwf', 'blend.6 (app)'):
        T = pd.DataFrame({'sid': h.station_id, 'day': h.day, 'hr': h.time.dt.tz_convert('Asia/Jerusalem').dt.hour, 'o': h.o, 'f': f[k_], 'ok': h.ok})
        g = T.groupby(['sid', 'day']); full = g.ok.sum() >= 23
        S = g[['o', 'f']].sum()
        T['ow'] = T.o >= 0.1 - EPS; T['fw'] = T.f >= 0.1 - EPS
        first_o = T[T.ow].groupby(['sid', 'day']).hr.min(); first_f = T[T.fw].groupby(['sid', 'day']).hr.min()
        T['oh'] = T.o * T.hr; T['fh'] = T.f * T.hr; C = T.groupby(['sid', 'day'])[['oh', 'fh']].sum()
        nw = T.groupby(['sid', 'day'])[['ow', 'fw']].sum(); mx = T.groupby(['sid', 'day'])[['o', 'f']].max()
        pk_o = T.loc[T.fillna({'o': -1}).groupby(['sid', 'day']).o.idxmax()].set_index(['sid', 'day']).hr
        pk_f = T.loc[T.fillna({'f': -1}).groupby(['sid', 'day']).f.idxmax()].set_index(['sid', 'day']).hr
        D = pd.DataFrame({'o': S.o, 'f': S.f, 'full': full, 'fo': first_o, 'ff': first_f, 'co': C.oh / S.o, 'cf': C.fh / S.f, 'nwo': nw.ow, 'nwf': nw.fw, 'mxo': mx.o, 'mxf': mx.f, 'pko': pk_o, 'pkf': pk_f})
        B = D[D.full & (D.o >= 1) & (D.f >= 1)]
        def st(x): return dict(n=int(x.notna().sum()), median=round(float(x.median()), 2), mean=round(float(x.mean()), 2), mae=round(float(x.abs().mean()), 2),
                               within1=round(float((x.abs() <= 1).mean()), 3), within2=round(float((x.abs() <= 2).mean()), 3), within3=round(float((x.abs() <= 3).mean()), 3), within6=round(float((x.abs() <= 6).mean()), 3))
        on[f'L{L} {k_}'] = dict(onset_fc_minus_obs_h=st(B.ff - B.fo), centroid_fc_minus_obs_h=st(B.cf - B.co), peak_hour_fc_minus_obs_h=st((B.pkf - B.pko).astype(float)),
                                wet_hours_obs_mean=round(float(B.nwo.mean()), 2), wet_hours_fc_mean=round(float(B.nwf.mean()), 2),
                                peak_mm_h_obs_mean=round(float(B.mxo.mean()), 2), peak_mm_h_fc_mean=round(float(B.mxf.mean()), 2),
                                peak_ratio_median=round(float((B.mxf / B.mxo).median()), 2))
out['rain_day_timing_both_ge1mm'] = on
print('\nrain days (obs and forecast both >= 1 mm): forecast minus observed, hours (local day; onset/centroid are truncated at the day edges)')
for k, v in on.items():
    if k.startswith('L1') or k.startswith('L0'):
        print(k, '| onset', v['onset_fc_minus_obs_h'], '\n   | centroid', v['centroid_fc_minus_obs_h'], '\n   | peak', v['peak_hour_fc_minus_obs_h'], '\n   | wet hours obs/fc', v['wet_hours_obs_mean'], v['wet_hours_fc_mean'], 'peak mm/h obs/fc', v['peak_mm_h_obs_mean'], v['peak_mm_h_fc_mean'], 'ratio med', v['peak_ratio_median'])
# ---- 5. hourly intensity classes (smearing in time), lead 1, all hours
BINS = [-1, 0.1 - EPS, 0.5 - EPS, 2 - EPS, 5 - EPS, 1e9]; LAB = ['<0.1', '0.1-0.5', '0.5-2', '2-5', '>=5']
f = F(1); A = h.ok
out['hourly_class_share_pct_L1'] = {k: (pd.cut(v[A], BINS, labels=LAB).value_counts(normalize=True).reindex(LAB) * 100).round(3).to_dict() for k, v in {'observed': h.o, **f}.items()}
print('\nhourly class shares %, lead 1'); print(pd.DataFrame(out['hourly_class_share_pct_L1']).T.to_string())
json.dump(out, open(f'{HERE}/results/fable3_hourly.json', 'w'), indent=1, default=str)
