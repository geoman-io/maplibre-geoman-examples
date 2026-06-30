/** Selectable raster basemaps. All are XYZ raster tiles so switching is a cheap
 *  `source.setTiles()` (or hide) that never disturbs the Geoman editing layers. */
export type Basemap = { id: string; name: string; tiles: string | null };

export const BASEMAPS: Array<Basemap> = [
  { id: 'osm', name: 'OpenStreetMap', tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'light', name: 'Light', tiles: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png' },
  { id: 'dark', name: 'Dark', tiles: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' },
  {
    id: 'satellite',
    name: 'Satellite',
    tiles:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  { id: 'none', name: 'None', tiles: null },
];
