"""Task 2: daily max / min temperature (local civil day, Asia/Jerusalem) as in the app's 7-day view.

Forecast: like Open-Meteo `daily.temperature_2m_max/min` = max/min of the 24 top-of-hour values of the local day,
computed per model from the previous_dayL series (same L for the whole day), then blended (app: 0.6 ICON for day
offsets 0-4, 0.4 after).  Observed: max of the hourly td_max (10-minute TDmax) / min of td_min over the local day;
where a station has no td_max/td_min the top-of-hour td is used (flagged).  `samp` = observed max/min of the
top-of-hour td only, i.e. what a perfect hourly forecast would give -> sampling effect = samp - true.

Timing for adaptive corrections: the day-D forecast at lead L is on screen during local day D-L; the last complete
observed day is D-L-1, so daily error series are used with GAP = L+1 days (gap L = optimistic variant, evening issue)."""
import json, numpy as np, pandas as pd
from fable_common import *
import importlib.util, sys
LD = [0, 1, 2, 4, 6]
m = load(); mt = meta().set_index('station_id')
obs = pd.read_parquet(f'{HERE}/data/processed/ims_hourly.parquet', columns=['time', 'station_id', 'td', 'td_max', 'td_min'])
obs = obs[obs.time >= '2023-12-31']
obs['time'] = obs.time.dt.tz_convert('UTC') if obs.time.dt.tz is not None else obs.time.dt.tz_localize('UTC')
obs['station_id'] = obs.station_id.astype('int64')
m = m.drop(columns=['td']).merge(obs, on=['station_id', 'time'], how='left')
loc = m.time.dt.tz_convert('Asia/Jerusalem')
m['day'] = loc.dt.tz_localize(None).dt.floor('D')                                  # local day of the instant
m['day_end'] = (loc - pd.Timedelta(hours=1)).dt.tz_localize(None).dt.floor('D')    # local day of the hour ending here
g = m.groupby(['station_id', 'day'])
agg = {}
for L in LD:
    for mod in ('icon', 'ec'):
        c = f't_d{L}_{mod}'
        agg[f'x_{mod}{L}'] = g[c].max(); agg[f'n_{mod}{L}'] = g[c].min(); agg[f'c_{mod}{L}'] = g[c].count()
agg['oxs'] = g.td.max(); agg['ons'] = g.td.min(); agg['ocs'] = g.td.count()
d = pd.DataFrame(agg)
g2 = m.groupby(['station_id', 'day_end'])
o2 = pd.DataFrame(dict(ox=g2.td_max.max(), on=g2.td_min.min(), cx=g2.td_max.count(), cn=g2.td_min.count()))
o2.index.names = ['station_id', 'day']
d = d.join(o2, how='left').reset_index()
okh = d.ocs >= 23
d['oxs'] = d.oxs.where(okh); d['ons'] = d.ons.where(okh)
d['ox_true'] = d.ox.where(d.cx >= 22); d['on_true'] = d.on.where(d.cn >= 22)
d['ox_use'] = d.ox_true.fillna(d.oxs); d['on_use'] = d.on_true.fillna(d.ons)
for L in LD:
    w = 0.6 if L < 5 else 0.4
    full = (d[f'c_icon{L}'] >= 23) & (d[f'c_ec{L}'] >= 23)
    d[f'fx{L}'] = (w * d[f'x_icon{L}'] + (1 - w) * d[f'x_ec{L}']).where(full)
    d[f'fn{L}'] = (w * d[f'n_icon{L}'] + (1 - w) * d[f'n_ec{L}']).where(full)
    for mod in ('icon', 'ec'):
        d[f'fx{L}_{mod}'] = d[f'x_{mod}{L}'].where(full); d[f'fn{L}_{mod}'] = d[f'n_{mod}{L}'].where(full)
spec = importlib.util.spec_from_file_location('vt', f'{HERE}/verify_temp.py'); vt = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(vt); regf = vt.region
except Exception as ex:
    print('region import failed', ex); regf = lambda la, lo, el: 'all'
REG_EN = {'ים המלח ומדבר יהודה': 'Dead Sea & Judean desert', 'בקעת הירדן': 'Jordan valley', 'ערבה ואילת': 'Arava & Eilat', 'נגב': 'Negev',
          'מישור החוף': 'Coastal plain', 'גולן וחרמון': 'Golan & Hermon', 'הרים (ירושלים, שומרון, גליל)': 'Mountains',
          'שפלה, עמקים ופנים הארץ': 'Shfela, valleys, inland'}
reg = {s: REG_EN.get(regf(mt.lat[s], mt.lon[s], mt.om_elev[s] if np.isfinite(mt.om_elev[s]) else 0), '?') for s in mt.index}
d['region'] = d.station_id.map(reg)
d['mon'] = d.day.dt.month; d['sea'] = (d.mon % 12) // 3
SEA = {0: 'winter DJF', 1: 'spring MAM', 2: 'summer JJA', 3: 'autumn SON'}
out = {'timing': __doc__}
ok = d.ox_use.notna() & d.on_use.notna()
for L in LD: ok &= d[f'fx{L}'].notna()
c = d[ok].copy()
out['n_station_days'] = int(len(c)); out['n_stations'] = int(c.station_id.nunique())
out['stations_with_true_max'] = int(c[c.ox_true.notna()].station_id.nunique()); out['stations_with_true_min'] = int(c[c.on_true.notna()].station_id.nunique())
out['share_days_true_max'] = round(float(c.ox_true.notna().mean()), 3); out['share_days_true_min'] = round(float(c.on_true.notna().mean()), 3)
print({k: v for k, v in out.items() if k != 'timing'})
# ---- sampling effect
both = c[c.ox_true.notna() & c.on_true.notna() & c.oxs.notna()]
se = dict(max_all=round(float((both.oxs - both.ox_true).mean()), 3), min_all=round(float((both.ons - both.on_true).mean()), 3),
          max_by_season={SEA[k]: round(float(v), 3) for k, v in (both.oxs - both.ox_true).groupby(both.sea).mean().items()},
          min_by_season={SEA[k]: round(float(v), 3) for k, v in (both.ons - both.on_true).groupby(both.sea).mean().items()},
          max_by_region=(both.oxs - both.ox_true).groupby(both.region).mean().round(3).to_dict(),
          min_by_region=(both.ons - both.on_true).groupby(both.region).mean().round(3).to_dict(),
          max_p90=round(float((both.ox_true - both.oxs).quantile(.9)), 2), min_p90=round(float((both.ons - both.on_true).quantile(.9)), 2))
out['sampling_effect_obs_hourly_minus_true'] = se; print('sampling', se)
# ---- raw scores (true-extreme days only, so the sampling decomposition is exact)
def sc(e): return dict(n=int(e.notna().sum()), bias=round(float(e.mean()), 3), mae=round(float(e.abs().mean()), 3))
rows = []
for L in LD:
    for v, f, ot, os_ in (('max', f'fx{L}', 'ox_true', 'oxs'), ('min', f'fn{L}', 'on_true', 'ons')):
        b = both
        r = dict(lead=L, var=v, **sc(b[f] - b[ot]))
        r['bias_vs_hourly_obs'] = round(float((b[f] - b[os_]).mean()), 3); r['mae_vs_hourly_obs'] = round(float((b[f] - b[os_]).abs().mean()), 3)
        r['sampling_part'] = round(float((b[os_] - b[ot]).mean()), 3)
        r['icon_bias'] = round(float((b[f + '_icon'] - b[ot]).mean()), 3); r['icon_mae'] = round(float((b[f + '_icon'] - b[ot]).abs().mean()), 3)
        r['ec_bias'] = round(float((b[f + '_ec'] - b[ot]).mean()), 3); r['ec_mae'] = round(float((b[f + '_ec'] - b[ot]).abs().mean()), 3)
        rows.append(r)
out['raw_by_lead'] = rows
pd.set_option('display.width', 250); print(pd.DataFrame(rows).to_string())
for by, nm in (('region', 'by_region'), ('sea', 'by_season')):
    t = {}
    for L in (1, 4):
        for v, f, ot in (('max', f'fx{L}', 'ox_true'), ('min', f'fn{L}', 'on_true')):
            e = both[f] - both[ot]
            a = e.groupby(both[by]).agg(n='size', bias='mean', mae=lambda x: x.abs().mean()).round(3)
            if by == 'sea': a.index = [SEA[i] for i in a.index]
            t[f'{v}_d{L}'] = a.reset_index().rename(columns={'index': by}).to_dict('records')
            print(nm, v, 'lead', L); print(a.to_string())
    out[nm] = t
# region x season for lead 1
t = {}
for v, f, ot in (('max', 'fx1', 'ox_true'), ('min', 'fn1', 'on_true')):
    e = both[f] - both[ot]
    a = e.groupby([both.region, both.sea.map(SEA)]).mean().unstack().round(2); t[v] = a.to_dict('index'); print('bias region x season', v); print(a.to_string())
out['bias_region_season_d1'] = t

# ================= corrections (all stations, ox_use/on_use targets) =================
sids = sorted(c.station_id.unique()); S = len(sids)
days = pd.date_range(c.day.min(), c.day.max(), freq='D'); ND = len(days)
def dense(col, src=d):
    return src.pivot(index='day', columns='station_id', values=col).reindex(index=days, columns=sids).values.T.astype('float64')
COMMON = dense('ox_use', c); COMMON = np.isfinite(COMMON)
mon = days.month.values; sea = (mon % 12) // 3
SPLd = pd.Timestamp('2025-11-01'); TUNEd = pd.Timestamp('2025-01-01')
is_test = days >= SPLd; is_tune = (days >= TUNEd) & (days < SPLd)
D = dist_matrix(meta()).loc[sids, sids].values
Wn = np.ones((S, S)); np.fill_diagonal(Wn, 0)
Wg = np.exp(-(D / 40.0) ** 2); np.fill_diagonal(Wg, 0)
def spread(B, W):
    f = np.isfinite(B); num = W @ np.where(f, B, 0); den = W @ f.astype(float)
    return np.where(den > 1e-6, num / np.maximum(den, 1e-6), np.nan)
def roll(e, N, gap):
    f = np.isfinite(e); x = np.where(f, e, 0).cumsum(1); n = f.cumsum(1)
    ws = x.copy(); ws[:, N:] -= x[:, :-N]; wn = n.copy(); wn[:, N:] -= n[:, :-N]
    est = np.where(wn >= max(2, 0.5 * N), ws / np.maximum(wn, 1), np.nan)
    o = np.full(e.shape, np.nan); o[:, gap:] = est[:, :-gap]; return o
def kalman(e, ratio, gap):
    F = np.full(e.shape, np.nan); b = np.zeros(S); P = np.ones(S); seen = np.zeros(S, bool)
    for k in range(ND):
        y = e[:, k]; f = np.isfinite(y); P = P + ratio; K = P / (P + 1)
        b = np.where(f, b + K * (np.where(f, y, 0) - b), b); P = np.where(f, (1 - K) * P, P); seen |= f
        F[:, k] = np.where(seen, b, np.nan)
    o = np.full(e.shape, np.nan); o[:, gap:] = F[:, :-gap]; return o
def table(e, fit, key, nk):
    tab = np.zeros((S, nk))
    for q in range(nk):
        k = fit & (key == q)
        if k.any():
            with np.errstate(all='ignore'): tab[:, q] = np.nan_to_num(np.nanmean(e[:, k], axis=1))
    return tab[:, key]
# hourly-table route: correct the hourly blend with the own / LOSO-national hour x season table, then take max/min
hs = (m.time.dt.month % 12) // 3
def hourly_route(L, fit_end):
    col = f't_d{L}_bl'; e = (m[col] - m.td)
    tr = m.time < fit_end
    tab = e[tr].groupby([m.station_id[tr], m.hod[tr], hs[tr]]).mean()
    idx = pd.MultiIndex.from_arrays([m.station_id, m.hod, hs])
    own = pd.Series(tab.reindex(idx).values, index=m.index).fillna(0)
    gs = tab[tab.index.get_level_values(0).isin(sids)].groupby(level=[1, 2])
    tb = tab[tab.index.get_level_values(0).isin(sids)]
    loso = (gs.transform('sum') - tb) / (gs.transform('count') - 1)
    lo = pd.Series(loso.reindex(idx).values, index=m.index).fillna(0)
    res = {}
    for nm, corr in (('own', own), ('loso', lo)):
        x = (m[col] - corr)
        gg = x.groupby([m.station_id, m.day])
        t = pd.DataFrame(dict(mx=gg.max(), mn=gg.min(), n=gg.count())).reset_index()
        t.loc[t.n < 23, ['mx', 'mn']] = np.nan
        res[nm] = (dense('mx', t), dense('mn', t))
    return res
NS = [3, 7, 15, 30, 45]; RAT = [0.003, 0.01, 0.03, 0.1, 0.3]; SHR = [0.6, 0.8, 1.0]
def run(period):
    ev_t = is_test if period == 'test' else is_tune
    fit_end = SPLd if period == 'test' else TUNEd
    fit = days < fit_end; res = {}
    for L in (1, 2, 4, 6):
        hr = hourly_route(L, pd.Timestamp(fit_end, tz='UTC'))
        for v, fcol, ocol, hi in (('max', f'fx{L}', 'ox_use', 0), ('min', f'fn{L}', 'on_use', 1)):
            O = dense(ocol); Fc = dense(fcol); e = Fc - O
            ev = COMMON & ev_t[None, :] & np.isfinite(e)
            def mae(corr): return round(float(np.abs(e - np.nan_to_num(corr))[ev].mean()), 4)
            def bias(corr): return round(float((e - np.nan_to_num(corr))[ev].mean()), 4)
            st_c = table(e, fit, np.zeros(ND, int), 1); st_s = table(e, fit, sea, 4); st_m = table(e, fit, mon - 1, 12)
            o = {'raw': mae(0 * e), 'raw_bias': bias(0 * e), 'own const': mae(st_c), 'own season': mae(st_s), 'own month': mae(st_m),
                 'loso const': mae(spread(st_c, Wn)), 'loso season': mae(spread(st_s, Wn)), 'loso month': mae(spread(st_m, Wn)),
                 'loso regional(g40) season': mae(spread(st_s, Wg))}
            # hourly-table route (+ residual season constant fit on the fit period)
            for nm in ('own', 'loso'):
                eh = hr[nm][hi] - O
                o[f'hourly-table({nm}) then {v}'] = round(float(np.abs(eh)[ev & np.isfinite(eh)].mean()), 4)
                o[f'hourly-table({nm}) then {v}: bias left'] = round(float(eh[ev & np.isfinite(eh)].mean()), 4)
                if nm == 'own':
                    r2 = table(eh, fit, sea, 4); o[f'hourly-table(own) then {v} + own season offset'] = round(float(np.abs(eh - r2)[ev & np.isfinite(eh)].mean()), 4)
                else:
                    r2 = spread(table(eh, fit, sea, 4), Wn); o[f'hourly-table(loso) then {v} + loso season offset'] = round(float(np.abs(eh - r2)[ev & np.isfinite(eh)].mean()), 4)
            r = e - st_s; nat_s = spread(st_s, Wn); reg_s = spread(st_s, Wg)
            for gap, tag in ((L + 1, ''), (L, '@gapL')):
                ests = {f'roll_{N}': (roll(e, N, gap), roll(r, N, gap)) for N in NS}
                ests.update({f'kal_{q}': (kalman(e, q, gap), kalman(r, q, gap)) for q in RAT})
                for nm, (a, ar) in ests.items():
                    na, nar, ga, gar = spread(a, Wn), spread(ar, Wn), spread(a, Wg), spread(ar, Wg)
                    for s in SHR:
                        sg = '' if s == 1 else f'*{s}'
                        o[f'{nm}{sg}{tag}'] = mae(s * a); o[f'st+{nm}{sg}{tag}'] = mae(st_s + s * np.nan_to_num(ar))
                        o[f'nat/{nm}{sg}{tag}'] = mae(s * na); o[f'nat/st+{nm}{sg}{tag}'] = mae(nat_s + s * np.nan_to_num(nar))
                        o[f'g40/{nm}{sg}{tag}'] = mae(s * ga); o[f'g40/st+{nm}{sg}{tag}'] = mae(reg_s + s * np.nan_to_num(gar))
                        o[f'st+nat/{nm}{sg}{tag}'] = mae(st_s + s * np.nan_to_num(nar))
            res[f'{v}_d{L}'] = o
    return res
tune = run('tune'); test = run('test')
fams = {'own: rolling raw': lambda k: k.startswith('roll_'), 'own: kalman raw': lambda k: k.startswith('kal_'),
        'own: season table + rolling resid': lambda k: k.startswith('st+roll_'), 'own: season table + kalman resid': lambda k: k.startswith('st+kal_'),
        'own: season table + national adaptive resid': lambda k: k.startswith('st+nat/'),
        'loso: national adaptive raw': lambda k: k.startswith('nat/') and not k.startswith('nat/st'),
        'loso: national season + adaptive resid': lambda k: k.startswith('nat/st+'),
        'loso: regional adaptive raw': lambda k: k.startswith('g40/') and not k.startswith('g40/st'),
        'loso: regional season + adaptive resid': lambda k: k.startswith('g40/st+')}
summ = {}
for key in test:
    rows = {k: (None, v) for k, v in test[key].items() if not any(k.startswith(p) for p in ('roll_', 'kal_', 'st+', 'nat/', 'g40/'))}
    for tag in ('', '@gapL'):
        for fam, fn in fams.items():
            ks = [k for k in tune[key] if fn(k) and k.endswith('@gapL') == bool(tag)]
            kb = min(ks, key=lambda k: tune[key][k]); ko = min(ks, key=lambda k: test[key][k])
            rows[fam + (' [gap L, optimistic]' if tag else '')] = (kb, test[key][kb], tune[key][kb], ko, test[key][ko])
    summ[key] = rows
    print(f'\n=== {key} (test MAE; adaptive configs chosen on tune period) ===')
    for k, v in rows.items():
        print(f'{k:58s} {v[1]:.3f}' + (f'   {v[0]} (tune {v[2]:.3f}; test-oracle {v[3]} {v[4]:.3f})' if v[0] else ''))
out['corrections_summary'] = summ; out['corrections_test'] = test; out['corrections_tune'] = tune
json.dump(out, open(f'{HERE}/results/fable2_daily.json', 'w'), indent=1, default=str, ensure_ascii=False)
