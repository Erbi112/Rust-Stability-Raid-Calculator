/** Source-attributed full-health reference costs, not a damage physics simulation. */
import type { BlueprintDocument, BuildingEdge, BuildingTile } from './blueprint.ts';
import { RAID_METHODS, SULFUR_PER, resolveDestructionProfile, type RaidMethod, type RaidCounts, type ReferenceStatus } from './rulesets.ts';
export { RAID_METHODS, SULFUR_PER, RAID_METHOD_LABELS, RAID_REFERENCE } from './rulesets.ts';
export type { RaidMethod } from './rulesets.ts';
export type RaidEstimate={id:string;label:string;rockets:number|null;c4:number|null;
 satchels:number|null;exploAmmo:number|null;counts:RaidCounts;sourceUrl:string|null;status:ReferenceStatus;reason?:string;};
export type RaidMethodTotal={
 count:number|null;sulfur:number|null;knownCount:number;knownSulfur:number;
 knownTargets:number;unknownTargets:number;totalTargets:number;complete:boolean;
};
export type MixedRaidEntry={id:string;method:RaidMethod};
export type MixedRaidLine={id:string;label:string;method:RaidMethod;count:number|null;sulfur:number|null;
 reason?:string;sourceUrl:string|null;status:ReferenceStatus;};
export function estimateTarget(target:BuildingTile|BuildingEdge):RaidEstimate{
 const result=resolveDestructionProfile(target);
 return {id:target.id,label:result.label,rockets:result.counts.rockets,c4:result.counts.c4,
   satchels:result.counts.satchels,exploAmmo:result.counts['explo-ammo'],counts:result.counts,
   sourceUrl:result.sourceUrl,status:result.status,reason:result.reason??undefined};
}
function missingTarget(id:string):RaidEstimate{
 return {id,label:'Nicht mehr vorhandenes Bauteil',rockets:null,c4:null,satchels:null,exploAmmo:null,
  counts:{rockets:null,c4:null,satchels:null,'explo-ammo':null},sourceUrl:null,status:'unknown',
  reason:'Dieses Bauteil ist nicht mehr im aktuellen Blueprint vorhanden. Entferne es aus der Route.'};
}
function selectedTargets(doc:BlueprintDocument,ids:readonly string[]):RaidEstimate[]{
 return [...new Set(ids)].map(id=>{
  const target=doc.edges.find(e=>e.id===id)??doc.tiles.find(t=>t.id===id);
  return target?estimateTarget(target):missingTarget(id);
 });
}
export function calculateManualRaid(doc:BlueprintDocument,ids:readonly string[]){
 const details=selectedTargets(doc,ids);
 const totals={} as Record<RaidMethod,RaidMethodTotal>;
 for(const method of RAID_METHODS){
  const known=details.filter(d=>d.counts[method]!==null);
  const knownCount=known.reduce((sum,d)=>sum+d.counts[method]!,0);
  const unknownTargets=details.length-known.length;
  const complete=unknownTargets===0;
  totals[method]={count:complete?knownCount:null,sulfur:complete?knownCount*SULFUR_PER[method]:null,
   knownCount,knownSulfur:knownCount*SULFUR_PER[method],knownTargets:known.length,
   unknownTargets,totalTargets:details.length,complete};
 }
 return {details,totals,rockets:totals.rockets.count,c4:totals.c4.count,
  rocketSulfur:totals.rockets.sulfur,c4Sulfur:totals.c4.sulfur};
}
export function calculateMixedRaid(doc:BlueprintDocument,entries:readonly MixedRaidEntry[]){
 const unique=[...new Map(entries.map(e=>[e.id,e])).values()];
 const byId=new Map(selectedTargets(doc,unique.map(e=>e.id)).map(d=>[d.id,d]));
 const lines:MixedRaidLine[]=unique.map(entry=>{
  const detail=byId.get(entry.id)!;
  const count=detail.counts[entry.method];
  return {id:entry.id,label:detail.label,method:entry.method,count,
   sulfur:count===null?null:count*SULFUR_PER[entry.method],reason:detail.reason,
   sourceUrl:detail.sourceUrl,status:detail.status};
 });
 const byMethod={} as Record<RaidMethod,{count:number;sulfur:number;targets:number}>;
 for(const method of RAID_METHODS){
  const known=lines.filter(l=>l.method===method&&l.count!==null);
  const count=known.reduce((s,l)=>s+l.count!,0);
  byMethod[method]={count,sulfur:count*SULFUR_PER[method],targets:known.length};
 }
 const knownTargets=lines.filter(l=>l.count!==null).length;
 const unknownTargets=lines.length-knownTargets;
 const knownSulfur=lines.reduce((s,l)=>s+(l.sulfur??0),0);
 return {lines,byMethod,knownSulfur,totalSulfur:unknownTargets?null:knownSulfur,
  knownTargets,unknownTargets,totalTargets:lines.length,complete:unknownTargets===0};
}
