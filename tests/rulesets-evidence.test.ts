import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyBlueprint,unmeasuredStability,type BuildingTile,type BuildingEdge} from '../src/core/blueprint.ts';
import {initialPolygon,edgeAt} from '../src/core/geometry.ts';
import {RAID_REFERENCE,resolveDestructionProfile,estimateRaidMethod,RAID_METHODS} from '../src/core/rulesets.ts';
import {calculateManualRaid,estimateTarget} from '../src/core/raid.ts';
import {planRaidRoutes} from '../src/core/route-planner.ts';
import {blueprintsMatchFilter,defaultMetadata,defaultFilter,hasInGameEvidence} from '../src/core/library.ts';
import {isBlueprintMetadata} from '../src/core/library-validation.ts';
import {parseBlueprint} from '../src/services/persistence.ts';

const makeTile=(kind:BuildingTile['kind']='floor',grade:BuildingTile['grade']='stone',floor=0):BuildingTile=>({
 id:'t',shape:'square',kind,floor,elevation:floor,polygon:initialPolygon('square',{x:0,y:0},100),
 grade,stability:unmeasuredStability(),observation:'observed'
});
const makeEdge=(grade:BuildingEdge['grade']='stone',insert:BuildingEdge['insert']='none',kind:BuildingEdge['kind']='wall'):BuildingEdge=>{
 const [a,b]=edgeAt(makeTile().polygon,0);
 return {id:'w',floor:0,a,b,kind,grade,insert,stability:unmeasuredStability(),observation:'observed'};
};

test('reference dataset has date, source and four method costs',()=>{
 assert.equal(RAID_REFERENCE.patch,'2026-09-03');
 assert.equal(RAID_REFERENCE.status,'external-reference');
 assert.equal(RAID_METHODS.length,4);
 assert.ok(RAID_REFERENCE.sources.every(x=>x.url.startsWith('https://')));
});
test('stone wall rates are source-attributed full HP and costed for all four methods',()=>{
 const wall=makeEdge();const r=estimateTarget(wall);
 assert.deepEqual([r.rockets,r.c4,r.satchels,r.exploAmmo],[4,2,10,185]);
 assert.equal(estimateRaidMethod(wall,'satchels').sulfur,4800);
 assert.equal(estimateRaidMethod(wall,'explo-ammo').sulfur,4625);
 assert.equal(r.status,'external-reference');assert.ok(r.sourceUrl?.startsWith('https://'));
});
test('garage door and triangle hatch cost from their own profiles, not wall material',()=>{
 assert.deepEqual(resolveDestructionProfile(makeEdge('stone','garage-door','wall-frame')).counts,{rockets:3,c4:2,satchels:9,'explo-ammo':150});
 const hatch={...makeTile('floor-frame'),floorInsert:'triangle-ladder-hatch' as const};
 assert.deepEqual(resolveDestructionProfile(hatch).counts,{rockets:2,c4:1,satchels:4,'explo-ammo':63});
 assert.match(resolveDestructionProfile(hatch).sourceUrl??'',/triangle/);
});
test('floor and foundation have separate evidence statuses',()=>{
 assert.equal(resolveDestructionProfile(makeTile('floor')).status,'external-reference');
 assert.equal(resolveDestructionProfile(makeTile('foundation')).status,'model-assumption');
});
test('unknown and twig material never receive fabricated costs',()=>{
 assert.equal(estimateTarget(makeEdge('unknown')).rockets,null);
 assert.equal(estimateTarget(makeEdge('twig')).c4,null);
});
test('custom maximum HP disables cost instead of incorrectly scaling',()=>{
 const wall={...makeEdge(),health:{current:120,max:700}};
 assert.equal(estimateTarget(wall).rockets,null);
 assert.match(estimateTarget(wall).reason??'',/abweichende maximale Lebenspunkte/i);
});
test('partly damaged pieces keep visibly qualified full-health cost',()=>{
 const wall={...makeEdge(),health:{current:200,max:500}};
 assert.equal(estimateTarget(wall).rockets,4);
 assert.match(estimateTarget(wall).reason??'',/Teilbeschädigt/);
});
test('manual four-method totals are independent and missing costs stay null',()=>{
 const doc=createEmptyBlueprint('a','Test');doc.tiles=[makeTile('floor')];doc.edges=[makeEdge('metal','garage-door','wall-frame')];
 const r=calculateManualRaid(doc,['t','w']);
 assert.equal(r.rockets,7);assert.equal(r.c4,4);
 assert.equal(r.totals.satchels.count,19);assert.equal(r.totals['explo-ammo'].sulfur,(185+150)*25);
 doc.edges[0]!.grade='unknown';doc.edges[0]!.insert='none';doc.edges[0]!.kind='window';
 assert.equal(calculateManualRaid(doc,['t','w']).totals.rockets.sulfur,null);
});
test('graph routes support all four methods, including hatch and source patch warning',()=>{
 const doc=createEmptyBlueprint('p','Route');doc.tiles=[makeTile('foundation')];doc.edges=[makeEdge('stone','garage-door','wall-frame')];
 const ammo=planRaidRoutes(doc,'t','explo-ammo');
 assert.equal(ammo.documented[0]?.methodTotal,150);
 assert.equal(ammo.documented[0]?.sulfur,3750);
 doc.game.patch='2026-10-01';
 assert.ok(planRaidRoutes(doc,'t','satchels').warnings.some(w=>w.includes('unterscheidet')));
});
test('an L4 blueprint is not automatically in-game verified',()=>{
 const doc=createEmptyBlueprint('p','L4 without evidence');doc.quality='L4';
 assert.equal(hasInGameEvidence(doc),false);
 assert.equal(blueprintsMatchFilter({key:'p',doc,origin:'imported',storedAt:''},{...defaultFilter(),verification:'in-game-tested'}),false);
});
test('patch, date, and HTTPS evidence are needed for a declared in-game test',()=>{
 const doc=createEmptyBlueprint('p','Test');const metadata=defaultMetadata();metadata.verification={status:'in-game-tested',patch:'2026-09-03',checkedAt:'2026-11-05',evidenceUrl:'https://example.org/my-test-video',notes:'Local test'};
 doc.library=metadata;
 assert.equal(hasInGameEvidence(doc),true);
 assert.equal(blueprintsMatchFilter({key:'p',doc,origin:'imported',storedAt:''},{...defaultFilter(),verification:'in-game-tested'}),true);
 assert.equal(isBlueprintMetadata(metadata),true);
 assert.equal(parseBlueprint(doc).library?.verification?.status,'in-game-tested');
 metadata.verification.evidenceUrl=null;
 assert.equal(hasInGameEvidence(doc),false);
});
test('unsafe evidence URLs and illegal verification types are rejected on import',()=>{
 const doc=createEmptyBlueprint('p','Test');const m=defaultMetadata();m.verification={status:'in-game-tested',patch:'2026-09-03',checkedAt:'2026-11-05',evidenceUrl:'javascript:alert(1)',notes:''};doc.library=m;
 assert.equal(isBlueprintMetadata(m),false);
 assert.throws(()=>parseBlueprint(doc),/Kataloginformationen/);
});
