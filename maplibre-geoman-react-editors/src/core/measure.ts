import type { Feature, Geometry, Position } from 'geojson';

// Geodesic measurements on a sphere (same formulas turf uses) — enough for a
// planning readout without a geometry dependency.
const R = 6371008.8; // mean Earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;

function segLen([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pathLen(coords: Position[]): number {
  let s = 0;
  for (let i = 1; i < coords.length; i++) s += segLen(coords[i - 1], coords[i]);
  return s;
}

function ringArea(coords: Position[]): number {
  const n = coords.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % n];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * R * R) / 2);
}

/** Area in m² of a polygon/multipolygon geometry (0 for non-areal). */
export function areaSqm(geom: Geometry | null | undefined): number {
  if (!geom) return 0;
  if (geom.type === 'Polygon') {
    return geom.coordinates.reduce((s, r, i) => s + (i === 0 ? ringArea(r) : -ringArea(r)), 0);
  }
  if (geom.type === 'MultiPolygon') {
    let a = 0;
    for (const poly of geom.coordinates) poly.forEach((r, i) => (a += i === 0 ? ringArea(r) : -ringArea(r)));
    return a;
  }
  return 0;
}

/** Length in metres of a line/multiline geometry (0 for non-linear). */
export function lengthM(geom: Geometry | null | undefined): number {
  if (!geom) return 0;
  if (geom.type === 'LineString') return pathLen(geom.coordinates);
  if (geom.type === 'MultiLineString') return geom.coordinates.reduce((s, l) => s + pathLen(l), 0);
  return 0;
}

export const areaSqft = (geom: Geometry | null | undefined) => areaSqm(geom) * 10.7639;
export const lengthFt = (geom: Geometry | null | undefined) => lengthM(geom) * 3.28084;

export const feature = (f: Feature) => f.geometry;
