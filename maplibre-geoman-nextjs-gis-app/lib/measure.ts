import type { Feature, Geometry, Position } from 'geojson';

// Geodesic measurements on a sphere (same formulas turf uses) — enough for a
// QGIS-style readout without pulling in a geometry dependency.
const R = 6371008.8; // mean Earth radius, metres
const toRad = (deg: number) => (deg * Math.PI) / 180;

function segmentLength([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pathLength(coords: Position[]): number {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) sum += segmentLength(coords[i - 1], coords[i]);
  return sum;
}

/** Geodesic area of one linear ring (m²). */
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

export type Measurement = {
  /** metres for lines, the polygon perimeter for areas */
  length?: number;
  /** square metres */
  area?: number;
  /** vertex count (excluding the closing point of polygon rings) */
  vertices: number;
};

function measureGeometry(geometry: Geometry): Measurement {
  switch (geometry.type) {
    case 'LineString':
      return { length: pathLength(geometry.coordinates), vertices: geometry.coordinates.length };
    case 'MultiLineString':
      return {
        length: geometry.coordinates.reduce((s, l) => s + pathLength(l), 0),
        vertices: geometry.coordinates.reduce((s, l) => s + l.length, 0),
      };
    case 'Polygon': {
      const rings = geometry.coordinates;
      const area = rings.reduce((s, r, i) => s + (i === 0 ? ringArea(r) : -ringArea(r)), 0);
      return { area, length: pathLength(rings[0] ?? []), vertices: (rings[0]?.length ?? 1) - 1 };
    }
    case 'MultiPolygon': {
      let area = 0;
      let length = 0;
      let vertices = 0;
      for (const poly of geometry.coordinates) {
        poly.forEach((r, i) => (area += i === 0 ? ringArea(r) : -ringArea(r)));
        length += pathLength(poly[0] ?? []);
        vertices += (poly[0]?.length ?? 1) - 1;
      }
      return { area, length, vertices };
    }
    case 'Point':
      return { vertices: 1 };
    case 'MultiPoint':
      return { vertices: geometry.coordinates.length };
    default:
      return { vertices: 0 };
  }
}

export function measureFeature(feature: Feature): Measurement | null {
  return feature.geometry ? measureGeometry(feature.geometry) : null;
}

/** Human-readable distance (m / km). */
export function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`;
}

/** Human-readable area (m² / km² / ha). */
export function formatArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${m2.toFixed(1)} m²`;
}
