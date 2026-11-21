import { mix } from '../hand'
import { Kit, poly, rect } from '../glyphs/kit'

/**
 * Azrieli Center (stage C4 icon): the round (187 m), triangular (169 m) and square (154 m) glass towers on their shared
 * podium, the mid-height mechanical floor as a band (references: Wikipedia, photographs from the Ayalon; the SVG icon
 * `curated/telAviv.tsx`; west→east order unverified). Three different shapes, one sign of the city, so the towers keep
 * their order. The drum and the triangular and square faces respond to signed light.
 */
export function azrieli(k: Kit, h: number) {
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
