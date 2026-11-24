import { mix } from '../../base/hand'
import { arch, disc, Kit, poly, rect } from './kit'

/*
 * Worship halls, the water tower, the ruin and a far village (stage C4), in the scene's hand (kit.ts). Real references,
 * from the prototype's brief (docs/design/prototypes/canvas-scene/brief-glyphs.md): church — St Peter's (Jaffa),
 * Galilee village churches; synagogue — the Israeli town
 * synagogue of the 1950s–70s; water tower — the concrete "mushroom" of kibbutzim and towns (Givat Brenner, Ein Shemer);
 * castle — the Crusader ruins of Yehiam and Montfort; homes — a Galilee village's houses seen from across a valley.
 */
/** Church: gabled stone nave with a rose window and a tiled roof, a square tower with an arched belfry, cap and cross. */
export function church(k: Kit, h: number) {
  const { t } = k
  k.fill(poly([-6.5, 0, -6.5, -6, -4.6, -8.4, -2.7, -6, -2.7, 0]), k.stoneL)
  k.fill(rect(-2.7, -6, 5, 6), t.stone)
  k.fill(poly([-4.6, -8.4, 1.8, -8.4, 2.3, -6, -2.7, -6]), t.roof)
  k.eave(-2.7, -6, 5, .5)
  k.open(disc(-4.6, -5.6, 0.65), true, 0.7)
  k.open(arch(-5.15, 0, 1.1, 2.6), true, 0.55)
  for (const x of [-1.6, 0.5]) k.open(arch(x, -1.6, 0.8, 2.6), true, 0.75)
  const tt = -h + 3.1
  k.box(2, tt, 3.8, -tt, 1.3, { shadeW: 0.7, front: t.stone, sideC: t.stoneLit })
  k.rim(2, tt, 3.8)
  k.fill(rect(2, tt + 3.8, 3.8, 0.5), t.shade, 0.5)
  k.fill(rect(2, tt + 3.3, 3.8, 0.5), t.rim, 0.45)
  k.open(arch(3.45, tt + 3.1, 1.3, 2.4), true, 0.5)
  k.fill(rect(3.5, tt + 2, 1.2, 0.5), mix(t.deep, t.wall, 0.5), 0.8 - 0.5 * k.night)
  k.open(rect(3.85, -5.6, 0.5, 1.4), false)
  k.round(poly([1.8, tt, 6, tt, 3.9, tt - 1.7]), 1.8, 6)
  k.fill(rect(3.65, -h - 0.5, 0.5, 2.5), t.wall)
  k.fill(rect(3.2, -h + 0.1, 1.4, 0.5), t.wall)
}
/** Synagogue: a flat-roofed concrete hall with tall round-arched windows, a small dome on a drum and a stair block. */
export function synagogue(k: Kit) {
  const { t } = k
  k.box(3, -8.3, 2.5, 8.3, 0, { shadeW: 0.8 })
  k.rim(3, -8.3, 2.5, 0.6)
  k.box(-5.5, -7, 9, 7, 1.6, { shadeW: 0.6 })
  k.fill(rect(-5.5, -7.6, 9, 0.6), t.wall)
  k.fill(rect(-5.5, -7.6, 1.6, 0.6), k.litL)
  k.rim(-5.5, -7.6, 9)
  k.eave(-5.5, -7, 9, .5)
  k.round(rect(-2.2, -8.5, 2.8, 0.9), -2.2, 0.6)
  k.round((c) => {
    c.beginPath(); c.moveTo(-2.4, -8.5); c.bezierCurveTo(-2.4, -10.2, -1.6, -10.6, -0.8, -10.6)
    c.bezierCurveTo(0, -10.6, 0.8, -10.2, 0.8, -8.5); c.closePath()
  }, -2.4, 0.8)
  for (const x of [-3.4, -1.2, 1]) k.open(arch(x, -1.3, 1, 3.8), true, 0.8)
  k.fill(rect(-3.6, -1.3, 5.8, 0.5), t.rim, 0.35)
  k.open(rect(3.9, -1.8, 0.8, 1.8), true, 0.5)
}
/** Water tower: a tapering shaft, the flared cone underside in its own shadow, a cylindrical tank, roof and hatch. */
export function waterTower(k: Kit, h: number) {
  const { t } = k
  const s = h - 7.2
  k.round(poly([-1.5, 0, 1.5, 0, 1.15, -s, -1.15, -s]), -1.5, 1.5)
  k.open(rect(-0.45, -1.6, 0.9, 1.6), false)
  k.fill(rect(-1.4, -s * 0.5, 2.8, 0.4), t.shade, 0.3)
  k.fill(poly([-1.15, -s, 1.15, -s, 4.4, -s - 2.2, -4.4, -s - 2.2]), t.shade)
  k.fill(poly([-1.15, -s, -0.6, -s, -3.3, -s - 2.2, -4.4, -s - 2.2]), mix(t.shade, t.lit, 0.35 * k.kl))
  k.fill(poly([0.6, -s, 1.15, -s, 4.4, -s - 2.2, 3.3, -s - 2.2]), mix(t.shade, t.lit, 0.35 * k.kr))
  k.round(rect(-4.5, -s - 5.6, 9, 3.4), -4.5, 4.5)
  k.fill(rect(-4.5, -s - 3.9, 9, 0.5), t.shade, 0.55)
  k.fill(rect(-4.5, -s - 2.7, 9, 0.5), t.shade, 0.5)
  k.round(poly([-4.6, -s - 5.6, 4.6, -s - 5.6, 3.4, -s - 6.4, -3.4, -s - 6.4]), -4.6, 4.6)
  k.rim(-3.4, -s - 6.4, 6.8, 0.8)
  k.fill(rect(-0.6, -s - 7.2, 1.4, 0.8), t.wall)
  k.fill(rect(-0.6, -s - 7.2, 0.5, 0.8), k.litL)
  k.aviation(0.1, -s - 7.4)
}
/** Crusader ruin: an ashlar keep stub with arrow slits and a broken crown, a ragged curtain wall, a gate, fallen blocks. */
export function castle(k: Kit, h: number) {
  const { t, c } = k
  const keep = poly([-8, 0, -8, -8.6, -7.2, -8.6, -7.2, -9.4, -6.1, -9.4, -6.1, -h, -4.9, -h, -4.9, -8.9, -3.9, -9.5, -3.3, -8.4, -3.3, 0])
  k.fill(keep, t.stone)
  const keepLit = poly([-8, 0, -8, -8.6, -7.2, -8.6, -7.2, -9.4, -6.6, -9.4, -6.6, 0])
  k.fill(keepLit, k.stoneL)
  k.fill(rect(-3.9, -8.4, 0.6, 8.4), t.shade, 0.5)
  const wallPts = [-3.3, 0, -3.3, -5.8, -2.4, -5.8, -2.4, -6.4, -1.4, -6.4, -1.4, -5.6, -0.2, -5.9, 0.6, -5.1, 1.8, -5.4, 2.6, -4.3, 3.9, -4.6, 4.6, -3.2,
    5.6, -3.4, 6.2, -2, 7.2, -2.2, 7.6, -0.8, 8, 0]
  const wall = poly(wallPts)
  k.fill(wall, t.stone)
  // The ragged top catching the light: the top edge and a copy 0.5 px lower.
  const top = wallPts.slice(2, -2)
  const lower: number[] = []
  for (let i = top.length - 2; i >= 0; i -= 2) lower.push(top[i], top[i + 1] + 0.5)
  k.fill(poly([...top, ...lower]), t.rim, 0.55)
  // Ashlar courses, broken where the light hits.
  c.save()
  keep(c); c.clip()
  for (let y = -1.3, i = 0; y > -h; y -= 1.3, i++) k.fill(rect(-8.4 + (i % 2) * 0.6, y, 6, 0.3), t.shade, 0.13 - 0.07 * k.night)
  c.restore()
  c.save()
  wall(c); c.clip()
  for (let y = -1.3, i = 0; y > -h; y -= 1.3, i++) k.fill(rect(-3.4 + (i % 2) * 0.6, y, 12, 0.3), t.shade, 0.13 - 0.07 * k.night)
  c.restore()
  for (const y of [-7.3, -4.4]) k.open(rect(-5.3, y, 0.5, 1.4), false)
  k.open(arch(0.6, 0, 1.6, 2.8), false)
  k.fill(rect(5.6, -0.9, 1.1, 0.9), t.stone)
  k.fill(rect(5.6, -0.9, 0.4, 0.9), k.stoneL)
  k.fill(rect(7.1, -0.6, 0.8, 0.6), t.stone)
}
/** A far village: a few houses on a rise, lit faces toward the light, flat and tiled roofs, a window or two by night. */
export function homes(k: Kit, h: number) {
  const { t, r } = k
  const n = 4 + Math.floor(r() * 2)
  const scale = h / 8
  for (let i = 0; i < n; i++) {
    const w = (2.6 + r() * 1.6) * scale, hh = (2.6 + r() * 2.4) * scale
    const x = -6 + (12 - w) * (i / Math.max(1, n - 1)) + (r() - 0.5)
    const y = (i % 2 ? 0 : -0.6 * scale)
    k.box(x, y - hh, w, hh, Math.min(0.9, w * 0.3), { shadeW: Math.min(0.6, w * 0.2) })
    if (r() < 0.4) k.fill(poly([x - 0.3, y - hh, x + w * 0.5, y - hh - 1.4 * scale, x + w + 0.3, y - hh]), t.roof)
    else k.rim(x, y - hh, w, 0.6)
    if (r() < 0.7) k.open(rect(x + w * 0.45, y - hh * 0.6, 0.6, 0.7), true)
  }
}
