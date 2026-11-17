import styles from '../marks.module.css'

/** Patches on the hillside face that follow the ground (ILLUSTRATION.md §3: orchard, vineyard, solar). */
interface Props { x: number; depth: number; ground: (x: number) => number; width: number }

/** Stable 0..1 noise per tree, so the orchard is planted by hand rather than stamped. */
const noise = (i: number, x: number) => {
  const value = Math.sin(i * 12.9898 + x * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function Orchard({ x, depth, ground, width }: Props) {
  const trees: { cx: number; cy: number; r: number; key: string }[] = []
  for (let row = 0; row < 3; row++) {
    let i = row * 40
    for (let cx = x - width / 2 + (row % 2) * 1.75; cx <= x + width / 2; cx += 3.5, i++) {
      if (noise(i, x) < .2) continue
      const tx = cx + (noise(i + 7, x) - .5) * 1.2
      trees.push({ key: `${row}-${i}`, cx: tx, cy: ground(tx) + depth + row * 2.6 + (noise(i + 3, x) - .5), r: 1.1 + .5 * noise(i + 5, x) })
    }
  }
  return <>
    <g className={styles.shade}>{trees.map((t) => <ellipse key={t.key} cx={t.cx + .5} cy={t.cy + t.r * .8} rx={t.r * .8} ry={.45} />)}</g>
    <g className={styles.green}>{trees.map((t) => <circle key={t.key} cx={t.cx} cy={t.cy} r={t.r} />)}</g>
  </>
}

function Vineyard({ x, depth, ground, width }: Props) {
  return <g className={styles.vine}>{[0, 1, 2, 3].map((row) => {
    const from = x - width / 2 + (row % 2) * 2
    const to = x + width / 2 - ((row + 1) % 3)
    const points: string[] = []
    for (let px = from; px <= to; px += 2) points.push(`${px.toFixed(1)} ${(ground(px) + depth + row * 2).toFixed(1)}`)
    return <path key={row} d={`M${points.join('L')}`} />
  })}</g>
}

/** One band along the slope: its top edge follows the ground, the lower edge is offset by (dx, thick). */
function band(ground: (x: number) => number, from: number, to: number, y: number, thick: number, dx: number) {
  const xs: number[] = []
  for (let px = from; px < to; px += 2) xs.push(px)
  xs.push(to)
  const top = xs.map((px) => `${px.toFixed(1)} ${(ground(px) + y).toFixed(1)}`)
  const bottom = xs.reverse().map((px) => `${(px + dx).toFixed(1)} ${(ground(px) + y + thick).toFixed(1)}`)
  return `M${top.join('L')}L${bottom.join('L')}z`
}

/** Solar rows: continuous panel strips that follow the slope, each with a lit top edge. */
function Solar({ x, depth, ground, width }: Props) {
  return <>{[0, 1, 2].map((row) => {
    const from = x - width / 2 + row * .8
    const to = x + width / 2 - (2 - row) * .6
    const y = depth + row * 2.2
    return <g key={row}>
      <path className={styles.panel} d={band(ground, from, to, y, 1.5, -.9)} />
      <path className={styles.lit} d={band(ground, from, to, y, .4, -.25)} />
    </g>
  })}</>
}

export function Field({ kind, ...props }: Props & { kind: string }) {
  if (kind === 'solar') return <Solar {...props} />
  if (kind === 'vineyard') return <Vineyard {...props} />
  return <Orchard {...props} />
}
