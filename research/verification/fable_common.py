import json, os, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
SPLIT = pd.Timestamp('2025-11-01', tz='UTC')
LEADS = [0, 1, 2, 4, 6]
def load():
    m = pd.read_parquet(f'{HERE}/data/processed/fable_merged.parquet')
    for L in LEADS:
        w = 0.6 if L < 5 else 0.4   # app: icon weight 0.6 for day offsets 0-4, 0.4 after
        m[f't_d{L}_bl'] = w * m[f't_d{L}_icon'] + (1 - w) * m[f't_d{L}_ec']
    m['hod'] = m.time.dt.hour.astype('int8')          # UTC hour; local standard = +2
    m['mon'] = m.time.dt.month.astype('int8')
    return m
def meta():
    d = json.load(open(f'{HERE}/results/fable_meta.json'))
    return pd.DataFrame(d).T.rename_axis('station_id').reset_index().astype({'station_id': int, 'lat': float, 'lon': float, 'om_elev': float})
def dist_km(lat1, lon1, lat2, lon2):
    p = np.pi / 180
    a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 6371 * np.arcsin(np.sqrt(a))
def dist_matrix(mt):
    la, lo = mt.lat.values, mt.lon.values
    D = dist_km(la[:, None], lo[:, None], la[None, :], lo[None, :])
    return pd.DataFrame(D, index=mt.station_id.values, columns=mt.station_id.values)
