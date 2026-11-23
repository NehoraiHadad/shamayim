import path from 'node:path'
import { parseSync } from 'vite'

/** What a source takes from others and names, read from its syntax tree: comments and text cannot pass for code. */
export interface Facts {
  /** What it imports, re-exports or loads by URL; `runtime` where more than types come of it. */
  imports: { specifier: string; runtime: boolean }[]
  /** What it loads by a path it works out: how, and the start of the path, as far as the source says it. */
  open: { how: 'import' | 'URL' | 'glob'; start: string }[]
  strings: Set<string>
  /** The members it takes of the registries (`STYLES.…`, `PAINTERS.…`). */
  members: Set<string>
}

/** The files of a tree, by their path from the repository's root. */
export type Sources = ReadonlyMap<string, string>

interface Node { type: string; [key: string]: unknown }
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'
const nameOf = (value: unknown) => (isNode(value) && value.type === 'Identifier' ? value.name as string : null)
/** `import.meta.<name>`. */
const isMeta = (value: unknown, name: string) => isNode(value) && value.type === 'MemberExpression'
  && isNode(value.object) && value.object.type === 'MetaProperty' && nameOf(value.property) === name

function walk(value: unknown, visit: (node: Node) => void) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit))
  else if (isNode(value)) {
    visit(value)
    for (const child of Object.values(value)) walk(child, visit)
  }
}

const quasisOf = (node: Node) => (node.quasis as { value: { cooked: string } }[]).map(({ value }) => value.cooked)

/** A string the source says outright: a literal, a template with nothing computed in it, or such strings joined. */
function text(value: unknown): string | null {
  if (!isNode(value)) return null
  if (value.type === 'Literal' && typeof value.value === 'string') return value.value
  if (value.type === 'TemplateLiteral' && quasisOf(value).length === 1) return quasisOf(value)[0]
  if (value.type !== 'BinaryExpression' || value.operator !== '+') return null
  const left = text(value.left), right = text(value.right)
  return left !== null && right !== null ? left + right : null
}

/** The start of a string that is worked out, as far as the source says it. */
function startOf(value: unknown): string {
  const whole = text(value)
  if (whole !== null || !isNode(value)) return whole ?? ''
  if (value.type === 'TemplateLiteral') return quasisOf(value)[0]
  if (value.type !== 'BinaryExpression') return ''
  const left = text(value.left)
  return left === null ? startOf(value.left) : left + startOf(value.right)
}

/** A URL relative to the source (`import.meta.url`), or from the root: an import. Any other address is none. */
function addUrl(facts: Facts, [to, base]: unknown[]) {
  const specifier = text(to), start = specifier ?? startOf(to), here = isMeta(base, 'url')
  if (/^[a-z][a-z\d+.-]*:/i.test(start) || (!here && !start.startsWith('/src/'))) return
  const relative = /^[./]/.test(start) ? start : `./${start}`
  if (specifier === null) facts.open.push({ how: 'URL', start: start && relative })
  else facts.imports.push({ specifier: relative, runtime: true })
}

/** `import.meta.glob`: each pattern's start, up to its first wildcard. */
function addGlob(facts: Facts, [patterns, options]: unknown[]) {
  const list = isNode(patterns) && patterns.type === 'ArrayExpression' ? patterns.elements as unknown[] : [patterns]
  const based = isNode(options) && (options.type !== 'ObjectExpression'
    || (options.properties as Node[]).some((p) => p.type !== 'Property' || (nameOf(p.key) ?? text(p.key)) === 'base'))
  for (const pattern of list) {
    const said = text(pattern)
    if (!said?.startsWith('!')) facts.open.push({ how: 'glob', start: based || said === null ? '' : said.replace(/[*?{[(!].*$/s, '') })
  }
}

function addCall(facts: Facts, callee: unknown, args: unknown[]) {
  const name = nameOf(callee), specifier = text(args[0])
  if (isMeta(callee, 'glob')) addGlob(facts, args)
  else if ((name === 'require' || isMeta(callee, 'resolve')) && specifier !== null) facts.imports.push({ specifier, runtime: true })
}

function addNew(facts: Facts, callee: unknown, args: unknown[]) {
  const name = nameOf(callee)
  if (name === 'URL') addUrl(facts, args)
  else if (name === 'Worker' || name === 'SharedWorker') if (text(args[0]) !== null) addUrl(facts, args.slice(0, 1))
}

const FROM = /^(Import|ExportNamed|ExportAll)Declaration$|^ImportExpression$|^TSImportType$|^TSExternalModuleReference$/

export function factsOf(file: string, source: string): Facts {
  const { program, errors } = parseSync(file, source)
  if (errors.length) throw new Error(`${file}: ${errors[0].message}`)
  const facts: Facts = { imports: [], open: [], strings: new Set(), members: new Set() }
  walk(program, (node) => {
    const string = text(node)
    if (string !== null) facts.strings.add(string)
    if (node.type === 'MemberExpression' && !node.computed && ['STYLES', 'PAINTERS'].includes(nameOf(node.object)!)) {
      facts.members.add(nameOf(node.property)!)
    }
    if (node.type === 'CallExpression') addCall(facts, node.callee, node.arguments as unknown[])
    if (node.type === 'NewExpression') addNew(facts, node.callee, node.arguments as unknown[])
    const from = FROM.test(node.type) ? node.source ?? node.expression : null
    if (!from) return
    const specifier = text(from), typed = node.importKind === 'type' || node.exportKind === 'type' || node.type === 'TSImportType'
    if (specifier !== null) facts.imports.push({ specifier, runtime: !typed })
    else facts.open.push({ how: 'import', start: startOf(from) })
  })
  return facts
}

const CODE = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
const ASSET = /\.(css|json|svg|png|jpe?g|webp|woff2?|html|geojson(seq)?|txt|wasm)$/
export const isCode = (file: string) => CODE.some((end) => file.endsWith(end))

/** The path a specifier says from `file`, from the root; null where it is a package's or an address. */
export function pathOf(file: string, specifier: string): string | null {
  const bare = specifier.replace(/[?#].*$/, '')
  if (bare.startsWith('.')) return path.posix.join(path.posix.dirname(file), bare)
  return bare.startsWith('/') ? bare.slice(1) : null
}

/** The source a specifier names from `file`; `outside` for a package or an asset, `missing` for what should be a source and is not. */
export function resolve(sources: Sources, file: string, specifier: string, packages: readonly string[]): string | 'outside' | 'missing' {
  const at = pathOf(file, specifier)
  if (at === null) {
    const known = /^(node|virtual):/.test(specifier) || packages.some((name) => specifier === name || specifier.startsWith(`${name}/`))
    return known ? 'outside' : 'missing'
  }
  const stem = at.replace(/\.([cm]?)js(x?)$/, '.$1ts$2')
  const found = [at, stem, `${stem}x`, ...CODE.map((end) => at + end), ...CODE.map((end) => path.posix.join(at, `index${end}`))]
    .find((candidate) => sources.has(candidate))
  return found ?? (ASSET.test(at) || at.startsWith('node_modules/') ? 'outside' : 'missing')
}
