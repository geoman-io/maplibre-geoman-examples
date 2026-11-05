import type { Feature, Geometry, Position } from 'geojson';

const GEOMETRY_TYPES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
]);

export const MAX_COORDINATES = 50_000;
export const MAX_ID_LENGTH = 128;

/** A longitude/latitude pair MapLibre can project. Altitude is ignored. */
export function isFinitePosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

function walk(value: unknown, visit: (position: Position) => void): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  if (!Array.isArray(value[0])) {
    if (!isFinitePosition(value)) return false;
    visit(value);
    return true;
  }
  return value.every((item) => walk(item, visit));
}

function ringsAreClosed(rings: unknown): boolean {
  return (
    Array.isArray(rings) &&
    rings.length > 0 &&
    rings.every((ring) => Array.isArray(ring) && ring.length >= 4)
  );
}

/** Why a geometry cannot be stored or drawn, or null when it is usable. */
export function geometryProblem(geometry: unknown): string | null {
  if (!geometry || typeof geometry !== 'object') return 'missing geometry';
  const candidate = geometry as { type?: unknown; coordinates?: unknown };
  if (typeof candidate.type !== 'string' || !GEOMETRY_TYPES.has(candidate.type)) {
    return 'unsupported geometry';
  }
  if (candidate.coordinates == null) return 'missing coordinates';

  let count = 0;
  if (!walk(candidate.coordinates, () => {
    count += 1;
  })) {
    return 'non-finite coordinate';
  }
  if (count === 0) return 'empty geometry';
  if (count > MAX_COORDINATES) return 'too many coordinates';

  if (candidate.type === 'LineString' && count < 2) return 'short line';
  if (candidate.type === 'MultiLineString') {
    const parts = candidate.coordinates as unknown[];
    if (!parts.every((part) => Array.isArray(part) && part.length >= 2)) return 'short line';
  }
  if (candidate.type === 'Polygon' && !ringsAreClosed(candidate.coordinates)) return 'short ring';
  if (candidate.type === 'MultiPolygon') {
    const parts = candidate.coordinates as unknown[];
    if (!parts.every((part) => ringsAreClosed(part))) return 'short ring';
  }
  return null;
}

export function isUsableFeature(value: unknown): value is Feature {
  if (!value || typeof value !== 'object') return false;
  const feature = value as Feature;
  return feature.type === 'Feature' && geometryProblem(feature.geometry) === null;
}

/** Keep only values the attribute table can store. Drops objects and nulls. */
export function stringMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key.length === 0 || key.length > 120) continue;
    if (typeof item === 'string') {
      if (item.length <= 2000) out[key] = item;
    } else if (typeof item === 'number' && Number.isFinite(item)) {
      out[key] = String(item);
    } else if (typeof item === 'boolean') {
      out[key] = String(item);
    }
    if (Object.keys(out).length >= 100) break;
  }
  return out;
}

export function eachFinitePosition(geometry: Geometry, fn: (position: Position) => void) {
  if (!geometry || geometry.type === 'GeometryCollection') {
    geometry?.type === 'GeometryCollection' &&
      geometry.geometries.forEach((child) => eachFinitePosition(child, fn));
    return;
  }
  walk(geometry.coordinates, fn);
}
