/** Selectable raster basemaps. Switching re-creates the single basemap raster
 *  source with the basemap's own `maxzoom`, so MapLibre overzooms (upscales) the
 *  last real tiles past that point instead of requesting non-existent — blank —
 *  higher tiles. Critical for the solar workflow: you keep zooming onto a roof
 *  after the imagery's native resolution runs out, the picture just enlarges. */
export type Basemap = {
  id: string;
  name: string;
  tiles: string | null;
  /** Native max zoom of the imagery. Beyond it MapLibre upscales the last tiles
   *  rather than blanking. Esri World Imagery is sharp to ~21 over built-up
   *  areas (rooftops); OSM/Carto top out ~19-20. */
  maxzoom?: number;
  attribution?: string;
};

export const BASEMAPS: Array<Basemap> = [
  {
    id: 'satellite',
    name: 'Satellite',
    tiles:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxzoom: 21,
    attribution: 'Esri, Maxar, Earthstar Geographics',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxzoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
  {
    id: 'light',
    name: 'Light',
    tiles: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    maxzoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  {
    id: 'dark',
    name: 'Dark',
    tiles: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maxzoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  { id: 'none', name: 'None', tiles: null },
];
