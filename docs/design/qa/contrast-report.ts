// UI polish B contrast report. Run: node --experimental-strip-types docs/design/qa/contrast-report.ts
// Text colours come from src/ui/tokens.css and src/theme/skyThemes.ts; sky positions (CSS px from the page top, at
// 375 px wide) were measured on the polish-b stills: scene caption centre ≈ 362 px and lowest hourly temperature
// ≈ 310 px with a one-line sentence; each extra sentence line adds 32 px.
import { readFileSync } from 'node:fs'
import { cssTokens, mix, ratio } from '../../../src/theme/contrast.ts'
import { DARK_SHEET, SKY_THEMES, type ThemeId } from '../../../src/theme/skyThemes.ts'

const css = readFileSync(new URL('../../../src/ui/tokens.css', import.meta.url), 'utf8')
const light = cssTokens(css, ':root')
const dark = { ...light, ...cssTokens(css, '.dark-sheet') }
const fmt = (n: number) => n.toFixed(2).padStart(5)

/** Sky colour at y for a gradient mid→horizon between `from` and `to` px (top→mid ignored: text sits below it). */
function skyAt(id: ThemeId, y: number, from: number, to: number) {
  const t = SKY_THEMES[id]
  return mix(t.mid, t.horizon, Math.min(1, Math.max(0, (y - from) / (to - from))))
}

const before = { 'svh@667': [333.5, 440.2], 'svh@812': [406, 535.9] } as const
const after = [27 * 16, 33 * 16] as const
const spots = { 'caption 1-line': 362, 'caption 3-line': 426, 'temps 3-line': 374 }

console.log('Sky text (ink) on the gradient at the caption / hourly temps; before = svh stops, after = rem stops')
for (const id of Object.keys(SKY_THEMES) as ThemeId[]) {
  const ink = SKY_THEMES[id].ink
  const cells = Object.entries(spots).map(([name, y]) => {
    const b = Object.entries(before).map(([vh, [f, t]]) => `${vh} ${fmt(ratio(ink, skyAt(id, y, f, t)))}`).join(' ')
    return `${name}: ${b} → after ${fmt(ratio(ink, skyAt(id, y, ...after)))}`
  })
  console.log(`${id.padEnd(8)} ${cells.join(' | ')}`)
}

console.log('\nToken text colours (≥ 4.5 needed)')
for (const [id, t] of Object.entries(SKY_THEMES) as [ThemeId, (typeof SKY_THEMES)[ThemeId]][]) {
  const sheet = DARK_SHEET.has(id) ? dark : light
  const oldRain = DARK_SHEET.has(id) ? '#7FD3EE' : '#1F7A9C'
  const oldSun = DARK_SHEET.has(id) ? '#F2C46B' : '#C98A1E'
  console.log(`${id.padEnd(8)} sky rain %: #A8E6F8 ${fmt(ratio('#A8E6F8', t.mid))} → ${light['--sky-rain']} ${fmt(ratio(light['--sky-rain'], t.mid))}`
    + ` | sheet rain %: ${oldRain} ${fmt(ratio(oldRain, t.sheet))} → ${sheet['--sheet-rain']} ${fmt(ratio(sheet['--sheet-rain'], t.sheet))}`
    + ` | sun times: ${oldSun} ${fmt(ratio(oldSun, t.sheet))} → ${sheet['--sheet-sun']} ${fmt(ratio(sheet['--sheet-sun'], t.sheet))}`
    + ` | date (muted): ${fmt(ratio(t.sheetMuted, t.sheet))}`)
}
