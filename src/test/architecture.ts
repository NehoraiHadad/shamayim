import { factsOf, pathOf, resolve, type Facts, type Sources } from './sourceFacts'

/**
 * The boundaries of the scene's styles (`scene/paint/`): what each style owns, what both share, and who may know a style
 * by name. Works on sources in memory (path from the repository's root → text), so the rules themselves are tested.
 */
export interface Styles {
  ids: readonly string[]
  default: string
  /** The packages a source may import. */
  packages: readonly string[]
}

export const PAINT = 'src/scene/paint'
const PAINTERS = `${PAINT}/painters.ts`, STYLES = `${PAINT}/styles.ts`, CONTRACT = `${PAINT}/contract.ts`, SHARED = `${PAINT}/shared`
const WORKER = 'src/scene/compose/paintWorker.ts'
const under = (file: string, dir: string) => file.startsWith(`${dir}/`)
const isTest = (file: string) => /\.test\.tsx?$/.test(file)
const isRegistry = (file: string) => file === PAINTERS || file === STYLES

interface Edge { target: string; runtime: boolean }
interface Tree { facts: ReadonlyMap<string, Facts>; edges: ReadonlyMap<string, readonly Edge[]>; missing: string[] }

function treeOf(sources: Sources, { packages }: Styles): Tree {
  const facts = new Map<string, Facts>(), edges = new Map<string, Edge[]>(), missing: string[] = []
  for (const [file, source] of sources) {
    const own = factsOf(file, source), out: Edge[] = []
    for (const { specifier, runtime } of own.imports) {
      const target = resolve(sources, file, specifier, packages)
      if (target === 'missing') missing.push(`${file}: an import that leads nowhere known, "${specifier}"`)
      else if (target !== 'outside') out.push({ target, runtime })
    }
    facts.set(file, own)
    edges.set(file, out)
  }
  return { facts, edges, missing }
}

/**
 * The ways from `file` to what it may not reach, each by its shortest way. A source that keeps the same rule itself
 * (`stops`) answers for what lies beyond it.
 */
function waysTo(tree: Tree, file: string, forbidden: (target: string) => string | null, stops: (target: string) => boolean,
  follow: (edge: Edge) => boolean = () => true): string[] {
  const found: string[] = [], seen = new Set([file]), queue = [[file]]
  for (const way of queue) {
    for (const edge of tree.edges.get(way.at(-1)!) ?? []) {
      const { target } = edge
      if (seen.has(target) || !follow(edge)) continue
      seen.add(target)
      const why = forbidden(target), next = [...way, target]
      if (why) found.push(`${next.join(' → ')}: ${why}`)
      else if (!stops(target)) queue.push(next)
    }
  }
  return found
}

/** A path the source works out could lead into the painters, beyond the file's own folder of them. */
function couldReachPaint(file: string, home: string | null, start: string): boolean {
  const at = pathOf(file, start)?.replace(/^\.\/?$/, '') ?? start
  if (home && under(at, home)) return false
  return at.startsWith('..') || PAINT.startsWith(at) || under(at, PAINT)
}

/** Every breach of the boundaries, one line each. */
export function breaches(sources: Sources, styles: Styles): string[] {
  const tree = treeOf(sources, styles), found = [...tree.missing]
  const styleOf = (file: string) => styles.ids.find((id) => under(file, `${PAINT}/${id}`))
  /** What knows no style but its own, however far its imports lead (a test's may lead to the whole scene, so only its first ones count). */
  const guarded = (file: string) => Boolean(styleOf(file)) || under(file, SHARED) || file === CONTRACT
    || under(file, 'src/scene/model') || under(file, 'src/world')
  const home = (file: string) => (styleOf(file) ? `${PAINT}/${styleOf(file)}` : under(file, SHARED) ? SHARED : null)
  for (const [file, facts] of tree.facts) {
    const own = styleOf(file)
    if (guarded(file)) found.push(...waysTo(tree, file, (target) => forbiddenTo(file, own, target, styleOf(target)), isTest(file) ? () => true : guarded))
    for (const { target } of tree.edges.get(file)!) {
      if (styleOf(target) && !guarded(file) && !isRegistry(file)) found.push(`${file} → ${target}: only the registry takes from a style's folder`)
      else if (under(target, PAINT) && !under(file, PAINT) && !styleOf(target) && !isRegistry(target) && target !== CONTRACT && !under(target, SHARED)) {
        found.push(`${file} → ${target}: painters are reached through the registry, the contract or shared code`)
      }
    }
    for (const { how, start } of facts.open) {
      if (how === 'import' || couldReachPaint(file, home(file), start)) found.push(`${file}: a computed ${how}`)
    }
    for (const id of styles.ids) {
      if (id === styles.default || own === id || isRegistry(file)) continue
      if (facts.strings.has(id) || facts.members.has(id)) found.push(`${file}: names the style "${id}"`)
    }
  }
  const lights = (target: string) => (target === STYLES || styles.ids.some((id) => under(target, `${PAINT}/${id}/light`))
    ? 'the paint worker loads no style\'s light' : null)
  return [...found, ...waysTo(tree, WORKER, lights, () => false, ({ runtime }) => runtime)]
}

function forbiddenTo(file: string, own: string | undefined, target: string, theirs: string | undefined): string | null {
  if (theirs && own) return theirs === own ? null : 'a style takes nothing from another style'
  if (theirs) return 'only the registry takes from a style\'s folder'
  if (!isRegistry(target)) return null
  if (own) return 'a style does not know the registry'
  return under(file, SHARED) || file === CONTRACT ? 'shared code does not know the registry' : 'the model does not know the registry'
}
