// Prints a few world fields for moments of the harness (a dev aid for the sky: covers, wind, bodies, light).
//   node e2e/scene.world.mjs <place>@<HH:MM>[@<weather>] …
import { launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const moments = process.argv.slice(2)
const server = await startServer()
const browser = await launch()
try {
  for (const moment of moments) {
    const [place, hour, weather = ''] = moment.split('@')
    const { context, page } = await openPage(browser, server.url, 1)
    await loadScene(page, sceneUrl(server.url, { place, at: `2026-11-17T${hour}`, weather }))
    const info = await page.evaluate(() => {
      const w = window.__world
      const r = (v) => Math.round(v * 100) / 100
      return {
        covers: w.clouds.map((l) => `${l.level} ${r(l.cover)} banks ${l.banks.length} drift ${r(l.drift)} under ${r(l.litUnderside)}${l.rains ? ' rains' : ''}`),
        sun: { alt: r(w.bodies.sun.altitude), az: r(w.bodies.sun.azimuth), x: r(w.bodies.sun.x), y: r(w.bodies.sun.y), up: w.bodies.sun.up },
        moon: { alt: r(w.bodies.moon.altitude), x: r(w.bodies.moon.x), y: r(w.bodies.moon.y), ill: r(w.bodies.moon.illumination) },
        light: { source: w.light.source, direct: r(w.light.direct) },
        wind: { from: w.wind.fromDeg, across: r(w.wind.across), aloft: w.wind.aloftAcross },
        night: w.night, rain: w.rain && { rate: w.rain.rateMmH, thunder: w.rain.thunder }, heat: w.air.heat, vis: w.air.visibilityKm,
      }
    })
    console.log(moment, JSON.stringify(info))
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
