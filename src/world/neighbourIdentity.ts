type SourceIdentity = { named: boolean; sightKm?: number; seatBlockId?: string }
type GlyphIdentity = { famous: boolean; nonOwn?: boolean }

/** Angular projection or a receiving-town seat proves that a source is non-own. */
export const isNonOwnMark = (mark: Omit<SourceIdentity, 'named'>) =>
  mark.sightKm !== undefined || mark.seatBlockId !== undefined

/** One famous-neighbour identity before and after the source is projected into a glyph descriptor. */
export const isFamousNonOwn = (mark: SourceIdentity | GlyphIdentity) =>
  'named' in mark ? mark.named && isNonOwnMark(mark) : mark.famous && mark.nonOwn === true
