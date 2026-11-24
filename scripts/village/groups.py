"""Linked groups of footprints for every place point: footprints of the least area and up, linked at about 60 m (20 m
raster, each footprint grown by one cell), from the five nearest within 250 m of the point. One JSON line per group no
wider than about 2 km (the exact limit is the builder's), and the counts of the whole box.
python -I scripts/village/groups.py <source.json> <buildings.parquet> <bounds.json> <outDir>"""
import collections
import json
import math
import sys

import numpy as np
import pyarrow.compute as pc
import pyarrow.parquet as pq
import shapely
from scipy import ndimage
from scipy.spatial import cKDTree

CELL, SEED_M, SEEDS, WIDEST_M, KY = 20, 250, 5, 2150, 111320

source, parquet, bounds, out = sys.argv[1:]
with open(source, encoding='utf8') as file:
    pin = json.load(file)
W, S, E, N = pin['box']
KX = KY * math.cos(math.radians((S + N) / 2))
table = pq.read_table(parquet)
first = pc.list_element(table['sources'], 0)
dataset = np.array(pc.struct_field(first, 'dataset').to_pylist(), object)
whole = pc.struct_field(first, 'property').to_pylist()
geom = shapely.from_wkb(table['geometry'].to_numpy())
rect = np.stack([pc.struct_field(table['bbox'], f).to_numpy() for f in ('xmin', 'ymin', 'xmax', 'ymax')], 1).astype(float)
lat_mid = (rect[:, 1] + rect[:, 3]) / 2
area = shapely.area(geom) * KY * KY * np.cos(np.radians(lat_mid))
keep = area >= pin['minAreaM2']
facts = dict(buildings=len(geom), kept=int(keep.sum()), partSources=sum(p not in ('', None) for p in whole),
             datasets={str(k): v for k, v in collections.Counter(dataset).items()},
             keptDatasets={str(k): v for k, v in collections.Counter(dataset[keep]).items()})
geom, rect, area, dataset = geom[keep], rect[keep], area[keep], dataset[keep]
xy = (rect - [W, S, W, S]) * [KX, KY, KX, KY]
cells = np.floor(xy / CELL).astype(int)
rows, cols = int((N - S) * KY / CELL) + 2, int((E - W) * KX / CELL) + 2
cells = np.clip(cells, 0, [cols - 1, rows - 1, cols - 1, rows - 1])
raster = np.zeros((rows, cols), bool)
for x0, y0, x1, y1 in np.unique(cells, axis=0):
    raster[y0:y1 + 1, x0:x1 + 1] = True
label, count = ndimage.label(ndimage.binary_dilation(raster, np.ones((3, 3), bool)), np.ones((3, 3), int))
mid = (xy[:, :2] + xy[:, 2:]) / 2
at = np.clip(np.floor(mid / CELL).astype(int), 0, [cols - 1, rows - 1])
own = label[at[:, 1], at[:, 0]]
order = np.argsort(own, kind='stable')
start = np.searchsorted(own[order], np.arange(count + 2))
tree = cKDTree(mid)


def members(seeds):
    return np.sort(np.concatenate([order[start[g]:start[g + 1]] for g in seeds]))


def houses(index):
    """lat, lon of the middle, long and short side (m), angle of the long side from east (0 to 180), area, dataset."""
    ring = shapely.get_coordinates(shapely.oriented_envelope(geom[index])).reshape(-1, 5, 2)[:, :3]
    lat = (rect[index, 1] + rect[index, 3]) / 2
    lon = (rect[index, 0] + rect[index, 2]) / 2
    k = np.stack([KY * np.cos(np.radians(lat)), np.full(len(index), KY)], 1)
    u, v = (ring[:, 1] - ring[:, 0]) * k, (ring[:, 2] - ring[:, 1]) * k
    lu, lv = np.hypot(*u.T), np.hypot(*v.T)
    long = np.where((lu >= lv)[:, None], u, v)
    angle = np.degrees(np.arctan2(long[:, 1], long[:, 0])) % 180
    return [[round(float(a), 6), round(float(o), 6), round(float(max(p, q)), 1), round(float(min(p, q)), 1), round(float(t), 1),
             round(float(m)), d] for a, o, p, q, t, m, d in zip(lat, lon, lu, lv, angle, area[index], dataset[index])]


with open(bounds, encoding='utf8') as file:
    points = json.load(file)['points']
served, empty, wide = collections.defaultdict(list), 0, 0
for lat, lon, *_ in points:
    far, near = tree.query([(lon - W) * KX, (lat - S) * KY], SEEDS)
    seeds = frozenset(int(own[i]) for d, i in zip(far, near) if d < SEED_M)
    if not seeds:
        empty += 1
        continue
    served[seeds].append([lat, lon])
with open(f'{out}/groups.jsonl', 'w', encoding='utf8') as file:
    for seeds, places in sorted(served.items(), key=lambda item: item[1]):
        index = members(seeds)
        if np.ptp(mid[index], axis=0).max() > WIDEST_M:
            wide += len(places)
            continue
        file.write(json.dumps(dict(places=places, houses=houses(index)), separators=(',', ':'), ensure_ascii=False) + '\n')
facts.update(points=len(points), pointsWithoutBuilding=empty, pointsTooWide=wide, unions=len(served))
with open(f'{out}/facts.json', 'w', encoding='utf8') as file:
    json.dump(facts, file, indent=1)
print(json.dumps(facts, indent=1))
