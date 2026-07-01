import type { LineString, Point, Polygon, Position } from 'geojson';

/** A local metres→lng/lat frame around a centre so seed geometry can be authored
 *  in metres. Equirectangular approximation — fine at site scale. */
export function frameAt(center: [number, number]) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const toLngLat = ([x, y]: [number, number]): Position => [
    Number((center[0] + x / mPerDegLng).toFixed(8)),
    Number((center[1] + y / mPerDegLat).toFixed(8)),
  ];
  const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => ({
    type: 'Polygon',
    coordinates: [[toLngLat([x0, y0]), toLngLat([x1, y0]), toLngLat([x1, y1]), toLngLat([x0, y1]), toLngLat([x0, y0])]],
  });
  const poly = (pts: Array<[number, number]>): Polygon => ({
    type: 'Polygon',
    coordinates: [[...pts, pts[0]].map(toLngLat)],
  });
  const line = (pts: Array<[number, number]>): LineString => ({ type: 'LineString', coordinates: pts.map(toLngLat) });
  const point = (p: [number, number]): Point => ({ type: 'Point', coordinates: toLngLat(p) });
  return { toLngLat, rect, poly, line, point };
}

export type Frame = ReturnType<typeof frameAt>;
