import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_GROUPS, getCatalogPiece } from '../src/core/catalog.ts';
import { calculateManualRaid, estimateTarget } from '../src/core/raid.ts';
import { createEmptyBlueprint, unmeasuredStability } from '../src/core/blueprint.ts';
import { placeRoot, attachTo } from '../src/core/editor.ts';

test('catalog entries unique, grouped, and every entry directly usable',()=>{
 assert.ok(CATALOG.length>=24);
 assert.equal(new Set(CATALOG.map(p=>p.id)).size,CATALOG.length);
 assert.ok(CATALOG_GROUPS.length>=5);
 for(const p of CATALOG){
   assert.ok(getCatalogPiece(p.id));
   if(p.category==='tile'){assert.ok(p.shape&&p.tileKind);}
   if(p.category==='edge'){assert.ok(p.edgeKind);}
   if(p.category==='insert'){assert.ok(p.insert);}
 }
});
test('can choose triangle as the first tile of a roof or floor',()=>{
 let d=createEmptyBlueprint('a','Triangle start');
 d=placeRoot(d,0,'triangle',{x:0,y:0},'t1',0,'foundation')!;
 assert.equal(d.tiles[0]!.shape,'triangle');
 d=attachTo(d,0,'t1',0,'square','roof',.5,'roof')!;
 assert.equal(d.tiles[1]!.kind,'roof');
 assert.equal(d.tiles[1]!.elevation,.5);
});
test('manual raid empty route never invents a best path',()=>{
 const d=createEmptyBlueprint('x','empty');const result=calculateManualRaid(d,[]);
 assert.equal(result.rockets,0);assert.equal(result.c4,0);
 assert.deepEqual(result.details,[]);
});
test('reference manual cost for two selected walls adds rocket/c4 sulfur',()=>{
 const d=createEmptyBlueprint('x','walls');
 const wall={id:'wall1',floor:0,a:{x:0,y:0},b:{x:100,y:0},kind:'wall' as const,grade:'stone' as const,stability:unmeasuredStability(),observation:'observed' as const};
 const wall2={...wall,id:'wall2',a:{x:0,y:100},b:{x:100,y:100},grade:'metal' as const};
 d.edges=[wall,wall2];
 const calc=calculateManualRaid(d,['wall1','wall2']);
 assert.equal(calc.rockets,12);assert.equal(calc.c4,6);
 assert.equal(calc.rocketSulfur,16800);assert.equal(calc.c4Sulfur,13200);
});
test('unsupported window is not silently rated as a solid wall',()=>{
 const e={id:'window',floor:0,a:{x:0,y:0},b:{x:100,y:0},kind:'window' as const,grade:'stone' as const,stability:unmeasuredStability(),observation:'observed' as const};
 assert.equal(estimateTarget(e).rockets,null);
});
test('door insert reference uses door, not grade wall',()=>{
 const e={id:'door',floor:0,a:{x:0,y:0},b:{x:100,y:0},kind:'doorway' as const,grade:'stone' as const,insert:'garage-door' as const,stability:unmeasuredStability(),observation:'observed' as const};
 assert.equal(estimateTarget(e).rockets,3);
});
test('higher foundations can coexist and retain height across extra floors',()=>{
 let d=createEmptyBlueprint('x','heights');
 d=placeRoot(d,0,'square',{x:0,y:0},'base',0)!;
 d=attachTo(d,0,'base',1,'triangle','offset',.5)!;
 assert.deepEqual(d.tiles.map(t=>t.elevation),[0,.5]);
 d=placeRoot(d,1,'square',{x:0,y:0},'secondFloor',1,'floor')!;
 assert.equal(d.tiles[2]!.elevation,1);
});
