"""Builds the app's national temperature correction (src/domain/correction/nationalTables.ts) and validates it.

Shipped (findings in results/temp-report.html, recommendations 1-3):
  - ICON weight for temperature: 0.8 for today..day 2, 0.6 for days 3-4, 0.4 from day 5 (TEMP_ICON_WEIGHT below).
  - Hourly: national bias of that blend by lead (0,1,2,4,6 days ahead) x season x local standard hour (UTC+2),
    smoothed across the seasons by day of year so the correction does not jump on the first of a month.
  - Daily max: national bias of the day's highest hourly value by lead. Daily min is left alone (its bias changes
    sign with terrain; no national correction helps it).
Validation: the same recipe fitted on the training years from all stations but one, scored on the held-out station
in the test year (leave-one-station-out), so the numbers below are what a place WITHOUT a station gets.
The shipped tables are then refitted on all stations and all years.
"""
import json
import sys

import numpy as np
import pandas as pd

sys.argv = ["x"]
import verify_temp as v

LEADS = ["l0", "l1", "l2", "l4", "l6"]
LEAD_DAYS = [0, 1, 2, 4, 6]
SEASONS = ["winter", "spring", "summer", "autumn"]
CENTRE_DOY = np.array([15, 105, 196, 288])  # mid-Jan, mid-Apr, mid-Jul, mid-Oct
OUT_TS = v.HERE.parent.parent / "src" / "domain" / "correction" / "nationalTables.ts"


def temp_icon_weight(day_offset):
    return 0.8 if day_offset <= 2 else 0.6 if day_offset <= 4 else 0.4


def season_weights(doy):
    """Weights of the four season centres for each day of year: linear between the two nearest centres (circular)."""
    doy = np.asarray(doy, float)
    w = np.zeros((len(doy), 4))
    ext = np.concatenate([CENTRE_DOY - 365, CENTRE_DOY, CENTRE_DOY + 365])
    idx = np.searchsorted(ext, doy) - 1
    a, b = ext[idx], ext[idx + 1]
    f = (doy - a) / (b - a)
    w[np.arange(len(doy)), idx % 4] += 1 - f
    w[np.arange(len(doy)), (idx + 1) % 4] += f
    return w


def load():
    fc, meta = v.load_forecasts()
    obs = pd.read_parquet(v.OBS, columns=["time", "station_id", "td", "td_max"])
    obs["time"] = pd.to_datetime(obs["time"], utc=True).dt.tz_localize(None)
    df = fc.merge(obs, on=["station_id", "time"])
    std = df.time + pd.Timedelta(hours=2)
    df["hour"] = std.dt.hour
    df["season"] = std.dt.month.map(v.SEASON)
    df["doy"] = std.dt.dayofyear
    df["day"] = std.dt.normalize()
    for l, d in zip(LEADS, LEAD_DAYS):
        w = temp_icon_weight(d)
        i, e = df[f"icon_{l}"], df[f"ecmwf_{l}"]
        df[f"f_{l}"] = (w * i + (1 - w) * e).where(i.notna() & e.notna())
    return df


def hourly_tables(df, exclude=None):
    """{lead: array[season, hour]} mean error, optionally without one station."""
    d = df if exclude is None else df[df.station_id != exclude]
    out = {}
    for l in LEADS:
        e = (d[f"f_{l}"] - d.td).rename("e")
        t = e.groupby([d.season, d.hour]).mean().unstack().reindex(SEASONS)
        out[l] = t.to_numpy()
    return out


def smooth_bias(tab, season_w, hours):
    return np.einsum("ns,sn->n", season_w, tab[:, hours])


def daily_max(df):
    rows = []
    for l in LEADS:
        g = df.groupby(["station_id", "day"]).agg(f=(f"f_{l}", "max"), o=("td_max", "max"), n=(f"f_{l}", "count"),
                                                  no=("td_max", "count"))
        g = g[(g.n == 24) & (g.no >= 20)].reset_index()
        g["lead"] = l
        g["e"] = g.f - g.o
        rows.append(g)
    return pd.concat(rows)


def main():
    df = load()
    tr, te = df[df.time < v.SPLIT], df[df.time >= v.SPLIT].copy()
    res = {"hourly": {}, "daily_max": {}}
    sw = season_weights(te.doy.to_numpy())
    stations = sorted(te.station_id.unique())
    # Leave-one-station-out tables from the training years (sums so each held-out station is subtracted cheaply).
    for l in LEADS:
        e_tr = tr[f"f_{l}"] - tr.td
        sums = e_tr.groupby([tr.station_id, tr.season, tr.hour]).agg(["sum", "count"])
        tot = sums.groupby(level=[1, 2]).sum()
        e_te = (te[f"f_{l}"] - te.td).to_numpy()
        e_old = (v.blend(te, l) - te.td).to_numpy()  # today's app blend, no correction
        step = np.full(len(te), np.nan)
        smooth = np.full(len(te), np.nan)
        for s in stations:
            m = (te.station_id == s).to_numpy()
            mine = sums.loc[s] if s in sums.index.get_level_values(0) else None
            t = tot.sub(mine, fill_value=0) if mine is not None else tot
            tab = (t["sum"] / t["count"]).unstack().reindex(SEASONS).to_numpy()
            si = te.season[m].map({k: i for i, k in enumerate(SEASONS)}).to_numpy()
            hh = te.hour[m].to_numpy()
            step[m] = tab[si, hh]
            smooth[m] = smooth_bias(tab, sw[m], hh)
        ok = ~np.isnan(e_te) & ~np.isnan(e_old)
        res["hourly"][l] = {
            "app_today": round(float(np.abs(e_old[ok]).mean()), 4),
            "new_weights": round(float(np.abs(e_te[ok]).mean()), 4),
            "new_weights_plus_season_step_table": round(float(np.abs(e_te[ok] - step[ok]).mean()), 4),
            "new_weights_plus_smooth_table": round(float(np.abs(e_te[ok] - smooth[ok]).mean()), 4),
        }
        print("hourly", l, res["hourly"][l])
    dm = daily_max(df)
    dtr, dte = dm[dm.day < v.SPLIT], dm[dm.day >= v.SPLIT]
    for l in LEADS:
        a, b = dtr[dtr.lead == l], dte[dte.lead == l].copy()
        s = a.groupby("station_id").e.agg(["sum", "count"])
        S, N = s["sum"].sum(), s["count"].sum()
        loso = ((S - s["sum"]) / (N - s["count"])).rename("b")
        b = b.join(loso, on="station_id")
        res["daily_max"][l] = {"raw": round(float(b.e.abs().mean()), 4), "corrected": round(float((b.e - b.b).abs().mean()), 4),
                               "offset": round(float(-loso.mean()), 2)}
        print("daily max", l, res["daily_max"][l])

    # Shipped tables: all stations, all years.
    full = hourly_tables(df)
    dmax = {l: round(float(-dm[dm.lead == l].e.mean()), 2) for l in LEADS}
    res["shipped_daily_max_offset"] = dmax
    json.dump(res, open(v.OUT / "correction_validation.json", "w"), indent=1)

    def arr(a):
        return "[\n" + "".join("    [" + ", ".join(f"{x:.2f}" for x in row) + "],\n" for row in a) + "  ]"
    hourly_ts = "".join(f"  {arr(-full[l])},\n" for l in LEADS)
    OUT_TS.parent.mkdir(parents=True, exist_ok=True)
    OUT_TS.write_text(f"""// Generated by research/verification/build_correction.py — do not edit by hand.
// From {df.station_id.nunique()} IMS stations against Open-Meteo's past forecasts, {df.time.min():%Y-%m} to {df.time.max():%Y-%m}.

/** Days ahead each table was measured at (Open-Meteo previous runs 0, 1, 2, 4 and 6 days before). */
export const LEAD_DAYS = [{", ".join(map(str, LEAD_DAYS))}] as const

/** Day of year of each season's centre (winter, spring, summer, autumn); the correction moves linearly between them. */
export const SEASON_CENTRE_DOY = [{", ".join(map(str, CENTRE_DOY))}] as const

/**
 * Degrees to ADD to the blended hourly temperature: [lead][season][hour of local standard time, UTC+2].
 * The national mean of (observed − forecast); it mostly lifts the afternoon, which the models forecast too cold.
 */
export const HOURLY_ADD: readonly (readonly (readonly number[])[])[] = [
{hourly_ts}]

/**
 * Degrees to ADD to the blended daily maximum, per lead (same LEAD_DAYS). About half is the peak falling between the
 * hourly values the daily maximum is taken from; half is the models' own cold bias.
 */
export const DAILY_MAX_ADD = [{", ".join(f"{dmax[l]:.2f}" for l in LEADS)}] as const
""")
    print("wrote", OUT_TS)


if __name__ == "__main__":
    main()
