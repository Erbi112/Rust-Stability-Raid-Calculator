/**
 * Saved raid scenarios belong to their blueprint and contain only explicit,
 * manually chosen barrier IDs and per-target methods. No invented probabilities.
 */
import type { BlueprintDocument } from './blueprint.ts';
import { calculateMixedRaid, RAID_METHODS, type MixedRaidEntry, type RaidMethod } from './raid.ts';
export const MAX_RAID_SCENARIOS=24;
export const MAX_SCENARIO_TARGETS=150;
export interface RaidScenario {
 id:string;name:string;savedAt:string;targetRoomId:string|null;entries:MixedRaidEntry[];
}
export interface ScenarioComparison {
 id:string;name:string;targetRoomId:string|null;totalTargets:number;knownTargets:number;
 unknownTargets:number;freePassages:number;knownSulfur:number;totalSulfur:number|null;
 complete:boolean;rank:number|null;
 byMethod:Record<RaidMethod,{count:number;sulfur:number;targets:number}>;
}
const methods=new Set<string>(RAID_METHODS);
const isObj=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x);
export function isRaidScenarioList(value:unknown):value is RaidScenario[]{
 if(!Array.isArray(value)||value.length>MAX_RAID_SCENARIOS)return false;
 const ids=new Set<string>();
 for(const s of value){
  if(!isObj(s)||typeof s.id!=='string'||!s.id||s.id.length>128||ids.has(s.id)||
   typeof s.name!=='string'||!s.name.trim()||s.name.length>100||
   typeof s.savedAt!=='string'||!Number.isFinite(Date.parse(s.savedAt))||
   !(s.targetRoomId===null||(typeof s.targetRoomId==='string'&&s.targetRoomId.length<=128))||
   !Array.isArray(s.entries)||!s.entries.length||s.entries.length>MAX_SCENARIO_TARGETS)return false;
  ids.add(s.id);
  const targets=new Set<string>();
  for(const e of s.entries){
   if(!isObj(e)||typeof e.id!=='string'||!e.id||e.id.length>128||
    targets.has(e.id)||!methods.has(String(e.method)))return false;
   targets.add(e.id);
  }
 }
 return true;
}
export function addRaidScenario(doc:BlueprintDocument,name:string,entries:readonly MixedRaidEntry[],
 targetRoomId:string|null,id:string,savedAt:string):BlueprintDocument{
 const label=name.trim();
 if(!label||label.length>100||!id||id.length>128)throw new Error('Szenarioname oder Kennung ungültig.');
 const previous=doc.raidScenarios??[];
 if(previous.length>=MAX_RAID_SCENARIOS)throw new Error('Maximal 24 Raid-Varianten pro Blueprint.');
 if(previous.some(s=>s.id===id))throw new Error('Szenario-ID bereits vorhanden.');
 const unique=[...new Map(entries.map(e=>[e.id,{id:e.id,method:e.method}])).values()];
 if(!unique.length||unique.length>MAX_SCENARIO_TARGETS)throw new Error('1 bis 150 Raid-Ziele erforderlich.');
 const scenario:RaidScenario={id,name:label,savedAt,targetRoomId,entries:unique};
 if(!isRaidScenarioList([scenario]))throw new Error('Ungültiges Raid-Szenario.');
 return {...doc,raidScenarios:[...previous,scenario]};
}
export function removeRaidScenario(doc:BlueprintDocument,id:string):BlueprintDocument{
 if(!(doc.raidScenarios??[]).some(s=>s.id===id))return doc;
 return {...doc,raidScenarios:doc.raidScenarios!.filter(s=>s.id!==id)};
}
export function compareRaidScenarios(doc:BlueprintDocument):ScenarioComparison[]{
 const rows=(doc.raidScenarios??[]).map(s=>{
  const r=calculateMixedRaid(doc,s.entries);
  const staleTarget=s.targetRoomId!==null&&!doc.tiles.some(t=>t.id===s.targetRoomId);
  const unknownTargets=r.unknownTargets+(staleTarget?1:0);
  const complete=r.complete&&!staleTarget;
  return {id:s.id,name:s.name,targetRoomId:s.targetRoomId,totalTargets:r.totalTargets,
   knownTargets:r.knownTargets,unknownTargets,freePassages:r.lines.filter(l=>l.count===0).length,
   knownSulfur:r.knownSulfur,totalSulfur:complete?r.totalSulfur:null,complete,
   byMethod:r.byMethod,rank:null as number|null};
 });
 const sortable=rows.filter(r=>r.complete).sort((a,b)=>a.knownSulfur-b.knownSulfur||a.name.localeCompare(b.name,'de'));
 sortable.forEach((r,i)=>{r.rank=i+1;});
 return [...rows].sort((a,b)=>Number(b.complete)-Number(a.complete)||
  (a.complete&&b.complete?a.knownSulfur-b.knownSulfur:0)||a.name.localeCompare(b.name,'de'));
}
