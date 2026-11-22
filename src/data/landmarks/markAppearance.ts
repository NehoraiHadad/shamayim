import type { Landmark } from './types'

const LIGHTS = new Set<Landmark['kind']>(['highrise', 'homes', 'church', 'minaret', 'lighthouse'])
const LIT_CUSTOM = new Set(['jerusalem-wall', 'tel-aviv-azrieli', 'haifa-bab'])

/** Appearance shared by portrait and outside-view landmarks. Four lit windows and the 60 m tall class are the
 * existing glyph rules. */
export function markAppearance(mark: Landmark) {
  return { glyph: mark.glyph ?? mark.kind, lights: LIGHTS.has(mark.kind) || LIT_CUSTOM.has(mark.glyph ?? '') ? 4 : 0,
    tall: mark.heightM >= 60 }
}

