import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import type { CloudSprite } from '../model/cloudSprite'
import { cloudLayersOf } from '../model/cloudLayers'
import { towerAnvil } from '../model/towerHeads'
import { towerMass } from './drawn/towerMass'
import { towerShape } from './real/towerShape'

// Isolated towers from the far merger floor through twice the distance
// at which the painter stops fading the base. Sample at the 2× still resolution.
const sizes = [28, 70, 140]
const aspects = [1.2, 1.5, 1.7]
const rgb = [0.6, 0.65, 0.7] as const
const rasterScale = 2

function widthsOf(hand: 'drawn' | 'real', sprite: CloudSprite) {
  const { tall, tau, share } = sprite
  const real = hand === 'real' ? towerShape(sprite) : null
  const drawn = real ? null : towerMass(sprite)
  const reach = Math.ceil((real ?? drawn!).reach * rasterScale)
  const thirds: number[][] = [[], [], []]
  const rows = Math.ceil(tall * rasterScale)
  // The global alpha multiplier applied by the shared tower raster painter.
  const opacity = 0.92 * (1 - Math.exp(-tau / 2)) * Math.min(1, share)
  for (let i = 0; i < rows; i++) {
    const y = -(i + 0.5) * tall / rows
    let left = Infinity, right = -Infinity
    for (let col = -reach; col <= reach; col++) {
      const x = col / rasterScale
      const alpha = real ? real.at(x, y)?.a : drawn!.at(x, y)?.alpha
      if (alpha !== undefined && opacity * Math.round(alpha * 255) / 255 >= 0.25) {
        left = Math.min(left, col)
        right = col
      }
    }
    thirds[Math.floor(3 * i / rows)].push(Math.max(0, right - left + 1))
  }
  return thirds.map(widths => Math.max(0, ...widths))
}

it.each(['drawn', 'real'] as const)('keeps the painted %s tower heads from overhanging their trunks', hand => {
  for (const w of sizes) for (const aspect of aspects) for (const genus of ['cg', 'cb'] as const) {
    // The Cb has reached 10 km, the congestus has no ice cap. Even a
    // developing Cb anvil must satisfy the ordinary head/trunk bound.
    const tall = w * aspect
    const sprite: CloudSprite = {
      seed: 521, genus, w, tall, under: w / 10, lean: 0, tau: 10,
      anvil: towerAnvil(genus === 'cb', 10, aspect),
      body: rgb, shade: rgb, lit: rgb, litA: 0, toward: null, silver: 0, glow: 0, rains: false, share: 1,
    }
    const [base, trunk, head] = widthsOf(hand, sprite)
    const label = `${genus} ${w}px ${aspect}`
    expect(base, label).toBeGreaterThan(0)
    expect(trunk, label).toBeLessThanOrEqual(1.25 * base)
    expect(head, label).toBeLessThanOrEqual(1.4 * trunk)
  }
})

it('checks isolated painted towers in the Haifa 14:00 still', async () => {
  stubPublicFetch()
  try {
    const haifa = (await loadPlaces(SCENE_PLACES.filter(place => place.id === 'haifa'))).get('haifa')!
    const at = '2026-03-15T14:00'
    const world = buildWorld(worldInput(haifa, at, at))
    const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
    const towers = cloudLayersOf(world, box).find(layer => layer.kind === 'cloudCells')
    expect(towers).toBeDefined()
    if (towers?.kind !== 'cloudCells') return
    const cells = towers.cells
    // Also check the isolated sprite alpha for the reported right-hand tower
    // if its wide scratch rectangle intersects a neighboring tower.
    const right = cells.filter(({ x }) => x >= 220 && x <= 315)
      .sort((a, b) => b.sprite.tall - a.sprite.tall)[0]
    expect(right).toBeDefined()
    for (const hand of ['drawn', 'real'] as const) for (const cell of cells) {
      const separated = cells.every(other => other === cell ||
        Math.abs(cell.x - other.x) >= (cell.sprite.w + other.sprite.w) / 2 ||
        cell.y - cell.sprite.tall >= other.y + other.sprite.under ||
        other.y - other.sprite.tall >= cell.y + cell.sprite.under)
      if (!separated && cell !== right) continue
      const [base, trunk, head] = widthsOf(hand, cell.sprite)
      if (!Math.max(base, trunk, head) && cell !== right) continue
      const label = `${hand} seed ${cell.sprite.seed}`
      expect(base, label).toBeGreaterThan(0)
      expect(trunk, label).toBeLessThanOrEqual(1.25 * base)
      if ((cell.sprite.anvil ?? 0) <= 1 / 1.6) expect(head, label).toBeLessThanOrEqual(1.4 * trunk)
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 120_000)
