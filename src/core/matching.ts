/** Conservative pattern matching: structural features only; not probabilities. */
import { edgeAt, sameEdge } from './geometry.ts';
import type { BlueprintDocument, BuildingTile, BlueprintState } from './blueprint.ts';
export interface StructuralPattern{
  tileCount:number;
  tileShapes:readonly ('square'|'triangle')[];
  transitions:ReadonlyArray<{pair:string;delta:number}>;
  unknownHeights:boolean;
}
export function activeTiles(doc:BlueprintDocument,state?:BlueprintState):BuildingTile[]{
  const ids=state?new Set(state.tileIds):null;
  return doc.tiles.filter(t=>!ids||ids.has(t.id));
}
export function heightPattern(doc:BlueprintDocument,state?:BlueprintState):StructuralPattern{
  const tiles=activeTiles(doc,state),transitions:{pair:string;delta:number}[]=[];
  for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
    const a=tiles[i]!,b=tiles[j]!;if(a.floor!==b.floor)continue;
    const shared=a.polygon.some((_,n)=>{
      const [u,v]=edgeAt(a.polygon,n);
      return b.polygon.some((__,m)=>{const [w,x]=edgeAt(b.polygon,m);return sameEdge(u,v,w,x);});
    });
    if(shared&&a.elevation!==undefined&&b.elevation!==undefined)
      transitions.push({pair:[a.shape,b.shape].sort().join('/'),delta:Math.round(Math.abs(a.elevation-b.elevation)*100)/100});
  }
  return {tileCount:tiles.length,tileShapes:tiles.map(t=>t.shape).sort(),transitions,
    unknownHeights:tiles.some(t=>t.elevation===undefined)};
}
export interface CandidateComparison{
  id:string;name:string;
  matchingTransitions:number;conflictingTransitions:number;unverifiableTransitions:number;
  verdict:'geometry-compatible'|'height-conflict'|'insufficient-data';
}
/** A coarse height signature, NOT a full graph-isomorphism or calibrated likelihood. */
export function compareTemplates(observed:BlueprintDocument,candidates:readonly BlueprintDocument[]):CandidateComparison[]{
  const obs=heightPattern(observed);
  return candidates.map(c=>{
    const pattern=heightPattern(c),counts=new Map<string,number>();
    for(const t of pattern.transitions){const key=t.pair+':'+t.delta;counts.set(key,(counts.get(key)??0)+1);}
    let matching=0,conflicting=0;
    for(const t of obs.transitions){const key=t.pair+':'+t.delta;
      if((counts.get(key)??0)>0){matching++;counts.set(key,counts.get(key)!-1);}else conflicting++;
    }
    return {id:c.id,name:c.name,matchingTransitions:matching,conflictingTransitions:conflicting,
      unverifiableTransitions:pattern.unknownHeights?Math.max(0,pattern.tileCount-1-pattern.transitions.length):0,
      verdict:conflicting?'height-conflict':obs.transitions.length?'geometry-compatible':'insufficient-data'};
  });
}
