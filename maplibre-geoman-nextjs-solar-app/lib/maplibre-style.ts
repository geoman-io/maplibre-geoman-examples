import type { StyleSpecification } from 'maplibre-gl';

// The initial basemap raster. A rooftop-solar app opens on satellite; the user
// can switch via the basemap control, which re-creates this source per basemap
// with its own maxzoom. The source id stays `osm-tiles` for back-compat with the
// editor controller's basemap swap.
const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      // Native max zoom of the imagery. MapLibre upscales the last tiles past
      // this instead of requesting blank higher tiles.
      maxzoom: 21,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      // No maxzoom on the layer: it must keep rendering at every zoom. The
      // SOURCE maxzoom above is what makes deep zoom enlarge rather than blank.
    },
  ],
};

export default mapStyle;
