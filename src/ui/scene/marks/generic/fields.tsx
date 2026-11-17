import styles from '../marks.module.css'

/** Patches on the hillside face that follow the ground (ILLUSTRATION.md §3: orchard, vineyard, solar). */
interface Props { x: number; depth: number; ground: (x: number) => number; width: number }

function Orchard({ x, depth, ground, width }: Props) {
  const crowns: React.JSX.Element[] = []
  for (let row = 0; row < 3; row++) {
    for (let cx = x - width / 2 + (row % 2) * 1.75; cx <= x + width / 2; cx += 3.5) {
      crowns.push(<circle key={`${row}-${cx}`} cx={cx} cy={ground(cx) + depth + row * 2.6} r={1.4} />)
    }
  }
  return <g className={styles.green}>{crowns}</g>
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

function Solar({ x, depth, ground, width }: Props) {
  const panels: React.JSX.Element[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const px = x - width / 2 + col * 4.5 + row * .8
      const py = ground(px) + depth + row * 2
      panels.push(<path key={`${row}-${col}`} d={`M${px.toFixed(1)} ${py.toFixed(1)}h3.5l-.9 1.5h-3.5z`} />)
    }
  }
  return <g className={styles.panel}>{panels}</g>
}

export function Field({ kind, ...props }: Props & { kind: string }) {
  if (kind === 'solar') return <Solar {...props} />
  if (kind === 'vineyard') return <Vineyard {...props} />
  return <Orchard {...props} />
}
