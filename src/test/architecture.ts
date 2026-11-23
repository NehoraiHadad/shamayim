import path from 'node:path'
import { parseSync } from 'vite'

/**
 * The boundaries of the scene's styles (`scene/paint/`): what each style owns, what both share, and who may know a style
 * by name. Works on sources in memory (path from the repository's root → text), so the rules themselves are tested.
 */
export type Sources = ReadonlyMap<string, string>
export interface Styles { ids: readonly string[]; default: string }

export const PAINT = 'src/scene/paint'
const REGISTRY = `${PAINT}/styles.ts`, CONTRACT = `${PAINT}/contract.ts`, SHARED = `${PAINT}/shared`
const under = (file: string, dir: string) => file.startsWith(`${dir}/`)
const anyUnder = (file: string, dirs: readonly string[]) => dirs.some((dir) => under(file, dir))

interface Node { type: string; [key: string]: unknown }
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'

function walk(value: unknown, visit: (node: Node) => void) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit))
  else if (isNode(value)) {
    visit(value)
    for (const child of Object.values(value)) walk(child, visit)
  }
}

/** A string in the source: a literal, or a template with nothing computed in it. */
function text(value: unknown): string | null {
  if (!isNode(value)) return null
  if (value.type === 'Literal' && typeof value.value === 'string') return value.value
  const quasis = value.quasis as { value: { cooked: string } }[] | undefined
  return value.type === 'TemplateLiteral' && quasis?.length === 1 ? quasis[0].value.cooked : null
}

interface Facts { imports: string[]; computed: number; strings: Set<string>; members: Set<string> }

/** What a source imports (static, dynamic, re-exported, as a type, by URL), and the strings and `STYLES.…` members it names. */
export function factsOf(file: string, source: string): Facts {
  const { program, errors } = parseSync(file, source)
  if (errors.length) throw new Error(`${file}: ${errors[0].message}`)
  const facts: Facts = { imports: [], computed: 0, strings: new Set(), members: new Set() }
  const name = (value: unknown) => (isNode(value) && value.type === 'Identifier' ? value.name as string : null)
  walk(program, (node) => {
    const string = text(node)
    if (string !== null) facts.strings.add(string)
    if (node.type === 'MemberExpression' && name(node.object) === 'STYLES' && !node.computed) facts.members.add(name(node.property)!)
    const byUrl = node.type === 'NewExpression' && name(node.callee) === 'URL'
    const from = byUrl ? (node.arguments as unknown[])[0]
      : /^(Import|ExportNamed|ExportAll)Declaration$|^ImportExpression$|^TSImportType$/.test(node.type) ? node.source : null
    if (!from) return
    const specifier = text(from)
    if (specifier !== null) facts.imports.push(specifier)
    else if (node.type === 'ImportExpression') facts.computed++
  })
  return facts
}

/** The source a specifier names from `file`; null for a package, an asset or an address. */
export function resolve(sources: Sources, file: string, specifier: string): string | null {
  const bare = specifier.replace(/[?#].*$/, '')
  const at = bare.startsWith('.') ? path.posix.join(path.posix.dirname(file), bare) : bare.startsWith('/src/') ? bare.slice(1) : null
  if (at === null) return null
  return ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((end) => at + end).find((candidate) => sources.has(candidate)) ?? null
}

/** Every breach of the boundaries, one line each. */
export function breaches(sources: Sources, styles: Styles): string[] {
  const styleOf = (file: string) => styles.ids.find((id) => under(file, `${PAINT}/${id}`))
  const found: string[] = []
  for (const [file, source] of sources) {
    const facts = factsOf(file, source), own = styleOf(file)
    if (facts.computed) found.push(`${file}: a computed import`)
    for (const specifier of facts.imports) {
      const target = resolve(sources, file, specifier)
      if (!target) continue
      const why = breach(file, own, target, styleOf(target))
      if (why) found.push(`${file} → ${target}: ${why}`)
    }
    for (const id of styles.ids) {
      if (id === styles.default || own === id || file === REGISTRY) continue
      if (facts.strings.has(id) || facts.members.has(id)) found.push(`${file}: names the style "${id}"`)
    }
  }
  return found
}

function breach(file: string, own: string | undefined, target: string, theirs: string | undefined): string | null {
  if (theirs && own && theirs !== own) return 'a style takes nothing from another style'
  if (theirs && !own && file !== REGISTRY) return 'only the registry takes from a style\'s folder'
  if (target === REGISTRY && under(file, SHARED)) return 'shared code does not know the registry'
  if (target === REGISTRY && anyUnder(file, ['src/scene/model', 'src/world'])) return 'the model does not know the registry'
  const door = target === REGISTRY || target === CONTRACT || under(target, SHARED)
  if (under(target, PAINT) && !under(file, PAINT) && !door) return 'painters are reached through the registry, the contract or shared code'
  return null
}
