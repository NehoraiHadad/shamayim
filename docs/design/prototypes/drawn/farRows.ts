import { rng } from '../../../../src/scene/paint/shared/base/core'
import { fieldAt, type SheetField } from '../../../../src/scene/paint/drawn/sheetField'

/*
 * The far part of a broken sheet, seen edge on: the model's alpha gathered into rows that close up toward the horizon, each
 * cloud a low arch over a flat foot, as tall as its row is thick there. Pure: the field and the seed.
 */

/** A row's height against the model's row spacing, its least (px), and how far an arch stands past its row. */
const TALL = 3, LEAST = 8, OVER = 1.15
/** The alpha a row's cloud begins at, and the foot's own slow slant against the height. */
const FROM = 0.42, SLANT = 0.22, WAVE = 46

export interface Place { edge: number; side: number }

/** What stands at (x, y) px in the field: over 0 inside a cloud, and its place in it. */
export function farRows(f: SheetField, alpha: ArrayLike<number>, seed: number): (x: number, y: number) => Place {
  const rows: { foot: number; tall: number; at: Float32Array; turn: number }[] = []
  const colPx = f.width / (f.cols - 1), rowPx = f.height / (f.rows - 1)
  for (let foot = f.height; foot > 0;) {
    const tall = Math.max(LEAST, TALL * f.spacing[Math.max(0, Math.round(foot / rowPx))]), at = new Float32Array(f.cols)
    for (let i = 0; i < f.cols; i++) {
      for (let k = 0; k < 4; k++) at[i] += fieldAt(alpha as Float32Array, f.cols, f.rows, i, Math.max(0, foot - (k + 0.5) * tall / 4) / rowPx) / 4
    }
    rows.push({ foot, tall, at, turn: rng(seed + rows.length * 131)() * 6.28 })
    foot -= tall
  }
  return (x, y) => {
    let edge = -9, side = 0
    for (const r of rows) {
      const foot = r.foot + SLANT * r.tall * Math.sin(x / WAVE + r.turn)
      if (y > foot + 1 || y < foot - OVER * r.tall - 1) continue
      const gx = x / colPx, i = Math.min(f.cols - 2, Math.floor(gx)), a = r.at[i] + (r.at[i + 1] - r.at[i]) * (gx - i)
      const high = OVER * r.tall * Math.sqrt(Math.max(0, a - FROM) / (1 - FROM)), up = foot - y
      const e = Math.min(high - up, up + 0.4 * r.tall * (high > 1 ? 0.2 : 0)) / r.tall - (high < 1.2 ? 0.4 : 0)
      if (e > edge) { edge = e; side = high > 0.1 ? Math.max(-1, Math.min(1, 2 * (up / high) - 1)) : 0 }
    }
    return { edge, side }
  }
}
