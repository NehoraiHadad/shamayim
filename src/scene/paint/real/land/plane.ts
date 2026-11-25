import { spanDeg } from '../../../../domain/camera'
import type { Lamp } from '../../../model/layers/lamp'
import type { LayerOf } from '../../../model/types'
import type { Ctx2D, PaintEnv } from '../../shared/base/hand'
import { paintPlaneLight } from '../../shared/land/planeLight'
import type { OwnGround, PlaneTexelCtx } from '../../shared/land/planeTexel'
import { groundFormOf, type GroundForm } from './groundForm'

/* The land as the eye sees it: the ground's own patches and small form, raked by the sun or the moon where its beam falls. */

/** How hard the light rakes the form, the height of a lamp it eases at; the visibility a grazed slope is read against; the least and most of a beam. */
const RAKE = 1.5, HIGH = 0.35, GRAZED = 0.16, LEAST = 0.4, MOST = 1.8
/** How far daylight opens the land's colour, none by night. */
const CHROMA = 0.12
/** How far the sun's reach on a hillside is drawn apart from the plane's mean, so its slopes read lit and shaded. */
const APART = 1.8
/** A texel (px) of each plane: finer near, where its marks are seen. */
export const TEXELS: Record<LayerOf<'plane'>['plane'], number> = { back: 3, far: 2, near: 1.5 }

export function paintRealPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  paintPlaneLight(ctx, desc, env, (t) => lit(t, groundFormOf(t, desc), desc.lamp), TEXELS[desc.plane])
}

/** The mean sun on the plane's lit ground, from the light's own grid. */
function meanSun({ grid }: PlaneTexelCtx['litField']): number {
  let sum = 0, seen = 0
  for (let o = 0; o < grid.length; o += 4) if (grid[o]) { sum += grid[o]; seen++ }
  return seen ? sum / seen / 255 : 0
}

function lit(t: PlaneTexelCtx, { rho, form }: GroundForm, lamp?: Lamp): OwnGround {
  const [across, away] = toward(t, lamp), moon = lamp?.body === 'moon', mean = meanSun(t.litField)
  const day = Math.min(1, t.litField.eSun[1]), chroma = 1 + CHROMA * day
  return {
    rho: (n, out) => {
      const r = rho[n * 3], g = rho[n * 3 + 1], b = rho[n * 3 + 2], y = 0.2126 * r + 0.7152 * g + 0.0722 * b
      out[0] = Math.max(0, y + (r - y) * chroma)
      out[1] = Math.max(0, y + (g - y) * chroma)
      out[2] = Math.max(0, y + (b - y) * chroma)
    },
    turn: (n, i, s) => {
      s.vSky *= form[n * 3 + 2]
      // Where the sun comes, its hillsides apart: the far side of the mean darker, the near side brighter.
      if (s.sVis > 0) s.sVis = Math.min(1, Math.max(0.25 * s.sVis, mean + (s.sVis - mean) * APART))
      const slope = form[n * 3] * across[i] + form[n * 3 + 1] * away[i]
      if (!moon) return raked(s.sVis, slope)
      s.mVis *= raked(s.mVis, slope)
      return 1
    },
  }
}

/** The factor of a beam on a small slope of a ground that meets it with this visibility: nothing where it does not come. */
function raked(vis: number, slope: number): number {
  return vis ? Math.min(1 / vis, MOST, Math.max(LEAST, 1 + slope / (vis + GRAZED))) : 1
}

/** The lamp's direction at each column, across and away from the eye, harder the lower it stands. */
function toward(t: PlaneTexelCtx, lamp?: Lamp): [Float32Array, Float32Array] {
  const across = new Float32Array(t.wPx), away = new Float32Array(t.wPx)
  if (!lamp) return [across, away]
  const alt = Math.max(0, lamp.altitude) * Math.PI / 180, hard = RAKE * Math.cos(alt) / (Math.sin(alt) + HIGH)
  for (let i = 0; i < t.wPx; i++) {
    const turned = (lamp.x - t.bounds.x - (i + 0.5) * t.texel) / t.bounds.w * spanDeg() * Math.PI / 180
    across[i] = hard * Math.sin(turned)
    away[i] = hard * Math.cos(turned)
  }
  return [across, away]
}
