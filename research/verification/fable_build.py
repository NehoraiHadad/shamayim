"""Build one merged table: Open-Meteo previous-runs forecasts + IMS hourly obs (UTC).
Output: data/processed/fable_merged.parquet (git-ignored size? ~ small) and fable_meta.json"""
import gzip, json, glob, os, numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
st = json.load(open(f'{HERE}/om_stations.json'))
meta = {}
frames = []
for s in st:
    sid = s['id']
    obs_p = f'{HERE}/data/processed/ims_hourly/{sid}.parquet'
    if not os.path.exists(obs_p):
        continue
    parts = []
    for y in (2024, 2025, 2026):
        p1 = f'{HERE}/om-archive/pass1/{sid}_{y}.json.gz'
        if not os.path.exists(p1):
            continue
        d = json.load(gzip.open(p1))
        df = pd.DataFrame(d['hourly'])
        p2 = f'{HERE}/om-archive/pass2/{sid}_{y}.json.gz'
        if os.path.exists(p2):
            d2 = json.load(gzip.open(p2))
            df2 = pd.DataFrame(d2['hourly'])
            df = df.merge(df2, on='time', how='left')
        meta[sid] = dict(name=s['name'], lat=s['lat'], lon=s['lon'], om_elev=d.get('elevation'),
                         om_lat=d.get('latitude'), om_lon=d.get('longitude'))
        parts.append(df)
    if not parts:
        continue
    f = pd.concat(parts, ignore_index=True)
    f['time'] = pd.to_datetime(f['time'], utc=True)
    o = pd.read_parquet(obs_p)
    o = o[o.time >= '2023-12-31']
    o['time'] = o['time'].dt.tz_convert('UTC') if o.time.dt.tz is not None else o.time.dt.tz_localize('UTC')
    keep = [c for c in ['time', 'td', 'rh', 'ws', 'ws_at_hour', 'ws_gust', 'wd', 'rain', 'grad'] if c in o.columns]
    f = f.merge(o[keep], on='time', how='left')
    f['station_id'] = sid
    frames.append(f)
m = pd.concat(frames, ignore_index=True)
ren = {}
for c in m.columns:
    n = c.replace('temperature_2m', 't').replace('wind_gusts_10m', 'g').replace('relative_humidity_2m', 'h') \
         .replace('precipitation', 'p').replace('_previous_day', '_d').replace('_icon_seamless', '_icon').replace('_ecmwf_ifs025', '_ec')
    ren[c] = n
m = m.rename(columns=ren)
for c in m.columns:
    if m[c].dtype == 'float64' or m[c].dtype == object and c not in ('time',):
        m[c] = pd.to_numeric(m[c], errors='coerce').astype('float32')
m = m.rename(columns={'t_icon': 't_d0_icon', 't_ec': 't_d0_ec', 'g_icon': 'g_d0_icon', 'g_ec': 'g_d0_ec', 'h_icon': 'h_d0_icon', 'h_ec': 'h_d0_ec'})
m.to_parquet(f'{HERE}/data/processed/fable_merged.parquet')
json.dump(meta, open(f'{HERE}/results/fable_meta.json', 'w'), indent=0)
print(m.shape, m.station_id.nunique()); print(m.columns.tolist())
print(m.notna().mean().round(3))
print(m.time.min(), m.time.max())
