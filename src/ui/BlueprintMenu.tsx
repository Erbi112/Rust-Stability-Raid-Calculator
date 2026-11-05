import { useState } from 'react';
import { Hammer, Square, Triangle, Trash2, X } from 'lucide-react';
import { useEditor } from '../store/useEditor.ts';
import { findEdgeRecord, MATERIAL_NAMES, WALL_KIND_NAMES, TILE_KIND_NAMES, DOOR_NAMES, type EdgeTarget } from '../core/editor.ts';
import { DOOR_INSERTS, REFERENCE_MAX_HP, type MaterialGrade, type EdgeKind, type BuildingKind, type SoftSide, type DoorInsert, type BuildingTile, type BuildingEdge } from '../core/blueprint.ts';

export type ClickMenu = {kind:'edge';target:EdgeTarget;x:number;y:number}
 | {kind:'tile';id:string;x:number;y:number};
const GRADES:MaterialGrade[]=['twig','wood','stone','metal','armored','unknown'];
const WALLS:EdgeKind[]=['wall','doorway','window','wall-frame','half-wall','low-wall'];
const TILE_KINDS:BuildingKind[]=['foundation','floor','floor-frame','roof','foundation-steps','ramp',
  'stairs-u','stairs-l','stairs-spiral','stairs-spiral-triangle','unknown'];

function NumberField({value,min,max,step,change}:{value:number|null|undefined;min:number;max:number;step?:number;change:(value:number|null)=>void}){
 return <input type="number" min={min} max={max} step={step??1} value={value??''} placeholder="Unbekannt"
  onChange={e=>{
    if(e.target.value===''){change(null);return;}
    const n=Number(e.target.value);if(Number.isFinite(n)&&n>=min&&n<=max)change(n);
  }}/>;
}
export function BuildingCatalog(){
 const [open,setOpen]=useState('FUNDAMENTE');
 const groups=[
  ['FUNDAMENTE',['Fundament Quadrat','Fundament Dreieck','Fundamentstufen','Rampe']],
  ['BÖDEN / DECKEN',['Boden Quadrat','Boden Dreieck','Bodenrahmen Quadrat','Bodenrahmen Dreieck']],
  ['WÄNDE / ÖFFNUNGEN',['Wand','Türöffnung','Fensteröffnung','Wandrahmen','Halbwand','Niedrigwand']],
  ['DÄCHER / TREPPEN',['Dach Quadrat','Dach Dreieck','L-Treppe','U-Treppe','Wendeltreppe','Dreieck-Wendeltreppe']]
 ] as const;
 return <div className="catalog">{groups.map(([title,items])=><section key={title}>
  <button className="catalog-head" onClick={()=>setOpen(open===title?'':title)}>{title} <span>{open===title?'−':'+'}</span></button>
  {open===title&&<div className="catalog-parts">{items.map(v=><div key={v}><span className="catalog-square"/> {v}</div>)}</div>}
 </section>)}</div>;
}
/** A single context menu for edge/building operations and per-part properties. */
export default function BlueprintMenu({menu,close,notice}:{menu:ClickMenu;close:()=>void;notice:(msg:string)=>void}){
 const doc=useEditor(s=>s.doc),select=useEditor(s=>s.select),attach=useEditor(s=>s.attach),wall=useEditor(s=>s.wall);
 const erase=useEditor(s=>s.eraseTarget),setTool=useEditor(s=>s.setTool);
 const updateGrade=useEditor(s=>s.updateGrade),updateStability=useEditor(s=>s.updateStability);
 const updateHealth=useEditor(s=>s.updateHealth),updateSoftSide=useEditor(s=>s.updateSoftSide);
 const updateTileKind=useEditor(s=>s.updateTileKind),updateInsert=useEditor(s=>s.updateInsert),updateElevation=useEditor(s=>s.updateElevation);
 const [delta,setDelta]=useState(0);
 const record=menu.kind==='tile'?doc.tiles.find(t=>t.id===menu.id):findEdgeRecord(doc,menu.target);
 const tile=menu.kind==='tile'?record as BuildingTile|undefined:undefined;
 const edge=menu.kind==='edge'?record as BuildingEdge|undefined:undefined;
 const choose=(f:()=>void)=>{if(record)select({type:tile?'tile':'edge',id:record.id});f();};
 const wallType=(kind:EdgeKind)=>{
   if(menu.kind!=='edge')return;
   wall(menu.target,kind);
   const e=findEdgeRecord(useEditor.getState().doc,menu.target);
   if(e)select({type:'edge',id:e.id});
 };
 const place=(shape:'square'|'triangle')=>{
   if(menu.kind!=='edge')return;
   if(attach(menu.target.tileId,menu.target.edgeIndex,shape,delta)){
     notice('Bauteil mit Höhenversatz '+delta+' H angebaut.');setTool('inspect');close();
   }else notice('Kein gültiger Anbau: Kante belegt oder Bauteile überschneiden sich.');
 };
 const hp=record?.health??{current:REFERENCE_MAX_HP[record?.grade??'unknown'],max:REFERENCE_MAX_HP[record?.grade??'unknown']};
 return <div className="rust-context" role="dialog" aria-label="Rust Bauteil-Menü"
   style={{left:Math.min(menu.x,Math.max(10,window.innerWidth-680)),top:Math.min(menu.y,Math.max(10,window.innerHeight-680))}}>
   <header><span><Hammer size={15}/> {tile?'BAUTEIL':'KANTE / ANBAUEN'}</span><button onClick={close} title="Schließen"><X size={16}/></button></header>
   {menu.kind==='edge'&&<div className="rust-menu-section">
     <strong>NEUES BAUTEIL ANBAUEN</strong>
     <div className="rust-menu-choices"><button onClick={()=>place('square')}><Square size={18}/> Quadrat</button>
       <button onClick={()=>place('triangle')}><Triangle size={18}/> Dreieck</button></div>
     <label>Relativer Höhenversatz (H = 1 Wandhöhe)</label>
     <div className="rust-steps">{[-1,-.5,0,.5,1].map(v=><button className={delta===v?'chosen':''} key={v} onClick={()=>setDelta(v)}>{v>0?'+':''}{v}</button>)}</div>
     <p>Auch versetzte Foundation-Höhen werden als echte Z-Koordinate gespeichert.</p>
   </div>}
   {menu.kind==='edge'&&<div className="rust-menu-section">
     <strong>WAND / ÖFFNUNG AN DER KANTE</strong>
     <div className="rust-types">{WALLS.map(kind=><button key={kind} className={edge?.kind===kind?'chosen':''} onClick={()=>wallType(kind)}>{WALL_KIND_NAMES[kind]}</button>)}</div>
   </div>}
   {record&&<div className="rust-menu-section">
     <strong>BAUTEIL-EIGENSCHAFTEN</strong>
     {tile&&<><label>Bauteiltyp</label><select value={tile.kind} onChange={e=>choose(()=>updateTileKind(e.target.value as BuildingKind))}>
       {TILE_KINDS.map(kind=><option value={kind} key={kind}>{TILE_KIND_NAMES[kind]}</option>)}
     </select>
     <label>Absolute Fundament-/Bauteilhöhe (H)</label>
     <div className="rust-height"><button onClick={()=>choose(()=>updateElevation(Math.max(-100,(tile.elevation??tile.floor)-.5)))}>− ½</button>
      <NumberField value={tile.elevation} min={-100} max={100} step={.25} change={v=>v!==null&&choose(()=>updateElevation(v))}/>
      <button onClick={()=>choose(()=>updateElevation(Math.min(100,(tile.elevation??tile.floor)+.5)))}>+ ½</button></div></>}
     <label>Material</label><select value={record.grade} onChange={e=>choose(()=>updateGrade(e.target.value as MaterialGrade))}>
       {GRADES.map(x=><option key={x} value={x}>{MATERIAL_NAMES[x]}</option>)}
     </select>
     <div className="rust-columns"><div><label>Aktuelle HP</label><NumberField value={hp.current} min={0} max={20000} change={v=>choose(()=>updateHealth({current:v,max:hp.max}))}/></div>
     <div><label>Max. HP</label><NumberField value={hp.max} min={0} max={20000} change={v=>choose(()=>updateHealth({current:Math.min(hp.current??0,v??0),max:v}))}/></div></div>
     <label>Gemessene Stabilität (%)</label><NumberField value={record.stability.percent} min={0} max={100} change={v=>choose(()=>updateStability(v))}/>
     <label>Soft Side</label><select value={record.softSide??'unknown'} onChange={e=>choose(()=>updateSoftSide(e.target.value as SoftSide))}>
       {(tile?['up','down','unknown']:['left','right','unknown']).map(x=><option key={x} value={x}>{x==='up'?'Oben':x==='down'?'Unten':x==='left'?'Links (A→B)':x==='right'?'Rechts (A→B)':'Unbekannt'}</option>)}
     </select>
     {edge&&<><label>Tür-Einbau</label><select value={edge.insert??'none'} onChange={e=>choose(()=>updateInsert(e.target.value as DoorInsert))}>
       {DOOR_INSERTS.map(x=><option key={x} value={x}>{DOOR_NAMES[x]}</option>)}</select></>}
     {tile&&tile.kind!=='foundation'&&tile.kind!=='floor'&&<p>Dieses Bauteil ist aktuell eine schematische 2D-Projektion, keine geprüfte 3D-Rust-Geometrie.</p>}
     <button className="rust-delete" onClick={()=>{erase({type:tile?'tile':'edge',id:record.id});close();}}><Trash2 size={15}/> Bauteil entfernen</button>
   </div>}
   </div>;
}
