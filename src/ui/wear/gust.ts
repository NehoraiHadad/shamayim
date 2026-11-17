/**
 * One wind cycle on the line, shared by the rope (SMIL) and the cloth (CSS keyframes in WearLine.module.css, which
 * must keep these same stops): a gust, a lull, a second gust, a small back-swing, a dying puff, then still.
 */
export const GUST_TIMES = [0, 0.18, 0.3, 0.48, 0.62, 0.8, 1]
export const GUST = [0, 1, 0.35, 0.9, -0.25, 0.6, 0]

/** How hard the day blows, 0..1: still below ~8 km/h, full by ~38 km/h. */
export const blowOf = (speed: number) => Math.min(1, Math.max(0, (speed - 8) / 30))

/** A sagging line between two posts as a quadratic; `sag` is the dip at the middle. */
export function rope(w: number, endY: number, sag: number) {
  const y = (x: number) => endY + 4 * sag * (x / w) * (1 - x / w)
  return { y, d: `M0 ${endY}Q${w / 2} ${(endY + 2 * sag).toFixed(2)} ${w} ${endY}` }
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
