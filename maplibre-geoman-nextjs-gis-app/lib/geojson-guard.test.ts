import assert from 'node:assert/strict';
import test from 'node:test';
import { geometryProblem, isUsableFeature, stringMetadata } from './geojson-guard.ts';
import { featureBounds, inferShape, parseGeoJson, translateGeometry } from './io.ts';
import { measureFeature } from './measure.ts';
import { simplifyFeature } from './simplify.ts';

const point = {
  type: 'Feature' as const,
  properties: { name: 'a', extra: { nested: true }, n: 2 },
  geometry: { type: 'Point' as const, coordinates: [0, 0] },
};

test('rejects the geometries that abort import and paste', () => {
  const cases: unknown[] = [
    null,
    { type: 'Point', coordinates: null },
    { type: 'Point', coordinates: [Number.NaN, 0] },
    { type: 'Point', coordinates: [Infinity, 0] },
    { type: 'Point', coordinates: [null, 1] },
    { type: 'Point', coordinates: [0] },
    { type: 'LineString', coordinates: [[0, 0]] },
    { type: 'Polygon', coordinates: [] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]], []] },
    { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[0, 0]]] },
    { type: 'GeometryCollection', geometries: [] },
    { type: 'Point', coordinates: [181, 0] },
  ];
  for (const geometry of cases) {
    assert.notEqual(geometryProblem(geometry), null, JSON.stringify(geometry));
  }
  assert.equal(geometryProblem(point.geometry), null);
});

test('parse, translate, measure, and simplify do not throw on fuzzed input', () => {
  const blobs = [
    'null',
    '{}',
    '{"type":"Feature","geometry":null}',
    '{"type":"Feature","geometry":{"type":"Point","coordinates":null}}',
    '{"type":"FeatureCollection","features":[null,{"type":"Feature","geometry":{"type":"Point","coordinates":[0,1]}}]}',
    '{"type":"GeometryCollection","geometries":[]}',
    JSON.stringify(point),
  ];
  for (const blob of blobs) {
    if (blob === 'null' || blob === '{}' || blob.startsWith('{"type":"Geometry')) {
      assert.throws(() => parseGeoJson(blob));
      continue;
    }
    if (blob.includes('"geometry":null') || blob.includes('"coordinates":null')) {
      assert.throws(() => parseGeoJson(blob));
      continue;
    }
    const parsed = parseGeoJson(blob);
    assert.ok(parsed.features.every(isUsableFeature));
  }

  const broken = { type: 'Point' as const, coordinates: null as never };
  assert.doesNotThrow(() => translateGeometry(broken, 1, 1));
  assert.equal(featureBounds({ type: 'Feature', properties: {}, geometry: broken }), null);
  assert.equal(measureFeature({ type: 'Feature', properties: {}, geometry: broken }), null);
  assert.doesNotThrow(() =>
    simplifyFeature({ type: 'Feature', properties: {}, geometry: broken }),
  );
  assert.equal(inferShape(broken), null);
});

test('metadata keeps only scalar values', () => {
  assert.deepEqual(stringMetadata(point.properties), { name: 'a', n: '2' });
  assert.deepEqual(stringMetadata(null), {});
  assert.deepEqual(stringMetadata([1, 2]), {});
});
