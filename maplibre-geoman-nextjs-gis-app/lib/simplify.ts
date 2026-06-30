import simplify from '@turf/simplify';
import type { Feature, Geometry } from 'geojson';

/** Count the coordinate vertices in a geometry. */
export function countVertices(geom: Geometry): number {
  const walk = (x: unknown): number =>
    Array.isArray(x) ? (typeof x[0] === 'number' ? 1 : x.reduce<number>((n, y) => n + walk(y), 0)) : 0;
  return walk((geom as { coordinates?: unknown }).coordinates);
}

/** Tolerance scaled to the feature's extent (0.05% of the bbox diagonal) with a
 *  ~2 m floor — visibly simplifies large/dense geometry while preserving small
 *  shapes. */
function adaptiveTolerance(geom: Geometry): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (x: unknown): void => {
    if (!Array.isArray(x)) return;
    if (typeof x[0] === 'number') {
      minX = Math.min(minX, x[0]);
      maxX = Math.max(maxX, x[0]);
      minY = Math.min(minY, x[1] as number);
      maxY = Math.max(maxY, x[1] as number);
    } else x.forEach(walk);
  };
  walk((geom as { coordinates?: unknown }).coordinates);
  const diag = Number.isFinite(minX) ? Math.hypot(maxX - minX, maxY - minY) : 0;
  return Math.max(0.00002, diag * 0.0005);
}

/** Whole-feature Douglas–Peucker simplification. Removes redundant vertices
 *  without mangling the shape; points are returned untouched. */
export function simplifyFeature(feature: Feature, tolerance?: number): Feature {
  if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') return feature;
  return simplify(feature, {
    tolerance: tolerance ?? adaptiveTolerance(feature.geometry),
    highQuality: true,
    mutate: false,
  });
}
