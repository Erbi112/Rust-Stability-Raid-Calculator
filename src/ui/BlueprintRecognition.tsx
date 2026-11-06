import { useMemo, useState } from 'react';
import { FolderOpen, Search, Layers3 } from 'lucide-react';
import type { BlueprintDocument, BuildingTile } from '../core/blueprint.ts';
import type { LibraryEntry } from '../core/library.ts';
import { recognizeBlueprints, type RecognitionResult } from '../core/recognition.ts';

type Props={current:BlueprintDocument;entries:readonly LibraryEntry[];onOpen:(doc:BlueprintDocument)=>void};
const statusLabels:Record<RecognitionResult['status'],string>={
 compatible:'Geometrisch passend',partial:'Teilweise passend',conflict:'Widersprüche', 'no-evidence':'Keine Zuordnung'
};
const statusStyle:Record<RecognitionResult['status'],string>={
 compatible:'gf-rec-ok',partial:'gf-rec-partial',conflict:'gf-rec-conflict','no-evidence':'gf-rec-none'
};
function MiniPlan({doc,matchIds,caption}:{doc:BlueprintDocument;matchIds?:ReadonlySet<string>;caption:string}){
 const [floor,setFloor]=useState<number>(doc.tiles.length?Math.min(...doc.tiles.map(t=>t.floor)):0);
 const floors=useMemo(()=>[...new Set(doc.tiles.map(t=>t.floor))].sort((a,b)=>a-b),[doc]);
 const shown=doc.tiles.filter(t=>t.floor===floor);
 const pts=shown.flatMap(t=>t.polygon);
 const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
 const minX=xs.length?Math.min(...xs)-20:-80,maxX=xs.length?Math.max(...xs)+20:80;
 const minY=ys.length?Math.min(...ys)-20:-80,maxY=ys.length?Math.max(...ys)+20:80;
 const viewBox=`${minX} ${minY} ${Math.max(80,maxX-minX)} ${Math.max(80,maxY-minY)}`;
 const observed=shown.filter(t=>t.observation==='observed');
 return <div className="gf-rec-preview">
  <div className="gf-rec-preview-head"><strong>{caption}</strong><select aria-label={`${caption} – Geschoss`} value={floor} onChange={e=>setFloor(Number(e.target.value))}>{floors.map(x=><option value={x} key={x}>F{x}</option>)}</select></div>
  <svg className="gf-rec-blueprint" viewBox={viewBox} role="img" aria-label={`${caption}: ${shown.length} Grundflächen auf Geschoss ${floor}`}>
   <defs><pattern id={`gf-rec-grid-${caption.replace(/[^a-z]/gi,'')}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" stroke="#526571" strokeWidth=".7" opacity=".6" fill="none"/></pattern></defs>
   <rect x={minX} y={minY} width={maxX-minX} height={maxY-minY} fill="#172328"/>
   <g>{shown.map((t:BuildingTile)=>{
    const matched=matchIds?.has(t.id),notKnown=matchIds&&!matched;
    const fill=matchIds?(matched?'#4f9c82':'#39516a'):(t.observation==='observed'?'#bb8151':'#3e4650');
    return <polygon key={t.id} points={t.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill={fill} fillOpacity={notKnown ? 0.5 : 0.9} stroke={matched?'#a9efc8':'#edc79a'} strokeWidth="2.2"/>;
   })}</g>
   <g>{doc.edges.filter(e=>e.floor===floor).map(e=><line key={e.id} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={e.kind==='doorway'||e.kind==='wall-frame'?'#f0a15c':'#d9c7af'} strokeWidth="5" strokeDasharray={e.kind==='doorway'?'7 4':undefined}/>)}</g>
  </svg>
  <small>{matchIds?`${shown.filter(t=>matchIds.has(t.id)).length} bestätigt · ${shown.filter(t=>!matchIds.has(t.id)).length} zusätzlich/ungeklärt`:`${observed.length} beobachtet · ${shown.length-observed.length} hypothetisch`}</small>
 </div>;
}
export function BlueprintRecognition({current,entries,onOpen}:Props){
 const [expanded,setExpanded]=useState(true),[selected,setSelected]=useState<string|null>(null),[showConflicts,setShowConflicts]=useState(false);
 const matches=useMemo(()=>recognizeBlueprints(current,entries),[current,entries]);
 const eligible=matches.filter(x=>x.status==='compatible'||x.status==='partial');
 const visible=(showConflicts?matches:eligible).slice(0,12);
 const picked=visible.find(x=>x.key===selected)??visible[0];
 const candidate=picked?entries.find(x=>x.key===picked.key):undefined;
 const candidateMatchIds=new Set(picked?.matchPairs.map(x=>x.candidateId)??[]);
 const observedCount=current.tiles.filter(x=>x.observation==='observed').length;
 return <section className="gf-rec-panel">
  <div className="gf-rec-title"><div><span className="gf-rec-eyebrow"><Search size={15}/> BLUEPRINT INTELLIGENCE · TEILGRUNDRISS-ABGLEICH</span><h3>BASE-KANDIDATEN ERKENNEN</h3></div>
    <button className="button" type="button" onClick={()=>setExpanded(x=>!x)}>{expanded?'Einklappen':'Erkennung öffnen'}</button></div>
  {expanded&&<>
   <p className="gf-rec-intro">Vergleicht die im Editor <strong>beobachteten</strong> Grundflächen mit den gefilterten Bibliotheks-Blueprints. Drehung, Spiegelung, Geschossversatz und bekannte Höhen werden berücksichtigt. Die Reihenfolge ist <strong>keine Wahrscheinlichkeit</strong>.</p>
   <div className="gf-rec-stats"><span><b>{observedCount}</b> Beobachtete Flächen</span><span><b>{eligible.length}</b> Plausible Kandidaten</span><span><b>{matches.length}</b> Katalogeinträge geprüft</span></div>
   {observedCount===0?<div className="gf-rec-empty">Zeichne im Canvas Studio mindestens eine sichtbare Grundfläche. Anschließend kannst du hier passende Kandidaten suchen.</div>:
   <div className="gf-rec-grid">
    <div className="gf-rec-list"><div className="gf-rec-list-head"><b>Ergebnisse nach geometrischer Übereinstimmung</b><label><input type="checkbox" checked={showConflicts} onChange={e=>setShowConflicts(e.target.checked)}/> Widersprüche anzeigen</label></div>
     {visible.map((result,i)=><button key={result.key} type="button" className={`gf-rec-choice ${picked?.key===result.key?'chosen':''}`} onClick={()=>setSelected(result.key)}>
      <div><span className="gf-rec-index">{i+1}</span><strong>{result.name}</strong><span className={`gf-rec-status ${statusStyle[result.status]}`}>{statusLabels[result.status]}</span></div>
      <small>{result.matchedTiles}/{result.observedTiles} beobachtete Flächen · {result.checkedHeights} Höhen geprüft · {result.heightConflicts+result.materialConflicts+result.edgeConflicts} Detailkonflikte</small>
     </button>)}
     {!visible.length&&<div className="gf-rec-empty">Keine plausiblen Treffer unter diesen Filtern. Weitere Flächen erfassen oder „Widersprüche anzeigen“ aktivieren. Ein leerer Trefferstand beweist nicht, dass diese Base unbekannt ist.</div>}
    </div>
    <div className="gf-rec-detail">{picked&&candidate?<>
      <div className="gf-rec-detail-top"><strong>{picked.name}</strong><span>{picked.variantLabel} · Datenqualität {picked.quality}</span></div>
      <div className="gf-rec-previews"><MiniPlan key={`obs-${current.id}`} doc={current} caption="Deine Beobachtungen"/><MiniPlan key={`candidate-${candidate.key}`} doc={candidate.doc} matchIds={candidateMatchIds} caption="Möglicher Blueprint"/></div>
      <div className="gf-rec-findings">{picked.notes.map((note,i)=><p key={i}>{note}</p>)}</div>
      <p className="gf-rec-caution"><Layers3 size={15}/> Nicht erfasste Wände, Räume und Etagen sind <strong>nicht bestätigt</strong>. Ohne validierte Vorlagen und Ingame-Messungen ergibt sich keine belastbare Trefferwahrscheinlichkeit.</p>
      <button type="button" className="button primary" onClick={()=>{if(current.tiles.length&&!confirm(`Aktuellen Plan durch „${candidate.doc.name}“ ersetzen?`))return;onOpen(structuredClone(candidate.doc));}}><FolderOpen size={15}/> Kandidaten im Editor öffnen</button>
     </>:<div className="gf-rec-empty">Bitte einen Kandidaten auswählen.</div>}</div>
   </div>}
  </>}
 </section>;
}
