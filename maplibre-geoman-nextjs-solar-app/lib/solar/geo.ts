import type { Geometry, Position } from 'geojson';

/**
 * A local planar frame (metres) around an origin lng/lat, using the
 * equirectangular approximation. Good enough at rooftop scale for laying out
 * panel grids without pulling in a full projection library.
 */
export type LocalFrame = {
  toLocal: (p: Position) => [number, number];
  toLngLat: (xy: [number, number]) => Position;
};

const M_PER_DEG_LAT = 111320;

export function localFrame(originLng: number, originLat: number): LocalFrame {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((originLat * Math.PI) / 180);
  return {
    toLocal: ([lng, lat]) => [(lng - originLng) * mPerDegLng, (lat - originLat) * M_PER_DEG_LAT],
    toLngLat: ([x, y]) => [
      Number((originLng + x / mPerDegLng).toFixed(8)),
      Number((originLat + y / M_PER_DEG_LAT).toFixed(8)),
    ],
  };
}

/** Visit every coordinate of a Polygon / MultiPolygon geometry. */
export function eachPolygonPosition(geometry: Geometry, fn: (p: Position) => void) {
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) for (const p of ring) fn(p);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) for (const ring of poly) for (const p of ring) fn(p);
  }
}
