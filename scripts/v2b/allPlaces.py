"""V2b: how large a build-time footprint file is for every place point of the app's list (`bounds.json`), by extent limit.
Groups: footprints of 30 m2 and up, linked at about 60 m (20 m raster, each footprint grown by one cell), from the five
nearest within 250 m of the point. Encodings per group: the polygons as rings (5 decimals, JSON), and 3-byte records
(x, y in 2 m steps, one orientation bit, two size bits) with an 8-byte head.
python -I scripts/v2b/allPlaces.py <buildings.parquet> <bounds.json> <outDir>"""
import collections
import gzip
import json
import math
import os
import sys

import numpy as np
import pyarrow.compute as pc
import pyarrow.parquet as pq
import shapely
from scipy import ndimage
from scipy.spatial import cKDTree

src, bounds, out = sys.argv[1:]
os.makedirs(out, exist_ok=True)
W, S, CELL = 34.2, 29.4, 20
KX, KY = 111320 * math.cos(math.radians(31.6)), 111320
table = pq.read_table(src, columns=['geometry', 'bbox', 'sources'])
dataset = pc.struct_field(pc.list_element(table['sources'], 0), 'dataset').to_pylist()
kind = np.array([{'OpenStreetMap': 1}.get(d, 0) for d in dataset], np.int8)
geom = shapely.from_wkb(table['geometry'].to_numpy())
box = np.stack([pc.struct_field(table['bbox'], f).to_numpy() for f in ('xmin', 'ymin', 'xmax', 'ymax')], 1)
xy = (box - [W, S, W, S]) * [KX, KY, KX, KY]
area = shapely.area(geom) * KX * KY
keep = area >= 30
print('buildings', len(geom), 'kept', int(keep.sum()), collections.Counter(dataset))
geom, xy, kind, area = geom[keep], xy[keep], kind[keep], area[keep]
cells = np.floor(xy / CELL).astype(int)
raster = np.zeros((int(4.1 * KY / CELL), int(1.8 * KX / CELL)), bool)
for y0, x0, y1, x1 in np.unique(cells[:, [1, 0, 3, 2]], axis=0):
    raster[y0:y1 + 1, x0:x1 + 1] = True
label, count = ndimage.label(ndimage.binary_dilation(raster, np.ones((3, 3), bool)), np.ones((3, 3), int))
mid = (xy[:, :2] + xy[:, 2:]) / 2
own = label[(mid[:, 1] // CELL).astype(int), (mid[:, 0] // CELL).astype(int)]
order = np.argsort(own, kind='stable')
start = np.searchsorted(own[order], np.arange(count + 2))
members = lambda g: order[start[g]:start[g + 1]]
tree = cKDTree(mid)
points = json.load(open(bounds, encoding='utf8'))['points']
places, empty = [], 0
for lat, lon, rank, _ in points:
    p = [(lon - W) * KX, (lat - S) * KY]
    d, i = tree.query(p, 5)
    seeds = {int(own[j]) for dd, j in zip(d, i) if dd < 250}
    if not seeds:
        empty += 1
        continue
    at = np.concatenate([members(g) for g in seeds])
    ext = max(np.ptp(mid[at, 0]), np.ptp(mid[at, 1]))
    places.append(dict(lat=lat, lon=lon, rank=rank, seeds=frozenset(seeds), n=len(at), extent=float(ext), osm=float(kind[at].mean())))


def encode(at):
    g, m, a = geom[at], mid[at], area[at]
    x0, y0 = m.min(0)
    q = np.round((m - [x0, y0]) / 2).astype(np.uint32)
    env = shapely.get_coordinates(shapely.oriented_envelope(g)).reshape(-1, 5, 2)[:, :3] if len(at) else np.zeros((0, 3, 2))
    u, v = (env[:, 1] - env[:, 0]) * [KX, KY], (env[:, 2] - env[:, 1]) * [KX, KY]
    long = np.where((np.hypot(*u.T) >= np.hypot(*v.T))[:, None], u, v)
    across = (np.abs(long[:, 0]) >= np.abs(long[:, 1])).astype(np.uint32)
    size = np.searchsorted([120, 250, 600], a).astype(np.uint32)
    word = q[:, 0] | q[:, 1] << 10 | across << 20 | size << 21
    word = word[np.lexsort((q[:, 0], q[:, 1]))]
    body = np.stack([word & 255, word >> 8 & 255, word >> 16 & 255], 0).astype(np.uint8)
    rings = [np.round(shapely.get_coordinates(p.exterior if p.geom_type == 'Polygon' else shapely.get_parts(p)[0].exterior), 5).tolist() for p in g]
    return json.dumps(rings, separators=(',', ':')).encode(), b'\0' * 8 + body.tobytes()


def q(v, *ts):
    return [int(x) for x in np.quantile(v, ts)]


report = dict(points=len(points), noBuildingWithin250m=empty)
for limit in (1000, 1500, 2000):
    some = [p for p in places if p['extent'] <= limit]
    groups = {p['seeds']: p for p in some}
    raw, quant, tiles = [], [], collections.defaultdict(bytes)
    for p in groups.values():
        a, b = encode(np.concatenate([members(g) for g in p['seeds']]))
        raw.append((len(a), len(gzip.compress(a, 9))))
        quant.append((len(b), len(gzip.compress(b, 9))))
        tiles[f"{math.floor(p['lat'] * 10)}_{math.floor(p['lon'] * 10)}"] += b
    gz = [len(gzip.compress(t, 9)) for t in tiles.values()]
    raw, quant = np.array(raw), np.array(quant)
    shares = np.array([p['osm'] for p in some])
    ns = [p['n'] for p in groups.values()]
    if limit == 2000:
        for key, body in tiles.items():
            open(f'{out}/{key}.bin', 'wb').write(body)
    report[limit] = dict(points=len(some), groups=len(groups), footprints=int(sum(ns)), perPlace=q(ns, .1, .5, .9, 1),
                         ringsRaw=int(raw[:, 0].sum()), ringsGz=int(raw[:, 1].sum()), quantRaw=int(quant[:, 0].sum()),
                         quantGzPerPlace=int(quant[:, 1].sum()), quantPerPlaceBytes=q(quant[:, 0], .5, .9, 1), gzPerPlaceBytes=q(quant[:, 1], .5, .9, 1),
                         tiles=len(tiles), tilesGzTotal=int(sum(gz)), tileGz=q(gz, .5, .9, 1),
                         osmShare={f'>={t}': int((shares >= t).sum()) for t in (.9, .7, .5, .2)}, osmNone=int((shares < .05).sum()),
                         under10=int(sum(p['n'] < 10 for p in some)), ranks=dict(collections.Counter(p['rank'] for p in some)))
for pid, (lat, lon) in {'karmei-tzur': (31.60922, 35.10088), 'nahalal': (32.6897, 35.1953), 'bardala': (32.38621, 35.4807)}.items():
    p = min(places, key=lambda p: math.hypot((p['lat'] - lat), p['lon'] - lon))
    report[pid] = {k: v for k, v in p.items() if k != 'seeds'}
print(json.dumps(report, indent=1))
json.dump(report, open(f'{out}/all.json', 'w'), indent=1)
