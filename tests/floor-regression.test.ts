import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { placeRoot, attachTo } from '../src/core/editor.ts';
import { proposedElevation, createFloorFromBelow, misplacedUpperTiles, repairMisplacedUpperTiles, tileHeight, elevationToMeters } from '../src/core/levels.ts';

let id=0;const uid=()=>`floor-test-${++id}`;
test('F1 placed over F0 starts at one wall-height above foundation',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),0)!;
 assert.equal(proposedElevation(d,1,{x:0,y:0}),1);
 assert.equal(elevationToMeters(proposedElevation(d,1,{x:0,y:0})),3);
 d=placeRoot(d,1,'square',{x:0,y:0},uid(),proposedElevation(d,1,{x:0,y:0}))!;
 assert.equal(tileHeight(d.tiles[0]!),0);assert.equal(tileHeight(d.tiles[1]!),1);
});
test('F1 inherits half-wall offset from an elevated F0 foundation',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),.5)!;
 assert.equal(proposedElevation(d,1,{x:0,y:0}),1.5);
 assert.equal(proposedElevation(d,1,{x:0,y:0},-.5),1);
});
test('floor copy produces floor pieces on F1, preserves footprint & staggered heights',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),0)!;
 d=attachTo(d,0,d.tiles[0]!.id,1,'triangle',uid(),.5)!;
 const copied=createFloorFromBelow(d,1,uid);
 assert.equal(copied.added,2);
 const upper=copied.document.tiles.filter(t=>t.floor===1);
 assert.deepEqual(upper.map(t=>t.elevation),[1,1.5]);
 assert.deepEqual(upper.map(t=>t.kind),['floor','floor']);
 assert.deepEqual(upper[0]!.polygon,d.tiles[0]!.polygon);
 const duplicate=createFloorFromBelow(copied.document,1,uid);
 assert.equal(duplicate.added,0);assert.equal(duplicate.skipped,2);
});
test('floor copy skips occupied regions without replacing user geometry',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),0)!;
 d=placeRoot(d,1,'square',{x:0,y:0},uid(),1.25)!;
 assert.equal(createFloorFromBelow(d,1,uid).added,0);
 assert.equal(createFloorFromBelow(d,1,uid).document,d);
});
test('legacy overlap can be repaired explicitly but is never changed without action',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),0)!;
 d=placeRoot(d,1,'square',{x:0,y:0},uid(),0)!;
 assert.equal(misplacedUpperTiles(d).length,1);
 assert.equal(d.tiles[1]!.elevation,0);
 const fixed=repairMisplacedUpperTiles(d);
 assert.equal(fixed.repaired,1);assert.equal(fixed.document.tiles[1]!.elevation,1);
 assert.equal(d.tiles[1]!.elevation,0);
 assert.equal(repairMisplacedUpperTiles(fixed.document).repaired,0);
});
test('explicit unusual elevated/lowered foundations are left unchanged',()=>{
 let d=createEmptyBlueprint('t','test');d=placeRoot(d,0,'square',{x:0,y:0},uid(),-.5)!;
 d=placeRoot(d,1,'square',{x:0,y:0},uid(),.5)!;
 assert.equal(misplacedUpperTiles(d).length,0);
 assert.equal(repairMisplacedUpperTiles(d).document,d);
});

test('legacy three-floor stack repairs from bottom to top without a second overlap',()=>{
 let d=createEmptyBlueprint('t','test');
 d=placeRoot(d,0,'square',{x:0,y:0},uid(),0)!;
 d=placeRoot(d,1,'square',{x:0,y:0},uid(),0)!;
 d=placeRoot(d,2,'square',{x:0,y:0},uid(),0)!;
 const fixed=repairMisplacedUpperTiles(d);
 assert.equal(fixed.repaired,2);
 assert.deepEqual(fixed.document.tiles.map(tileHeight),[0,1,2]);
});
