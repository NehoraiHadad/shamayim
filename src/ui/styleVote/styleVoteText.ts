import { VOTE_NAMES, type VoteStyle } from '../../data/styleVoteRound'
import type { LocalTime } from '../../domain/types'
import type { SceneStyle } from '../../scene/paint/painters'

/** Keyed by the scene's styles: a style added there without a vote fails the type check here. */
export const STYLE_NAMES: Record<SceneStyle, string> = VOTE_NAMES

/** Forwarded to the owner, whose own address stays out of the code. */
const MAILBOX = 'sky@nehoraihadad.com'

export const TITLE = 'סגנון התצוגה'
export const VOTE = 'הסגנון הזה עדיף בעיניי'
export const WRITE = `כתבו לי: ${MAILBOX}`
export const SEE_OTHER = 'הציגו גם את הסגנון השני, ואז בחרו.'
export const THANKS = 'תודה! אפשר לשנות בכל עת.'
export const PENDING = 'תודה! הבחירה נשמרה ותישלח בהמשך.'
/** Read after the preferred style's name. */
export const PREFERRED = ', הבחירה שלכם'
export const CLOSE = 'סגירה'

const SUBJECT = 'סגנון התצוגה באפליקציית שמיים'

/** A prefilled mail. Where no mail app opens, the link's own text shows the address. */
export function mailUrl({ vote, style, placeName, at }: {
  vote: VoteStyle | null
  style: VoteStyle
  placeName: string
  at: LocalTime
}): string {
  const [, month, day] = at.slice(0, 10).split('-').map(Number)
  const body = [
    'היי, ניסיתי את סגנונות התצוגה באפליקציית שמיים.',
    vote ? `הסגנון המועדף עליי: ${STYLE_NAMES[vote]}.` : `עוד לא בחרתי. מוצג לי הסגנון: ${STYLE_NAMES[style]}.`,
    `מה שראיתי: ${placeName}, ${day}.${month} בשעה ${at.slice(11, 16)}.`,
    'ההתרשמות שלי: ',
  ].join('\r\n')
  return `mailto:${MAILBOX}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`
}
