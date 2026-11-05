import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPolygon, attachPolygon, polygonArea, polygonSharesEdge,
  overlapsArea, proposeAttachedTile, edgeIsOccupied, availableSlots } from '../src/core/geometry.ts';
import { createEmptyBlueprint, unmeasuredStability } from '../src/core/blueprint.ts';
import type { Tile } from '../src/core/geometry.ts';
const tile=(id:string,shape:'square'|'triangle',vertices=initialPolygon(shape),level=0):Tile=>
  ({id,shape,vertices,level});
const approx=(a:number,b:number,epsilon=1e-9)=>
  assert.ok(Math.abs(a-b)<epsilon,'Expected '+a+' ≈ '+b);

test('square area = 1; triangle area = sqrt(3)/4',()=>{
  approx(polygonArea(initialPolygon('square')),1);
  approx(polygonArea(initialPolygon('triangle')),Math.sqrt(3)/4);
});
test('triangle exactly docks onto square',()=>{
  const a=initialPolygon('square'),b=attachPolygon(a,0,'triangle');
  assert.equal(polygonSharesEdge(a,b),true);
  assert.equal(overlapsArea(a,b),false);
  approx(polygonArea(b),Math.sqrt(3)/4);
});
test('square automatically rotates onto triangle slanted side',()=>{
  const a=initialPolygon('triangle'),b=attachPolygon(a,0,'square');
  assert.equal(polygonSharesEdge(a,b),true);
  assert.equal(overlapsArea(a,b),false);
  approx(polygonArea(b),1);
  assert.ok(Math.abs(b[0]!.y-b[1]!.y)>0.1);
});
test('edge contact is allowed but positive interior overlap is rejected',()=>{
  assert.equal(overlapsArea(initialPolygon('square',{x:0,y:0}),initialPolygon('square',{x:1,y:0})),false);
  assert.equal(overlapsArea(initialPolygon('square',{x:0,y:0}),initialPolygon('square',{x:0.4,y:0})),true);
});
test('occupied edge cannot accept another piece',()=>{
  const first=tile('F1','square'),added=proposeAttachedTile([first],'F1',0,'triangle','T1');
  assert.equal(added.ok,true);
  if(!added.ok)return;
  assert.equal(edgeIsOccupied([first,added.tile],first,0),true);
  assert.deepEqual(proposeAttachedTile([first,added.tile],'F1',0,'square','S2'),
    {ok:false,reason:'edge-occupied'});
});
test('invalid edge and missing tile are rejected without side effects',()=>{
  const first=tile('F1','square');
  assert.deepEqual(proposeAttachedTile([first],'missing',0,'triangle','T2'),
    {ok:false,reason:'source-missing'});
  assert.deepEqual(proposeAttachedTile([first],'F1',9,'triangle','T2'),
    {ok:false,reason:'invalid-edge'});
  assert.equal(first.vertices.length,4);
});
test('different levels are independent',()=>{
  const ground=tile('G','square',initialPolygon('square'),0);
  const upstairs=tile('U','square',initialPolygon('square'),1);
  assert.equal(edgeIsOccupied([ground,upstairs],ground,0),false);
  assert.equal(availableSlots([ground,upstairs],'triangle').filter(v=>v.ok).length,8);
});
test('triangle square triangle stays connected and collision free',()=>{
  const a=tile('T1','triangle');
  const b=proposeAttachedTile([a],'T1',0,'square','S1');
  assert.equal(b.ok,true);if(!b.ok)return;
  const c=proposeAttachedTile([a,b.tile],'S1',2,'triangle','T2');
  assert.equal(c.ok,true);if(!c.ok)return;
  for(const t of [a,b.tile])assert.equal(overlapsArea(t.vertices,c.tile.vertices),false);
  assert.equal(polygonSharesEdge(b.tile.vertices,c.tile.vertices),true);
});
test('unobserved stability is null not 0%',()=>{
  const doc=createEmptyBlueprint('demo','New');
  assert.equal(doc.schemaVersion,'1.0.0');
  assert.equal(doc.game.patch,null);
  assert.equal(unmeasuredStability().percent,null);
  assert.notEqual(unmeasuredStability().percent,0);
});
