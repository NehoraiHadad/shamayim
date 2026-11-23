/** A part of a garment: its outline (SVG path data) and how it is drawn; `t`: [deg, dx, dy] turn and shift first. */
export interface Part { d: string; as: 'cloth' | 'shade' | 'inner' | 'tag' | 'seam' | 'stitch' | 'strong' | 'dot' | 'crook' | 'glint' | 'cord' | 'water'
  t?: readonly [number, number, number] }
export type Grain = 'weave' | 'knit' | 'twill' | 'nylon' | 'straw' | 'none'
export interface Shape { parts: Part[]; grain: Grain }
