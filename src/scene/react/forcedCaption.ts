import { devParam } from '../../ui/devParams'
import { CAPTION_OPTIONS, type CaptionOption } from '../../world/caption/types'

/** `?label=a|b|c` shows the place's height by one of the design options (dev only). */
export function forcedCaption(): CaptionOption | null {
  const asked = devParam('label')
  return CAPTION_OPTIONS.find(option => option === asked) ?? null
}
