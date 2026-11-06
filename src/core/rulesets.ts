/**
 * GHOSTFRAME v0.11: versioned, source-attributed full-health raid reference snapshot.
 * This is an EXTERNAL reference, not a measurement or exact game damage engine.
 * Do not infer splash, soft-side, mixed explosives or partial-HP damage from this table.
 */
import type { BuildingEdge, BuildingTile, DoorInsert, MaterialGrade } from './blueprint.ts';

export const RAID_METHODS = ['rockets','c4','satchels','explo-ammo'] as const;
export type RaidMethod = typeof RAID_METHODS[number];
export type RaidCounts = Readonly<Record<RaidMethod,number|null>>;
export const RAID_METHOD_LABELS:Record<RaidMethod,string>={
 rockets:'Rockets',c4:'C4',satchels:'Satchels','explo-ammo':'Explo-Munition'
};
export const SULFUR_PER:Record<RaidMethod,number>={rockets:1400,c4:2200,satchels:480,'explo-ammo':25};
export const RAID_REFERENCE={
 id:'rust-2026-09-community',
 label:'Rust · Breach and Clear · Community-Referenz',
 patch:'2026-09-03',
 reviewedAt:'2026-11-06',
 status:'external-reference' as const,
 sources:[
  {name:'Beancan – Raid Calculator',url:'https://beancan.gg/wiki/tools/raid-calculator?t=ladder-hatch'},
  {name:'Rust Wiki – Raid-Rechner',url:'https://rust.wiki/calculators/raid'},
  {name:'Rust Wiki – Dreieck-Leiterklappe',url:'https://rust.wiki/item/floor.triangle.ladder.hatch'}
 ]
};
export type ReferenceStatus='external-reference'|'model-assumption'|'unknown';
export type DestructionProfile=Readonly<{
 label:string;hp:number|null;counts:RaidCounts;sourceUrl:string|null;
 status:ReferenceStatus;reason:string|null;
 /** No partial-health scaling: counts are always for the source's full-HP target. */
 fullHealthOnly:true;
}>;
const none=():RaidCounts=>({rockets:null,c4:null,satchels:null,'explo-ammo':null});
const counts=(rockets:number,c4:number,satchels:number,ammo:number):RaidCounts=>({rockets,c4,satchels,'explo-ammo':ammo});
const WALL:Partial<Record<MaterialGrade,{hp:number;counts:RaidCounts}>>={
 wood:{hp:250,counts:counts(2,1,3,49)},
 stone:{hp:500,counts:counts(4,2,10,185)},
 metal:{hp:1000,counts:counts(8,4,23,400)},
 armored:{hp:2000,counts:counts(15,8,46,799)}
};
const DOOR:Record<Exclude<DoorInsert,'none'>,{label:string;hp:number;counts:RaidCounts}>={
 'wood-door':{label:'Holztür',hp:200,counts:counts(1,1,2,19)},
 'sheet-metal-door':{label:'Metalltür',hp:250,counts:counts(2,1,4,63)},
 'armored-door':{label:'Gepanzerte Tür',hp:1000,counts:counts(5,3,15,250)},
 'garage-door':{label:'Garagentor',hp:600,counts:counts(3,2,9,150)},
 'double-sheet-metal-door':{label:'Metall-Doppeltür',hp:250,counts:counts(2,1,4,63)},
 'double-armored-door':{label:'Gepanzerte Doppeltür',hp:1000,counts:counts(5,3,15,250)}
};
const MAIN_SOURCE=RAID_REFERENCE.sources[0]!.url;
const hatch={hp:250,counts:counts(2,1,4,63)};
const unknown=(label:string,reason:string):DestructionProfile=>({label,hp:null,counts:none(),sourceUrl:null,status:'unknown',reason,fullHealthOnly:true});
const reference=(label:string,hp:number,values:RaidCounts,url=MAIN_SOURCE,status:ReferenceStatus='external-reference',reason:string|null=null):DestructionProfile=>({label,hp,counts:values,sourceUrl:url,status,reason,fullHealthOnly:true});

export function resolveDestructionProfile(target:BuildingTile|BuildingEdge):DestructionProfile{
 let result:DestructionProfile;
 if('polygon' in target){
  if(target.kind==='floor-frame'){
   if(target.floorInsert==='ladder-hatch')result=reference('Leiterklappe',hatch.hp,hatch.counts);
   else if(target.floorInsert==='triangle-ladder-hatch')result=reference('Dreieck-Leiterklappe',hatch.hp,hatch.counts,RAID_REFERENCE.sources[2]!.url);
   else return unknown('Offener Bodenrahmen','Kein eingesetztes Hindernis – Durchgang wird im Gebäudegraph separat behandelt.');
  }else if(target.kind==='floor'||target.kind==='foundation'){
   const wall=WALL[target.grade];
   if(!wall)return unknown(`${target.kind==='floor'?'Boden':'Fundament'} · ${target.grade}`,'Keine belastbare Referenz für Material oder Bauteil.');
   // Floors explicitly covered by reference; foundations have not been separately verified.
   result=reference(`${target.kind==='floor'?'Boden':'Fundament'} · ${target.grade}`,wall.hp,wall.counts,MAIN_SOURCE,
    target.kind==='foundation'?'model-assumption':'external-reference',
    target.kind==='foundation'?'Wand-/Bodenwerte auf Fundament übertragen; nicht separat spielvalidiert.':null);
  }else return unknown(`Sonderbauteil · ${target.kind}`,'Keine validierte Raid-Tabelle für diese Konstruktion.');
 }else if(target.insert&&target.insert!=='none'){
  const door=DOOR[target.insert];result=reference(door.label,door.hp,door.counts);
 }else if(target.kind==='wall'){
  const wall=WALL[target.grade];
  if(!wall)return unknown(`Wand · ${target.grade}`,'Keine belastbare Referenz für dieses Material.');
  result=reference(`Wand · ${target.grade}`,wall.hp,wall.counts);
 }else return unknown(target.kind,'Öffnung, Rahmen oder Sonderwand – nicht mit voller Wand gleichgesetzt.');

 if(target.health?.max!==undefined&&target.health.max!==null&&target.health.max!==result.hp){
  return unknown(result.label,`Abweichende maximale Lebenspunkte (${target.health.max} HP statt Referenz ${result.hp} HP); keine automatische Schadensskalierung.`);
 }
 if(target.health?.current!==undefined&&target.health.current!==null&&result.hp!==null&&target.health.current<result.hp){
  return {...result,reason:[result.reason,'Teilbeschädigt: Werte gelten weiterhin für volle HP (kein exakter Restschaden).'].filter(Boolean).join(' ')};
 }
 return result;
}

export function estimateRaidMethod(target:BuildingTile|BuildingEdge,method:RaidMethod){
 const profile=resolveDestructionProfile(target);
 const count=profile.counts[method];
 return {profile,count,sulfur:count===null?null:count*SULFUR_PER[method]};
}
