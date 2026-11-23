import { describe, expect, it } from 'vitest'
import { breaches, PAINT, type Styles } from './architecture'
import { factsOf, resolve, type Sources } from './sourceFacts'

/* The checker bites: a small tree that keeps the rules, then one breach at a time. */
const STYLE: Styles = { ids: ['oil', 'ink'], default: 'oil', packages: ['react'] }
const KEPT = {
  [`${PAINT}/painters.ts`]: "import { OIL_PAINTERS } from './oil/painters'\nimport { INK_PAINTERS } from './ink/painters'\nexport const PAINTERS = { oil: OIL_PAINTERS, ink: INK_PAINTERS }",
  [`${PAINT}/styles.ts`]: "import { OIL } from './oil'\nimport { INK } from './ink'\nexport const STYLES = { oil: OIL, ink: INK }",
  [`${PAINT}/contract.ts`]: "import type { Hand } from './shared/hand'\nexport type Style = { id: string; hand: Hand }",
  [`${PAINT}/shared/hand.ts`]: "import type { Desc } from '../../model/types'\nexport type Hand = Desc",
  [`${PAINT}/oil/index.ts`]: "import type { Style } from '../contract'\nimport { OIL_PAINTERS } from './painters'\nexport const OIL = { id: 'oil', OIL_PAINTERS } as unknown as Style",
  [`${PAINT}/oil/painters.ts`]: "import { brush } from './brush'\nexport const OIL_PAINTERS = { brush }",
  [`${PAINT}/oil/brush.ts`]: 'export const brush = 1',
  [`${PAINT}/ink/index.ts`]: "import type { Style } from '../contract'\nimport { WASH } from './light'\nexport const INK = { id: 'ink', WASH } as unknown as Style",
  [`${PAINT}/ink/painters.ts`]: "import type { Wash } from './light'\nimport { pen } from './pen'\nexport const INK_PAINTERS = { pen: pen as Wash }",
  [`${PAINT}/ink/pen.ts`]: 'export const pen = 1',
  [`${PAINT}/ink/light/index.ts`]: 'export const WASH = 1\nexport type Wash = number',
  'src/scene/model/types.ts': 'export interface Desc { inks: number }',
  'src/scene/compose/paintWorker.ts': "import { PAINTERS } from '../paint/painters'\nimport type { Hand } from '../paint/shared/hand'\nexport default (id: string, hand: Hand) => [PAINTERS, id, hand]",
  'src/scene/compose/barrel.ts': "export { STYLES } from '../paint/styles'",
  'src/scene/react/Scene.tsx': "import { useState } from 'react'\nimport './Scene.css'\nimport { STYLES } from '../compose/barrel.js'\nexport default () => [useState, STYLES]",
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
    ['as JavaScript', "import { pen } from '../ink/pen.js'"],
    ['of a type', "import type { Pen } from '../ink/pen'"],
    ['by its folder', "import { INK } from '../ink'"],
    ['over lines', "import {\n  pen,\n} from '../ink/pen'"],
    ['dynamic', "export const pen = () => import('../ink/pen')"],
    ['dynamic, in a template', 'export const pen = () => import(`../ink/pen`)'],
    ['re-exported', "export { pen } from '../ink/pen'"],
    ['re-exported whole', "export * from '../ink/pen'"],
    ['as a type expression', "export type Pen = typeof import('../ink/pen').pen"],
    ['required', "export const { pen } = require('../ink/pen')"],
    ['by URL', "export const pen = new URL('../ink/pen.ts', import.meta.url)"],
    ['by a URL joined', "export const pen = new URL('../ink/' + 'pen.ts', import.meta.url)"],
    ['by a worker', "export const pen = new Worker('/src/scene/paint/ink/pen.ts')"],
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
    ['shared code knowing the painters\' registry', `${PAINT}/shared/x.ts`, "import type { PAINTERS } from '../painters'"],
    ['the contract taking from a style', `${PAINT}/contract.ts`, "export type { pen } from './ink/pen'"],
    ['the contract knowing the registry', `${PAINT}/contract.ts`, "export type { STYLES } from './styles'"],
    ['a style knowing the registry', `${PAINT}/ink/x.ts`, "import { PAINTERS } from '../painters'"],
    ['the model taking from a style', 'src/scene/model/x.ts', "import type { pen } from '../paint/ink/pen'"],
    ['the model knowing the registry', 'src/scene/model/x.ts', "import { STYLES } from '../paint/styles'"],
    ['the model\'s test knowing the registry', 'src/scene/model/x.test.ts', "import { STYLES } from '../paint/styles'"],
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
    ['a style named by the painters\' member', 'src/ui/x.ts', "import { PAINTERS } from '../scene/paint/painters'\nexport const ink = PAINTERS.ink"],
    ['a style named in another style', `${PAINT}/oil/x.ts`, "export const other = 'ink'"],
  ])('finds %s', (_, file, source) => {
    const found = breachesOf({ [file]: source })
    expect(found).toHaveLength(1)
    expect(found[0].startsWith(file)).toBe(true)
  })

  it.each([
    ['a style, through the compositor', { [OIL]: "import { STYLES } from '../../compose/barrel'" }, `${OIL} → src/scene/compose/barrel.ts → ${PAINT}/styles.ts`],
    ['a style, through a script', { [OIL]: "import { pen } from '../../../../scripts/y'", 'scripts/y.mjs': "export * from './z.js'", 'scripts/z.js': "export { STYLES } from '../src/scene/compose/barrel'" },
      `${OIL} → scripts/y.mjs → scripts/z.js → src/scene/compose/barrel.ts → ${PAINT}/styles.ts`],
    ['shared code, through the app', { [`${PAINT}/shared/x.ts`]: "import type { x } from '../../../ui/x'", 'src/ui/x.ts': "export { STYLES as x } from '../scene/compose/barrel'" },
      `${PAINT}/shared/x.ts → src/ui/x.ts → src/scene/compose/barrel.ts → ${PAINT}/styles.ts`],
    ['shared code, through the contract', { [`${PAINT}/shared/x.ts`]: "import type { STYLES } from '../contract'", [`${PAINT}/contract.ts`]: "export { STYLES } from './styles'" },
      `${PAINT}/contract.ts → ${PAINT}/styles.ts`],
    ['the model, through the app', { 'src/scene/model/x.ts': "import { x } from '../../ui/x'", 'src/ui/x.ts': "export { STYLES as x } from '../scene/paint/styles'" },
      `src/scene/model/x.ts → src/ui/x.ts → ${PAINT}/styles.ts`],
    ['the paint worker to a style\'s light', { [`${PAINT}/ink/pen.ts`]: "import { WASH } from './light'\nexport const pen = WASH" },
      `src/scene/compose/paintWorker.ts → ${PAINT}/painters.ts → ${PAINT}/ink/painters.ts → ${PAINT}/ink/pen.ts → ${PAINT}/ink/light/index.ts`],
    ['the paint worker to the whole registry', { 'src/scene/compose/paintWorker.ts': "import { STYLES } from './barrel'\nexport default STYLES" },
      `src/scene/compose/paintWorker.ts → src/scene/compose/barrel.ts → ${PAINT}/styles.ts`],
  ] as [string, Record<string, string>, string][])('follows the way of %s, and says it once', (_, extra, way) => {
    const found = breachesOf(extra)
    expect(found).toHaveLength(1)
    expect(found[0].startsWith(`${way}: `)).toBe(true)
  })

  it.each([
    ['an alias', "import { pen } from '@/scene/paint/ink/pen'"],
    ['an alias from the source folder', "import { pen } from 'src/scene/paint/ink/pen'"],
    ['a path with nothing there', "import { pen } from './nowhere'"],
    ['a folder\'s URL', "export const all = new URL('../scene/', import.meta.url)"],
    ['a URL worked out', 'export const at = (id: string) => new URL(`../scene/paint/${id}/pen.ts`, import.meta.url)'],
    ['a URL joined of parts', "export const at = (id: string) => new URL('../scene/' + id, import.meta.url)"],
    ['a URL not known at all', 'export const at = (to: string) => new URL(to, import.meta.url)'],
    ['a URL worked out from the root', "export const at = (id: string) => new URL('/src/scene/paint/' + id, location.origin)"],
    ['a glob of the painters', "export const all = import.meta.glob('../scene/paint/*/index.ts')"],
    ['a glob over them', "export const all = import.meta.glob(['./*.css', '../**/*.ts'])"],
    ['a glob from the root', "export const all = import.meta.glob('/src/scene/{paint,model}/*.ts')"],
    ['a glob from another base', "export const all = import.meta.glob('./*.ts', { base: '../scene/paint/ink' })"],
    ['a glob worked out', 'export const all = (at: string) => import.meta.glob(at)'],
  ])('refuses what it cannot follow: %s', (_, source) => expect(breachesOf({ 'src/ui/x.ts': source })).toHaveLength(1))

  it('lets be what leads elsewhere', () => {
    const elsewhere = ["import { x } from 'react/jsx-runtime'", "import fs from 'node:fs'", "import json from '../data/x.json'",
      "import sheet from './x.css?inline'", 'export const a = (u: string) => new URL(u)', "export const b = new URL('https://ink.example/pen.ts')",
      'export const c = (id: string) => new URL(`./icons/${id}.svg`, import.meta.url)', "export const d = import.meta.glob('../test/fixtures/*.json')",
      'export const e = (id: string) => new URL(`${import.meta.env.BASE_URL}x.js`, location.href + id)',
      'export const f = new URL(import.meta.url)'].join('\n')
    expect(breachesOf({ 'src/ui/x.ts': elsewhere, [`${PAINT}/ink/x.ts`]: "export const own = import.meta.glob('./pens/*.ts')" })).toEqual([])
  })

  it('reaches painters only through the registry, the contract or shared code', () => {
    expect(breachesOf({ [`${PAINT}/loose.ts`]: 'export const loose = 1', 'src/scene/react/x.ts': "import { loose } from '../paint/loose'" })).toHaveLength(1)
  })

  it('lets the registry, a style\'s own folder, the default\'s name and a test of the whole scene be', () => {
    expect(breachesOf({ [`${PAINT}/ink/x.ts`]: "import { pen } from './pen'\nexport const id = pen && 'ink'",
      'src/ui/x.ts': "export const first = 'oil'", 'src/scene/model/x.test.ts': "import { STYLES } from '../compose/barrel'" })).toEqual([])
  })

  it('reads sources, not comments or text', () => {
    expect(factsOf('a.ts', "// import './b'\nexport const s = \"import './c'\"").imports).toEqual([])
    expect(resolve(treeWith({}), `${PAINT}/oil/index.ts`, '../ink', [])).toBe(`${PAINT}/ink/index.ts`)
    expect(resolve(treeWith({}), `${PAINT}/oil/index.ts`, 'react', ['react'])).toBe('outside')
  })
})
