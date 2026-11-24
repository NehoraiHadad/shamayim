import type { MarkKind } from './types'

export type DrawableMarkKind = Exclude<MarkKind, 'minaret'>

/** Minaret rows are retained in the landmark data and excluded from drawing. */
export const isDrawableMark = <T extends { kind: MarkKind }>(
  mark: T,
): mark is T & { kind: DrawableMarkKind } => mark.kind !== 'minaret'
