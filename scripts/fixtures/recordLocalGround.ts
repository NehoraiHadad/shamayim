// Adds the local ground grid (`LocalGround`, stage C5: the place seen from outside lifts its rows by the ground under
// them) to the recorded panorama fixtures, leaving their rays and profiles exactly as recorded.
// Usage: npx tsx scripts/fixtures/recordLocalGround.ts [id ...]   (every fixture in src/test/fixtures/scene, or those named)
import fs from 'node:fs'
import { inRift } from '../../src/data/terrain/fetchPanorama'
import { fetchDem } from '../../src/data/terrain/dem'
import { localGround, LOCAL_REACH_KM, type StoredPanorama } from '../../src/data/terrain/panorama'
import { SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../../src/test/scenePlaces'

const only = process.argv.slice(2)
const dir = 'src/test/fixtures/scene'
for (const place of [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES]) {
  const file = `${dir}/${place.id}.panorama.json`
  if ((only.length && !only.includes(place.id)) || !fs.existsSync(file)) continue
  const dem = await fetchDem(place.lat, place.lon, LOCAL_REACH_KM + 1, 10)
  const local = localGround(place, (lat, lon) => {
    const height = dem.height(lat, lon)
    return height < 0 && !inRift(lat, lon) ? 0 : height
  })
  const stored = JSON.parse(fs.readFileSync(file, 'utf8')) as StoredPanorama
  fs.writeFileSync(file, JSON.stringify({ ...stored, g: [local.stepKm, local.n, ...local.heights] }))
  console.log(place.id, local.n, 'x', local.n, Math.min(...local.heights), '…', Math.max(...local.heights), 'm')
}
