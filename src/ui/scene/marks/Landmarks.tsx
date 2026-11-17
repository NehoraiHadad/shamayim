import { useEffect, useState, type CSSProperties } from 'react'
import type { MarkLife } from '../../../data/landmarks/types'
import type { PlacedMark } from '../../../data/landmarks/types'
import { markWidth } from '../../../data/landmarks/project'
import { GenericGlyph } from './glyphs/Generic'
import { HaifaGlyph } from './glyphs/Haifa'
import { JerusalemGlyph } from './glyphs/Jerusalem'
import { ShadmotGlyph } from './glyphs/Shadmot'
import { TelAvivGlyph } from './glyphs/TelAviv'
import styles from './marks.module.css'

interface Props { marks: PlacedMark[]; layer: 'near' | 'far'; life: MarkLife; readout: boolean; fade: number }
type ConnectionNavigator = Navigator & { connection?: { saveData?: boolean } }

function motionAllowed(media: MediaQueryList) {
  return !media.matches && !(navigator as ConnectionNavigator).connection?.saveData
}

function useMotionState() {
  const [state, setState] = useState({ allowed: motionAllowed(matchMedia('(prefers-reduced-motion: reduce)')),
    hidden: document.hidden, generation: 0 })
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setState((previous) => ({
      allowed: motionAllowed(media), hidden: document.hidden,
      generation: previous.hidden && !document.hidden ? previous.generation + 1 : previous.generation,
    }))
    update()
    media.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return state
}

function Glyph({ mark, moving, swaying }: { mark: PlacedMark; moving: boolean; swaying: boolean }) {
  const crownClass = `${styles.crown} ${swaying ? styles.sway : ''}`
  if (mark.glyph.startsWith('jerusalem-')) return <JerusalemGlyph glyph={mark.glyph} accentClass={styles.accent} />
  if (mark.glyph.startsWith('tel-aviv-')) return <TelAvivGlyph glyph={mark.glyph} />
  if (mark.glyph.startsWith('haifa-')) return <HaifaGlyph glyph={mark.glyph} />
  if (mark.glyph.startsWith('shadmot-')) return <ShadmotGlyph glyph={mark.glyph} crownClass={crownClass} />
  return <GenericGlyph glyph={mark.glyph} moving={moving} bladeClass={styles.blades} crownClass={crownClass} />
}

function dimensions(mark: PlacedMark) {
  const viewWidth = mark.glyph === 'tel-aviv-azrieli' ? 40 : ['solar', 'homes'].includes(mark.kind) ? 36 : 32
  return { width: markWidth(mark.kind, mark.glyph, mark.hPx), viewWidth }
}

function windows(mark: PlacedMark, share: number) {
  let seed = [...mark.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  if (!mark.lights || (seed % 100) / 100 >= share) return null
  const count = 2 + seed % 5
  return Array.from({ length: count }, (_, index) => {
    seed = seed * 16807 % 2147483647
    const x = mark.kind === 'highrise' ? 13 + seed % 6 : 10 + seed % 16
    const y = 15 + (seed >> 4) % 17
    return <rect key={index} x={x} y={y} width="1.5" height="1.5" />
  })
}

export function Landmarks({ marks, layer, life, readout, fade }: Props) {
  const motion = useMotionState()
  if (layer === 'far' && life.hideFar) return null
  return <div className={`${styles.layer} ${styles[layer]}`} data-hidden={motion.hidden || undefined} aria-hidden="true">
    {marks.filter((mark) => mark.layer === layer).map((mark) => {
      const { width, viewWidth } = dimensions(mark)
      const sway = motion.allowed && life.sway && ['palms', 'orchard'].includes(mark.kind)
      const turbine = motion.allowed && mark.kind === 'turbine' && life.turbinePeriodS
      const custom = {
        '--lean': `${life.leanDeg}deg`, '--sway': `${life.sway?.ampDeg ?? 0}deg`,
        '--sway-period': `${life.sway?.periodS ?? 2.6}s`, '--turbine-period': `${life.turbinePeriodS ?? 7}s`,
        '--sway-count': 20 / (life.sway?.periodS ?? 2.6),
        '--turbine-count': 20 / (life.turbinePeriodS ?? 7),
        '--mark-bleach': life.farBleach,
      } as CSSProperties
      return <svg key={`${mark.id}-${motion.generation}`} className={styles.mark}
        viewBox={`0 0 ${viewWidth} 40`} style={{ ...custom, left: `${mark.xPct}%`, top: mark.baseY - mark.hPx + 2,
          width, height: mark.hPx, opacity: readout && mark.baseY - mark.hPx < 22 ? .35 : undefined }}>
        <g className={styles.body}><Glyph mark={mark} moving={Boolean(turbine)} swaying={Boolean(sway)} /></g>
        <g className={`${styles.lights} ${fade > .4 ? styles.halo : ''}`} style={{ opacity: .85 * (1 - .7 * fade) }}>
          {windows(mark, life.litShare)}
          {life.aviation && mark.tall && <circle className={styles.aviation} cx={viewWidth / 2} cy="2" r="1.2" />}
        </g>
      </svg>
    })}
  </div>
}
