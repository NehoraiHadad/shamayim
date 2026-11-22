import type { WorldMark } from '../../world/markGeometry'
import { massAt, type DrawnMass } from './markOcclusion'

/** Both receiving layers test feet against every retained nearer glyph at its final slid position. */
export function nearestMarks<T extends { mark: WorldMark; x: number }>(candidates: readonly WorldMark[],
  foreground: readonly DrawnMass[], evaluate: (mark: WorldMark, mass: DrawnMass[]) => T | null) {
  const mass = [...foreground], kept: T[] = []
  for (const source of [...candidates].sort((a, b) => a.km - b.km)) {
    const placed = evaluate(source, mass)
    if (!placed) continue
    kept.push(placed)
    const { mark, x } = placed
    mass.push(massAt(x, mark.w, mark.base - mark.h * mark.scale, source.km, `glyph:${source.id}`))
  }
  return { kept, mass }
}
