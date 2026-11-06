/** Source-attributed full-health reference costs, not a damage physics simulation. */
import type { BlueprintDocument, BuildingEdge, BuildingTile } from './blueprint.ts';
import { RAID_METHODS, SULFUR_PER, resolveDestructionProfile, type RaidMethod, type RaidCounts, type ReferenceStatus } from './rulesets.ts';
export { RAID_METHODS, SULFUR_PER, RAID_METHOD_LABELS, RAID_REFERENCE } from './rulesets.ts';
export type { RaidMethod } from './rulesets.ts';
export type RaidEstimate={id:string;label:string;rockets:number|null;c4:number|null;
 satchels:number|null;exploAmmo:number|null;counts:RaidCounts;sourceUrl:string|null;status:ReferenceStatus;reason?:string;};
export function estimateTarget(target:BuildingTile|BuildingEdge):RaidEstimate{
 const result=resolveDestructionProfile(target);
 return {id:target.id,label:result.label,rockets:result.counts.rockets,c4:result.counts.c4,
   satchels:result.counts.satchels,exploAmmo:result.counts['explo-ammo'],counts:result.counts,
   sourceUrl:result.sourceUrl,status:result.status,reason:result.reason??undefined};
}
export function calculateManualRaid(doc:BlueprintDocument,ids:readonly string[]){
 const targets=ids.map(id=>doc.edges.find(e=>e.id===id)??doc.tiles.find(t=>t.id===id))
  .filter((x):x is BuildingTile|BuildingEdge=>Boolean(x));
 const details=targets.map(estimateTarget);
 const totals={} as Record<RaidMethod,{count:number|null;sulfur:number|null}>;
 for(const method of RAID_METHODS){
  const complete=details.every(d=>d.counts[method]!==null);
  const count=complete?details.reduce((sum,d)=>sum+(d.counts[method]??0),0):null;
  totals[method]={count,sulfur:count===null?null:count*SULFUR_PER[method]};
 }
 return {details,totals,rockets:totals.rockets.count,c4:totals.c4.count,
  rocketSulfur:totals.rockets.sulfur,c4Sulfur:totals.c4.sulfur};
}
