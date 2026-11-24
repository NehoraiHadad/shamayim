/** Mosque geometry is settlement evidence. Named site icons have their own glyphs. */
export const isDrawableMark = (mark: { kind: string }) => !/minaret|mosque|masjid/i.test(mark.kind)
