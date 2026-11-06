import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BlueprintDocument, BuildingEdge, BuildingTile, MaterialGrade } from '../core/blueprint.ts';
import type { SelectedEntity } from '../core/editor.ts';
import { edgeAt, sameEdge, type Point } from '../core/geometry.ts';
import { PLAN_UNIT_METERS, WALL_HEIGHT_METERS, planToWorld } from '../core/projection.ts';
import { tileHeight, misplacedUpperTiles } from '../core/levels.ts';
import { structuralConnectivity, type StructuralStatus } from '../core/stability.ts';
import { useMemo } from 'react';
import { useEditor } from '../store/useEditor.ts';
import {skinTexture} from './skinTextures.ts';
import type {BuildingSkinId} from '../core/skins.ts';

const UNIT=PLAN_UNIT_METERS;
const WALL_HEIGHT=WALL_HEIGHT_METERS;
const COLORS:Record<MaterialGrade,number>={twig:0x97704c,wood:0x946a43,stone:0x9e9890,metal:0x748c91,armored:0x425d6b,unknown:0x7b736c};
export type ViewFloorMode='all'|'current';
function worldXY(p:Point){const q=planToWorld(p);return {x:q.x,z:q.z};}
function owningTile(doc:BlueprintDocument,e:BuildingEdge):BuildingTile|undefined {
  return doc.tiles.find(t=>t.floor===e.floor&&t.polygon.some((_,i)=>{const [a,b]=edgeAt(t.polygon,i);return sameEdge(a,b,e.a,e.b);}));
}
export function ThreeBaseView({doc,floor,routeIds=[],onSelect}:{doc:BlueprintDocument;floor:number;routeIds?:readonly string[];onSelect?:(selection:NonNullable<SelectedEntity>,clientX:number,clientY:number)=>void}){
 const mount=useRef<HTMLDivElement>(null),[mode,setMode]=useState<ViewFloorMode>('all'),[exploded,setExploded]=useState(false);
 const fixOldHeights=useEditor(s=>s.fixOldFloorHeights);
 const staleTiles=misplacedUpperTiles(doc);
 const elevations=[...new Set(doc.tiles.map(t=>t.floor))].sort((a,b)=>a-b).map(level=>({
  level,heights:[...new Set(doc.tiles.filter(t=>t.floor===level).map(t=>tileHeight(t)))].sort((a,b)=>a-b)
 }));
 const [hull,setHull]=useState(false),[failure,setFailure]=useState<string|null>(null),[top,setTop]=useState(false),[showSupport,setShowSupport]=useState(false);
 const structure=useMemo(()=>showSupport?structuralConnectivity(doc):null,[doc,showSupport]);
 const structureTint=(id:string):number|undefined=>{const status:StructuralStatus|undefined=structure?.nodes[id]?.status;return status==='anchor'?0xc7a35e:status==='linked'?0x4ca67e:status==='unverified'?0xd95f52:undefined};
 useEffect(()=>{
  const container=mount.current;if(!container)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});}catch{setFailure('3D benötigt WebGL. Bitte einen Browser mit aktivierter Hardwarebeschleunigung verwenden.');return;}
  setFailure(null);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x10161a,45,125);
  const camera=new THREE.PerspectiveCamera(42,Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight),0.1,300);
  const center=new THREE.Vector3(0,1,0);
  const allPoints=doc.tiles.flatMap(t=>t.polygon);
  const xs=allPoints.map(p=>p.x*UNIT),zs=allPoints.map(p=>p.y*UNIT);
  const minX=xs.length?Math.min(...xs):0,maxX=xs.length?Math.max(...xs):0;
  const minZ=zs.length?Math.min(...zs):0,maxZ=zs.length?Math.max(...zs):0;
  const ys=doc.tiles.map(t=>tileHeight(t)*WALL_HEIGHT);
  const minY=ys.length?Math.min(...ys):0,maxY=ys.length?Math.max(...ys)+WALL_HEIGHT:WALL_HEIGHT;
  center.set((minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2);
  const radius=Math.max(7,(Math.hypot(maxX-minX,maxZ-minZ,maxY-minY))*1.12);
  camera.position.set(center.x+radius*.85,center.y+radius*.95,center.z+radius*1.10);
  camera.lookAt(center);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;
  controls.target.copy(center);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=160;
  if(top){camera.position.set(center.x+.01,center.y+radius*1.8,center.z+.01);controls.target.copy(center);}
  scene.add(new THREE.HemisphereLight(0xdfe8ef,0x3a2c20,2.2));
  const sun=new THREE.DirectionalLight(0xffd1a3,3.1);sun.position.set(-12,25,18);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0xa9c1ce,1.4);fill.position.set(11,9,-15);scene.add(fill);
  const grid=new THREE.GridHelper(80,80,0x4b554f,0x333c3b);grid.position.y=Math.min(-.46,minY-.46);scene.add(grid);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x232a26,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=Math.min(-.5,minY-.5);ground.receiveShadow=true;scene.add(ground);
  const group=new THREE.Group();scene.add(group);
  // Hand-built procedural construction surfaces. No extracted game textures.
  const textures=new Map<MaterialGrade,THREE.CanvasTexture>();
  const textureFor=(grade:MaterialGrade)=>{
    const cached=textures.get(grade);if(cached)return cached;
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas 2D unavailable for material texture');
    const base:Record<MaterialGrade,string>={twig:'#8f7857',wood:'#846b4f',stone:'#aba79c',metal:'#84929a',armored:'#646d75',unknown:'#8f8276'};
    ctx.fillStyle=base[grade];ctx.fillRect(0,0,256,256);
    const seed=[...grade].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),1);
    let rand=seed;
    const random=()=>{rand=(Math.imul(rand,1664525)+1013904223)>>>0;return rand/4294967296;};
    if(grade==='stone'||grade==='unknown'){
      for(let r=0;r<5;r++){
        const y=r*52;const split=r%2?64:0;
        ctx.strokeStyle='#4c514f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();
        for(let x=split-128;x<320;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+52);ctx.stroke();}
      }
    }else if(grade==='wood'||grade==='twig'){
      ctx.strokeStyle='#443c32';ctx.lineWidth=4;
      for(let x=0;x<=256;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
      ctx.strokeStyle='#d1a775';ctx.lineWidth=1;
      for(let x=0;x<256;x+=11){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+6,256);ctx.stroke();}
    }else{
      ctx.strokeStyle='#3b474f';ctx.lineWidth=4;
      for(let x=0;x<=256;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
      for(let y=0;y<=256;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
      ctx.fillStyle='#c3c4bd';for(let y=12;y<256;y+=128)for(let x=12;x<256;x+=128){ctx.fillRect(x,y,5,5);ctx.fillRect(x+104,y+104,5,5);}
    }
    for(let i=0;i<2100;i++){
      const x=random()*256,y=random()*256;
      ctx.fillStyle=random()>.55?'#ffffff':'#0e1618';ctx.globalAlpha=random()*.14;
      ctx.fillRect(x,y,random()*3+1,random()*3+1);
    }
    ctx.globalAlpha=1;
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    textures.set(grade,texture);return texture;
  };
  const meshMaterial=(grade:MaterialGrade,transparent=false,skinId?:BuildingSkinId)=>new THREE.MeshStandardMaterial({
    color:0xffffff,map:skinId&&skinId!=='default'?(skinTexture(skinId)??textureFor(grade)):textureFor(grade),roughness:grade==='metal'||grade==='armored'?.59:.94,
    metalness:grade==='metal'||grade==='armored'?.25:0,transparent,opacity:transparent?.20:1,
    side:THREE.DoubleSide
  });
  const visible=(f:number)=>mode==='all'||f===floor;
  const offset=(f:number)=>exploded?f*1.25:0;
  const tileY=(t:BuildingTile)=>(tileHeight(t)*WALL_HEIGHT)+offset(t.floor);
  const addBox=(parent:THREE.Group,length:number,height:number,depth:number,color:number,
    x:number,y:number,z:number,rotate=0,opacity=1,skinId?:BuildingSkinId)=>{
    const grade=(Object.entries(COLORS).find(([,v])=>v===color)?.[0]??null) as MaterialGrade|null;
    const selectedTexture=skinId&&skinId!=='default'?skinTexture(skinId):(grade?textureFor(grade):null);
    const mat=new THREE.MeshStandardMaterial({color:selectedTexture?0xffffff:color,
      ...(selectedTexture?{map:selectedTexture}:{}),roughness:grade==='metal'||grade==='armored'?.58:.87,
      metalness:grade==='metal'||grade==='armored'?.2:0,transparent:opacity<1,opacity});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,height,depth),mat);
    mesh.position.set(x,y,z);mesh.rotation.y=rotate;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  for(const tile of doc.tiles.filter(t=>visible(t.floor))){
    const firstChild=group.children.length;
    const shape=new THREE.Shape();
    tile.polygon.forEach((p,i)=>{const pt=worldXY(p);if(i===0)shape.moveTo(pt.x,pt.z);else shape.lineTo(pt.x,pt.z);});shape.closePath();
    const thickness=tile.kind==='foundation'?.40:.17;
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.015});
    geometry.rotateX(Math.PI/2); // XY -> XZ with +planY = +worldZ, matching the walls
    if(tile.kind==='floor-frame'){
      // Real open socket: perimeter beams, never a semi-transparent solid floor.
      for(let i=0;i<tile.polygon.length;i++){
        const [a,b]=edgeAt(tile.polygon,i),aw=worldXY(a),bw=worldXY(b);
        const dx=bw.x-aw.x,dz=bw.z-aw.z;
        addBox(group,Math.hypot(dx,dz)+.09,.20,.18,routeIds.includes(tile.id)?0xffa34b:COLORS[tile.grade],(aw.x+bw.x)/2,tileY(tile)-.1,(aw.z+bw.z)/2,-Math.atan2(dz,dx));
      }
      if(tile.floorInsert&&tile.floorInsert!=='none'){
        const c={x:tile.polygon.reduce((s,p)=>s+p.x,0)/tile.polygon.length,z:tile.polygon.reduce((s,p)=>s+p.y,0)/tile.polygon.length};
        const plate=new THREE.Shape();tile.polygon.forEach((p,i)=>{
          const pp=worldXY({x:c.x+(p.x-c.x)*.79,y:c.z+(p.y-c.z)*.79});
          if(i===0)plate.moveTo(pp.x,pp.z);else plate.lineTo(pp.x,pp.z);
        });plate.closePath();
        const hatch=new THREE.ExtrudeGeometry(plate,{depth:.08,bevelEnabled:false});
        hatch.rotateX(Math.PI/2);
        const panel=new THREE.Mesh(hatch,new THREE.MeshStandardMaterial({color:0x65747b,metalness:.63,roughness:.57,side:THREE.DoubleSide}));
        panel.position.y=tileY(tile)-.06;panel.castShadow=true;group.add(panel);
        const wc=worldXY({x:c.x,y:c.z});
        // Vertical ladder rails and rungs are visible from below when inspecting floors.
        for(const x of [-.28,.28])addBox(group,.065,1.55,.07,0x8c9693,wc.x+x,tileY(tile)-.83,wc.z+.12);
        for(let n=0;n<5;n++)addBox(group,.63,.045,.07,0xaeb3a5,wc.x,tileY(tile)-.25-n*.28,wc.z+.12);
      }
      geometry.dispose();
    }else{
      const floorMaterial=meshMaterial(tile.grade,false,tile.skinId);
      if(routeIds.includes(tile.id)){floorMaterial.color.setHex(0xff9c40);floorMaterial.emissive.setHex(0x361507);floorMaterial.map=null;}
      const floorMesh=new THREE.Mesh(geometry,floorMaterial);
      floorMesh.position.y=tileY(tile); // upper face at matching building height
      floorMesh.castShadow=true;floorMesh.receiveShadow=true;group.add(floorMesh);
    }
    // Fine metallic perimeter to make the precise polygons legible at any camera angle.
    const pts=tile.polygon.map(p=>{const q=worldXY(p);return new THREE.Vector3(q.x,tileY(tile)+.018,q.z);});pts.push(pts[0]!.clone());
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xdbc6aa,transparent:true,opacity:.67})));
    if(tile.kind.startsWith('stairs')){
      const xs=tile.polygon.map(p=>p.x*UNIT),zs=tile.polygon.map(p=>p.y*UNIT);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      for(let n=0;n<5;n++)addBox(group,(maxX-minX)*.72,.13+n*.14,(maxZ-minZ)/5*.95,0xc5ab8b,
        (maxX+minX)/2,tileY(tile)+.08+n*.07,minZ+(n+.5)*(maxZ-minZ)/5);
    }
    // The floor, its frame beams, hatch and rails all select the same tile.
    for(const child of group.children.slice(firstChild))child.userData={entityType:'tile',entityId:tile.id};
  }
  const explicit=new Set<string>();
  for(const edge of doc.edges.filter(e=>visible(e.floor))){
    const owner=owningTile(doc,edge);
    const base=(owner?tileY(owner):edge.floor*WALL_HEIGHT+offset(edge.floor));
    const a=worldXY(edge.a),b=worldXY(edge.b);
    const dx=b.x-a.x,dz=b.z-a.z,angle=-Math.atan2(dz,dx),span=Math.hypot(dx,dz);
    const centerX=(a.x+b.x)/2,centerZ=(a.z+b.z)/2;
    const item=new THREE.Group();item.userData={entityType:'edge',entityId:edge.id};item.position.set(centerX,base,centerZ);item.rotation.y=angle;group.add(item);
    const color=routeIds.includes(edge.id)?0xffa34b:structureTint(edge.id)??COLORS[edge.grade];
    const bar=(w:number,h:number,depth:number,x:number,y:number)=>addBox(item,w,h,depth,color,x,y,0,0,1,routeIds.includes(edge.id)?undefined:edge.skinId);
    const height=edge.kind==='half-wall'?1.5:edge.kind==='low-wall'?.72:WALL_HEIGHT;
    if(edge.kind==='wall'||edge.kind==='half-wall'||edge.kind==='low-wall')bar(span,height,.19,0,height/2);
    else if(edge.kind==='doorway'||edge.kind==='wall-frame'){
      const gap=edge.insert==='garage-door'?span*.87:edge.kind==='doorway'?span*.52:span*.67;
      const side=Math.max(.16,(span-gap)/2);
      bar(side,height,.19,-span/2+side/2,height/2);bar(side,height,.19,span/2-side/2,height/2);
      bar(gap,.4,.19,0,height-.2);
      if(edge.insert==='garage-door'){
        addBox(item,gap-.035,height-.44,.10,0x626b72,0,(height-.44)/2,0);
        // Visible horizontal rolled-metal segments, distinct from single and double doors.
        for(let n=1;n<12;n++)addBox(item,gap-.07,.024,.133,n%2?0x9ca1a0:0x3a454b,0,n*(height-.44)/12,0);
      }else if(edge.insert&&edge.insert!=='none'){
        addBox(item,gap-.035,height-.42,.085,COLORS[edge.grade]===COLORS.stone?0x976a43:0xa5744a,0,(height-.42)/2,0,0,.97);
      }
    }else if(edge.kind==='window'){
      bar(span,1.0,.19,0,.5);bar(span,.50,.19,0,height-.25);
      bar(.23,1.5,.19,-span/2+.115,1.75);bar(.23,1.5,.19,span/2-.115,1.75);
      addBox(item,span-.3,1.5,.038,0x7899a0,0,1.75,0,0,.30);
    }
    explicit.add(`${edge.floor}:${[`${Math.round(edge.a.x)}:${Math.round(edge.a.y)}`,`${Math.round(edge.b.x)}:${Math.round(edge.b.y)}`].sort().join('|')}`);
  }
  if(hull){
    // Projection ONLY: no inferred wall is persisted to the blueprint.
    for(const tile of doc.tiles.filter(t=>visible(t.floor))){
      for(let i=0;i<tile.polygon.length;i++){
        const [a,b]=edgeAt(tile.polygon,i),key=`${tile.floor}:${[`${Math.round(a.x)}:${Math.round(a.y)}`,`${Math.round(b.x)}:${Math.round(b.y)}`].sort().join('|')}`;
        if(explicit.has(key))continue;
        const neighbor=doc.tiles.some(other=>other.id!==tile.id&&other.floor===tile.floor&&other.polygon.some((_,j)=>{const [c,d]=edgeAt(other.polygon,j);return sameEdge(a,b,c,d);}));
        if(neighbor)continue;
        explicit.add(key);
        const aw=worldXY(a),bw=worldXY(b),dx=bw.x-aw.x,dz=bw.z-aw.z;
        addBox(group,Math.hypot(dx,dz),1.9,.12,0xb0aaa1,(aw.x+bw.x)/2,tileY(tile)+.95,(aw.z+bw.z)/2,-Math.atan2(dz,dx),.15);
      }
    }
  }
  // Optional selection in the 3D Raid/Stability workspaces. A drag rotates; a click selects.
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let down:{x:number;y:number}|null=null;
  const onDown=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
  const onUp=(event:PointerEvent)=>{
    const origin=down;down=null;
    if(!onSelect||!origin||Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>5)return;
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(mouse,camera);
    for(const hit of raycaster.intersectObjects(group.children,true)){
      let obj:THREE.Object3D|null=hit.object;
      while(obj&&obj!==group){
        const id=obj.userData.entityId as string|undefined,type=obj.userData.entityType as 'edge'|'tile'|undefined;
        if(id&&(type==='edge'||type==='tile')){onSelect({type,id},event.clientX,event.clientY);return;}
        obj=obj.parent;
      }
    }
  };
  renderer.domElement.addEventListener('pointerdown',onDown);
  renderer.domElement.addEventListener('pointerup',onUp);
  const resize=new ResizeObserver(()=>{
    const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });resize.observe(container);
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  return ()=>{
    resize.disconnect();renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);renderer.setAnimationLoop(null);controls.dispose();
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}
      if(o instanceof THREE.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
    textures.forEach(texture=>texture.dispose());
    renderer.dispose();renderer.domElement.remove();
  };
 },[doc,floor,mode,exploded,hull,top,showSupport,routeIds,onSelect]);
 return <div className="three-wrap">
   <div className="three-scene" ref={mount} aria-label="Interaktive räumliche 3D-Projektion des aktuellen Blueprints"/>
   {failure&&<div className="three-failure">{failure}</div>}
   <div className="three-head"><span className="live-dot"/><strong>3D / GEBÄUDEMODELL</strong><span className="three-label">Live aus Blueprint</span></div>
   {staleTiles.length>0&&<div className="three-height-warning" role="alert">
     <strong>{staleTiles.length} Bauteil(e) auf Obergeschossen liegen bei 0 H.</strong>
     <button onClick={()=>fixOldHeights()}>Alte Etagenhöhen korrigieren</button>
   </div>}
   <div className="three-elevation-legend" aria-label="Höhen der Geschosse">
     {elevations.filter(e=>mode==='all'||e.level===floor).map(e=><span key={e.level}>F{e.level}: {e.heights.map(h=>`${(h*WALL_HEIGHT).toLocaleString('de-DE',{maximumFractionDigits:2})} m`).join(' / ')}</span>)}
   </div>
   <div className="three-controls">
    <button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>Alle Etagen</button>
    <button className={mode==='current'?'active':''} onClick={()=>setMode('current')}>Nur L{floor}</button>
    <button className={exploded?'active':''} onClick={()=>setExploded(x=>!x)}>Explodiert</button>
    <button className={top?'active':''} onClick={()=>setTop(x=>!x)}>Vogelperspektive</button>
    <button className={hull?'active':''} onClick={()=>setHull(x=>!x)}>Hülle*</button>
    <button className={showSupport?'active':''} onClick={()=>setShowSupport(x=>!x)}>Strukturpfade</button>
   </div>
   {showSupport&&<div className="three-structural-legend">Gold: Fundament-Anker · Grün: modelliert verbunden · Rot: Verbindung ungeklärt · keine Rust-%-Prognose</div>}
   <div className="three-foot">{onSelect?'Klick: Element auswählen · ':''}Maus ziehen: drehen · Rad: zoomen · *Hülle ist eine unbestätigte Visualisierung · Dächer und Treppen schematisch</div>
  </div>;
}
