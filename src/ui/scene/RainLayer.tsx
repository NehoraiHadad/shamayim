import { useId } from 'react'
import type { Sight } from '../../data/landmarks/project'
import type { RainColumn } from '../../data/world/rainView'
import styles from './ValleyScene.module.css'

/** Which rain this layer draws, by its distance against the land in its direction. */
export type RainDepth = 'behind' | 'between' | 'front'

const depthOf = (column: RainColumn, sight: Sight): RainDepth =>
  column.km > sight.farKm ? 'behind' : column.km > sight.nearKm ? 'between' : 'front'

/** How dark a curtain is: by its strength, paler with distance (the haze between). */
const alphaOf = ({ band, km }: RainColumn) => [0, .3, .45, .6][band] * Math.max(.3, 1 - km / 120)

/**
 * Rain curtains where the radar sees them (`rainView.ts`), in one depth layer of a backdrop sector: from the cloud base
 * down past the land, which is drawn over them where it stands in front. Neighbouring columns of one strength and
 * near-equal distance join into one soft curtain with a darker base of cloud on top and faint falling streaks.
 */
export function RainLayer({ columns, sightAt, depth }: { columns: RainColumn[]; sightAt: (x: number) => Sight; depth: RainDepth }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mine = columns.filter(column => depthOf(column, sightAt((column.left + column.right) / 2)) === depth)
  if (!mine.length) return null
  // Curtains join neighbours of one strength at a similar distance; cloud masses join every touching column.
  const join = (same: (a: RainColumn, b: RainColumn) => boolean) => {
    const runs: RainColumn[][] = []
    for (const column of mine) {
      const run = runs.at(-1)
      const last = run?.at(-1)
      if (run && last && last.right === column.left && same(last, column)) run.push(column)
      else runs.push([column])
    }
    return runs
  }
  const runs = join((a, b) => a.band === b.band && Math.abs(a.km - b.km) < 15)
  const masses = join(() => true)
  return (
    <svg className={styles.land} viewBox="0 0 375 128" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.rainTop} />
          <stop offset="1" className={styles.rainFoot} />
        </linearGradient>
        <pattern id={`${id}s`} width="3" height="6" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
          <path d="M1 0v4" className={styles.rainStreak} />
        </pattern>
        <filter id={`${id}b`} x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="1.4 .8" /></filter>
        <filter id={`${id}c`} x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="2.2 1.6" /></filter>
      </defs>
      {/* The clouds the rain falls from: soft, rounded tops over the curtains, as high as the storm. */}
      <g filter={`url(#${id}c)`}>
        {masses.map(run => {
          // The cloud rounds off at its ends instead of standing as a wall: the top sinks toward the base over a few columns.
          const ease = (i: number) => { const e = Math.min(i, run.length - 1 - i); return e >= 6 ? 1 : Math.sin((e + 1) / 7 * Math.PI / 2) }
          const topOf = (c: RainColumn, i: number) => c.top - (c.top - c.cloudTop) * ease(i)
          const tops = run.map((c, i) => `${c.left} ${topOf(c, i).toFixed(1)}L${c.right} ${topOf(c, i).toFixed(1)}`).join('L')
          const base = [...run].reverse().map(c => `${c.right} ${(c.top + 3).toFixed(1)}L${c.left} ${(c.top + 3).toFixed(1)}`).join('L')
          const alpha = Math.max(...run.map(alphaOf))
          return <path key={`c${run[0].left}`} d={`M${tops}L${base}Z`} className={styles.rainMass}
            opacity={Math.min(.92, .45 + alpha * 1.2).toFixed(3)} />
        })}
      </g>
      <g filter={`url(#${id}b)`}>
        {runs.map(run => {
          const top = run.map(c => `${c.left},${c.top.toFixed(1)} ${c.right},${c.top.toFixed(1)}`).join(' ')
          const outline = `M${top.replace(/ /g, 'L').replace(/,/g, ' ')}L${run.at(-1)!.right} 128L${run[0].left} 128Z`
          const cap = `M${top.replace(/ /g, 'L').replace(/,/g, ' ')}L${[...run].reverse().map(c => `${c.right} ${(c.top + 4).toFixed(1)}L${c.left} ${(c.top + 4).toFixed(1)}`).join('L')}Z`
          const alpha = alphaOf(run[0])
          return (
            <g key={`${run[0].left}`} opacity={alpha.toFixed(3)}>
              <path d={outline} fill={`url(#${id}f)`} />
              <path d={outline} fill={`url(#${id}s)`} opacity=".5" />
              <path d={cap} className={styles.rainCloud} />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
