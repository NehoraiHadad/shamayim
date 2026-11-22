"""Task 1: adaptive bias correction of 2 m temperature (blend), leads 1/2/4/6, with and without own station.

Information timing. previous_dayL at valid time t is the forecast that was on screen L*24 h earlier, so the
"issue time" of a lead-L forecast is t - 24L h.  An adaptive correction may only use errors that were already
verified then: same-lead errors with valid time t' <= t - 24*GAP h, GAP = L (default; the newest usable error is
the one valid at the issue hour itself, i.e. it assumes the IMS observation of the issue hour is in hand).
GAP = L+1 is the conservative variant (observations lag by up to a day).  All windows / filters below end at
t - 24*GAP h.

Families (own station):
  roll_<cls>_<N>   mean error over the last N days, by class of hour: all | dn (day/night) | h3 (3 h bins) | hod
  kal_<ratio>      scalar random-walk Kalman filter per station x hour of day, Q/R = ratio
  static           hour x season table fit on the fit period (the 0.893 baseline)
  st+...           static table + the same adaptive estimators run on the residual (error - static table)
  expand           hour x season table that keeps accumulating all errors up to the issue time
National (leave-station-out; target station's own observations are never used):
  nat/<kernel>     mean (kernel: nat = all other stations equally, g30/g60 = gaussian distance kernel, k5 = 5 nearest)
                   of the OTHER stations' adaptive estimates; "st+" = LOSO static table + others' adaptive residual.
Hyper-parameters are selected on a tuning period (2025-01-01 .. 2025-10-31; static table fit < 2025-01-01) and
then scored on the test period (>= 2025-11-01; static table fit on the whole train period)."""
import json, sys, numpy as np, pandas as pd
from fable_common import *

LD = [1, 2, 4, 6]
NS = [3, 7, 15, 30, 45]
RATIOS = [0.003, 0.01, 0.02, 0.05, 0.1, 0.2]
SHR = [0.6, 0.8, 1.0]
TUNE0 = pd.Timestamp('2025-01-01', tz='UTC')

m = load(); mt = meta()
ok = m.td.notna()
for L in LEADS:
    ok &= m[f't_d{L}_icon'].notna() & m[f't_d{L}_ec'].notna()
m['common'] = ok
c = m[ok]
cnt_tr = c[c.time < SPLIT].groupby('station_id').size(); cnt_te = c[c.time >= SPLIT].groupby('station_id').size()
sids = [s for s in sorted(set(cnt_tr.index) & set(cnt_te.index)) if cnt_tr[s] > 4000 and cnt_te[s] > 2000]
m = m[m.station_id.isin(sids)]
t0 = pd.Timestamp('2024-01-01', tz='UTC')
ND = int((m.time.max() - t0).days) + 1
times = pd.date_range(t0, periods=ND * 24, freq='h')
S, T = len(sids), ND * 24
def dense(col):
    w = m.pivot(index='time', columns='station_id', values=col).reindex(index=times, columns=sids)
    return w.values.T.astype('float32')            # (S, T)
OBS = dense('td'); COMMON = dense('common') == 1
E = {L: dense(f't_d{L}_bl') - OBS for L in LD}
hod = np.tile(np.arange(24), ND); mon = times.month.values; sea = (mon % 12) // 3
is_test = (times >= SPLIT); is_tune = (times >= TUNE0) & (times < SPLIT)
D = dist_matrix(mt).loc[sids, sids].values
print('stations', S, 'days', ND, 'test rows', int((COMMON & is_test).sum()))

CLS = {'all': np.zeros(24, int), 'dn': ((np.arange(24) >= 4) & (np.arange(24) < 16)).astype(int),   # day = 06-18 local
       'h3': np.arange(24) // 3, 'hod': np.arange(24)}

def roll(e, cls, N, gap):
    """mean of e over (t-24gap-24N, t-24gap], restricted to hours in the same class as t."""
    out = np.full(e.shape, np.nan, 'float32')
    ch = CLS[cls][hod]; fin = np.isfinite(e); W = 24 * N; sh = 24 * gap
    for k in np.unique(ch):
        mk = (ch == k)
        x = np.where(fin & mk, e, 0).astype('float64').cumsum(1); n = (fin & mk).cumsum(1)
        ws = x.copy(); ws[:, W:] -= x[:, :-W]; wn = n.copy(); wn[:, W:] -= n[:, :-W]
        est = np.where(wn >= 0.5 * N * mk[:24].sum(), ws / np.maximum(wn, 1), np.nan)
        sel = np.where(mk)[0]; sel = sel[sel >= sh]
        out[:, sel] = est[:, sel - sh]
    return out

def kalman(e, ratio, gap):
    """random-walk bias per station x hod; prediction for day d = filtered state after day d-gap."""
    x3 = e.reshape(S, ND, 24); F = np.full(x3.shape, np.nan, 'float32')
    b = np.zeros((S, 24)); P = np.ones((S, 24)); seen = np.zeros((S, 24), bool)
    for d in range(ND):
        y = x3[:, d]; f = np.isfinite(y); P = P + ratio
        K = P / (P + 1.0)
        b = np.where(f, b + K * (np.where(f, y, 0) - b), b); P = np.where(f, (1 - K) * P, P); seen |= f
        F[:, d] = np.where(seen, b, np.nan)
    out = np.full(x3.shape, np.nan, 'float32'); out[:, gap:] = F[:, :-gap]
    return out.reshape(S, T)

def static_table(e, fit):
    """own-station hour x season mean error over the fit hours -> (S,T) correction, and the table."""
    tab = np.zeros((S, 24, 4), 'float32')
    for h in range(24):
        for q in range(4):
            k = fit & (hod == h) & (sea == q)
            with np.errstate(all='ignore'):
                tab[:, h, q] = np.nan_to_num(np.nanmean(e[:, k], axis=1)) if k.any() else 0
    return tab[:, hod, sea]

def expanding(e, gap):
    out = np.zeros(e.shape, 'float32')
    for h in range(24):
        for q in range(4):
            k = np.where((hod == h) & (sea == q))[0]
            x = e[:, k]; f = np.isfinite(x)
            cs = np.where(f, x, 0).cumsum(1); cn = f.cumsum(1)
            # entries of the same class are 1 day apart inside a season; shift by `gap` entries (>= gap days)
            est = np.zeros(x.shape, 'float32'); est[:, gap:] = (cs / np.maximum(cn, 1))[:, :-gap]
            out[:, k] = est
    return out

def kern(name):
    if name == 'nat': W = np.ones((S, S))
    elif name[0] == 'g': W = np.exp(-(D / float(name[1:])) ** 2)
    elif name[0] == 'k':
        W = np.zeros((S, S)); Dx = D.copy(); np.fill_diagonal(Dx, np.inf)
        idx = np.argsort(Dx, 1)[:, :int(name[1:])]; np.put_along_axis(W, idx, 1, 1)
    W = W.copy(); np.fill_diagonal(W, 0)
    return W
KERN = {k: kern(k) for k in ('nat', 'g60', 'g30', 'k5')}
def spread(B, W):
    """leave-station-out weighted mean of the other stations' estimates B (S,T)."""
    f = np.isfinite(B)
    num = W @ np.where(f, B, 0); den = W @ f.astype('float64')
    return np.where(den > 1e-6, num / np.maximum(den, 1e-6), np.nan).astype('float32')

def run(period):
    ev_t = is_test if period == 'test' else is_tune
    fit = (times < (SPLIT if period == 'test' else TUNE0))
    res = {}
    for L in LD:
        e = E[L]; ev = COMMON & ev_t[None, :] & np.isfinite(e)
        st = static_table(e, fit); r = e - st
        def mae(corr, fb=0.0):
            cc = np.where(np.isfinite(corr), corr, fb)
            return round(float(np.abs(e - cc)[ev].mean()), 4)
        o = {'raw': mae(np.zeros_like(e)), 'static': mae(st)}
        natst = {k: spread(st, W) for k, W in KERN.items()}
        for k in KERN: o[f'{k}/static'] = mae(natst[k])
        for gap, gtag in ((L, ''), (L + 1, '@lag1d')):
            ests = {}
            for cls in CLS:
                for N in NS:
                    if cls == 'all' and N == 3 and False: continue
                    ests[f'roll_{cls}_{N}'] = (roll(e, cls, N, gap), roll(r, cls, N, gap))
            for q in RATIOS:
                ests[f'kal_{q}'] = (kalman(e, q, gap), kalman(r, q, gap))
            for name, (a_raw, a_res) in ests.items():
                for s in SHR:
                    stg = '' if s == 1 else f'*{s}'
                    o[f'{name}{stg}{gtag}'] = mae(s * a_raw)
                    o[f'st+{name}{stg}{gtag}'] = mae(st + s * np.nan_to_num(a_res))
                if gtag and not name.startswith(('roll_hod', 'kal')): continue
                for k, W in KERN.items():
                    if k != 'nat' and gtag: continue
                    b_raw = spread(a_raw, W); b_res = spread(a_res, W)
                    for s in SHR:
                        stg = '' if s == 1 else f'*{s}'
                        o[f'{k}/{name}{stg}{gtag}'] = mae(s * b_raw)
                        o[f'{k}/st+{name}{stg}{gtag}'] = mae(natst[k] + s * np.nan_to_num(b_res))
                    # own static table + national adaptive residual (regime signal from the network, for a station)
                    if k == 'nat': o[f'st+nat/{name}{gtag}'] = mae(st + np.nan_to_num(b_res))
            o[f'expand{gtag}'] = mae(expanding(e, gap))
        if L > 1:   # fresher but shorter-lead error series: lead-1 errors verified by the issue time
            e1 = E[1]; st1 = static_table(e1, fit)
            for N in (7, 15, 30):
                o[f'src_d1:roll_hod_{N}'] = mae(roll(e1, 'hod', N, L))
                o[f'src_d1:st+roll_hod_{N}'] = mae(st + np.nan_to_num(roll(e1 - st1, 'hod', N, L)))
        res[L] = o
        print(period, 'lead', L, 'done', flush=True)
    return res

if __name__ == '__main__':
    tune = run('tune'); test = run('test')
    fams = {'own: rolling raw (best N, class)': lambda k: k.startswith('roll_'),
            'own: rolling raw, per hod': lambda k: k.startswith('roll_hod_'),
            'own: kalman raw': lambda k: k.startswith('kal_'),
            'own: static + rolling residual': lambda k: k.startswith('st+roll_'),
            'own: static + kalman residual': lambda k: k.startswith('st+kal_'),
            'own: static + national adaptive residual': lambda k: k.startswith('st+nat/'),
            'loso: national adaptive raw': lambda k: k.startswith('nat/') and not k.startswith('nat/st'),
            'loso: national static + adaptive residual': lambda k: k.startswith('nat/st+'),
            'loso: regional adaptive raw': lambda k: k.startswith(('g30/', 'g60/', 'k5/')) and '/st' not in k,
            'loso: regional static + adaptive residual': lambda k: k.startswith(('g30/st+', 'g60/st+', 'k5/st+'))}
    summ = {}
    for L in LD:
        rows = {'raw': (None, test[L]['raw']), 'own static table': (None, test[L]['static']),
                'own expanding table': (None, test[L]['expand']), 'loso national static': (None, test[L]['nat/static'])}
        for lag in ('', '@lag1d'):
            for fam, fn in fams.items():
                ks = [k for k in tune[L] if fn(k) and k.endswith('@lag1d') == bool(lag)]
                if not ks: continue
                kb = min(ks, key=lambda k: tune[L][k])       # selected on the tuning period
                ko = min(ks, key=lambda k: test[L][k])       # oracle on test (how much selection costs)
                rows[fam + (' [obs lag 1 d]' if lag else '')] = (kb, test[L][kb], tune[L][kb], ko, test[L][ko])
        summ[L] = rows
        print(f'\n=== lead {L} (test MAE; config chosen on tune period) ===')
        for k, v in rows.items():
            print(f'{k:58s} {v[1]:.3f}' + (f'   {v[0]}  (tune {v[2]:.3f}; test-oracle {v[3]} {v[4]:.3f})' if v[0] else ''))
    json.dump(dict(timing=__doc__, n_stations=S, summary={str(k): v for k, v in summ.items()},
                   test={str(k): v for k, v in test.items()}, tune={str(k): v for k, v in tune.items()}),
              open(f'{HERE}/results/fable2_adaptive.json', 'w'), indent=1)
