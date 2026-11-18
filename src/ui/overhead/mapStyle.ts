import type { ExpressionSpecification, FillLayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl'

export const POSITRON = 'https://tiles.openfreemap.org/styles/positron'
export const TOWN_LABELS = 'overhead-towns'
const towns = [
  'חיפה', 'Haifa', 'תל אביב-יפו', 'תל אביב–יפו', 'תל אביב', 'Tel Aviv', 'Tel Aviv-Yafo',
  'ירושלים', 'Jerusalem', 'באר שבע', 'Beersheba', 'Beer Sheva', "Be'er Sheva",
  'אילת', 'Eilat', 'עזה', 'Gaza', 'Gaza City', 'נצרת', 'Nazareth', 'עמאן', 'רבת עמון', 'Amman',
]
const nameHe: ExpressionSpecification = ['coalesce', ['get', 'name:he'], ['get', 'name']]

export function mapInk(dark: boolean) {
  return dark
    ? { land: null, water: '#334760', shore: '#758ba0', text: '#f0f3f8' }
    // A sand-toned land a step darker than the page, so white clouds still read over it.
    : { land: '#E2DDD2', water: '#C8D8E2', shore: '#718a9c', text: '#28374a' }
}

export function restylePositron(style: StyleSpecification, sheet: string, dark: boolean): StyleSpecification {
  const ink = mapInk(dark)
  const water = style.layers.find((layer): layer is FillLayerSpecification =>
    layer.type === 'fill' && layer['source-layer'] === 'water')
  const river = style.layers.find((layer) => layer.type === 'line' && layer['source-layer'] === 'waterway')
  const places = style.layers.find((layer): layer is SymbolLayerSpecification =>
    layer.type === 'symbol' && layer['source-layer'] === 'place' && layer.id === 'label_city')

  const layers: StyleSpecification['layers'] = [
    { id: 'overhead-paper', type: 'background', paint: { 'background-color': ink.land ?? sheet } },
  ]
  if (water) layers.push({
    id: 'overhead-water', type: 'fill', source: water.source, 'source-layer': 'water',
    filter: ['match', ['get', 'class'], ['lake', 'ocean', 'river'], true, false],
    paint: { 'fill-color': ink.water, 'fill-outline-color': ink.shore },
  })
  if (river?.type === 'line') layers.push({
    id: 'overhead-rivers', type: 'line', source: river.source, 'source-layer': 'waterway',
    filter: ['==', ['get', 'class'], 'river'],
    paint: { 'line-color': ink.shore, 'line-width': 0.8 },
  })
  if (places && style.glyphs) layers.push({
    id: TOWN_LABELS, type: 'symbol', source: places.source, 'source-layer': 'place',
    filter: ['all', ['match', ['get', 'class'], ['city', 'town'], true, false],
      ['any', ['in', nameHe, ['literal', towns]],
        ['in', ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']], ['literal', towns]]]],
    layout: { 'text-field': nameHe, 'text-font': places.layout?.['text-font'] ?? ['Noto Sans Regular'],
      'text-size': 13, 'text-padding': 5, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99] },
    paint: { 'text-color': ink.text, 'text-halo-color': ink.land ?? sheet, 'text-halo-width': 1.5 },
  })
  const sources = Object.fromEntries(Object.entries(style.sources).filter(([id]) =>
    layers.some((layer) => 'source' in layer && layer.source === id)))
  return { version: 8, ...(style.glyphs ? { glyphs: style.glyphs } : {}), sources, layers, transition: { duration: 0 } }
}
