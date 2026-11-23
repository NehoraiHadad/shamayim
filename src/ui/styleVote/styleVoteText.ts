import type { LocalTime } from '../../domain/types'
import type { SceneStyle } from '../../scene/sceneStyle'

export const STYLE_NAMES: Record<SceneStyle, string> = { real: 'מציאותי', drawn: 'מאויר' }

export const TITLE = 'סגנון התצוגה'
export const VOTE = 'זה הסגנון שאני מעדיף'
export const WHATSAPP = 'ספרו לי בוואטסאפ'
export const SEE_OTHER = 'כדי לבחור מה עדיף, הציגו גם את הסגנון השני.'
export const THANKS = 'תודה, ההעדפה נשמרה. אפשר לשנות אותה בכל עת.'

/** A prefilled WhatsApp message; the person picks whom to send it to. */
export function whatsappUrl({ vote, style, placeName, at }: {
  vote: SceneStyle | null
  style: SceneStyle
  placeName: string
  at: LocalTime
}): string {
  const [, month, day] = at.slice(0, 10).split('-').map(Number)
  const text = [
    'היי, ניסיתי את סגנונות התצוגה באפליקציית שמיים.',
    vote ? `הסגנון שאני מעדיף: ${STYLE_NAMES[vote]}.` : `עוד לא בחרתי. מוצג לי הסגנון: ${STYLE_NAMES[style]}.`,
    `מה שראיתי: ${placeName}, ${day}.${month} בשעה ${at.slice(11, 16)}.`,
    'ההתרשמות שלי: ',
  ].join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
