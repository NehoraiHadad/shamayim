import { seeded } from '../../data/landmarks/hash'

/** Seeded puffs in the vertical section of a convective cloud. The sky
 * draws the section; the shadow projects it along the solar ray. */
export function cloudBodyPuffs(seed: number, w: number, tall: number, anvil: number,
  draw: (x: number, y: number, rx: number, ry: number, opacity: number) => void) {
  const random = seeded(seed)
  const count = Math.max(8, Math.min(200, Math.round(10 * tall / w) + 8))
  for (let i = 0; i < count; i++) {
    const up = ((i + random()) / count) ** .75
    const flare = anvil * .9 * Math.max(0, (up - .55) / .45) ** 1.5
    const half = w / 2 * (1 - .25 * up + flare)
    const rx = half * (.3 + .25 * random()) * (.8 + .4 * up)
    const x = (random() * 2 - 1) * (half - rx * .6)
    const y = -up * (tall - rx * .7)
    draw(x, y, rx, rx * (.85 + .15 * random()), .75 + .25 * random())
  }
  return random
}
