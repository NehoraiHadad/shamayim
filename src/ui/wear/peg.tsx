import styles from './WearLine.module.css'

/**
 * A spring clothespin pushed down over the line, in garment-local coords (the rope passes at y = 0). The levers
 * stand above the rope, the wire spring sits just above it and the jaws bite the cloth's top edge below it. The
 * cloth bunches under the jaws; on two-peg tops the cloth's weight hangs from each peg in a long gravity fold that
 * dies out toward the hem (`hem`), and a short drag crease pulls toward the slack middle.
 */
export function Peg({ x, tilt, hem }: { x: number; tilt: number; hem?: number }) {
  const mid = hem && (3.4 + hem) / 2
  return (
    <g>
      {hem && (
        <>
          <path className={styles.fold} d={`M${x - 0.4} 3.4Q${x - 1.7} ${mid} ${x * 0.86} ${hem - 2.5}Q${x + 0.4} ${mid} ${x + 0.6} 3.4Z`} />
          <path className={styles.crease} d={`M${x * 0.86} 3Q${x * 0.74} 6 ${x * 0.5} 7.8`} />
        </>
      )}
      <ellipse className={styles.bunch} cx={x} cy={2.4} rx={2.6} ry={0.8} />
      <g transform={`translate(${x} 0) rotate(${tilt.toFixed(1)} 0 0)`}>
        <path className={styles.peg} d="M-1.15 -4.8H1.15L0.95 -2.2 1.25 -1.5 0.85 2.9Q0 3.6-0.85 2.9L-1.25 -1.5-0.95 -2.2Z" />
        {/* The far prong's edge catches the light; the slit where the two prongs meet. */}
        <path className={styles.pegLight} d="M-0.75 -4.4V-2.4M-0.85 -1.2L-0.6 2.4" />
        <path className={styles.pegSlit} d="M0 -4.6V3" />
        {/* The wire spring: a coil wound round both prongs. */}
        <rect className={styles.spring} x={-1.6} y={-2.5} width={3.2} height={1.1} rx={0.45} />
        <path className={styles.coil} d="M-1.1 -2.5v1.1M-0.35 -2.5v1.1M0.4 -2.5v1.1M1.15 -2.5v1.1" />
      </g>
    </g>
  )
}
