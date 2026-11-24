import type { Band, LayerDesc, LayerOf } from '../../../model/types'
import { css } from '../base/hand'
import { archStops } from './archStops'

/** The band's stops (px from its top `band.y − band.h` to its bottom `band.y + 0.3 band.h`). */
function bandStops(band: Band): [number, string][] {
  return [[0, css(band.rgb, 0)], [0.45, css(band.rgb, band.alpha * 0.35)], [1 / 1.3, css(band.rgb, band.alpha)], [1, css(band.rgb, band.alpha * 0.4)]]
}

const px = (v: number) => `${Math.round(v * 100) / 100}px`

/**
 * The same base as CSS backgrounds over the layer's box (first listed is on top): the band, the glows, the arch, the
 * gradient. Pure: a string from the desc.
 */
export function skyBackground(desc: LayerOf<'sky'>): string {
  const { h } = desc.bounds
  const out: string[] = []
  const band = desc.band
  if (band) {
    const top = band.y - band.h, span = band.h * 1.3, bottom = top + span
    const { below = 0 } = band, at = bandStops(band)
    const stops = at.map(([t, colour], i) => `${colour} ${px(top + t * span + (i === at.length - 1 ? below : 0))}`)
    if (below) stops.splice(-1, 0, `${css(band.rgb, band.alpha)} ${px(band.y + below)}`)
    out.push(`linear-gradient(180deg, ${css(band.rgb, 0)} ${px(Math.max(0, top))}, ${stops.join(', ')}, ${css(band.rgb, 0)} ${px(bottom + below)})`)
  }
  for (const g of [...desc.glow].reverse()) {
    out.push(`radial-gradient(${px(g.r)} ${px(g.ry ?? g.r)} at ${px(g.x)} ${px(g.y)}, ${css(g.rgb, g.alpha)} 0, ${css(g.rgb, 0)} 100%)`)
  }
  const a = desc.arch
  if (a) {
    // The arch only rises above the horizon: below eye level the land covers it.
    out.push(`radial-gradient(${px(a.rx)} ${px(a.belt)} at ${px(a.x)} ${px(a.y)}, ${archStops(a).map(([at, colour]) => `${colour} ${(at * 100).toFixed(2)}%`).join(', ')})`)
  }
  out.push(`linear-gradient(180deg, ${desc.stops.map(([at, rgb]) => `${css(rgb)} ${px(Math.min(1, Math.max(0, at)) * h)}`).join(', ')})`)
  return out.join(', ')
}

/** Multiply needs the opaque base on the same canvas. Ungraded skies retain their CSS base. */
export const onSkyCanvas = (layers: readonly LayerDesc[]) =>
  layers.some(layer => layer.kind === 'skyFilter') ? layers : layers.filter(layer => layer.kind !== 'sky')
