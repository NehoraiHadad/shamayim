/**
 * One wind cycle on the line, shared by the rope (SMIL) and the cloth (CSS keyframes in WearLine.module.css, which
 * must keep these same stops): a gust, a lull, a second gust, a small back-swing, a dying puff, then still.
 */
export const GUST_TIMES = [0, 0.18, 0.3, 0.48, 0.62, 0.8, 1]
export const GUST = [0, 1, 0.35, 0.9, -0.25, 0.6, 0]

/** How hard the day blows, 0..1: still below ~8 km/h, full by ~38 km/h. */
export const blowOf = (speed: number) => Math.min(1, Math.max(0, (speed - 8) / 30))

/** A weight hung on the line: where it pulls, and how far down. */
export interface Load { x: number; drop: number }

/** How far a point load drags its neighbours down with it (px): the line kinks at the peg and eases away. */
const REACH = 24

/**
 * A sagging line between two posts; `sag` is the dip at the middle. Each load kinks the line down at its point (a
 * pegged weight bends a cord to a corner, not a curve); the ends stay tied. Sampled as a polyline that always has
 * the same points, so SMIL can morph between gust shapes; the load points are vertices, so the kinks stay sharp.
 */
export function rope(w: number, endY: number, sag: number, loads: Load[] = []) {
  const y = (x: number) => {
    const pull = loads.reduce((s, l) => s + l.drop * Math.exp(-Math.abs(x - l.x) / REACH), 0)
    return endY + 4 * sag * (x / w) * (1 - x / w) + pull * Math.sin((Math.PI * x) / w)
  }
  const xs = [...Array.from({ length: Math.ceil(w / 5) + 1 }, (_, i) => Math.min(w, i * 5)), ...loads.map((l) => l.x)]
  const pts = [...new Set(xs.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b)
  return { y, d: pts.map((x, i) => `${i ? 'L' : 'M'}${x} ${y(x).toFixed(2)}`).join('') }
}

/** SMIL attributes for one cycle: values per gust stop, smooth between stops. */
export function smil(dur: string, values: string[]) {
  return {
    dur,
    repeatCount: 'indefinite',
    values: values.join(';'),
    keyTimes: GUST_TIMES.join(';'),
    calcMode: 'spline',
    keySplines: Array(GUST.length - 1).fill('.45 0 .55 1').join(';'),
  }
}
