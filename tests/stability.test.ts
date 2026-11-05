import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyBlueprint} from '../src/core/blueprint.ts';
import {placeRoot,attachTo,upsertWall} from '../src/core/editor.ts';
import {edgeAt} from '../src/core/geometry.ts';
import {createFloorFromBelow} from '../src/core/levels.ts';
import {structuralConnectivity,simulateStructuralRemoval} from '../src/core/stability.ts';

function sample(){
 let doc=createEmptyBlueprint('s','sample');
 doc=placeRoot(doc,0,'square',{x:0,y:0},'ground',0,'foundation')!;
 let result=createFloorFromBelow(doc,1,()=> 'upper');doc=result.document;
 const [a,b]=edgeAt(doc.tiles[0]!.polygon,0);
 doc=upsertWall(doc,{a,b,floor:0,distance:0,tileId:'ground',edgeIndex:0},'wall','wall1');
 return doc;
}
test('empty blueprint gives an empty, non-numeric stability result',()=>{
 const r=structuralConnectivity(createEmptyBlueprint('e','e'));
 assert.equal(r.totalCount,0);assert.equal(r.anchors.length,0);assert.equal(r.unverifiedCount,0);
});
test('foundation anchors; floor one level above only connects through a documented wall',()=>{
 const doc=sample(),r=structuralConnectivity(doc);
 assert.equal(r.nodes.ground?.status,'anchor');
 assert.equal(r.nodes.wall1?.status,'linked');
 assert.equal(r.nodes.upper?.status,'linked');
 assert.equal(r.nodes.upper?.distance,2);
});
test('absence of documented walls is uncertainty, not claimed collapse',()=>{
 const doc=sample();const res=structuralConnectivity({...doc,edges:[]});
 assert.equal(res.nodes.upper?.status,'unverified');
 assert.ok(res.warnings.some(s=>s.includes('nachweisbar')));
});
test('removing a wall marks dependent upper floor as newly unverified, source unchanged',()=>{
 const doc=sample(), original=JSON.stringify(doc);
 const impact=simulateStructuralRemoval(doc,'wall1');
 assert.deepEqual(impact.newlyUnverified,['upper']);
 assert.equal(impact.assessment,'potential-dependencies');
 assert.equal(JSON.stringify(doc),original);
});
test('removing a foundation breaks its path without claiming a real collapse',()=>{
 const doc=sample();const i=simulateStructuralRemoval(doc,'ground');
 assert.ok(i.newlyUnverified.includes('upper'));
});
test('stability measurements stay separate from graph metrics',()=>{
 const doc=sample();doc.tiles[1]!.stability.percent=67;
 const r=structuralConnectivity(doc);
 assert.equal(r.measuredCount,1);
 assert.equal(r.nodes.upper?.distance,2);
 assert.ok(!('percent' in r.nodes.upper!));
});
test('adjacent foundations share ground path even at same floor',()=>{
 let doc=createEmptyBlueprint('d','d');doc=placeRoot(doc,0,'square',{x:0,y:0},'g',0,'foundation')!;
 doc=attachTo(doc,0,'g',1,'triangle','t',0,'foundation')!;
 const r=structuralConnectivity(doc);assert.equal(r.anchors.length,2);assert.equal(r.linkedCount,2);
});
test('height-offset floor without matching wall top remains unverified',()=>{
 const doc=sample();doc.tiles[1]!.elevation=1.5;
 const r=structuralConnectivity(doc);assert.equal(r.nodes.upper?.status,'unverified');
});
test('an alternate load path prevents a false newly-unverified conclusion',()=>{
 let doc=sample();const [c,d]=edgeAt(doc.tiles[0]!.polygon,1);
 doc=upsertWall(doc,{a:c,b:d,floor:0,distance:0,tileId:'ground',edgeIndex:1},'wall','wall2');
 const i=simulateStructuralRemoval(doc,'wall1');
 assert.equal(i.newlyUnverified.length,0);
});
test('wall inserts are not treated as independent structural anchors',()=>{
 const doc=sample();doc.edges[0]!.insert='garage-door';
 const r=structuralConnectivity(doc);assert.deepEqual(r.anchors,['ground']);
});
