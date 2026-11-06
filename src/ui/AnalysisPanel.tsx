import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Crosshair, Database, HelpCircle, Layers3, Plus, Rocket, Shield, Trash2 } from 'lucide-react';
import type { BlueprintDocument } from '../core/blueprint.ts';
import { MATERIAL_NAMES, WALL_KIND_NAMES } from '../core/editor.ts';
import { calculateManualRaid, calculateMixedRaid, RAID_REFERENCE, RAID_METHODS, RAID_METHOD_LABELS, type RaidMethod } from '../core/raid.ts';
import { planRaidRoutes, type RaidRoute } from '../core/route-planner.ts';
import { structuralConnectivity, simulateStructuralRemoval } from '../core/stability.ts';
import { compareRaidScenarios, MAX_RAID_SCENARIOS } from '../core/scenarios.ts';
import { useEditor } from '../store/useEditor.ts';
import type { SelectedEntity } from '../core/editor.ts';
export type AnalysisTab='raid'|'stability'|'stats';
export function AnalysisPanel({doc,selected,path,setPath,tab,setTab,activeRoute,allowedTabs,raidTargetId,setRaidTargetId,method,setMethod}: {
 doc:BlueprintDocument;selected:SelectedEntity;path:string[];setPath:(ids:string[])=>void;
 tab:AnalysisTab;setTab:(t:AnalysisTab)=>void;activeRoute:boolean;allowedTabs?:AnalysisTab[];
 raidTargetId:string;setRaidTargetId:(id:string)=>void;method:RaidMethod;setMethod:(m:RaidMethod)=>void;
}){
 const result=useMemo(()=>calculateManualRaid(doc,path),[doc,path]);
 const [perTargetMethods,setPerTargetMethods]=useState<Record<string,RaidMethod>>({});
 const [scenarioName,setScenarioName]=useState('');
 const [scenarioError,setScenarioError]=useState<string|null>(null);
 const saveScenario=useEditor(s=>s.saveRaidScenario);
 const deleteScenario=useEditor(s=>s.deleteRaidScenario);
 const comparisons=useMemo(()=>compareRaidScenarios(doc),[doc]);
 const saveCurrentScenario=()=>{
  const entries=result.details.map(d=>({id:d.id,method:perTargetMethods[d.id]??method}));
  try{
   saveScenario(scenarioName.trim()||`Raid-Variante ${(doc.raidScenarios?.length??0)+1}`,entries,raidTargetId||null);
   setScenarioName('');setScenarioError(null);
  }catch(error){setScenarioError(error instanceof Error?error.message:'Speichern fehlgeschlagen.');}
 };
 const restoreScenario=(id:string)=>{
  const saved=doc.raidScenarios?.find(s=>s.id===id);
  if(!saved)return;
  setPath(saved.entries.map(e=>e.id));
  setPerTargetMethods(Object.fromEntries(saved.entries.map(e=>[e.id,e.method])) as Record<string,RaidMethod>);
  setMethod(saved.entries[0]?.method??method);
  setRaidTargetId(saved.targetRoomId??'');
  setScenarioError(null);
 };
 const mixed=useMemo(()=>calculateMixedRaid(doc,result.details.map(d=>({id:d.id,method:perTargetMethods[d.id]??method}))),[doc,result,perTargetMethods,method]);
 const selectedMethodTotal=result.totals[method];
 const topology=useMemo(()=>structuralConnectivity(doc),[doc]);
 const selectedStatus=selected?topology.nodes[selected.id]:undefined;
 const impact=useMemo(()=>selected&&topology.nodes[selected.id]?simulateStructuralRemoval(doc,selected.id):null,[doc,selected,topology]);
 const targetId=doc.tiles.some(t=>t.id===raidTargetId)?raidTargetId:'';
 const routePlans=useMemo(()=>targetId?planRaidRoutes(doc,targetId,method,4):null,[doc,targetId,method]);
 const preferredRoute=routePlans?.documented[0]??null;
 const conditionalRoute=routePlans?.exploratory[0]??null;
 const adopt=(route:RaidRoute)=>setPath([...route.barrierIds]);
 const currentSelected=selected?(selected.type==='edge'?doc.edges.find(e=>e.id===selected.id):doc.tiles.find(t=>t.id===selected.id)):undefined;
 const inPath=!!selected&&path.includes(selected.id);
 const estimates=doc.tiles.length+doc.edges.length;
 const measured=[...doc.tiles,...doc.edges].filter(t=>t.stability.percent!==null).map(t=>t.stability.percent!);
 const avg=measured.length?Math.round(measured.reduce((s,v)=>s+v,0)/measured.length):null;
 const lowest=measured.length?Math.min(...measured):null;
 const grades=Object.entries(doc.tiles.reduce<Record<string,number>>((a,t)=>(a[MATERIAL_NAMES[t.grade]]=(a[MATERIAL_NAMES[t.grade]]??0)+1,a),{}));
 const total=selectedMethodTotal.count;
 const sulfur=selectedMethodTotal.sulfur;
 return <aside className={`analysis-panel ${activeRoute?'focus-panel':''}`}>
   <div className="panel-head"><span><Crosshair size={17}/> RAID & STRUKTUR-ANALYSE</span></div>
   <div className="panel-tabs">
     {(!allowedTabs||allowedTabs.includes('raid'))&&<button className={tab==='raid'?'active':''} onClick={()=>setTab('raid')}><Rocket size={14}/> Raid</button>}
     {(!allowedTabs||allowedTabs.includes('stability'))&&<button className={tab==='stability'?'active':''} onClick={()=>setTab('stability')}><Activity size={14}/> Stability</button>}
     {(!allowedTabs||allowedTabs.includes('stats'))&&<button className={tab==='stats'?'active':''} onClick={()=>setTab('stats')}><BarChart3 size={14}/> Basis</button>}
   </div>
   {tab==='raid'&&<>
     <div className="calculator-block hero-cost">
       <div className="block-eyebrow">MANUELL MARKIERTE RAID-ROUTE <span className="small-label">REFERENZWERTE</span></div>
       <div className="calc-mode gf-methods">{RAID_METHODS.map(m=><button key={m} className={method===m?'on':''} onClick={()=>setMethod(m)}>{RAID_METHOD_LABELS[m]}</button>)}</div>
       <div className="big-calc"><span>{total===null?'?':total.toLocaleString('de-DE')}</span><div><strong>{RAID_METHOD_LABELS[method]}</strong><small>{sulfur===null?`Bekannt: ${selectedMethodTotal.knownSulfur.toLocaleString('de-DE')} Schwefel · Teilsumme`:`≈ ${sulfur.toLocaleString('de-DE')} Schwefel`}</small></div></div>
       <div className="gf-raid-counts"><span>{result.details.length} ausgewählt</span><span>{selectedMethodTotal.knownTargets} bewertet</span><span>{result.details.filter(d=>d.counts[method]===0).length} frei</span><span className={selectedMethodTotal.unknownTargets?'is-unknown':''}>{selectedMethodTotal.unknownTargets} offen</span></div>
       {selectedMethodTotal.unknownTargets>0&&<p className="gf-raid-partial" role="status">Teilberechnung: {selectedMethodTotal.knownCount.toLocaleString('de-DE')} {RAID_METHOD_LABELS[method]} für {selectedMethodTotal.knownTargets} Ziel(e). {selectedMethodTotal.unknownTargets} weitere Ziele ohne belastbaren Referenzwert. Keine vollständige Gesamtsumme.</p>}
       <p className="subtle-note">Kalkulation für die dokumentierten Durchgangshindernisse. Leere Türöffnungen/Wandrahmen zählen mit 0. Unbekannte Bauteile verhindern eine vollständige Gesamtsumme. Ohne Splash- oder Einsturzoptimierung.</p>
     </div>
     <div className="calculator-block">
       <div className="block-headline"><span>RAID-ZIELE</span><span className="counter">{result.details.length}</span></div>
       {currentSelected&&<button className="accent-wide" onClick={()=>setPath(inPath?path.filter(id=>id!==selected?.id):[...path,selected!.id])}>
         {inPath?<Trash2 size={16}/>:<Plus size={16}/>} {inPath?'Aus Route entfernen':'Ausgewähltes Bauteil zur Route'}
       </button>}
       {!currentSelected&&<p className="subtle-note">Klicke im 2D-Plan auf eine Wand, Tür oder Fläche und füge das Element hier zur Raid-Route hinzu.</p>}
       <div className="route-list">{result.details.map((d,i)=><div key={d.id} className="route-row gf-cost-row"><span className="route-step">{i+1}</span><div><strong>{d.label}</strong><small>{d.reason??`${d.rockets} Rockets · ${d.c4} C4 · ${d.satchels} Satchels · ${d.exploAmmo} Explo`}</small><span className="gf-cost-line">{d.counts[method]===null?'Kein Referenzwert':`${d.counts[method]!.toLocaleString('de-DE')} ${RAID_METHOD_LABELS[method]}`}</span></div><button aria-label={`${d.label} entfernen`} onClick={()=>setPath(path.filter(x=>x!==d.id))}><Trash2 size={14}/></button></div>)}
         {!result.details.length&&<div className="empty-route"><Crosshair size={24}/><span>Noch keine Raid-Ziele markiert</span></div>}</div>
       {!!path.length&&<button className="muted-wide" onClick={()=>setPath([])}><Trash2 size={13}/> Route leeren</button>}
     </div>
     <div className="calculator-block gf-mixed-raid" aria-label="Gemischter Raid-Plan">
       <div className="block-headline"><span>GEMISCHTER RAID-PLAN</span><span className="small-label">MANUELLE METHODENWAHL</span></div>
       <p className="subtle-note">Für jedes markierte Bauteil kannst du eine eigene Sprengmittelart festlegen. Das sind Voll-HP-Referenzkosten pro Ziel – keine simulierte Kombination mehrerer Sprengmittel auf derselben Wand.</p>
       {mixed.lines.map(line=><div key={line.id} className="gf-mixed-line">
        <div><strong>{line.label}</strong><small>{line.count===null?'Referenzwert fehlt':`${line.count.toLocaleString('de-DE')} ${RAID_METHOD_LABELS[line.method]} · ${line.sulfur!.toLocaleString('de-DE')} Schwefel`}</small></div>
        <select aria-label={`Sprengmittel für ${line.label}`} value={perTargetMethods[line.id]??method} onChange={e=>setPerTargetMethods(m=>({...m,[line.id]:e.target.value as RaidMethod}))}>
          {RAID_METHODS.map(m=><option key={m} value={m}>{RAID_METHOD_LABELS[m]}</option>)}
        </select>
       </div>)}
       {!mixed.lines.length&&<p className="subtle-note">Wähle zuerst Bauteile im Plan aus.</p>}
       {!!mixed.lines.length&&<>
        <div className="gf-mixed-total"><span>{mixed.complete?'Gesamter Schwefelbedarf':'Schwefel-Teilsumme'}</span><strong>{mixed.complete?`${mixed.knownSulfur.toLocaleString('de-DE')} S`:'Nicht vollständig berechenbar'}</strong></div>
        {RAID_METHODS.filter(m=>mixed.byMethod[m].targets>0).map(m=><div key={m} className="statline"><span>{RAID_METHOD_LABELS[m]}</span><strong>{mixed.byMethod[m].count.toLocaleString('de-DE')} · {mixed.byMethod[m].sulfur.toLocaleString('de-DE')} S</strong></div>)}
        {mixed.unknownTargets>0&&<p className="gf-raid-partial">Bekannte Teilsumme: {mixed.knownSulfur.toLocaleString('de-DE')} Schwefel. {mixed.unknownTargets} von {mixed.totalTargets} Position(en) sind nicht berechenbar. Daher keine exakte Gesamtsumme.</p>}
       </>}
     </div>
     <div className="calculator-block gf-scenario-workbench" aria-label="Gespeicherte Raid-Varianten">
       <div className="block-headline"><span>RAID-VARIANTEN VERGLEICHEN</span><span className="small-label">{comparisons.length}/{MAX_RAID_SCENARIOS} GESPEICHERT</span></div>
       <p className="subtle-note">Mehrere Wege mit eigener Munitionswahl speichern und vergleichen. Kosten werden nach jeder Änderung am Blueprint neu berechnet. Nur vollständig kalkulierbare Varianten erhalten einen Kostenrang; das belegt keinen realen oder optimalen Raidweg.</p>
       <div className="gf-scenario-save">
         <input type="text" maxLength={100} value={scenarioName} onChange={e=>setScenarioName(e.target.value)}
          placeholder={`Raid-Variante ${(doc.raidScenarios?.length??0)+1}`} aria-label="Name der Raid-Variante"/>
         <button className="accent-wide" disabled={!mixed.lines.length||comparisons.length>=MAX_RAID_SCENARIOS}
           onClick={saveCurrentScenario}><Plus size={14}/> Aktuelle Route speichern</button>
       </div>
       {scenarioError&&<p className="gf-raid-partial" role="alert">{scenarioError}</p>}
       {!comparisons.length&&<p className="subtle-note">Noch keine Varianten vorhanden. Bauteile und Sprengmittel auswählen, dann die aktuelle Route speichern.</p>}
       <div className="gf-scenario-list">{comparisons.map(row=><div className="gf-scenario-card" key={row.id}>
         <div className="gf-scenario-heading"><strong>{row.rank!==null?`#${row.rank} · `:''}{row.name}</strong>
          <span className={row.complete?'gf-scenario-complete':'gf-scenario-incomplete'}>{row.complete?'Berechenbar':`${row.unknownTargets} ungeklärt`}</span></div>
         <div className="gf-scenario-meta"><span>{row.totalTargets} Ziele · {row.freePassages} freie Durchgänge</span>
          <strong>{row.complete?`${row.totalSulfur!.toLocaleString('de-DE')} Schwefel`:'Keine exakte Summe'}</strong></div>
         {!row.complete&&<small className="gf-scenario-subtotal">Bekannte Teilsumme: {row.knownSulfur.toLocaleString('de-DE')} Schwefel</small>}
         <div className="gf-scenario-weapons">{RAID_METHODS.filter(m=>row.byMethod[m].targets>0).map(m=>
          <span key={m}>{row.byMethod[m].count.toLocaleString('de-DE')} {RAID_METHOD_LABELS[m]}</span>)}</div>
         <div className="gf-scenario-actions"><button onClick={()=>restoreScenario(row.id)}>Im Raid-Plan laden</button>
          <button title="Variante löschen" aria-label={`${row.name} löschen`} onClick={()=>deleteScenario(row.id)}><Trash2 size={14}/></button></div>
       </div>)}</div>
     </div>
     <div className="calculator-block gf-route-planner" aria-label="Automatische Raid-Routenplanung">
       <div className="block-headline"><span>AUTOMATISCHE ROUTENSUCHE</span><span className="small-label">GRAPH · REFERENZ</span></div>
       <p className="subtle-note">Wähle einen Zielraum (Core/Loot) selbst. Der Graph sucht ab der Außenkante über dokumentierte Wände, Türen und übereinanderliegende Bodenflächen. Er erfindet keine Innenwände.</p>
       <label className="gf-route-label" htmlFor="gf-route-goal">Zielraum / Grundfläche</label>
       <select id="gf-route-goal" className="gf-route-select" value={targetId} onChange={e=>setRaidTargetId(e.target.value)}>
         <option value="">Ziel auswählen …</option>
         {doc.tiles.map(t=><option key={t.id} value={t.id}>F{t.floor} · {t.kind} · {t.id.slice(0,9)}</option>)}
       </select>
       {selected?.type==='tile'&&doc.tiles.some(t=>t.id===selected.id)&&<button className="muted-wide" onClick={()=>setRaidTargetId(selected.id)}>Markierte Grundfläche als Ziel setzen</button>}
       {routePlans&&<>
         <div className="gf-route-result">
          <div className="gf-route-result-head"><strong>Günstigster modellierter Weg</strong><span>{RAID_METHOD_LABELS[method]}</span></div>
          {preferredRoute?<>
           <div className="gf-route-total"><strong>{preferredRoute.methodTotal} {RAID_METHOD_LABELS[method]}</strong><span>{preferredRoute.sulfur?.toLocaleString('de-DE')} Schwefel</span></div>
           <small>{preferredRoute.steps.length} Übergänge · Eintritt über F{preferredRoute.entryFloor} · ohne unbekannte Kanten</small>
           <button className="accent-wide" onClick={()=>adopt(preferredRoute)}>Route in manuellen Plan übernehmen</button>
          </>:<p className="gf-route-unknown">Kein vollständig modellierter Zugang zum Ziel erfasst.</p>}
         </div>
         {routePlans.documented.slice(1,4).map((route,i)=><button className="gf-route-alternative" key={route.entryKey} onClick={()=>adopt(route)}>
           <span>Alternative {i+2}: {route.methodTotal} {RAID_METHOD_LABELS[method]}</span><b>{route.sulfur?.toLocaleString('de-DE')} S</b>
         </button>)}
         {!preferredRoute&&conditionalRoute&&<div className="gf-route-conditional">
           <strong>Nur hypothetische Route gefunden</strong>
           <span>{conditionalRoute.uncertainSteps} unbekannte Kante(n) · {conditionalRoute.knownSulfur.toLocaleString('de-DE')} Schwefel nur für bekannte Hindernisse</span>
           <p>Keine belastbare Gesamtkostenangabe. Trage fehlende Wände und Durchgänge nach.</p>
         </div>}
         {routePlans.warnings.slice(0,2).map(w=><p className="gf-route-hint" key={w}>{w}</p>)}
       </>}
       <p className="gf-route-hint">Keine Splash-Damage-, Soft-Side-, Einsturz- oder Bunker-Mechanik. Quellenwerte gelten für intakte Ziele und sind keine eigene Ingame-Messung.</p>
     </div>
     <div className="reference-note"><HelpCircle size={14}/><span><strong>Quellenstand: {RAID_REFERENCE.patch}</strong> · geprüft {RAID_REFERENCE.reviewedAt} · nicht eigenständig im Spiel validiert. {doc.game.patch&&doc.game.patch!==RAID_REFERENCE.patch?<b> Achtung: Blueprint-Patch {doc.game.patch} weicht ab. </b>:null}{RAID_REFERENCE.sources.map((src,i)=><span key={src.url}>{i?' · ':''}<a href={src.url} target="_blank" rel="noreferrer">{src.name}</a></span>)}</span></div>
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
     <div className="calculator-block structural-block">
       <div className="block-headline"><span>STRUKTURMODELL V1</span><span className="small-label">TOPOLOGIE · BETA</span></div>
       <div className="structural-grid"><div><strong>{topology.anchors.length}</strong><small>Fundament-Anker</small></div><div><strong>{topology.linkedCount}</strong><small>Verbunden (inkl. Anker)</small></div><div className={topology.unverifiedCount?'structural-alert':''}><strong>{topology.unverifiedCount}</strong><small>Nicht nachgewiesen</small></div><div><strong>{topology.links.length}</strong><small>Geometrische Verbindungen</small></div></div>
       <div className="structural-legend"><span><i className="structural-dot anchor"/>Fundament</span><span><i className="structural-dot linked"/>Verbindung</span><span><i className="structural-dot unverified"/>Ungeklärt</span></div>
       <p className="subtle-note">Die Engine verknüpft gleichhohe Nachbarflächen und eingetragene Wände mit passenden oberen Bodenplatten. Ein Fundament auf F0 gilt nur im Modell als Anker.</p>
       {topology.warnings.slice(0,2).map((warning,i)=><p key={i} className="structural-warning">{warning}</p>)}
     </div>
     <div className="calculator-block">
       <div className="block-headline"><span>STÜTZPFAD / WAS-WÄRE-WENN</span><span className="small-label">NICHT DESTRUKTIV</span></div>
       {selectedStatus?<>
         <div className="statline"><span>Gewähltes Bauteil</span><strong>{selectedStatus.type==='tile'?'Grundfläche':'Wand / Rahmen'} · F{selectedStatus.floor}</strong></div>
         <div className="statline"><span>Dokumentierter Ankerpfad</span><strong>{selectedStatus.status==='anchor'?'Fundament-Anker':selectedStatus.status==='linked'?`${selectedStatus.distance} Verbindung(en)`:'Nicht nachgewiesen'}</strong></div>
         <div className="statline"><span>Nachbarn im Strukturmodell</span><strong>{selectedStatus.neighbors}</strong></div>
         <div className={`structural-impact ${impact?.newlyUnverified.length?'structural-impact-risk':''}`}>
           <strong>Bauteil hypothetisch entfernen</strong>
           <span>{impact?.newlyUnverified.length?`${impact.newlyUnverified.length} weitere Bauteile verlieren dabei im Modell ihren Fundamentpfad.`:'Kein zusätzlicher Verlust eines bereits nachgewiesenen Fundamentpfads.'}</span>
           {!!impact?.newlyUnverified.length&&<small>Betroffene IDs: {impact.newlyUnverified.slice(0,5).map(id=>id.slice(0,10)).join(', ')}{impact.newlyUnverified.length>5?' …':''}</small>}
         </div>
       </>:<p className="subtle-note">Im 2D-Bauplan ein Fundament, einen Boden oder eine Wand anklicken. Hier erscheinen der nachvollziehbare Stützpfad und die Folgen einer hypothetischen Entfernung.</p>}
       <p className="subtle-note">Keine Bauteile werden verändert. Nicht nachgewiesen bedeutet NICHT automatisch Einsturz. Rust-Werte können nur durch Ingame-Validierung verifiziert werden.</p>
     </div>
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
