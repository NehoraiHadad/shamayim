// The scene runners' moment syntax and the stills' file names (`scene.stills.mjs`, `styleIdentity.mjs`):
//   <place>@<HH:MM | YYYY-MM-DDTHH:MM>[@<weather>[@<phase s | flash>[@<land>[@<hide ids,…>]]]][#<style>]
import { caseName, DEFAULT_DAY } from './harness.mjs'

export function parseMoment(text) {
  const [shown, style = ''] = text.split('#')
  const [place, hour, weather = '', phase = '0', land = '', hide = ''] = shown.split('@')
  return { place, hour, at: hour.includes('T') ? hour : `${DEFAULT_DAY}T${hour}`, weather, phase, land, hide, style }
}

/** The moment's still name without its extension (`note`: what else tells it apart), safe as a file name. */
export function momentName({ place, hour, at, weather, phase, land, hide, style }, note = '') {
  const day = hour.includes('T') ? `${hour.slice(5, 10).replace('-', '')}-` : ''
  const name = `${day}${caseName({ place, at, weather, land, phase })}${phase !== '0' && !land ? `-${phase}` : ''}` +
    `${hide ? `-no-${hide.replace(/,/g, '+')}` : ''}${note}${style ? `-${style}` : ''}`
  return name.replace(/[<>:"/\\|?*]/g, '-')
}

/** The moments without their styles, each once, in the order given. */
export const momentsOnce = (texts) => [...new Set(texts.map((text) => text.split('#')[0]))]
