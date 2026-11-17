/** Path and random helpers shared by the px-space glyphs. */

/** Park–Miller generator, stable for a given seed, so lit windows do not flicker between renders. */
export function seeded(seed: number) {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1
  return () => (state = state * 16807 % 2147483647) / 2147483647
}

/** A shaft tapering from `base` wide at y 0 to `top` wide at y −h, centred on `x`. */
export function taper(x: number, base: number, top: number, h: number, from = 0) {
  return `M${x - base / 2} ${-from}h${base}l${-(base - top) / 2} ${-(h - from)}h${-top}z`
}

/** A gable / hip roof: `w` wide at `y`, rising `rise`, with a flat ridge `ridge` wide. */
export function roof(x: number, y: number, w: number, rise: number, ridge = 0) {
  return `M${x - w / 2} ${y}h${w}l${-(w - ridge) / 2} ${-rise}h${-ridge}z`
}
