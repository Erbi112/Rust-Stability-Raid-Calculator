import {useEffect,useMemo,useRef,useState} from 'react';
import { BookOpen, Database, Download, FilePlus, FolderOpen, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type {BlueprintDocument} from '../core/blueprint.ts';
import {BASE_ROLES,BIOMES,BOOLS,BUNKER_TYPES,FEATURE_GROUPS,FEATURE_KEYS,FEATURE_LABELS,GROUPS,FOOTPRINTS,BUILD_STAGES,DEFENSE_MODES,
 blueprintsMatchFilter,defaultFilter,defaultMetadata,defaultVerification,hasInGameEvidence,metadataOf,VERIFICATION_STATUSES,
 type BlueprintMetadata,type BlueprintVerification,type FeatureKey,type GroupSize,type LibraryEntry,type LibraryFilter,type KnownBoolean} from '../core/library.ts';
import {exampleBunkerProject,exampleProject} from '../core/editor.ts';
import {listLibraryDocuments,removeLibraryDocument,saveLibraryDocument} from '../services/library-storage.ts';
import {exportProject,importProject} from '../services/persistence.ts';
import {useEditor} from '../store/useEditor.ts';
import {BlueprintRecognition} from './BlueprintRecognition.tsx';
import {recognizeBlueprints} from '../core/recognition.ts';

const labels:Record<string,string>={
  unknown:'Unbekannt',all:'Alle',solo:'Solo',duo:'Duo',trio:'Trio',squad:'Squad (4–6)',clan:'Clan (7+)',
  starter:'Starter',main:'Main Base',bunker:'Bunker',farm:'Farm Base',industrial:'Industrie',compound:'Compound',external:'External-TC-Base',raid:'Raid Base',trap:'Trap Base',water:'Water Base',cave:'Cave Base',tower:'Tower',pvp:'PvP',boat:'Boat Base',utility:'Utility',
  none:'Kein Bunker',stability:'Stability-Bunker',roof:'Roof-Bunker',offset:'Offset-Bunker','pixel-gap':'Pixel Gap',suicide:'Suicide-Bunker',triangle:'Triangle-Bunker',floor:'Floor-Bunker',multi:'Multi-Bunker',other:'Sonstiges',
  grassland:'Grasland',desert:'Wüste',snow:'Schnee',forest:'Wald',coast:'Küste',cliff:'Klippe',river:'Fluss',road:'Straße',mountain:'Gebirge',yes:'Ja',no:'Nein',finished:'Fertig',expandable:'Erweiterbar',offline:'Offline',online:'Online',balanced:'Ausgewogen',freeform:'Freiform',hexagonal:'Hexagonal',circular:'Rund',
  L0:'L0 · Nur Referenz',L1:'L1 · Kontur',L2:'L2 · Grundriss',L3:'L3 · Geschosse',L4:'L4 · Detailgrad (kein Prüfbeleg)',
  unverified:'Nicht geprüft','source-documented':'Quelle dokumentiert','in-game-tested':'Ingame-Test mit Beleg',
  twig:'Twig',wood:'Holz',stone:'Stein',metal:'Metall',armored:'HQM',local:'Lokal',imported:'Importiert',demo:'Demo',
};
const text=(key:string)=>labels[key]??key;
const demoEntries=():LibraryEntry[]=>[
 {key:'demo-standard',doc:{...exampleProject(),id:'demo-standard',name:'Compact Compound · Demo',library:{...defaultMetadata(),role:'compound',features:{honeycomb:'yes',externalTC:'unknown'}}},origin:'demo',storedAt:'2026-11-05'},
 {key:'demo-offset',doc:{...exampleBunkerProject(),id:'demo-offset',name:'Foundation Offset · Demo',library:{...defaultMetadata(),bunker:'unknown',features:{offsetFoundations:'yes',stabilityBunker:'unknown'}}},origin:'demo',storedAt:'2026-11-05'}
];
type Props={current:BlueprintDocument;onOpen:(doc:BlueprintDocument)=>void;notify:(message:string)=>void};
function FilterSelect({label,value,values,change}:{label:string;value:string;values:readonly string[];change:(value:string)=>void}){
 return <label className="library-field"><span>{label}</span><select value={value} onChange={e=>change(e.target.value)}>{values.map(v=><option key={v} value={v}>{text(v)}</option>)}</select></label>
}
function OptionalNumber({label,value,change}:{label:string;value:number|null;change:(v:number|null)=>void}){
 return <label className="library-field"><span>{label}</span><input type="number" min={0} value={value??''} placeholder="Alle" onChange={e=>change(e.target.value===''?null:Number(e.target.value))}/></label>
}
export function BlueprintLibrary({current,onOpen,notify}:Props){
 const [items,setItems]=useState<LibraryEntry[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [filters,setFilters]=useState<LibraryFilter>(defaultFilter());
 const [editMeta,setEditMeta]=useState(false),[showAdvanced,setShowAdvanced]=useState(false),[sort,setSort]=useState<'new'|'name'|'similarity'|'upkeep'|'rockets'|'size'|'floors'>('new');
 const [metadata,setMetadata]=useState<BlueprintMetadata>(metadataOf(current));
 const [sourceFields,setSourceFields]=useState({...current.source});
 const [gamePatch,setGamePatch]=useState(current.game.patch??'');
 const importInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{let alive=true;listLibraryDocuments().then(result=>{if(alive)setItems(result)}).catch(e=>notify(e instanceof Error?e.message:'Bibliothek nicht verfügbar')).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
 useEffect(()=>{setMetadata(metadataOf(current));setSourceFields({...current.source});setGamePatch(current.game.patch??'')},[current.id]);
 const all=useMemo(()=>[...demoEntries(),...items],[items]);
 const geometricMatches=useMemo(()=>recognizeBlueprints(current,all),[current,all]);
 const geometricByKey=useMemo(()=>new Map(geometricMatches.map(x=>[x.key,x])),[geometricMatches]);
 const filtered=useMemo(()=>all.filter(x=>blueprintsMatchFilter(x,filters)).sort((a,b)=>{
  if(sort==='similarity')return (geometricByKey.get(b.key)?.rank??-Infinity)-(geometricByKey.get(a.key)?.rank??-Infinity);
  if(sort==='name')return a.doc.name.localeCompare(b.doc.name);
  if(sort==='size')return b.doc.tiles.length-a.doc.tiles.length;
  if(sort==='floors')return new Set(b.doc.tiles.map(x=>x.floor)).size-new Set(a.doc.tiles.map(x=>x.floor)).size;
  if(sort==='upkeep'||sort==='rockets'){
    const metric=(e:LibraryEntry)=>sort==='upkeep'?metadataOf(e.doc).upkeep24h:metadataOf(e.doc).raidMinimumRockets;
    return (metric(a)??Number.POSITIVE_INFINITY)-(metric(b)??Number.POSITIVE_INFINITY);
  }
  return b.storedAt.localeCompare(a.storedAt);
 }),[all,filters,sort,geometricByKey]);
 const featureRequirements=Object.entries(filters.featureConstraints).length;
 const activeCount=featureRequirements+filters.groups.length+[filters.role,filters.bunker,filters.biome,filters.footprint,filters.stage,filters.defense,filters.quality,filters.verification,filters.grade,filters.origins].filter(x=>x!=='all').length+
 [filters.query.trim(),filters.floorsMin,filters.floorsMax,filters.minTiles,filters.maxTiles,filters.rocketMax,filters.upkeepMax,filters.externalTCMin,filters.bunkerCountMin,filters.lootRoomsMin,filters.buildCostStoneMax].filter(x=>x!==''&&x!==null).length;

 const change=<K extends keyof LibraryFilter>(key:K,value:LibraryFilter[K])=>setFilters(prev=>({...prev,[key]:value}));
 const changeMeta=<K extends keyof BlueprintMetadata>(key:K,value:BlueprintMetadata[K])=>setMetadata(prev=>({...prev,[key]:value}));
 const changeVerification=<K extends keyof BlueprintVerification>(key:K,value:BlueprintVerification[K])=>setMetadata(prev=>({...prev,verification:{...(prev.verification??defaultVerification()),[key]:value}}));
 const setRequirement=(key:FeatureKey,value:string)=>setFilters(prev=>{
  const next={...prev.featureConstraints};
  if(value==='all')delete next[key];else next[key]=value as KnownBoolean;
  return {...prev,featureConstraints:next};
 });
 const toggleGroup=(group:GroupSize)=>setFilters(prev=>({...prev,group:'all',groups:prev.groups.includes(group)?prev.groups.filter(g=>g!==group):[...prev.groups,group]}));
 const toggleSupportedGroup=(group:GroupSize)=>setMetadata(prev=>({...prev,supportedGroups:(prev.supportedGroups??[]).includes(group)?(prev.supportedGroups??[]).filter(g=>g!==group):[...(prev.supportedGroups??[]),group]}));

 const sync=async()=>setItems(await listLibraryDocuments());
 const saveCurrent=async()=>{
  if(!current.tiles.length){notify('Bitte zuerst einen Blueprint zeichnen.');return;}
  if(metadata.verification?.status==='in-game-tested'&&!hasInGameEvidence({...current,library:metadata})){notify('Für einen Ingame-Prüfnachweis sind Patch, Datum und ein HTTP(S)-Beleglink erforderlich.');return;}
  setBusy(true);try{useEditor.getState().updateLibraryMetadata(metadata,sourceFields,gamePatch.trim()||null);await saveLibraryDocument(useEditor.getState().doc,'local');await sync();notify('Blueprint mit seinen Filtermerkmalen lokal gespeichert.');setEditMeta(false);}catch(e){notify(String(e));}finally{setBusy(false)}
 };
 const importFiles=async(files:File[])=>{
  if(files.length>100){notify('Maximal 100 Blueprint-Dateien pro Importvorgang.');return;}
  setBusy(true);let added=0;const errors:string[]=[];
  const existing=new Set(all.map(e=>e.doc.id));
  for(const file of files){try{
   const doc=await importProject(file);
   if(existing.has(doc.id)){errors.push(`${file.name}: ID bereits vorhanden`);continue;}
   await saveLibraryDocument(doc,'imported');existing.add(doc.id);added++;
  }catch(e){errors.push(`${file.name}: ${e instanceof Error?e.message:'ungültig'}`);}}
  try{await sync()}catch(e){errors.push(String(e))}
  setBusy(false);
  notify(`${added} Blueprint(s) importiert${errors.length?` · ${errors.length} übersprungen (erste: ${errors.slice(0,2).join('; ')})`:''}.`);
 };
 const remove=async(e:LibraryEntry)=>{if(!confirm(`„${e.doc.name}“ aus der lokalen Bibliothek löschen?`))return;setBusy(true);try{await removeLibraryDocument(e.key);await sync();notify('Bibliothekseintrag gelöscht.')}catch(err){notify(String(err))}finally{setBusy(false)}};
 return <div className="full-module blueprint-library-v8">
  <div className="library-intro"><div><span className="library-kicker"><BookOpen size={15}/> BLUEPRINT INTELLIGENCE · DATENBANK</span><h2>BLUEPRINT-BIBLIOTHEK</h2><p>Eigene oder erlaubte Baupläne sammeln, klassifizieren, nach Höhen, Bunkern und Features suchen und strukturell mit der aktuellen Base vergleichen.</p></div>
   <div className="library-actions"><button className="button primary" disabled={busy} onClick={()=>setEditMeta(v=>!v)}><FilePlus size={15}/> Aktuelle Base katalogisieren</button><button className="button" onClick={()=>importInput.current?.click()}><FolderOpen size={15}/> Mehrere JSON importieren</button>
    <input type="file" hidden ref={importInput} multiple accept=".json,.ghostframe.json,application/json" onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length)void importFiles(files);}}/></div></div>
  <div className="library-summary"><div><strong>{all.length}</strong><span>Blueprints gesamt</span></div><div><strong>{items.length}</strong><span>Eigene und importierte</span></div><div><strong>{filtered.length}</strong><span>Aktuelle Treffer</span></div><div><strong>{all.filter(e=>hasInGameEvidence(e.doc)).length}</strong><span>Mit Ingame-Beleg</span></div></div>
  <BlueprintRecognition current={current} entries={filtered} onOpen={onOpen}/>
  {editMeta&&<section className="library-edit"><div className="library-heading"><strong>AKTUELLE BASE · KATALOGMERKMALE</strong><button onClick={()=>setEditMeta(false)} title="Schließen"><X size={16}/></button></div>
    <div className="library-fields">
     <FilterSelect label="Primäre Gruppengröße" value={metadata.group} values={GROUPS} change={x=>changeMeta('group',x as BlueprintMetadata['group'])}/>
     <FilterSelect label="Grundriss-Größe" value={metadata.footprint??'unknown'} values={FOOTPRINTS} change={x=>changeMeta('footprint',x as BlueprintMetadata['footprint'])}/>
     <FilterSelect label="Ausbaustufe" value={metadata.stage??'unknown'} values={BUILD_STAGES} change={x=>changeMeta('stage',x as BlueprintMetadata['stage'])}/>
     <FilterSelect label="Verteidigungsfokus" value={metadata.defense??'unknown'} values={DEFENSE_MODES} change={x=>changeMeta('defense',x as BlueprintMetadata['defense'])}/>

     <FilterSelect label="Base-Typ" value={metadata.role} values={BASE_ROLES} change={x=>changeMeta('role',x as BlueprintMetadata['role'])}/>
     <FilterSelect label="Bunker-Mechanik" value={metadata.bunker} values={BUNKER_TYPES} change={x=>changeMeta('bunker',x as BlueprintMetadata['bunker'])}/>
     <FilterSelect label="Biom / Standort" value={metadata.biome} values={BIOMES} change={x=>changeMeta('biome',x as BlueprintMetadata['biome'])}/>
     <OptionalNumber label="Upkeep 24h (Referenz)" value={metadata.upkeep24h??null} change={x=>changeMeta('upkeep24h',x)}/>
     <OptionalNumber label="Raid-Kosten Rockets (Referenz)" value={metadata.raidMinimumRockets??null} change={x=>changeMeta('raidMinimumRockets',x)}/>
     <OptionalNumber label="Looträume" value={metadata.lootRooms??null} change={x=>changeMeta('lootRooms',x)}/>
     <OptionalNumber label="Empfohlene Spieler" value={metadata.recommendedPlayers??null} change={x=>changeMeta('recommendedPlayers',x)}/>
     <OptionalNumber label="External TCs (Anzahl)" value={metadata.externalTCCount??null} change={x=>changeMeta('externalTCCount',x)}/>
     <OptionalNumber label="Bunker (Anzahl)" value={metadata.bunkerCount??null} change={x=>changeMeta('bunkerCount',x)}/>
     <OptionalNumber label="Wandlagen" value={metadata.wallLayers??null} change={x=>changeMeta('wallLayers',x)}/>
     <OptionalNumber label="Baukosten · Stein" value={metadata.buildCostStone??null} change={x=>changeMeta('buildCostStone',x)}/>
     <OptionalNumber label="Baukosten · Metall" value={metadata.buildCostMetal??null} change={x=>changeMeta('buildCostMetal',x)}/>
     <OptionalNumber label="Baukosten · HQM" value={metadata.buildCostHQM??null} change={x=>changeMeta('buildCostHQM',x)}/>

     <label className="library-field wide"><span>Tags (durch Komma getrennt)</span><input value={metadata.tags.join(', ')} onChange={e=>changeMeta('tags',e.target.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,40))} placeholder="2x2, 3x3, Peakdowns ..."/></label>
     <label className="library-field wide"><span>Quellenhinweise / Notizen</span><input value={metadata.creatorNote??''} maxLength={3000} onChange={e=>changeMeta('creatorNote',e.target.value)} placeholder="Quelle, Validierungsstand, Besonderheiten"/></label>
     <FilterSelect label="Prüf- und Quellenstatus" value={metadata.verification?.status??'unverified'} values={VERIFICATION_STATUSES} change={v=>changeVerification('status',v as BlueprintVerification['status'])}/>
     <label className="library-field"><span>Getesteter Rust-Patch</span><input maxLength={120} value={metadata.verification?.patch??''} onChange={e=>changeVerification('patch',e.target.value||null)} placeholder="z. B. 2026-09-03"/></label>
     <label className="library-field"><span>Testdatum</span><input type="date" value={metadata.verification?.checkedAt??''} onChange={e=>changeVerification('checkedAt',e.target.value||null)}/></label>
     <label className="library-field wide"><span>Nachweis-URL (Video, Screenshot, Baudokumentation)</span><input type="url" maxLength={1000} value={metadata.verification?.evidenceUrl??''} onChange={e=>changeVerification('evidenceUrl',e.target.value||null)} placeholder="https://..."/></label>
     <label className="library-field wide"><span>Was wurde tatsächlich im Spiel geprüft?</span><input maxLength={3000} value={metadata.verification?.notes??''} onChange={e=>changeVerification('notes',e.target.value)} placeholder="Bauzustand, Servermodus, Bunkerauslösung, Testbedingungen ..."/></label>
    </div>
    <div className="library-group-block"><strong>Weitere geeignete Gruppengrößen (Mehrfachauswahl)</strong><div className="library-group-chips">{GROUPS.filter(g=>g!=='unknown').map(g=><button key={g} type="button" className={(metadata.supportedGroups??[]).includes(g)?'on':''} aria-pressed={(metadata.supportedGroups??[]).includes(g)} onClick={()=>toggleSupportedGroup(g)}>{text(g)}</button>)}</div></div>
    <div className="library-feature-heading">BAU- UND VERTEIDIGUNGSMERKMALE · {FEATURE_KEYS.length} FILTER</div>
    {FEATURE_GROUPS.map((group,i)=><details key={group.label} className="library-feature-group" open={i===0}>
      <summary>{group.label} <span>{group.keys.filter(k=>(metadata.features[k]??'unknown')!=='unknown').length} erfasst</span></summary>
      <div className="library-features">{group.keys.map(k=><label className="library-feature" key={k}><span>{FEATURE_LABELS[k]}</span><select aria-label={FEATURE_LABELS[k]} value={metadata.features[k]??'unknown'} onChange={e=>changeMeta('features',{...metadata.features,[k]:e.target.value as KnownBoolean})}>{BOOLS.map(v=><option value={v} key={v}>{text(v)}</option>)}</select></label>)}</div>
    </details>)}
    <div className="gf-evidence-info">Datenqualität (L0–L4) und Prüfstatus sind unabhängig. Ein Ingame-Nachweis ist eine manuell hinterlegte Angabe, die hier nicht automatisch auf Echtheit geprüft wird. Nur mit Patch, Datum und Beleglink wird er entsprechend gekennzeichnet.</div>
    <button className="button primary" disabled={busy||!current.tiles.length} onClick={()=>void saveCurrent()}><Database size={15}/> Blueprint und Merkmale speichern</button>
    <p className="library-small">Die Merkmale werden bewusst manuell gepflegt. Nicht belegte Angaben bleiben „Unbekannt“. Speichern ersetzt bei gleicher Projekt-ID den bisherigen Bibliothekseintrag.</p>
   </section>}
  <section className="library-filter-panel"><div className="library-heading"><strong><SlidersHorizontal size={16}/> SUCHEN & FILTERN · {activeCount} AKTIV</strong><div className="library-heading-actions"><button onClick={()=>setShowAdvanced(v=>!v)}>{showAdvanced?'Weniger Filter':'Erweiterte Filter'}</button><button onClick={()=>setFilters(defaultFilter())}><RefreshCw size={13}/> Zurücksetzen</button></div></div>
   <div className="library-fields"><label className="library-field wide"><span>Blueprint suchen</span><span className="library-search"><Search size={15}/><input value={filters.query} placeholder="Name, Creator, Stichwörter ..." onChange={e=>change('query',e.target.value)}/></span></label>
    <FilterSelect label="Grundriss-Größe" value={filters.footprint} values={['all',...FOOTPRINTS]} change={v=>change('footprint',v as LibraryFilter['footprint'])}/>
    <FilterSelect label="Ausbaustufe" value={filters.stage} values={['all',...BUILD_STAGES]} change={v=>change('stage',v as LibraryFilter['stage'])}/>
    <FilterSelect label="Verteidigungsfokus" value={filters.defense} values={['all',...DEFENSE_MODES]} change={v=>change('defense',v as LibraryFilter['defense'])}/>

    <FilterSelect label="Base-Typ" value={filters.role} values={['all',...BASE_ROLES]} change={v=>change('role',v as LibraryFilter['role'])}/>
    <FilterSelect label="Bunker-Art" value={filters.bunker} values={['all',...BUNKER_TYPES]} change={v=>change('bunker',v as LibraryFilter['bunker'])}/>

    <FilterSelect label="Biome" value={filters.biome} values={['all',...BIOMES]} change={v=>change('biome',v as LibraryFilter['biome'])}/>
    {showAdvanced&&<>
     <FilterSelect label="Quellenqualität" value={filters.quality} values={['all','L0','L1','L2','L3','L4']} change={v=>change('quality',v)}/>
     <FilterSelect label="Nachweisstatus" value={filters.verification} values={['all',...VERIFICATION_STATUSES]} change={v=>change('verification',v as LibraryFilter['verification'])}/>
     <FilterSelect label="Material" value={filters.grade} values={['all','twig','wood','stone','metal','armored']} change={v=>change('grade',v as LibraryFilter['grade'])}/>
     <FilterSelect label="Herkunft" value={filters.origins} values={['all','local','imported','demo']} change={v=>change('origins',v as LibraryFilter['origins'])}/>
     <OptionalNumber label="Etagen ab" value={filters.floorsMin} change={v=>change('floorsMin',v)}/>
     <OptionalNumber label="Etagen bis" value={filters.floorsMax} change={v=>change('floorsMax',v)}/>
     <OptionalNumber label="Flächen ab" value={filters.minTiles} change={v=>change('minTiles',v)}/>
     <OptionalNumber label="Flächen bis" value={filters.maxTiles} change={v=>change('maxTiles',v)}/>
     <OptionalNumber label="Max. Rockets (Referenz)" value={filters.rocketMax} change={v=>change('rocketMax',v)}/>
     <OptionalNumber label="Max. Upkeep 24h (Referenz)" value={filters.upkeepMax} change={v=>change('upkeepMax',v)}/>
     <OptionalNumber label="External TCs mindestens" value={filters.externalTCMin} change={v=>change('externalTCMin',v)}/>
     <OptionalNumber label="Bunker mindestens" value={filters.bunkerCountMin} change={v=>change('bunkerCountMin',v)}/>
     <OptionalNumber label="Looträume mindestens" value={filters.lootRoomsMin} change={v=>change('lootRoomsMin',v)}/>
     <OptionalNumber label="Max. Baukosten Stein" value={filters.buildCostStoneMax} change={v=>change('buildCostStoneMax',v)}/>

    </>}
   </div>
   <div className="library-group-block"><strong>Gruppengröße · mehrere gleichzeitig wählen</strong><div className="library-group-chips">{GROUPS.filter(g=>g!=='unknown').map(g=><button key={g} className={filters.groups.includes(g)?'on':''} aria-pressed={filters.groups.includes(g)} type="button" onClick={()=>toggleGroup(g)}>{text(g)}</button>)}</div></div>
   <div className="library-feature-heading">FEATURE-FILTER · JA / NEIN / UNBEKANNT · {featureRequirements} AKTIV</div>
   {FEATURE_GROUPS.map((group,i)=><details key={group.label} className="library-feature-group" open={i===0}>
     <summary>{group.label}<span>{group.keys.filter(k=>filters.featureConstraints[k]!==undefined).length} Filter</span></summary>
     <div className="library-features">{group.keys.map(k=><label className="library-feature" key={k}><span>{FEATURE_LABELS[k]}</span><select aria-label={`Filter ${FEATURE_LABELS[k]}`} className={filters.featureConstraints[k]?'filter-active':''} value={filters.featureConstraints[k]??'all'} onChange={e=>setRequirement(k,e.target.value)}><option value="all">Beliebig</option>{BOOLS.map(v=><option key={v} value={v}>{text(v)}</option>)}</select></label>)}</div>
   </details>)}
   {featureRequirements>0&&<div className="library-active-filter-row">{Object.entries(filters.featureConstraints).map(([k,v])=><button key={k} type="button" onClick={()=>setRequirement(k as FeatureKey,'all')} title="Diesen Filter entfernen">{FEATURE_LABELS[k as FeatureKey]}: {text(v)} ×</button>)}</div>}
   <p className="library-small">Alle Bedingungen werden kombiniert. Mehrere Gruppen zählen als ODER; verschiedene Feature-Filter als UND. „Nein“ ist ein bestätigtes Nein, fehlende Angaben sind „Unbekannt“. Keine ungeprüften Wahrscheinlichkeiten.</p>
  </section>
  <div className="library-results-head"><strong>{filtered.length} TREFFER</strong><label>Sortieren <select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="new">Zuletzt gespeichert</option><option value="name">Name A–Z</option><option value="similarity">Strukturähnlichkeit</option><option value="upkeep">Geringster Upkeep</option><option value="rockets">Wenigste Rockets</option><option value="size">Meiste Grundflächen</option><option value="floors">Meiste Etagen</option></select></label></div>
  <div className="library-result-grid">
   {filtered.map(e=>{const m=metadataOf(e.doc),geom=geometricByKey.get(e.key);return <article className="library-result" key={e.key}>
    <div className="library-result-top"><span className="library-result-icon">{e.doc.tiles.some(t=>t.shape==='triangle')?'△':'▣'}</span><div><strong>{e.doc.name}</strong><small>{text(e.origin)} · {text(e.doc.quality)} · {hasInGameEvidence(e.doc)?'Ingame-Beleg hinterlegt':text(e.doc.library?.verification?.status??'unverified')} · {e.doc.tiles.length} Flächen · {new Set(e.doc.tiles.map(t=>t.floor)).size} Etagen</small></div><span className="library-match-score" title="Übereinstimmende beobachtete Grundflächen, keine Wahrscheinlichkeit">{geom&&geom.matchedTiles>0?`${geom.matchedTiles}/${geom.observedTiles}`:"—"}</span></div>
    <div className="library-tags"><span>{text(m.group)}</span><span>{text(m.role)}</span><span>{text(m.bunker)}</span>{m.footprint&&m.footprint!=='unknown'&&<span>{text(m.footprint)}</span>}{m.externalTCCount!==null&&m.externalTCCount!==undefined&&<span>{m.externalTCCount} External TC</span>}{Object.entries(m.features).filter(([,v])=>v==='yes').slice(0,4).map(([k])=><span key={k}>{FEATURE_LABELS[k as FeatureKey]}</span>)}</div>
    <div className="library-result-actions"><button className="button primary" onClick={()=>{if(current.tiles.length&&!confirm(`Aktuellen Entwurf durch „${e.doc.name}“ ersetzen?`))return;onOpen(structuredClone(e.doc));notify(`„${e.doc.name}“ im Editor geöffnet.`)}}><FolderOpen size={14}/> Im Editor öffnen</button>
     <button className="button" onClick={()=>exportProject(e.doc)} title="JSON exportieren"><Download size={14}/></button>
     {e.origin!=='demo'&&<button className="button" onClick={()=>void remove(e)} title="Aus Bibliothek entfernen"><Trash2 size={14}/></button>}</div>
   </article>})}
   {!loading&&!filtered.length&&<div className="library-empty"><Search size={25}/><strong>Keine passenden Blueprints</strong><p>Filter zurücksetzen oder eigene Blueprint-Dateien importieren.</p></div>}
  </div>
  <p className="library-disclaimer">Die Bibliothek startet mit zwei eigenen Demo-Blueprints und speichert weitere lokal im Browser; es werden keine fremden Kataloge automatisch importiert. Die Erkennung verwendet jetzt einen drehungs- und spiegelungsinvarianten Abgleich der beobachteten Polygone sowie bekannte Höhen und Kantenobjekte. Das sind <strong>keine Wahrscheinlichkeiten</strong> für einen tatsächlichen Innenaufbau. Die zwei mitgelieferten Designs sind Demonstrationen; keine kopierten Drittanbieter-Blueprints. Prüfstatus und Nachweise stammen aus Benutzereingaben; eine externe Echtheitsprüfung erfolgt nicht.</p>
 </div>
}
