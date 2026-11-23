import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { breaches, PAINT } from '../../test/architecture'
import { isCode } from '../../test/sourceFacts'
import { DEFAULT_STYLE, SCENE_STYLES } from './painters'
import { STYLES } from './styles'

const root = path.resolve(__dirname, '../../..')
const { dependencies, devDependencies } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

function sourcesUnder(dir: string): [string, string][] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry): [string, string][] => {
    const file = `${dir}/${entry.name}`
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourcesUnder(file)
    return isCode(file) ? [[file, fs.readFileSync(path.join(root, file), 'utf8')]] : []
  })
}

describe('the styles\' boundaries', () => {
  it('hold in every source', () => {
    const sources = new Map(['src', 'scripts', 'worker'].flatMap(sourcesUnder))
    expect(sources.size).toBeGreaterThan(500)
    const packages = Object.keys({ ...dependencies, ...devDependencies })
    expect(breaches(sources, { ids: SCENE_STYLES, default: DEFAULT_STYLE, packages })).toEqual([])
  }, 60_000)

  it('give each registered style a folder of its own, beside the shared one', () => {
    const folders = fs.readdirSync(path.join(root, PAINT), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    expect(folders.sort()).toEqual(['shared', ...SCENE_STYLES].sort())
    for (const id of SCENE_STYLES) expect(STYLES[id].id).toBe(id)
  })
})
