import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { breaches, factsOf, PAINT, resolve, type Sources, type Styles } from '../../test/architecture'
import { DEFAULT_STYLE, SCENE_STYLES, STYLES } from './styles'

const root = path.resolve(__dirname, '../../..')
const ACTUAL: Styles = { ids: SCENE_STYLES, default: DEFAULT_STYLE }

function sourcesUnder(dir: string): [string, string][] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry): [string, string][] => {
    const file = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourcesUnder(file)
    return /\.tsx?$/.test(entry.name) ? [[file, fs.readFileSync(path.join(root, file), 'utf8')]] : []
  })
}

describe('the styles\' boundaries', () => {
  it('hold in every source', () => {
    const sources = new Map(sourcesUnder('src'))
    expect(sources.size).toBeGreaterThan(500)
    expect(breaches(sources, ACTUAL)).toEqual([])
  }, 60_000)

  it('give each registered style a folder of its own, beside the shared one', () => {
    const folders = fs.readdirSync(path.join(root, PAINT), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    expect(folders.sort()).toEqual(['shared', ...SCENE_STYLES].sort())
    for (const id of SCENE_STYLES) expect(STYLES[id].id).toBe(id)
  })
})

/* The checker bites: a small tree that keeps the rules, then one breach at a time. */
const STYLE: Styles = { ids: ['oil', 'ink'], default: 'oil' }
const KEPT = {
  [`${PAINT}/styles.ts`]: "import { OIL } from './oil'\nimport { INK } from './ink'\nexport const STYLES = { oil: OIL, ink: INK }",
  [`${PAINT}/contract.ts`]: "import type { Hand } from './shared/hand'\nexport type Style = { id: string; hand: Hand }",
  [`${PAINT}/shared/hand.ts`]: "import type { Desc } from '../../model/types'\nexport type Hand = Desc",
  [`${PAINT}/oil/index.ts`]: "import type { Style } from '../contract'\nimport { brush } from './brush'\nexport const OIL = { id: 'oil', brush } as unknown as Style",
  [`${PAINT}/oil/brush.ts`]: 'export const brush = 1',
  [`${PAINT}/ink/index.ts`]: "import type { Style } from '../contract'\nexport const INK = { id: 'ink' } as unknown as Style",
  [`${PAINT}/ink/pen.ts`]: 'export const pen = 1',
  'src/scene/model/types.ts': 'export interface Desc { inks: number }',
  'src/scene/compose/paintWorker.ts': "import { STYLES } from '../paint/styles'\nimport type { Hand } from '../paint/shared/hand'\nexport default (id: string, hand: Hand) => [STYLES, id, hand]",
  'src/world/world.ts': "// the ink style paints it: import '../scene/paint/ink'\nexport const inked = 'inky'",
}
const treeWith = (extra: Record<string, string>): Sources => new Map(Object.entries({ ...KEPT, ...extra }))
const breachesOf = (extra: Record<string, string>) => breaches(treeWith(extra), STYLE)

describe('the checker', () => {
  it('passes a tree that keeps the rules', () => expect(breachesOf({})).toEqual([]))

  const OIL = `${PAINT}/oil/x.ts`
  it.each([
    ['static', "import { pen } from '../ink/pen'"],
    ['for its effects', "import '../ink/pen.ts'"],
    ['of a type', "import type { Pen } from '../ink/pen'"],
    ['by its folder', "import { INK } from '../ink'"],
    ['over lines', "import {\n  pen,\n} from '../ink/pen'"],
    ['dynamic', "export const pen = () => import('../ink/pen')"],
    ['dynamic, in a template', 'export const pen = () => import(`../ink/pen`)'],
    ['re-exported', "export { pen } from '../ink/pen'"],
    ['re-exported whole', "export * from '../ink/pen'"],
    ['as a type expression', "export type Pen = typeof import('../ink/pen').pen"],
    ['by URL', "export const pen = new URL('../ink/pen.ts', import.meta.url)"],
    ['from the root', "import { pen } from '/src/scene/paint/ink/pen'"],
  ])('finds a style\'s import from another: %s', (_, source) => {
    const found = breachesOf({ [OIL]: source })
    expect(found).toHaveLength(1)
    expect(found[0]).toContain(`${OIL} → ${PAINT}/ink/`)
    expect(breachesOf({ [`${PAINT}/ink/x.ts`]: source.replaceAll('ink', 'oil').replaceAll('/pen', '/brush') })).toHaveLength(1)
  })

  it.each([
    ['shared code taking from a style', `${PAINT}/shared/x.ts`, "import { pen } from '../ink/pen'"],
    ['shared code taking from the default style', `${PAINT}/shared/x.ts`, "import { brush } from '../oil/brush'"],
    ['shared code knowing the registry', `${PAINT}/shared/x.ts`, "import type { STYLES } from '../styles'"],
    ['the contract taking from a style', `${PAINT}/contract.ts`, "export type { pen } from './ink/pen'"],
    ['the model taking from a style', 'src/scene/model/x.ts', "import type { pen } from '../paint/ink/pen'"],
    ['the model knowing the registry', 'src/scene/model/x.ts', "import { STYLES } from '../paint/styles'"],
    ['the world taking from a style', 'src/world/x.ts', "export * from '../scene/paint/oil/brush'"],
    ['the compositor taking from a style', 'src/scene/compose/x.ts', "const pen = import('../paint/ink/pen')"],
    ['React taking from a style', 'src/scene/react/x.tsx', "import { INK } from '../paint/ink'\nexport const X = () => <b>{INK.id}</b>"],
    ['a test outside taking from a style', 'src/scene/compose/x.test.ts', "import { pen } from '../paint/ink/pen'"],
    ['a computed import', 'src/ui/x.ts', 'export const load = (id: string) => import(`../scene/paint/${id}/index.ts`)'],
    ['a style named', 'src/ui/x.ts', "export const ours = (id: string) => id === 'ink'"],
    ['a style named in a template', 'src/ui/x.ts', 'export const id = `ink`'],
    ['a style named in a type', 'src/ui/x.ts', "export type Id = 'ink' | null"],
    ['a style named in markup', 'src/ui/x.tsx', 'export const X = () => <Scene style="ink" />'],
    ['a style named by the registry\'s member', 'src/ui/x.ts', "import { STYLES } from '../scene/paint/styles'\nexport const ink = STYLES.ink"],
    ['a style named in another style', `${PAINT}/oil/x.ts`, "export const other = 'ink'"],
  ])('finds %s', (_, file, source) => {
    const found = breachesOf({ [file]: source })
    expect(found).toHaveLength(1)
    expect(found[0].startsWith(file)).toBe(true)
  })

  it('reaches painters only through the registry, the contract or shared code', () => {
    expect(breachesOf({ [`${PAINT}/loose.ts`]: 'export const loose = 1', 'src/scene/react/x.ts': "import { loose } from '../paint/loose'" })).toHaveLength(1)
  })

  it('lets the registry, a style\'s own folder and the default\'s name be', () => {
    expect(breachesOf({ [`${PAINT}/ink/x.ts`]: "import { pen } from './pen'\nexport const id = pen && 'ink'",
      'src/ui/x.ts': "export const first = 'oil'" })).toEqual([])
  })

  it('reads sources, not comments or text', () => {
    expect(factsOf('a.ts', "// import './b'\nexport const s = \"import './c'\"").imports).toEqual([])
    expect(resolve(treeWith({}), `${PAINT}/oil/index.ts`, '../ink')).toBe(`${PAINT}/ink/index.ts`)
    expect(resolve(treeWith({}), `${PAINT}/oil/index.ts`, 'react')).toBeNull()
  })
})
