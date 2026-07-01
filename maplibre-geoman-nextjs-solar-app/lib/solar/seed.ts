import type { Feature, Polygon, Position } from 'geojson';
import type { FeatureDTO, LayerDTO, LayerStyleConfig } from '@/lib/types';
import { DOMAIN_LAYERS, type SolarLayerKey } from './domain';
import { localFrame } from './geo';

/**
 * Seed a sample rooftop: a gable-roofed house with a south- and north-facing
 * plane plus three obstructions (chimney, vent, skylight). Panels are generated
 * by the auto-layout tool, not seeded. Geometry is built in metres from a local
 * origin (a residential block) and converted to lng/lat.
 */
const ORIGIN_LNG = -97.745;
const ORIGIN_LAT = 30.272;
const frame = localFrame(ORIGIN_LNG, ORIGIN_LAT);

/** Axis-aligned rectangle (metres) → closed polygon ring in lng/lat. */
function rect(x0: number, y0: number, x1: number, y1: number): Polygon {
  const ring: Position[] = [
    frame.toLngLat([x0, y0]),
    frame.toLngLat([x1, y0]),
    frame.toLngLat([x1, y1]),
    frame.toLngLat([x0, y1]),
    frame.toLngLat([x0, y0]),
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

type SeedFeature = { layerKey: SolarLayerKey; geometry: Polygon; metadata: Record<string, string> };

const SEED_FEATURES: SeedFeature[] = [
  // Two roof planes sharing an east–west ridge at y = 4.5 m.
  {
    layerKey: 'roof',
    geometry: rect(0, 0, 12, 4.5),
    metadata: { name: 'South Roof', azimuth: '180', tilt: '25', surface: 'comp_shingle' },
  },
  {
    layerKey: 'roof',
    geometry: rect(0, 4.5, 12, 9),
    metadata: { name: 'North Roof', azimuth: '0', tilt: '25', surface: 'comp_shingle' },
  },
  // Obstructions on the south plane.
  {
    layerKey: 'obstructions',
    geometry: rect(8.5, 3.0, 9.4, 3.9),
    metadata: { type: 'chimney', label: 'Chimney' },
  },
  {
    layerKey: 'obstructions',
    geometry: rect(2.5, 1.5, 2.9, 1.9),
    metadata: { type: 'vent', label: 'Plumbing vent' },
  },
  {
    layerKey: 'obstructions',
    geometry: rect(4.5, 1.2, 5.7, 2.0),
    metadata: { type: 'skylight', label: 'Skylight' },
  },
];

function styleFor(key: SolarLayerKey): LayerStyleConfig | null {
  if (key === 'roof') {
    return { labels: { field: 'name', size: 12, color: '#92400e', haloColor: '#ffffff' } };
  }
  return null;
}

/** Build a fresh project (layers + features) for the sample rooftop. */
export function buildSeedProject(): { layers: LayerDTO[]; features: FeatureDTO[] } {
  const layerIdByKey = new Map<SolarLayerKey, string>();
  const layers: LayerDTO[] = DOMAIN_LAYERS.map((spec, i) => {
    const id = crypto.randomUUID();
    layerIdByKey.set(spec.key, id);
    return {
      id,
      name: spec.name,
      color: spec.color,
      borderColor: spec.borderColor,
      visible: true,
      sortOrder: i,
      schema: spec.schema,
      style: styleFor(spec.key),
      geometryType: spec.geometryType,
    };
  });

  const features: FeatureDTO[] = SEED_FEATURES.map((f) => {
    const id = crypto.randomUUID();
    const layerId = layerIdByKey.get(f.layerKey)!;
    const geojson: Feature = {
      type: 'Feature',
      id,
      geometry: f.geometry,
      properties: { id, shape: 'polygon', metadata: f.metadata },
    };
    return { id, layerId, shape: 'polygon', geojson, metadata: f.metadata };
  });

  return { layers, features };
}
