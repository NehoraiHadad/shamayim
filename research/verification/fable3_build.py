"""Rain study, step 1: merge Open-Meteo previous-runs precipitation (pass2: lead 1; pass3: lead 0 and 2) with IMS hourly
rain, per station.  Writes data/processed/fable3_rain_hourly.parquet (hour ending at `time`, UTC, mm) and
data/processed/fable3_rain_daily.parquet (local civil day, Asia/Jerusalem, the sum of the hours stamped 00:00..23:00
local like Open-Meteo's daily precipitation_sum; the same convention for forecast and gauge).
Columns: o = gauge; i0,i1,i2 = ICON at lead 0/1/2 days; e0,e1,e2 = ECMWF."""
import gzip, json, os, numpy as np, pandas as pd
from fable_common import HERE
st = json.load(open(f'{HERE}/om_stations.json'))
obs = pd.read_parquet(f'{HERE}/data/processed/ims_hourly.parquet', columns=['time', 'station_id', 'rain'])
obs = obs[obs.time >= '2023-12-31'].rename(columns={'rain': 'o'})
obs['station_id'] = obs.station_id.astype('int64')
REN = {'precipitation_icon_seamless': 'i0', 'precipitation_ecmwf_ifs025': 'e0',
       'precipitation_previous_day1_icon_seamless': 'i1', 'precipitation_previous_day1_ecmwf_ifs025': 'e1',
       'precipitation_previous_day2_icon_seamless': 'i2', 'precipitation_previous_day2_ecmwf_ifs025': 'e2'}
frames = []; meta = {}
for s in st:
    sid = s['id']
    o = obs[obs.station_id == sid]
    if o.o.notna().sum() < 24 * 60: continue
    parts = []
    for y in (2024, 2025, 2026):
        p3, p2 = f'{HERE}/om-archive/pass3/{sid}_{y}.json.gz', f'{HERE}/om-archive/pass2/{sid}_{y}.json.gz'
        if not (os.path.exists(p3) and os.path.exists(p2)): continue
        d3 = json.load(gzip.open(p3)); d2 = json.load(gzip.open(p2))
        a = pd.DataFrame(d3['hourly'])[['time'] + [c for c in REN if c in d3['hourly']]]
        b = pd.DataFrame(d2['hourly'])[['time'] + [c for c in REN if c in d2['hourly']]]
        parts.append(a.merge(b, on='time', how='outer'))
        meta[sid] = dict(name=s['name'], lat=s['lat'], lon=s['lon'], om_elev=d3.get('elevation'))
    if not parts: continue
    f = pd.concat(parts, ignore_index=True).rename(columns=REN)
    f['time'] = pd.to_datetime(f['time'], utc=True)
    for c in REN.values(): f[c] = pd.to_numeric(f[c], errors='coerce').astype('float32')
    f = f.merge(o[['time', 'o']], on='time', how='left'); f['station_id'] = sid
    frames.append(f)
h = pd.concat(frames, ignore_index=True)
h.to_parquet(f'{HERE}/data/processed/fable3_rain_hourly.parquet')
json.dump(meta, open(f'{HERE}/results/fable3_meta.json', 'w'))
print(h.shape, h.station_id.nunique(), h.time.min(), h.time.max()); print(h.notna().mean().round(4))
V = ['o'] + list(REN.values())
h['day'] = h.time.dt.tz_convert('Asia/Jerusalem').dt.tz_localize(None).dt.floor('D')
g = h.groupby(['station_id', 'day'])
d = g[V].sum(min_count=1).join(g[V].count().add_prefix('n_')).reset_index()
for c in V: d[c] = d[c].where(d['n_' + c] >= 23)       # 23: the short DST day
d = d.drop(columns=['n_' + c for c in V])
d.to_parquet(f'{HERE}/data/processed/fable3_rain_daily.parquet')
print(d.shape); print(d.notna().mean().round(4)); print(d[V].describe().round(2))
