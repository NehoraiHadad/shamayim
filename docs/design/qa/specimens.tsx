// Dev-only specimen plate (served by `vite` at /docs/design/qa/specimens.html?set=generic|curated): every px glyph
// at 6x and true size, day and night, lit from the west, seated on flat ground. Not part of the build.
import { createRoot } from 'react-dom/client'
import type { MarkLife, PlacedMark } from '../../../src/data/landmarks/types'
import { MarkBuilding } from '../../../src/ui/scene/marks/MarkBuilding'
import styles from '../../../src/ui/scene/marks/marks.module.css'
import { themeVars } from '../../../src/theme/skyThemes'

const GENERIC: [string, number, boolean][] = [['minaret', 18, false], ['synagogue', 9, false], ['church', 15, false],
  ['waterTower', 16, false], ['castle', 9, false], ['highrise', 24, true], ['chimney', 26, true], ['cooling', 14, true],
  ['silo', 16, false], ['turbine', 23, true], ['mast', 22, true], ['lighthouse', 16, false], ['bridge', 18, false],
  ['palms', 11, false]]
const CURATED: [string, number, boolean][] = [['jerusalem-bridge', 26, true], ['jerusalem-ymca', 19, false],
  ['jerusalem-david', 17, false], ['jerusalem-wall', 18, false], ['tel-aviv-shalom', 28, true],
  ['tel-aviv-reading', 28, true], ['tel-aviv-sarona', 34, true], ['tel-aviv-azrieli', 31, true], ['haifa-bab', 14, false],
  ['haifa-dagon', 22, true], ['haifa-sail', 28, true], ['haifa-cooling', 22, true], ['shadmot-palms', 11, false],
  ['shadmot-homes', 8, false]]

const set = new URLSearchParams(location.search).get('set') === 'curated' ? CURATED : GENERIC
const life = (night: boolean): MarkLife => ({ litShare: night ? 1 : 0, aviation: night, leanDeg: 0, sway: null,
  turbinePeriodS: null, hideFar: false, farBleach: 1 })

export function Specimen({ glyph, hPx, tall, night, zoom }: { glyph: string; hPx: number; tall: boolean; night: boolean; zoom: number }) {
  const [w, h, ground] = [44, 44, 38]
  const mark: PlacedMark = { id: glyph, kind: (glyph.includes('-') ? 'custom' : glyph) as PlacedMark['kind'], glyph,
    layer: 'near', xPct: 50, baseY: ground, hPx, lights: 4, tall, dy: 0 }
  return <svg className={`${styles.px} ${night ? styles.night : ''}`} viewBox={`0 0 ${w} ${h}`}
    style={{ position: 'static', width: w * zoom, height: h * zoom, background: 'var(--sky-horizon)' }}>
    <rect x={0} y={ground} width={w} height={h - ground} style={{ fill: 'var(--ridge-near)' }} />
    <MarkBuilding mark={mark} x={w / 2} ground={() => ground} sunX={night ? null : -80} night={night} life={life(night)}
      motion={false} readout={false} />
  </svg>
}

export function Plate() {
  return <>{(['clearDay', 'night'] as const).map((theme) => (
    <section key={theme} style={themeVars(theme)}>
      <h2>{theme === 'night' ? 'Night (lights on)' : 'Day, sun in the west'} · 6x and 1x</h2>
      <div className="row">{set.map(([glyph, hPx, tall]) => (
        <div className="cell" key={glyph}>
          <Specimen glyph={glyph} hPx={hPx} tall={tall} night={theme === 'night'} zoom={6} />
          <Specimen glyph={glyph} hPx={hPx} tall={tall} night={theme === 'night'} zoom={1} />
          <span>{glyph}</span>
        </div>
      ))}</div>
    </section>
  ))}</>
}

createRoot(document.getElementById('root')!).render(<Plate />)
