import { Kit, rect } from '../glyphs/kit'

/**
 * The Western Wall (stage C4 icon): the Temple Mount's retaining wall, big Herodian ashlars with drafted margins in the
 * lower courses and smaller later stones above, caper bushes in the joints (references: photographs from the plaza;
 * the SVG icon `curated/jerusalem.tsx`). Floodlit by night, so the stone stays pale. Faces the eye: the light on either
 * side only rakes the margins, so it is drawn for the light's side (`side` +1 left, −1 right) rather than mirrored.
 */
const COURSES: [number, number][] = [[1.9, 0], [1.9, 2.1], [1.7, 0.9], [1.3, 2.6], [1.1, 1.4], [1.1, 0.3]]
const HERODIAN = 3

export function westernWall(k: Kit, h: number, side: 1 | -1 | 0) {
  const { t } = k
  const flood = k.night > 0.4
  let y = 0
  const rows = COURSES.map(([height, offset], i) => { y -= height; return { y, height, offset, herodian: i < HERODIAN } })
    .filter((row) => row.y >= -h - 0.1)
  const top = rows.at(-1)!.y
  k.fill(rect(-9, top, 18, -top), flood ? t.stoneLit : t.stone)
  k.fill(rect(-9, top, 18, 0.6), t.rim, 0.8)
  for (const row of rows) {
    const step = row.height * (row.herodian ? 2.6 : 2)
    for (let i = 0; i < 9; i++) {
      const x0 = Math.max(-9, -9 - row.offset + i * step), x1 = Math.min(9, -9 - row.offset + (i + 1) * step)
      if (x1 <= -9 || x0 >= 9 || x1 <= x0) continue
      k.fill(rect(x0, row.y + row.height - 0.35, x1 - x0, 0.35), t.shade, 0.6)
      k.fill(rect(side < 0 ? x0 : x1 - 0.35, row.y, 0.35, row.height), t.shade, 0.5)
      if (row.herodian && side !== 0) {
        // The drafted margin round each boss catches the light on top and on the light's side.
        k.fill(rect(x0, row.y, x1 - x0 - 0.35, 0.35), t.stoneLit, 0.9)
        k.fill(rect(side > 0 ? x0 : x1 - 0.7, row.y, 0.35, row.height - 0.35), t.stoneLit, 0.9)
      }
    }
  }
  for (const [x, yy, w, hh] of [[-6, -6.9, 1.3, 0.7], [3.6, -5.2, 1, 0.6], [-1.5, -8.3, 0.9, 0.5]] as const) {
    if (yy >= top) k.fill(rect(x, yy, w, hh), t.green)
  }
}
