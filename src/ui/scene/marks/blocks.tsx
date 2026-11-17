import { seeded } from '../../../data/landmarks/hash'
import { PARAPET, STOREY } from '../../../data/landmarks/settlement'
import styles from './marks.module.css'

/**
 * A hill-town block (Umm al-Fahm, Wadi Ara, old Tiberias): a flat-roofed concrete or stone house of two to five
 * storeys, drawn around the base point with the sun on the LEFT (the caller mirrors it). Lit side face, body face, a
 * parapet catching the sky, a row of small windows per storey, and the roof clutter of almost every such house: black
 * water tanks, a solar heater, rebar stubs left for the next storey.
 */
interface Props { w: number; h: number; seed: number; night: boolean; lit: boolean }

const PANE_W = .9
const PANE_H = 1.1
const PANE_PITCH = 1.9

function Windows({ w, h, seed, night, lit }: Props) {
  if (night && !lit) return null
  const random = seeded(seed)
  const left = -w / 2 + Math.min(2.2, w * .3) + .7
  const columns = Math.max(1, Math.floor((w / 2 - .6 - left) / PANE_PITCH))
  const storeys = Math.round((h - PARAPET) / STOREY)
  const panes: [number, number][] = []
  for (let storey = 0; storey < storeys; storey++) {
    for (let column = 0; column < columns; column++) {
      /** Day: most panes read dark against the wall. Night: only some rooms are lit. */
      if (random() < (night ? .55 : .2)) continue
      panes.push([left + column * PANE_PITCH, -(storey + 1) * STOREY + .7])
    }
  }
  return <>{panes.map(([x, y]) => (
    <rect key={`${x}-${y}`} className={night ? styles.win : styles.pane} x={x} y={y} width={PANE_W} height={PANE_H} />
  ))}</>
}

function RoofClutter({ w, h, seed }: Pick<Props, 'w' | 'h' | 'seed'>) {
  const tanks = seed % 4 === 0 ? 2 : seed % 4 === 3 ? 0 : 1
  const right = w / 2
  const from = -w / 2 + .8 + ((seed >> 3) % 3) * 1.1
  return <>
    {Array.from({ length: tanks }, (_, i) => (
      <rect key={i} className={styles.tank} x={from + i * 1.9} y={-h - 1.3} width={1.6} height={.9} rx={.45} />
    ))}
    {seed % 10 < 3 && <>
      <rect className={styles.top} x={right - 2.6} y={-h - 1.4} width={1.4} height={.8} />
      <path className={styles.wall} d={`M${right - 1} ${-h - .5}h1l-.6 -1.3h-1z`} />
    </>}
    {seed % 5 === 0 && [right - .8, right - 2.2].map((x) => (
      <rect key={x} className={styles.shade} x={x} y={-h - 1.6} width={.3} height={1.2} />
    ))}
  </>
}

export function BlockHouse(props: Props) {
  const { w, h, seed } = props
  const left = -w / 2
  const side = Math.min(2.2, w * .3)
  return <>
    <rect className={styles.wall} x={left} y={-h} width={w} height={h} />
    <rect className={styles.side} x={left} y={-h} width={side} height={h} />
    <rect className={styles.top} x={left} y={-h - .6} width={w} height={.6} />
    <rect className={styles.shade} x={left + side} y={-h} width={w - side} height={.35} />
    <Windows {...props} />
    <RoofClutter w={w} h={h} seed={seed} />
  </>
}
