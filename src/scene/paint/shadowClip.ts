import type { LayerOf, Pt } from '../model/types'

type Clip = NonNullable<LayerOf<'cloudShadow'>['clip']>
/** A clip as the canvas takes it: closed rings, filled by `rule`. Successive clips intersect. */
export interface ClipRegion { rings: Pt[][]; rule: CanvasFillRule }

/**
 * The ground a plane shows, as the intersection of clips (never one polygon through both crests: where a nearer ridge
 * rises above this crest the two lines cross, and the pinched loop between them would let a far shadow onto the near
 * ridge). First the plane's own face, from its crest down to the base. Then, per nearer plane, the whole box minus that
 * plane's face (`evenodd` of the box and the face), so its ridge hides this ground wherever it stands higher.
 */
export function shadowClipRegions(clip: Clip, w: number, h: number): ClipRegion[] {
  const box: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]]
  return [
    { rings: [faceOf(clip.crest, h)], rule: 'nonzero' },
    ...clip.fronts.filter((f) => f.length >= 2).map((f): ClipRegion => ({ rings: [box, faceOf(f, h)], rule: 'evenodd' })),
  ]
}

/** A crest closed straight down to the base at both ends: the land below it. */
function faceOf(crest: Pt[], h: number): Pt[] {
  return [...crest, [crest[crest.length - 1][0], h], [crest[0][0], h]]
}

/** Whether (x, y) survives every region, by the same fill rules the canvas applies. */
export function insideClip(regions: ClipRegion[], x: number, y: number): boolean {
  return regions.every(({ rings, rule }) => {
    const windings = rings.map((ring) => winding(ring, x, y))
    return rule === 'evenodd' ? windings.reduce((n, wn) => n + Math.abs(wn), 0) % 2 === 1 : windings.some((wn) => wn !== 0)
  })
}

function winding(ring: Pt[], x: number, y: number): number {
  let wn = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length]
    const side = (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0)
    if (y0 <= y && y1 > y && side > 0) wn++
    else if (y0 > y && y1 <= y && side < 0) wn--
  }
  return wn
}
