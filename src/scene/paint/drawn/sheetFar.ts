import { rng } from '../shared/base/core'
import { fieldAt, type SheetField } from './sheetField'

/*
 * The far part of a broken sheet, seen edge on: the model's alpha gathered into rows that close up toward the horizon, each
 * cloud a low arch over a flat foot, as tall as its row is thick there. Pure: the field and the seed.
 */

/** A cloud's light across its height, against a near one's: it is a low wall of it, not a top and a foot. */
const CALM = 0.55
/** A row's height against the model's row spacing, its least (px), and how far an arch stands past its row. */
const TALL = 5, LEAST = 13, OVER = 1.15
/** The alpha a row's cloud begins at, and the foot's own slow slant against the height, over this far (px). */
const FROM = 0.42, SLANT = 0.22, WAVE = 46
/** How deep a foot's edge is cut (of the row); what a row with next to no cloud is cut back, and under what height (px). */
const DEEP = 0.08, NONE = 0.4, LOW = 1.2

/** What stands at a place: over 0 inside a cloud, and its place in it (1 top … -1 foot). */
interface Place { edge: number; side: number }

/** The rows' clouds at (x, y) px in the field. */
export function farRows(f: SheetField, alpha: Float32Array, seed: number): (x: number, y: number) => Place {
  const rows: { foot: number; tall: number; at: Float32Array; turn: number }[] = []
  const colPx = f.width / (f.cols - 1), rowPx = f.height / (f.rows - 1)
  for (let foot = f.height; foot > 0;) {
    const tall = Math.max(LEAST, TALL * f.spacing[Math.min(f.rows - 1, Math.round(foot / rowPx))]), at = new Float32Array(f.cols)
    for (let i = 0; i < f.cols; i++) for (let k = 0; k < 4; k++) at[i] += fieldAt(alpha, f.cols, f.rows, i, Math.max(0, foot - ((k + 0.5) * tall) / 4) / rowPx) / 4
    rows.push({ foot, tall, at, turn: 2 * Math.PI * rng(seed + rows.length * 131)() })
    foot -= tall
  }
  return (x, y) => {
    let edge = -9, side = 0
    for (const r of rows) {
      const foot = r.foot + SLANT * r.tall * Math.sin(x / WAVE + r.turn)
      if (y > foot + 1 || y < foot - OVER * r.tall - 1) continue
      const gx = x / colPx, i = Math.min(f.cols - 2, Math.floor(gx)), a = r.at[i] + (r.at[i + 1] - r.at[i]) * (gx - i)
      const high = OVER * r.tall * Math.sqrt(Math.max(0, a - FROM) / (1 - FROM)), up = foot - y
      const e = Math.min(high - up, up + (high > 1 ? DEEP * r.tall : 0)) / r.tall - (high < LOW ? NONE : 0)
      if (e > edge) { edge = e; side = high > 0.1 ? CALM * Math.max(-1, Math.min(1, 2 * (up / high) - 1)) : 0 }
    }
    return { edge, side }
  }
}
