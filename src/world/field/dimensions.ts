import { GENERA, smoothstep } from './genus'
import type { Genus, Lattice, LayerForm } from './types'

const mean = ([a, b]: readonly [number, number]) => (a + b) / 2
const mix = (a: number, b: number, f: number) => a + (b - a) * f

/** Physical base, thickness and extinction for a genus and its site aspect. */
export function dimensions(genus: Genus, lowBaseKm: number, form: LayerForm, aspect: number, widthKm?: number): Dimensions {
  const { base, thickness, kappa } = GENERA[genus]
  const lcl = genus === 'cu' || genus === 'cg' || genus === 'cb' || genus === 'sc' || genus === 'st'
  const baseKm = lcl ? Math.max(base[0], Math.min(base[1], lowBaseKm)) : mean(base)
  let vKm = mix(thickness[0], thickness[1], aspect)
  if (genus === 'cb') vKm -= baseKm
  if (genus === 'cu') {
    const blend = smoothstep(0.1, 0.4, form.conv)
    const cuAspect = mix(0.4, 0.8, blend)
    const lo = mix(0.15, 0.5, blend)
    const hi = mix(0.5, 1.5, blend)
    vKm = Math.max(lo, Math.min(hi, (widthKm ?? mix(0.6, 1.25, blend)) * cuAspect))
  } else if (genus === 'cg' && widthKm !== undefined) {
    vKm = Math.max(2, Math.min(5, widthKm * mix(1.2, 1.5, aspect)))
  }
  return { baseKm, vKm, kappa }
}

type Dimensions = { baseKm: number; vKm: number; kappa: number }

function blend(a: Dimensions, b: Dimensions, f: number): Dimensions {
  return {
    baseKm: mix(a.baseKm, b.baseKm, f),
    vKm: mix(a.vKm, b.vKm, f),
    kappa: mix(a.kappa, b.kappa, f),
  }
}

export function layerDimensions(lattice: Lattice, lowBaseKm: number, form: LayerForm) {
  const shape = (genus: Genus) => dimensions(genus, lowBaseKm, form, 0.5)
  switch (lattice) {
    case 'low': {
      const st = form.stratus ?? 0
      const cu = shape('cu')
      const sc = shape('sc')
      return st === 1 ? shape('st') : blend(blend(cu, sc, Math.max(0, form.strat - st) / (1 - st)), shape('st'), st)
    }
    case 'tower': return blend(shape('cg'), shape('cb'), smoothstep(0.6, 1, form.conv))
    case 'mid': {
      const ns = form.nimbostratus ?? 0
      return ns === 1 ? shape('ns')
        : blend(blend(shape('ac'), shape('as'), Math.max(0, form.sheet - ns) / (1 - ns)), shape('ns'), ns)
    }
    case 'high': return blend(shape('ci'), shape('cs'), form.veil)
  }
}
