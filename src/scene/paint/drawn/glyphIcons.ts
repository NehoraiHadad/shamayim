import { arch, poly, rect } from '../glyphs/kit'
import { paintFloodlitDome } from '../glyphs/gilding'
import { css, mix } from '../hand'
import type { DrawnGlyphKit } from './glyphKit'

export function azrieli(k: DrawnGlyphKit, h: number) {
  const { t } = k
  const round = h, tri = h * 0.9, square = h * 0.82 - 1
  const shoulder = -round + 0.9
  const day = 1 - k.night
  // The podium.
  k.fill(rect(-9.5, -3, 19, 3), t.wall)
  k.fill(rect(-9.5, -3, 1.5, 3), t.lit, k.kl)
  k.fill(rect(8, -3, 1.5, 3), t.lit, k.kr)
  k.fill(rect(-9.5, -3, 19, 0.5), t.rim, 0.6)
  const glass = mix(t.wall, t.glass, day)
  const glassLit = mix(t.wall, t.glassLit, day)
  k.round(poly([-8, 0, -8, shoulder, -7.3, shoulder - 0.9, -6.5, shoulder - 1.6,
    -4, shoulder - 1.6, -3.2, shoulder - 0.9, -2.5, shoulder, -2.5, 0]), -8, -2.5, 0.6, glass, glassLit)
  k.fill(rect(-8, shoulder - 1.6, 5.5, 0.4), t.rim, 0.55)
  // Triangle: two glass faces meeting at a sharp edge, one toward the light.
  k.fill(rect(-2, -tri, 2.6, tri), k.face(glass, glassLit, 1, t.shade))
  k.fill(rect(0.6, -tri, 2.6, tri), k.face(glass, glassLit, -1, t.shade))
  k.fill(rect(0.4, -tri, 0.4, tri), t.rim, 0.35)
  // Square: one flat face, a flat roof, the narrow side face toward or away from the light.
  k.fill(rect(3.6, -square, 4.6, square), glass)
  k.fill(rect(3.6, -square, 0.8, square), k.face(glass, glassLit, 1, t.shade))
  k.fill(rect(7.4, -square, 0.8, square), k.face(glass, glassLit, -1, t.shade))
  k.fill(rect(3.6, -square, 4.6, 0.5), t.rim, 0.5)
  for (const [x, w] of [[-8, 5.5], [-2, 5.2], [3.6, 4.6]] as const) k.fill(rect(x, -square * 0.5, w, 0.5), t.shade, 0.4)
  for (const [x0, x1, top] of [[-7.5, -3, -round + 3], [-1.6, 2.8, -tri + 2], [4, 7.8, -square + 2]] as const) {
    for (let y = top; y < -3.5; y += 1.6) for (let x = x0; x < x1; x += 1.3) {
      k.fill(rect(x, y, 0.7, 0.7), mix(t.wall, t.win, 0.8), Number(k.r() < k.s.windows * 0.8))
    }
  }
  k.aviation(-5.25, -round - 1.1)
}

export function babShrine(k: DrawnGlyphKit, h: number) {
  const { t } = k
  const flood = k.nightFade(0.3, 0.5)
  // The terraces: a stair of gardens down the face, a pale stair line down the middle.
  for (const [w, y] of [[6, 1.5], [9, 4], [12, 6.5]] as const) {
    k.fill((cx) => { cx.beginPath(); cx.moveTo(-w / 2, y); cx.lineTo(w / 2, y); cx.lineTo(w / 2 + 1.5, y + 2.5); cx.lineTo(-w / 2 - 1.5, y + 2.5); cx.closePath() }, t.green)
    k.fill(rect(-w / 2 - 1.5, y + 2.1, w + 3, 0.4), t.shade, 0.5)
    k.fill(rect(-w / 2, y, w / 3, 0.4), t.greenLit, 0.8 * k.kl)
    k.fill(rect(w / 6, y, w / 3, 0.4), t.greenLit, 0.8 * k.kr)
  }
  k.fill(rect(-0.25, 1.5, 0.5, 7.5), mix(t.stone, t.win, flood), 0.8 - 0.2 * flood)
  // The arcade.
  k.box(-6, -4, 12, 4, 1.4, { shadeW: 0.8, front: mix(t.stone, t.win, 0.35 * flood), sideC: t.stoneLit })
  k.rim(-6, -4, 12)
  for (const x of [-4.5, -1.75, 1, 3.75]) k.open(arch(x - 0.25, 0, 1.5, 3), true, 0.8)
  for (const x of [-6, 5]) k.box(x, -5.5, 1, 1.5, 0.4, { front: t.stone, sideC: t.stoneLit })
  // The octagon and the drum.
  k.box(-3.5, -7, 7, 3, 1.1, { shadeW: 0.7, front: t.stone, sideC: t.stoneLit })
  k.rim(-3.5, -7, 7)
  k.round(rect(-2.5, -9.5, 5, 2.5), -2.5, 2.5)
  for (const x of [-1.75, 0.25]) k.open(rect(x, -9.1, 1.5, 1.8), true, 0.9)
  paintFloodlitDome(k, h, t)
  k.lamp(0, -5, 6, t.win, 0.25 * k.night, flood)
}

export function chordsBridge(k: DrawnGlyphKit, h: number) {
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
  c.strokeStyle = css(mix(t.wall, t.rim, k.k), 0.85)
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
