import { createPortal } from 'react-dom';
import { Crosshair, Plus, Rocket, Trash2, X } from 'lucide-react';
import type { BlueprintDocument } from '../core/blueprint.ts';
import { MATERIAL_NAMES, TILE_KIND_NAMES, WALL_KIND_NAMES } from '../core/editor.ts';
import { estimateTarget, RAID_METHODS, RAID_METHOD_LABELS, SULFUR_PER, type RaidMethod } from '../core/raid.ts';
import { viewportDialogPosition } from '../core/module-layout.ts';
import type { SelectedEntity } from '../core/editor.ts';

/** A read-only, raid-specific selection; never opens the construction properties editor. */
export function RaidSelectionMenu({doc,selection,x,y,path,onPathChange,onGoal,method,onMethodChange,onClose}:{
 doc:BlueprintDocument;selection:NonNullable<SelectedEntity>;x:number;y:number;
 path:readonly string[];onPathChange:(ids:string[])=>void;onGoal:(id:string)=>void;
 method:RaidMethod;onMethodChange:(method:RaidMethod)=>void;onClose:()=>void;
}){
 const target=selection.type==='tile'?doc.tiles.find(t=>t.id===selection.id):doc.edges.find(e=>e.id===selection.id);
 if(!target)return null;
 const estimate=estimateTarget(target);
 const label=selection.type==='tile'?TILE_KIND_NAMES[doc.tiles.find(t=>t.id===selection.id)!.kind]:
  WALL_KIND_NAMES[doc.edges.find(e=>e.id===selection.id)!.kind];
 const included=path.includes(selection.id),count=estimate.counts[method];
 const p=viewportDialogPosition(x,y,window.innerWidth,window.innerHeight,355,465);
 return createPortal(<div className="raid-inspector" role="dialog" aria-label="Raid-Ziel auswählen" style={p}
  onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
  <div className="raid-inspector-title"><span><Crosshair size={15}/> RAID-ZIEL / BAUTEIL</span>
   <button title="Schließen" aria-label="Raid-Menü schließen" onClick={onClose}><X size={17}/></button></div>
  <div className="raid-inspector-content">
   <strong className="raid-inspector-name">{estimate.label}</strong>
   <div className="raid-inspector-meta"><span>{label}</span><span>F{target.floor}</span><span>{MATERIAL_NAMES[target.grade]}</span></div>
   <div className="raid-inspector-meta"><span>HP: {target.health?.current??'–'} / {target.health?.max??'–'}</span><span>Ref.: {estimate.status==='external-reference'?'extern':estimate.status==='model-assumption'?'Annahme':'unbekannt'}</span></div>
   <div className="raid-inspector-methods" aria-label="Raid-Methode wählen">{RAID_METHODS.map(m=><button key={m} className={method===m?'active':''} onClick={()=>onMethodChange(m)}>{RAID_METHOD_LABELS[m]}</button>)}</div>
   <div className="raid-inspector-cost"><Rocket size={18}/><div><strong>{count===null?'Keine verlässliche Kostenzahl':`${count.toLocaleString('de-DE')} ${RAID_METHOD_LABELS[method]}`}</strong>
      <span>{count===null?'Nicht modellierbar':`${(count*SULFUR_PER[method]).toLocaleString('de-DE')} Schwefel · Voll-HP-Referenz`}</span></div></div>
   {estimate.reason&&<p className="raid-inspector-warning">{estimate.reason}</p>}
   <div className="raid-inspector-actions">
    <button className="button primary" onClick={()=>{onPathChange(included?path.filter(id=>id!==selection.id):[...path,selection.id]);onClose();}}>
     {included?<Trash2 size={14}/>:<Plus size={14}/>} {included?'Aus manueller Route entfernen':'Zur Raid-Route hinzufügen'}
    </button>
    {selection.type==='tile'&&<button className="button" onClick={()=>{onGoal(selection.id);onClose();}}><Crosshair size={14}/> Als Zielraum für Routensuche</button>}
   </div>
   <p className="raid-inspector-foot">Auswahl verändert die Base nicht. Unbekannte Daten werden nicht geschätzt.</p>
  </div>
 </div>,document.body);
}
