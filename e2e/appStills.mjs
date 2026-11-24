import path from 'node:path'
import { openAppPage } from './appPage.mjs'
import { root } from './harness.mjs'
import { momentName } from './moments.mjs'
import { resolvedStyle } from './sceneHand.mjs'
import { STILL_OPTIONS, waitForSky } from './skyShown.mjs'

export async function shootAppStill(browser, base, out, moment, dpr) {
  const { place, at, weather, style } = moment
  const drawn = style === 'app-drawn'
  const { context, page } = await openAppPage(browser, base, {
    id: place, at, dpr, fixtureWeather: weather || undefined, style: drawn ? 'drawn' : undefined,
  })
  try {
    if (!await waitForSky(page)) throw new Error(`App sky did not settle for ${place} at ${at}`)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    if (drawn) {
      const shown = await resolvedStyle(page)
      if (shown && shown !== 'drawn') throw new Error(`Drawn app still requested, but the app showed "${shown}"`)
    }
    const special = page.locator('[data-special-line][data-open="true"]')
    const line = await special.allTextContents()
    const name = `app-${momentName({ ...moment, style: drawn ? 'drawn' : '' })}`
    console.log(`${name} special event: ${line[0]?.trim() || 'none'}`)
    const file = path.join(out, `${name}.png`)
    await page.screenshot({ ...STILL_OPTIONS, path: file, fullPage: true })
    console.log('saved', path.relative(root, file))
  } finally {
    await context.close()
  }
}
