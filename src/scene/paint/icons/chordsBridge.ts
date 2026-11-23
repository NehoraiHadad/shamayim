import { css, mix } from '../hand'
import { Kit, poly, rect } from '../glyphs/kit'

/**
 * The Chords Bridge (stage C4 icon; Calatrava, 2008): one white inclined pylon (118 m), a harp of stays fanning down to
 * the curved deck on one side and back-stays to the ground on the other (references: photographs, Wikipedia; the SVG
 * icon `curated/jerusalem.tsx`; the lean's direction in our south view unverified). Asymmetric, so it keeps its lean and
 * signed lateral light brightens the facing pylon face. Both sets of round stays catch light from either direction.
 */
export function chordsBridge(k: Kit, h: number) {
  const { t, c } = k
  const deck = -2.5, foot = -6
  const top: [number, number] = [foot - 0.2 * h, -h]
  const along = (f: number): [number, number] => [foot + (top[0] - foot) * f, deck + (top[1] - deck) * f]
  // The deck, its girder edge in shade.
  k.fill(rect(-8, deck, 21, 1.5), t.wall)
  k.fill(rect(-8, deck, 21, 0.45), t.rim, 0.6)
  k.fill(rect(-8, deck + 1, 21, 0.5), t.shade)
  // The stays first, behind the pylon: fine lines lit by the light.
  c.lineWidth = 0.22
  c.strokeStyle = css(k.surfaces?.silver ?? mix(t.wall, t.rim, k.k), 0.85)
  c.beginPath()
  ;[0.42, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9].forEach((f, i) => {
    const [x, y] = along(f)
    c.moveTo(x + 0.4, y)
    c.lineTo(-2 + i * 2.1, deck)
  })
  c.stroke()
  c.beginPath()
  const [bx, by] = along(0.86)
  c.moveTo(bx - 0.4, by)
  c.lineTo(-8, deck)
  c.stroke()
  // The pylon: a tapering white mast leaning back, its face to the light lit.
  const pylon = [foot - 1.1, deck, foot + 1.1, deck, top[0] + 0.6, top[1], top[0] - 0.6, top[1]]
  k.fill(poly(pylon), t.stone)
  k.fill(poly([foot - 1.1, deck, foot, deck, top[0], top[1], top[0] - 0.6, top[1]]), t.stoneLit, k.kl)
  k.fill(poly([foot, deck, foot + 1.1, deck, top[0] + 0.6, top[1], top[0], top[1]]), t.stoneLit, k.kr)
  k.aviation(top[0], top[1] - 0.4)
}
