import assert from 'node:assert/strict';
import test from 'node:test';
import { FeatureWriteQueue } from './featureWriteQueue.ts';

test('a pending create cannot resurrect a deleted feature', async () => {
  const queue = new FeatureWriteQueue();
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const order: string[] = [];
  const applied: string[] = [];
  const create = queue.enqueue('f', async () => {
    order.push('create');
    await held;
    return 'created';
  }, (value) => applied.push(value));
  const remove = queue.enqueue('f', async () => {
    order.push('delete');
    return 'deleted';
  }, (value) => applied.push(value));
  assert.equal(queue.has('f'), true);
  release();
  await Promise.all([create, remove]);
  assert.deepEqual(order, ['create', 'delete']);
  assert.deepEqual(applied, ['deleted']);
  assert.equal(queue.has('f'), false);
});

test('rapid history snapshots are written in order and only the newest is applied', async () => {
  const queue = new FeatureWriteQueue();
  const order: number[] = [];
  const applied: number[] = [];
  await Promise.all([1, 2, 3].map((n) => queue.enqueue('f', async () => {
    order.push(n);
    return n;
  }, (value) => applied.push(value))));
  assert.deepEqual(order, [1, 2, 3]);
  assert.deepEqual(applied, [3]);
});
