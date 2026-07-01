import booleanIntersects from '@turf/boolean-intersects';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import type { Feature, Polygon, Position } from 'geojson';
import { eachPolygonPosition, localFrame } from './geo';
import { placeableArea } from './setback';
import type { ModuleSpec, PanelOrientation } from './modules';

export type LayoutOptions = {
  module: ModuleSpec;
  orientation: PanelOrientation;
  /** Fire setback from roof edges, metres. */
  setbackM: number;
  /** Gap between panel rows (up-slope), metres. */
  rowGapM: number;
  /** Gap between panel columns (across-slope), metres. */
  colGapM: number;
  /** Roof azimuth (compass degrees) — the grid is aligned to it. */
  azimuthDeg: number;
  obstructions: Feature[];
};

/**
 * Auto-lay out PV modules on a roof plane. Tiles the plane's placeable area
 * (inset by the fire setback, minus obstructions) with axis-aligned module
 * rectangles in a grid oriented to the roof's azimuth — rows run across-slope,
 * columns stack up-slope. Returns the panel polygons (lng/lat).
 */
export function layoutPanels(roof: Feature, opts: LayoutOptions): Polygon[] {
  const placeable = placeableArea(roof, opts.setbackM, opts.obstructions);
  if (!placeable) return [];

  // Panel footprint in (across u, up-slope v) axes.
  const panelU = opts.orientation === 'portrait' ? opts.module.widthM : opts.module.heightM;
  const panelV = opts.orientation === 'portrait' ? opts.module.heightM : opts.module.widthM;
  const stepU = panelU + opts.colGapM;
  const stepV = panelV + opts.rowGapM;

  const c = centroid(placeable).geometry.coordinates as Position;
  const frame = localFrame(c[0], c[1]);

  // Panel-space basis aligned to the roof azimuth: v = up-slope, u = across.
  const A = (opts.azimuthDeg * Math.PI) / 180;
  const uHat: [number, number] = [Math.cos(A), -Math.sin(A)];
  const vHat: [number, number] = [-Math.sin(A), -Math.cos(A)];
  const toUV = (x: number, y: number): [number, number] => [
    x * uHat[0] + y * uHat[1],
    x * vHat[0] + y * vHat[1],
  ];
  const toXY = (u: number, v: number): [number, number] => [
    u * uHat[0] + v * vHat[0],
    u * uHat[1] + v * vHat[1],
  ];

  // Bounding box of the placeable area in (u, v) space.
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  eachPolygonPosition(placeable.geometry, (p) => {
    const [x, y] = frame.toLocal(p);
    const [u, v] = toUV(x, y);
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  });
  if (!Number.isFinite(uMin)) return [];

  const obstructions = opts.obstructions.filter(
    (o) => o.geometry?.type === 'Polygon' || o.geometry?.type === 'MultiPolygon',
  );

  const panels: Polygon[] = [];
  const MAX = 4000;
  for (let v = vMin; v + panelV <= vMax + 1e-6 && panels.length < MAX; v += stepV) {
    for (let u = uMin; u + panelU <= uMax + 1e-6 && panels.length < MAX; u += stepU) {
      const ring: Position[] = (
        [
          [u, v],
          [u + panelU, v],
          [u + panelU, v + panelV],
          [u, v + panelV],
        ] as Array<[number, number]>
      ).map(([cu, cv]) => frame.toLngLat(toXY(cu, cv)));
      ring.push(ring[0]);
      const poly: Polygon = { type: 'Polygon', coordinates: [ring] };

      // Every corner must sit inside the placeable area...
      if (!ring.slice(0, 4).every((pt) => booleanPointInPolygon(pt, placeable))) continue;
      // ...and the panel must not overlap any obstruction.
      const feature: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: poly };
      if (obstructions.some((o) => booleanIntersects(feature, o))) continue;

      panels.push(poly);
    }
  }
  return panels;
}
