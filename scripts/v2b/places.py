"""V2b: the two places' own linked footprints, as the page's prototype file. Same rule as V1's truth: 30 m2 and up, linked
at 60 m from the five nearest within 250 m of the place point.
python -I scripts/v2b/places.py <buildings.parquet> <outDir>"""
import collections
import json
import math
import os
import sys

import numpy as np
import pyarrow.compute as pc
import pyarrow.parquet as pq
import shapely

PLACES = {'karmei-tzur': (31.60922, 35.10088), 'nahalal': (32.6897, 35.1953)}
LINK, SEED, REACH = 60, 250, .02
src, out = sys.argv[1:]
os.makedirs(out, exist_ok=True)


def near(table, lat, lon):
    box = table['bbox']
    x, y = pc.struct_field(box, 'xmin'), pc.struct_field(box, 'ymin')
    keep = pc.and_(pc.less(pc.abs(pc.subtract(x, lon)), REACH), pc.less(pc.abs(pc.subtract(y, lat)), REACH))
    return table.filter(keep)


table = pq.read_table(src, columns=['geometry', 'bbox', 'sources'])
for pid, (lat, lon) in PLACES.items():
    part = near(table, lat, lon)
    k = 111320 * math.cos(math.radians(lat))
    rows = []
    for wkb, sources in zip(part['geometry'].to_pylist(), part['sources'].to_pylist()):
        for poly in shapely.get_parts(shapely.from_wkb(wkb)):
            p = shapely.transform(poly, lambda c: (c - [lon, lat]) * [k, 111320])
            if p.area >= 30:
                rows.append((p, (sources or [{}])[0].get('dataset')))
    boxes = np.array([p.bounds for p, _ in rows])
    far = np.array([math.hypot(p.centroid.x, p.centroid.y) for p, _ in rows])
    group = set(int(i) for i in np.argsort(far)[:5] if far[i] < SEED)
    todo = list(group)
    while todo:
        b = boxes[todo.pop()]
        dx = np.maximum(0, np.maximum(boxes[:, 0], b[0]) - np.minimum(boxes[:, 2], b[2]))
        dy = np.maximum(0, np.maximum(boxes[:, 1], b[1]) - np.minimum(boxes[:, 3], b[3]))
        for i in np.nonzero(np.hypot(dx, dy) <= LINK)[0]:
            if int(i) not in group:
                group.add(int(i))
                todo.append(int(i))
    data = []
    for i in sorted(group):
        p = rows[i][0]
        ring = np.array(shapely.oriented_envelope(p).exterior.coords)
        a, b = ring[1] - ring[0], ring[2] - ring[1]
        if np.hypot(*b) > np.hypot(*a):
            a, b = b, a
        angle = math.degrees(math.atan2(a[1], a[0])) % 180
        data.append([round(p.centroid.x, 1), round(p.centroid.y, 1), round(float(np.hypot(*a)), 1), round(float(np.hypot(*b)), 1), round(angle)])
    json.dump(data, open(f'{out}/{pid}.json', 'w'))
    print(pid, 'near', len(rows), 'own', len(data), collections.Counter(rows[i][1] for i in group))
