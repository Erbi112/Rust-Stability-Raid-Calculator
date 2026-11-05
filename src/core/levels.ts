/** GHOSTFRAME floor elevation and safe multi-floor creation. Rust socket legality
 * is deliberately separate from this planning geometry. */
import type { BlueprintDocument, BuildingTile } from './blueprint.ts';
import { makeHealth, unmeasuredStability } from './blueprint.ts';
import type { Point, Polygon } from './geometry.ts';
import { overlapsArea } from './geometry.ts';

export const DEFAULT_WALL_HEIGHT_METERS = 3;
export const elevationToMeters = (heightUnits:number):number => heightUnits*DEFAULT_WALL_HEIGHT_METERS;
export const tileHeight = (tile:BuildingTile):number => tile.elevation ?? tile.floor;

export function containsPoint(poly:Polygon,p:Point):boolean{
  // Include edges: a grid-aligned cursor on a shared edge should still find a support.
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[j]!,b=poly[i]!;
    if((a.y>p.y)!==(b.y>p.y) && p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}

/** For F1 above a raised F0, inherit its offset: F0=+0.5 H -> F1=+1.5 H.
 * Explicit relative offsets are still added on top. */
export function proposedElevation(doc:BlueprintDocument,floor:number,at:Point,relative=0):number {
  if(floor<=0)return relative;
  const below=doc.tiles.filter(t=>t.floor===floor-1&&containsPoint(t.polygon,at));
  const support=below.length?Math.max(...below.map(tileHeight)):floor-1;
  return support+1+relative;
}

export type FloorCopyResult={document:BlueprintDocument;added:number;skipped:number};
/** Duplicate underlying floor footprints as real ceiling/floor pieces one wall height higher.
 * Preserve heights from offset foundations and do not overwrite existing tiles. */
export function createFloorFromBelow(doc:BlueprintDocument,targetFloor:number,newId:()=>string):FloorCopyResult{
  if(!Number.isInteger(targetFloor)||targetFloor<=0)return {document:doc,added:0,skipped:0};
  const source=doc.tiles.filter(t=>t.floor===targetFloor-1&&['foundation','floor','floor-frame'].includes(t.kind));
  if(!source.length)return {document:doc,added:0,skipped:0};
  const result=[...doc.tiles];let added=0,skipped=0;
  for(const tile of source){
    if(result.some(t=>t.floor===targetFloor&&overlapsArea(t.polygon,tile.polygon))){skipped++;continue;}
    result.push({...tile,id:newId(),floor:targetFloor,kind:'floor',elevation:tileHeight(tile)+1,
      observation:'observed',health:makeHealth(tile.grade),stability:unmeasuredStability(),softSide:'up'});
    added++;
  }
  return {document:added?{...doc,tiles:result}:doc,added,skipped};
}

/** Detect the known v0.5/v0.6 bug: a tile drawn on F1+ had absolute elevation 0
 * despite overlapping the footprint of F0. Never silently alter user-authored levels. */
export function misplacedUpperTiles(doc:BlueprintDocument):BuildingTile[]{
  return doc.tiles.filter(t=>t.floor>0&&t.elevation===0&&doc.tiles.some(b=>
    b.floor===t.floor-1&&overlapsArea(b.polygon,t.polygon)));
}
export function repairMisplacedUpperTiles(doc:BlueprintDocument):{document:BlueprintDocument;repaired:number}{
  const ids=new Set(misplacedUpperTiles(doc).map(t=>t.id));
  if(!ids.size)return {document:doc,repaired:0};
  let result=doc;
  // Migrate from bottom to top: F2 must inherit the *repaired* F1 height.
  for(const candidate of [...doc.tiles].filter(t=>ids.has(t.id)).sort((a,b)=>a.floor-b.floor)){
    const midpoint={x:candidate.polygon.reduce((sum,p)=>sum+p.x,0)/candidate.polygon.length,
      y:candidate.polygon.reduce((sum,p)=>sum+p.y,0)/candidate.polygon.length};
    const elevation=proposedElevation(result,candidate.floor,midpoint);
    result={...result,tiles:result.tiles.map(t=>t.id===candidate.id?{...t,elevation}:t)};
  }
  return {document:result,repaired:ids.size};
}
