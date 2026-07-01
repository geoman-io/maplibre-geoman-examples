import buffer from '@turf/buffer';
import difference from '@turf/difference';
import { featureCollection } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

const isPoly = (f: Feature): f is Feature<Polygon | MultiPolygon> =>
  f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';

const hasArea = (f: Feature<Polygon | MultiPolygon> | null | undefined): boolean =>
  !!f && !!f.geometry && f.geometry.coordinates.length > 0;

/**
 * The placeable area of a roof plane: the plane inset by the fire setback, with
 * the obstructions cut out. This is the region panels may occupy. Returns null
 * if the setback (or obstructions) leave nothing usable.
 */
export function placeableArea(
  roof: Feature,
  setbackM: number,
  obstructions: Feature[],
): Feature<Polygon | MultiPolygon> | null {
  if (!isPoly(roof)) return null;

  let area: Feature<Polygon | MultiPolygon> | null | undefined =
    setbackM > 0 ? buffer(roof, -setbackM, { units: 'meters' }) : roof;
  if (!hasArea(area)) return null;

  for (const obs of obstructions) {
    if (!isPoly(obs)) continue;
    const diff = difference(featureCollection([area!, obs]));
    if (!hasArea(diff)) return null; // an obstruction swallowed the whole plane
    area = diff;
  }
  return area!;
}
