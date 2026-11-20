import { css, mix } from '../hand'
import { Kit, rect } from '../glyphs/kit'

/**
 * Azrieli Center (stage C4 icon): the round (187 m), triangular (169 m) and square (154 m) glass towers on their shared
 * podium, the mid-height mechanical floor as a band (references: Wikipedia, photographs from the Ayalon; the SVG icon
 * `curated/telAviv.tsx`; west→east order unverified). Three different shapes, one sign of the city, so the towers keep
 * their order and the light is drawn for its side (`side` +1 left, −1 right) instead of mirroring them: the drum turns
 * from the light, the triangle's two faces split into lit and shade, the square takes a lit edge. Lit windows by night.
 */
export function azrieli(k: Kit, h: number, side: 1 | -1 | 0) {
  const { t, c } = k
  const round = h, tri = h * 0.9, square = h * 0.82 - 1
  const shoulder = -round + 0.9
  const day = 1 - k.night
  // The podium.
  k.fill(rect(-9.5, -3, 19, 3), t.wall)
  k.fill(rect(side < 0 ? 8 : -9.5, -3, 1.5, 3), t.lit)
  k.fill(rect(-9.5, -3, 19, 0.5), t.rim, 0.6)
  // Round: a glass drum, lit from the light's side, the core shadow on the far side, the observation crown stepped in.
  const g = c.createLinearGradient(side < 0 ? -2.5 : -8, 0, side < 0 ? -8 : -2.5, 0)
  const glass = mix(t.wall, t.glass, day)
  const glassLit = mix(t.wall, t.glassLit, day)
  g.addColorStop(0, css(side ? mix(glassLit, t.rim, 0.3) : glass))
  g.addColorStop(0.25, css(side ? glassLit : glass))
  g.addColorStop(0.6, css(glass))
  g.addColorStop(1, css(side ? mix(glass, t.shade, 0.7) : glass))
  c.beginPath()
  c.moveTo(-8, 0)
  c.lineTo(-8, shoulder)
  c.lineTo(-7.3, shoulder - 0.9)
  c.lineTo(-6.5, shoulder - 1.6)
  c.lineTo(-4, shoulder - 1.6)
  c.lineTo(-3.2, shoulder - 0.9)
  c.lineTo(-2.5, shoulder)
  c.lineTo(-2.5, 0)
  c.closePath()
  c.fillStyle = g
  c.fill()
  k.fill(rect(-8, shoulder - 1.6, 5.5, 0.4), t.rim, 0.55)
  // Triangle: two glass faces meeting at a sharp edge, one toward the light.
  k.fill(rect(-2, -tri, 2.6, tri), side < 0 ? glass : glassLit)
  k.fill(rect(0.6, -tri, 2.6, tri), side < 0 ? glassLit : mix(glass, t.shade, side ? 0.6 : 0.2))
  k.fill(rect(0.4, -tri, 0.4, tri), t.rim, 0.35)
  // Square: one flat face, a flat roof, the narrow side face toward or away from the light.
  k.fill(rect(3.6, -square, 4.6, square), glass)
  k.fill(rect(side < 0 ? 7.4 : 3.6, -square, 0.8, square), side < 0 ? glassLit : side ? mix(glass, t.lit, 0.4) : glass)
  k.fill(rect(side < 0 ? 3.6 : 7.4, -square, 0.8, square), t.shade, side ? 0.6 : 0.2)
  k.fill(rect(3.6, -square, 4.6, 0.5), t.rim, 0.5)
  for (const [x, w] of [[-8, 5.5], [-2, 5.2], [3.6, 4.6]] as const) k.fill(rect(x, -square * 0.5, w, 0.5), t.shade, 0.4)
  if (k.s.windows > 0) {
    for (const [x0, x1, top] of [[-7.5, -3, -round + 3], [-1.6, 2.8, -tri + 2], [4, 7.8, -square + 2]] as const) {
      for (let y = top; y < -3.5; y += 1.6) for (let x = x0; x < x1; x += 1.3) {
        if (k.r() < k.s.windows * 0.8) k.fill(rect(x, y, 0.7, 0.7), mix(t.wall, t.win, 0.8))
      }
    }
  }
  k.aviation(-5.25, -round - 1.1)
}
