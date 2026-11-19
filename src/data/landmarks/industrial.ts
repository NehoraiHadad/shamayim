import type { Landmark, MarkKind } from './types'

/**
 * When an industrial structure is a landmark (CANVAS-SCENE-PLAN.md C5 item 5): a general rule for every chimney, cooling
 * tower, silo, mast and wind turbine, from its own data only, never by a per-object fix.
 *
 * - **A name that is a name.** Not its operator, owner or brand (a plant called after the company that runs it), not a
 *   status or a construction note ("לבניה", "בבנייה", "under construction", "disused"…), not just its kind ("ארובה",
 *   "silo"). Such a word is still a name when the object's own article confirms it: its Wikipedia title (or Wikidata
 *   label) carries the same word, as a proper name would (a famous pair of cooling towers called by that word).
 * - **Then fame or size**: an article of its own (fame, `fame.ts`), or truly huge (≥ 200 m: seen from anywhere).
 *
 * The landmarks build applies it with the object's tags (`scripts/landmarks/build.ts`); the scene applies it to the
 * shipped rows, which keep the name and the fame only (fame 2, an article, stands for the confirmation there).
 */

export const INDUSTRIAL_KINDS: ReadonlySet<MarkKind> = new Set<MarkKind>(['chimney', 'cooling', 'silo', 'mast', 'turbine'])

/** Truly huge: a landmark from anywhere without a name (SKYLINE.md's far-mark rule). */
export const HUGE_M = 200

/** Status and construction notes, and the bare names of the kinds, in Hebrew and English. */
const NOT_A_NAME: readonly RegExp[] = [
  /^[לבשה]?בנ[י]{1,2}ה$/u, /^בבני/u, /^(?:בתכנון|מתוכנן|נטוש|הרוס|לא פעיל|בשימוש|זמני|חדש|ישן)$/u,
  /\b(?:under construction|construction|planned|proposed|disused|abandoned|demolished|temporary|unused)\b/iu,
  /^(?:ארוב(?:ה|ת)|ארובות|מגדל(?:י)? קירור|סילו|ממגור(?:ה|ות)|אנטנ(?:ה|ות)|תורן|טורבינ(?:ה|ות)|מגדל|chimney|cooling tower|silo|mast|antenna|tower|wind turbine|turbine)$/iu,
]

/** Letters only, no niqqud, punctuation or spacing. */
const bare = (text: string) => text.normalize('NFKD').replace(/[֑-ׇ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()

/** A Hebrew word's stem for matching a name to a title: the article's ה, a final ה / ות / ים / ית dropped. */
function stem(text: string) {
  let s = bare(text)
  if (s.length > 3 && s.startsWith('ה')) s = s.slice(1)
  for (const suffix of ['ות', 'ים', 'ית', 'ה']) if (s.length > 3 && s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break }
  return s
}

export interface NameEvidence {
  operator?: string
  owner?: string
  brand?: string
  /** Titles of the object's own article: its Wikipedia titles (without the language prefix), its Wikidata labels. */
  titles?: readonly string[]
  /** The shipped rows carry no titles: an article of its own (fame 2) stands for the confirmation. */
  article?: boolean
}

/** Whether a structure's name is a name (above). */
export function nameIsName(name: string | undefined, evidence: NameEvidence = {}): boolean {
  if (!name?.trim()) return false
  const b = bare(name)
  if (!b) return false
  if ([evidence.operator, evidence.owner, evidence.brand].some((other) => other && bare(other) === b)) return false
  if (!NOT_A_NAME.some((pattern) => pattern.test(name.trim()))) return true
  // A status-like word is a name only when the object's own article carries it.
  if (evidence.titles?.some((title) => stem(title).includes(stem(name)) || stem(name).includes(stem(title)))) return true
  return Boolean(evidence.article && !evidence.titles)
}

/** The evidence in an OSM object's tags. */
export function evidenceOf(tags: Record<string, string>): NameEvidence {
  const titles = Object.entries(tags).filter(([key]) => key === 'wikipedia' || key.startsWith('wikipedia:'))
    .map(([, value]) => value.replace(/^[a-z-]+:/, ''))
  return { operator: tags.operator, owner: tags.owner, brand: tags.brand, ...(titles.length ? { titles } : {}) }
}

/**
 * An industrial structure keeps its name only when the name is a name, and its fame only with that name (a famous
 * structure under a note is anonymous); any other kind is left as it is.
 */
export function industrialNamed<T extends Pick<Landmark, 'kind' | 'nameHe' | 'fame'>>(mark: T, evidence?: NameEvidence): T {
  if (!INDUSTRIAL_KINDS.has(mark.kind) || !mark.nameHe) return mark
  if (nameIsName(mark.nameHe, evidence ?? { article: mark.fame === 2 })) return mark
  const { nameHe: _name, fame: _fame, ...rest } = mark
  return rest as T
}

/**
 * Whether a mark beyond the place is a landmark there (SKYLINE.md, for every place): a name and fame, or truly huge. The
 * place's own houses and the hand-drawn icons always are.
 */
export const landmarkBeyond = (mark: Pick<Landmark, 'source' | 'fame' | 'nameHe' | 'heightM'>) =>
  mark.source === 'place' || mark.source === 'curated' || Boolean(mark.fame && mark.nameHe) || mark.heightM >= HUGE_M
