import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Group, Layer, Line, Rect, Stage, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import { Activity, ArrowDown, ArrowUp, Check, ChevronRight, Database, Download,
  FolderOpen, Grid3X3, Hammer, Layers3, Move, Redo2, RotateCcw,
  Save, ShieldAlert, Square, Triangle, Undo2, X, ZoomIn, ZoomOut, Trash2, ChevronDown,
  Home, Warehouse, Search, Boxes, Rocket, Settings2, BarChart3, Box as BoxIcon, Plus, MousePointer2,
  Layers, PanelRightClose, Compass } from 'lucide-react';
import { useEditor } from '../store/useEditor.ts';
import { type Point, type Polygon, type TileShape } from '../core/geometry.ts';
import { DOOR_INSERTS, REFERENCE_MAX_HP,
  type BuildingTile, type BuildingEdge, type EdgeKind, type MaterialGrade, type SoftSide, type BuildingKind, type DoorInsert, type FloorInsert } from '../core/blueprint.ts';
import { findEdgeAt, findEdgeRecord, findTileAt, nearSlot, slotsFor, stats, tilesOnFloor,
  MATERIAL_COLORS, MATERIAL_NAMES, WALL_KIND_NAMES, TILE_KIND_NAMES, DOOR_NAMES,
  type EdgeTarget } from '../core/editor.ts';
import { exportProject, importProject, loadProject, saveProject } from '../services/persistence.ts';
import { CATALOG, CATALOG_GROUPS, getCatalogPiece, type CatalogPiece } from '../core/catalog.ts';
import { StructureIcon } from './StructureIcon.tsx';
import { BlueprintLibrary } from './BlueprintLibrary.tsx';
import { skinsForGrade, getSkin, type BuildingSkinId } from '../core/skins.ts';
import { fitCameraToTiles } from '../core/viewport.ts';
import { ThreeBaseView } from './ThreeBaseView.tsx';
import { misplacedUpperTiles, proposedElevation } from '../core/levels.ts';
import { AnalysisPanel, type AnalysisTab } from './AnalysisPanel.tsx';
import { structuralConnectivity } from '../core/stability.ts';

const MATERIALS:MaterialGrade[]=['twig','wood','stone','metal','armored','unknown'];
const EDGES:EdgeKind[]=['wall','doorway','window','wall-frame','half-wall','low-wall'];
const allKinds:BuildingKind[]=['foundation','floor','floor-frame','roof','foundation-steps','ramp','stairs-l','stairs-u','stairs-spiral','stairs-spiral-triangle'];
const points=(p:Polygon)=>p.flatMap(v=>[v.x,v.y]);
const centroid=(p:Polygon):Point=>({x:p.reduce((a,v)=>a+v.x,0)/p.length,y:p.reduce((a,v)=>a+v.y,0)/p.length});
const heightText=(value:number|undefined)=>value===undefined?'?':`${value>=0?'+':''}${Number(value.toFixed(2))} H`;
const hpFor=(grade:MaterialGrade)=>REFERENCE_MAX_HP[grade];
const closePop=(setter:(v:ContextMenu|null)=>void)=>setter(null);
type ContextMenu = {kind:'edge';target:EdgeTarget;px:number;py:number}|{kind:'tile';tileId:string;px:number;py:number};

function ValueEditor({value,onChange,min,max,step,placeholder}:{value:number|null|undefined;onChange:(n:number|null)=>void;min:number;max:number;step:number;placeholder?:string}){
 return <input type="number" min={min} max={max} step={step} placeholder={placeholder??'Unbekannt'} value={value??''}
  onChange={e=>{if(e.currentTarget.value===''){onChange(null);return;}const n=Number(e.currentTarget.value);if(Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}}/>;
}
function ContextEditor({menu,onClose,onNotice,activePiece}:{menu:ContextMenu;onClose:()=>void;onNotice:(s:string)=>void;activePiece:CatalogPiece|null}){
 const doc=useEditor(s=>s.doc),select=useEditor(s=>s.select),attach=useEditor(s=>s.attach);
 const wall=useEditor(s=>s.wall),remove=useEditor(s=>s.eraseTarget);
 const grade=useEditor(s=>s.updateGrade),setSkin=useEditor(s=>s.updateSkin),stability=useEditor(s=>s.updateStability),health=useEditor(s=>s.updateHealth);
 const soft=useEditor(s=>s.updateSoftSide),kind=useEditor(s=>s.updateTileKind);
 const insert=useEditor(s=>s.updateInsert),elevation=useEditor(s=>s.updateElevation),updateFloorInsert=useEditor(s=>s.updateFloorInsert);
 const [relative,setRelative]=useState(0);
 const record=menu.kind==='tile'?doc.tiles.find(t=>t.id===menu.tileId):findEdgeRecord(doc,menu.target);
 const isTile=menu.kind==='tile';
 const tile=isTile?record as BuildingTile|undefined:undefined;
 const edge=!isTile?record as BuildingEdge|undefined:undefined;
 useEffect(()=>{setRelative(0);},[menu.kind,menu.px,menu.py]);
 const startSelect=()=>{
  if(record)select({type:isTile?'tile':'edge',id:record.id});
 };
 const selectEdgeType=(value:EdgeKind)=>{
  if(menu.kind!=='edge')return;
  wall(menu.target,value);
  const e=findEdgeRecord(useEditor.getState().doc,menu.target);
  if(e)select({type:'edge',id:e.id});
 };
 const change=(fn:()=>void)=>{startSelect();fn();};
 const place=(shape:TileShape)=>{
  if(menu.kind!=='edge')return;
  if(attach(menu.target.tileId,menu.target.edgeIndex,shape,relative,activePiece?.category==='tile'&&activePiece.shape===shape?activePiece.tileKind:undefined)){
   onNotice('Bauteil korrekt an Kante angefügt · Höhenversatz '+heightText(relative));onClose();
  } else onNotice('Hier ist kein kollisionsfreier Anbau möglich.');
 };
 const eHeight=menu.kind==='edge'?doc.tiles.find(t=>t.id===menu.target.tileId)?.elevation:undefined;
 return <div className="context-editor" style={{left:Math.max(8,Math.min(menu.px,window.innerWidth-690)),top:Math.max(52,Math.min(menu.py,window.innerHeight-620))}}
    role="dialog" aria-label="Bauteil-Kontextmenü" onMouseDown={e=>e.stopPropagation()}>
  <div className="context-title"><span><Hammer size={15}/> {isTile?'BAUTEIL BEARBEITEN':'KANTEN-MENÜ'}</span><button onClick={onClose} title="Schließen"><X size={17}/></button></div>
  {!isTile&&<section className="context-section">
    <div className="context-caption">AN DIESER KANTE ANBAUEN <span>Referenz {heightText(eHeight)}</span></div>
    <div className="shape-row"><button onClick={()=>place('square')}><Square size={17}/> Quadrat</button><button onClick={()=>place('triangle')}><Triangle size={18}/> Dreieck</button></div>
    <label className="field-label">Höhe relativ zum Nachbar-Fundament</label>
    <div className="offset-pills">{[-1,-.5,0,.5,1].map(v=><button key={v} onClick={()=>setRelative(v)} className={relative===v?'picked':''}>{v>0?'+':''}{v} H</button>)}</div>
    <p className="context-help">H = volle Wandhöhe, 0,5 H = halbe Wandhöhe. Die Position wird im Blueprint als eigener Z-Wert gespeichert.</p>
  </section>}
  {!isTile&&<section className="context-section">
    <div className="context-caption">WAND / ÖFFNUNG / RAHMEN</div>
    <div className="part-pills">{EDGES.map(k=><button key={k} onClick={()=>selectEdgeType(k)} className={edge?.kind===k?'picked':''}>{WALL_KIND_NAMES[k]}</button>)}</div>
  </section>}
  {record&&<section className="context-section">
    <div className="context-caption">EIGENSCHAFTEN <span>#{record.id.slice(0,8)}</span></div>
    {tile&&<><label className="field-label">Bauteilart</label><select value={tile.kind} onChange={e=>change(()=>kind(e.target.value as BuildingKind))}>
      {allKinds.map(k=><option key={k} value={k}>{TILE_KIND_NAMES[k]}</option>)}<option value="unknown">Unbekannt</option>
    </select><label className="field-label">Absolute Oberkante / Höhe (H)</label>
      <div className="height-row"><button onClick={()=>change(()=>elevation(Math.max(-100,(tile.elevation??tile.floor)-.5)))}>− ½ H</button>
      <ValueEditor value={tile.elevation??null} min={-100} max={100} step={.25} onChange={v=>v!==null&&change(()=>elevation(v))}/>
      <button onClick={()=>change(()=>elevation(Math.min(100,(tile.elevation??tile.floor)+.5)))}>+ ½ H</button></div>
      <p className="context-help">Verschiedene Höhen direkt angrenzender Fundamente werden separat erfasst. Terrain- und Rust-Socket-Prüfungen folgen.</p>
    </>}
    <label className="field-label">Material</label><select value={record.grade} onChange={e=>change(()=>grade(e.target.value as MaterialGrade))}>
      {MATERIALS.map(m=><option value={m} key={m}>{MATERIAL_NAMES[m]}</option>)}
    </select>
    <label className="field-label">Building Skin</label>
    <div className="skin-preview-select"><span className="skin-preview-swatch" style={{background:getSkin(record.skinId).primary}}/><select value={record.skinId??'default'} aria-label="Building Skin" onChange={e=>change(()=>setSkin(e.target.value as BuildingSkinId))}>
      {skinsForGrade(record.grade).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
    </select></div><p className="context-help">Offizielle Skin-Namen, eigene schematische Vorschau. Original-Rust-Texturen sind derzeit nicht lizenziert eingebunden.</p>
    <div className="input-dual"><div><label className="field-label">Aktuelle HP</label><ValueEditor value={record.health?.current} min={0} max={20000} step={1} onChange={v=>change(()=>health({current:v,max:record.health?.max??hpFor(record.grade)}))}/></div>
    <div><label className="field-label">Maximale HP</label><ValueEditor value={record.health?.max} min={0} max={20000} step={1} onChange={v=>change(()=>health({current:Math.min(record.health?.current??0,v??0),max:v}))}/></div></div>
    <label className="field-label">Gemessene Stabilität in %</label>
    <ValueEditor value={record.stability.percent} min={0} max={100} step={1} onChange={v=>change(()=>stability(v))}/>
    <label className="field-label">Soft-Side-Ausrichtung</label>
    <select value={record.softSide??'unknown'} onChange={e=>change(()=>soft(e.target.value as SoftSide))}>
      {(isTile?['up','down','unknown']:['left','right','unknown']).map(v=><option key={v} value={v}>{v==='left'?'Linke Seite A→B':v==='right'?'Rechte Seite A→B':v==='up'?'Oben':v==='down'?'Unten':'Unbekannt'}</option>)}
    </select>
    {tile?.kind==='floor-frame'&&<><label className="field-label">Bodenrahmen-Einbau</label>
      <select value={tile.floorInsert??'none'} onChange={e=>change(()=>updateFloorInsert(e.target.value as FloorInsert))}>
       <option value="none">Kein Einbau / offen</option>
       {tile.shape==='square'?<option value="ladder-hatch">Leiterklappe (Quadrat)</option>:<option value="triangle-ladder-hatch">Dreieck-Leiterklappe</option>}
      </select><p className="context-help">Die Klappe ist ein eigener Einbau im Bodenrahmen; Fundament- und Bodenrahmenmaterial bleiben erhalten.</p></>}
    {edge&&<><label className="field-label">Tür / Einbau</label><select value={edge.insert??'none'} onChange={e=>change(()=>insert(e.target.value as DoorInsert))}>
      {DOOR_INSERTS.map(k=><option key={k} value={k}>{DOOR_NAMES[k]}</option>)}
    </select><p className="context-help">Einbau- und Rahmentyp müssen für eine vollständige Rust-Prüfung später zusammenpassen.</p></>}
    {tile&&tile.kind!=='foundation'&&tile.kind!=='floor'&&<p className="context-help warning">Schematische 2D-Projektion: 3D-Form und Spiellogik für dieses Bauteil sind noch nicht validiert.</p>}
    <button className="remove-action" onClick={()=>{remove({type:isTile?'tile':'edge',id:record.id});onClose();}}><Trash2 size={15}/> Bauteil entfernen</button>
  </section>}
  {!record&&isTile&&<p>Bauteil nicht vorhanden.</p>}
 </div>;
}

function EditorCanvas({notify,activePiece,onSelectPiece,onApplied,routeIds}:{notify:(s:string)=>void;activePiece:CatalogPiece|null;
 onSelectPiece:(id:string|null)=>void;onApplied:()=>void;routeIds:readonly string[]}){
 const doc=useEditor(s=>s.doc),floor=useEditor(s=>s.floor),tool=useEditor(s=>s.tool),setTool=useEditor(s=>s.setTool);
 const selected=useEditor(s=>s.selected),select=useEditor(s=>s.select),attach=useEditor(s=>s.attach),root=useEditor(s=>s.root);
 const wrapper=useRef<HTMLDivElement>(null),stage=useRef<Konva.Stage>(null),pan=useRef(false),start=useRef<Point|null>(null),skip=useRef(false);
 const [size,setSize]=useState({w:950,h:660}),[camera,setCamera]=useState({x:475,y:330,scale:1});
 const [pointer,setPointer]=useState<Point|null>(null),[menu,setMenu]=useState<ContextMenu|null>(null);
 const [grid,setGrid]=useState(true),[below,setBelow]=useState(true),[showSupport,setShowSupport]=useState(false),[rootHeight,setRootHeight]=useState(0);
 const topology=useMemo(()=>showSupport?structuralConnectivity(doc):null,[doc,showSupport]);
 useEffect(()=>{setRootHeight(0);},[floor]);
 const previousSize=useRef({w:950,h:660});
 const cameraReady=useRef(false);
 const tiles=useMemo(()=>tilesOnFloor(doc,floor),[doc,floor]);
 const fitView=useCallback((w=size.w,h=size.h)=>setCamera(fitCameraToTiles(tiles.length?tiles:doc.tiles,w,h)),[tiles,doc.tiles,size.w,size.h]);
 // Resize never accumulates incorrect coordinates; retain the current WORLD center.
 useEffect(()=>{
  const node=wrapper.current;if(!node)return;
  const observer=new ResizeObserver(([entry])=>{
   if(!entry)return;
   const w=Math.max(300,entry.contentRect.width),h=Math.max(300,entry.contentRect.height);
   const prev=previousSize.current;
   if(Math.abs(w-prev.w)<.5&&Math.abs(h-prev.h)<.5)return;
   previousSize.current={w,h};
   setSize({w,h});
   setCamera(c=>({ ...c,x:c.x+(w-prev.w)/2,y:c.y+(h-prev.h)/2 }));
  });observer.observe(node);return ()=>observer.disconnect();
 },[]);
 // When a 2D view mounts again after 3D/Split, fit the actual building bounds.
 // Do NOT reset the camera when a tile is added while the user is drawing.
 useEffect(()=>{
  if(!cameraReady.current&&size.w>300&&size.h>300&&doc.tiles.length){
    cameraReady.current=true;
    fitView();
  }
 },[doc.tiles.length,size.w,size.h,fitView]);
 useEffect(()=>{cameraReady.current=false;fitView();cameraReady.current=true;},[doc.id,floor]);
 const slots=useMemo(()=>tool==='square'||tool==='triangle'?slotsFor(doc,floor,tool):[],[doc,floor,tool]);
 const slot=useMemo(()=>pointer?nearSlot(slots,pointer):null,[slots,pointer]);
 const world=useCallback(()=>{const q=stage.current?.getPointerPosition();return q?{x:(q.x-camera.x)/camera.scale,y:(q.y-camera.y)/camera.scale}:null;},[camera]);
 const screen=()=>stage.current?.getPointerPosition()??{x:140,y:140};
 const mouseMove=()=>{
  const p=screen();if(pan.current&&start.current){const dx=p.x-start.current.x,dy=p.y-start.current.y;
   if(Math.abs(dx)+Math.abs(dy)>2)skip.current=true;
   setCamera(c=>({...c,x:c.x+dx,y:c.y+dy}));start.current=p;return;}
  setPointer(world());
 };
 const click=()=>{
  if(skip.current){skip.current=false;return;}
  const at=world();if(!at)return;
  const q=screen();
  if(activePiece?.category==='floor-insert'&&activePiece.floorInsert){
    const target=findTileAt(doc,floor,at);
    if(!target){notify('Bitte zuerst einen Bodenrahmen auswählen.');return;}
    if(target.kind!=='floor-frame'||target.shape!==activePiece.shape){
      notify(`Für ${activePiece.label} wird ein ${activePiece.shape==='triangle'?'Dreieck-':''}Bodenrahmen benötigt.`);return;
    }
    if(useEditor.getState().placeFloorInsert(target.id,activePiece.floorInsert)){
      notify(`${activePiece.label} im Bodenrahmen eingesetzt.`);onApplied();
    }else notify('Die Leiterklappe ist bereits an dieser Stelle eingesetzt.');
    setMenu(null);return;
  }
  const near=findEdgeAt(doc,floor,at,Math.min(17/camera.scale,23));
  if(near){
    if(activePiece?.category==='edge'&&activePiece.edgeKind){useEditor.getState().placeCatalogEdge(near,activePiece.edgeKind);onApplied();}
    else if(activePiece?.category==='insert'&&activePiece.insert){useEditor.getState().placeCatalogEdge(near,activePiece.insert==='garage-door'?'wall-frame':'doorway',activePiece.insert);onApplied();}
    else {const existing=findEdgeRecord(doc,near);if(existing)select({type:'edge',id:existing.id});}
    setMenu({kind:'edge',target:near,px:q.x+12,py:q.y+10});return;}
  const t=findTileAt(doc,floor,at);
  if(t){select({type:'tile',id:t.id});setMenu({kind:'tile',tileId:t.id,px:q.x+12,py:q.y+10});return;}
  if(tool==='square'||tool==='triangle'){
   if(!tiles.length){root(tool,at,rootHeight,activePiece?.category==='tile'?activePiece.tileKind:undefined);setTool('inspect');onApplied();return;}
   const nearest=nearSlot(slots,at);
   if(nearest){const success=attach(nearest.sourceId,nearest.edgeIndex,tool,0,activePiece?.category==='tile'?activePiece.tileKind:undefined);if(success){setTool('inspect');onApplied();}else notify('Bauteil überschneidet vorhandene Geometrie.');}
  }
  setMenu(null);
 };
 const wheel=(e:Konva.KonvaEventObject<WheelEvent>)=>{
  e.evt.preventDefault();const p=screen(),z=Math.min(4,Math.max(.25,camera.scale*(e.evt.deltaY>0?.9:1.1)));
  setCamera({x:p.x-(p.x-camera.x)*z/camera.scale,y:p.y-(p.y-camera.y)*z/camera.scale,scale:z});
 };
 const zoom=(f:number)=>setCamera(c=>{const z=Math.max(.25,Math.min(4,c.scale*f));return {x:size.w/2-(size.w/2-c.x)*z/c.scale,y:size.h/2-(size.h/2-c.y)*z/c.scale,scale:z};});
 const gr=useMemo(()=>Array.from({length:111},(_,i)=>i-55),[]);
 const rootPreview=pointer&&!tiles.length&&(tool==='square'||tool==='triangle')?{
  square:[{x:pointer.x-50,y:pointer.y-50},{x:pointer.x+50,y:pointer.y-50},{x:pointer.x+50,y:pointer.y+50},{x:pointer.x-50,y:pointer.y+50}],
  triangle:[{x:pointer.x,y:pointer.y-100/Math.sqrt(3)},{x:pointer.x+50,y:pointer.y+50/Math.sqrt(3)},{x:pointer.x-50,y:pointer.y+50/Math.sqrt(3)}]
 }[tool]:null;
 return <div className="canvas-wrapper" ref={wrapper}>
  <div className="canvas-top-left"><span className="live-dot"/><strong>BAUPLAN · DRAUFSICHT</strong><span className="canvas-separator"/> Geschoss {floor}<span className="canvas-separator"/>{tiles.length} Bauteile</div>
  <div className="canvas-top-right"><button title="Raster" onClick={()=>setGrid(!grid)} className={grid?'active':''}><Grid3X3 size={16}/></button>
   <button title="Unterliegende Ebene" onClick={()=>setBelow(!below)} className={below?'active':''}><Layers3 size={16}/></button>
   <button title="Ankerpfade aus Strukturmodell anzeigen (nicht Rust-Stabilität)" aria-label="Strukturpfade ein-/ausblenden" onClick={()=>setShowSupport(!showSupport)} className={showSupport?'active':''}><Activity size={16}/></button></div>
  <Stage ref={stage} width={size.w} height={size.h} x={camera.x} y={camera.y} scaleX={camera.scale} scaleY={camera.scale}
   onMouseMove={mouseMove} onTouchMove={mouseMove} onMouseLeave={()=>setPointer(null)} onWheel={wheel} onClick={click} onTap={click}
   onMouseDown={e=>{if([1,2].includes(e.evt.button)||e.evt.altKey){pan.current=true;start.current=screen();}}}
   onMouseUp={()=>{pan.current=false;start.current=null;}} onContextMenu={e=>e.evt.preventDefault()}>
   <Layer listening={false}>
     <Rect x={-7000} y={-7000} width={14000} height={14000} fill="#20272a"/>
     {grid&&gr.flatMap((i)=>[
       <Line key={'x'+i} points={[i*50,-5000,i*50,5000]} stroke={i%2===0?'#68777c':'#5f6b70'} opacity={i%2===0?.28:.14} strokeWidth={1/camera.scale}/>,
       <Line key={'y'+i} points={[-5000,i*50,5000,i*50]} stroke={i%2===0?'#68777c':'#5f6b70'} opacity={i%2===0?.28:.14} strokeWidth={1/camera.scale}/>])}
     {floor>0&&below&&tilesOnFloor(doc,floor-1).map(t=><Line key={'b'+t.id} points={points(t.polygon)} closed fill="#857866" opacity={.12} dash={[4,6]} stroke="#98836e"/>)}
     {tiles.map(t=>{const c=centroid(t.polygon),selectedTile=selected?.type==='tile'&&selected.id===t.id,routeTile=routeIds.includes(t.id);
       return <Group key={t.id}>
         <Line points={points(t.polygon)} closed fill={t.skinId&&t.skinId!=='default'?getSkin(t.skinId).primary:MATERIAL_COLORS[t.grade]} opacity={.78} stroke={selectedTile?'#f7c78c':topology?.nodes[t.id]?.status==='anchor'?'#d1a44d':topology?.nodes[t.id]?.status==='linked'?'#72d6a0':topology?.nodes[t.id]?.status==='unverified'?'#ed6f63':'#ae9c87'} strokeWidth={(selectedTile?4:topology?3:2)/camera.scale}/>
         <Line points={points(t.polygon)} closed dash={[3,6]} stroke="#e3c7a3" opacity={.18} strokeWidth={.7/camera.scale}/>
         {t.kind==='floor-frame'&&<Line points={points(t.polygon.map(p=>({x:c.x+(p.x-c.x)*.82,y:c.y+(p.y-c.y)*.82})))} closed
           fill={t.floorInsert&&t.floorInsert!=='none'?'#576a6c':'#131d20'} opacity={.96} stroke={t.floorInsert&&t.floorInsert!=='none'?'#e9994d':'#cebea9'} strokeWidth={2/camera.scale}/>}
         {t.kind==='floor-frame'&&t.floorInsert&&t.floorInsert!=='none'&&<>
           <Line points={[c.x-17,c.y-15,c.x+17,c.y+15]} stroke="#f7c990" strokeWidth={2/camera.scale}/>
           {[-12,-4,4,12].map(n=><Line key={n} points={[c.x+n-7,c.y-17,c.x+n+7,c.y-2]} stroke="#afc2bf" strokeWidth={1.5/camera.scale}/>)}
           <KonvaText x={c.x-48} y={c.y+21} width={96} align="center" text="LEITERKLAPPE" fontSize={8} fontStyle="bold" fill="#f3bc79"/>
         </>}
         <KonvaText x={c.x-34} y={c.y-18} width={68} align="center" text={heightText(t.elevation)} fontSize={12} fontStyle="bold" fill="#f7ddba"/>
         <KonvaText x={c.x-28} y={c.y+3} width={56} align="center" text={t.stability.percent===null?'STB ?':`STB ${t.stability.percent}%`} fontSize={9} fill="#dbcbb6"/>
       </Group>;
     })}
     {doc.edges.filter(e=>e.floor===floor).map(e=><Group key={e.id}>
       <Line points={[e.a.x,e.a.y,e.b.x,e.b.y]} stroke="#0a0a09" strokeWidth={11/camera.scale} lineCap="round"/>
       <Line points={[e.a.x,e.a.y,e.b.x,e.b.y]} stroke={e.insert==='garage-door'?'#ec9d46':e.kind==='doorway'?'#e58d58':e.kind==='window'?'#8ea0a3':e.skinId&&e.skinId!=='default'?getSkin(e.skinId).primary:'#d1b793'} strokeWidth={(e.insert==='garage-door'?8:5)/camera.scale} dash={e.insert==='garage-door'?[6,2]:e.kind==='doorway'?[7,5]:e.kind==='window'?[3,4]:undefined}/>
       {e.insert==='garage-door'&&<KonvaText x={(e.a.x+e.b.x)/2-40} y={(e.a.y+e.b.y)/2-16} width={80} align="center" text="GARAGENTOR" fontSize={9} fontStyle="bold" fill="#ffc080"/>}
     </Group>)}
     {(tool==='square'||tool==='triangle')&&slots.map((s,i)=><Line key={'s'+i} points={points(s.polygon)} closed stroke="#ad946f" opacity={.3} dash={[6,5]} strokeWidth={1/camera.scale}/>)}
     {(slot||rootPreview)&&<Line points={points(slot?.polygon??rootPreview!)} closed fill="#dd8a4b" opacity={.23} stroke="#f9a062" dash={[6,3]} strokeWidth={2/camera.scale}/>}
   </Layer>
  </Stage>
  <div className="canvas-bottom-left"><span className="chip"><Move size={13}/> Rechte/Mittlere Maustaste: verschieben</span><span className="chip">Kante anklicken → Bau-Menü</span>{showSupport&&<span className="chip">Strukturpfade: Grün verbunden · Rot ungeklärt · Gold Fundament (keine Rust-%-Prognose)</span>}<span className="chip">↻ zeigt gesamten Grundriss</span></div>
  <div className="canvas-bottom-right"><button onClick={()=>zoom(1/1.2)} title="Verkleinern"><ZoomOut size={16}/></button><span>{Math.round(camera.scale*100)}%</span>
    <button onClick={()=>zoom(1.2)} title="Vergrößern"><ZoomIn size={16}/></button><button title="Gebäude einpassen und zentrieren" onClick={()=>fitView()}><RotateCcw size={15}/></button></div>
  {tiles.length===0&&tool==='inspect'&&<div className="canvas-empty"><Hammer size={30}/><h3>NEUE BASE KONSTRUIEREN</h3><p>Starte mit einem quadratischen oder dreieckigen Fundament. Alle weiteren Bauteile docken an vorhandene Kanten an.</p>
    <div className="empty-options"><button onClick={()=>onSelectPiece('foundation-square')}><Square size={21}/> Quadrat</button><button onClick={()=>onSelectPiece('foundation-triangle')}><Triangle size={22}/> Dreieck</button></div>
    <label className="field-label">Zusätzlicher Höhenversatz gegenüber dieser Etage (H)</label><div className="offset-pills">{[-.5,0,.5,1].map(v=><button className={rootHeight===v?'picked':''} key={v} onClick={()=>setRootHeight(v)}>{v>0?'+':''}{v}</button>)}</div>
    <p className="context-help">Neue Oberkante: {proposedElevation(doc,floor,pointer??{x:0,y:0},rootHeight).toLocaleString("de-DE")} H. F1 beginnt standardmäßig eine volle Wandhöhe über F0. Dann auf die freie Fläche klicken.</p></div>}
  {menu&&<ContextEditor menu={menu} onClose={()=>closePop(setMenu)} onNotice={notify} activePiece={activePiece}/>}
 </div>;
}
type ViewMode='2d'|'3d'|'split';
type Module='studio'|'dashboard'|'library'|'raid'|'stability'|'settings';
const NAV_ITEMS:{id:Module;label:string;icon:typeof Home}[]=[
  {id:'dashboard',label:'Dashboard',icon:Home},{id:'studio',label:'Canvas Studio',icon:BoxIcon},
  {id:'library',label:'Blueprint Library',icon:Layers},{id:'raid',label:'Raid Calculator',icon:Rocket},
  {id:'stability',label:'Stability',icon:Activity},{id:'settings',label:'Settings',icon:Settings2}
];
function App(){
 const doc=useEditor(s=>s.doc),setTool=useEditor(s=>s.setTool);
 const floor=useEditor(s=>s.floor),setFloor=useEditor(s=>s.setFloor),undo=useEditor(s=>s.undo),redo=useEditor(s=>s.redo);
 const past=useEditor(s=>s.past),future=useEditor(s=>s.future),modified=useEditor(s=>s.modifiedAt);
 const startNew=useEditor(s=>s.startNew),loadExample=useEditor(s=>s.loadExample),loadBunkerExample=useEditor(s=>s.loadBunkerExample),setDocument=useEditor(s=>s.setDocument);
 const rename=useEditor(s=>s.rename),hydrate=useEditor(s=>s.hydrate),loading=useEditor(s=>s.isLoading);
 const input=useRef<HTMLInputElement>(null);
 const [saved,setSaved]=useState('gespeichert'),[notice,setNotice]=useState<string|null>(null);
 const [activeId,setActiveId]=useState<string|null>(null),[query,setQuery]=useState('');
 const [openGroups,setOpenGroups]=useState<string[]>([...CATALOG_GROUPS.slice(0,3)]);
 const [view,setView]=useState<ViewMode>('2d'),[module,setModule]=useState<Module>('studio');
 const [analysisTab,setAnalysisTab]=useState<AnalysisTab>('raid'),[raidPath,setRaidPath]=useState<string[]>([]);
 const [minimized,setMinimized]=useState(false);
 const activePiece=getCatalogPiece(activeId??'');
 const selected=useEditor(s=>s.selected);
 const numbers=stats(doc,floor);
 const [welcome,setWelcome]=useState(true);
 const copyFloor=useEditor(s=>s.copyFloorFromBelow),repairHeights=useEditor(s=>s.fixOldFloorHeights);
 const legacyOverlapCount=misplacedUpperTiles(doc).length;
 useEffect(()=>{let cancelled=false;loadProject().then(savedDoc=>{if(!cancelled)hydrate(savedDoc);}).catch(()=>{if(!cancelled)hydrate(null);});return()=>{cancelled=true;};},[hydrate]);
 useEffect(()=>{if(loading||!modified)return;setSaved('speichert …');const timer=setTimeout(()=>saveProject(doc).then(()=>setSaved('gespeichert')).catch(()=>setSaved('Speicherfehler')),500);return()=>clearTimeout(timer);},[doc,modified,loading]);
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;
  if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(e.key==='Escape'){setTool('inspect');setActiveId(null);return;}
  if(e.key==='1')pick('foundation-square');if(e.key==='2')pick('foundation-triangle');
  if(e.key==='PageUp')setFloor(floor+1);if(e.key==='PageDown')setFloor(floor-1);
 };window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[undo,redo,setTool,setFloor,floor]);
 const file=async(e:ChangeEvent<HTMLInputElement>)=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(!f)return;
  try{setDocument(await importProject(f));setRaidPath([]);setModule('studio');setNotice('Blueprint erfolgreich geprüft und importiert.');}
  catch(err){setNotice(err instanceof Error?err.message:'Import fehlgeschlagen');}
 };
 function pick(id:string|null){
  setActiveId(id);const part=getCatalogPiece(id??'');
  if(part?.category==='tile'&&part.shape)setTool(part.shape);else setTool('inspect');
  setModule('studio');setView('2d');
 }
 function navigate(next:Module){
  setModule(next);
  if(next==='raid')setAnalysisTab('raid');if(next==='stability')setAnalysisTab('stability');
  if(next==='studio'||next==='raid'||next==='stability')setWelcome(false);
 }
 function demo(which:'standard'|'bunker'){
  if(doc.tiles.length&&!confirm('Aktuelles Projekt durch die Beispiel-Base ersetzen?'))return;
  if(which==='standard')loadExample();else loadBunkerExample();
  setActiveId(null);setRaidPath([]);setModule('studio');setView('2d');setWelcome(false);
  setNotice(which==='standard'?'Demo-Base geladen.':'Versetzte Fundamenthöhen geladen.');
 }
 const totalFloors=Math.max(1,Math.max(0,...doc.tiles.map(t=>t.floor))+1);
 const remaining=CATALOG.filter(p=>p.label.toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="app-shell">
  <header className="hero-topbar">
   <div className="hero-brand"><div className="hero-mark"><Hammer size={32}/></div><div><strong>GHOSTFRAME <span>STUDIO</span></strong><small>RUST BASE PLANNER / STABILITY INTELLIGENCE / RAID ANALYSIS</small></div></div>
   <div className="hero-project"><span>AKTUELLES PROJEKT</span><input className="project-name" value={doc.name} onChange={e=>rename(e.target.value)} aria-label="Projektname"/><span className="version-tag">v0.10.0</span></div>
   <div className="top-actions"><span className="save-state"><Save size={13}/>{saved}</span>
    <button className="icon-button" onClick={undo} disabled={!past.length} title="Rückgängig"><Undo2 size={17}/></button>
    <button className="icon-button" onClick={redo} disabled={!future.length} title="Wiederholen"><Redo2 size={17}/></button>
    <button className="button" onClick={()=>input.current?.click()}><FolderOpen size={16}/> Import</button>
    <button className="button primary" onClick={()=>exportProject(doc)}><Download size={16}/> Export</button>
    <input ref={input} hidden type="file" accept=".json,.ghostframe.json,application/json" onChange={file}/>
   </div>
  </header>
  <nav className="main-nav" aria-label="Module">{NAV_ITEMS.map(item=><button key={item.id} onClick={()=>navigate(item.id)} className={module===item.id?'current':''}><item.icon size={16}/><span>{item.label}</span></button>)}</nav>
  <div className={`main-layout ${minimized?'right-collapsed':''}`}>
   <aside className="builder-panel">
     <div className="panel-head"><span><Hammer size={17}/> BAUWERKZEUGE</span><button className="panel-quiet" onClick={()=>{setActiveId(null);setTool('inspect');}} title="Werkzeug abwählen"><MousePointer2 size={15}/> Neutral</button></div>
     <div className="builder-top-note">Bauteil wählen und im Grundriss platzieren. Wände und Türen setzt du direkt an einer Kante.</div>
     <div className="catalog-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Bauteile suchen …" aria-label="Baukatalog durchsuchen"/></div>
     {CATALOG_GROUPS.map(group=>{
       const parts=remaining.filter(p=>p.group===group);
       if(!parts.length)return null;
       const show=openGroups.includes(group)||!!query.trim();
       return <section className="catalog-section" key={group}>
         <button className="catalog-group-title" onClick={()=>setOpenGroups(old=>old.includes(group)?old.filter(g=>g!==group):[...old,group])}><span>{group}</span><ChevronDown size={14} className={show?'up':''}/></button>
         {show&&<div className="piece-grid">{parts.map(part=><button key={part.id} className={`piece-card ${activeId===part.id?'selected':''}`}
            onClick={()=>pick(part.id)} aria-pressed={activeId===part.id} title={`${part.label} auswählen`}>
             <StructureIcon piece={part}/><span>{part.shortLabel}</span>{part.projection==='schematic'&&<small>3D-Schema</small>}</button>)}</div>}
       </section>;
     })}
     {query&&remaining.length===0&&<p className="catalog-no-results">Keine Bauteile gefunden.</p>}
     <div className="active-tool"><span>AKTIVES BAUTEIL</span><strong>{activePiece?.label??'Klick öffnet Kanten-/Bauteil-Menü'}</strong>
       {activePiece&&<button onClick={()=>pick(null)}>Auswahl aufheben <X size={13}/></button>}</div>
     <div className="panel-head compact"><span><Layers3 size={15}/> GESCHOSSE</span><small>{totalFloors} im Plan</small></div>
     <div className="floor-select"><button onClick={()=>setFloor(floor-1)} disabled={floor===0} aria-label="Etage tiefer"><ArrowDown size={17}/></button>
        <div><strong>ETAGE {floor}</strong><span>{floor===0?'Fundament-Ebene':`Ebene ${floor}`}</span></div>
        <button onClick={()=>setFloor(floor+1)} disabled={floor===20} aria-label="Etage höher"><ArrowUp size={17}/></button></div>
     <div className="floor-buttons">{Array.from({length:Math.min(6,Math.max(3,totalFloors,floor+1))},(_,i)=><button key={i} className={floor===i?'active':''} onClick={()=>setFloor(i)}>F{i}</button>)}</div>
     <div className="floor-build-actions">
       <button disabled={floor===0||!doc.tiles.some(t=>t.floor===floor-1)} onClick={()=>{const n=copyFloor();setNotice(n?`${n} Bodenplatten auf F${floor} erstellt. Höhe und Fundamentversätze übernommen.`:'Keine freien Flächen zum Übernehmen.');}} title="Grundflächen der darunterliegenden Etage als neue Bodenplatten mit korrekter Höhe übernehmen"><Layers3 size={15}/> Untergeschoss als Decke übernehmen</button>
       {legacyOverlapCount>0&&<button className="repair-floor-heights" onClick={()=>{const n=repairHeights();setNotice(`${n} falsch übereinanderliegende Bauteile angehoben. Änderungen mit Strg+Z rückgängig.`);}} title="Repariert nur überlagerte Obergeschoss-Bauteile mit dem alten fehlerhaften Höhenwert 0 H"><Activity size={15}/> {legacyOverlapCount} ältere Etagenhöhe(n) korrigieren</button>}
       <small>F1 = eine Wandhöhe über F0. Individuelle Fundamentversätze bleiben erhalten.</small>
     </div>
     <div className="panel-head compact"><span><Database size={15}/> BLUEPRINTS</span></div>
     <div className="template-list"><button onClick={()=>demo('standard')}><span className="template-symbol">⌂</span><span><strong>Compact Compound</strong><small>Demo · 2 Geschosse</small></span><ChevronRight size={14}/></button>
       <button onClick={()=>demo('bunker')}><span className="template-symbol">▧</span><span><strong>Foundation Offset</strong><small>Demo · Höhenversatz / Bunker</small></span><ChevronRight size={14}/></button></div>
   </aside>
   <main className="studio-column">
    <div className="studio-toolbar"><div className="studio-title"><span className="studio-title-icon"><Boxes size={20}/></span><div><strong>{module==='dashboard'?'DASHBOARD':module==='library'?'BLUEPRINT LIBRARY':module==='settings'?'SETTINGS':module==='raid'?'RAID CALCULATOR':module==='stability'?'STABILITY ANALYZER':'CANVAS STUDIO'}</strong><small>Planen · Bauen · Visualisieren · Analysieren</small></div></div>
      <div className="studio-actions"><button className="button" onClick={()=>{if(!doc.tiles.length||confirm('Aktuelle Base ersetzen?')){startNew();setRaidPath([]);setWelcome(true);setModule('studio');}}}><Plus size={14}/> Neue Base</button>
       <button className="button" onClick={()=>input.current?.click()}><FolderOpen size={14}/> Blueprint laden</button>
       <button className="icon-button panel-toggle" onClick={()=>setMinimized(v=>!v)} title="Analysebereich ein-/ausklappen"><PanelRightClose size={17}/></button></div>
    </div>
    {(module==='studio'||module==='raid'||module==='stability')&&<>
      <div className="view-toolbar"><div className="mode-switch"><button className={view==='2d'?'selected':''} onClick={()=>setView('2d')}><Grid3X3 size={15}/> 2D Blueprint</button>
         <button className={view==='3d'?'selected':''} onClick={()=>setView('3d')}><BoxIcon size={15}/> 3D Modell</button>
         <button className={view==='split'?'selected':''} onClick={()=>setView('split')}><Layers3 size={15}/> Split</button></div>
       <div className="view-caption"><Compass size={15}/> F{floor} · {doc.tiles.length} Flächen · {doc.edges.length} Kantenobjekte</div>
       <div className="level-actions"><button onClick={()=>setFloor(floor-1)} disabled={floor===0}><ArrowDown size={15}/></button><span>Etage {floor}</span><button onClick={()=>setFloor(floor+1)} disabled={floor===20}><ArrowUp size={15}/></button></div>
      </div>
      <div className={`editor-zone view-${view}`}>
       {(view==='2d'||view==='split')&&<div className="two-d-view"><EditorCanvas notify={setNotice} activePiece={activePiece}
         onSelectPiece={pick} onApplied={()=>setActiveId(null)} routeIds={raidPath}/></div>}
       {(view==='3d'||view==='split')&&<div className="three-d-view"><ThreeBaseView doc={doc} floor={floor} routeIds={raidPath}/></div>}
      </div>
      <div className="studio-footnote"><span><span className="status-light"/> Live-Blueprint-Synchronisierung</span><span>Wände nur dort, wo erfasst · 3D-Vorschau ist keine Physiksimulation</span></div>
    </>}
    {module==='dashboard'&&<div className="full-module"><div className="module-hero"><span>DAS PROJEKT IM BLICK</span><h2>BASE INTELLIGENCE</h2><p>Dein Grundriss und seine Höhenebenen sind die Grundlage für die spätere Stabilitäts- und Raid-Analyse.</p><button className="button primary" onClick={()=>navigate('studio')}>Canvas öffnen <ChevronRight size={16}/></button></div>
       <div className="overview-grid"><div><Layers3/><strong>{doc.tiles.length}</strong><small>Flächen im Blueprint</small></div><div><Boxes/><strong>{doc.edges.length}</strong><small>Kantenkonstruktionen</small></div><div><Activity/><strong>{doc.tiles.filter(t=>t.stability.percent!==null).length}</strong><small>Gemessene Stabilitäten</small></div></div>
       <div className="dashboard-shortcuts"><button onClick={()=>demo('standard')}>Standard-Demo laden <ChevronRight size={16}/></button><button onClick={()=>demo('bunker')}>Bunker-Höhen-Demo laden <ChevronRight size={16}/></button></div>
     </div>}
    {module==='library'&&<BlueprintLibrary current={doc} notify={setNotice} onOpen={loaded=>{setDocument(loaded);setRaidPath([]);setModule('studio');setView('2d');setWelcome(false);}}/>}
    {module==='settings'&&<div className="full-module"><div className="module-hero"><span>BEDIENUNG UND DATEN</span><h2>SETTINGS</h2><p>Autosave speichert deine Base lokal im Browser. Daten werden nicht automatisch zu GitHub übertragen.</p></div>
       <div className="settings-card"><strong>Ansicht</strong><div className="mode-switch"><button className={view==='2d'?'selected':''} onClick={()=>{setView('2d');navigate('studio');}}>2D</button><button className={view==='3d'?'selected':''} onClick={()=>{setView('3d');navigate('studio');}}>3D</button><button className={view==='split'?'selected':''} onClick={()=>{setView('split');navigate('studio');}}>Split</button></div></div>
       <div className="settings-card"><strong>Projekt sichern</strong><p>Nutze den JSON-Export für Sicherung und Gerätewechsel.</p><button className="button primary" onClick={()=>exportProject(doc)}><Download size={15}/> JSON exportieren</button></div>
       <div className="settings-card"><strong>Softwarestand</strong><p>GHOSTFRAME v0.8.0 · unabhängige Rust-inspirierte Oberfläche, keine Original-Rust-Assets.</p></div>
     </div>}
   </main>
   {!minimized&&<AnalysisPanel doc={doc} selected={selected} path={raidPath} setPath={setRaidPath} tab={analysisTab} setTab={setAnalysisTab} activeRoute={module==='raid'}/>}
  </div>
  <div className="bottom-dashboard">
    <div><span><Layers3 size={15}/> BUILD STATS</span><strong>{doc.tiles.length+doc.edges.length}</strong><small>Erfasste Bauteile</small></div>
    <div><span><Activity size={15}/> STABILITY</span><strong>{[...doc.tiles,...doc.edges].filter(t=>t.stability.percent!==null).length}</strong><small>Messwerte erfasst</small></div>
    <div><span><Warehouse size={15}/> FOUNDATION LEVELS</span><strong>{new Set(doc.tiles.filter(t=>t.kind==='foundation').map(t=>t.elevation??t.floor)).size}</strong><small>Höhenlagen</small></div>
    <div><span><BarChart3 size={15}/> AKTUELLES GESCHOSS</span><strong>{numbers.tiles}</strong><small>Flächen F{floor}</small></div>
    <div><span><ShieldAlert size={15}/> RAID STATUS</span><strong>{raidPath.length}</strong><small>Manuelle Ziele</small></div>
  </div>
  <footer className="statusbar"><span><span className="status-light"/> EDITOR ONLINE</span><span>GHOSTFRAME v0.8.0 · Originales Wasteland-Design · Nicht von Facepunch</span><span>F{floor} <ChevronRight size={12}/> {doc.tiles.length} TILES</span></footer>
  {notice&&<div className="toast"><Check size={16}/>{notice}<button onClick={()=>setNotice(null)} aria-label="Meldung schließen"><X size={16}/></button></div>}
  {welcome&&doc.tiles.length===0&&module==='studio'&&view!=='3d'&&<div className="onboarding-hint" role="status"><span>NEUE BASE</span> Wähle links <strong>Quadrat oder Dreieck</strong> und klicke in den Bauplan. <button onClick={()=>setWelcome(false)}>OK</button></div>}
 </div>;
}
export default App;
