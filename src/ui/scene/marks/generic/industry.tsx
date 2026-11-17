import styles from '../marks.module.css'
import type { BuildingProps } from './buildingSpecs'
import { seeded, taper } from './geometry'
import { Windows } from './parts'

/**
 * Tall industrial and city kinds in px around the base point (x 0 centre, y 0 ground, up negative), per
 * docs/design/ILLUSTRATION.md §3. Bodies are ridge-toned so the sun-side strip from HillMarks gives them a lit face.
 */

/** Slab with an off-centre roof plant and a lower rear slab, so a tower never stands alone as a bare pole (R5). */
export function Highrise({ h, night, seed = 1, litShare = 1 }: BuildingProps) {
  const flip = seed % 2 ? -1 : 1
  const slab = h - 1.5
  const rear = Math.max(7, h * .6)
  return <g transform={flip < 0 ? 'scale(-1 1)' : undefined}>
    <rect className={styles.backTone} x={.5} y={-rear} width={4.5} height={rear} />
    <rect className={styles.wall} x={-4} y={-slab} width={6.5} height={slab} />
    {/* Floor bands every ~3 storeys give the slab its scale; they stop short of the edges like real spandrels. */}
    {Array.from({ length: Math.floor(slab / 3.2) - 1 }, (_, i) => <rect key={i} className={styles.shade} opacity={.35}
      x={-3.5} y={-slab + 3.2 * (i + 1)} width={5.5} height={.5} />)}
    <rect className={styles.solid} x={-2.5 + seeded(seed)() * 1.5} y={-h} width={2.5} height={1.5} />
    {night && <Windows x={-3.25} top={-slab + 2} bottom={-2} cols={2} seed={seed} share={litShare} max={6} />}
  </g>
}

/**
 * Power-station stack (reference: Reading D, Orot Rabin photos): turbine hall block with a dark roof edge, concrete
 * stack tapering 3.5 → 2.5, a heavier rim cap, and the soot-dark band under it.
 */
export function Chimney({ h }: BuildingProps) {
  return <>
    <rect className={styles.wall} x={-4.5} y={-3} width={9} height={3} />
    <rect className={styles.solid} x={-4.5} y={-3.5} width={5} height={.5} />
    <path className={styles.wall} d={taper(1.75, 3.5, 2.5, h - 1, 3)} />
    <rect className={styles.solid} x={.4} y={-h} width={2.7} height={1} />
    <rect className={styles.shade} x={.5} y={-h + 1} width={2.5} height={1.5} />
  </>
}

/**
 * Natural-draught cooling tower (reference: Bazan Haifa, Hadera photos): hyperboloid concrete shell, waist at 65 %,
 * flared rim with a dark lip, a dark air-inlet band at the foot (legs too fine to draw). Base 12 · waist 8 · rim 9 at 14 tall.
 */
export function Cooling({ h }: BuildingProps) {
  const k = h / 14
  const [base, waist, rim] = [6 * k, 4 * k, 4.5 * k]
  const waistY = -.65 * h
  return <>
    <path className={styles.wall} d={`M${-base} 0Q${-waist} ${-.42 * h} ${-waist} ${waistY}Q${-waist} ${-.86 * h} ${-rim} ${-h}`
      + `H${rim}Q${waist} ${-.86 * h} ${waist} ${waistY}Q${waist} ${-.42 * h} ${base} 0z`} />
    <rect className={styles.shade} x={-rim + .3} y={-h} width={2 * rim - .6} height={1} />
    {/* Air inlet: the shell stands on raking legs over a dark gap at its foot; at 1.5 px the legs merge into it. */}
    <rect className={styles.shade} x={-base + .8} y={-1.2} width={2 * base - 1.6} height={1.2} />
  </>
}

/**
 * Grain / feed silo (reference: Dagon Haifa, kibbutz feed mills): a row of flat-topped concrete bins with dark joints,
 * a conveyor gallery along their tops, and a taller elevator head house with its stair tower.
 */
export function Silo({ h, night, seed = 1 }: BuildingProps) {
  const bins = h * .74
  return <g transform={seed % 2 ? 'scale(-1 1)' : undefined}>
    <rect className={styles.wall} x={-6.5} y={-bins} width={9.5} height={bins} />
    {[-3.6, -.6].map((x) => <rect key={x} className={styles.shade} x={x} y={-bins + .8} width={.6} height={bins - .8} />)}
    <rect className={styles.solid} x={-6} y={-bins - 1.5} width={8.5} height={1.5} />
    <rect className={styles.wall} x={3} y={-h + 1.5} width={3.5} height={h - 1.5} />
    <rect className={styles.solid} x={3.3} y={-h} width={2.4} height={1.5} />
    <rect className={styles.shade} x={5} y={-h + 3} width={1.5} height={h - 4} opacity={.6} />
    {night && <rect className={styles.win} x={3.5} y={-h + 3.5} width={1.5} height={1.5} />}
  </g>
}
