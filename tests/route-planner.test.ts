import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBlueprint, unmeasuredStability, type BlueprintDocument, type BuildingTile, type BuildingEdge } from '../src/core/blueprint.ts';
import { initialPolygon, edgeAt, type Point } from '../src/core/geometry.ts';
import { recognizeBlueprints } from '../src/core/recognition.ts';
import { planRaidRoutes, compareCandidateRaidRoutes, inverseTransformPoint, perimeterKey } from '../src/core/route-planner.ts';

const tile=(id:string,x:number,floor=0,kind:BuildingTile['kind']='foundation',grade:BuildingTile['grade']='stone'):BuildingTile=>({
 id,shape:'square',kind,floor,polygon:initialPolygon('square',{x,y:0},100),grade,elevation:floor,
 observation:'observed',stability:unmeasuredStability()
});
function wall(tile:BuildingTile,index:number,id:string,grade:BuildingEdge['grade']='stone',kind:BuildingEdge['kind']='wall',insert?:BuildingEdge['insert']):BuildingEdge{
 const [a,b]=edgeAt(tile.polygon,index);return {id,a,b,floor:tile.floor,kind,grade,insert,observation:'observed',stability:unmeasuredStability()};
}
function sample(id='base'){
 const d=createEmptyBlueprint(id,'Two rooms');
 d.tiles=[tile('left',0),tile('right',100)];
 d.edges=[wall(d.tiles[0]!,3,'left-outer','stone'),wall(d.tiles[0]!,1,'inside','metal'),
  wall(d.tiles[1]!,1,'right-garage','metal','wall-frame','garage-door')];
 return d;
}
test('best recorded route enters via garage door instead of more expensive path',()=>{
 const d=sample();const results=planRaidRoutes(d,'right','rockets');
 assert.equal(results.documented[0]?.sulfur,4200);assert.equal(results.documented[0]?.methodTotal,3);
 assert.deepEqual(results.documented[0]?.barrierIds,['right-garage']);
 assert.equal(results.documented[0]?.uncertainSteps,0);
});
test('C4 objective uses C4 counts and sulfur, changing the reference comparison',()=>{
 const d=sample();const r=planRaidRoutes(d,'right','c4');
 assert.equal(r.documented[0]?.sulfur,4400);assert.equal(r.documented[0]?.methodTotal,2);
});
test('missing edge is not a guaranteed free way inside',()=>{
 const d=sample();d.edges=d.edges.filter(e=>e.id!=='right-garage');
 const r=planRaidRoutes(d,'right','rockets');
 assert.equal(r.documented[0]?.sulfur,16800); // stone exterior + metal interior
 assert.ok(r.exploratory.some(x=>x.uncertainSteps>0));
});
test('unrecorded edges give conditional routes and never claim a sulfur total',()=>{
 const d=createEmptyBlueprint('x','Unknown');d.tiles=[tile('alone',0)];
 const r=planRaidRoutes(d,'alone');assert.equal(r.documented.length,0);
 assert.equal(r.exploratory[0]?.status,'conditional');assert.equal(r.exploratory[0]?.sulfur,null);
 assert.equal(r.exploratory[0]?.knownSulfur,0);
});
test('missing grade makes that wall a conditional crossing',()=>{
 const d=createEmptyBlueprint('x','Unknown grade');d.tiles=[tile('t',0)];d.edges=[wall(d.tiles[0]!,0,'u','unknown')];
 const r=planRaidRoutes(d,'t');assert.equal(r.documented.length,0);assert.equal(r.exploratory[0]?.methodTotal,null);
});
test('documented open doorway passes at no explosive cost',()=>{
 const d=createEmptyBlueprint('x','Open');d.tiles=[tile('t',0)];d.edges=[wall(d.tiles[0]!,0,'door-open','wood','doorway','none')];
 const r=planRaidRoutes(d,'t');assert.equal(r.documented[0]?.sulfur,0);assert.equal(r.documented[0]?.methodTotal,0);
});
test('vertical floor breach is modelled only for aligned adjacent elevations',()=>{
 const d=createEmptyBlueprint('x','Stack');d.tiles=[tile('low',0,0),tile('up',0,1,'floor','stone')];
 d.edges=[wall(d.tiles[0]!,0,'entry','wood')];
 const r=planRaidRoutes(d,'up');assert.equal(r.documented[0]?.methodTotal,6);
 assert.deepEqual(r.documented[0]?.barrierIds,['entry','up']);
 d.tiles[1]={...d.tiles[1]!,elevation:1.5};
 assert.equal(planRaidRoutes(d,'up').documented.length,0);
});
test('an empty frame with hatch permits access at the hatch cost',()=>{
 const d=createEmptyBlueprint('x','Hatch');d.tiles=[tile('low',0,0),{...tile('up',0,1,'floor-frame'),floorInsert:'ladder-hatch'}];
 d.edges=[wall(d.tiles[0]!,0,'entry','wood')];
 assert.equal(planRaidRoutes(d,'up').documented[0]?.methodTotal,4);
});
test('non-existent or wrong target returns diagnostics and no made-up route',()=>{
 const d=sample();const r=planRaidRoutes(d,'lootbox');assert.equal(r.documented.length,0);
 assert.ok(r.warnings.some(x=>x.includes('Ziel')));
});
test('small comparisons preserve candidate-specific route costs and minimax shared entry',()=>{
 const observed=sample('obs');
 const d1=sample('c1');d1.name='candidate one';
 const d2=sample('c2');d2.name='candidate two';
 for(const t of d2.tiles)t.polygon=t.polygon.map(p=>({x:p.x+400,y:p.y+200}));
 for(const e of d2.edges){e.a={x:e.a.x+400,y:e.a.y+200};e.b={x:e.b.x+400,y:e.b.y+200};}
 const candidates=[{key:'c1',doc:d1},{key:'c2',doc:d2}];
 const recognition=recognizeBlueprints(observed,candidates);
 assert.ok(recognition.every(x=>x.status==='compatible'));
 const combined=compareCandidateRaidRoutes(observed,'right',candidates.map(candidate=>({candidate,recognition:recognition.find(x=>x.key===candidate.key)!})));
 assert.equal(combined.comparisons.length,2);assert.ok(combined.shared);
 assert.equal(combined.shared!.worstSulfur,4200);
 assert.equal(combined.shared!.perCandidate.length,2);
});
test('unmapped goal prevents a fabricated common strategy',()=>{
 const observed=sample('obs'),c=sample('c');const candidates=[{key:'c',doc:c}];
 const m=recognizeBlueprints(observed,candidates);
 const result=compareCandidateRaidRoutes(observed,'other',candidates.map(candidate=>({candidate,recognition:m[0]!})));
 assert.equal(result.shared,null);assert.equal(result.comparisons[0]?.status,'unmapped');
});
test('invert transform handles rotation, reflection and translation',()=>{
 for(const mirror of [false,true]){
  const t={cos:0,sin:1,mirror,tx:100,ty:-200,floorShift:0};
  const original={x:25,y:75},transformed={x:-original.y+t.tx,y:(mirror?-original.x:original.x)+t.ty};
  const inverse=inverseTransformPoint(transformed,t);
  assert.ok(Math.abs(inverse.x-original.x)<1e-9&&Math.abs(inverse.y-original.y)<1e-9);
 }
});
test('perimeter keys do not depend on edge orientation',()=>{
 const a:Point={x:0,y:0},b:Point={x:100,y:0};
 assert.equal(perimeterKey(a,b,0),perimeterKey(b,a,0));
 assert.notEqual(perimeterKey(a,b,0),perimeterKey(a,b,1));
});
