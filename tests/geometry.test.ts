import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPolygon, attachPolygon, polygonArea, polygonSharesEdge,
  overlapsArea, proposeAttachedTile, edgeIsOccupied, availableSlots } from '../src/core/geometry.ts';
import { createEmptyBlueprint, unmeasuredStability } from '../src/core/blueprint.ts';
import type { Tile } from '../src/core/geometry.ts';

const tile = (id: string, shape: 'square' | 'triangle', vertices = initialPolygon(shape), level=0): Tile =>
  ({ id, shape, vertices, level });
const approx = (a: number, b: number, epsilon = 1e-9) => assert.ok(Math.abs(a-b) < epsilon, `${a} != ${b}`);

test('square has area 1; equilateral triangle has area sqrt(3)/4', () => {
  approx(polygonArea(initialPolygon('square')), 1);
  approx(polygonArea(initialPolygon('triangle')), Math.sqrt(3) / 4);
});

test('triangle docks exactly to square without overlap', () => {
  const a = initialPolygon('square');
  const b = attachPolygon(a, 0, 'triangle');
  assert.equal(polygonSharesEdge(a, b), true);
  assert.equal(overlapsArea(a, b), false);
  approx(polygonArea(b), Math.sqrt(3)/4);
});

test('square docks at a slanted triangle edge, automatically rotated', () => {
  const a = initialPolygon('triangle');
  const b = attachPolygon(a, 0, 'square');
  assert.equal(polygonSharesEdge(a, b), true);
  assert.equal(overlapsArea(a, b), false);
  approx(polygonArea(b), 1);
  assert.ok(Math.abs(b[0]!.y-b[1]!.y)>0.1, 'square must rotate with triangle edge');
});

test('edge contact permitted, positive area collision rejected', () => {
  assert.equal(overlapsArea(initialPolygon('square', {x:0,y:0}), initialPolygon('square', {x:1,y:0})), false);
  assert.equal(overlapsArea(initialPolygon('square', {x:0,y:0}), initialPolygon('square', {x:0.4,y:0})), true);
});

test('adding tile on occupied side fails and exposes explicit reason', () => {
  const first = tile('F1','square');
  const secondResult = proposeAttachedTile([first], 'F1', 0, 'triangle', 'T1');
  assert.equal(secondResult.ok, true);
  if (!secondResult.ok) return;
  assert.equal(edgeIsOccupied([first, secondResult.tile], first, 0), true);
  assert.deepEqual(proposeAttachedTile([first, secondResult.tile], 'F1', 0, 'square', 'S2'),
    { ok: false, reason:'edge-occupied' });
});

test('missing source and invalid edge are safe, no mutation', () => {
  const first = tile('F1','square');
  assert.deepEqual(proposeAttachedTile([first], 'missing', 0, 'triangle', 'T2'), {ok:false,reason:'source-missing'});
  assert.deepEqual(proposeAttachedTile([first], 'F1', 9, 'triangle', 'T2'), {ok:false,reason:'invalid-edge'});
  assert.equal(first.vertices.length, 4);
});

test('placement on one floor does not conflict with another floor', () => {
  const ground = tile('G','square',initialPolygon('square'),0);
  const upstairs = tile('U','square',initialPolygon('square'),1);
  assert.equal(edgeIsOccupied([ground,upstairs],ground,0), false);
  assert.equal(availableSlots([ground,upstairs], 'triangle').filter(v => v.ok).length, 8);
});

test('sequence triangle → square → triangle stays connected and collision-free', () => {
  const t1 = tile('T1','triangle');
  const s = proposeAttachedTile([t1], 'T1', 0, 'square', 'S1');
  assert.equal(s.ok, true);
  if (!s.ok) return;
  const t2 = proposeAttachedTile([t1,s.tile], 'S1', 2, 'triangle', 'T2');
  assert.equal(t2.ok,true);
  if (!t2.ok) return;
  for (const a of [t1, s.tile]) assert.equal(overlapsArea(a.vertices, t2.tile.vertices), false);
  assert.equal(polygonSharesEdge(s.tile.vertices,t2.tile.vertices),true);
});

test('unknown stability is distinct from measured 0%', () => {
  const doc = createEmptyBlueprint('demo','New');
  assert.equal(doc.schemaVersion,'1.0.0');
  assert.equal(doc.game.patch,null);
  assert.equal(unmeasuredStability().percent,null);
  assert.notEqual(unmeasuredStability().percent, 0);
});
