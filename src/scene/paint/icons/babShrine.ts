import type { GlyphDesc } from '../../model/types'
import { mix } from '../hand'
import { paintFloodlitDome, paintGilding } from '../glyphs/gilding'
import { arch, Kit, rect, type Tracer } from '../glyphs/kit'

/**
 * The Shrine of the Báb (stage C4 icon): a granite arcade, an octagon, a drum with tall windows, the golden fish-scale
 * dome with its lantern, and below it the garden terraces stepping down the Carmel (references: Wikipedia, Bahá'í World
 * News Service photographs; the SVG icon `curated/haifa.tsx`). The arcade is floodlit by night. The arcade and dome keep their orientation as the light moves.
 */
export function babShrine(k: Kit, h: number, { gilding: gold, floodlitDome }: GlyphDesc) {
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
  // The gilded dome and lantern reflect the sky and beam across their curved sectors.
  const dome = -h + 1.5
  const canopy: Tracer = c => {
    c.beginPath()
    c.moveTo(-2.8, -9.5)
    c.bezierCurveTo(-2.7, dome + 1.05, -1.43, dome, 0, dome)
    c.bezierCurveTo(1.43, dome, 2.7, dome + 1.05, 2.8, -9.5)
    c.closePath()
  }
  const paintMetal = () => {
    if (!gold) return
    paintGilding(k, canopy, dome, -9.5, gold)
    k.fill(rect(-.5, -h, 1, 1.8), gold[1][3])
  }
  // The floodlit dome stays solid beneath the fading metal, so the hill never shows through twilight.
  if (floodlitDome) paintFloodlitDome(k, h, floodlitDome.tones)
  if (!floodlitDome) paintMetal()
  else if (floodlitDome.strength < 1) {
    const c = k.c
    c.save()
    c.globalAlpha *= 1 - floodlitDome.strength
    paintMetal()
    c.restore()
  }
  k.lamp(0, -5, 6, t.win, 0.25 * k.night, flood)
}
