"""Cloud-cover scorecard: the app's cloud cover against EUMETSAT's MSG cloud mask (30 km box), by lead.

    python3 research/verification/scorecard_cloud.py            # fetch what is missing (cached), then score
    python3 research/verification/scorecard_cloud.py --no-fetch # score what is cached

Sites and the satellite sampling are those of verify_cloud.py. Frames: every second day at 05, 08, 11, 14 and 18 UTC,
2024-01-01 to the archive's end. Forecasts: Open-Meteo Previous Runs (cloud_cover at leads 0/1/2/4/6 days, and the
latest run's layers and precipitation, which Open-Meteo keeps for the latest run only).

Variants (src/domain/blend.ts, correction/cloud.ts):
  ICON alone, ECMWF alone, old blend (ICON 0.6 for days 0-4, 0.4 after), app blend (CLOUD_ICON_WEIGHT 0.4);
  at l0 only, where the layers exist: + isolated-low-cloud removal (pending commit b4432a3, which applies it at every
  lead: longer leads cannot be scored from this archive), + the ground-trained calibration at half strength (what the
  app does for the next three hours), and both together (b4432a3's order: removal, then calibration).
Hold-out: the 40 % weight, the isolated-low rule and the ground calibration were all fitted on 2026 dates, so 2024-2025
is the clean test; 2026 is reported separately and is in-sample for them.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from time import sleep
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen

import numpy as np
import pandas as pd

import verify_cloud as vc

HERE = Path(__file__).parent
DATA = HERE / "data" / "cloud_scorecard"
MASKS = DATA / "masks.csv"
FC_DIR = DATA / "previous_runs"
OUT = HERE / "results"
SRC = HERE.parent.parent / "src" / "domain" / "correction" / "cloudTables.ts"
START = date(2024, 1, 1)
HOURS = (5, 8, 11, 14, 18)
LEADS = {"l0": "cloud_cover", "l1": "cloud_cover_previous_day1", "l2": "cloud_cover_previous_day2",
         "l4": "cloud_cover_previous_day4", "l6": "cloud_cover_previous_day6"}
LAYERS = ["cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "precipitation"]
MODELS = ("icon_seamless", "ecmwf_ifs025")


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

# ---------------------------------------------------------------------------------------------------------- fetching


def fetch_masks(end):
    DATA.mkdir(parents=True, exist_ok=True)
    have = set()
    if MASKS.exists():
        have = {r["stamp"] for r in csv.DictReader(open(MASKS))}
    stamps = []
    d = START
    while d <= end:
        stamps += [f"{d}T{h:02d}:00" for h in HOURS]
        d += timedelta(days=2)
    todo = [s for s in stamps if s not in have]
    print(f"satellite frames: {len(todo)} to fetch, {len(have)} cached")
    new = not MASKS.exists()
    with open(MASKS, "a", newline="") as f, ThreadPoolExecutor(max_workers=4) as pool:
        w = csv.writer(f)
        if new:
            w.writerow(["stamp", "site", "cover"])
        for n, (stamp, covers) in enumerate(zip(todo, pool.map(vc.read_mask, todo)), 1):
            for site, cover in covers.items():
                w.writerow([stamp, site, round(cover, 2)])
            if not covers:
                w.writerow([stamp, "", ""])  # marks the frame as tried
            if n % 100 == 0:
                f.flush()
                print(f"  {n}/{len(todo)}")


def fetch_forecasts(end):
    FC_DIR.mkdir(parents=True, exist_ok=True)
    m = date(START.year, START.month, 1)
    while m <= end:
        nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
        stop = min(end, nxt - timedelta(days=1))
        path = FC_DIR / f"{m:%Y-%m}.json.gz"
        if not path.exists() or (stop == end and m.month == end.month):
            q = {"latitude": ",".join(str(a) for a, _ in vc.SITES.values()),
                 "longitude": ",".join(str(b) for _, b in vc.SITES.values()),
                 "timezone": "GMT", "start_date": str(m), "end_date": str(stop), "models": ",".join(MODELS),
                 "hourly": ",".join([*LEADS.values(), *LAYERS])}
            url = "https://previous-runs-api.open-meteo.com/v1/forecast?" + urlencode(q)
            for attempt in range(8):
                try:
                    body = urlopen(url, timeout=120).read()
                    break
                except HTTPError as e:
                    reason = e.read()[:200]
                    if e.code == 429:
                        wait = 3600 if b"aily" in reason else 300 if b"ourly" in reason else 65  # respect the limit
                        print(f"  Open-Meteo 429 ({reason!r}); waiting {wait} s")
                        sleep(wait)
                        continue
                    raise
            else:
                raise RuntimeError("Open-Meteo kept refusing")
            path.write_bytes(gzip.compress(body))
            print(f"  forecasts {m:%Y-%m}")
            sleep(2)
        m = nxt

# ------------------------------------------------------------------------------------------- the app's cloud pieces


def read_models():
    text = SRC.read_text()
    out = {}
    for name in ("totalCloudModel", "lowCloudModel"):
        i = text.index(f"export const {name}")
        bias = float(re.search(r"bias:\s*([-0-9.e]+)", text[i:]).group(1))
        j = text.index("trees: [", i) + len("trees: ")
        depth, k = 0, j
        while True:
            depth += text[k] == "["
            depth -= text[k] == "]"
            if depth == 0:
                break
            k += 1
        trees = json.loads(re.sub(r",\s*]", "]", text[j:k + 1]))
        out[name] = (bias, trees)
    return out


def predict(model, X):
    bias, trees = model
    out = np.full(len(X), bias, float)
    for tree in trees:
        for r in range(len(X)):
            node = tree[0]
            while not isinstance(node, (int, float)):
                f, t, left, right = node
                node = tree[left if X[r, f] <= t else right]
            out[r] += node
    return out


def low_excess(ic, ec, il, el):
    gap = ic - ec
    low_gap = il - el
    lx = np.minimum(np.maximum(low_gap, 0), np.maximum(gap, 0))
    infl = (1 - smoothstep(5, 15, ec)) * smoothstep(15, 30, gap) * smoothstep(0.55, 0.80, lx / np.maximum(gap, 1))
    return gap, low_gap, lx, infl

# ------------------------------------------------------------------------------------------------------------ scoring


def load():
    masks = pd.read_csv(MASKS).dropna()
    masks["time"] = pd.to_datetime(masks.stamp)
    rows = []
    for f in sorted(FC_DIR.glob("*.json.gz")):
        for site, res in zip(vc.SITES, json.loads(gzip.decompress(f.read_bytes()))):
            h = res["hourly"]
            d = pd.DataFrame({"time": pd.to_datetime(h["time"]), "site": site})
            for k, v in h.items():
                if k != "time":
                    d[k] = pd.array(v, dtype="Float64").astype(float)
            rows.append(d)
    fc = pd.concat(rows, ignore_index=True)
    return masks.merge(fc, on=["time", "site"])


def stats(f, o):
    e = f - o
    return {"n": int(len(e)), "mae": round(float(np.abs(e).mean()), 2), "bias": round(float(e.mean()), 2),
            "false_cloudy": int(((f >= 30) & (o < 30)).sum()), "missed_cloudy": int(((f < 30) & (o >= 30)).sum())}


def score(df, models):
    out = {}
    for period, sel in (("2024-2025 (held out)", df.time < "2026-01-01"), ("2026 (in-sample for the cloud fits)",
                                                                             df.time >= "2026-01-01")):
        d0 = df[sel]
        out[period] = {}
        for l, col in LEADS.items():
            ic, ec = d0[f"{col}_icon_seamless"], d0[f"{col}_ecmwf_ifs025"]
            ok = ic.notna() & ec.notna()
            d = d0[ok]
            ic, ec, o = ic[ok].to_numpy(), ec[ok].to_numpy(), d.cover.to_numpy()
            old_w = 0.6 if l != "l6" else 0.4
            v = {"ICON alone": ic, "ECMWF alone": ec, "old blend (ICON 0.6)": old_w * ic + (1 - old_w) * ec,
                 "app blend (ICON 0.4)": 0.4 * ic + 0.6 * ec}
            if l == "l0":
                lay = {k: (d[f"{k}_icon_seamless"].to_numpy(), d[f"{k}_ecmwf_ifs025"].to_numpy()) for k in LAYERS}
                il, el = lay["cloud_cover_low"]
                have = ~np.isnan(il) & ~np.isnan(el) & ~np.isnan(lay["cloud_cover_mid"][0]) & ~np.isnan(lay["cloud_cover_mid"][1]) \
                    & ~np.isnan(lay["cloud_cover_high"][0]) & ~np.isnan(lay["cloud_cover_high"][1]) \
                    & ~np.isnan(lay["precipitation"][0]) & ~np.isnan(lay["precipitation"][1])
                v = {k: x[have] for k, x in v.items()}
                ic, ec, o, d = ic[have], ec[have], o[have], d[have]
                lay = {k: (a[have], b[have]) for k, (a, b) in lay.items()}
                il, el = lay["cloud_cover_low"]
                gap, low_gap, lx, infl = low_excess(ic, ec, il, el)
                shift = 0.4 * lx * infl
                blend = 0.4 * ic + 0.6 * ec
                utc_hour = d.time.dt.hour.to_numpy()
                X = np.column_stack([ic, il, lay["cloud_cover_mid"][0], lay["cloud_cover_high"][0], lay["precipitation"][0],
                                     ec, el, lay["cloud_cover_mid"][1], lay["cloud_cover_high"][1], lay["precipitation"][1],
                                     shift, gap, low_gap, np.zeros(len(ic)), ((utc_hour >= 7) & (utc_hour < 15)).astype(float)])
                adj = 0.5 * predict(models["totalCloudModel"], X)
                lean = np.maximum(0, blend - shift)
                v["app + isolated-low removal (b4432a3)"] = lean
                v["app + ground calibration (half, next 3 h)"] = np.clip(blend + adj, 0, 100)
                v["app + both (b4432a3 order)"] = np.clip(lean + adj, 0, 100)
                changed = shift >= 1
                out[period]["l0 where the removal changes >= 1 pp"] = {k: stats(x[changed], o[changed]) for k, x in v.items()}
            out[period][l] = {k: stats(x, o) for k, x in v.items()}
            for light, m in (("day", d.time.dt.hour.to_numpy() < 15), ("night", d.time.dt.hour.to_numpy() >= 15)):
                out[period][f"{l} {light}"] = {k: stats(x[m], o[m]) for k, x in v.items()}
    return out


def markdown(res):
    L = ["## Cloud cover against the satellite mask", "",
         "Mean absolute error in percentage points of cover (bias; false cloudy / missed cloudy at 30 %). Seven sites "
         "(verify_cloud.py), 30 km box of the MSG cloud mask, every second day at 05/08/11/14/18 UTC.", ""]
    for period, r in res.items():
        L += [f"### {period}", ""]
        names = list(r["l1"].keys())
        names_l0 = list(r["l0"].keys())
        for key in r:
            row = r[key]
            ns = names_l0 if key.startswith("l0") else names
            L.append(f"**{key}** (n = {next(iter(row.values()))['n']:,}): " + "; ".join(
                f"{k} {row[k]['mae']:.1f} ({row[k]['bias']:+.1f}; {row[k]['false_cloudy']}/{row[k]['missed_cloudy']})" for k in ns))
            L.append("")
    return L


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-fetch", action="store_true")
    ap.add_argument("--through", type=date.fromisoformat, default=date.today() - timedelta(days=3))
    args = ap.parse_args()
    if not args.no_fetch:
        fetch_forecasts(args.through)
        fetch_masks(args.through)
    df = load()
    res = score(df, read_models())
    OUT.mkdir(exist_ok=True)
    json.dump(res, open(OUT / "scorecard_cloud.json", "w"), indent=1)
    (OUT / "scorecard_cloud.md").write_text("\n".join(markdown(res)))
    print("\n".join(markdown(res)))


if __name__ == "__main__":
    main()
