import type { WorldState } from '../../world/types'
import { luminanceOf } from './cloudChromaticity'
import { cloudLayersForSky, cloudLayersOf } from './cloudLayers'
import { skyFilterDepth } from './skyFilter'
import { skyStops, stopAt } from './skyGradient'
import { mixRgb } from './tone'
import type { RGB, SceneBox } from './types'

/** Compare the painted cloud endpoints with the same geometry without dust extinction. */
export function cloudGradeDepth(world: WorldState, box: SceneBox, middle: number, rounding: number): number {
  const dusty = cloudLayersForSky(world, box)
  if (!dusty.length) return 0
  // Hold visibility and the supplied light palette fixed to compare the same deck.
  const clear = { ...world, air: { ...world.air, dustVeilPotential: 0 } }
  const clean = cloudLayersOf(clear, box, undefined, dusty)
  const dustyStops = skyStops(world, box), cleanStops = skyStops(clear, box)
  let depth = 0
  function compare(rgb: RGB, control: RGB) {
    depth = Math.max(depth, skyFilterDepth(rgb, luminanceOf(control), rounding))
  }
  for (const desc of dusty) {
    const control = clean.find(layer => layer.id === desc.id)
    if (desc.kind === 'cloudSheet' && control?.kind === 'cloudSheet') {
      // The sheet's tones interpolate between these swatches. Use the largest
      // opacity in the visible strip to bound the contribution of its bright body.
      for (const [row, y] of desc.ys.entries()) {
        if (y > middle) break
        const start = row * desc.xs.length
        let a = 0
        for (let i = start; i < start + desc.xs.length; i++) a = Math.max(a, desc.alpha[i])
        if (!a) continue
        const at = y / box.skyHeight
        const behind = stopAt(dustyStops, at), cleanBehind = stopAt(cleanStops, at)
        for (const tone of ['body', 'lit'] as const) {
          compare(mixRgb(behind, desc[tone], a * (desc.through?.[row] ?? 1)),
            mixRgb(cleanBehind, control[tone], a * (control.through?.[row] ?? 1)))
        }
      }
    } else if (desc.kind === 'cloudCells' && control?.kind === 'cloudCells') {
      for (const { sprite, y } of desc.cells) {
        if (y - sprite.tall > middle) continue
        const cleanSprite = control.cells.find(cell => cell.sprite.seed === sprite.seed)?.sprite
        if (!cleanSprite) continue
        const at = Math.max(0, y - sprite.tall) / box.skyHeight
        const behind = stopAt(dustyStops, at), cleanBehind = stopAt(cleanStops, at)
        for (const tone of ['body', 'lit'] as const) {
          compare(mixRgb(behind, sprite[tone], sprite.share),
            mixRgb(cleanBehind, cleanSprite[tone], cleanSprite.share))
        }
      }
    }
  }
  return depth
}
