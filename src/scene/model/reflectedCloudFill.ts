import { transmitAlong } from '../../world/field/transmit'
import type { CloudLevel, RGB, WorldState } from '../../world/types'
import { lightOn } from './cloudLight'
import { SHEET_TONE_ALTITUDE, sheetLitTone, sheetTones } from './cloudSheetLight'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { twilightShare } from './landSkyIrradiance'
import { reflectionSkyBox } from './reflectedSkyLobe'
import { coversOf, skyGeom, skyStops } from './sky'

const levels: readonly CloudLevel[] = ['low', 'mid', 'high']
const memo = new WeakMap<WorldState, RGB | undefined>()

export function reflectedCloudFill(world: WorldState): RGB | undefined {
  const { sun } = world.bodies
  if (!twilightShare(sun.altitude) || !world.light.diffuse || !world.clouds?.length) return
  if (memo.has(world)) return memo.get(world)
  const covers = coversOf(world)
  const union = 1 - (1 - covers.low) * (1 - covers.mid) * (1 - covers.high)
  const box = reflectionSkyBox(world), geom = skyGeom(world, box), stops = skyStops(world, box)
  const field = world.cloudField
  const sum: [number, number, number] = [0, 0, 0]
  let remaining = 1
  for (const level of levels) {
    const cloud = world.clouds.find(layer => layer.level === level)
    if (!cloud || !remaining) continue
    // The lit-tone proxy represents the lower sky at the same bearing as the sun.
    // Use field opacity there, compositing the lower decks in front of higher ones.
    const snapshots = field?.snapshot.filter(({ layer }) => layer?.lattice === level ||
      (level === 'low' && layer?.lattice === 'tower'))
    const cover = field && snapshots?.length
      ? 1 - transmitAlong(field.field, snapshots, sun.azimuth, SHEET_TONE_ALTITUDE)
      : covers[level]
    if (!cover) continue
    const { tones } = sheetTones(world, box, geom, stops, cloud, union)
    const rgb = srgbRgbToLinear(sheetLitTone(tones, lightOn(world, box, geom, cloud)))
    const visible = remaining * cover
    for (let i = 0; i < 3; i++) sum[i] += visible * rgb[i]
    remaining *= 1 - cover
  }
  // Preserve the original neutral scatter through gaps. Mix the covered and
  // uncovered fractions at equal luminance so the ray supplies colour only.
  const y = linearLuminance(sum)
  const scale = y > 0 ? (1 - remaining) / y : 0
  const rgb: RGB | undefined = scale > 0
    ? [remaining + scale * sum[0], remaining + scale * sum[1], remaining + scale * sum[2]] : undefined
  memo.set(world, rgb)
  return rgb
}
