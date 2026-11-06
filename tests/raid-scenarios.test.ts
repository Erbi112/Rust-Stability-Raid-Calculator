import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyBlueprint,unmeasuredStability,type BuildingEdge,type BuildingTile} from '../src/core/blueprint.ts';
import {initialPolygon,edgeAt} from '../src/core/geometry.ts';
import {addRaidScenario,removeRaidScenario,compareRaidScenarios,isRaidScenarioList} from '../src/core/scenarios.ts';
import {parseBlueprint} from '../src/services/persistence.ts';

function fixture(){
 const doc=createEmptyBlueprint('scenario-test','Test Base');
 const poly=initialPolygon('square',{x:0,y:0},100);
 const floor:BuildingTile={id:'floor',shape:'square',kind:'floor',floor:0,
  polygon:poly,grade:'stone',stability:unmeasuredStability(),observation:'observed'};
 const [a,b]=edgeAt(poly,0),[c,d]=edgeAt(poly,1),[e,f]=edgeAt(poly,2);
 const part=(id:string,kind:BuildingEdge['kind'],a:BuildingEdge['a'],b:BuildingEdge['b']):BuildingEdge=>({
  id,kind,a,b,floor:0,grade:'stone',insert:'none',stability:unmeasuredStability(),observation:'observed'
 });
 doc.tiles=[floor];
 doc.edges=[part('wall','wall',a,b),part('door','doorway',c,d),part('window','window',e,f)];
 return doc;
}
const selected=[{id:'wall',method:'rockets' as const},{id:'door',method:'c4' as const}];
const savedAt='2026-11-07T00:00:00.000Z';
test('saves manual scenario with per-target methods and preserves blueprints',()=>{
 const doc=fixture();const changed=addRaidScenario(doc,'  Hauptweg  ',selected,'floor','variant-a',savedAt);
 assert.equal(doc.raidScenarios,undefined);
 assert.equal(changed.raidScenarios?.[0]?.name,'Hauptweg');
 assert.deepEqual(changed.raidScenarios?.[0]?.entries,selected);
 assert.equal(changed.raidScenarios?.[0]?.targetRoomId,'floor');
 assert.equal(changed.edges.length,3);
});
test('two different methods can be compared and ranked by complete sulfur cost',()=>{
 let doc=fixture();
 doc=addRaidScenario(doc,'Rockets',selected,'floor','rocket',savedAt);
 doc=addRaidScenario(doc,'C4',[{id:'wall',method:'c4'}],'floor','c4',savedAt);
 const rows=compareRaidScenarios(doc);
 assert.equal(rows[0]?.name,'C4');
 assert.equal(rows[0]?.totalSulfur,4400);
 assert.equal(rows[0]?.rank,1);
 assert.equal(rows[1]?.name,'Rockets');
 assert.equal(rows[1]?.totalSulfur,5600);
 assert.equal(rows[1]?.freePassages,1);
 assert.equal(rows[1]?.rank,2);
});
test('unknown selected element produces no fake rank or total',()=>{
 let doc=fixture();doc=addRaidScenario(doc,'Unknown',[{id:'wall',method:'rockets'},{id:'window',method:'c4'}],null,'u',savedAt);
 const r=compareRaidScenarios(doc)[0]!;
 assert.equal(r.complete,false);assert.equal(r.rank,null);assert.equal(r.totalSulfur,null);
 assert.equal(r.knownSulfur,5600);assert.equal(r.unknownTargets,1);
});
test('deleted referenced element invalidates stored cost without removing scenario',()=>{
 let doc=fixture();doc=addRaidScenario(doc,'Future',selected,'floor','v',savedAt);
 doc={...doc,edges:doc.edges.filter(e=>e.id!=='wall')};
 const comparison=compareRaidScenarios(doc)[0]!;
 assert.equal(comparison.complete,false);assert.equal(comparison.unknownTargets,1);
 assert.equal(doc.raidScenarios?.[0]?.entries[0]?.id,'wall');
});
test('missing target room invalidates scenario, even with known target costs',()=>{
 let doc=fixture();doc=addRaidScenario(doc,'Core',[{id:'wall',method:'rockets'}],'removed-room','v',savedAt);
 const r=compareRaidScenarios(doc)[0]!;
 assert.equal(r.totalSulfur,null);assert.equal(r.rank,null);assert.equal(r.unknownTargets,1);
});
test('saved scenarios are accepted by JSON import and legacy blueprints still load',()=>{
 const original=fixture();
 assert.equal(parseBlueprint(original).raidScenarios,undefined);
 const doc=addRaidScenario(original,'Test',selected,null,'x',savedAt);
 const imported=parseBlueprint(JSON.parse(JSON.stringify(doc)));
 assert.equal(imported.raidScenarios?.length,1);
 assert.equal(compareRaidScenarios(imported)[0]?.totalSulfur,5600);
});
test('invalid method, duplicate IDs and invalid names are rejected at import',()=>{
 const doc=addRaidScenario(fixture(),'X',selected,null,'x',savedAt);
 const bad=JSON.parse(JSON.stringify(doc));
 bad.raidScenarios[0].entries[0].method='firework';
 assert.throws(()=>parseBlueprint(bad),/Raid-Varianten/);
 bad.raidScenarios[0].entries[0].method='rockets';
 bad.raidScenarios[0].entries.push({...bad.raidScenarios[0].entries[0]});
 assert.equal(isRaidScenarioList(bad.raidScenarios),false);
 assert.throws(()=>parseBlueprint(bad),/Raid-Varianten/);
 bad.raidScenarios[0].entries.pop();
 bad.raidScenarios[0].name=' ';
 assert.throws(()=>parseBlueprint(bad),/Raid-Varianten/);
});
test('saving an empty scenario fails while duplicate target IDs are deduplicated',()=>{
 const doc=fixture();
 assert.throws(()=>addRaidScenario(doc,'empty',[],null,'empty',savedAt),/1 bis 150/);
 const saved=addRaidScenario(doc,'dedupe',[selected[0]!,selected[0]!],null,'d',savedAt);
 assert.equal(saved.raidScenarios?.[0]?.entries.length,1);
});
test('removing one scenario never modifies other blueprint parts',()=>{
 const doc=addRaidScenario(fixture(),'A',selected,null,'a',savedAt);
 const next=removeRaidScenario(doc,'a');
 assert.equal(next.raidScenarios?.length,0);
 assert.equal(next.tiles.length,1);assert.equal(next.edges.length,3);
 assert.equal(removeRaidScenario(next,'missing'),next);
});
test('no more than 24 scenarios may be saved or imported',()=>{
 let doc=fixture();
 for(let i=0;i<24;i++)doc=addRaidScenario(doc,'Route '+i,[selected[0]!],null,'route-'+i,savedAt);
 assert.equal(isRaidScenarioList(doc.raidScenarios),true);
 assert.throws(()=>addRaidScenario(doc,'Overflow',selected,null,'extra',savedAt),/Maximal 24/);
 assert.equal(isRaidScenarioList([...doc.raidScenarios!,doc.raidScenarios![0]!]),false);
});
