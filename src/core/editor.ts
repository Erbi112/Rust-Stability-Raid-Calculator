import { attachPolygon, availableSlots, edgeAt, initialPolygon, overlapsArea, polygonArea, sameEdge, samePoint, type Point, type Tile, type TileShape, type Polygon } from './geometry.ts';
import { createEmptyBlueprint, unmeasuredStability, type BlueprintDocument, type BuildingEdge, type BuildingTile, type EdgeKind, type MaterialGrade, type BuildingKind, type SoftSide, type DoorInsert, type FloorInsert, makeHealth } from './blueprint.ts';

export type EditorTool = 'inspect' | 'square' | 'triangle' | 'wall' | 'doorway' | 'window' | 'erase';
export type SelectedEntity = { type: 'tile' | 'edge'; id: string } | null;
export type Slot = Readonly<{ sourceId: string; edgeIndex: number; polygon: Polygon; center: Point }>;
export type EdgeTarget = Readonly<{ a: Point; b: Point; floor: number; distance: number; tileId: string; edgeIndex: number }>;

export const MATERIAL_COLORS: Record<MaterialGrade,string> = {
  twig:'#80654b',wood:'#8c603e',stone:'#8e8172',metal:'#697b7c',armored:'#4c6872',unknown:'#514b47'
};
export const MATERIAL_NAMES: Record<MaterialGrade,string> = {
  twig:'Twig', wood:'Holz', stone:'Stein', metal:'Metall', armored:'High Quality', unknown:'Unbekannt'
};
export const GRID_UNIT = 100;
export const FOUNDATION_STEP = 0.5; // half-wall units; calibrated ruleset planned
export const WALL_KIND_NAMES:Record<EdgeKind,string>={wall:'Wand',doorway:'Türöffnung',window:'Fensteröffnung','wall-frame':'Wandrahmen','half-wall':'Halbwand','low-wall':'Niedrigwand',unknown:'Unbekannt'};
export const TILE_KIND_NAMES:Record<BuildingKind,string>={foundation:'Fundament',floor:'Boden / Decke','floor-frame':'Bodenrahmen',roof:'Dach','stairs-u':'U-Treppe','stairs-l':'L-Treppe','stairs-spiral':'Wendeltreppe','stairs-spiral-triangle':'Dreieck-Wendeltreppe',ramp:'Rampe','foundation-steps':'Fundamentstufen',unknown:'Unbekannt'};
export const DOOR_NAMES:Record<DoorInsert,string>={none:'Keine Tür','wood-door':'Holztür','sheet-metal-door':'Metalltür','armored-door':'Gepanzerte Tür','garage-door':'Garagentor','double-sheet-metal-door':'Doppelte Metalltür','double-armored-door':'Doppelte gepanzerte Tür'};
const EPS=1e-5;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=(poly:Polygon):Point=>({x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length});

export function geometryTiles(doc:BlueprintDocument):Tile[]{
  return doc.tiles.map(t=>({id:t.id,shape:t.shape,level:t.floor,vertices:t.polygon}));
}
export function tilesOnFloor(doc:BlueprintDocument,floor:number):BuildingTile[]{return doc.tiles.filter(t=>t.floor===floor);}
export function createTile(id:string,shape:TileShape,floor:number,polygon:Polygon,grade:MaterialGrade='stone'):BuildingTile{
  return {id,shape,kind:floor===0?'foundation':'floor',floor,polygon,grade,observation:'observed',stability:unmeasuredStability(),health:makeHealth(grade),softSide:'up',rotation:0,elevation:floor};
}
export function newProject(name='Neue Base'):BlueprintDocument{
  return createEmptyBlueprint(globalThis.crypto?.randomUUID?.() ?? 'local-project',name);
}
export function placeRoot(doc:BlueprintDocument,floor:number,shape:TileShape,at:Point,id:string,elevation=floor,kind?:BuildingKind):BlueprintDocument|null {
  const polygon=initialPolygon(shape,at,GRID_UNIT);
  if(tilesOnFloor(doc,floor).some(t=>overlapsArea(t.polygon,polygon)))return null;
  return {...doc,tiles:[...doc.tiles,{...createTile(id,shape,floor,polygon),elevation,kind:kind??(floor===0?'foundation':'floor')}]};
}
export function attachTo(doc:BlueprintDocument,floor:number,sourceId:string,edgeIndex:number,shape:TileShape,id:string,relativeHeight=0,kind?:BuildingKind):BlueprintDocument|null{
  const source=doc.tiles.find(t=>t.id===sourceId&&t.floor===floor);
  if(!source||edgeIndex<0||edgeIndex>=source.polygon.length)return null;
  const edge=edgeAt(source.polygon,edgeIndex);
  // Occupied means a full building tile on the other side, never a wall object.
  const occupied=doc.tiles.some(t=>t.id!==sourceId&&t.floor===floor&&t.polygon.some((_,i)=>{
    const e=edgeAt(t.polygon,i);return sameEdge(edge[0],edge[1],e[0],e[1]);
  }));
  if(occupied)return null;
  const polygon=attachPolygon(source.polygon,edgeIndex,shape);
  if(tilesOnFloor(doc,floor).some(t=>overlapsArea(t.polygon,polygon)))return null;
  return {...doc,tiles:[...doc.tiles,{...createTile(id,shape,floor,polygon),elevation:(source.elevation??source.floor)+relativeHeight,kind:kind??(floor===0?'foundation':'floor')}]};
}
export function slotsFor(doc:BlueprintDocument,floor:number,shape:TileShape):Slot[]{
  const slots=availableSlots(geometryTiles(doc).filter(t=>t.level===floor),shape);
  const seen=new Set<string>();
  return slots.flatMap(s=>{
    if(!s.ok)return [];
    // Preview duplicates can arise where multiple edges offer same placement.
    const key=s.tile.vertices.map(p=>`${Math.round(p.x*1000)}:${Math.round(p.y*1000)}`).sort().join('|');
    if(seen.has(key))return [];
    seen.add(key);
    return [{sourceId:s.joinedTo.tileId,edgeIndex:s.joinedTo.edgeIndex,polygon:s.tile.vertices,center:center(s.tile.vertices)}];
  });
}
export function nearSlot(slots:readonly Slot[],at:Point):Slot|null{
  if(!slots.length)return null;
  const ranked=slots.map(s=>({...s,distance:distance(at,s.center),inside:insidePolygon(s.polygon,at)})).sort((a,b)=>{
    const av=a.inside?0:1,bv=b.inside?0:1;
    return av-bv||a.distance-b.distance;
  });
  const selected=ranked[0]!;
  // User must be close to the intended preview, avoiding inadvertent distant placement.
  return selected.inside||selected.distance<GRID_UNIT*.85?selected:null;
}
export function insidePolygon(poly:Polygon,p:Point):boolean{
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i]!,b=poly[j]!;
    if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;
  }
  return inside;
}
export function lineDistance(p:Point,a:Point,b:Point):number {
  const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
  if(denom<EPS)return distance(p,a);
  const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/denom));
  return distance(p,{x:a.x+u*dx,y:a.y+u*dy});
}
export function findEdgeAt(doc:BlueprintDocument,floor:number,at:Point,maxDistance=18):EdgeTarget|null {
  let best:EdgeTarget|null=null;
  for(const tile of tilesOnFloor(doc,floor)){
    for(let i=0;i<tile.polygon.length;i++){
      const [a,b]=edgeAt(tile.polygon,i);
      const d=lineDistance(at,a,b);
      if(d<maxDistance&&(!best||d<best.distance))best={a,b,floor,distance:d,tileId:tile.id,edgeIndex:i};
    }
  }
  return best;
}
export function findTileAt(doc:BlueprintDocument,floor:number,at:Point):BuildingTile|null {
  return [...tilesOnFloor(doc,floor)].reverse().find(t=>insidePolygon(t.polygon,at))??null;
}
export function findWallAt(doc:BlueprintDocument,floor:number,at:Point,maxDistance=12):BuildingEdge|null {
  return doc.edges.filter(w=>w.floor===floor&&lineDistance(at,w.a,w.b)<=maxDistance)
    .sort((a,b)=>lineDistance(at,a.a,a.b)-lineDistance(at,b.a,b.b))[0]??null;
}
export function findEdgeRecord(doc:BlueprintDocument,target:Pick<EdgeTarget,'floor'|'a'|'b'>):BuildingEdge|null{
  return doc.edges.find(w=>w.floor===target.floor&&sameEdge(w.a,w.b,target.a,target.b))??null;
}
export function upsertWall(doc:BlueprintDocument,target:EdgeTarget,kind:EdgeKind,id:string):BlueprintDocument {
  const existing=findEdgeRecord(doc,target);
  if(existing)return {...doc,edges:doc.edges.map(e=>e.id===existing.id?{...e,kind,insert:kind==='doorway'||kind==='wall-frame'?e.insert??'none':'none'}:e)};
  return {...doc,edges:[...doc.edges,{id,floor:target.floor,a:target.a,b:target.b,kind,grade:'stone',observation:'observed',stability:unmeasuredStability(),health:makeHealth('stone'),softSide:'left',insert:'none'}]};
}
export function removeEntity(doc:BlueprintDocument,selection:SelectedEntity):BlueprintDocument{
  if(!selection)return doc;
  if(selection.type==='edge')return {...doc,edges:doc.edges.filter(w=>w.id!==selection.id)};
  const tiles=doc.tiles.filter(t=>t.id!==selection.id);
  const edges=doc.edges.filter(e=>tiles.some(t=>t.floor===e.floor&&t.polygon.some((_,i)=>{
    const [a,b]=edgeAt(t.polygon,i);return sameEdge(e.a,e.b,a,b);
  })));
  return {...doc,tiles,edges};
}
/** Install an actual ladder hatch only into a matching floor frame. Invalid actions are no-ops. */
export function installFloorInsert(doc:BlueprintDocument,tileId:string,value:FloorInsert):BlueprintDocument {
  const tile=doc.tiles.find(t=>t.id===tileId);
  if(!tile||tile.kind!=='floor-frame')return doc;
  if(value==='ladder-hatch'&&tile.shape!=='square')return doc;
  if(value==='triangle-ladder-hatch'&&tile.shape!=='triangle')return doc;
  if((tile.floorInsert??'none')===value)return doc;
  return {...doc,tiles:doc.tiles.map(t=>t.id===tileId?{...t,floorInsert:value}:t)};
}
/** Match special wall-frame inserts to structural openings. */
export function installGarageDoor(doc:BlueprintDocument,edgeId:string):BlueprintDocument {
  const edge=doc.edges.find(e=>e.id===edgeId);
  if(!edge||edge.kind!=='wall-frame')return doc;
  if(edge.insert==='garage-door')return doc;
  return {...doc,edges:doc.edges.map(e=>e.id===edgeId?{...e,insert:'garage-door'}:e)};
}
export type EntityPatch = {grade?:MaterialGrade;stability?:number|null;health?:{current:number|null;max:number|null};softSide?:SoftSide;tileKind?:BuildingKind;edgeKind?:EdgeKind;insert?:DoorInsert;rotation?:number;elevation?:number};
export function updateSelected(doc:BlueprintDocument,selection:SelectedEntity,patch:EntityPatch):BlueprintDocument {
  if(!selection)return doc;
  const applyCommon=<T extends BuildingTile|BuildingEdge>(e:T):T=>({ ...e,
    ...(patch.grade?{grade:patch.grade,health:makeHealth(patch.grade)}:{}),
    ...(patch.stability!==undefined?{stability:{...e.stability,percent:patch.stability,source:patch.stability===null?'unknown':'player'}}:{}),
    ...(patch.health!==undefined?{health:{...patch.health}}:{}),
    ...(patch.softSide?{softSide:patch.softSide}:{}),
  });
  if(selection.type==='tile')return {...doc,tiles:doc.tiles.map(t=>t.id===selection.id?{
    ...applyCommon(t),
    ...(patch.tileKind?{kind:patch.tileKind,floorInsert:patch.tileKind==='floor-frame'?t.floorInsert:undefined}:{}),
    ...(patch.rotation!==undefined?{rotation:patch.rotation}:{}),
    ...(patch.elevation!==undefined?{elevation:patch.elevation}:{}),
  }:t)};
  return {...doc,edges:doc.edges.map(e=>e.id===selection.id?{
    ...applyCommon(e),
    ...(patch.edgeKind?{kind:patch.edgeKind}:{}),
    ...(patch.insert?{insert:patch.insert}:{}),
  }:e)};
}
/** Explicitly illustrative bunker variant — no game-rule validation claimed. */
export function exampleBunkerProject():BlueprintDocument {
  let doc=createEmptyBlueprint('demo-height-bunker','Demo · Versetzte Foundations');
  doc=placeRoot(doc,0,'square',{x:0,y:0},'core',0)!;
  doc=attachTo(doc,0,'core',1,'triangle','offset',.5)!;
  doc=attachTo(doc,0,'core',2,'square','access',0)!;
  doc=attachTo(doc,0,'core',0,'triangle','support',-.5)!;
  doc.bunker={mechanism:'unknown',verifiedInGamePatch:null,evidenceUrl:null,
    note:'Illustratives Höhen- und Bunkerzustandsmodell – keine validierte Ingame-Konstruktion.'};
  doc.states=[
    {id:'sealed',label:'Geschlossen (Beispiel)',purpose:'sealed',tileIds:doc.tiles.map(t=>t.id),edgeIds:[],notes:'Nur graphische Konfiguration, keine verifizierte Schließmechanik.'},
    {id:'open',label:'Offen (Beispiel)',purpose:'open',tileIds:doc.tiles.filter(t=>t.id!=='support').map(t=>t.id),edgeIds:[],notes:'Exemplarisch als Bauzustand modelliert.'}
  ];
  return doc;
}
export function exampleProject():BlueprintDocument {
  let doc=createEmptyBlueprint('ghostframe-example','Demo · Compact Compound');
  const roots:[[number,number],[number,number],[number,number],[number,number]]=[[-50,-50],[50,-50],[-50,50],[50,50]];
  roots.forEach(([x,y],i)=>{doc=placeRoot(doc,0,'square',{x,y},`S${i+1}`)!;});
  const edges:[string,number,'square'|'triangle'][]=[['S2',1,'triangle'],['S4',1,'triangle'],['S1',3,'triangle'],['S3',3,'triangle'],['S1',0,'triangle'],['S2',0,'triangle'],['S3',2,'triangle'],['S4',2,'triangle']];
  edges.forEach(([id,index,shape],i)=>{const next=attachTo(doc,0,id,index,shape,`T${i+1}`);if(next)doc=next;});
  const s2=doc.tiles.find(t=>t.id==='S2')!;
  const [a,b]=edgeAt(s2.polygon,2);
  doc=upsertWall(doc,{a,b,floor:0,distance:0,tileId:'S2',edgeIndex:2},'doorway','D1');
  doc=placeRoot(doc,1,'square',{x:-50,y:-50},'F1')!;
  doc=placeRoot(doc,1,'square',{x:50,y:-50},'F2')!;
  doc={...doc,tiles:doc.tiles.map((t,i)=>i===1?{...t,grade:'metal',stability:{...t.stability,percent:87,source:'player'}}:t)};
  return doc;
}
export function stats(doc:BlueprintDocument,floor:number){
  return {tiles:tilesOnFloor(doc,floor).length,totalTiles:doc.tiles.length,edges:doc.edges.filter(e=>e.floor===floor).length,
    measured:doc.tiles.filter(t=>t.stability.percent!==null).length,
    levels:new Set(doc.tiles.map(t=>t.floor)).size,
    area:tilesOnFloor(doc,floor).reduce((acc,t)=>acc+polygonArea(t.polygon),0)/(GRID_UNIT*GRID_UNIT)};
}
export function edgeExists(doc:BlueprintDocument,floor:number,a:Point,b:Point):boolean{
  return doc.tiles.some(t=>t.floor===floor&&t.polygon.some((_,i)=>{const [x,y]=edgeAt(t.polygon,i);return samePoint(a,x)&&samePoint(b,y)||samePoint(a,y)&&samePoint(b,x);}));
}
