import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Crosshair, Database, HelpCircle, Layers3, Plus, Rocket, Shield, Trash2 } from 'lucide-react';
import type { BlueprintDocument } from '../core/blueprint.ts';
import { MATERIAL_NAMES, WALL_KIND_NAMES } from '../core/editor.ts';
import { calculateManualRaid } from '../core/raid.ts';
import type { SelectedEntity } from '../core/editor.ts';
export type AnalysisTab='raid'|'stability'|'stats';
export function AnalysisPanel({doc,selected,path,setPath,tab,setTab,activeRoute}: {
 doc:BlueprintDocument;selected:SelectedEntity;path:string[];setPath:(ids:string[])=>void;
 tab:AnalysisTab;setTab:(t:AnalysisTab)=>void;activeRoute:boolean;
}){
 const result=useMemo(()=>calculateManualRaid(doc,path),[doc,path]);
 const [method,setMethod]=useState<'rockets'|'c4'>('rockets');
 const currentSelected=selected?(selected.type==='edge'?doc.edges.find(e=>e.id===selected.id):doc.tiles.find(t=>t.id===selected.id)):undefined;
 const inPath=!!selected&&path.includes(selected.id);
 const estimates=doc.tiles.length+doc.edges.length;
 const measured=[...doc.tiles,...doc.edges].filter(t=>t.stability.percent!==null).map(t=>t.stability.percent!);
 const avg=measured.length?Math.round(measured.reduce((s,v)=>s+v,0)/measured.length):null;
 const lowest=measured.length?Math.min(...measured):null;
 const grades=Object.entries(doc.tiles.reduce<Record<string,number>>((a,t)=>(a[MATERIAL_NAMES[t.grade]]=(a[MATERIAL_NAMES[t.grade]]??0)+1,a),{}));
 const total=method==='rockets'?result.rockets:result.c4;
 const sulfur=method==='rockets'?result.rocketSulfur:result.c4Sulfur;
 return <aside className={`analysis-panel ${activeRoute?'focus-panel':''}`}>
   <div className="panel-head"><span><Crosshair size={17}/> RAID & STRUKTUR-ANALYSE</span></div>
   <div className="panel-tabs">
     <button className={tab==='raid'?'active':''} onClick={()=>setTab('raid')}><Rocket size={14}/> Raid</button>
     <button className={tab==='stability'?'active':''} onClick={()=>setTab('stability')}><Activity size={14}/> Stability</button>
     <button className={tab==='stats'?'active':''} onClick={()=>setTab('stats')}><BarChart3 size={14}/> Basis</button>
   </div>
   {tab==='raid'&&<>
     <div className="calculator-block hero-cost">
       <div className="block-eyebrow">MANUELL MARKIERTE RAID-ROUTE <span className="small-label">REFERENZWERTE</span></div>
       <div className="calc-mode"><button className={method==='rockets'?'on':''} onClick={()=>setMethod('rockets')}>Rockets</button><button className={method==='c4'?'on':''} onClick={()=>setMethod('c4')}>C4</button></div>
       <div className="big-calc"><span>{total===null?'–':total}</span><div><strong>{method==='rockets'?'Rockets':'C4-Ladungen'}</strong><small>{sulfur===null?'Nicht vollständig berechenbar':`≈ ${sulfur.toLocaleString('de-DE')} Schwefel`}</small></div></div>
       <p className="subtle-note">Nur von dir markierte Bauteile, als vollständige Ziele gerechnet. Kein automatischer optimaler Raidweg, keine Splash- oder Einsturzoptimierung.</p>
     </div>
     <div className="calculator-block">
       <div className="block-headline"><span>RAID-ZIELE</span><span className="counter">{result.details.length}</span></div>
       {currentSelected&&<button className="accent-wide" onClick={()=>setPath(inPath?path.filter(id=>id!==selected?.id):[...path,selected!.id])}>
         {inPath?<Trash2 size={16}/>:<Plus size={16}/>} {inPath?'Aus Route entfernen':'Ausgewähltes Bauteil zur Route'}
       </button>}
       {!currentSelected&&<p className="subtle-note">Klicke im 2D-Plan auf eine Wand, Tür oder Fläche und füge das Element hier zur Raid-Route hinzu.</p>}
       <div className="route-list">{result.details.map((d,i)=><div key={d.id} className="route-row"><span className="route-step">{i+1}</span><div><strong>{d.label}</strong><small>{d.reason??`${d.rockets} Rockets · ${d.c4} C4`}</small></div><button aria-label={`${d.label} entfernen`} onClick={()=>setPath(path.filter(x=>x!==d.id))}><Trash2 size={14}/></button></div>)}
         {!result.details.length&&<div className="empty-route"><Crosshair size={24}/><span>Noch keine Raid-Ziele markiert</span></div>}</div>
       {!!path.length&&<button className="muted-wide" onClick={()=>setPath([])}><Trash2 size={13}/> Route leeren</button>}
     </div>
     <div className="calculator-block future-module"><div className="block-headline"><span>OPTIMALER RAIDWEG</span><span className="small-label">IN ENTWICKLUNG</span></div>
      <p>Automatisches Wegfinden zu Core / Loot folgt mit verifizierter Raum- und Stability-Engine. Keine erfundenen „Best Path“-Ergebnisse.</p></div>
     <div className="reference-note"><HelpCircle size={14}/><span>Richtwerte nach öffentlich dokumentierten Rust-Raid-Tabellen; nicht patch-validiert. <a href="https://wiki.facepunch.com/rust/item/ammo.rocket.basic" target="_blank" rel="noreferrer">Quelle</a> · <a href="https://rust.wiki/calculators/raid" target="_blank" rel="noreferrer">Vergleich</a></span></div>
   </>}
   {tab==='stability'&&<>
     <div className="calculator-block hero-cost"><div className="block-eyebrow">ERFASSTE STABILITÄT</div>
       <div className="big-calc"><span>{avg===null?'–':`${avg}%`}</span><div><strong>Messwert-Mittel</strong><small>{measured.length} von {estimates} Elementen gemessen</small></div></div>
       <p className="subtle-note">Gemessene Werte, keine physikalisch berechnete Stabilität. Fehlende Messungen werden nicht als 0% behandelt.</p>
     </div>
     <div className="calculator-block"><div className="block-headline"><span>STABILITÄTSÜBERSICHT</span></div>
       <div className="statline"><span>Gemessene Bauteile</span><strong>{measured.length}</strong></div>
       <div className="statline"><span>Niedrigster Messwert</span><strong>{lowest===null?'Unbekannt':`${lowest}%`}</strong></div>
       <div className="statline"><span>Nicht gemessen</span><strong>{estimates-measured.length}</strong></div>
       {avg!==null&&<div className="stability-track"><div style={{width:`${avg}%`}}/></div>}
     </div>
     <div className="calculator-block future-module"><div className="block-headline"><span>STRUCTURAL SOLVER</span><span className="small-label">GEPLANT</span></div><p>Tragende Verbindungen, unterschiedliche Fundamenthöhen und simulierte Einstürze werden in der nächsten Engine validiert.</p></div>
   </>}
   {tab==='stats'&&<>
     <div className="calculator-block"><div className="block-headline"><span>BAUWERK-ÜBERSICHT</span><Layers3 size={17}/></div>
       <div className="quick-stats"><div><small>Grundflächen</small><strong>{doc.tiles.length}</strong></div><div><small>Wände/Rahmen</small><strong>{doc.edges.length}</strong></div><div><small>Geschosse</small><strong>{new Set(doc.tiles.map(t=>t.floor)).size}</strong></div><div><small>Höhenlagen</small><strong>{new Set(doc.tiles.map(t=>t.elevation??t.floor)).size}</strong></div></div></div>
     <div className="calculator-block"><div className="block-headline"><span>MATERIAL-VERTEILUNG</span><Database size={17}/></div>
      {grades.map(([grade,n])=><div className="statline" key={grade}><span>{grade}</span><strong>{n} Teile</strong></div>)}
      {!grades.length&&<p className="subtle-note">Noch keine Bauteile vorhanden.</p>}
      <p className="subtle-note">Die Aufteilung zählt geometrische Flächen. Vollständige Ressourcen- und Upkeep-Kosten folgen nach Bauteiltyp-Kalibrierung.</p>
     </div>
     <div className="calculator-block"><div className="block-headline"><span>ÖFFNUNGEN UND TÜREN</span></div>
      {doc.edges.map(e=><div key={e.id} className="statline"><span>{WALL_KIND_NAMES[e.kind]}</span><strong>{e.insert&&e.insert!=='none'?'Tür eingesetzt':e.grade}</strong></div>)}
      {!doc.edges.length&&<p className="subtle-note">Wände und Türen kannst du über den Kantenklick setzen.</p>}
     </div>
   </>}
   <div className="panel-end"><Shield size={14}/> GHOSTFRAME · unabhängig entwickelt <ArrowRight size={13}/></div>
 </aside>;
}
