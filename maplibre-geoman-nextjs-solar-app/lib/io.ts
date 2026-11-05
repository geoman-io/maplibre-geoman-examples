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

/** A copy of a geometry with every coordinate shifted by (dx, dy) degrees. */
export function translateGeometry<G extends Geometry>(geometry: G, dx: number, dy: number): G {
  const shift = (coords: unknown): unknown =>
    typeof (coords as number[])[0] === 'number'
      ? [(coords as Position)[0] + dx, (coords as Position)[1] + dy, ...(coords as number[]).slice(2)]
      : (coords as unknown[]).map(shift);
  if (geometry.type === 'GeometryCollection') {
    return { ...geometry, geometries: geometry.geometries.map((g) => translateGeometry(g, dx, dy)) };
  }
  return { ...geometry, coordinates: shift((geometry as { coordinates: unknown }).coordinates) } as G;
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
function usable(feature: Feature): boolean {
  const geometry = feature?.geometry as { type?: string; coordinates?: unknown } | null;
  if (!geometry || geometry.coordinates == null) return false;
  const walk = (value: unknown): boolean => {
    if (!Array.isArray(value)) return false;
    if (value.length === 0) return true;
    if (typeof value[0] === 'number') {
      return Number.isFinite(value[0]) && Number.isFinite(value[1]);
    }
    return value.every(walk);
  };
  return walk(geometry.coordinates);
}

export function parseGeoJson(text: string): FeatureCollection {
  const data = JSON.parse(text);
  let features: Feature[] = [];
  if (data.type === 'FeatureCollection') features = data.features ?? [];
  else if (data.type === 'Feature') features = [data];
  else if (typeof data.type === 'string') {
    features = [{ type: 'Feature', properties: {}, geometry: data }];
  } else throw new Error('Not valid GeoJSON');
  const kept = features.filter(usable);
  if (kept.length === 0) throw new Error('No usable features');
  return { type: 'FeatureCollection', features: kept };
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
