import styles from './WearLine.module.css'

/**
 * A spring clothespin pushed down over the line, in garment-local coords (the rope passes at y = 0). The levers
 * stand above the rope, the spring coil sits just above it and the jaws bite the cloth's top edge below it. The
 * cloth bunches under the jaws, and on two-peg tops tension creases drag from each peg toward the slack middle.
 */
export function Peg({ x, tilt, drag }: { x: number; tilt: number; drag: boolean }) {
  return (
    <g>
      <ellipse className={styles.bunch} cx={x} cy={2.3} rx={2.9} ry={0.9} />
      {drag && <path className={styles.crease} d={`M${x * 0.86} 3Q${x * 0.74} 6 ${x * 0.5} 7.8M${x * 1.02} 3.6Q${x * 0.98} 6.6 ${x * 0.84} 9`} />}
      <g transform={`translate(${x} 0) rotate(${tilt.toFixed(1)} 0 0)`}>
        <path className={styles.peg} d="M-1.15 -4.8H1.15L0.95 -2.2 1.25 -1.5 0.85 2.9Q0 3.6-0.85 2.9L-1.25 -1.5-0.95 -2.2Z" />
        <path className={styles.pegSlit} d="M0 -4.6V3" />
        <rect className={styles.spring} x={-1.6} y={-2.5} width={3.2} height={1} rx={0.4} />
      </g>
    </g>
  )
}

/** A hand-placed look: each peg leans a little, never the same way twice along the line. */
export const pegTilt = (garment: number, peg: number) => ((garment * 7 + peg * 13) % 5) * 2.4 - 4.8
