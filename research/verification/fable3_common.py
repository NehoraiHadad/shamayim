"""Shared helpers for the rain study (fable3_*)."""
import json, importlib.util, numpy as np, pandas as pd
from fable_common import HERE, dist_km
SPLIT_DAY = pd.Timestamp('2025-11-01')
THR = [0.1, 1.0, 5.0, 10.0]
EPS = 1e-6
# gauges left out: 115 Lev Kineret reports 0.0 throughout (dead gauge); 275 Hakfar Hayarok catches ~0.57 of its five
# neighbours' rain month after month on the flat coastal plain (undercatching gauge).
BAD_GAUGES = [115, 275]
REG_EN = {'ים המלח ומדבר יהודה': 'Dead Sea & Judean desert', 'בקעת הירדן': 'Jordan valley', 'ערבה ואילת': 'Arava & Eilat', 'נגב': 'Negev',
          'מישור החוף': 'Coastal plain', 'גולן וחרמון': 'Golan & Hermon', 'הרים (ירושלים, שומרון, גליל)': 'Mountains',
          'שפלה, עמקים ופנים הארץ': 'Shfela, valleys, inland'}
SEA = {0: 'winter DJF', 1: 'spring MAM', 2: 'summer JJA', 3: 'autumn SON'}
def meta():
    d = json.load(open(f'{HERE}/results/fable3_meta.json'))
    mt = pd.DataFrame(d).T.rename_axis('station_id').reset_index().astype({'station_id': int, 'lat': float, 'lon': float, 'om_elev': float}).set_index('station_id')
    spec = importlib.util.spec_from_file_location('vt', f'{HERE}/verify_temp.py'); vt = importlib.util.module_from_spec(spec); spec.loader.exec_module(vt)
    mt['region'] = [REG_EN[vt.region(r.lat, r.lon, r.om_elev if np.isfinite(r.om_elev) else 0)] for r in mt.itertuples()]
    return mt
def daily():
    d = pd.read_parquet(f'{HERE}/data/processed/fable3_rain_daily.parquet'); mt = meta()
    d = d[~d.station_id.isin(BAD_GAUGES)].copy()
    d['region'] = d.station_id.map(mt.region); d['mon'] = d.day.dt.month; d['sea'] = ((d.mon % 12) // 3).map(SEA)
    d['test'] = d.day >= SPLIT_DAY
    # rain year (Aug-Jul) label, e.g. 2025 = winter 2025-26
    d['ryear'] = d.day.dt.year - (d.mon < 8)
    return d
def add_blends(d, L):
    i, e = d[f'i{L}'], d[f'e{L}']
    return {'icon': i, 'ecmwf': e, 'blend.6 (app)': 0.6 * i + 0.4 * e, 'blend.5': 0.5 * i + 0.5 * e, 'blend.4': 0.4 * i + 0.6 * e,
            'blend.2': 0.2 * i + 0.8 * e, 'blend.8': 0.8 * i + 0.2 * e, 'max': np.maximum(i, e), 'min': np.minimum(i, e)}
def cont(f, o, thr):
    """2x2 table scores for 'f >= thr' against 'o >= thr' (numpy arrays, no NaN)."""
    fw = f >= thr - EPS; ow = o >= thr - EPS
    h = int((fw & ow).sum()); m = int((~fw & ow).sum()); fa = int((fw & ~ow).sum()); n = len(o); cn = n - h - m - fa
    hr = (h + m) * (h + fa) / n if n else 0
    den = h + m + fa - hr
    r = lambda x: None if x is None or not np.isfinite(x) else round(float(x), 3)
    return dict(n=n, hits=h, miss=m, fa=fa, obs_wet=h + m, pod=r(h / (h + m)) if h + m else None, far=r(fa / (h + fa)) if h + fa else None,
                fbias=r((h + fa) / (h + m)) if h + m else None, ets=r((h - hr) / den) if den > 0 else None,
                csi=r(h / (h + m + fa)) if h + m + fa else None)
def ets_arr(fw, ow):
    h = (fw & ow).sum(); m = (~fw & ow).sum(); fa = (fw & ~ow).sum(); n = len(ow)
    hr = (h + m) * (h + fa) / n; den = h + m + fa - hr
    return (h - hr) / den if den > 0 else np.nan
