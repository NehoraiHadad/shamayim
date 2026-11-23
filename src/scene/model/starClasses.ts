//# allFunctionsCalledOnLoad
/**
 * The night sky's stars in three brightness classes, each appearing at the sun depression where it really does:
 * a handful of the brightest (planets, first-magnitude stars) once civil twilight ends (~−5°), the bulk of the
 * naked-eye stars through nautical twilight (by ~−12°), the faint ones only near astronomical night (~−17°).
 */
export const STAR_CLASSES = [
  { count: 5, from: -4.5, full: -8, alpha: [0.8, 1] },
  { count: 15, from: -7, full: -12, alpha: [0.5, 0.8] },
  { count: 26, from: -11, full: -17, alpha: [0.3, 0.55] },
] as const

/** How visible a class is at this sun altitude (0..1), before cloud. */
export const starShare = (altitude: number, { from, full }: { from: number; full: number }) =>
  Math.min(1, Math.max(0, (from - altitude) / (from - full)))
