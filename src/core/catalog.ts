/** Typed construction catalog. Geometry/projection support != verified in-game snap legality. */
import type { BuildingKind, DoorInsert, EdgeKind } from './blueprint.ts';
import type { TileShape } from './geometry.ts';

export type CatalogPiece = Readonly<{
  id:string; label:string; shortLabel:string; group:string;
  category:'tile'|'edge'|'insert';
  shape?:TileShape; tileKind?:BuildingKind; edgeKind?:EdgeKind; insert?:DoorInsert;
  projection:'geometry'|'schematic';
  symbol:string;
}>;
const tile=(id:string,label:string,group:string,shape:TileShape,kind:BuildingKind,symbol:string,projection:'geometry'|'schematic'='geometry'):CatalogPiece=>
  ({id,label,shortLabel:label,group,category:'tile',shape,tileKind:kind,symbol,projection});
const edge=(id:string,label:string,group:string,kind:EdgeKind,symbol:string):CatalogPiece=>
  ({id,label,shortLabel:label,group,category:'edge',edgeKind:kind,projection:'geometry',symbol});
const insert=(id:string,label:string,group:string,value:DoorInsert,symbol:string):CatalogPiece=>
  ({id,label,shortLabel:label,group,category:'insert',insert:value,projection:'schematic',symbol});
export const CATALOG:readonly CatalogPiece[]=[
  tile('foundation-square','Fundament · Quadrat','FUNDAMENTE','square','foundation','square'),
  tile('foundation-triangle','Fundament · Dreieck','FUNDAMENTE','triangle','foundation','triangle'),
  tile('foundation-steps','Fundamentstufen','FUNDAMENTE','square','foundation-steps','steps','schematic'),
  tile('ramp','Rampe','FUNDAMENTE','square','ramp','ramp','schematic'),
  tile('floor-square','Boden · Quadrat','BÖDEN / DECKEN','square','floor','floor'),
  tile('floor-triangle','Boden · Dreieck','BÖDEN / DECKEN','triangle','floor','triangle'),
  tile('floor-frame','Bodenrahmen','BÖDEN / DECKEN','square','floor-frame','frame'),
  tile('floor-triangle-frame','Dreieck-Bodenrahmen','BÖDEN / DECKEN','triangle','floor-frame','triangle-frame'),
  edge('wall','Wand','WÄNDE / ÖFFNUNGEN','wall','wall'),
  edge('doorway','Türrahmen','WÄNDE / ÖFFNUNGEN','doorway','door'),
  edge('window','Fensteröffnung','WÄNDE / ÖFFNUNGEN','window','window'),
  edge('wall-frame','Wandrahmen','WÄNDE / ÖFFNUNGEN','wall-frame','frame'),
  edge('half-wall','Halbwand','WÄNDE / ÖFFNUNGEN','half-wall','half'),
  edge('low-wall','Niedrigwand','WÄNDE / ÖFFNUNGEN','low-wall','low'),
  tile('roof-square','Dach','DÄCHER / TREPPEN','square','roof','roof','schematic'),
  tile('roof-triangle','Dreieckdach','DÄCHER / TREPPEN','triangle','roof','triangle','schematic'),
  tile('stairs-u','U-Treppe','DÄCHER / TREPPEN','square','stairs-u','steps','schematic'),
  tile('stairs-l','L-Treppe','DÄCHER / TREPPEN','square','stairs-l','steps','schematic'),
  tile('stairs-spiral','Wendeltreppe','DÄCHER / TREPPEN','square','stairs-spiral','spiral','schematic'),
  tile('stairs-spiral-triangle','Dreieck-Wendeltreppe','DÄCHER / TREPPEN','triangle','stairs-spiral-triangle','spiral','schematic'),
  insert('wood-door','Holztür','TÜREN / EINBAUTEN','wood-door','door'),
  insert('sheet-metal-door','Metalltür','TÜREN / EINBAUTEN','sheet-metal-door','door'),
  insert('armored-door','Gepanzerte Tür','TÜREN / EINBAUTEN','armored-door','door'),
  insert('garage-door','Garagentor','TÜREN / EINBAUTEN','garage-door','garage'),
  insert('double-sheet-metal-door','Doppeltür Metall','TÜREN / EINBAUTEN','double-sheet-metal-door','double'),
  insert('double-armored-door','Doppeltür HQM','TÜREN / EINBAUTEN','double-armored-door','double'),
];
export const CATALOG_GROUPS=[...new Set(CATALOG.map(p=>p.group))];
export const getCatalogPiece=(id:string)=>CATALOG.find(p=>p.id===id)??null;
export const DEFAULT_PIECE='foundation-square';
