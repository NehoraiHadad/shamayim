import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The determinism contract (docs/design/CANVAS-SCENE-PLAN.md §3; the anidoodle skill's
 * `references/determinism-and-contract.md`): the world, the model and the painters read no clock, no random, no DOM.
 * Randomness only from `seeded(hashId(…))`; time only as `world.at` and the loop's `phase`. A `Date` made from a given
 * instant (`new Date(ms)`, as the moved sun and moon paths do) is a value, not the clock: allowed. Painters may not use
 * `ctx.filter` (Safari has none and it is slow), nor create surfaces or images themselves (`env.canvas()` gives them).
 * Comments are left out of the scan.
 */
const root = path.resolve(__dirname, '..')
const DIRS = ['world', 'scene/model', 'scene/paint']

const BANNED: [RegExp, string][] = [
  [/\bMath\.random\b/, 'Math.random'],
  [/\bDate\.now\b/, 'Date.now'],
  [/\bnew\s+Date\s*\(\s*\)/, 'new Date() (the clock)'],
  [/\bperformance\s*\.\s*now\b/, 'performance.now'],
  [/\brequestAnimationFrame\b/, 'requestAnimationFrame'],
  [/\bdocument\b/, 'document'],
  [/\bwindow\b/, 'window'],
  [/\bnavigator\b/, 'navigator'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bfetch\s*\(/, 'fetch'],
]
const PAINT_BANNED: [RegExp, string][] = [
  [/\.\s*filter\s*=/, 'ctx.filter'],
  [/\bnew\s+(OffscreenCanvas|Image)\b/, 'a surface or image made by a painter'],
  [/\bcreateElement\b/, 'createElement'],
]

/** Source without comments (block and line), strings kept. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return files(full)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('purity of the world, the model and the painters', () => {
  it('strips comments but keeps code', () => {
    const out = stripComments('a // window\n/* Date.now() */ b')
    expect(out.replace(/\s+/g, ' ')).toBe('a b')
    expect(out.split('\n').length).toBe(2)
  })

  for (const dir of DIRS) {
    it(`${dir} reads no clock, no random and no DOM`, () => {
      const all = files(path.join(root, dir))
      expect(all.length).toBeGreaterThan(0)
      const hits = all.flatMap((file) => {
        const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n')
        const rules = dir === 'scene/paint' ? [...BANNED, ...PAINT_BANNED] : BANNED
        return lines.flatMap((line, i) => rules.filter(([re]) => re.test(line))
          .map(([, what]) => `${path.relative(root, file)}:${i + 1} ${what}`))
      })
      expect(hits).toEqual([])
    })
  }
})
