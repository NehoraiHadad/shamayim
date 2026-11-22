import type { LayerDesc, LayerOf } from '../model/types'
import { stripKey } from './paintJob'
import type { LayerCache } from './layerCache'
import type { RemoteCache } from './remoteCache'

type Cached = NonNullable<ReturnType<LayerCache['peek']> | ReturnType<RemoteCache['peek']>>
const pairs = new WeakMap<LayerOf<'canopy'>, {
  beam: Cached['light']; toneKey: string | null; receiver: Cached['receiver']; form: string; light: string | null; matches: boolean
}>()

/** Order already establishes plane membership. Match the visible receiver and the cached canopy's paint generation. */
export function canopyMatchesPlane(canopy: LayerOf<'canopy'>, cached: Cached, cache: Pick<LayerCache | RemoteCache, 'peek'>) {
  const plane = cache.peek(canopy.id.replace(/^canopy\./, 'plane.'))
  if (!plane?.light) return false
  const { light, lightKey, desc } = plane
  const held = pairs.get(canopy)
  if (held?.beam === light && held.toneKey === cached.lightKey && held.receiver === cached.receiver
    && held.form === desc.key && held.light === lightKey) return held.matches
  const matchesReceiver = (receiver: Cached['receiver']) => receiver?.form === desc.key && receiver.light === lightKey
  const matches = matchesReceiver(cached.receiver)
    || (cached.lightKey === (canopy.light?.key ?? '') + stripKey(canopy) && matchesReceiver(canopy.receiver))
  pairs.set(canopy, { beam: light, toneKey: cached.lightKey, receiver: cached.receiver, form: desc.key, light: lightKey, matches })
  return matches
}

type Receiver = LayerOf<'plane'> | LayerOf<'canopy'>
const shadeLayers = new WeakMap<Receiver, Receiver>()

/** A beam-removed receiver is optional and shares its geometry and pose with the full-beam paint. */
export function shadeLayer(desc: LayerDesc): Receiver | undefined {
  if ((desc.kind !== 'plane' && desc.kind !== 'canopy') || !desc.cloudShadow || !desc.light) return
  const held = shadeLayers.get(desc)
  if (held) return held
  if (desc.kind === 'canopy' && !desc.shadedTones) return
  const id = shadeId(desc.id)
  const shade: Receiver = desc.kind === 'plane' ? { ...desc, id, beamRemoved: true }
    : { ...desc, id, beamRemoved: true, light: { ...desc.light, key: desc.shadedTones!.key } }
  shadeLayers.set(desc, shade)
  return shade
}

export const shadeId = (id: string) => id + '.shade'
