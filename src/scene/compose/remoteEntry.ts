import type { LayerDesc, LayerOf } from '../model/types'
import type { DeviceRect, PaintResult } from './paintJob'

export interface Request {
  /** Advances when the layer's requested paint keys change, including on a scrub back. */
  generation: number
  formKey: string
  lightKey: string | null
  formless: boolean
  desc: LayerDesc
  ratio: number
  rect: DeviceRect
  phase: number
}

interface Shown {
  request: Request
  preview?: true
  receiver?: LayerOf<'canopy'>['receiver']
  form: ImageBitmap | null
  light: ImageBitmap | null
}

export interface Entry {
  wanted: Request
  shown: Shown | null
  /**
   * Parts already painted for a picture whose other part is still on its way: strips paint in chunks
   * (`remoteQueue.ts`), so a layer's form and light can arrive in different batches.
   */
  staged?: { request: Request; parts: PaintResult[] } | null
}

export function partsOf(shown: Shown | null, staged?: Entry['staged']) {
  return new Set([shown?.form, shown?.light, ...(staged?.parts ?? []).map(({ bitmap }) => bitmap)])
}

/** A staged part still fits the wanted picture: a form for the same form, a light for the same paint. */
const fits = (part: PaintResult['part'], staged: Request, wanted: Request) =>
  part === 'form' ? sameForm(staged, wanted) : samePaint(staged, wanted)

/** Drops (and closes) staged parts the wanted picture no longer uses. */
export function pruneStaged(entry: Entry) {
  const { staged, wanted } = entry
  if (!staged) return
  const keep = staged.parts.filter(({ part }) => fits(part, staged.request, wanted))
  for (const { bitmap } of staged.parts) if (!keep.some((k) => k.bitmap === bitmap)) bitmap?.close()
  entry.staged = keep.length ? { request: staged.request, parts: keep } : null
}

export const isStaged = (entry: Entry, part: PaintResult['part']) => Boolean(entry.staged?.parts.some((p) => p.part === part))

/** Whether these parts, with the compatible picture shown, make a whole picture for `request`. */
function completes(entry: Entry, request: Request, parts: readonly PaintResult[]) {
  const compatible = entry.shown && sameForm(entry.shown.request, request) ? entry.shown : null
  const form = parts.some(({ part }) => part === 'form') || Boolean(compatible?.form)
  const light = parts.some(({ part }) => part === 'light')
    || (compatible?.request.lightKey === request.lightKey && Boolean(compatible?.light))
  return (request.formless || form) && (request.lightKey === null || light)
}

/** Merges arrived parts with the staged ones: a whole picture goes on to `accept`, a part waits for the rest. */
export function stage(entry: Entry, request: Request, parts: PaintResult[]): PaintResult[] | null {
  const staged = entry.staged
  const kept = staged ? staged.parts.filter(({ part }) => fits(part, staged.request, request) && !parts.some((p) => p.part === part)) : []
  for (const { bitmap } of staged?.parts ?? []) if (!kept.some((k) => k.bitmap === bitmap)) bitmap?.close()
  const all = [...kept, ...parts]
  if (completes(entry, request, all)) {
    entry.staged = null
    return all
  }
  entry.staged = { request, parts: all }
  return null
}

function closeReplaced(shown: Shown | null, candidates: Iterable<ImageBitmap | null | undefined>) {
  const retained = partsOf(shown)
  for (const bitmap of candidates) if (!retained.has(bitmap)) bitmap?.close()
}

export function sameForm(a: Request | undefined, b: Request) {
  return a?.formKey === b.formKey && a.formless === b.formless
}

export function samePaint(a: Request, b: Request) {
  return sameForm(a, b) && a.lightKey === b.lightKey
}

function promote(entry: Entry, shown: Shown) {
  closeReplaced(shown, partsOf(entry.shown))
  entry.shown = shown
}

/** Reuse compatible pixels and keep placement-only updates live. */
export function reuse(entry: Entry) {
  const { wanted, shown } = entry
  if (!shown || !sameForm(shown.request, wanted)) return
  if (wanted.lightKey === shown.request.lightKey) shown.request = wanted
  else if (wanted.lightKey === null) {
    promote(entry, { request: wanted, form: shown.form, light: null })
  } else shown.request = { ...shown.request, desc: wanted.desc }
}

/** A complete picture can replace the one shown if it is newer or matches the current ask. */
export function accept(entry: Entry, request: Request, results: readonly PaintResult[]) {
  const { shown, wanted } = entry
  const current = samePaint(request, wanted)
  const preview = results.some((part) => part.preview) ? true : undefined
  if ((current || request.generation > (shown?.request.generation ?? 0))
    && !(preview && shown && !shown.preview && samePaint(shown.request, request))) {
    const compatible = shown && sameForm(shown.request, request) ? shown : null
    const form = results.find((result) => result.part === 'form')?.bitmap ?? compatible?.form ?? null
    const light = results.find((result) => result.part === 'light')?.bitmap
      ?? (compatible?.request.lightKey === request.lightKey ? compatible?.light ?? null : null)
    if ((request.formless || form) && (request.lightKey === null || light)) {
      const layout = current ? wanted : sameForm(wanted, request) ? { ...request, desc: wanted.desc } : request
      const receiver = request.desc.kind === 'canopy' ? request.desc.receiver : undefined
      promote(entry, { request: layout, receiver, form, light, preview })
    }
  }
  closeReplaced(entry.shown, results.map(({ bitmap }) => bitmap))
}

export function peek(entry: Entry | undefined) {
  if (!entry?.shown) return null
  const { form, light, receiver, preview, request: { ratio, rect, formKey, lightKey, desc } } = entry.shown
  return { form, light, receiver, preview, ratio, rect, formKey, lightKey, desc }
}
