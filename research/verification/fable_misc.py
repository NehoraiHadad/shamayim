"""Small checks: (a) conditioning on observed vs forecast temperature (review of verify_temp 'situations');
(b) first look at gust / RH / rain errors where IMS data has arrived (few stations so far)."""
import json, numpy as np, pandas as pd
from fable_common import *
m = load(); mt = meta().set_index('station_id'); out = {}
d = m[m.td.notna() & m.t_d1_bl.notna()]; e = d.t_d1_bl - d.td
f = lambda k: dict(n=int(k.sum()), bias=round(float(e[k].mean()), 2), mae=round(float(e[k].abs().mean()), 2))
out['conditioning'] = {'obs<=5': f(d.td <= 5), 'fcst<=5': f(d.t_d1_bl <= 5), 'obs>=35': f(d.td >= 35), 'fcst>=35': f(d.t_d1_bl >= 35)}
print(out['conditioning'])
rows = []
for sid, g in m.groupby('station_id'):
    r = dict(station=int(sid), name=mt.name[sid])
    for nm, obs, fcs, k in (('gust_kmh', g.ws_gust * 3.6, {'icon_d0': g.g_d0_icon, 'icon_d1': g.g_d1_icon, 'ec_d0': g.g_d0_ec}, None),
                            ('rh_pct', g.rh, {'icon_d0': g.h_d0_icon, 'icon_d1': g.h_d1_icon, 'ec_d0': g.h_d0_ec, 'ec_d1': g.h_d1_ec}, None)):
        if obs.notna().sum() < 2000: continue
        r[f'{nm}_n'] = int(obs.notna().sum()); r[f'{nm}_obs_mean'] = round(float(obs.mean()), 1)
        for fn, fc in fcs.items():
            x = (fc - obs).dropna()
            if len(x) > 1000: r[f'{nm}_{fn}_bias'] = round(float(x.mean()), 2); r[f'{nm}_{fn}_mae'] = round(float(x.abs().mean()), 2)
        if nm == 'gust_kmh':
            hi = obs >= 50
            if hi.sum() > 30: r['gust_obs>=50_n'] = int(hi.sum()); r['gust_obs>=50_icon_d1_bias'] = round(float((g.g_d1_icon - obs)[hi].mean()), 1)
            fh = g.g_d1_icon >= 50
            if fh.sum() > 30: r['gust_fc>=50_n'] = int((fh & obs.notna()).sum()); r['gust_fc>=50_icon_d1_bias'] = round(float((g.g_d1_icon - obs)[fh].mean()), 1)
    if g.rain.notna().sum() > 2000:
        gg = g[g.rain.notna()].copy(); gg['day'] = gg.time.dt.floor('D')
        dd = gg.groupby('day').agg(o=('rain', 'sum'), i=('p_d1_icon', 'sum'), c=('p_d1_ec', 'sum'), n=('rain', 'size'))
        dd = dd[dd.n >= 22]
        r['rain_days'] = len(dd); r['rain_obs_wet_days(>=1mm)'] = int((dd.o >= 1).sum())
        for fn in ('i', 'c'):
            hit = ((dd[fn] >= 1) & (dd.o >= 1)).sum(); fa = ((dd[fn] >= 1) & (dd.o < 1)).sum(); miss = ((dd[fn] < 1) & (dd.o >= 1)).sum()
            r[f'rain_{"icon" if fn=="i" else "ec"}_hit/false/miss'] = f'{hit}/{fa}/{miss}'
            r[f'rain_{"icon" if fn=="i" else "ec"}_total_ratio'] = round(float(dd[fn].sum() / max(dd.o.sum(), 1e-9)), 2)
    if len(r) > 2: rows.append(r)
for r in rows: print(r)
out['other_vars'] = rows
json.dump(out, open(f'{HERE}/results/fable_misc.json', 'w'), indent=1)
