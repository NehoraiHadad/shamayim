import { ltr } from './isolate'

/** "951 מ׳ מעל פני הים"; a depth is told by its word, never by a minus. */
function heightText(elevation: number): string {
  const m = Math.round(elevation)
  return m === 0 ? 'בגובה פני הים' : `${ltr(String(Math.abs(m)))} מ׳ ${m > 0 ? 'מעל פני' : 'מתחת לפני'} הים`
}

/** A body's name as the line says it: a name of one word takes the article ("הים", "הכנרת"), "ים המלח" has its own. */
const waterText = (name: string) => name.includes(' ') || name.startsWith('ה') ? name : `ה${name}`

const listText = (parts: string[]) => parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ו${parts.at(-1)}` : parts.join('')

/**
 * The line about the scene: the place, its height over or under the sea, and the waters drawn in the picture
 * ("נווה זוהר, 374 מ׳ מתחת לפני הים · בתמונה: ים המלח"). A fact that is missing is not told; null with none.
 */
export function sceneFacts(place: string, elevation: number | null | undefined, waters: readonly string[]): string | null {
  const known = elevation !== null && elevation !== undefined && Number.isFinite(elevation)
  if (!known && !waters.length) return null
  const shown = waters.length ? ` · בתמונה: ${listText(waters.map(waterText))}` : ''
  return `${place}${known ? `, ${heightText(elevation)}` : ''}${shown}`
}
