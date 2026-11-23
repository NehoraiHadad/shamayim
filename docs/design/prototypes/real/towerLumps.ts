import type { CloudSprite } from '../../../../src/scene/model/cloudSprite'
import { carriedAt, crownAt, halfAt, headsOf, type Head } from '../../../../src/scene/model/towerHeads'
import { seeded } from '../../../../src/data/landmarks/hash'
import { noiseAt, wispTile } from './cloudNoise'

/*
 * A tower as a heap of rounded heads: lumps packed inside the model's own outline (`towerHeads`), big in the body, small
 * on its edge, each a sphere the light can model; their joined surface gives every point its cover, its slope and how far
 * it lies in a crease. Sprite px, the origin at the middle of the near base edge, y down. Pure: the sprite alone.
 */

interface Lump { x: number; y: number; z: number; r: number; flat: number }

/** Lumps in a near tower and the least in a far one; their size against the column's half width, from big to small. */
const MANY = 190, FEW = 16
const BIG = 0.62, SMALL = 0.16
/** How far past the outline a lump's middle may stand, against its radius. */
const POKE = 0.35
/** How far the noise tears a lump's edge, against its radius. */
const TORN = 0.3
/** How flat the base is: lumps below it are cut by it over this depth (against the width). */
const FOOT = 0.06

export interface TowerSurface { w: number; h: number; x: number; y: number; k: number; cover: Float32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; high: Float32Array }

/** Raster px in a tower at most, and per sky px. */
const PX = 60_000, RASTER = 0.9

function lumpsOf(s: CloudSprite): Lump[] {
  const r = seeded(s.seed ^ 0x2c1b), heads = headsOf(s)
  const many = Math.round(FEW + (MANY - FEW) * Math.min(1, s.w * s.tall / 24_000))
  const weigh = heads.map((h) => h.half * h.tall), total = weigh.reduce((a, b) => a + b, 0)
  const lumps: Lump[] = []
  heads.forEach((h, n) => {
    spine(h, s, lumps)
    const count = Math.max(3, Math.round((many * weigh[n]) / total))
    for (let c = 0; c < count; c++) lumps.push(lumpIn(h, s, c / count, r))
  })
  return lumps
}

/** The column's own body under its heads: overlapping lumps up its axis, so it never parts. */
function spine(h: Head, s: CloudSprite, lumps: Lump[]) {
  for (let y = -0.2 * h.half; y > -h.tall;) {
    const half = halfAt(h, y) * Math.sqrt(Math.max(0.1, 1 - Math.min(1, crownAt(h, y)) ** 2))
    const tall = Math.min(half, 0.8 * h.half), at = Math.max(y, -h.tall + 0.95 * tall)
    lumps.push({ x: h.x + carriedAt(h, y, s.lean), y: at, z: -0.45 * half, r: half * 0.98, flat: tall / half })
    y -= 0.5 * tall
  }
}

function lumpIn(h: Head, s: CloudSprite, order: number, r: () => number): Lump {
  const size = BIG + (SMALL - BIG) * order ** 0.55
  const y = -h.tall * r() ** 0.85, half = halfAt(h, y)
  const within = half * Math.sqrt(Math.max(0.04, 1 - Math.min(1, crownAt(h, y)) ** 2))
  const radius = Math.min(within * 0.95, Math.max(1.2, size * Math.min(half, h.half) * (0.8 + 0.4 * r())))
  const room = Math.max(0, within - radius * (1 - POKE))
  const u = 2 * r() - 1, side = Math.sign(u) * Math.abs(u) ** (0.6 + 0.4 * order)
  const spread = h.anvil * Math.max(0, Math.min(1, (-y / h.tall - 0.6) / 0.3))
  return { x: h.x + carriedAt(h, y, s.lean) + side * room, y: Math.min(-radius * 0.3, Math.max(-h.tall + radius * 0.8, y)), r: radius,
    z: Math.sqrt(Math.max(0, 1 - side * side)) * room * (0.5 + 0.5 * r()) * (1 - 0.7 * spread), flat: 1 - 0.45 * spread }
}

export function towerSurface(s: CloudSprite): TowerSurface {
  const lumps = lumpsOf(s), wisp = wispTile(s.seed % 997)
  const pad = 0.12 * s.w + 2
  const x0 = Math.min(...lumps.map((l) => l.x - l.r)) - pad, x1 = Math.max(...lumps.map((l) => l.x + l.r)) + pad
  const y0 = Math.min(...lumps.map((l) => l.y - l.r)) - pad, y1 = Math.max(s.under * 0.6, FOOT * s.w) + 2
  const k = Math.min(RASTER, Math.sqrt(PX / ((x1 - x0) * (y1 - y0))))
  const w = Math.max(2, Math.ceil((x1 - x0) * k)), h = Math.max(2, Math.ceil((y1 - y0) * k)), size = w * h
  const out: TowerSurface = { w, h, x: x0, y: y0, k, cover: new Float32Array(size), nx: new Float32Array(size), ny: new Float32Array(size), nz: new Float32Array(size), high: new Float32Array(size) }
  const weight = new Float32Array(size), tile = 0.55 * s.w + 8
  for (const l of lumps) {
    const ry = l.r * l.flat
    const i0 = Math.max(0, Math.floor((l.x - l.r * 1.25 - x0) * k)), i1 = Math.min(w - 1, Math.ceil((l.x + l.r * 1.25 - x0) * k))
    const j0 = Math.max(0, Math.floor((l.y - ry * 1.25 - y0) * k)), j1 = Math.min(h - 1, Math.ceil((l.y + ry * 1.25 - y0) * k))
    for (let j = j0; j <= j1; j++) {
      const py = y0 + (j + 0.5) / k
      for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) / k, n = j * w + i
        const torn = noiseAt(wisp, px / tile + 0.3, py / tile) - 0.5 + 0.5 * (noiseAt(wisp, px * 3.1 / tile, py * 3.1 / tile) - 0.5)
        const dx = (px - l.x) / l.r, dy = (py - l.y) / ry
        const d = Math.hypot(dx, dy) + TORN * (torn + 0.25)
        if (d >= 1) continue
        const dome = Math.sqrt(1 - d * d), z = (l.z + l.r * dome) / s.w
        out.cover[n] = 1 - (1 - out.cover[n]) * (1 - Math.min(1, (1 - d) / 0.4) ** 1.5)
        // The surfaces join softly: the front lump leads, the ones behind it round into it.
        const lead = Math.exp(9 * z) * Math.min(1, (1 - d) / 0.25)
        weight[n] += lead
        out.nx[n] += lead * dx; out.ny[n] += lead * dy; out.nz[n] += lead * dome; out.high[n] += lead * z
      }
    }
  }
  for (let n = 0; n < size; n++) {
    if (!weight[n]) continue
    out.nx[n] /= weight[n]; out.ny[n] /= weight[n]; out.nz[n] /= weight[n]; out.high[n] /= weight[n]
  }
  return out
}
