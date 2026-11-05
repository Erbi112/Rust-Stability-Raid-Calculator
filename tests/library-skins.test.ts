import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultMetadata, defaultFilter, blueprintsMatchFilter, compareLibraryBase, metadataOf, GROUPS, FEATURE_KEYS, type LibraryEntry } from '../src/core/library.ts';
import { isBlueprintMetadata } from '../src/core/library-validation.ts';
import { BUILDING_SKINS, isBuildingSkinId, skinCompatible, skinsForGrade } from '../src/core/skins.ts';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { placeRoot, updateSelected } from '../src/core/editor.ts';
import { parseBlueprint } from '../src/services/persistence.ts';
function makeEntry(){let doc=createEmptyBlueprint('sample','Custom Solo Bunker');doc=placeRoot(doc,0,'square',{x:0,y:0},'f0')!;doc.library={...defaultMetadata(),group:'solo',role:'bunker',bunker:'stability',features:{externalTC:'no',honeycomb:'yes'}};const entry:LibraryEntry={key:'sample',doc,storedAt:'2026-11-05',origin:'local'};return entry;}
test('classification includes requested solo/duo/squad/clan levels',()=>{
 for(const group of ['solo','duo','squad','clan'])assert.ok(GROUPS.includes(group as typeof GROUPS[number]));
});
test('requested advanced filters exist',()=>{
 for(const key of ['externalTC','multiTC','honeycomb','stabilityBunker','roofBunker','offsetFoundations','wideGap'])assert.ok(FEATURE_KEYS.includes(key as typeof FEATURE_KEYS[number]));
});
test('unknown is different from explicit no',()=>{
 const e=makeEntry(),f=defaultFilter();f.feature='multiTC';f.featureValue='no';assert.equal(blueprintsMatchFilter(e,f),false);
 f.feature='externalTC';assert.equal(blueprintsMatchFilter(e,f),true);f.featureValue='yes';assert.equal(blueprintsMatchFilter(e,f),false);
});
test('group, bunker role and search are AND-constrained',()=>{
 const e=makeEntry(),f=defaultFilter();f.group='solo';f.role='bunker';f.bunker='stability';f.query='custom';assert.equal(blueprintsMatchFilter(e,f),true);
 f.group='clan';assert.equal(blueprintsMatchFilter(e,f),false);
});
test('upkeep unknown is excluded from maximum upkeep filter',()=>{
 const e=makeEntry(),f=defaultFilter();f.upkeepMax=6000;assert.equal(blueprintsMatchFilter(e,f),false);
 e.doc.library!.upkeep24h=5100;assert.equal(blueprintsMatchFilter(e,f),true);f.upkeepMax=5000;assert.equal(blueprintsMatchFilter(e,f),false);
});
test('floor range and material filtering remain geometry-derived',()=>{
 const e=makeEntry(),f=defaultFilter();f.floorsMin=2;assert.equal(blueprintsMatchFilter(e,f),false);
 f.floorsMin=1;f.grade='stone';assert.equal(blueprintsMatchFilter(e,f),true);
});
test('source and grade metadata validates on import',()=>{
 const e=makeEntry();assert.equal(isBlueprintMetadata(e.doc.library),true);assert.equal(parseBlueprint(e.doc).library?.group,'solo');
 const invalid=structuredClone(e.doc);invalid.library!.features.externalTC='yes';(invalid.library!.features as Record<string,string>).fakeFeature='yes';
 assert.throws(()=>parseBlueprint(invalid),/Kataloginformationen/);
});
test('official building skin registry has eight tier-compatible names plus default',()=>{
 assert.equal(BUILDING_SKINS.length,9);assert.equal(skinsForGrade('stone').length,6);
 for(const id of ['adobe','brick','brutalist','jungle','crypt','legacy-wood','shipping-container','space-station'])assert.equal(isBuildingSkinId(id),true);
 assert.equal(skinCompatible('brick','stone'),true);assert.equal(skinCompatible('brick','metal'),false);
});
test('editing skin keeps other fields and rejects invalid tier',()=>{
 const e=makeEntry();const s={type:'tile' as const,id:'f0'};
 const added=updateSelected(e.doc,s,{skinId:'brick'});assert.equal(added.tiles[0]?.skinId,'brick');
 const rejected=updateSelected(added,s,{skinId:'shipping-container'});assert.equal(rejected.tiles[0]?.skinId,'brick');
 const upgraded=updateSelected(added,s,{grade:'metal'});assert.equal(upgraded.tiles[0]?.skinId,'default');
});
test('blueprint with invalid skin is rejected by parser',()=>{
 const e=makeEntry();e.doc.tiles[0]!.skinId='brick';assert.ok(parseBlueprint(e.doc));
 const invalid=structuredClone(e.doc);invalid.tiles[0]!.grade='wood';assert.throws(()=>parseBlueprint(invalid),/Bauteil/);
});
test('similarity score is bounded and explicitly marked non-probabilistic',()=>{
 const e=makeEntry(),r=compareLibraryBase(e.doc,[e]);assert.equal(r.length,1);assert.equal(r[0]?.score,100);
 assert.equal(r[0]?.confidence,'coarse-structure-only');
});
test('empty metadata yields unknown, not false',()=>{
 const doc=createEmptyBlueprint('e','Unknown');const m=metadataOf(doc);
 assert.equal(m.features.externalTC,undefined);assert.equal(m.bunker,'unknown');
});

test('extended categories include compound, utility, external TC and bunker details',()=>{
 for(const key of ['floorStack','wallStack','airlock','industrialConveyor','disconnectableTC','offsetFoundations','shootingFloor','outerPeakdowns','samSites','offlineDefense','stabilityBunker','roofBunker']){
  assert.ok(FEATURE_KEYS.includes(key as typeof FEATURE_KEYS[number]),key);
 }
});
test('multiple feature constraints combine with AND; unknown is not no',()=>{
 const e=makeEntry(); const f=defaultFilter();
 f.featureConstraints={externalTC:'no',honeycomb:'yes'};
 assert.equal(blueprintsMatchFilter(e,f),true);
 f.featureConstraints={externalTC:'no',honeycomb:'no'};
 assert.equal(blueprintsMatchFilter(e,f),false);
 f.featureConstraints={externalTC:'unknown'};
 assert.equal(blueprintsMatchFilter(e,f),false);
 f.featureConstraints={multiTC:'unknown'};
 assert.equal(blueprintsMatchFilter(e,f),true);
 f.featureConstraints={multiTC:'no'};
 assert.equal(blueprintsMatchFilter(e,f),false);
});
test('multiple team-size filters are OR while bunker type and external TC are AND',()=>{
 const e=makeEntry(),f=defaultFilter();
 e.doc.library!.supportedGroups=['duo','trio'];
 f.groups=['solo','squad']; f.bunker='stability'; f.featureConstraints={externalTC:'no'};
 assert.equal(blueprintsMatchFilter(e,f),true);
 f.groups=['squad','clan'];assert.equal(blueprintsMatchFilter(e,f),false);
 f.groups=['duo','clan'];assert.equal(blueprintsMatchFilter(e,f),true);
 f.bunker='roof';assert.equal(blueprintsMatchFilter(e,f),false);
});
test('supplemental numeric categories require known values',()=>{
 const e=makeEntry(),f=defaultFilter();
 f.externalTCMin=2;assert.equal(blueprintsMatchFilter(e,f),false);
 e.doc.library!.externalTCCount=1;assert.equal(blueprintsMatchFilter(e,f),false);
 e.doc.library!.externalTCCount=3;assert.equal(blueprintsMatchFilter(e,f),true);
 f.buildCostStoneMax=10000;assert.equal(blueprintsMatchFilter(e,f),false);
 e.doc.library!.buildCostStone=8000;assert.equal(blueprintsMatchFilter(e,f),true);
});
test('new metadata fields roundtrip and reject invalid catalog data',()=>{
 const e=makeEntry();
 e.doc.library={...e.doc.library!,footprint:'2x2',stage:'expandable',defense:'offline',supportedGroups:['solo','duo'],externalTCCount:2,buildCostStone:9000,features:{externalTC:'yes',floorStack:'unknown'}};
 assert.equal(isBlueprintMetadata(e.doc.library),true);
 const copied=parseBlueprint(structuredClone(e.doc));
 assert.equal(copied.library?.supportedGroups?.[1],'duo');
 assert.equal(copied.library?.features.floorStack,'unknown');
 const invalid=structuredClone(e.doc);invalid.library!.supportedGroups=['solo','solo'];
 assert.equal(isBlueprintMetadata(invalid.library),false);
 const invalidCost=structuredClone(e.doc);invalidCost.library!.buildCostStone=-2;
 assert.equal(isBlueprintMetadata(invalidCost.library),false);
});
