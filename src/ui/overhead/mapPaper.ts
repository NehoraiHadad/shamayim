import type { Map as MapLibre } from 'maplibre-gl'
import { mapInk, TOWN_LABELS } from './mapStyle'

export type Paper = { sheet: string; dark: boolean }

/** The sheet the map sits on: its paper colour and whether it is the dark (night) sheet. */
export function paperOf(container: HTMLElement): Paper {
  return {
    sheet: getComputedStyle(container).getPropertyValue('--sheet').trim(),
    dark: container.closest('.app')?.classList.contains('dark-sheet') ?? false,
  }
}

/** Repaints the basemap's ink for the current paper; only properties that changed are touched. */
export function repaintPaper(map: MapLibre, paper: Paper) {
  const ink = mapInk(paper.dark)
  const paint = (id: string, property: string, value: string) => {
    if (map.getLayer(id) && map.getPaintProperty(id, property) !== value) map.setPaintProperty(id, property, value)
  }
  paint('overhead-paper', 'background-color', ink.land ?? paper.sheet)
  paint('overhead-water', 'fill-color', ink.water)
  paint('overhead-water', 'fill-outline-color', ink.shore)
  paint('overhead-rivers', 'line-color', ink.shore)
  paint('overhead-distance', 'line-color', ink.shore)
  paint(TOWN_LABELS, 'text-color', ink.text)
  paint(TOWN_LABELS, 'text-halo-color', ink.land ?? paper.sheet)
}
