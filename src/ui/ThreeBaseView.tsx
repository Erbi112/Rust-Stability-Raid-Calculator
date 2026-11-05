import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { BlueprintDocument, BuildingEdge, BuildingTile, MaterialGrade } from '../core/blueprint.ts';
import { edgeAt, sameEdge, type Point } from '../core/geometry.ts';

const UNIT=0.03; // 100 geometric units ~3 m; only a visual reference for this 3D projection.
const WALL_HEIGHT=3;
const COLORS:Record<MaterialGrade,number>={twig:0x97704c,wood:0x946a43,stone:0x9e9890,metal:0x748c91,armored:0x425d6b,unknown:0x7b736c};
export type ViewFloorMode='all'|'current';
function worldXY(p:Point){return {x:p.x*UNIT,z:p.y*UNIT};}
function owningTile(doc:BlueprintDocument,e:BuildingEdge):BuildingTile|undefined {
  return doc.tiles.find(t=>t.floor===e.floor&&t.polygon.some((_,i)=>{const [a,b]=edgeAt(t.polygon,i);return sameEdge(a,b,e.a,e.b);}));
}
export function ThreeBaseView({doc,floor}:{doc:BlueprintDocument;floor:number}){
 const mount=useRef<HTMLDivElement>(null),[mode,setMode]=useState<ViewFloorMode>('all'),[exploded,setExploded]=useState(false);
 const [hull,setHull]=useState(false),[failure,setFailure]=useState<string|null>(null),[top,setTop]=useState(false);
 useEffect(()=>{
  const container=mount.current;if(!container)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});}catch{setFailure('3D benötigt WebGL. Bitte einen Browser mit aktivierter Hardwarebeschleunigung verwenden.');return;}
  setFailure(null);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x121919,35,100);
  const camera=new THREE.PerspectiveCamera(42,Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight),0.1,300);
  const center=new THREE.Vector3(0,1,0);
  if(doc.tiles.length){
    center.set(doc.tiles.reduce((s,t)=>s+t.polygon.reduce((a,v)=>a+v.x,0)/t.polygon.length,0)/doc.tiles.length*UNIT,
      1.0+Math.max(0,...doc.tiles.map(t=>t.floor))*0.65,
      doc.tiles.reduce((s,t)=>s+t.polygon.reduce((a,v)=>a+v.y,0)/t.polygon.length,0)/doc.tiles.length*UNIT);
  }
  const radius=Math.max(10,Math.sqrt(doc.tiles.length)*3.2,Math.max(0,...doc.tiles.map(t=>t.floor))*3.2+6);
  camera.position.set(center.x+radius*.9,center.y+radius*.82,center.z+radius*1.10);
  camera.lookAt(center);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;
  controls.target.copy(center);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=160;
  if(top){camera.position.set(center.x+.01,center.y+radius*1.8,center.z+.01);controls.target.copy(center);}
  scene.add(new THREE.HemisphereLight(0xdfe8ef,0x3a2c20,2.2));
  const sun=new THREE.DirectionalLight(0xffd1a3,3.1);sun.position.set(-12,25,18);scene.add(sun);
  const fill=new THREE.DirectionalLight(0xa9c1ce,1.4);fill.position.set(11,9,-15);scene.add(fill);
  const grid=new THREE.GridHelper(80,80,0x4b554f,0x333c3b);grid.position.y=-.46;scene.add(grid);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x232a26,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.5;scene.add(ground);
  const group=new THREE.Group();scene.add(group);
  const meshMaterial=(grade:MaterialGrade,transparent=false)=>new THREE.MeshStandardMaterial({
    color:COLORS[grade],roughness:grade==='metal'||grade==='armored'?.57:.93,metalness:grade==='metal'||grade==='armored'?.32:0,
    transparent,opacity:transparent?.18:1,side:THREE.DoubleSide
  });
  const visible=(f:number)=>mode==='all'||f===floor;
  const offset=(f:number)=>exploded?f*1.25:0;
  const tileY=(t:BuildingTile)=>((t.elevation??t.floor)*WALL_HEIGHT)+offset(t.floor);
  const addBox=(parent:THREE.Group,length:number,height:number,depth:number,color:number,
    x:number,y:number,z:number,rotate=0,opacity=1)=>{
    const mat=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:.09,transparent:opacity<1,opacity});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,height,depth),mat);
    mesh.position.set(x,y,z);mesh.rotation.y=rotate;parent.add(mesh);return mesh;
  };
  for(const tile of doc.tiles.filter(t=>visible(t.floor))){
    const shape=new THREE.Shape();
    tile.polygon.forEach((p,i)=>{const pt=worldXY(p);if(i===0)shape.moveTo(pt.x,pt.z);else shape.lineTo(pt.x,pt.z);});shape.closePath();
    const thickness=tile.kind==='foundation'?.40:.17;
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.015});
    geometry.rotateX(-Math.PI/2);
    const solid=tile.kind!=='floor-frame';
    const mat=meshMaterial(tile.grade,!solid);
    const floorMesh=new THREE.Mesh(geometry,mat);
    floorMesh.position.y=tileY(tile)-thickness;group.add(floorMesh);
    // Fine metallic perimeter to make the precise polygons legible at any camera angle.
    const pts=tile.polygon.map(p=>{const q=worldXY(p);return new THREE.Vector3(q.x,tileY(tile)+.018,q.z);});pts.push(pts[0]!.clone());
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xdbc6aa,transparent:true,opacity:.67})));
    if(tile.kind.startsWith('stairs')){
      const xs=tile.polygon.map(p=>p.x*UNIT),zs=tile.polygon.map(p=>p.y*UNIT);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      for(let n=0;n<5;n++)addBox(group,(maxX-minX)*.72,.13+n*.14,(maxZ-minZ)/5*.95,0xc5ab8b,
        (maxX+minX)/2,tileY(tile)+.08+n*.07,minZ+(n+.5)*(maxZ-minZ)/5);
    }
  }
  const explicit=new Set<string>();
  for(const edge of doc.edges.filter(e=>visible(e.floor))){
    const owner=owningTile(doc,edge);
    const base=(owner?tileY(owner):edge.floor*WALL_HEIGHT+offset(edge.floor));
    const a=worldXY(edge.a),b=worldXY(edge.b);
    const dx=b.x-a.x,dz=b.z-a.z,angle=-Math.atan2(dz,dx),span=Math.hypot(dx,dz);
    const centerX=(a.x+b.x)/2,centerZ=(a.z+b.z)/2;
    const item=new THREE.Group();item.position.set(centerX,base,centerZ);item.rotation.y=angle;group.add(item);
    const color=COLORS[edge.grade];
    const bar=(w:number,h:number,depth:number,x:number,y:number)=>addBox(item,w,h,depth,color,x,y,0);
    const height=edge.kind==='half-wall'?1.5:edge.kind==='low-wall'?.72:WALL_HEIGHT;
    if(edge.kind==='wall'||edge.kind==='half-wall'||edge.kind==='low-wall')bar(span,height,.19,0,height/2);
    else if(edge.kind==='doorway'||edge.kind==='wall-frame'){
      const gap=edge.kind==='doorway'?span*.52:span*.67;
      const side=Math.max(.16,(span-gap)/2);
      bar(side,height,.19,-span/2+side/2,height/2);bar(side,height,.19,span/2-side/2,height/2);
      bar(gap,.4,.19,0,height-.2);
      if(edge.insert&&edge.insert!=='none')addBox(item,gap-.035,height-.42,.085,COLORS[edge.grade]===COLORS.stone?0x976a43:0xa5744a,0,(height-.42)/2,0,0,.97);
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
  const resize=new ResizeObserver(()=>{
    const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });resize.observe(container);
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  return ()=>{
    resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}
      if(o instanceof THREE.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
    renderer.dispose();renderer.domElement.remove();
  };
 },[doc,floor,mode,exploded,hull,top]);
 return <div className="three-wrap">
   <div className="three-scene" ref={mount} aria-label="Interaktive räumliche 3D-Projektion des aktuellen Blueprints"/>
   {failure&&<div className="three-failure">{failure}</div>}
   <div className="three-head"><span className="live-dot"/><strong>3D / GEBÄUDEMODELL</strong><span className="three-label">Live aus Blueprint</span></div>
   <div className="three-controls">
    <button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>Alle Etagen</button>
    <button className={mode==='current'?'active':''} onClick={()=>setMode('current')}>Nur L{floor}</button>
    <button className={exploded?'active':''} onClick={()=>setExploded(x=>!x)}>Explodiert</button>
    <button className={top?'active':''} onClick={()=>setTop(x=>!x)}>Vogelperspektive</button>
    <button className={hull?'active':''} onClick={()=>setHull(x=>!x)}>Hülle*</button>
   </div>
   <div className="three-foot">Maus ziehen: drehen · Rad: zoomen · *Hülle ist eine unbestätigte Visualisierung · Dächer und Treppen schematisch</div>
  </div>;
}
