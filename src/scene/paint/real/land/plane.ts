import { spanDeg } from '../../../../domain/camera'
import { TEXEL } from '../../../model/planeBands'
import type { Lamp } from '../../../model/layers/lamp'
import type { LayerOf } from '../../../model/types'
import type { Ctx2D, PaintEnv } from '../../shared/base/hand'
import { paintPlaneLight } from '../../shared/land/planeLight'
import type { OwnGround, PlaneTexelCtx } from '../../shared/land/planeTexel'
import { groundFormOf, type GroundForm } from './groundForm'
import { paintSpecks } from './specks'

/* The land as the eye sees it: the ground's own patches and small form, raked by the sun or the moon where its beam falls. */

/** How hard the light rakes the form, the height of a lamp it eases at; the visibility a grazed slope is read against; the least and most of a beam. */
const RAKE = 1.5, HIGH = 0.35, GRAZED = 0.16, LEAST = 0.3, MOST = 1.8
/** How far daylight opens the land's mid tones and its colour, none by night. */
const OPENED = 0.16, CHROMA = 0.1

export function paintRealPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  let at: { t: PlaneTexelCtx; ground: GroundForm } | undefined
  paintPlaneLight(ctx, desc, env, {
    ground: (t) => {
      at = { t, ground: groundFormOf(t, desc) }
      return lit(t, at.ground, desc.lamp)
    },
    // The gullies are in the ground's form.
    marks: (brush) => at && paintSpecks(brush, at.t, at.ground.specks),
  })
}

function lit(t: PlaneTexelCtx, { rho, form }: GroundForm, lamp?: Lamp): OwnGround {
  const [across, away] = toward(t, lamp), moon = lamp?.body === 'moon'
  const day = Math.min(1, t.litField.eSun[1]), chroma = 1 + CHROMA * day
  return {
    rho: (n, out) => {
      const r = rho[n * 3], g = rho[n * 3 + 1], b = rho[n * 3 + 2], y = 0.2126 * r + 0.7152 * g + 0.0722 * b, k = 1 + OPENED * day * (1 - y)
      out[0] = Math.max(0, y + (r - y) * chroma) * k
      out[1] = Math.max(0, y + (g - y) * chroma) * k
      out[2] = Math.max(0, y + (b - y) * chroma) * k
    },
    turn: (n, i, s) => {
      s.vSky *= form[n * 3 + 2]
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
    const turned = (lamp.x - t.bounds.x - (i + 0.5) * TEXEL) / t.bounds.w * spanDeg() * Math.PI / 180
    across[i] = hard * Math.sin(turned)
    away[i] = hard * Math.cos(turned)
  }
  return [across, away]
}
