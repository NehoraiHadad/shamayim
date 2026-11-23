"""Terrain descriptors for every station, from the same public DEM the app uses (AWS Terrain Tiles, terrarium PNGs).

Features (all computable for ANY place in the app, which is the point):
  z            height at the point (m)
  tpi_1/3/10   height above the mean of the surroundings within 1/3/10 km (+ ridge, - valley)
  above_min3   height above the lowest point within 3 km (how far above the local valley floor)
  dz_cell7     height minus the mean of the surrounding 7 km box (ICON-EU's grid cell), dz_cell25 likewise for ECMWF 0.25°
  sea10/sea25  share of the Mediterranean within 10/25 km
  coast_km     distance to the Mediterranean
  slope1       mean slope within 1 km (degrees)
Writes data/processed/terrain_features.csv (and caches the tiles under data/raw/dem/).
"""
import io
import json
import math
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

HERE = Path(__file__).parent
CACHE = HERE / "data" / "raw" / "dem"
OUT = HERE / "data" / "processed" / "terrain_features.csv"
Z = 10  # ~130 m pixels at Israel's latitude
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
BBOX = (29.0, 34.0, 33.9, 36.3)  # lat0, lon0, lat1, lon1 (stations + 30 km margin)


def tile_xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def get_tile(x, y):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f"{Z}_{x}_{y}.png"
    if not f.exists():
        data = urllib.request.urlopen(URL.format(z=Z, x=x, y=y), timeout=60).read()
        f.write_bytes(data)
    rgb = np.asarray(Image.open(f).convert("RGB"), dtype=np.float64)
    return rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768


def mosaic():
    x0, y0 = tile_xy(BBOX[2], BBOX[1], Z)
    x1, y1 = tile_xy(BBOX[0], BBOX[3], Z)
    xs, ys = range(int(x0), int(x1) + 1), range(int(y0), int(y1) + 1)
    rows = [np.hstack([get_tile(x, y) for x in xs]) for y in ys]
    return np.vstack(rows), xs.start, ys.start


def main():
    dem, tx0, ty0 = mosaic()
    H, W = dem.shape
    n = 2 ** Z
    # Lat/lon of every pixel centre.
    px = (np.arange(W) + 0.5) / 256 + tx0
    py = (np.arange(H) + 0.5) / 256 + ty0
    lon = px / n * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * py / n))))
    sea = (dem < 0) & (lon[None, :] < 35.2)  # Mediterranean (Dead Sea and Kinneret are east of 35.2)
    pix_m = 40075016.7 * math.cos(math.radians(31.5)) / n / 256
    gy, gx = np.gradient(dem, pix_m)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    sea_rows, sea_cols = np.nonzero(sea)

    stations = json.load(open(HERE / "om_stations.json"))
    out = []
    for s in stations:
        X, Y = tile_xy(s["lat"], s["lon"], Z)
        c, r = int((X - tx0) * 256), int((Y - ty0) * 256)
        yy, xx = np.ogrid[:H, :W]
        dist_km = np.hypot((yy - r), (xx - c)) * pix_m / 1000
        z = float(dem[r, c])

        def mean_within(km):
            return float(dem[dist_km <= km].mean())

        box7 = dem[max(0, r - int(3500 / pix_m)):r + int(3500 / pix_m) + 1, max(0, c - int(3500 / pix_m)):c + int(3500 / pix_m) + 1]
        box25 = dem[max(0, r - int(12500 / pix_m)):r + int(12500 / pix_m) + 1, max(0, c - int(12500 / pix_m)):c + int(12500 / pix_m) + 1]
        d_sea = np.hypot(sea_rows - r, sea_cols - c).min() * pix_m / 1000 if len(sea_rows) else 999
        out.append({
            "station_id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"], "z": z,
            "tpi_1": z - mean_within(1), "tpi_3": z - mean_within(3), "tpi_10": z - mean_within(10),
            "above_min3": z - float(dem[dist_km <= 3].min()),
            "dz_cell7": z - float(box7.mean()), "dz_cell25": z - float(box25.mean()),
            "sea10": float(sea[dist_km <= 10].mean()), "sea25": float(sea[dist_km <= 25].mean()),
            "coast_km": float(d_sea), "slope1": float(slope[dist_km <= 1].mean()),
        })
    df = pd.DataFrame(out)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(df.drop(columns=["name"]).describe().round(2).T[["mean", "min", "max"]])


if __name__ == "__main__":
    main()
