/** Manually selected route reference costs; not a graph optimizer. */
import type { BlueprintDocument, BuildingEdge, BuildingTile, DoorInsert, MaterialGrade } from './blueprint.ts';
export type RaidMethod='rockets'|'c4';
export type RaidEstimate={id:string;label:string;rockets:number|null;c4:number|null;reason?:string;};
export const SULFUR_PER:{rockets:number;c4:number}={rockets:1400,c4:2200};
const gradeRates:Record<MaterialGrade,{rockets:number;c4:number}|null>={
  twig:{rockets:1,c4:1},wood:{rockets:2,c4:1},stone:{rockets:4,c4:2},metal:{rockets:8,c4:4},armored:{rockets:15,c4:8},unknown:null
};
const doors:Record<Exclude<DoorInsert,'none'>,{rockets:number;c4:number;label:string}>={
  'wood-door':{rockets:1,c4:1,label:'Holztür'},
  'sheet-metal-door':{rockets:2,c4:1,label:'Metalltür'},
  'armored-door':{rockets:5,c4:3,label:'Gepanzerte Tür'},
  'garage-door':{rockets:3,c4:2,label:'Garagentor'},
  'double-sheet-metal-door':{rockets:2,c4:1,label:'Doppelte Metalltür'},
  'double-armored-door':{rockets:5,c4:3,label:'Doppelte gepanzerte Tür'},
};
export function estimateTarget(target:BuildingTile|BuildingEdge):RaidEstimate{
  const id=target.id;
  if('polygon' in target){
    if(target.kind==='floor-frame'||target.kind==='unknown'||target.kind.startsWith('stairs')||target.kind==='roof')return {id,label:'Sonderbauteil',rockets:null,c4:null,reason:'Noch kein validierter Richtwert für diese Konstruktion'};
    const rate=gradeRates[target.grade];return {id,label:`${target.kind==='foundation'?'Fundament':'Bauteil'} · ${target.grade}`,rockets:rate?.rockets??null,c4:rate?.c4??null};
  }
  if(target.insert&&target.insert!=='none'){
    const door=doors[target.insert];return {id,label:door.label,rockets:door.rockets,c4:door.c4};
  }
  if(target.kind==='wall'){
    const rate=gradeRates[target.grade];return {id,label:`Wand · ${target.grade}`,rockets:rate?.rockets??null,c4:rate?.c4??null};
  }
  return {id,label:target.kind,rockets:null,c4:null,reason:'Öffnung, Rahmen oder Sonderwand – nicht mit voller Wand gleichgesetzt'};
}
export function calculateManualRaid(doc:BlueprintDocument,ids:readonly string[]){
  const targets=ids.map(id=>doc.edges.find(e=>e.id===id)??doc.tiles.find(t=>t.id===id)).filter((x):x is BuildingTile|BuildingEdge=>Boolean(x));
  const details=targets.map(estimateTarget);
  const complete=details.every(d=>d.rockets!==null&&d.c4!==null);
  const rockets=complete?details.reduce((s,d)=>s+(d.rockets??0),0):null;
  const c4=complete?details.reduce((s,d)=>s+(d.c4??0),0):null;
  return {details,rockets,c4,rocketSulfur:rockets===null?null:rockets*SULFUR_PER.rockets,c4Sulfur:c4===null?null:c4*SULFUR_PER.c4};
}
