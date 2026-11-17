// Dev-only: every garment on the line, light and dark paper, at 2x. /docs/design/qa/wear-specimen.html
import { createRoot } from 'react-dom/client'
import '../../../src/ui/tokens.css'
import { themeVars } from '../../../src/theme/skyThemes'
import type { Garment } from '../../../src/text/wear'
import { WearLine } from '../../../src/ui/wear/WearLine'

const SETS: [Garment[], number][] = [
  [['tee', 'sunHat', 'water'], 5],
  [['longSleeve', 'sweater'], 18],
  [['jacket', 'coat', 'umbrella'], 40],
  [['sweater', 'rainJacket'], 28],
]

// oxlint-disable-next-line react/only-export-components -- dev-only specimen page
function Paper({ theme }: { theme: 'clearDay' | 'night' }) {
  return (
    <div className={`zoom ${theme === 'night' ? 'dark-sheet' : ''}`} style={themeVars(theme)}>
      {SETS.map(([g, speed]) => (
        <div key={g.join()} className="sheet"><WearLine garments={g} wind={{ speed, drift: 1 }} /></div>
      ))}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<div style={{ display: 'flex', alignItems: 'flex-start' }}><Paper theme="clearDay" /><Paper theme="night" /></div>)
