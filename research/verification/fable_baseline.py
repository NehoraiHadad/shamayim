"""Task 1: independent baseline. MAE/bias by model x lead; station bias correction and its transfer."""
import json, numpy as np, pandas as pd
from fable_common import *
m = load(); mt = meta(); D = dist_matrix(mt)
out = {}
# --- time alignment sanity: shift obs by k hours, MAE of ICON d0
g = m[['station_id', 'time', 't_d0_icon', 'td']].sort_values(['station_id', 'time'])
al = {}
for k in (-2, -1, 0, 1, 2):
    o = g.groupby('station_id').td.shift(-k)   # obs at time+k compared with forecast at time
    al[k] = float((g.t_d0_icon - o).abs().mean())
out['alignment_mae_obs_shift_h'] = al; print('alignment', al)
# --- raw scores
ok = m.td.notna()
for L in LEADS:
    ok &= m[f't_d{L}_icon'].notna() & m[f't_d{L}_ec'].notna()
c = m[ok].copy()
out['n_common'] = int(len(c)); out['n_stations'] = int(c.station_id.nunique())
def score(df, col):
    e = df[col] - df.td
    return dict(mae=round(float(e.abs().mean()), 3), bias=round(float(e.mean()), 3), rmse=round(float(np.sqrt((e**2).mean())), 3))
rows = []
for per, df in (('all', c), ('train', c[c.time < SPLIT]), ('test', c[c.time >= SPLIT])):
    for L in LEADS:
        for mod in ('icon', 'ec', 'bl'):
            rows.append(dict(period=per, lead=L, model=mod, n=len(df), **score(df, f't_d{L}_{mod}')))
raw = pd.DataFrame(rows); out['raw'] = rows
print(raw.pivot_table(index=['period', 'lead'], columns='model', values=['mae', 'bias']).round(2))
# station-averaged MAE (each station equal weight) + spread
e = (c.t_d1_bl - c.td)
ps = e.groupby(c.station_id).agg(bias='mean', mae=lambda x: x.abs().mean())
out['per_station_d1_blend'] = dict(bias_sd=float(ps.bias.std()), bias_min=float(ps.bias.min()), bias_max=float(ps.bias.max()),
                                   mae_median=float(ps.mae.median()), mae_min=float(ps.mae.min()), mae_max=float(ps.mae.max()))
print(out['per_station_d1_blend'])
# diurnal bias of blend d1
print('bias by UTC hour (blend d1):', e.groupby(c.hod).mean().round(2).tolist())
out['bias_by_utc_hour_bl_d1'] = e.groupby(c.hod).mean().round(3).tolist()
out['mae_by_utc_hour_bl_d1'] = e.abs().groupby(c.hod).mean().round(3).tolist()
out['bias_by_month_bl_d1'] = e.groupby(c.mon).mean().round(3).tolist()

# --- bias correction, fit < SPLIT, score >= SPLIT
tr, te = c[c.time < SPLIT], c[c.time >= SPLIT]
sids = sorted(set(tr.station_id) & set(te.station_id))
# require decent train and test
cnt_tr = tr.groupby('station_id').size(); cnt_te = te.groupby('station_id').size()
sids = [s for s in sids if cnt_tr[s] > 4000 and cnt_te[s] > 2000]
tr, te = tr[tr.station_id.isin(sids)], te[te.station_id.isin(sids)]
out['bc_n_stations'] = len(sids); out['bc_n_test'] = int(len(te))
Dv = D.loc[sids, sids].values.copy(); np.fill_diagonal(Dv, np.inf); Dn = pd.DataFrame(Dv, index=sids, columns=sids)
nn = Dn.idxmin(axis=1); nnd = Dn.min(axis=1)
out['nn_dist_km'] = dict(median=float(nnd.median()), p25=float(nnd.quantile(.25)), p75=float(nnd.quantile(.75)), max=float(nnd.max()))
seas = lambda mon: (mon % 12) // 3
res = []
for L in LEADS:
    for mod in ('bl', 'icon', 'ec'):
        col = f't_d{L}_{mod}'
        trE = (tr[col] - tr.td).rename('e')
        base = (te[col] - te.td)
        r = dict(lead=L, model=mod, raw=float(base.abs().mean()))
        for name, keys_fn in (('const', lambda d: [d.station_id]),
                              ('hod', lambda d: [d.station_id, d.hod]),
                              ('hod_season', lambda d: [d.station_id, d.hod, seas(d.mon).rename('sea')]),
                              ('hod_month', lambda d: [d.station_id, d.hod, d.mon])):
            tab = trE.groupby(keys_fn(tr)).mean()
            tab.index.names = ['station_id', 'hod', 'x'][:tab.index.nlevels]
            # tab as array [station, hod?, x?]
            kte = keys_fn(te)
            idx = pd.MultiIndex.from_arrays(kte) if len(kte) > 1 else pd.Index(kte[0])
            own = tab.reindex(idx).values
            r[f"own_{name}"] = float(np.nanmean(np.abs(base.values - own)))
            # nearest neighbour's correction
            kk = [te.station_id.map(nn)] + kte[1:]
            idx = pd.MultiIndex.from_arrays(kk) if len(kk) > 1 else pd.Index(kk[0])
            r[f'nn_{name}'] = float(np.nanmean(np.abs(base.values - tab.reindex(idx).values)))
            # leave-one-station-out mean of the other stations' correction (station-equal weight)
            if tab.index.nlevels == 1:
                tot, n = tab.sum(), len(tab)
                loso = (tot - tab) / (n - 1)
                lv = loso.reindex(te.station_id).values
            else:
                lev = list(range(1, tab.index.nlevels))
                gs = tab.groupby(level=lev)
                loso = (gs.transform('sum') - tab) / (gs.transform('count') - 1)
                lv = loso.reindex(idx if False else (pd.MultiIndex.from_arrays(kte))).values
            r[f'loso_{name}'] = float(np.nanmean(np.abs(base.values - lv)))
        res.append(r)
bc = pd.DataFrame(res); out['bias_correction_test_mae'] = res
pd.set_option('display.width', 250)
print(bc.round(3).to_string())
# transfer vs NN distance, lead 1 blend, hod_season
col = 't_d1_bl'
trE = (tr[col] - tr.td)
tab = trE.groupby([tr.station_id, tr.hod, seas(tr.mon)]).mean()
base = te[col] - te.td
own = tab.reindex(pd.MultiIndex.from_arrays([te.station_id, te.hod, seas(te.mon)])).values
nnc = tab.reindex(pd.MultiIndex.from_arrays([te.station_id.map(nn), te.hod, seas(te.mon)])).values
df = pd.DataFrame(dict(sid=te.station_id.values, raw=base.abs().values, own=np.abs(base.values - own), nn=np.abs(base.values - nnc)))
ps = df.groupby('sid').mean(); ps['d'] = nnd; ps['elev_diff'] = (mt.set_index('station_id').om_elev)
ps['bin'] = pd.cut(ps.d, [0, 5, 10, 20, 100])
t = ps.groupby('bin', observed=True).agg(n=('raw', 'size'), raw=('raw', 'mean'), own=('own', 'mean'), nn=('nn', 'mean')).round(3)
print(t); out['nn_transfer_by_distance_d1_bl_hod_season'] = t.reset_index().astype({'bin': str}).to_dict('records')
out['stations_nn_helps'] = int((ps.nn < ps.raw).sum()); out['stations_own_helps'] = int((ps.own < ps.raw).sum())
print('stations where NN corr helps', out['stations_nn_helps'], 'own helps', out['stations_own_helps'], 'of', len(ps))
json.dump(out, open(f'{HERE}/results/fable_baseline.json', 'w'), indent=1, default=str)
