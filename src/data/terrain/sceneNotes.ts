import { SEA_LABEL_SIDE } from '../../domain/camera'
import type { WaterSpan } from '../water/waterInView'
import type { SceneTerrain } from './terrain'

/**
 * The quiet notes written on the land: "פני הים" over the sea-level datum (a place below sea level), and the name of
 * each large water body in view ("ים", "כנרת", "ים המלח") over its water. Boxes in px at the scene's real `width`, so
 * the marks and labels can keep clear of them.
 */
export interface SceneNote {
  text: string
  kind: 'datum' | 'water'
  /** Left edge and top (px), and the box's size (px). */
  left: number
  top: number
  width: number
  height: number
}

export interface NoteBox { left: number; right: number; top: number; bottom: number }

/** The text's width (px) at the notes' small type: ~6.3 px a letter ("פני הים", 7 letters with the space, is 44). */
const textWidth = (text: string) => Math.round(text.length * 6.3)
const HEIGHT = 12
/** A body's name is written only over a stretch at least this wide (px at 375). */
const MIN_LABEL_SPAN = 24
/** Clear of the sheet's edges (px). */
const EDGE = 6

/** The datum's note stands over the open side of the Rift (east), as it always has. */
function datumNote(seaY: number, width: number): SceneNote {
  const w = textWidth('פני הים')
  const left = SEA_LABEL_SIDE === 'right' ? width * .73 - w : width * .27
  return { text: 'פני הים', kind: 'datum', left, top: seaY - 14, width: w, height: HEIGHT }
}

/** The sheet covers the scene from y 114 (`VISIBLE_BOTTOM`); a note's foot stays this far above the scene's top. */
const FLOOR = 112
/** Water at least this deep on screen (px) takes its name on itself, just under its far edge; thinner water above it. */
const INSIDE_DEPTH = 16

const overlaps = (a: SceneNote, b: SceneNote) => a.left < b.left + b.width && b.left < a.left + a.width
  && a.top < b.top + b.height && b.top < a.top + a.height

/**
 * Each named body's widest stretch in view gets its name, centred on it: on the water just under its far shore where
 * the water shows deep enough, else just over its far edge. A name that would cover another note (the datum's) tries
 * the other of the two heights, then slides along its water (clear of the datum's dashed line if it can); with no free
 * spot above the sheet it goes unnamed.
 */
export function waterNotes(water: readonly WaterSpan[], width: number, taken: readonly SceneNote[] = [],
  datumLine: DatumLine | null = null): SceneNote[] {
  const scale = width / 375
  const widest = new Map<string, WaterSpan>()
  for (const span of water) {
    if (!span.name || span.to - span.from < MIN_LABEL_SPAN) continue
    const known = widest.get(span.name)
    if (!known || span.to - span.from > known.to - known.from) widest.set(span.name, span)
  }
  const notes: SceneNote[] = []
  for (const span of widest.values()) {
    const w = textWidth(span.name!)
    const at = (x: number) => span.edges.reduce((best, e) => Math.abs(e.x - x) < Math.abs(best.x - x) ? e : best)
    const note = (x: number, inside: boolean): SceneNote => {
      const edge = at(x)
      const left = Math.max(EDGE, Math.min(width - EDGE - w, x * scale - w / 2))
      return { text: span.name!, kind: 'water', left, top: inside ? edge.farY + 3 : edge.farY - 14, width: w, height: HEIGHT }
    }
    // The datum's dashed line too, where a spot clear of it can be had.
    const line = datumLine ? [{ text: '', kind: 'datum' as const, left: datumLine.x1 * scale, top: datumLine.y - 2,
      width: (datumLine.x2 - datumLine.x1) * scale, height: 4 }] : []
    const free = (candidate: SceneNote, avoid: readonly SceneNote[]) => candidate.top + candidate.height <= FLOOR
      && [...taken, ...notes, ...avoid].every((other) => !overlaps(candidate, other))
    const mid = (span.from + span.to) / 2
    const deep = (x: number) => at(x).nearY - at(x).farY >= INSIDE_DEPTH
    const slide = (w / scale) * 0.75
    const tries = [mid, mid - slide, mid + slide, mid - 2 * slide, mid + 2 * slide]
      .filter((x) => x - w / scale / 2 >= span.from - 2 && x + w / scale / 2 <= span.to + 2)
    // Nowhere free above the sheet: the water goes unnamed rather than half hidden.
    const candidates = tries.flatMap((x) => [note(x, deep(x)), note(x, !deep(x))])
    const chosen = candidates.find((c) => free(c, line)) ?? candidates.find((c) => free(c, []))
    if (chosen) notes.push(chosen)
  }
  return notes
}

/** The datum's dashed line: its ends (px at 375) and its height. */
export interface DatumLine { x1: number; x2: number; y: number }

/**
 * All the notes on the scene: the datum's when `datum` (the place is below sea level; `line`, its dashed line, if
 * known), and the water's names.
 */
export function sceneNotes(terrain: Pick<SceneTerrain, 'seaY' | 'water'>, datum: boolean, width: number,
  line?: Omit<DatumLine, 'y'>): SceneNote[] {
  const datumNotes = datum ? [datumNote(terrain.seaY, width)] : []
  return [...datumNotes, ...waterNotes(terrain.water ?? [], width, datumNotes,
    datum && line ? { ...line, y: terrain.seaY } : null)]
}

/** The notes' boxes, as things to keep clear of (the text's own line: top to 2 px over its foot). */
export const noteBoxes = (notes: readonly SceneNote[]): NoteBox[] => notes.map((note) => ({
  left: note.left, right: note.left + note.width, top: note.top, bottom: note.top + note.height,
}))
