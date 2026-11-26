"""Replay Shamayim's satellite-corrected cloud forecasts against later Meteosat images.

Requires Pillow and the app's Node dependencies. Paired cases and scores go to data/cloud_nowcast.
"""
import argparse
import csv
import json
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from statistics import mean
from urllib.error import URLError

from PIL import Image

from verify_cloud import MODELS, SITES, download

DEVELOPMENT = "2026-04-10 2026-04-18 2026-07-10 2026-07-22 2026-10-10 2026-10-22".split()
NOVEMBER = "2026-11-06 2026-11-10 2026-11-14 2026-11-18 2026-11-22 2026-11-24".split()
HOLDOUT = "2026-06-12 2026-07-18 2026-08-08 2026-09-03 2026-10-14 2026-10-28 2026-11-03 2026-11-20".split()
HOURS = (9, 14, 18)
LEADS = (30, 45, 60, 75, 90)
WEST, SOUTH, EAST, NORTH = 3650000, 3320000, 4110000, 4050000
PIXEL_M = 2500
DATA = Path(__file__).parent / "data/cloud_nowcast"
ROOT = Path(__file__).resolve().parents[2]


def stamp(time):
    return time.isoformat(timespec="minutes")


def frame_path(time):
    return DATA / (stamp(time).replace(":", "") + ".png")


def fetch_frame(time):
    path = frame_path(time)
    if path.exists():
        return
    try:
        body, mime = download("https://view.eumetsat.int/geoserver/ows", {
            "service": "WMS", "version": "1.3.0", "request": "GetMap", "layers": "msg_fes:clm",
            "styles": "", "format": "image/png", "transparent": "true", "crs": "EPSG:3857",
            "width": (EAST - WEST) // PIXEL_M, "height": (NORTH - SOUTH) // PIXEL_M,
            "bbox": f"{WEST},{SOUTH},{EAST},{NORTH}", "time": stamp(time) + ":00Z",
        })
        if mime == "image/png":
            path.write_bytes(body)
    except (URLError, TimeoutError) as error:
        print(f"Missing Meteosat frame {stamp(time)} ({error})")


def fetch_models(date):
    path = DATA / f"run-{date}.json"
    if not path.exists():
        body, _ = download("https://single-runs-api.open-meteo.com/v1/forecast", {
            "latitude": ",".join(str(lat) for lat, _ in SITES.values()),
            "longitude": ",".join(str(lon) for _, lon in SITES.values()),
            "timezone": "GMT", "run": date + "T00:00", "models": ",".join(MODELS), "hourly": "cloud_cover",
        })
        path.write_bytes(body)
    return json.loads(path.read_bytes())


@lru_cache(maxsize=24)
def read_image(time):
    path = frame_path(time)
    if path.exists():
        with Image.open(path) as image:
            return image.convert("RGBA")
    return None


def read_cover(time, lat, lon):
    image = read_image(time)
    if image is None:
        return None
    earth = 6378137
    phi = math.radians(lat)
    x = (earth * math.radians(lon) - WEST) / PIXEL_M - 0.5
    y = (NORTH - earth * math.asinh(math.tan(phi))) / PIXEL_M - 0.5
    offsets = [(i - 5.5) / math.cos(phi) for i in range(12)]
    pixels = [image.getpixel((round(x + dx), round(y + dy))) for dy in offsets for dx in offsets]
    if any(alpha < 128 for _, _, _, alpha in pixels):
        return None
    return 100 * sum(min(r, g, b) > 200 for r, g, b, _ in pixels) / len(pixels)


def model_at(time, hourly):
    hour = time.replace(minute=0)
    i = hourly["time"].index(stamp(hour))
    weight = time.minute / 60
    icon, ifs = (hourly[f"cloud_cover_{model}"][i:i + 2] for model in MODELS)
    if None in icon + ifs:
        return None
    left, right = (0.4 * a + 0.6 * b for a, b in zip(icon, ifs, strict=True))
    return left + (right - left) * weight


def cases(date, group, pool):
    observations = [datetime.fromisoformat(f"{date}T{hour:02d}:00") for hour in HOURS]
    if group == "incident":
        observations = [datetime.fromisoformat(f"{date}T14:30")]
    offsets = (-30, -15, 0, *LEADS)
    frames = {t + timedelta(minutes=m) for t in observations for m in offsets}
    list(pool.map(fetch_frame, sorted(frames)))
    runs = fetch_models(date)
    for (site, (lat, lon)), run in zip(SITES.items(), runs, strict=True):
        if group == "incident" and site != "shadmot-mehola":
            continue
        for t in observations:
            cover, previous, oldest = [read_cover(t - timedelta(minutes=m), lat, lon) for m in (0, 15, 30)]
            model0 = model_at(t, run["hourly"])
            if None in (cover, previous, oldest, model0):
                continue
            for lead in LEADS:
                target = t + timedelta(minutes=lead)
                model = model_at(target, run["hourly"])
                actual = read_cover(target, lat, lon)
                if model is not None and actual is not None:
                    yield dict(group=group, site=site, lat=lat, lon=lon, at=stamp(t), lead=lead, target=stamp(target),
                               cover=cover, previous=previous, oldest=oldest, model0=model0, model=model, actual=actual)


# Score both versions through production code, disabling only the new term for the baseline.
SCORE = """
import { readFileSync } from 'node:fs'
import { sunAt } from './src/data/overhead/maskSlots.ts'
import { smoothstep } from './src/domain/smoothstep.ts'
import { correctCloudCover } from './src/domain/observedCloud.ts'
const cases = JSON.parse(readFileSync(0, 'utf8'))
const rows = cases.map(({ at, cover, previous, oldest, lat, lon, target, model, model0, ...row }) => {
  const daylight = smoothstep(7, 14, sunAt(Date.parse(at + 'Z'), lat, lon))
  const obs = { at, cover, before: [previous, oldest], daylight }
  const predict = (calibratedPersistence) =>
    correctCloudCover({ ...obs, calibratedPersistence }, target, undefined, model, () => model0)
  return { ...row, at, target, cover, previous, oldest, daylight, model0, model,
    baseline: predict(false), persistence: predict(true) }
})
console.log(JSON.stringify(rows))
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=["development", "november", "holdout", "incident", "all"], default="all")
    args = parser.parse_args()
    DATA.mkdir(parents=True, exist_ok=True)
    dates = {"development": DEVELOPMENT, "november": NOVEMBER, "holdout": HOLDOUT, "incident": ["2026-11-24"]}
    groups = dates if args.group == "all" else [args.group]
    with ThreadPoolExecutor(max_workers=5) as pool:
        paired = [row for group in groups for date in dates[group] for row in cases(date, group, pool)]
    result = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", SCORE],
                            cwd=ROOT, input=json.dumps(paired), text=True, capture_output=True, check=True)
    rows = json.loads(result.stdout)
    path = DATA / f"replay-{args.group}.csv"
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    for group in groups:
        for lead in LEADS:
            points = [r for r in rows if r["group"] == group and r["lead"] == lead]
            if not points:
                continue
            print(group, lead, len(points), {
                key: round(mean(abs(row[key] - row["actual"]) for row in points), 2)
                for key in ("model", "baseline", "persistence")
            })
    print(path)


if __name__ == "__main__":
    main()
