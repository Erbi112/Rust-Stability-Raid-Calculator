import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import { Activity, ArrowDown, ArrowUp, Box, Check, ChevronDown, ChevronRight, CircleHelp,
  Database, DoorOpen, Download, Eraser, Eye, FilePlus2, FolderOpen, Grid3X3, Layers3,
  LockKeyhole, MousePointer2, Move, Pentagon, Redo2, RotateCcw, Save, ShieldAlert,
  Square, TrendingUp, Undo2, Wall, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEditor } from '../store/useEditor.ts';
import { type Point, type Polygon, type TileShape } from '../core/geometry.ts';
import type { BuildingTile, BuildingEdge, EdgeKind, MaterialGrade } from '../core/blueprint.ts';
import { findEdgeAt, findTileAt, findWallAt,
  GRID_UNIT, MATERIAL_COLORS, MATERIAL_NAMES, nearSlot, slotsFor, stats, tilesOnFloor,
  type EditorTool } from '../core/editor.ts';
import { exportProject, importProject, loadProject, saveProject } from '../services/persistence.ts';

const GRADE_KEYS:MaterialGrade[]=['twig','wood','stone','metal','armored','unknown'];
const TOOL_INFO:{key:EditorTool;title:string;hint:string;icon:typeof Square;short:string}[]=[
  {key:'inspect',title:'Auswählen',hint:'Bauteile und Eigenschaften',icon:MousePointer2,short:'V'},
  {key:'square',title:'Quadrat',hint:'Bodenplatte / Fundament',icon:Square,short:'1'},
  {key:'triangle',title:'Dreieck',hint:'Dreieckiges Bauteil',icon:Pentagon,short:'2'},
  {key:'wall',title:'Wand',hint:'An einer Kante bauen',icon:Wall,short:'3'},
  {key:'doorway',title:'Türrahmen',hint:'An einer Kante bauen',icon:DoorOpen,short:'4'},
  {key:'window',title:'Fenster',hint:'An einer Kante bauen',icon:Grid3X3,short:'5'},
  {key:'erase',title:'Entfernen',hint:'Ein Bauteil löschen',icon:Eraser,short:'X'},
];
const iconSize=18;
const isPlacer=(t:EditorTool):t is TileShape=>t==='square'||t==='triangle';
const wallKind=(t:EditorTool):EdgeKind|null=>t==='wall'?'wall':t==='doorway'?'doorway':t==='window'?'window':null;
const points=(p:Polygon)=>p.flatMap(v=>[v.x,v.y]);
const centroid=(p:Polygon):Point=>({x:p.reduce((a,v)=>a+v.x,0)/p.length,y:p.reduce((a,v)=>a+v.y,0)/p.length});
const pointLine=(a:Point,b:Point)=>[a.x,a.y,b.x,b.y];

function ToolButton({tool,current,onClick}:{tool:typeof TOOL_INFO[number];current:EditorTool;onClick:(t:EditorTool)=>void}){
  const Icon=tool.icon;
  return <button type="button" className={'tool-item '+(tool.key===current?'active':'')} onClick={()=>onClick(tool.key)} title={tool.hint}>
    <span className="tool-icon"><Icon size={iconSize}/></span>
    <span className="tool-content"><strong>{tool.title}</strong><small>{tool.hint}</small></span>
    <span className="keycap">{tool.short}</span>
  </button>;
}
function SelectedProperties(){
  const doc=useEditor(s=>s.doc),selected=useEditor(s=>s.selected);
  const updateGrade=useEditor(s=>s.updateGrade),updateStability=useEditor(s=>s.updateStability);
  const erase=useEditor(s=>s.erase);
  const item=selected?(selected.type==='tile'?doc.tiles:doc.edges).find(t=>t.id===selected.id):null;
  return <section className="inspector-section">
    <div className="section-heading"><span>INSPEKTOR</span><Activity size={14}/></div>
    {!item?<div className="empty-inspector"><MousePointer2 size={23}/><h3>Bauteil wählen</h3><p>Klicke auf eine Bodenplatte, eine Wand oder einen Türrahmen, um Material und gemessene Stabilität zu erfassen.</p></div>:<>
      <div className="selected-header"><div className="selected-glyph">{selected?.type==='tile'?<Square size={19}/>:<Wall size={19}/>}</div><div><strong>{selected?.type==='tile'?(item as BuildingTile).shape==='square'?'Quadrat':'Dreieck':(item as BuildingEdge).kind}</strong><small>{item.id} · Ebene {item.floor}</small></div></div>
      <label className="field-label" htmlFor="material">Material</label>
      <select id="material" value={item.grade} onChange={e=>updateGrade(e.target.value as MaterialGrade)}>
        {GRADE_KEYS.map(grade=><option value={grade} key={grade}>{MATERIAL_NAMES[grade]}</option>)}
      </select>
      <label className="field-label" htmlFor="stability">Gemessene Stabilität</label>
      <div className="stability-field"><input id="stability" type="number" min="0" max="100" step="1" placeholder="Unbekannt" value={item.stability.percent??''} onChange={e=>{
        if(e.target.value==='')updateStability(null);
        else {const v=Number(e.target.value);if(Number.isFinite(v))updateStability(Math.min(100,Math.max(0,v)));}
      }}/><span>%</span></div>
      <p className="form-hint">Leeres Feld = unbekannt. Kein berechneter Wert.</p>
      <button type="button" className="button danger" onClick={erase}><Eraser size={15}/> Bauteil entfernen</button>
    </>}
  </section>;
}
function EditorCanvas(){
  const doc=useEditor(s=>s.doc),floor=useEditor(s=>s.floor),tool=useEditor(s=>s.tool);
  const selected=useEditor(s=>s.selected),select=useEditor(s=>s.select),attach=useEditor(s=>s.attach);
  const root=useEditor(s=>s.root),wall=useEditor(s=>s.wall),eraseTarget=useEditor(s=>s.eraseTarget);
  const wrapper=useRef<HTMLDivElement>(null),stage=useRef<Konva.Stage>(null);
  const isPan=useRef(false),panStart=useRef<Point|null>(null),skipClick=useRef(false);
  const [dimensions,setDimensions]=useState({width:900,height:650});
  const [camera,setCamera]=useState({x:450,y:325,scale:1});
  const [pointer,setPointer]=useState<Point|null>(null);
  const [showBelow,setShowBelow]=useState(true);
  const [showGrid,setShowGrid]=useState(true);
  useEffect(()=>{
    const node=wrapper.current;if(!node)return;
    const observer=new ResizeObserver(entries=>{
      const rect=entries[0]?.contentRect;if(!rect)return;
      setDimensions({width:Math.max(260,Math.floor(rect.width)),height:Math.max(220,Math.floor(rect.height))});
      setCamera(prev=>({ ...prev,x:prev.x+(rect.width-(node.dataset.previousWidth?Number(node.dataset.previousWidth):900))/2,
        y:prev.y+(rect.height-(node.dataset.previousHeight?Number(node.dataset.previousHeight):650))/2 }));
      node.dataset.previousWidth=String(rect.width);node.dataset.previousHeight=String(rect.height);
    });observer.observe(node);return ()=>observer.disconnect();
  },[]);
  const tiles=useMemo(()=>tilesOnFloor(doc,floor),[doc,floor]);
  const below=useMemo(()=>tilesOnFloor(doc,floor-1),[doc,floor]);
  const slots=useMemo(()=>isPlacer(tool)?slotsFor(doc,floor,tool):[],[doc,floor,tool]);
  const activeSlot=useMemo(()=>pointer&&isPlacer(tool)?nearSlot(slots,pointer):null,[pointer,slots,tool]);
  const edgeTarget=useMemo(()=>pointer&&wallKind(tool)?findEdgeAt(doc,floor,pointer,15/camera.scale):null,[pointer,tool,doc,floor,camera.scale]);
  // Root preview does not need a placeholder tile in the document.
  const firstPolygon=useMemo(()=>{
    if(!pointer||tiles.length||!isPlacer(tool))return null;
    const h=GRID_UNIT/2;
    return tool==='square'?
      [{x:pointer.x-h,y:pointer.y-h},{x:pointer.x+h,y:pointer.y-h},{x:pointer.x+h,y:pointer.y+h},{x:pointer.x-h,y:pointer.y+h}]:
      [{x:pointer.x,y:pointer.y-GRID_UNIT/Math.sqrt(3)},
       {x:pointer.x+h,y:pointer.y+GRID_UNIT/(2*Math.sqrt(3))},
       {x:pointer.x-h,y:pointer.y+GRID_UNIT/(2*Math.sqrt(3))}];
  },[pointer,tiles.length,tool]);
  const getWorld=useCallback(()=>{
    const p=stage.current?.getPointerPosition();
    return p?{x:(p.x-camera.x)/camera.scale,y:(p.y-camera.y)/camera.scale}:null;
  },[camera]);
  const handleMove=()=>{
    const p=stage.current?.getPointerPosition();if(!p)return;
    if(isPan.current&&panStart.current){
      const delta={x:p.x-panStart.current.x,y:p.y-panStart.current.y};
      if(Math.abs(delta.x)+Math.abs(delta.y)>2)skipClick.current=true;
      setCamera(cam=>({...cam,x:cam.x+delta.x,y:cam.y+delta.y}));panStart.current=p;return;
    }
    setPointer(getWorld());
  };
  const handleClick=()=>{
    if(skipClick.current){skipClick.current=false;return;}
    const at=getWorld();if(!at)return;
    if(isPlacer(tool)){
      if(tiles.length===0){root(tool,at);return;}
      const slot=nearSlot(slots,at);if(slot)attach(slot.sourceId,slot.edgeIndex,tool);
      return;
    }
    const kind=wallKind(tool);
    if(kind){const target=findEdgeAt(doc,floor,at,18/camera.scale);if(target)wall(target,kind);return;}
    const foundEdge=findWallAt(doc,floor,at,9/camera.scale);
    const foundTile=findTileAt(doc,floor,at);
    const target=foundEdge?{type:'edge' as const,id:foundEdge.id}:foundTile?{type:'tile' as const,id:foundTile.id}:null;
    if(tool==='erase'){if(target)eraseTarget(target);return;}
    select(target);
  };
  const handleWheel=(event:Konva.KonvaEventObject<WheelEvent>)=>{
    event.evt.preventDefault();const p=stage.current?.getPointerPosition();if(!p)return;
    const newScale=Math.max(.25,Math.min(4,camera.scale*(event.evt.deltaY>0?.9:1.1)));
    setCamera({scale:newScale,x:p.x-(p.x-camera.x)*newScale/camera.scale,y:p.y-(p.y-camera.y)*newScale/camera.scale});
  };
  const zoom=(factor:number)=>setCamera(v=>{
    const z=Math.min(4,Math.max(.25,v.scale*factor));
    return {scale:z,x:dimensions.width/2-(dimensions.width/2-v.x)*z/v.scale,y:dimensions.height/2-(dimensions.height/2-v.y)*z/v.scale};
  });
  const hitPoint=pointer??{x:0,y:0};
  const gridLines=useMemo(()=>{
    const lines:{points:number[];heavy:boolean}[]=[];
    for(let i=-40;i<=40;i++){
      const v=i*GRID_UNIT/2;
      lines.push({points:[v,-4000,v,4000],heavy:i%2===0});
      lines.push({points:[-4000,v,4000,v],heavy:i%2===0});
    }
    return lines;
  },[]);
  return <div className="canvas-wrapper" ref={wrapper}>
    <div className="canvas-top-left"><span className="live-dot"/> <strong>BLUEPRINT EDITOR</strong><span className="canvas-separator"/> Ebene {floor} <span className="canvas-separator"/> {tiles.length} Flächen</div>
    <div className="canvas-top-right">
      <button type="button" title="Raster ein-/ausblenden" className={showGrid?'active':''} onClick={()=>setShowGrid(v=>!v)}><Grid3X3 size={15}/></button>
      <button type="button" title="Untergeschoss ein-/ausblenden" className={showBelow?'active':''} onClick={()=>setShowBelow(v=>!v)}><Layers3 size={15}/></button>
    </div>
    <Stage width={dimensions.width} height={dimensions.height} x={camera.x} y={camera.y}
      scaleX={camera.scale} scaleY={camera.scale} ref={stage}
      onMouseMove={handleMove} onTouchMove={handleMove} onMouseLeave={()=>setPointer(null)}
      onMouseDown={e=>{if(e.evt.button===1||e.evt.button===2||e.evt.altKey){isPan.current=true;panStart.current=stage.current?.getPointerPosition()??null;}}}
      onMouseUp={()=>{isPan.current=false;panStart.current=null;}}
      onClick={handleClick} onTap={handleClick} onWheel={handleWheel}
      onContextMenu={e=>e.evt.preventDefault()}>
      <Layer listening={false}>
        <Rect x={-5000} y={-5000} width={10000} height={10000} fill="#0a1522"/>
        {showGrid&&gridLines.map((l,i)=><Line key={i} points={l.points} stroke={l.heavy?'#325071':'#24425c'} opacity={l.heavy?.32:.18} strokeWidth={.7/camera.scale}/>)}
        {showGrid&&<><Line points={[-4000,0,4000,0]} stroke="#4e7899" opacity={.3}/><Line points={[0,-4000,0,4000]} stroke="#4e7899" opacity={.3}/></>}
        {floor>0&&showBelow&&below.map(t=><Line key={'below'+t.id} points={points(t.polygon)} closed fill="#26415b" opacity={.25} dash={[6,5]} stroke="#5e85aa" strokeWidth={1.3/camera.scale}/>)}
        {tiles.map(tile=><Group key={tile.id}>
          <Line points={points(tile.polygon)} closed fill={MATERIAL_COLORS[tile.grade]} opacity={.48}
            stroke={selected?.type==='tile'&&selected.id===tile.id?'#ffe39b':'#7ccce8'}
            strokeWidth={(selected?.type==='tile'&&selected.id===tile.id?4:1.8)/camera.scale}/>
          <Line points={points(tile.polygon)} closed stroke="#a3dcfa" opacity={.12} strokeWidth={.5/camera.scale}/>
          <KonvaText x={centroid(tile.polygon).x-22} y={centroid(tile.polygon).y-9} width={44}
            text={tile.stability.percent===null?'—':`${tile.stability.percent}%`} align="center"
            fill={tile.stability.percent===null?'#88a9bd':'#e1fbff'} fontSize={13/camera.scale>18?18:13}
            fontStyle="bold"/>
        </Group>)}
        {doc.edges.filter(w=>w.floor===floor).map(w=><Group key={w.id}>
          <Line points={pointLine(w.a,w.b)} stroke="#09131e" strokeWidth={11/camera.scale} lineCap="round"/>
          {w.kind==='doorway'?<>
            <Line points={[w.a.x,w.a.y,w.a.x+(w.b.x-w.a.x)*.26,w.a.y+(w.b.y-w.a.y)*.26]} stroke="#fbc48b" strokeWidth={6/camera.scale} lineCap="round"/>
            <Line points={[w.b.x,w.b.y,w.b.x+(w.a.x-w.b.x)*.26,w.b.y+(w.a.y-w.b.y)*.26]} stroke="#fbc48b" strokeWidth={6/camera.scale} lineCap="round"/>
            <Circle x={(w.a.x+w.b.x)/2} y={(w.a.y+w.b.y)/2} radius={4/camera.scale} fill="#fbc48b"/>
          </>:<Line points={pointLine(w.a,w.b)} stroke={w.kind==='window'?'#8ce9e8':'#d5edfa'} strokeWidth={w.kind==='window'?4/camera.scale:7/camera.scale} dash={w.kind==='window'?[8,4]:undefined} lineCap="round"/>}
          {selected?.type==='edge'&&selected.id===w.id&&<Line points={pointLine(w.a,w.b)} stroke="#ffdc96" strokeWidth={2.5/camera.scale} dash={[3,4]}/>}
        </Group>)}
        {isPlacer(tool)&&slots.map((slot,i)=><Line key={'slot'+i} points={points(slot.polygon)} closed
          fill="#67e8d5" opacity={.03} stroke="#60ccb5" strokeWidth={1/camera.scale} dash={[5,7]}/>)}
        {isPlacer(tool)&&(activeSlot||firstPolygon)&&<Line points={points(activeSlot?.polygon??firstPolygon!)} closed
          fill="#34d7bc" opacity={.27} stroke="#63f7ce" strokeWidth={2.4/camera.scale} dash={[6,3]}/>}
        {wallKind(tool)&&edgeTarget&&<Line points={pointLine(edgeTarget.a,edgeTarget.b)} stroke="#ffcf8a" strokeWidth={7/camera.scale}/>}
        {(tool==='square'||tool==='triangle')&&pointer&&<Circle x={hitPoint.x} y={hitPoint.y} radius={3/camera.scale} fill="#74f7d7" opacity={.65}/>}
      </Layer>
    </Stage>
    <div className="canvas-bottom-left"><span className="chip"><Move size={12}/> Mittlere Maustaste: verschieben</span><span className="chip">Mausrad: zoomen</span></div>
    <div className="canvas-bottom-right">
      <button onClick={()=>zoom(1/1.2)} title="Verkleinern"><ZoomOut size={16}/></button>
      <span>{Math.round(camera.scale*100)}%</span>
      <button onClick={()=>zoom(1.2)} title="Vergrößern"><ZoomIn size={16}/></button>
      <button title="Zentrieren" onClick={()=>setCamera({scale:1,x:dimensions.width/2,y:dimensions.height/2})}><RotateCcw size={15}/></button>
    </div>
    {tiles.length===0&&tool==='inspect'&&<div className="canvas-empty"><Box size={32}/><h3>Neue Base zeichnen</h3><p>Wähle links ein Quadrat oder Dreieck und klicke auf die Arbeitsfläche.</p><button onClick={()=>useEditor.getState().setTool('square')}>Mit Quadrat beginnen <ChevronRight size={16}/></button></div>}
  </div>;
}
function App(){
  const doc=useEditor(s=>s.doc),tool=useEditor(s=>s.tool),setTool=useEditor(s=>s.setTool);
  const floor=useEditor(s=>s.floor),setFloor=useEditor(s=>s.setFloor),undo=useEditor(s=>s.undo),redo=useEditor(s=>s.redo);
  const past=useEditor(s=>s.past),future=useEditor(s=>s.future),modifiedAt=useEditor(s=>s.modifiedAt);
  const startNew=useEditor(s=>s.startNew),loadExample=useEditor(s=>s.loadExample),setDocument=useEditor(s=>s.setDocument);
  const rename=useEditor(s=>s.rename),hydrate=useEditor(s=>s.hydrate),isLoading=useEditor(s=>s.isLoading);
  const fileInput=useRef<HTMLInputElement>(null);
  const [saved,setSaved]=useState<'saved'|'saving'|'error'>('saved');
  const [notice,setNotice]=useState<string|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const numbers=stats(doc,floor);
  useEffect(()=>{let cancelled=false;loadProject().then(saved=>{if(!cancelled)hydrate(saved);}).catch(()=>{if(!cancelled)hydrate(null);});return()=>{cancelled=true;};},[hydrate]);
  useEffect(()=>{
    if(isLoading||!modifiedAt)return;
    setSaved('saving');
    const timer=setTimeout(()=>saveProject(doc).then(()=>setSaved('saved')).catch(()=>setSaved('error')),550);
    return()=>clearTimeout(timer);
  },[doc,modifiedAt,isLoading]);
  useEffect(()=>{
    const listener=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
        e.preventDefault();if(e.shiftKey)redo();else undo();return;
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
      if(e.key==='Escape'){setTool('inspect');return;}
      const keys:Record<string,EditorTool>={v:'inspect','1':'square','2':'triangle','3':'wall','4':'doorway','5':'window',x:'erase'};
      const t=keys[e.key.toLowerCase()];if(t)setTool(t);
      if(e.key==='PageUp')setFloor(floor+1);
      if(e.key==='PageDown')setFloor(floor-1);
    };
    window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);
  },[setTool,setFloor,floor,undo,redo]);
  const openFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;
    try{const parsed=await importProject(file);setDocument(parsed);setNotice('Blueprint importiert und geprüft.');}
    catch(error){setNotice(error instanceof Error?error.message:'Import fehlgeschlagen.');}
  };
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Pentagon size={22}/></div><div><strong>GHOSTFRAME</strong><small>RUST · STRUCTURAL INTELLIGENCE</small></div></div>
      <div className="top-center"><span className="file-dot"/><input className="project-name" value={doc.name} onChange={e=>rename(e.target.value)} aria-label="Projektname"/><span className="version-tag">v0.3</span></div>
      <div className="top-actions">
        <span className={'save-state '+saved}><Save size={13}/>{saved==='saved'?'Gespeichert':saved==='saving'?'Speichert …':'Lokales Speichern nicht verfügbar'}</span>
        <button className="icon-button" onClick={undo} disabled={!past.length} title="Rückgängig (Strg+Z)"><Undo2 size={17}/></button>
        <button className="icon-button" onClick={redo} disabled={!future.length} title="Wiederholen (Strg+Y)"><Redo2 size={17}/></button>
        <span className="vertical-rule"/>
        <button className="button flat" onClick={()=>fileInput.current?.click()}><FolderOpen size={16}/> Import</button>
        <button className="button primary" onClick={()=>exportProject(doc)}><Download size={16}/> Export</button>
        <input ref={fileInput} type="file" accept=".json,.ghostframe.json,application/json" hidden onChange={openFile}/>
      </div>
    </header>
    <div className="main-layout">
      <aside className="sidebar left-sidebar">
        <div className="sidebar-title">BAUWERKZEUGE <ChevronDown size={13}/></div>
        <div className="tool-list">{TOOL_INFO.map(t=><ToolButton key={t.key} tool={t} current={tool} onClick={setTool}/>)}</div>
        <div className="side-divider"/>
        <div className="sidebar-title">GESCHOSSE <Layers3 size={14}/></div>
        <div className="floor-control"><button title="Geschoss tiefer" onClick={()=>setFloor(floor-1)} disabled={floor===0}><ArrowDown size={18}/></button><div><strong>Ebene {floor}</strong><small>{floor===0?'Fundament-Ebene':`Geschoss ${floor}`}</small></div><button title="Geschoss höher" onClick={()=>setFloor(floor+1)} disabled={floor>=20}><ArrowUp size={18}/></button></div>
        <div className="floor-pills">{Array.from({length:Math.min(5,Math.max(3,floor+2))},(_,i)=><button key={i} className={i===floor?'on':''} onClick={()=>setFloor(i)}>L{i}</button>)}</div>
        <div className="side-divider"/>
        <div className="sidebar-title">PROJEKT <FilePlus2 size={14}/></div>
        <button className="side-action" onClick={()=>{if(confirm('Aktuellen Grundriss durch ein leeres Projekt ersetzen?'))startNew();}}><FilePlus2 size={17}/> Neues Projekt</button>
        <button className="side-action" onClick={()=>{if(confirm('Beispiel laden und aktuelles Projekt ersetzen?'))loadExample();}}><Box size={17}/> Beispiel-Base laden</button>
        <div className="sidebar-footer"><LockKeyhole size={14}/> Speicherung im Browser. Kein Server-Upload.</div>
      </aside>
      <main className="workspace"><EditorCanvas/></main>
      <aside className="sidebar right-sidebar">
        <div className="section-heading"><span>BASE ANALYSE</span><TrendingUp size={15}/></div>
        <div className="stat-grid"><div><small>Bauteile · Ebene</small><strong>{numbers.tiles}</strong></div><div><small>Bauteile · Gesamt</small><strong>{numbers.totalTiles}</strong></div><div><small>Wände / Rahmen</small><strong>{numbers.edges}</strong></div><div><small>Stabilitätsmessungen</small><strong>{numbers.measured}</strong></div></div>
        <div className="data-status"><div><span className="pulse"/> GEOMETRIE AKTIV</div><p>Kanten-Snapping und Flächenkollision werden geometrisch geprüft.</p></div>
        <SelectedProperties/>
        <section className="info-section"><div className="section-heading"><span>ANALYSE MODULE</span><Eye size={15}/></div>
          <div className="module-row muted"><Activity size={17}/><div><strong>Stability Engine</strong><small>Folgt nach Rust-Regelvalidierung</small></div><span>GEPLANT</span></div>
          <div className="module-row muted"><Database size={17}/><div><strong>Blueprint Matching</strong><small>Erst mit geprüfter Datenbasis</small></div><span>GEPLANT</span></div>
          <div className="module-row muted"><ShieldAlert size={17}/><div><strong>Raid Optimizer</strong><small>Keine erfundenen Raid-Kosten</small></div><span>GEPLANT</span></div>
        </section>
        <button className="help-button" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={16}/> Tasten und Bedienhilfe <ChevronRight size={14}/></button>
        {showHelp&&<div className="help-text"><p>1 / 2: Quadrat / Dreieck. 3 / 4 / 5: Wand / Tür / Fenster. V: Auswählen. X: Entfernen. Strg+Z/Y: Rückgängig/Wiederholen. Bild↑/↓: Geschoss wechseln. Mittlere oder rechte Maustaste: verschieben. Mausrad: Zoom.</p></div>}
      </aside>
    </div>
    <footer className="statusbar"><span><span className="status-light"/> EDITOR ONLINE</span><span>GHOSTFRAME v0.3 · RECHTE & RUST-PATCHDATEN NOCH NICHT VALIDIERTER ANALYSEBESTANDTEIL</span><span>Build Layer {floor} <ChevronRight size={12}/> {doc.tiles.length} Elemente</span></footer>
    {notice&&<div className="toast"><Check size={17}/><span>{notice}</span><button onClick={()=>setNotice(null)} aria-label="Meldung schließen"><X size={17}/></button></div>}
  </div>;
}
export default App;
