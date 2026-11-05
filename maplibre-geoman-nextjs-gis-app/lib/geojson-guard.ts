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

/** Keys that must not be used as object properties. Reading a missing `toString`
 *  or `__proto__` returns an inherited function/object and crashes a controlled input. */
export function isSafeKey(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 120 &&
    key !== 'prototype' &&
    !Object.hasOwn(Object.prototype, key)
  );
}

/** Ids used as object keys. Reserved names would change the store's prototype. */
export function isSafeId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_ID_LENGTH && id !== 'prototype' && !Object.hasOwn(Object.prototype, id);
}

/** Own string value, or '' when the key is missing or inherited. */
/** False when properties cannot be stored, including values JSON cannot encode. */
export function propertiesFit(properties: unknown): boolean {
  try {
    return JSON.stringify(properties ?? {}).length <= 20_000;
  } catch {
    return false;
  }
}

export function ownString(record: unknown, key: string): string {
  if (!record || typeof record !== 'object' || !Object.hasOwn(record, key)) return '';
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

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

const COORD_DEPTH: Record<string, number> = {
  Point: 0,
  MultiPoint: 1,
  LineString: 1,
  MultiLineString: 2,
  Polygon: 2,
  MultiPolygon: 3,
};

/** Position depth, or null when a slot is empty, mixed, or nested too far. */
function coordinateDepth(value: unknown, limit = 6): number | null {
  if (limit < 0 || !Array.isArray(value) || value.length === 0) return null;
  if (!Array.isArray(value[0])) return 0;
  let depth: number | null = null;
  for (const item of value) {
    const next = coordinateDepth(item, limit - 1);
    if (next == null) return null;
    const here = next + 1;
    if (depth == null) depth = here;
    else if (depth !== here) return null;
  }
  return depth;
}

function positionIsUsable(value: unknown): value is Position {
  if (!isFinitePosition(value)) return false;
  for (let i = 2; i < value.length; i++) {
    if (typeof value[i] !== 'number' || !Number.isFinite(value[i])) return false;
  }
  return true;
}

function walk(value: unknown, visit: (position: Position) => void, depth = 0): boolean {
  // A hostile import can nest arrays until the call stack dies. Real GeoJSON
  // is at most a few levels deep.
  if (depth > 8 || !Array.isArray(value) || value.length === 0) return false;
  if (!Array.isArray(value[0])) {
    if (!positionIsUsable(value)) return false;
    visit(value);
    return true;
  }
  return value.every((item) => walk(item, visit, depth + 1));
}

function samePoint(a: unknown, b: unknown): boolean {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a[0] === b[0] &&
    a[1] === b[1]
  );
}

/** True when every vertex lies on one line. Turf then collapses the ring and throws. */
function isCollinear(ring: unknown[]): boolean {
  const points = ring.slice(0, -1);
  if (points.length < 3) return true;
  const [x0, y0] = points[0] as number[];
  let bx = 0;
  let by = 0;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i] as number[];
    bx = x - x0;
    by = y - y0;
    if (bx !== 0 || by !== 0) break;
  }
  if (bx === 0 && by === 0) return true;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i] as number[];
    if (bx * (y - y0) - by * (x - x0) !== 0) return false;
  }
  return true;
}

function ringProblem(ring: unknown): string | null {
  if (!Array.isArray(ring) || ring.length < 4) return 'short ring';
  if (!samePoint(ring[0], ring[ring.length - 1])) return 'unclosed ring';
  const first = ring[0] as number[];
  if (ring.every((position) => samePoint(position, first)) || isCollinear(ring)) {
    return 'collapsed ring';
  }
  return null;
}

function ringsAreUsable(rings: unknown): string | null {
  if (!Array.isArray(rings) || rings.length === 0) return 'short ring';
  for (const ring of rings) {
    const problem = ringProblem(ring);
    if (problem) return problem;
  }
  return null;
}

/** Why a geometry cannot be stored or drawn, or null when it is usable. */
export function geometryProblem(geometry: unknown): string | null {
  if (!geometry || typeof geometry !== 'object') return 'missing geometry';
  const candidate = geometry as { type?: unknown; coordinates?: unknown };
  if (typeof candidate.type !== 'string' || !GEOMETRY_TYPES.has(candidate.type)) {
    return 'unsupported geometry';
  }
  if (candidate.coordinates == null) return 'missing coordinates';
  if (!Array.isArray(candidate.coordinates) || candidate.coordinates.length === 0) {
    return 'empty geometry';
  }
  if (coordinateDepth(candidate.coordinates) !== COORD_DEPTH[candidate.type]) {
    return 'malformed coordinates';
  }

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
  if (candidate.type === 'Polygon') return ringsAreUsable(candidate.coordinates);
  if (candidate.type === 'MultiPolygon') {
    const parts = candidate.coordinates as unknown[];
    if (!Array.isArray(parts) || parts.length === 0) return 'short ring';
    for (const part of parts) {
      const problem = ringsAreUsable(part);
      if (problem) return problem;
    }
  }
  return null;
}

/** Whether a drawable shape is allowed on a single-geometry layer. */
export function geometryFits(
  geometryType: 'point' | 'line' | 'polygon' | null | undefined,
  geometry: unknown,
): boolean {
  if (geometryProblem(geometry) !== null) return false;
  if (!geometryType) return true;
  const type = (geometry as { type: string }).type;
  if (geometryType === 'point') return type === 'Point' || type === 'MultiPoint';
  if (geometryType === 'line') return type === 'LineString' || type === 'MultiLineString';
  return type === 'Polygon' || type === 'MultiPolygon';
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
    if (!isSafeKey(key)) continue;
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
