"""Task 4: forecast-detectable regimes. All regime flags use forecast-side variables only (lead-1 values), so they
can be evaluated at any location. Error = app blend (lead 1 day) - observation. Tables are over ALL data 2024-2026;
the correction test at the end is fitted on <2025-11-01 on OTHER stations (5 station folds) and scored on >=2025-11-01."""
import json, numpy as np, pandas as pd
from fable_common import *
m = load(); mt = meta().set_index('station_id')
m = m[m.td.notna() & m.t_d1_bl.notna()].copy()
m['e'] = m.t_d1_bl - m.td
m['rh'] = m[['h_d1_icon', 'h_d1_ec']].mean(axis=1)           # forecast RH %
m['gust'] = m.g_d1_icon                                       # forecast gust km/h (ICON; ECMWF d1 gusts absent)
m['pr'] = m[['p_d1_icon', 'p_d1_ec']].max(axis=1)
m['dis'] = m.t_d1_icon - m.t_d1_ec                            # model disagreement
m['rev'] = m.t_d1_bl - m.t_d2_bl                              # run-to-run revision
m['lst'] = (m.hod + 2) % 24                                   # local standard hour
m['sea'] = (m.mon % 12) // 3
m['day'] = (m.time + pd.Timedelta(hours=2)).dt.floor('D')
m['elev'] = m.station_id.map(mt.om_elev); m['lat'] = m.station_id.map(mt.lat); m['lon'] = m.station_id.map(mt.lon)
g = m.groupby(['station_id', 'day'])
m['f_tmax'] = g.t_d1_bl.transform('max'); m['f_tmin'] = g.t_d1_bl.transform('min'); m['f_dtr'] = m.f_tmax - m.f_tmin
m['f_prday'] = g.pr.transform('sum'); m['f_rhmin'] = g.rh.transform('min'); m['f_gustmax'] = g.gust.transform('max')
# night gust: mean forecast gust 20-06 local, attached to each night hour
night = (m.lst >= 20) | (m.lst <= 6)
# forecast anomaly vs the forecast's own station x month x hour mean (train period)
trm = m.time < SPLIT
clim = m[trm].groupby(['station_id', 'mon', 'hod']).t_d1_bl.mean().rename('f_clim')
m = m.join(clim, on=['station_id', 'mon', 'hod']); m['f_anom'] = m.t_d1_bl - m.f_clim
# national hod x season bias table (train) -> residual r (what is left after a location-free climatological fix)
nat = m[trm].groupby(['hod', 'sea']).e.mean().rename('nat')
m = m.join(nat, on=['hod', 'sea']); m['r'] = m.e - m.nat
out = {}
def tab(name, key, sub=None, minn=3000):
    d = m if sub is None else m[sub]
    t = d.groupby(key, observed=True).agg(n=('e', 'size'), stations=('station_id', 'nunique'), days=('day', 'nunique'),
                                          bias=('e', 'mean'), bias_after_nat=('r', 'mean'), mae=('e', lambda x: x.abs().mean()),
                                          p_over3=('e', lambda x: (x.abs() > 3).mean() * 100)).round(2)
    t = t[t.n >= minn]
    print(f'\n== {name}'); print(t.to_string()); out[name] = t.reset_index().astype(str).to_dict('records'); return t
pd.set_option('display.width', 250)
m['rh_bin'] = pd.cut(m.rh, [0, 15, 25, 40, 60, 80, 101]); m['gust_bin'] = pd.cut(m.gust, [0, 10, 20, 35, 50, 70, 200])
m['dis_bin'] = pd.cut(m.dis, [-20, -3, -2, -1, 0, 1, 2, 3, 20]); m['rev_bin'] = pd.cut(m.rev, [-20, -3, -1.5, -0.5, 0.5, 1.5, 3, 20])
m['anom_bin'] = pd.cut(m.f_anom, [-30, -6, -3, -1, 1, 3, 6, 30]); m['dn'] = np.where(night, 'night', np.where((m.lst >= 10) & (m.lst <= 17), 'day', 'trans'))
m['pr_bin'] = pd.cut(m.pr, [-1, 0, 0.5, 2, 100]); m['dtr_bin'] = pd.cut(m.f_dtr, [0, 6, 9, 12, 15, 40])
tab('forecast RH x day/night', ['dn', 'rh_bin'])
tab('forecast gust x day/night', ['dn', 'gust_bin'])
tab('model disagreement icon-ecmwf', ['dis_bin'])
tab('run-to-run revision d1-d2', ['rev_bin'])
tab('forecast anomaly vs own climate x day/night', ['dn', 'anom_bin'])
tab('hourly forecast precip', ['dn', 'pr_bin'])
tab('forecast diurnal range x day/night', ['dn', 'dtr_bin'])
# named regimes
north = (m.lat > 31.4) & (m.elev > -100)        # non-desert part of the country
reg = {
 'sharav/dry-east day (N of 31.4, RH<=20, anom>=+3, 10-17 LST)': north & (m.rh <= 20) & (m.f_anom >= 3) & (m.dn == 'day'),
 'sharav night (N, RH<=25, anom>=+3, night)': north & (m.rh <= 25) & (m.f_anom >= 3) & night,
 'dry night any anomaly (N, RH<=30, night)': north & (m.rh <= 30) & night,
 'calm dry night (gust<=12, RH<=60, night)': night & (m.gust <= 12) & (m.rh <= 60),
 'calm humid night (gust<=12, RH>=85, night)': night & (m.gust <= 12) & (m.rh >= 85),
 'calm night in valley/lowland inland (elev<300, lon-coast>0.15)': night & (m.gust <= 12) & (m.elev < 300),
 'windy night (gust>=40, night)': night & (m.gust >= 40),
 'rain hour (pr>=0.5)': m.pr >= 0.5,
 'rainy day daytime (day sum>=5mm, 10-17)': (m.f_prday >= 5) & (m.dn == 'day'),
 'rainy day night': (m.f_prday >= 5) & night,
 'strong wind hour (gust>=60)': m.gust >= 60,
 'cold spell (anom<=-5)': m.f_anom <= -5,
 'heat spell day (anom>=+6, day)': (m.f_anom >= 6) & (m.dn == 'day'),
 'models disagree >=3 (icon warmer)': m.dis >= 3, 'models disagree <=-3 (icon colder)': m.dis <= -3,
 'all': m.e.notna(),
}
rows = []
for k, mask in reg.items():
    d = m[mask]
    rows.append(dict(regime=k, n=len(d), stations=d.station_id.nunique(), days=d.day.nunique(), bias=d.e.mean(), bias_after_nat=d.r.mean(),
                     mae=d.e.abs().mean(), p_over3=(d.e.abs() > 3).mean() * 100,
                     icon_bias=(d.t_d1_icon - d.td).mean(), ec_bias=(d.t_d1_ec - d.td).mean(),
                     icon_mae=(d.t_d1_icon - d.td).abs().mean(), ec_mae=(d.t_d1_ec - d.td).abs().mean(),
                     frac_stations_same_sign=float((np.sign(d.groupby('station_id').r.mean()) == np.sign(d.r.mean())).mean())))
rt = pd.DataFrame(rows); print('\n== named regimes'); print(rt.round(2).to_string()); out['named'] = rt.round(3).to_dict('records')
m.drop(columns=[c for c in m.columns if c.endswith('_bin')]).to_parquet(f'{HERE}/data/processed/fable_regime_features.parquet')
json.dump(out, open(f'{HERE}/results/fable_regimes.json', 'w'), indent=1, ensure_ascii=False)
