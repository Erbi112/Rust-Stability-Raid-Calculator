import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { edgeAt, overlapsArea } from '../src/core/geometry.ts';
import { attachTo, edgeExists, exampleProject, findEdgeAt, findEdgeRecord, findTileAt,
  nearSlot, placeRoot, removeEntity, slotsFor, stats, updateSelected, upsertWall } from '../src/core/editor.ts';
import { parseBlueprint } from '../src/services/persistence.ts';

const make=()=>placeRoot(createEmptyBlueprint('local','Test'),0,'triangle',{x:0,y:0},'T1')!;
test('first triangle supports correctly angled square on every edge',()=>{
  const doc=make();
  for(let edge=0;edge<3;edge++){
    const result=attachTo(doc,0,'T1',edge,'square',`S${edge}`);
    assert.ok(result);
    assert.equal(result.tiles.length,2);
    assert.equal(overlapsArea(doc.tiles[0]!.polygon,result.tiles[1]!.polygon),false);
  }
});
test('cannot attach duplicate footprint to occupied edge',()=>{
  const doc=make(),added=attachTo(doc,0,'T1',1,'square','S1')!;
  assert.equal(attachTo(added,0,'T1',1,'square','S2'),null);
});
test('slot selection honors exact clicked polygon and avoids distant placement',()=>{
  const doc=make(),slots=slotsFor(doc,0,'square');
  assert.equal(slots.length,3);
  assert.equal(nearSlot(slots,slots[0]!.center)?.sourceId,'T1');
  assert.equal(nearSlot(slots,{x:10000,y:10000}),null);
});
test('wall on real polygon edge is unique, doorway can replace wall',()=>{
  const doc=make(),polygon=doc.tiles[0]!.polygon,[a,b]=edgeAt(polygon,0);
  const target={a,b,floor:0,distance:0,tileId:'T1',edgeIndex:0};
  const withWall=upsertWall(doc,target,'wall','W1');
  const withDoor=upsertWall(withWall,target,'doorway','W2');
  assert.equal(withDoor.edges.length,1);
  assert.equal(withDoor.edges[0]!.kind,'doorway');
  assert.equal(findEdgeRecord(withDoor,target)?.id,'W1');
  assert.equal(edgeExists(withDoor,0,a,b),true);
  assert.ok(findEdgeAt(withDoor,0,a));
});
test('removing last supporting tile cleans up its attached edges',()=>{
  const doc=make(),[a,b]=edgeAt(doc.tiles[0]!.polygon,0);
  const populated=upsertWall(doc,{a,b,floor:0,distance:0,tileId:'T1',edgeIndex:0},'wall','W1');
  const next=removeEntity(populated,{type:'tile',id:'T1'});
  assert.equal(next.tiles.length,0);assert.equal(next.edges.length,0);
});
test('measurements keep unknown different from measured zero',()=>{
  const doc=make();
  assert.equal(doc.tiles[0]!.stability.percent,null);
  const measured=updateSelected(doc,{type:'tile',id:'T1'},{stability:0});
  assert.equal(measured.tiles[0]!.stability.percent,0);
  const cleared=updateSelected(measured,{type:'tile',id:'T1'},{stability:null});
  assert.equal(cleared.tiles[0]!.stability.percent,null);
});
test('independent floors; sample has valid multilevel geometry',()=>{
  const sample=exampleProject();
  assert.equal(stats(sample,0).tiles>=8,true);
  assert.equal(stats(sample,1).tiles,2);
  assert.equal(findTileAt(sample,1,{x:-50,y:-50})?.id,'F1');
  assert.equal(parseBlueprint(sample).tiles.length,sample.tiles.length);
});
test('roundtrip JSON import validates real schema',()=>{
  const doc=make();
  const imported=parseBlueprint(JSON.parse(JSON.stringify(doc)));
  assert.equal(imported.tiles.length,1);
  assert.deepEqual(imported.tiles[0]!.polygon,doc.tiles[0]!.polygon);
});
test('invalid imports block overlap and malformed stability',()=>{
  const doc=make();
  assert.throws(()=>parseBlueprint({...doc,tiles:[...doc.tiles,{...doc.tiles[0],id:'T2'}]}),/Überlappende/);
  assert.throws(()=>parseBlueprint({...doc,tiles:[{...doc.tiles[0],stability:{...doc.tiles[0]!.stability,percent:125}}]}),/Ungültiges/);
});
test('stability is not simulated from unrelated geometry',()=>{
  const doc=exampleProject();
  assert.equal(doc.tiles.filter(t=>t.stability.percent!==null).length,1);
  assert.equal(doc.game.patch,null);
});
test('import rejects polygons that are not Rust square / equilateral tile geometry',()=>{
  const doc=make();
  assert.throws(()=>parseBlueprint({...doc,tiles:[{...doc.tiles[0],polygon:[
    {x:0,y:0},{x:100,y:0},{x:40,y:80}
  ]}]}),/Ungültiges/);
});
test('floor-level stress test rejects every interior collision in a generated chain',()=>{
  let doc=placeRoot(createEmptyBlueprint('stress','Stress'),0,'square',{x:0,y:0},'root')!;
  for(let step=0;step<120;step++){
    const candidates=slotsFor(doc,0,step%2===0?'triangle':'square');
    if(!candidates.length)break;
    const c=candidates[(step*7)%candidates.length]!;
    const next=attachTo(doc,0,c.sourceId,c.edgeIndex,step%2===0?'triangle':'square',`n${step}`);
    assert.ok(next);
    doc=next;
  }
  const arr=doc.tiles;
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
    assert.equal(overlapsArea(arr[i]!.polygon,arr[j]!.polygon),false);
  }
  assert.equal(parseBlueprint(doc).tiles.length,doc.tiles.length);
});
