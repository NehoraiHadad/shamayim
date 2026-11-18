import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { mapInk, restylePositron, TOWN_LABELS } from './mapStyle'

const upstream: StyleSpecification = {
  version: 8,
  glyphs: 'https://example.org/fonts/{fontstack}/{range}.pbf',
  sprite: 'https://example.org/sprites',
  sources: { openmaptiles: { type: 'vector', url: 'https://example.org/vector' },
    shading: { type: 'raster', tiles: ['https://example.org/{z}/{x}/{y}'] } },
  layers: [
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway' },
    { id: 'roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'buildings', type: 'fill', source: 'openmaptiles', 'source-layer': 'building' },
    { id: 'poi', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi' },
    { id: 'label_city', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place',
      layout: { 'text-font': ['Noto Sans Regular'], 'icon-image': 'dot' } },
  ],
}

describe('the Positron paper map', () => {
  it('keeps only land, shorelines, rivers and curated city/town labels with Hebrew fallback', () => {
    const map = restylePositron(upstream, '#f6eedf', false)
    expect(map.layers.map(({ id }) => id)).toEqual(['overhead-paper', 'overhead-water', 'overhead-rivers', TOWN_LABELS])
    expect(map.sources).toEqual({ openmaptiles: upstream.sources.openmaptiles })
    expect(map.glyphs).toBe(upstream.glyphs)
    expect(map.sprite).toBeUndefined()
    expect(map.layers[0]).toMatchObject({ paint: { 'background-color': mapInk(false).land } })
    expect(map.layers[3]).toMatchObject({
      filter: ['all', ['match', ['get', 'class'], ['city', 'town'], true, false], expect.any(Array)],
      layout: { 'text-field': ['coalesce', ['get', 'name:he'], ['get', 'name']], 'text-font': ['Noto Sans Regular'] },
    })
    expect(upstream.layers).toHaveLength(6)
  })

  it('switches the ink and water with the dark paper while keeping the same features', () => {
    const map = restylePositron(upstream, '#101833', true)
    expect(map.layers[1]).toMatchObject({ paint: { 'fill-color': mapInk(true).water, 'fill-outline-color': mapInk(true).shore } })
    expect(map.layers[3]).toMatchObject({ paint: { 'text-color': mapInk(true).text, 'text-halo-color': '#101833' } })
  })

  it('can render weather over plain paper when the basemap is unavailable', () => {
    const fallback = restylePositron({ version: 8, sources: {}, layers: [] }, '#101833', true)
    expect(fallback).not.toHaveProperty('glyphs')
    expect(fallback.layers).toEqual([
      { id: 'overhead-paper', type: 'background', paint: { 'background-color': '#101833' } },
    ])
  })
})
