import { HORIZON_BAND_PROFILE, HORIZON_BAND_SPAN } from '../../../model/skyGlows'
import type { LayerDesc, LayerOf } from '../../../model/types'
import { css } from '../base/hand'
import { archStops } from './archStops'

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
    const top = band.y - band.h, span = band.h * HORIZON_BAND_SPAN, bottom = top + span
    const stops = HORIZON_BAND_PROFILE.map(([at, alpha]) => `${css(band.rgb, band.alpha * alpha)} ${px(top + at * span)}`)
    out.push(`linear-gradient(180deg, ${css(band.rgb, 0)} ${px(Math.max(0, top))}, ${stops.join(', ')}, ${css(band.rgb, 0)} ${px(bottom)})`)
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

/** The sky layers the canvas paints: all but the base, which is laid as the canvas's CSS background (`skyBackground`). */
export const onSkyCanvas = (layers: readonly LayerDesc[]) => layers.filter((layer) => layer.kind !== 'sky')
