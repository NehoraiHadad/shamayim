/** Numbers with their unit ("16°", "11:00", "9 מ״מ") isolated as LTR so the ° never flips in RTL. */
const NUMERIC = /(−?\d+(?::\d\d)?°?)/

export function isolateNumbers(s: string) {
  return s.split(NUMERIC).map((part, i) => (i % 2 ? <bdi key={i}>{part}</bdi> : part))
}
