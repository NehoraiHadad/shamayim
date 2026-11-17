import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'
import { roof, taper } from './geometry'

/** Turbine, mast, lighthouse and bridge in px around the base point (ILLUSTRATION.md §3). */

/** One blade pointing up from the hub: 1.2 wide at the root, 0.5 at the tip. */
function blade(length: number, angle: number) {
  return <path key={angle} transform={`rotate(${angle})`} d={`M-.6 0L-.25 ${-length}h.5L.6 0z`} />
}

/**
 * White tower (wall tone: the turbines are white), nacelle, three blades parked one up (90° / 210° / 330°).
 * The invisible circle centres the blade group's fill-box on the hub, so `.blades` spins about it.
 */
export function Turbine({ h, spin = false }: BuildingProps) {
  const length = .42 * h
  return <>
    <path className={styles.wall} d={taper(0, 1.6, 1, h)} />
    <g transform={`translate(0 ${-h})`}>
      <g className={`${styles.wall} ${spin ? styles.blades : ''}`}>
        <circle r={length} fill="none" />
        {/* Turning blades trail two fainter copies, so spin reads as speed, not as a slow stiff wheel. */}
        {spin && [[-14, .35], [-28, .15]].map(([lag, alpha]) => (
          <g key={lag} opacity={alpha}>{[0, 120, 240].map((angle) => blade(length, angle + lag))}</g>
        ))}
        {[0, 120, 240].map((angle) => blade(length, angle))}
      </g>
      <rect className={styles.wall} x={-1} y={-.75} width={2.5} height={1.5} />
    </g>
  </>
}

/** Open lattice: two legs, two cross bars, a 1 px spike. Not a filled line, so it never reads as a chimney. */
export function Mast({ h }: BuildingProps) {
  const top = h - 2
  const leg = (side: number) => `M${side * 2.5} 0H${side * 1.5}L${side * -.1} ${-top}H${side * .8}z`
  return <g className={styles.solid} opacity={.8}>
    <path d={leg(-1)} />
    <path d={leg(1)} />
    <rect x={-1.9} y={-.35 * top} width={3.8} height={1} />
    <rect x={-1.1} y={-.68 * top} width={2.2} height={1} />
    <rect x={-.5} y={-h} width={1} height={2} />
  </g>
}

/** White tapered tower, gallery, lantern (lit at night), dome cap; the keeper's house beside it. */
export function Lighthouse({ h, night }: BuildingProps) {
  const body = h - 4.5
  return <>
    <rect className={styles.wall} x={1} y={-3} width={4.5} height={3} />
    <path className={styles.roof} d={roof(3.25, -3, 5.5, 1.5, 1)} />
    <path className={styles.wall} d={taper(-1.5, 4, 2.6, body)} />
    <rect className={styles.solid} x={-3.5} y={-body - 1} width={4} height={1} />
    <rect className={night ? styles.win : styles.shade} x={-2.6} y={-body - 2.8} width={2.2} height={1.8} />
    {night && <circle className={styles.win} cx={-1.5} cy={-body - 1.9} r={3} opacity={.3} />}
    <path className={styles.solid} d={`M-2.8 ${-body - 2.8}a1.3 1.5 0 0 1 2.6 0z`} />
    <rect className={styles.solid} x={-1.9} y={-h} width={.8} height={1.2} />
  </>
}

/** Cable-stayed span: deck (girder edge in shade) on two piers, one pylon, a fan of stays to each side. */
export function Bridge({ h }: BuildingProps) {
  const deck = -4
  const stays = [-11, -8, -5, 5, 8, 11]
  return <>
    <rect className={styles.wall} x={-8} y={deck} width={1.5} height={-deck} />
    <rect className={styles.wall} x={6.5} y={deck} width={1.5} height={-deck} />
    <rect className={styles.wall} x={-12} y={deck - 1.5} width={24} height={1.5} />
    <rect className={styles.shade} x={-12} y={deck - .5} width={24} height={.5} />
    <path className={styles.wall} d={taper(0, 1.8, 1.2, h)} />
    <g className={styles.cable}>{stays.map((x) => (
      <line key={x} x1={Math.sign(x) * .4} y1={-h + 1.5 + (11 - Math.abs(x)) * .5} x2={x} y2={deck - 1.5} />
    ))}</g>
  </>
}
