import assert from 'node:assert/strict';
import test from 'node:test';
import { fillExpression, graduate, matchesFilter } from './symbology.ts';
import { geometryProblem, isSafeId, isUsableFeature, propertiesFit, stringMetadata } from './geojson-guard.ts';
import { featureBounds, inferShape, nudgeGeometry, parseGeoJson, translateGeometry } from './io.ts';
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

test('rejects unclosed and collapsed rings', () => {
  assert.equal(
    geometryProblem({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ],
    }),
    'unclosed ring',
  );
  assert.equal(
    geometryProblem({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ],
    }),
    'collapsed ring',
  );
  assert.equal(
    geometryProblem({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    }),
    null,
  );
});

test('saved styles and deep geometry do not throw', () => {
  assert.equal(
    matchesFilter({ a: 'hello' }, { field: 'a', op: 'contains', value: undefined as never }),
    true,
  );
  assert.doesNotThrow(() =>
    matchesFilter({ a: '1' }, { field: 'a', op: '>', value: '1' }, { fields: null as never }),
  );
  assert.doesNotThrow(() =>
    fillExpression({ mode: 'categorized', field: 'a', categories: null as never, fallback: '#000' }),
  );
  assert.doesNotThrow(() => graduate([], 'a', Number.POSITIVE_INFINITY, undefined as never));

  const nested = { type: 'Polygon', coordinates: [] as unknown[] };
  let cursor = nested.coordinates;
  for (let i = 0; i < 30; i++) {
    const next: unknown[] = [];
    cursor.push(next);
    cursor = next;
  }
  assert.equal(geometryProblem(nested), 'malformed coordinates');
});

test('rejects coordinates that make WKT and simplify throw', () => {
  assert.equal(
    geometryProblem({ type: 'MultiPoint', coordinates: [-72, -11.8] }),
    'malformed coordinates',
  );
  assert.equal(
    geometryProblem({ type: 'LineString', coordinates: [[0, 0], [], [1, 1]] }),
    'malformed coordinates',
  );
  assert.equal(
    geometryProblem({ type: 'Point', coordinates: [1, 2, Number.NaN] }),
    'non-finite coordinate',
  );
  assert.equal(
    geometryProblem({ type: 'Point', coordinates: [1, 2, 'z'] }),
    'non-finite coordinate',
  );
  assert.equal(
    geometryProblem({
      type: 'Polygon',
      coordinates: [[[0, 0], [3, 0], [1, 0], [0, 0]]],
    }),
    'collapsed ring',
  );
  assert.equal(
    geometryProblem({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
    }),
    null,
  );
});

test('paste nudge stays inside the world', () => {
  assert.equal(geometryProblem(nudgeGeometry({ type: 'Point', coordinates: [179.99, 10] })), null);
  assert.equal(geometryProblem(nudgeGeometry({ type: 'Point', coordinates: [0, 89.99] })), null);
  assert.equal(
    nudgeGeometry({ type: 'LineString', coordinates: [[-179.99, 0], [179.99, 0]] }),
    null,
  );
});

test('a filter on an inherited key does not throw', () => {
  assert.equal(matchesFilter({ a: 'Hello' }, { field: 'toString', op: 'contains', value: 'h' }), false);
  assert.equal(matchesFilter({ a: 'Hello' }, { field: 'constructor', op: '=', value: 'Function' }), false);
  assert.equal(matchesFilter(null as never, { field: 'a', op: 'contains', value: 'h' }), false);
});

test('reserved ids cannot be used as object keys', () => {
  assert.equal(isSafeId('__proto__'), false);
  assert.equal(isSafeId('constructor'), false);
  assert.equal(isSafeId('prototype'), false);
  assert.equal(isSafeId('feature-1'), true);
  const bag: Record<string, unknown> = {};
  const id = '__proto__';
  if (isSafeId(id)) bag[id] = { admin: true };
  assert.equal(Object.prototype.hasOwnProperty.call(bag, 'admin'), false);
  assert.deepEqual(stringMetadata({ __proto__: 'x', toString: 'nope', name: 'ok' }), { name: 'ok' });
});

test('properties that cannot be encoded are rejected', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.equal(propertiesFit(circular), false);
  assert.equal(propertiesFit({ name: 'ok' }), true);
  assert.equal(propertiesFit({ blob: 'x'.repeat(20_001) }), false);
});

test('metadata keeps only scalar values', () => {
  assert.deepEqual(stringMetadata(point.properties), { name: 'a', n: '2' });
  assert.deepEqual(stringMetadata(null), {});
  assert.deepEqual(stringMetadata([1, 2]), {});
});
