import type { LayerDesc } from '../model/types'
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
  form: ImageBitmap | null
  light: ImageBitmap | null
}

export interface Entry {
  wanted: Request
  shown: Shown | null
}

export function partsOf(shown: Shown | null) {
  return new Set([shown?.form, shown?.light])
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
  if (current || request.generation > (shown?.request.generation ?? 0)) {
    const compatible = shown && sameForm(shown.request, request) ? shown : null
    const form = results.find((result) => result.part === 'form')?.bitmap ?? compatible?.form ?? null
    const light = results.find((result) => result.part === 'light')?.bitmap
      ?? (compatible?.request.lightKey === request.lightKey ? compatible?.light ?? null : null)
    if ((request.formless || form) && (request.lightKey === null || light)) {
      const layout = current ? wanted : sameForm(wanted, request) ? { ...request, desc: wanted.desc } : request
      promote(entry, { request: layout, form, light })
    }
  }
  closeReplaced(entry.shown, results.map(({ bitmap }) => bitmap))
}

export function peek(entry: Entry | undefined) {
  if (!entry?.shown) return null
  const { form, light, request: { ratio, rect, formKey, desc } } = entry.shown
  return { form, light, ratio, rect, formKey, desc }
}
