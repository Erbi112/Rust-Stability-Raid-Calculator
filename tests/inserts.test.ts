import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBlueprint } from '../src/core/blueprint.ts';
import { getCatalogPiece, CATALOG } from '../src/core/catalog.ts';
import { placeRoot, installFloorInsert, installGarageDoor, upsertWall } from '../src/core/editor.ts';
import { edgeAt } from '../src/core/geometry.ts';
import { parseBlueprint } from '../src/services/persistence.ts';

test('catalog provides both hatch shapes and a selectable garage door',()=>{
  assert.equal(getCatalogPiece('ladder-hatch')?.category,'floor-insert');
  assert.equal(getCatalogPiece('triangle-ladder-hatch')?.shape,'triangle');
  assert.equal(getCatalogPiece('garage-door')?.insert,'garage-door');
  assert.equal(getCatalogPiece('garage-door')?.group,'WÄNDE / ÖFFNUNGEN');
  assert.ok(CATALOG.length >= 28);
});

test('square ladder hatch installs into square floor frame and survives JSON round-trip',()=>{
  let d=createEmptyBlueprint('hatch','Hatch demo');
  d=placeRoot(d,1,'square',{x:0,y:0},'F1',1,'floor-frame')!;
  const installed=installFloorInsert(d,'F1','ladder-hatch');
  assert.equal(installed.tiles[0]?.floorInsert,'ladder-hatch');
  assert.equal(installed.tiles[0]?.floor,1);
  assert.equal(installed.tiles[0]?.elevation,1);
  assert.equal(parseBlueprint(JSON.parse(JSON.stringify(installed))).tiles[0]?.floorInsert,'ladder-hatch');
  assert.equal(installFloorInsert(installed,'F1','none').tiles[0]?.floorInsert,'none');
});

test('hatches reject solid floors and mismatched frame shapes',()=>{
  let d=createEmptyBlueprint('hatch','Hatch demo');
  d=placeRoot(d,1,'triangle',{x:0,y:0},'T1',1,'floor-frame')!;
  d=placeRoot(d,2,'square',{x:0,y:0},'S1',2,'floor')!;
  assert.equal(installFloorInsert(d,'T1','ladder-hatch'),d);
  assert.equal(installFloorInsert(d,'S1','ladder-hatch'),d);
  assert.equal(installFloorInsert(d,'unknown','ladder-hatch'),d);
  const placed=installFloorInsert(d,'T1','triangle-ladder-hatch');
  assert.equal(placed.tiles.find(t=>t.id==='T1')?.floorInsert,'triangle-ladder-hatch');
  const invalid=structuredClone(placed);
  invalid.tiles.find(t=>t.id==='T1')!.floorInsert='ladder-hatch';
  assert.throws(()=>parseBlueprint(invalid),/Ungültiges/);
});

test('garage door requires a wall frame and is saved as a separate insert',()=>{
  let d=createEmptyBlueprint('garage','Garage demo');
  d=placeRoot(d,0,'square',{x:0,y:0},'F0',0,'foundation')!;
  const [a,b]=edgeAt(d.tiles[0]!.polygon,0);
  d=upsertWall(d,{a,b,edgeIndex:0,distance:0,floor:0,tileId:'F0'},'wall-frame','W1');
  const withGarage=installGarageDoor(d,'W1');
  assert.equal(withGarage.edges[0]?.insert,'garage-door');
  assert.equal(withGarage.edges[0]?.kind,'wall-frame');
  assert.equal(parseBlueprint(JSON.parse(JSON.stringify(withGarage))).edges[0]?.insert,'garage-door');
  assert.equal(installGarageDoor(withGarage,'W1'),withGarage);
  assert.equal(installGarageDoor(withGarage,'missing'),withGarage);
  const doorFrame=upsertWall(d,{a,b,edgeIndex:0,distance:0,floor:0,tileId:'F0'},'doorway','W2');
  assert.equal(installGarageDoor(doorFrame,'W1'),doorFrame);
});
