import type { Shine, Tones, TreeDesc } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'

/* A tree of the town, cut: a cypress flame of two halves, a palm's broad fronds, or a scalloped crown with one lit cap. */

export function cutTree(ctx: Ctx2D, tr: TreeDesc, t: Tones, s: Shine, l: number, rock: number) {
  const r = rng(tr.seed), { w, h } = tr, lean = s.lean * (0.6 + 0.4 * r()) + (s.sway ?? 0) * rock * (0.7 + 0.3 * Math.sin(tr.seed))
  const side = l < 0 ? 1 : -1, body = mix(t.green, t.deep, 0.25)
  ctx.save()
  ctx.translate(tr.x, tr.base)
  ctx.transform(1, 0, -lean, 1, 0, 0)
  ctx.fillStyle = css(body)
  ctx.beginPath()
  if (tr.kind === 'cypress') {
    ctx.moveTo(0, -h); ctx.quadraticCurveTo(w * 0.62, -h * 0.45, 0.35, 0); ctx.lineTo(-0.35, 0); ctx.quadraticCurveTo(-w * 0.62, -h * 0.45, 0, -h)
    ctx.fill()
    ctx.fillStyle = css(mix(t.green, t.greenLit, 0.35 + 0.5 * Math.abs(l)))
    ctx.beginPath()
    ctx.moveTo(0, -h); ctx.quadraticCurveTo(-side * -w * 0.62, -h * 0.45, side * 0.35, 0); ctx.lineTo(0, 0)
    ctx.fill()
  } else if (tr.kind === 'palm') {
    ctx.fillStyle = css(mix(t.wall, t.deep, 0.4))
    ctx.fillRect(-0.4, -h + 1, 0.8, h - 1)
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55, len = w * (0.5 + 0.12 * r())
      ctx.fillStyle = css(i === 2 || i === 3 ? t.greenLit : mix(t.green, t.deep, i % 2 ? 0.25 : 0))
      ctx.beginPath()
      ctx.moveTo(0, -h + 1)
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.6, -h + Math.sin(a) * len * 0.6, Math.cos(a) * len, -h + 2.4 + Math.sin(a) * len)
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.5, -h + 2 + Math.sin(a) * len * 0.4, 0, -h + 1)
      ctx.fill()
    }
  } else {
    const k = w / 2, lobe = tr.seed % 2 ? 1 : -1
    const crown = (dx: number, dy: number, by: number) => {
      ctx.beginPath()
      for (const [x, y, q] of [[0, -k * 1.1, 0.86], [lobe * k * 0.72, -k * 0.72, 0.6], [-lobe * k * 0.7, -k * 0.66, 0.56]]) {
        ctx.moveTo(x + dx + k * q * by, y + dy)
        ctx.arc(x * (by < 1 ? 0.75 : 1) + dx, y + dy, k * q * by, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    crown(0, 0, 1)
    ctx.fillStyle = css(mix(t.green, t.greenLit, 0.45 + 0.5 * Math.abs(l)))
    crown(side * k * 0.18, -k * 0.28, 0.62)
  }
  ctx.restore()
}
