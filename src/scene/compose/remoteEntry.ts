import type { LayerDesc } from '../model/types'
import { beamKeyOf, resultBitmaps, type DeviceRect, type PaintPose, type PaintResult } from './paintJob'
import { shadeKeyOf } from './paintReceiver'

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
  lightDesc: LayerDesc
  form: ImageBitmap | null
  light: ImageBitmap | null
  shade?: ImageBitmap | null
  poses?: PaintPose[]
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
  const picture = shown && resultBitmaps({ bitmap: shown.light, shade: shown.shade, poses: shown.poses })
  return new Set([shown?.form, ...(picture ?? []), ...(staged?.parts ?? []).flatMap(resultBitmaps)])
}

export function closeEntry(entry: Entry) {
  for (const bitmap of partsOf(entry.shown, entry.staged)) bitmap?.close()
}

/** A staged part still fits the wanted picture: a form for the same form, a light for the same paint. */
const fits = (part: PaintResult['part'], staged: Request, wanted: Request) =>
  part === 'form' ? sameForm(staged, wanted) : samePaint(staged, wanted)

/** Drops (and closes) staged parts the wanted picture no longer uses. */
export function pruneStaged(entry: Entry) {
  const { staged, wanted } = entry
  if (!staged) return
  const keep = staged.parts.filter(({ part }) => fits(part, staged.request, wanted))
  for (const part of staged.parts) if (!keep.includes(part)) for (const bitmap of resultBitmaps(part)) bitmap?.close()
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
  for (const part of staged?.parts ?? []) if (!kept.includes(part)) for (const bitmap of resultBitmaps(part)) bitmap?.close()
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
  if (wanted.lightKey === shown.request.lightKey) {
    shown.request = wanted
    shown.lightDesc = wanted.desc
  } else if (wanted.lightKey === null) {
    promote(entry, { request: wanted, form: shown.form, light: null, lightDesc: wanted.desc })
  } else if (shown.shade && wanted.desc.kind === 'plane' && !wanted.desc.cloudShadow
    && wanted.lightKey === beamKeyOf(shown.lightDesc)) {
    promote(entry, { request: wanted, form: shown.form, light: shown.light, lightDesc: wanted.desc })
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
    const painted = results.find((result) => result.part === 'light')
    const held = compatible?.request.lightKey === request.lightKey ? compatible : null
    const light = painted ? painted.bitmap : held?.light ?? null
    const shade = painted ? painted.shade : held?.shade
    const completeLight = request.lightKey === null || (light && (shade || !shadeKeyOf(request.desc) || (preview && !shown?.shade)))
    if ((request.formless || form) && completeLight) {
      const layout = current ? wanted : sameForm(wanted, request) ? { ...request, desc: wanted.desc } : request
      promote(entry, { request: layout, form, light, shade, poses: painted ? painted.poses : held?.poses, preview, lightDesc: request.desc })
    }
  }
  closeReplaced(entry.shown, results.flatMap(resultBitmaps))
}

export function peek(entry: Entry | undefined) {
  if (!entry?.shown) return null
  const { form, light, shade, poses, preview, lightDesc, request: { ratio, rect, formKey, lightKey, desc } } = entry.shown
  return { form, light, shade, poses, preview, lightDesc, ratio, rect, formKey, lightKey, desc }
}
