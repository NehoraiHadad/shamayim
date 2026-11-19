// Records the horizon panorama of each scene test place from the live DEM tiles, in the app's stored form.
// Usage: npx tsx scripts/fixtures/recordPanoramas.ts   (writes src/test/fixtures/scene/<id>.panorama.json)
import fs from 'node:fs'
import { fetchPanorama } from '../../src/data/terrain/fetchPanorama'
import { packPanorama } from '../../src/data/terrain/panorama'
import { SCENE_PLACES } from '../../src/test/scenePlaces'

for (const place of SCENE_PLACES) {
  const panorama = await fetchPanorama(place)
  fs.writeFileSync(`src/test/fixtures/scene/${place.id}.panorama.json`, JSON.stringify(packPanorama(panorama)))
  console.log(place.id, Math.round(panorama.groundM), 'm')
}
