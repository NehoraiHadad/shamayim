/** Subdivide only rejected spans. Every retained span passed a conservative footprint check. */
export function clipSpans(
  top: number, bottom: number, fits: (a: number, b: number) => boolean, emit: (a: number, b: number) => void,
  minHeight = 2,
): void {
  let start: number | undefined, end = top
  function flush() {
    if (start !== undefined) emit(start, end)
    start = undefined
  }
  function scan(a: number, b: number) {
    if (fits(a, b)) {
      // A new combined bounding box may include more ground than its two constituent spans.
      if (start !== undefined && !fits(start, b)) flush()
      start ??= a
      end = b
      return
    }
    if (b - a < minHeight * 2) { flush(); return }
    const mid = (a + b) / 2
    scan(a, mid)
    scan(mid, b)
  }
  scan(top, bottom)
  flush()
}
