import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { hashId } from '../landmarks/hash'
import { groundFn } from '../landmarks/seat'
import { plainPaths } from '../../ui/scene/marks/city/plainPaths'
import { bearingOf, groundY, projectSight } from '../landmarks/project'
import { packPanorama } from '../terrain/panorama'
import { fetchPanorama, terrainFromPanorama } from '../terrain/terrain'
import { panoramaFarColumns } from './farData'
import { decodeFarRuns, type FarFile } from './farGrid'
import { plainLights } from './plainLights'

// Live AWS tiles are required. Ordinary test runs stay offline.
it.runIf(process.env.SHAMAYIM_REAL_DEM === '1')('reports coastal plain and Haifa Bay projections', async () => {
  const file = JSON.parse(readFileSync('public/data/city/il/far.json', 'utf8')) as FarFile
  const data = { grid: decodeFarRuns(file.r), towers: file.t }
  const scenes = [
    { id: 'karmei-tzur', lat: 31.6092, lon: 35.1009, cities: [
      ['Kiryat Gat', 31.609981, 34.764224],
      ['Ashkelon', 31.669256, 34.57149],
      ['Ashdod', 31.792133, 34.649656],
      ['Beit Shemesh', 31.73072, 34.99293],
    ] },
    { id: 'yagur', lat: 32.7414, lon: 35.0764, cities: [
      ['Haifa', 32.81303277, 34.99928252],
      ['Nesher', 32.766223, 35.04425],
      ['Kiryat Ata', 32.811493, 35.113229],
      ['Kiryat Bialik', 32.8275, 35.0858333],
      ['Kiryat Yam', 32.849657, 35.069727],
      ['Tirat Carmel', 32.76024661, 34.96874449],
      ['Kiryat Tivon', 32.71216668, 35.1250535],
    ] },
    { id: 'shadmot-mehola', lat: 32.3567, lon: 35.5139, cities: [] },
  ] as const
  for (const place of scenes) {
    console.log(place.id, 'map bearings', place.cities.map(([name, lat, lon]) => {
      const bearing = bearingOf(place, { lat, lon })
      return [name, bearing?.x.toFixed(2) ?? 'outside scene']
    }))
  }
  for (const place of scenes) {
    const panorama = await fetchPanorama(place)
    const terrain = terrainFromPanorama(panorama)
    const { patches = [] } = panoramaFarColumns(place, 375, data, terrain.sightAt!, terrain)
    const seed = hashId(place.id)
    const day = plainPaths(patches, [], seed, false, 50)
    const night = plainPaths(patches, [], seed, true, 50)
    const near = groundFn(terrain.nearPoints, 375), far = groundFn(terrain.farPoints, 375)
    for (const { left, right, top, bottom } of patches) {
      expect(top + 1e-8).toBeGreaterThanOrEqual(Math.max(far(left), far(right)))
      expect(bottom - 1e-8).toBeLessThanOrEqual(Math.min(near(left), near(right)))
    }
    const bytes = Buffer.byteLength(JSON.stringify(packPanorama(panorama)))
    console.log(place.id, { eyeM: panorama.eyeM, horizonY: terrain.horizonY, bytes, patches: patches.length,
      dayPaths: day.length, nightPaths: night.length,
      visibleDots: night.reduce((n, band) => n + (band.d.match(/M/g)?.length ?? 0), 0),
      generatedDots: plainLights(patches, seed).length })
    console.table(place.cities.map(([name, lat, lon]) => {
      const target = { lat, lon }
      const bearing = bearingOf(place, target)
      const point = projectSight(place, target, terrain.sightAt!)
      const layer = point?.layer ?? (bearing ? 'hidden' : 'outside scene')
      const y = point?.layer === 'plain' ? point.y : point && groundY(
        (point.layer === 'near' ? terrain.nearPoints : terrain.farPoints).map(([x, y]) => ({ x, y })), point.x)
      return { name, layer, km: bearing?.km.toFixed(2), x: bearing?.x.toFixed(2), y: y?.toFixed(2) }
    }))
    expect(bytes).toBeLessThan(60_000)
  }
}, 30_000)
