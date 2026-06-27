import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

export type Bounds = [[number, number], [number, number]];

/** Geometry kind Geoman understands, inferred from a GeoJSON geometry. */
export function inferShape(geometry: Geometry): string {
  switch (geometry.type) {
    case 'Polygon':
    case 'MultiPolygon':
      return 'polygon';
    case 'LineString':
    case 'MultiLineString':
      return 'line';
    case 'Point':
    case 'MultiPoint':
      return 'marker';
    default:
      return 'polygon';
  }
}

function eachPosition(geometry: Geometry, fn: (p: Position) => void) {
  const walk = (coords: unknown) => {
    if (typeof (coords as number[])[0] === 'number') {
      fn(coords as Position);
    } else {
      for (const c of coords as unknown[]) walk(c);
    }
  };
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((g) => eachPosition(g, fn));
  } else {
    walk(geometry.coordinates);
  }
}

/** Bounding box of a GeoJSON feature, or null if it has no coordinates. */
export function featureBounds(feature: Feature): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  if (!feature.geometry) return null;
  eachPosition(feature.geometry, ([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  if (!Number.isFinite(minX)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** Trigger a browser download of a FeatureCollection as a .geojson file. */
export function downloadGeoJson(name: string, fc: FeatureCollection) {
  const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, '_') || 'layer'}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse text into a FeatureCollection (accepts a Feature or a bare geometry). */
export function parseGeoJson(text: string): FeatureCollection {
  const data = JSON.parse(text);
  if (data.type === 'FeatureCollection') return data as FeatureCollection;
  if (data.type === 'Feature') return { type: 'FeatureCollection', features: [data] };
  if (typeof data.type === 'string') {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: data }] };
  }
  throw new Error('Not valid GeoJSON');
}

/** Keep only string-valued properties as the feature's metadata map. */
export function stringProps(props: Feature['properties']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (k === 'id' || k === 'shape' || k === 'metadata') continue;
    if (typeof v === 'string') out[k] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
  }
  return out;
}
