import { smoothstep } from '../../world/ridgeLighting'
import type { BankDesc, LayerOf, RGB, Veil } from '../model/types'
import { rng } from './core'
import { css, mix, type Ctx2D, type PaintEnv, type Scratch } from './hand'

/**
 * MEDIUM: soft puff banks in the app's hand (after `prototypes/canvas-scene/styleRich.ts`): no outlines, washes only. Each
 * heap is a soft flat base with domes piled on it, highest near the middle; it is laid down whole on its own sheet (so the
 * domes merge into one mass, not a stack of discs), then modelled ON the mass (`source-atop`): the body falls into its own
 * shade away from the light and underneath, each dome catches the light at the limb that faces it (from below at a low
 * sun, warm), a bank by the sun gets a silver edge, a bank that rains a dark heavy base. The sheet is then laid on the sky
 * at the bank's own strength. A deck's sheets are long and flat, shaded from below; cirrus are combed strands.
 * ORDER: the deck's wash, then the banks as the model lists them (deck sheets, then banks back to front).
 *
 * The bank's place on the band (`x` in `0…period`) wraps: a bank near an end is drawn at both, so the band tiles as it
 * drifts. Seeded by the bank only: the same bank is the same shape at every hour.
 */
export function paintClouds(ctx: Ctx2D, desc: LayerOf<'clouds'>, env: PaintEnv): void {
  softly(ctx, desc.bounds, env, (c, e) => paintCloudsAt(c, desc, e))
}

/**
 * Device px per CSS px a soft wash is worked at: finer than the CSS pixel (no edge of a cloud is sharper than ~2 px), and
 * a quarter of the pixels at a phone's dpr 2.75, which is what a scrub frame's repaint of the clouds pays for.
 */
const SOFT_SCALE = 1

/**
 * Paints a soft layer at `SOFT_SCALE` on a scratch sheet and lays it into the layer's canvas (the plan's "soft layers at a
 * lower ratio", §1d, done inside the painter: the layer's cache stays at the device's ratio and is blitted 1:1).
 */
function softly(ctx: Ctx2D, bounds: { x: number; y: number; w: number; h: number }, env: PaintEnv, paint: (c: Ctx2D, e: PaintEnv) => void) {
  const k = Math.min(env.scale, SOFT_SCALE)
  if (k >= env.scale) { paint(ctx, env); return }
  const { x, y, w, h } = bounds
  const sheet = env.canvas(Math.ceil(w * k) + 1, Math.ceil(h * k) + 1)
  sheet.ctx.setTransform(k, 0, 0, k, -x * k, -y * k)
  paint(sheet.ctx, { ...env, scale: k })
  ctx.drawImage(sheet.canvas as CanvasImageSource, x, y, sheet.canvas.width / k, sheet.canvas.height / k)
}

/**
 * Two scratch sheets shared by every bank of one paint (a bank's mass, its rim), grown when a bank needs more, and the
 * puff: one soft disc (the body's profile, white), drawn once per paint and laid for every puff of every mass.
 */
interface Sheets { get(slot: 0 | 1, w: number, h: number): Scratch; puff: Scratch['canvas'] }

/** The puff's size (device px): larger than most puffs at a phone's ratio, so it is mostly laid smaller. */
const PUFF = 128

function sheetsOf(env: PaintEnv): Sheets {
  const held: (Scratch | null)[] = [null, null]
  const puff = env.canvas(PUFF, PUFF)
  body(puff.ctx, { x: PUFF / 2, y: PUFF / 2, rx: PUFF / 2, ry: PUFF / 2 }, [1, 1, 1], 1)
  return {
    puff: puff.canvas,
    get(slot, w, h) {
      let s = held[slot]
      if (!s || s.canvas.width < w || s.canvas.height < h) {
        s = env.canvas(Math.max(w, s?.canvas.width ?? 0), Math.max(h, s?.canvas.height ?? 0))
        held[slot] = s
      }
      s.ctx.setTransform(1, 0, 0, 1, 0, 0)
      s.ctx.globalCompositeOperation = 'source-over'
      s.ctx.globalAlpha = 1
      s.ctx.clearRect(0, 0, w, h)
      return s
    },
  }
}

function paintCloudsAt(ctx: Ctx2D, desc: LayerOf<'clouds'>, env: PaintEnv): void {
  if (desc.veil) paintVeil(ctx, desc.veil, desc.bounds)
  const sheets = sheetsOf(env)
  const P = desc.period
  for (const bank of desc.banks) {
    const reach = bank.w * 0.75
    for (const shift of [0, -P, P]) {
      const x = bank.x + shift
      if (x + reach < 0 || x - reach > P) continue
      paintBank(ctx, { ...bank, x }, env, sheets)
    }
  }
}

function paintVeil(ctx: Ctx2D, v: Veil, bounds: LayerOf<'clouds'>['bounds']) {
  const g = ctx.createLinearGradient(0, v.top, 0, v.bottom)
  g.addColorStop(0, css(v.rgb, v.alpha))
  g.addColorStop(0.7, css(v.rgb, v.alpha * 0.9))
  g.addColorStop(1, css(v.rgb, 0))
  ctx.fillStyle = g
  ctx.fillRect(bounds.x, v.top, bounds.w, v.bottom - v.top)
}

interface Puff { x: number; y: number; rx: number; ry: number }

/** A heap: a soft flat base, domes piled on it highest near the middle (cauliflower tops), lower domes in front. */
export function heapPuffs(b: BankDesc): Puff[] {
  const r = rng(b.seed)
  const base = b.y
  const out: Puff[] = [{ x: b.x, y: base - b.h * 0.2, rx: b.w * 0.48, ry: b.h * 0.22 }]
  const crown = (r() - 0.5) * 0.3
  for (let i = 0; i < b.puffs; i++) {
    const t = r()
    const dome = Math.max(0, Math.sin(t * Math.PI) * (1 - 1.4 * Math.abs(t - 0.5 - crown)) + 0.15)
    const rx = b.w * (0.07 + r() * 0.1) * (0.6 + dome * 0.8)
    const ry = Math.min(rx * (0.7 + r() * 0.25), b.h * 0.5)
    const lift = Math.min(1, dome) * (b.h - ry) * (0.3 + r() * 0.7)
    out.push({ x: b.x + (t - 0.5) * b.w * 0.82, y: base - ry * 0.8 - lift, rx, ry })
  }
  return out.sort((a, c) => (a.y + a.ry) - (c.y + c.ry))
}

/**
 * A sheet of a deck: clumps of uneven size strung along its length, some high, some low, a gap here and there, ragged
 * and thinning at both ends (stratocumulus and altocumulus, not a row of beads).
 */
function sheetPuffs(b: BankDesc): Puff[] {
  const r = rng(b.seed)
  const n = Math.max(3, b.puffs)
  const out: Puff[] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.15 + 0.7 * r()) / n
    const size = 0.45 + 1.15 * r() ** 1.6
    if (r() < 0.18 && i > 0 && i < n - 1) continue
    const end = Math.sin(t * Math.PI) ** 0.6
    const rx = (b.w / n) * (0.6 + 0.7 * size) * (0.45 + 0.55 * end)
    out.push({ x: b.x + (t - 0.5) * b.w, y: b.y - b.h * (0.25 + 0.5 * r()) * end, rx, ry: Math.min(rx * 0.8, b.h * (0.3 + 0.35 * size) * (0.55 + 0.45 * end)) })
  }
  return out.sort((a, c) => (a.y + a.ry) - (c.y + c.ry))
}

/** An ellipse filled with a radial wash centred at (cx, cy) of radius `reach` (surface px). */
function wash(ctx: Ctx2D, p: Puff, k: number, cx: number, cy: number, reach: number, rgb: RGB, alpha: number) {
  if (alpha < 0.01) return
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(1, p.ry / p.rx)
  const sy = p.rx / p.ry
  const g = ctx.createRadialGradient(cx - p.x, (cy - p.y) * sy, 0, cx - p.x, (cy - p.y) * sy, reach)
  g.addColorStop(0, css(rgb, alpha))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, p.rx * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A puff's body: solid in its core, soft at its edge. */
function body(ctx: Ctx2D, p: Puff, rgb: RGB, alpha: number) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(1, p.ry / p.rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.rx)
  g.addColorStop(0, css(rgb, alpha))
  g.addColorStop(0.6, css(rgb, alpha))
  g.addColorStop(0.84, css(rgb, alpha * 0.55))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, p.rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** The bank on its own sheet (device px, whole pixels), laid on the layer at its strength. */
function paintBank(ctx: Ctx2D, b: BankDesc, env: PaintEnv, sheets: Sheets) {
  if (b.kind === 'streak') { paintStreak(ctx, b); return }
  const puffs = b.kind === 'heap' ? heapPuffs(b) : sheetPuffs(b)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of puffs) {
    x0 = Math.min(x0, p.x - p.rx); x1 = Math.max(x1, p.x + p.rx); y0 = Math.min(y0, p.y - p.ry); y1 = Math.max(y1, p.y + p.ry)
  }
  const k = env.scale
  x0 = Math.floor(x0 * k) / k; y0 = Math.floor(y0 * k) / k
  const w = Math.ceil((x1 - x0) * k) + 1, h = Math.ceil((y1 - y0) * k) + 1
  const sheet = sheets.get(0, w, h)
  const c = sheet.ctx
  c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k)
  // The mass: the puff laid for each, then filled with the body's tone where it stands.
  for (const p of puffs) c.drawImage(sheets.puff as CanvasImageSource, p.x - p.rx, p.y - p.ry, 2 * p.rx, 2 * p.ry)
  c.globalCompositeOperation = 'source-in'
  c.fillStyle = css(b.body)
  c.fillRect(x0, y0, x1 - x0, y1 - y0)
  c.globalCompositeOperation = 'source-atop'
  const litBank = { ...b, litA: b.litA * smoothstep(0, 0.02, b.litA),
    silver: b.silver * smoothstep(0, 0.04, b.silver), under: b.under * smoothstep(0, 0.04, b.under) }
  modelBank(c, litBank, puffs, x0, y0, x1, y1)
  c.globalCompositeOperation = 'source-over'
  if (b.toward) rimLight(c, sheet.canvas, sheets, litBank, w, h, k)
  ctx.save()
  ctx.globalAlpha = b.alpha
  ctx.drawImage(sheet.canvas as CanvasImageSource, 0, 0, w, h, x0, y0, w / k, h / k)
  ctx.restore()
}

/** Shade, light, underside, rain and silver laid on the bank's mass (`source-atop`: nothing spills into the sky). */
function modelBank(c: Ctx2D, b: BankDesc, puffs: Puff[], x0: number, y0: number, x1: number, y1: number) {
  // Light from the source, or (no direct light) the sky from above: the shade gathers underneath.
  const [tx, ty] = b.toward ?? [0, -1]
  const heap = b.kind === 'heap'
  // The whole mass falls away from the light: a broad gradient across it, darkest on the far side and low down.
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.max(x1 - x0, y1 - y0) / 2
  const across = c.createLinearGradient(cx + tx * half, cy + ty * half, cx - tx * half, cy - ty * half)
  across.addColorStop(0, css(b.shade, 0))
  across.addColorStop(0.55, css(b.shade, 0.35))
  across.addColorStop(1, css(b.shade, heap ? 0.85 : 0.6))
  c.fillStyle = across
  c.fillRect(x0, y0, x1 - x0, y1 - y0)
  const under = c.createLinearGradient(0, y0, 0, y1)
  under.addColorStop(0, css(b.shade, 0))
  under.addColorStop(0.6, css(b.shade, heap ? 0.12 : 0.2))
  under.addColorStop(1, css(b.shade, heap ? 0.55 : 0.45))
  c.fillStyle = under
  c.fillRect(x0, y0, x1 - x0, y1 - y0)
  // Each dome: a breath of its own shade on the far side, so the mass reads as heaped, not flat.
  if (heap) for (const p of puffs.slice(1)) wash(c, p, 1, p.x - tx * p.rx * 0.7, p.y - ty * p.ry * 0.7, p.rx * 0.9, b.shade, 0.22)
  // The light inside the mass: a breath on each dome's side toward it (the rim is laid after, `rimLight`).
  if (heap && b.toward) {
    for (const p of puffs) wash(c, p, 1, p.x + tx * p.rx * 0.6, p.y + ty * p.ry * 0.6, p.rx * 0.8, b.lit, 0.3 * b.litA)
  }
  // A low sun lights the bank from below: a warm wash along the base.
  const baseLight = c.createLinearGradient(0, y1 - (y1 - y0) * 0.55, 0, y1)
  baseLight.addColorStop(0, css(b.lit, 0))
  baseLight.addColorStop(1, css(b.lit, Math.min(0.9, 0.8 * b.under)))
  c.fillStyle = baseLight
  c.fillRect(x0, y0, x1 - x0, y1 - y0)
  // Where it rains the base goes dark and heavy.
  if (b.rains) {
    const g = c.createLinearGradient(0, y0 + (y1 - y0) * 0.4, 0, y1)
    g.addColorStop(0, 'rgb(20 24 30 / 0)')
    g.addColorStop(1, css(mix(b.shade, [0.1, 0.12, 0.16], 0.5), 0.6))
    c.fillStyle = g
    c.fillRect(x0, y0, x1 - x0, y1 - y0)
  }
  // The silver lining: the thin edge of a bank by the sun, light scattered forward through it.
  if (b.toward) {
    for (const p of puffs) wash(c, p, 1, p.x + tx * p.rx * 0.95, p.y + ty * p.ry * 0.95, p.rx * 0.45, mix(b.lit, [1, 1, 1], 0.5), Math.min(1, b.silver))
  }
}

/**
 * The light on the bank's outline where it faces the source: the mass less itself moved away from the light leaves the
 * edge toward it, wide and faint, then narrow and bright, laid on the bank (`source-atop`). Only the outer silhouette
 * catches it, so the domes inside the mass do not each show a crescent.
 */
function rimLight(c: Ctx2D, mass: Scratch['canvas'], sheets: Sheets, b: BankDesc, w: number, h: number, k: number) {
  const [tx, ty] = b.toward!
  const d = Math.max(4, Math.min(b.w, b.h * 2)) * 0.12 * k
  const rim = sheets.get(1, w, h)
  const r = rim.ctx
  // The mass (its alpha is the bank's: the modelling went on atop) in the light's colour, less itself moved off the light.
  r.fillStyle = css(b.lit)
  r.fillRect(0, 0, w, h)
  r.globalCompositeOperation = 'destination-in'
  r.drawImage(mass as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
  r.globalCompositeOperation = 'destination-out'
  r.drawImage(mass as CanvasImageSource, 0, 0, w, h, -tx * d, -ty * d, w, h)
  c.save()
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'source-atop'
  // A deck's flat sheet catches less of it on its edge than a heaped bank does.
  // By the sun the edge is its silver lining: light come through the thin cloud from behind (C9), whatever lights its top.
  c.globalAlpha = Math.min(1, Math.max(b.litA * (b.kind === 'heap' ? 0.6 : 0.3), 0.85 * b.silver))
  c.drawImage(rim.canvas as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
  c.restore()
}

/** Cirrus: fine strands combed one way along the bank, tapering at both ends, lit toward the light. */
function paintStreak(ctx: Ctx2D, b: BankDesc) {
  const r = rng(b.seed)
  const tone = mix(b.body, b.lit, Math.min(0.85, b.litA) * smoothstep(0, 0.1, b.litA))
  const strands = 4 + 2 * Math.max(2, b.puffs)
  const slope = (r() - 0.5) * 0.12
  ctx.lineCap = 'round'
  for (let i = 0; i < strands; i++) {
    const len = b.w * (0.3 + 0.55 * r())
    const x0 = b.x - b.w / 2 + r() * (b.w - len)
    const y0 = b.y - b.h * 1.4 * r()
    const bow = (r() - 0.5) * b.h * 1.2
    const a = b.alpha * (0.25 + 0.6 * r())
    const g = ctx.createLinearGradient(x0, 0, x0 + len, 0)
    g.addColorStop(0, css(tone, 0))
    g.addColorStop(0.25 + 0.2 * r(), css(tone, a))
    g.addColorStop(0.8, css(tone, a * 0.6))
    g.addColorStop(1, css(tone, 0))
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.5, b.h * (0.12 + 0.3 * r()))
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + len / 2, y0 + bow + slope * len / 2, x0 + len, y0 + slope * len)
    ctx.stroke()
  }
}

/**
 * In-cloud lightning: the bank lit from within, brightest low in its core where the stroke is, the light spilling a
 * little into the air round it. Laid with the flash schedule's alpha (`anim.ts`), so the painter draws one still sprite.
 */
export function paintFlash(ctx: Ctx2D, desc: LayerOf<'flash'>, env: PaintEnv): void {
  softly(ctx, desc.bounds, env, (c) => paintFlashAt(c, desc))
}

function paintFlashAt(ctx: Ctx2D, desc: LayerOf<'flash'>): void {
  const b = desc.bank
  const r = rng(b.seed ^ 0x5eed)
  const cx = b.x + (r() - 0.5) * b.w * 0.4, cy = b.y - b.h * (0.25 + 0.3 * r())
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.w * 0.75)
  halo.addColorStop(0, css(desc.rgb, 0.35))
  halo.addColorStop(1, css(desc.rgb, 0))
  ctx.fillStyle = halo
  ctx.fillRect(cx - b.w * 0.75, cy - b.w * 0.75, b.w * 1.5, b.w * 1.5)
  for (const p of heapPuffs(b)) {
    const near = Math.exp(-Math.hypot(p.x - cx, p.y - cy) / (b.w * 0.35))
    body(ctx, p, desc.rgb, 0.2 + 0.6 * near)
  }
}

/** Heat shimmer: fine wavering lines of light across the tile, whole waves so the tile lays edge to edge. */
export function paintShimmer(ctx: Ctx2D, desc: LayerOf<'shimmer'>, _env: PaintEnv): void {
  const { x, y, w } = desc.bounds
  ctx.lineWidth = 0.7
  ctx.lineCap = 'round'
  for (const line of desc.lines) {
    ctx.strokeStyle = css(desc.rgb, line.alpha)
    ctx.beginPath()
    for (let i = 0; i <= w; i += 2) {
      const yy = y + line.y + line.amp * Math.sin((2 * Math.PI * line.waves * i) / w + line.phase)
      if (i === 0) ctx.moveTo(x + i, yy)
      else ctx.lineTo(x + i, yy)
    }
    ctx.stroke()
  }
}
