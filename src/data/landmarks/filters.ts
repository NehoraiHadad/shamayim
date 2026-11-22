export interface LandmarkFilter {
  overpass: string
  osmium: string
  far?: boolean
}

export const LANDMARK_FILTERS: LandmarkFilter[] = [
  { overpass: 'way[bridge]["bridge:structure"~"cable-stayed|suspension"]', osmium: 'w/bridge', far: true },
  { overpass: 'nwr[man_made=cooling_tower]', osmium: 'nwr/man_made=cooling_tower', far: true },
  { overpass: 'nwr[man_made=tower]["tower:type"=cooling]', osmium: 'nwr/tower:type=cooling', far: true },
  { overpass: 'nwr[power=generator]["generator:source"=wind]', osmium: 'nwr/generator:source=wind', far: true },
  { overpass: 'nwr[man_made=chimney]', osmium: 'nwr/man_made=chimney', far: true },
  { overpass: 'nwr[man_made=lighthouse]', osmium: 'nwr/man_made=lighthouse', far: true },
  { overpass: 'nwr["tower:type"=minaret]', osmium: 'nwr/tower:type=minaret', far: true },
  { overpass: 'nwr[building=minaret]', osmium: 'nwr/building=minaret', far: true },
  { overpass: 'nwr[building=mosque]', osmium: 'nwr/building=mosque', far: true },
  { overpass: 'nwr[building][height]', osmium: 'nwr/height', far: true },
  { overpass: 'nwr[building]["building:levels"]', osmium: 'nwr/building:levels', far: true },
  { overpass: 'nwr[man_made=water_tower]', osmium: 'nwr/man_made=water_tower' },
  { overpass: 'nwr[amenity=place_of_worship][building~"church|cathedral"]', osmium: 'nwr/building=church,cathedral' },
  { overpass: 'nwr[man_made=silo]', osmium: 'nwr/man_made=silo' },
  { overpass: 'nwr[historic~"castle|fort"]', osmium: 'nwr/historic=castle,fort' },
  { overpass: 'nwr[man_made=mast]', osmium: 'nwr/man_made=mast', far: true },
  { overpass: 'nwr[man_made=tower]["tower:type"=communication]', osmium: 'nwr/tower:type=communication', far: true },
  { overpass: 'nwr[landuse=orchard]', osmium: 'nwr/landuse=orchard' },
  { overpass: 'nwr[landuse=vineyard]', osmium: 'nwr/landuse=vineyard' },
  { overpass: 'nwr[power=plant]["plant:source"=solar]', osmium: 'nwr/plant:source=solar' },
  { overpass: 'nwr[amenity=place_of_worship][religion=jewish][building]', osmium: 'nwr/religion=jewish' },
  { overpass: 'nwr[amenity=place_of_worship][religion=muslim][building]', osmium: 'nwr/religion=muslim' },
]
