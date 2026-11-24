// Records the horizon panorama of each scene test place from the live DEM tiles, in the app's stored form.
// Usage: npx tsx scripts/fixtures/recordPanoramas.ts [id ...]   (writes src/test/fixtures/scene/<id>.panorama.json; all
// baseline places, or only the ones named, which may also be a skyline-study or still place)
import fs from 'node:fs'
import { fetchPanorama } from '../../src/data/terrain/fetchPanorama'
import { packPanorama } from '../../src/data/terrain/panorama'
import { BELOW_SEA_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES, VILLAGE_PLACES } from '../../src/test/scenePlaces'

const only = process.argv.slice(2)
const all = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...BELOW_SEA_PLACES, ...VILLAGE_PLACES]
const places = only.length ? all.filter((p) => only.includes(p.id)) : SCENE_PLACES
for (const place of places) {
  const panorama = await fetchPanorama(place)
  fs.writeFileSync(`src/test/fixtures/scene/${place.id}.panorama.json`, JSON.stringify(packPanorama(panorama)))
  console.log(place.id, Math.round(panorama.groundM), 'm')
}
