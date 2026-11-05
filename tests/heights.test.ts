import test from 'node:test';
import assert from 'node:assert/strict';
import { attachTo, placeRoot, updateSelected, exampleBunkerProject } from '../src/core/editor.ts';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { compareTemplates, heightPattern, activeTiles } from '../src/core/matching.ts';
import { parseBlueprint } from '../src/services/persistence.ts';

function make(id:string,offset:number){
 let doc=createEmptyBlueprint(id,id);
 doc=placeRoot(doc,0,'square',{x:0,y:0},'base',0)!;
 doc=attachTo(doc,0,'base',1,'triangle','neighbor',offset)!;
 return doc;
}
test('adjacent foundations allow half wall up and down',()=>{
 const a=make('a',.5),b=make('b',-.5);
 assert.equal(a.tiles[1]!.elevation,.5);assert.equal(b.tiles[1]!.elevation,-.5);
});
test('update elevation changes z without changing 2D footprint',()=>{
 const d=make('d',0),poly=d.tiles[1]!.polygon;
 const next=updateSelected(d,{type:'tile',id:'neighbor'},{elevation:.5});
 assert.deepEqual(next.tiles[1]!.polygon,poly);assert.equal(next.tiles[1]!.elevation,.5);
});
test('import preserves heights, while v0.3 records have unknown z',()=>{
 const d=make('d',.5);
 assert.equal(parseBlueprint(JSON.parse(JSON.stringify(d))).tiles[1]!.elevation,.5);
 delete d.tiles[1]!.elevation;
 assert.equal(heightPattern(parseBlueprint(d)).unknownHeights,true);
});
test('invalid foundation heights are rejected',()=>{
 for(const v of [.33,101,-101,Infinity]){
   const d=make('d',0);d.tiles[1]!.elevation=v;
   assert.throws(()=>parseBlueprint(d));
 }
});
test('same visual footprint is not enough for matching bunker height profile',()=>{
 const flat=make('flat',0),raised=make('raised',.5);
 assert.deepEqual(flat.tiles.map(x=>x.polygon),raised.tiles.map(x=>x.polygon));
 assert.notDeepEqual(heightPattern(flat).transitions,heightPattern(raised).transitions);
 const m=compareTemplates(raised,[flat,raised]);
 assert.equal(m[0]!.verdict,'height-conflict');assert.equal(m[1]!.verdict,'geometry-compatible');
});
test('sealed/open states are separate and validated',()=>{
 const d=exampleBunkerProject();
 assert.equal(parseBlueprint(d).states?.length,2);
 assert.equal(activeTiles(d,d.states![0]).length,4);
 assert.equal(activeTiles(d,d.states![1]).length,3);
 d.states![0]!.tileIds.push('missing-id');assert.throws(()=>parseBlueprint(d));
});
