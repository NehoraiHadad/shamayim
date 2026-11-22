#!/usr/bin/env python3
"""Resumable downloader for IMS (Israel Meteorological Service) 10-minute station data.

Fetches one request per station x channel x calendar year and caches the raw
JSON response, gzip-compressed, under data/raw/ims/<stationId>/<channel>_<year>.json.gz
(an empty `<channel>_<year>.empty` marker is written for "no data" answers).
Reruns skip everything already cached.

The API token is read from the IMS_TOKEN environment variable (never stored).

    IMS_TOKEN=... python3 ims_fetch.py                    # everything
    IMS_TOKEN=... python3 ims_fetch.py --stations 22 178  # a subset
    IMS_TOKEN=... python3 ims_fetch.py --refresh-current  # re-download the running year

API quirks handled here (see README.md):
  * `to` is exclusive, so a year is requested as from=Y/01/01&to=(Y+1)/01/01.
  * channel ids differ per station -> channels are mapped by monitor name.
  * HTTP 204 / empty body means "no data for this range".
"""
from __future__ import annotations

import argparse
import datetime as dt
import gzip
import json
import os
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

BASE = "https://api.ims.gov.il/v1/envista"
HERE = Path(__file__).resolve().parent
RAW_DIR = HERE / "data" / "raw" / "ims"

TEMP_CHANNELS = ["TD", "TDmax", "TDmin"]            # long history
OTHER_CHANNELS = ["RH", "WS", "WSmax", "WD", "Rain", "Grad"]
TEMP_START_YEAR = 2016
OTHER_START_YEAR = 2022

MAX_WORKERS = 4          # be polite: never more than 4 concurrent requests
TIMEOUT = (30, 120)      # connect, read (seconds)
MAX_TRIES = 6
MAX_CONSECUTIVE_429 = 6  # give up entirely after this many rate-limit answers in a row


class RateLimitAbort(Exception):
    pass


class Throttle:
    """Shared back-off state: a 429 pauses *all* workers."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.pause_until = 0.0
        self.consecutive_429 = 0
        self.total_429 = 0
        self.abort = threading.Event()

    def wait(self) -> None:
        while True:
            if self.abort.is_set():
                raise RateLimitAbort()
            with self.lock:
                delay = self.pause_until - time.time()
            if delay <= 0:
                return
            time.sleep(min(delay, 5))

    def hit_429(self, retry_after: str | None) -> None:
        with self.lock:
            self.consecutive_429 += 1
            self.total_429 += 1
            try:
                wait = float(retry_after) if retry_after else 0.0
            except ValueError:
                wait = 0.0
            wait = max(wait, min(900, 30 * 2 ** self.consecutive_429))
            self.pause_until = max(self.pause_until, time.time() + wait)
            n = self.consecutive_429
        log(f"429 rate limited (#{n} in a row) - all workers pausing {wait:.0f}s")
        if n >= MAX_CONSECUTIVE_429:
            self.abort.set()

    def ok(self) -> None:
        with self.lock:
            self.consecutive_429 = 0


_log_lock = threading.Lock()


def log(msg: str) -> None:
    with _log_lock:
        print(f"{dt.datetime.now():%H:%M:%S} {msg}", flush=True)


_local = threading.local()


def session(token: str) -> requests.Session:
    s = getattr(_local, "s", None)
    if s is None:
        s = requests.Session()
        s.headers["Authorization"] = f"ApiToken {token}"
        _local.s = s
    return s


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def paths(station_id: int, channel: str, year: int) -> tuple[Path, Path]:
    d = RAW_DIR / str(station_id)
    return d / f"{channel}_{year}.json.gz", d / f"{channel}_{year}.empty"


def fetch_one(token: str, thr: Throttle, station_id: int, channel: str,
              channel_id: int, year: int) -> tuple[str, int]:
    """Returns (status, bytes) where status is 'data' | 'empty' | 'failed'."""
    data_path, empty_path = paths(station_id, channel, year)
    url = (f"{BASE}/stations/{station_id}/data/{channel_id}"
           f"?from={year}/01/01&to={year + 1}/01/01")
    last = ""
    for attempt in range(MAX_TRIES):
        thr.wait()
        try:
            r = session(token).get(url, timeout=TIMEOUT)
            if r.status_code == 429:
                thr.hit_429(r.headers.get("Retry-After"))
                continue
            thr.ok()
            if r.status_code == 204 or (r.status_code == 200 and not r.content.strip()):
                atomic_write(empty_path, b"")
                data_path.unlink(missing_ok=True)
                return "empty", 0
            if r.status_code == 200:
                body = r.content
                doc = json.loads(body)          # raises on truncated/garbled bodies
                if not isinstance(doc, dict) or not isinstance(doc.get("data"), list):
                    raise ValueError("unexpected JSON shape")
                if not doc["data"]:
                    atomic_write(empty_path, b"")
                    return "empty", 0
                atomic_write(data_path, gzip.compress(body, compresslevel=6))
                empty_path.unlink(missing_ok=True)
                return "data", len(body)
            last = f"HTTP {r.status_code}: {r.text[:120]!r}"
            if 400 <= r.status_code < 500 and r.status_code != 408:
                break                             # permanent client error
        except RateLimitAbort:
            raise
        except Exception as e:                    # timeouts, resets, bad JSON...
            last = f"{type(e).__name__}: {e}"[:200]
        time.sleep(min(120, 5 * 2 ** attempt) * random.uniform(0.7, 1.3))
    log(f"FAILED st={station_id} {channel} {year}: {last}")
    return "failed", 0


def load_stations(token: str, refresh: bool) -> list[dict]:
    path = RAW_DIR / "stations.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf-8"))
    r = requests.get(f"{BASE}/stations", headers={"Authorization": f"ApiToken {token}"},
                     timeout=TIMEOUT)
    r.raise_for_status()
    stations = r.json()
    atomic_write(path, json.dumps(stations, ensure_ascii=False).encode("utf-8"))
    return stations


def is_one_minute(st: dict) -> bool:
    """`*_1m` stations are 1-minute rain gauges duplicating a main station."""
    return "_1m" in st["name"] or st.get("timebase") == 1


def build_tasks(stations: list[dict], only: set[int] | None, this_year: int,
                refresh_current: bool) -> tuple[list[tuple], int]:
    tasks, cached = [], 0
    for prio, channel in enumerate(TEMP_CHANNELS + OTHER_CHANNELS):
        start = TEMP_START_YEAR if channel in TEMP_CHANNELS else OTHER_START_YEAR
        for st in stations:
            sid = st["stationId"]
            if is_one_minute(st) or (only and sid not in only):
                continue
            ids = [m["channelId"] for m in st["monitors"] if m["name"] == channel]
            if not ids:
                continue
            for year in range(this_year, start - 1, -1):
                data_path, empty_path = paths(sid, channel, year)
                done = data_path.exists() or empty_path.exists()
                if done and not (refresh_current and year == this_year):
                    cached += 1
                    continue
                tasks.append((sid, channel, ids[0], year))
    return tasks, cached


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--stations", type=int, nargs="*", help="only these station ids")
    ap.add_argument("--workers", type=int, default=MAX_WORKERS)
    ap.add_argument("--refresh-current", action="store_true",
                    help="re-download the (incomplete) current year")
    ap.add_argument("--refresh-stations", action="store_true",
                    help="re-download the station list")
    args = ap.parse_args()

    token = os.environ.get("IMS_TOKEN")
    if not token:
        print("IMS_TOKEN environment variable is not set", file=sys.stderr)
        return 2
    workers = max(1, min(args.workers, MAX_WORKERS))

    stations = load_stations(token, args.refresh_stations)
    this_year = dt.date.today().year
    tasks, cached = build_tasks(stations, set(args.stations or []) or None,
                                this_year, args.refresh_current)
    log(f"{len(tasks)} requests to do, {cached} already cached, {workers} workers")

    thr = Throttle()
    counts = {"data": 0, "empty": 0, "failed": 0}
    nbytes = 0
    t0 = time.time()
    aborted = False
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(fetch_one, token, thr, *t) for t in tasks]
        try:
            for i, fut in enumerate(as_completed(futs), 1):
                status, n = fut.result()
                counts[status] += 1
                nbytes += n
                if i % 50 == 0 or i == len(futs):
                    el = time.time() - t0
                    eta = el / i * (len(futs) - i)
                    log(f"{i}/{len(futs)} data={counts['data']} empty={counts['empty']} "
                        f"failed={counts['failed']} raw={nbytes / 1e6:.0f}MB "
                        f"elapsed={el / 60:.1f}min eta={eta / 60:.0f}min")
        except RateLimitAbort:
            aborted = True
            for f in futs:
                f.cancel()
            log("ABORTED: persistent 429s. Wait a while and rerun (the cache makes it resume).")
        except KeyboardInterrupt:
            thr.abort.set()
            for f in futs:
                f.cancel()
            log("interrupted - rerun to resume")
            return 130
    log(f"done in {(time.time() - t0) / 60:.1f} min: {counts}, "
        f"{nbytes / 1e6:.0f} MB raw JSON, total 429s={thr.total_429}")
    return 1 if (aborted or counts["failed"]) else 0


if __name__ == "__main__":
    sys.exit(main())
