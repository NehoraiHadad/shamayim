import type { CloudSprite } from './cloudSprite'
import { cloudBodyPuffs } from '../model/cloudBodyPuffs'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * A tower (Cu con, Cg, Cb) in the sheets' soft hand (the owner's call, 22 Nov: soft and translucent, not cardboard). Two
 * steps on a scratch sheet, as the light lies on a mass and not on its parts: first the silhouette, soft puffs scattered up
 * a narrowing column (a cauliflower crown, a flat anvil on a mature Cb only), alpha only; then the colour laid once over all of it
 * (`source-in`): greyer at the base, the body above, the light's side lit, the crown silvered against a sun behind.
 * No outlines, no filter; seeded by the cell. Pure: the sprite, its place and the scratch surface from `env`.
 */

/** The column's top width against its base and a Cb anvil's spread. */
const TOP_WIDTH = 0.75, ANVIL = 1.3
/** Opacity of the thickest tower; optical depth over which a thin one comes up to it. */
const OPACITY = 0.92, TAU_FULL = 6

export function paintTower(c: Ctx2D, s: CloudSprite, x: number, y: number, env: PaintEnv): void {
  if (s.w < 0.5 || s.share <= 0.005 || s.tall < 0.5) return
  const alpha = OPACITY * (1 - Math.exp(-s.tau / TAU_FULL * 3)) * Math.min(1, s.share)
  const anvil = s.anvil ?? 0
  const spread = 0.8 + (ANVIL - 0.8) * anvil
  const box = { x: -s.w * spread, y: -s.tall - s.w * 0.25, w: s.w * spread * 2, h: s.tall + s.w * 0.25 + s.under + 2 }
  const k = env.scale
  const w = Math.max(1, Math.ceil(box.w * k)), h = Math.max(1, Math.ceil(box.h * k))
  const sheet = env.canvas(w, h)
  const sc = sheet.ctx
  sc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  silhouette(sc, s)
  colour(sc, s, box)
  c.save()
  c.globalAlpha *= alpha
  c.drawImage(sheet.canvas as CanvasImageSource, x + box.x, y + box.y, box.w, box.h)
  c.restore()
}

/**
 * The tower's alpha: puffs a third of the column wide filling it, over a flat soft base, and a rim of small turrets
 * with crisp edges round the crown (cauliflower: Cu con is sharp where it is still growing; only the anvil is soft).
 */
function silhouette(c: Ctx2D, s: CloudSprite) {
  const anvil = s.anvil ?? 0
  puff(c, 0, s.under * 0.3, s.w * 0.5, Math.max(1, s.under * 0.5 + s.w * 0.06), 0.9)
  const r = cloudBodyPuffs(s.seed, s.w, s.tall, anvil, (x, y, rx, ry, opacity) => puff(c, x, y, rx, ry, opacity))
  // The crown's turrets: small crisp puffs along the upper outline, over the top and down the upper sides.
  // The crown is a dome about as deep as half the tower is wide, whatever its height: a tall narrow tower keeps its
  // turrets at the top and never strings them down its column.
  const turrets = s.w < 16 ? 0 : Math.min(30, Math.round(8 + s.w / 8))
  for (let i = 0; i < turrets; i++) {
    const u = r() * 2 - 1, drop = (1 - Math.cos(u * Math.PI / 2)) * 0.5 * s.w
    const t = Math.max(0, 1 - drop / Math.max(1, s.tall))
    const flare = anvil * 0.9 * Math.max(0, (t - 0.55) / 0.45) ** 1.5
    const half = (s.w / 2) * (1 - (1 - TOP_WIDTH) * t + flare)
    const rx = s.w * (0.05 + 0.07 * r())
    // Inside the outline the body puffs fill, so a turret is a bump on the crown and never a bead beside it.
    puff(c, u * Math.max(0, half * 0.85 - rx * 1.2), drop - (s.tall - rx * 1.3), rx, rx * (0.85 + 0.15 * r()), 0.8, true)
  }
  if (anvil > 0.05) {
    // The anvil: a thick soft cap spread wider than the column as far as the top has spread, thinning toward its edges.
    const top = -s.tall + s.w * 0.2
    for (let i = 0; i < 5; i++) {
      const u = i / 4 - 0.5
      const rx = s.w * (0.35 + 0.1 * anvil - 0.2 * Math.abs(u))
      puff(c, u * s.w * (ANVIL - 0.5) * anvil, top + Math.abs(u) * s.w * 0.08, rx, rx * (0.55 + 0.1 * r()), 0.85 * anvil)
    }
  }
}

function puff(c: Ctx2D, cx: number, cy: number, rx: number, ry: number, a: number, crisp = false) {
  if (rx <= 0 || ry <= 0) return
  c.save()
  c.translate(cx, cy)
  c.scale(1, ry / rx)
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(crisp ? 0.75 : 0.5, `rgba(255,255,255,${a * (crisp ? 0.95 : 0.8)})`)
  g.addColorStop(crisp ? 0.92 : 0.8, `rgba(255,255,255,${a * (crisp ? 0.6 : 0.3)})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.beginPath()
  c.arc(0, 0, rx, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

/** The colour, once over the whole mass: base to body up the column, then the light's side, then the silver crown. */
function colour(c: Ctx2D, s: CloudSprite, box: { x: number; y: number; w: number; h: number }) {
  const under = mix(s.shade, s.lit, 0.6 * s.glow)
  c.globalCompositeOperation = 'source-in'
  const up = c.createLinearGradient(0, s.under, 0, -s.tall)
  up.addColorStop(0, css(under))
  // The lower column stands in the shade of the tower above it: the base's dark climbs a third of the way up.
  up.addColorStop(0.2, css(mix(under, s.body, 0.4)))
  up.addColorStop(0.55, css(s.body))
  up.addColorStop(1, css(s.body))
  c.fillStyle = up
  c.fillRect(box.x, box.y, box.w, box.h)
  c.globalCompositeOperation = 'source-atop'
  const [tx, ty] = s.toward ?? [0, -1]
  if (s.litA > 0.02) {
    const reach = Math.max(s.w, s.tall) * 0.6, mid = -s.tall * 0.55
    const side = c.createLinearGradient(-tx * reach, mid - ty * reach, tx * reach, mid + ty * reach)
    side.addColorStop(0, css(s.lit, 0))
    side.addColorStop(0.55, css(s.lit, 0.25 * s.litA))
    side.addColorStop(1, css(s.lit, 0.85 * Math.min(1, s.litA)))
    c.fillStyle = side
    c.fillRect(box.x, box.y, box.w, box.h)
  }
  // The sun lights the side, not the underside: the base stays in its own shade, darkest at the bottom.
  const shadow = c.createLinearGradient(0, s.under, 0, -0.3 * s.tall)
  shadow.addColorStop(0, css(under, 0.9))
  shadow.addColorStop(0.4, css(under, 0.45))
  shadow.addColorStop(1, css(under, 0))
  c.fillStyle = shadow
  c.fillRect(box.x, box.y, box.w, box.h)
  if (s.silver > 0.05) {
    const cx = tx * s.w * 0.3, cy = -s.tall * 0.85
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, s.w * 0.6)
    g.addColorStop(0, css(s.lit, 0.6 * s.silver))
    g.addColorStop(1, css(s.lit, 0))
    c.fillStyle = g
    c.fillRect(box.x, box.y, box.w, box.h)
  }
  c.globalCompositeOperation = 'source-over'
}
