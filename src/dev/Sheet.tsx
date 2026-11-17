import { groundFn } from '../data/landmarks/seat'
import { composeSettlement, type SettlementStyle } from '../data/landmarks/settlement'
import type { PlacedMark } from '../data/landmarks/types'
import { themeVars, type ThemeId } from '../theme/skyThemes'
import { BUILDINGS } from '../ui/scene/marks/generic/buildingSpecs'
import { HillMarks } from '../ui/scene/marks/HillMarks'
import styles from '../ui/scene/marks/marks.module.css'

/**
 * Dev-only specimen sheet (anidoodle "specimen plate"): every hill glyph alone at 6x, then in a scene strip at 1x and
 * 3x, on day, overcast and night skies. Open /specimen.html on the dev server; never part of the build.
 */
const THEMES: ThemeId[] = ['clearDay', 'cloudy', 'night']
const KINDS = Object.keys(BUILDINGS)
const STYLES: SettlementStyle[] = ['tile', 'flat-hill', 'flat-desert', 'blocks']
const W = 375
const points: [number, number][] = Array.from({ length: 41 }, (_, i) => {
  const x = i * W / 40
  return [x, 70 - 38 * Math.exp(-(((x - 187) / 70) ** 2)) + 6 * Math.sin(x / 23)]
})
const ground = groundFn(points, W)
const ridge = `M0 128L${points.map(([x, y]) => `${x} ${y}`).join('L')}L${W} 128z`
const mark = (kind: string, x: number, dy = 0): PlacedMark => ({
  id: `${kind}-${x}`, kind: kind as PlacedMark['kind'], glyph: kind, layer: 'near', xPct: x / W * 100,
  baseY: ground(x), hPx: 20, lights: 0, tall: false, dy,
})
const marks = [mark('minaret', 70), mark('synagogue', 115), mark('waterTower', 255, .6), mark('church', 290, -.5),
  mark('castle', 330), mark('orchard', 30), mark('vineyard', 220), mark('solar', 350)]

function Plate({ kind, night }: { kind: string; night: boolean }) {
  const spec = BUILDINGS[kind]!
  const h = spec.h(20)
  return <figure style={{ margin: 8, color: '#ccc', font: '12px sans-serif' }}>
    <svg className={`${styles.px} ${night ? styles.night : ''}`} style={{ position: 'static', width: (spec.w + 8) * 6, height: (h + 6) * 6 }}
      viewBox={`${-spec.w / 2 - 4} ${-h - 3} ${spec.w + 8} ${h + 6}`}>
      <rect className={styles.solid} x={-spec.w} y={0} width={spec.w * 2} height={3} />
      <spec.Draw h={h} night={night} />
    </svg>
    <figcaption>{kind}</figcaption>
  </figure>
}

function Strip({ theme, scale, style }: { theme: ThemeId; scale: number; style: SettlementStyle }) {
  const night = theme === 'night'
  const settlement = composeSettlement({ style, size: 'medium', centerX: 187, centerY: ground(187), width: W, ground,
    litShare: night ? .4 : 0, seed: 7 })
  return <div style={{ position: 'relative', width: W * scale, height: 128 * scale, margin: 8,
    background: 'linear-gradient(var(--sky-top), var(--sky-horizon))' }}>
    <svg viewBox={`0 0 ${W} 128`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <path d={ridge} fill="var(--ridge-near)" />
      <circle cx={187} cy={ground(187)} r={4.5} fill="var(--ridge-near)" opacity={.7} /><circle cx={187} cy={ground(187)} r={2.5} fill="var(--accent)" />
    </svg>
    <HillMarks marks={marks} settlement={settlement} width={W} ground={ground} sunX={theme === 'clearDay' ? 60 : null} night={night}
      readout={false} life={{ litShare: night ? .4 : 0, aviation: night, leanDeg: 0, sway: null, turbinePeriodS: null,
        hideFar: false, farBleach: 1 }} />
  </div>
}

export function Sheet() {
  return <div style={{ padding: 8 }}>
    {THEMES.map((theme) => <section key={theme} style={{ ...themeVars(theme), marginBottom: 24 } as React.CSSProperties}>
      <h2 style={{ color: '#eee', font: '16px sans-serif' }}>{theme}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--sky-horizon)' }}>
        {KINDS.map((kind) => <Plate key={kind} kind={kind} night={theme === 'night'} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {STYLES.map((style) => <Strip key={style} theme={theme} scale={1} style={style} />)}
      </div>
      <Strip theme={theme} scale={3} style="tile" />
      <Strip theme={theme} scale={3} style="blocks" />
    </section>)}
  </div>
}
