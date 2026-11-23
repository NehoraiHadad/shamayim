"""Task 3 gate: count stations with usable gust / RH / rain observations since 2024 in the rebuilt ims_hourly.parquet.
The gust update (model per lead, per-model scaling) is only run when >= 15 stations have gusts; otherwise this
script just records the coverage."""
import json, pandas as pd
from fable_common import *
o = pd.read_parquet(f'{HERE}/data/processed/ims_hourly.parquet', columns=['time', 'station_id', 'ws_gust', 'rh', 'rain'])
o = o[o.time >= '2024-01-01']
n = o.groupby('station_id')[['ws_gust', 'rh', 'rain']].count()
cov = {c: sorted(int(s) for s in n.index[n[c] >= 2000]) for c in n.columns}
out = dict(min_stations_required=15, stations_with_2000h_since_2024={c: len(v) for c, v in cov.items()}, station_ids=cov,
           gust_update_run=len(cov['ws_gust']) >= 15)
print(out); json.dump(out, open(f'{HERE}/results/fable2_gust.json', 'w'), indent=1)
