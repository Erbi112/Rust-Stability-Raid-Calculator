import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyBlueprint,unmeasuredStability,type BuildingTile,type BuildingEdge} from '../src/core/blueprint.ts';
import {initialPolygon,edgeAt} from '../src/core/geometry.ts';
import {calculateManualRaid,calculateMixedRaid} from '../src/core/raid.ts';
function plan(){
 const doc=createEmptyBlueprint('raid-multi','Raid Multi-Target');
 const polygon=initialPolygon('square',{x:0,y:0},100);
 const base:BuildingTile={id:'floor',shape:'square',kind:'floor',floor:0,polygon,grade:'stone',stability:unmeasuredStability(),observation:'observed'};
 const [a,b]=edgeAt(polygon,0);
 const wall:BuildingEdge={id:'wall',floor:0,a,b,kind:'wall',grade:'stone',stability:unmeasuredStability(),observation:'observed'};
 const [c,d]=edgeAt(polygon,1);
 const unknown:BuildingEdge={id:'unknown',floor:0,a:c,b:d,kind:'window',grade:'stone',stability:unmeasuredStability(),observation:'observed'};
 doc.tiles=[base];doc.edges=[wall,unknown];return doc;
}
test('two known targets sum rockets, C4, satchels and ammo',()=>{
 const result=calculateManualRaid(plan(),['floor','wall']);
 assert.deepEqual(result.totals.rockets,{count:8,sulfur:11200,knownCount:8,knownSulfur:11200,
  knownTargets:2,unknownTargets:0,totalTargets:2,complete:true});
 assert.equal(result.totals.c4.count,4);
 assert.equal(result.totals.satchels.count,20);
 assert.equal(result.totals['explo-ammo'].count,370);
});
test('unpriced target keeps known subtotal while complete total stays null',()=>{
 const r=calculateManualRaid(plan(),['wall','unknown','floor']);
 assert.equal(r.totals.rockets.count,null);assert.equal(r.totals.rockets.sulfur,null);
 assert.equal(r.totals.rockets.knownCount,8);assert.equal(r.totals.rockets.knownSulfur,11200);
 assert.equal(r.totals.rockets.knownTargets,2);assert.equal(r.totals.rockets.unknownTargets,1);
});
test('duplicated ids cannot inflate costs',()=>{
 const doc=plan();
 assert.equal(calculateManualRaid(doc,['floor','wall','floor']).totals.rockets.count,8);
 assert.equal(calculateMixedRaid(doc,[{id:'wall',method:'rockets'},{id:'floor',method:'c4'},{id:'wall',method:'rockets'}]).totalTargets,2);
});
test('deleted target stays visibly unresolved',()=>{
 const r=calculateManualRaid(plan(),['wall','missing']);
 assert.equal(r.details.length,2);
 assert.match(r.details[1]?.reason??'',/nicht mehr/);
 assert.equal(r.totals.rockets.knownCount,4);
 assert.equal(r.totals.rockets.unknownTargets,1);
});
test('mixed methods report weapon counts and combined sulfur',()=>{
 const r=calculateMixedRaid(plan(),[{id:'wall',method:'rockets'},{id:'floor',method:'c4'}]);
 assert.equal(r.totalSulfur,10000);
 assert.deepEqual(r.byMethod.rockets,{count:4,sulfur:5600,targets:1});
 assert.deepEqual(r.byMethod.c4,{count:2,sulfur:4400,targets:1});
 assert.equal(r.complete,true);
});
test('mixed plan with unknowns keeps known subtotal without fake complete total',()=>{
 const r=calculateMixedRaid(plan(),[{id:'wall',method:'satchels'},{id:'unknown',method:'c4'},{id:'floor',method:'explo-ammo'}]);
 assert.equal(r.totalSulfur,null);assert.equal(r.unknownTargets,1);
 assert.equal(r.knownTargets,2);assert.equal(r.knownSulfur,10*480+185*25);
 assert.equal(r.lines[1]?.count,null);
});
test('empty route has zero count, not missing reference',()=>{
 const manual=calculateManualRaid(plan(),[]);
 const mixed=calculateMixedRaid(plan(),[]);
 assert.equal(manual.totals.rockets.count,0);
 assert.equal(manual.totals.rockets.unknownTargets,0);
 assert.equal(mixed.totalSulfur,0);
});
