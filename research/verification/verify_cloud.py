"""Compare Open-Meteo's archived cloud forecasts with EUMETSAT's MSG cloud mask.

Pass complete or partial UTC months, e.g. python verify_cloud.py 2026-01 2026-04 2026-07 2026-10 2026-11.
Pillow is required. The CSV preserves paired samples for checking other weights and thresholds.
"""
import argparse
import calendar
import csv
import json
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from io import BytesIO
from pathlib import Path
from statistics import mean
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from PIL import Image

SITES = {
    "shadmot-mehola": (32.3465, 35.5325),
    "tiberias": (32.7934, 35.5312),
    "haifa": (32.794, 34.9896),
    "tel-aviv": (32.0853, 34.7818),
    "jerusalem": (31.778, 35.232),
    "beer-sheva": (31.252, 34.7915),
    "eilat": (29.5561, 34.9516),
}
MODELS = ("icon_seamless", "ecmwf_ifs025")
LEADS = {0: "cloud_cover", **{24 * day: f"cloud_cover_previous_day{day}" for day in range(1, 7)}}
HOURS = (8, 11, 18)
# One image per timestamp covers all sites. At Israel's latitude a cell is about 2.1 km across.
WEST, SOUTH, EAST, NORTH = (3740000, 3380000, 4020000, 3980000)
PIXEL_M = 2500


def download(base, query):
    for attempt in range(2):
        try:
            with urlopen(f"{base}?{urlencode(query)}", timeout=20) as response:
                return response.read(), response.headers.get_content_type()
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt or isinstance(error, HTTPError) and error.code < 500 and error.code != 429:
                raise
            sleep(2)


def read_forecasts(start, end):
    data, _ = download("https://previous-runs-api.open-meteo.com/v1/forecast", {
        "latitude": ",".join(str(lat) for lat, _ in SITES.values()),
        "longitude": ",".join(str(lon) for _, lon in SITES.values()),
        "timezone": "GMT", "start_date": start, "end_date": end,
        "models": ",".join(MODELS), "hourly": ",".join(LEADS.values()),
    })
    readings = {}
    for site, result in zip(SITES, json.loads(data), strict=True):
        hourly = result["hourly"]
        for i, stamp in enumerate(hourly["time"]):
            for lead, field in LEADS.items():
                readings[site, stamp, lead] = tuple(hourly[f"{field}_{model}"][i] for model in MODELS)
    return readings


def sample_box(lat, lon):
    earth = 6378137
    x = earth * math.radians(lon)
    y = earth * math.asinh(math.tan(math.radians(lat)))
    half = 15000 / math.cos(math.radians(lat))
    return tuple(round(v / PIXEL_M) for v in (x - WEST - half, NORTH - y - half,
                                              x - WEST + half, NORTH - y + half))


def read_mask(stamp):
    try:
        data, mime = download("https://view.eumetsat.int/geoserver/ows", {
            "service": "WMS", "version": "1.3.0", "request": "GetMap", "layers": "msg_fes:clm",
            "styles": "", "format": "image/png", "transparent": "true", "crs": "EPSG:3857",
            "width": (EAST - WEST) // PIXEL_M, "height": (NORTH - SOUTH) // PIXEL_M,
            "time": f"{stamp}:00Z", "bbox": f"{WEST},{SOUTH},{EAST},{NORTH}",
        })
    except (URLError, TimeoutError) as error:
        print(f"Missing satellite frame {stamp} ({error})")
        return {}
    if mime != "image/png":
        print(f"Missing satellite frame {stamp} ({mime})")
        return {}

    with Image.open(BytesIO(data)) as source:
        image = source.convert("RGBA")
    covers = {}
    for site, coords in SITES.items():
        pixels = image.crop(sample_box(*coords))
        visible = [(r, g, b) for r, g, b, a in pixels.getdata() if a >= 128]
        if len(visible) >= 0.9 * pixels.width * pixels.height:
            covers[site] = 100 * sum(min(rgb) > 200 for rgb in visible) / len(visible)
    return covers


def sample_month(month, end, pool):
    start = date.fromisoformat(month + "-01")
    stop = min(end, start.replace(day=calendar.monthrange(start.year, start.month)[1]))
    if stop < start:
        return
    forecasts = read_forecasts(start, stop)
    stamps = [f"{start.replace(day=day)}T{hour:02d}:00"
              for day in range(2, stop.day + 1, 4) for hour in HOURS]
    for stamp, covers in zip(stamps, pool.map(read_mask, stamps), strict=True):
        for site, satellite in covers.items():
            for lead in LEADS:
                icon, ecmwf = forecasts.get((site, stamp, lead), (None, None))
                if icon is not None and ecmwf is not None:
                    yield (site, stamp, lead, satellite, icon, ecmwf)


def summarize(rows):
    for lead in LEADS:
        for light in ("day", "night"):
            matched = [(sat, icon, ecmwf) for _, time, h, sat, icon, ecmwf in rows
                       if h == lead and (time[11:13] == "18") == (light == "night")]
            if not matched:
                continue
            scores = []
            for weight in (0, 0.2, 0.4, 0.6, 1):
                errors = [weight * icon + (1 - weight) * ecmwf - sat for sat, icon, ecmwf in matched]
                scores.append(f"{weight:.0%} ICON: {mean(map(abs, errors)):.1f} MAE / {mean(errors):+.1f} bias")
            print(f"{lead:2} h {light:5} n={len(matched):3}   " + "   ".join(scores))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("months", nargs="+")
    parser.add_argument("--through", type=date.fromisoformat, default=date.today())
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "data/cloud_cover_sample.csv")
    args = parser.parse_args()
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows = [row for month in sorted(set(args.months)) for row in sample_month(month, args.through, pool)]
    if not rows:
        parser.exit(1, "No paired cloud samples.\n")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["site", "time_utc", "lead_hours", "satellite", "icon", "ecmwf"])
        writer.writerows(rows)
    summarize(rows)
    print(args.output)


if __name__ == "__main__":
    main()
