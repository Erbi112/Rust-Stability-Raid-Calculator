import type { BlueprintDocument } from '../core/blueprint.ts';
import { edgeAt, overlapsArea, polygonArea, polygonSignedArea, sameEdge } from '../core/geometry.ts';

const DATABASE='ghostframe-projects';
const OBJECT_STORE='documents';
const ACTIVE_KEY='active';

function openDB():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(OBJECT_STORE))db.createObjectStore(OBJECT_STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function saveProject(doc:BlueprintDocument):Promise<void>{
  const db=await openDB();
  try{
    await new Promise<void>((resolve,reject)=>{
      const txn=db.transaction(OBJECT_STORE,'readwrite');
      txn.objectStore(OBJECT_STORE).put(doc,ACTIVE_KEY);
      txn.oncomplete=()=>resolve();
      txn.onerror=()=>reject(txn.error);
    });
  }finally{db.close();}
}
export async function loadProject():Promise<BlueprintDocument|null>{
  const db=await openDB();
  try{
    return await new Promise((resolve,reject)=>{
      const request=db.transaction(OBJECT_STORE,'readonly').objectStore(OBJECT_STORE).get(ACTIVE_KEY);
      request.onsuccess=()=>resolve(request.result?parseBlueprint(request.result):null);
      request.onerror=()=>reject(request.error);
    });
  }finally{db.close();}
}

const isObj=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x);
const isNumber=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const isPoint=(x:unknown)=>isObj(x)&&isNumber(x.x)&&isNumber(x.y);
function validPolygonGeometry(poly:readonly {x:number;y:number}[],shape:'square'|'triangle'):boolean {
  if(polygonSignedArea(poly)<=0)return false;
  const expectedArea=shape==='square'?10000:10000*Math.sqrt(3)/4;
  if(Math.abs(polygonArea(poly)-expectedArea)>1)return false;
  return poly.every((p,i)=>Math.abs(Math.hypot(p.x-poly[(i+1)%poly.length]!.x,p.y-poly[(i+1)%poly.length]!.y)-100)<.05);
}
const GRADES=['twig','wood','stone','metal','armored','unknown'];
const KINDS=['wall','doorway','window','wall-frame','half-wall','low-wall','unknown'];
const INSERTS=['none','wood-door','sheet-metal-door','armored-door','garage-door','double-sheet-metal-door','double-armored-door'];
const SIDES=['left','right','up','down','unknown'];
const TILE_KINDS=['foundation','floor','floor-frame','roof','stairs-u','stairs-l','stairs-spiral','stairs-spiral-triangle','ramp','foundation-steps','unknown'];
const OBS=['observed','inferred','hypothesized'];
function isExtended(x:Record<string,unknown>,edge:boolean):boolean{
  if(x.health!==undefined){
    const h=x.health;
    if(!isObj(h)||!(h.current===null||(isNumber(h.current)&&h.current>=0))||
      !(h.max===null||(isNumber(h.max)&&h.max>=0))||
      (h.current!==null&&h.max!==null&&Number(h.current)>Number(h.max)))return false;
  }
  if(x.softSide!==undefined&&!SIDES.includes(String(x.softSide)))return false;
  if(edge){
    if(x.insert!==undefined&&!INSERTS.includes(String(x.insert)))return false;
  }else{
    if(x.rotation!==undefined&&(!isNumber(x.rotation)||x.rotation<0||x.rotation>=360))return false;
    if(x.elevation!==undefined&&(!isNumber(x.elevation)||x.elevation< -100||x.elevation>100||Math.abs(x.elevation*4-Math.round(x.elevation*4))>1e-6))return false;
  }
  return true;
}
function isStability(x:unknown):boolean{
  return isObj(x)&&(x.percent===null||(isNumber(x.percent)&&x.percent>=0&&x.percent<=100))&&
    ['player','screenshot','import','simulator','unknown'].includes(String(x.source)) &&
    (x.measuredAt===null||typeof x.measuredAt==='string')&&
    (x.precisionPercent===null||(isNumber(x.precisionPercent)&&x.precisionPercent>=0));
}
export function parseBlueprint(data:unknown):BlueprintDocument {
  if(!isObj(data)||data.schemaVersion!=='1.0.0'||typeof data.id!=='string'||
     typeof data.name!=='string'||!Array.isArray(data.tiles)||!Array.isArray(data.edges)){
    throw new Error('Ungültiges GHOSTFRAME-Dokument oder nicht unterstützte Schema-Version.');
  }
  if(!isObj(data.game)||data.game.name!=='Rust'||!['vanilla','modded'].includes(String(data.game.mode))||
     !isObj(data.source)||!Array.isArray(data.notes)||!['L0','L1','L2','L3','L4'].includes(String(data.quality)))
    throw new Error('Ungültige Metadaten im Blueprint.');
  const ids=new Set<string>();
  for(const t of data.tiles){
    if(!isObj(t)||typeof t.id!=='string'||!t.id||ids.has(t.id)||!['square','triangle'].includes(String(t.shape))||
      !isNumber(t.floor)||!Number.isInteger(t.floor)||t.floor<0||t.floor>50||
      !Array.isArray(t.polygon)||t.polygon.length!==(t.shape==='square'?4:3)||!t.polygon.every(isPoint)||
      !GRADES.includes(String(t.grade))||!TILE_KINDS.includes(String(t.kind))||
      !OBS.includes(String(t.observation))||!isStability(t.stability)||
      !validPolygonGeometry(t.polygon,t.shape as 'square'|'triangle')||!isExtended(t,false)){
      throw new Error('Ungültiges oder doppeltes Bauteil im Blueprint.');
    }
    ids.add(t.id);
  }
  for(const e of data.edges){
    if(!isObj(e)||typeof e.id!=='string'||!e.id||ids.has(e.id)||!isNumber(e.floor)||!Number.isInteger(e.floor)||
      !isPoint(e.a)||!isPoint(e.b)||!GRADES.includes(String(e.grade))||!KINDS.includes(String(e.kind))||
      !OBS.includes(String(e.observation))||!isStability(e.stability)||!isExtended(e,true)){
      throw new Error('Ungültige Wand-/Türinformation im Blueprint.');
    }
    ids.add(e.id);
  }
  if(data.states!==undefined){
    if(!Array.isArray(data.states))throw new Error('Ungültige Bunker-Zustände.');
    const used=new Set<string>();
    for(const state of data.states){
      if(!isObj(state)||typeof state.id!=='string'||!state.id||used.has(state.id)||
         typeof state.label!=='string'||!['sealed','open','construction','other'].includes(String(state.purpose))||
         !Array.isArray(state.tileIds)||!Array.isArray(state.edgeIds)||typeof state.notes!=='string'||
         !state.tileIds.every((id:unknown)=>typeof id==='string'&&(data.tiles as Record<string,unknown>[]).some(t=>t.id===id))||
         !state.edgeIds.every((id:unknown)=>typeof id==='string'&&(data.edges as Record<string,unknown>[]).some(e=>e.id===id)))
        throw new Error('Ungültige Bauzustände oder nicht existente Elementverweise.');
      used.add(state.id);
    }
  }
  if(data.bunker!==undefined&&(!isObj(data.bunker)||
    !['stability','roof','offset','other','unknown'].includes(String(data.bunker.mechanism))||
    !(data.bunker.verifiedInGamePatch===null||typeof data.bunker.verifiedInGamePatch==='string')||
    !(data.bunker.evidenceUrl===null||typeof data.bunker.evidenceUrl==='string')||
    typeof data.bunker.note!=='string'))throw new Error('Ungültige Bunker-Metadaten.');
  // Preserve geometrical invariants on imports as well as on canvas placement.
  for(let i=0;i<data.tiles.length;i++)for(let j=i+1;j<data.tiles.length;j++){
    const a=data.tiles[i]!,b=data.tiles[j]!;
    if(a.floor===b.floor&&overlapsArea(a.polygon,b.polygon))throw new Error('Überlappende Grundrissflächen im Blueprint.');
  }
  for(const wall of data.edges){
    if(!data.tiles.some(t=>t.floor===wall.floor&&t.polygon.some((_:unknown,i:number)=>{
      const [a,b]=edgeAt(t.polygon,i);return sameEdge(a,b,wall.a,wall.b);
    })))throw new Error('Wand/Türrahmen ohne vorhandene Bauteilkante.');
  }
  return data as unknown as BlueprintDocument;
}
export function exportProject(doc:BlueprintDocument):void{
  const data=JSON.stringify(doc,null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;
  a.download=(doc.name.trim().replace(/[^\wäöüß-]+/gi,'_')||'ghostframe')+'.ghostframe.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function importProject(file:File):Promise<BlueprintDocument>{
  const text=await file.text();
  if(text.length>10_000_000)throw new Error('Datei zu groß (max. 10 MB).');
  return parseBlueprint(JSON.parse(text));
}
