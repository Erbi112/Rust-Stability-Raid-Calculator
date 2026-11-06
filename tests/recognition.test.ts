import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { placeRoot,attachTo,upsertWall } from '../src/core/editor.ts';
import {edgeAt,type Point} from '../src/core/geometry.ts';
import {recognizeBlueprints} from '../src/core/recognition.ts';
import type {BlueprintDocument} from '../src/core/blueprint.ts';

function demo(name:string):BlueprintDocument {
 let doc=createEmptyBlueprint(name,name);
 doc=placeRoot(doc,0,'square',{x:0,y:0},'center',0)!;
 doc=attachTo(doc,0,'center',0,'triangle','top',0)!;
 doc=attachTo(doc,0,'center',1,'square','side',.5)!;
 doc=attachTo(doc,0,'side',1,'triangle','nose',0)!;
 doc=placeRoot(doc,1,'square',{x:0,y:0},'upper',1)!;
 doc.quality='L3';return doc;
}
function run(o:BlueprintDocument,c:BlueprintDocument){return recognizeBlueprints(o,[{key:c.id,doc:c}])[0]!;}
function rotate(doc:BlueprintDocument,angle:number,shift:Point,mirror=false):BlueprintDocument {
 const a=Math.cos(angle),b=Math.sin(angle);
 const apply=(p:Point):Point=>({x:(mirror?-p.x:p.x)*a-p.y*b+shift.x,y:(mirror?-p.x:p.x)*b+p.y*a+shift.y});
 return {...doc,tiles:doc.tiles.map(t=>({...t,polygon:t.polygon.map(apply)})),edges:doc.edges.map(e=>({...e,a:apply(e.a),b:apply(e.b)}))};
}

test('exact known geometry matches all observed tiles without claiming probability',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs'};
 const res=run(obs,base);
 assert.equal(res.status,'compatible');assert.equal(res.matchedTiles,5);
 assert.equal(res.untestedTiles,0);assert.equal(res.checkedHeights,4);
});
test('recognizes same base rotated and translated',()=>{
 const base=demo('original'),obs=rotate({...structuredClone(base),id:'obs'},Math.PI/3,{x:850,y:-300});
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.matchedTiles,5);
});
test('recognizes mirrored blueprint, not just rotated',()=>{
 const base=demo('original'),obs=rotate({...structuredClone(base),id:'obs'},.2,{x:124,y:-391},true);
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.matchedTiles,5);
});
test('partial observed footprint is allowed even if template has other unobserved rooms',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs',tiles:base.tiles.slice(0,2),edges:[]};
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.matchedTiles,2);
});
test('wrong unknown tile does not cause false confirmed compatibility',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs'};
 obs.tiles[2]={...obs.tiles[2]!,polygon:obs.tiles[2]!.polygon.map(p=>({x:p.x+520,y:p.y+900}))};
 const res=run(obs,base);assert.equal(res.status,'conflict');assert.equal(res.untestedTiles,1);
});
test('mismatched measured relative foundation heights are conflicts',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs'};
 obs.tiles[2]={...obs.tiles[2]!,elevation:1.5};
 const res=run(obs,base);assert.equal(res.status,'conflict');assert.ok(res.heightConflicts>0);
});
test('unknown candidate heights remain untested, not false negatives',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs'};
 base.tiles[2]={...base.tiles[2]!,elevation:undefined};
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.heightConflicts,0);assert.equal(res.checkedHeights,3);
});
test('observed door conflicting with documented window gets flagged',()=>{
 let base=demo('original');const tile=base.tiles[0]!;const [a,b]=edgeAt(tile.polygon,3);
 base=upsertWall(base,{a,b,floor:0,distance:0,tileId:tile.id,edgeIndex:3},'window','w1');
 const obs={...structuredClone(base),id:'obs',edges:base.edges.map(e=>({...e,kind:'doorway' as const}))};
 const res=run(obs,base);assert.equal(res.status,'conflict');assert.equal(res.edgeConflicts,1);
});
test('missing candidate door details count as untested, never an invented wall',()=>{
 let base=demo('original');const tile=base.tiles[0]!;const [a,b]=edgeAt(tile.polygon,3);
 const obs=upsertWall({...structuredClone(base),id:'obs'}, {a,b,floor:0,distance:0,tileId:tile.id,edgeIndex:3},'doorway','door');
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.checkedEdges,0);
});
test('a template can match an observed higher floor by a consistent floor shift',()=>{
 const base=demo('original');const obs={...structuredClone(base),id:'obs',tiles:base.tiles.slice(0,3).map(t=>({...t,floor:t.floor+3,elevation:(t.elevation??0)+3}))};
 const res=run(obs,base);assert.equal(res.status,'compatible');assert.equal(res.matchedTiles,3);
});
test('sealed and open variants are compared separately',()=>{
 const base=demo('original');
 base.states=[{id:'open',label:'Geöffnet',purpose:'open',tileIds:base.tiles.slice(0,2).map(t=>t.id),edgeIds:[],notes:''}];
 const obs={...structuredClone(base),id:'obs',tiles:base.tiles.slice(0,2)};
 const res=run(obs,base);assert.equal(res.matchedTiles,2);assert.ok(res.variantLabel);
});
test('no observations result in no evidence rather than perfect match',()=>{
 const base=demo('original');const obs=createEmptyBlueprint('obs','test');
 const res=run(obs,base);assert.equal(res.status,'no-evidence');assert.equal(res.matchedTiles,0);
});
test('hypothetical observations do not make matching look more certain',()=>{
 const base=demo('original'),obs={...structuredClone(base),id:'obs'};
 obs.tiles[4]={...obs.tiles[4]!,observation:'hypothesized'};
 const res=run(obs,base);assert.equal(res.observedTiles,4);assert.equal(res.matchedTiles,4);
});
test('same id candidate is suppressed to avoid self-match',()=>{
 const base=demo('original');assert.equal(recognizeBlueprints(base,[{key:'same',doc:base}]).length,0);
});
