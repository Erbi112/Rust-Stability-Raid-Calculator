import { create } from 'zustand';
import { produce } from 'immer';
import type { BlueprintDocument } from '../core/blueprint.ts';
import type { Point, TileShape } from '../core/geometry.ts';
import { attachTo, exampleProject, exampleBunkerProject, newProject, placeRoot, removeEntity, updateSelected, upsertWall,
  type EdgeTarget, type EditorTool, type SelectedEntity } from '../core/editor.ts';
import type { MaterialGrade, EdgeKind, SoftSide, BuildingKind, DoorInsert, HealthState } from '../core/blueprint.ts';

const MAX_HISTORY=75;
interface EditorStore {
  doc:BlueprintDocument;
  past:BlueprintDocument[];
  future:BlueprintDocument[];
  tool:EditorTool;
  floor:number;
  selected:SelectedEntity;
  modifiedAt:number;
  isLoading:boolean;
  setTool:(tool:EditorTool)=>void;
  setFloor:(floor:number)=>void;
  select:(selected:SelectedEntity)=>void;
  rename:(name:string)=>void;
  startNew:()=>void;
  loadExample:()=>void;
  loadBunkerExample:()=>void;
  hydrate:(doc:BlueprintDocument|null)=>void;
  setDocument:(doc:BlueprintDocument)=>void;
  root:(shape:TileShape,at:Point,elevation?:number)=>boolean;
  attach:(sourceId:string,index:number,shape:TileShape,relativeHeight?:number)=>boolean;
  wall:(target:EdgeTarget,kind:EdgeKind)=>void;
  erase:()=>void;
  eraseTarget:(target:SelectedEntity)=>void;
  updateGrade:(grade:MaterialGrade)=>void;
  updateStability:(stability:number|null)=>void;
  updateHealth:(health:HealthState)=>void;
  updateSoftSide:(side:SoftSide)=>void;
  updateTileKind:(kind:BuildingKind)=>void;
  updateEdgeKind:(kind:EdgeKind)=>void;
  updateInsert:(insert:DoorInsert)=>void;
  updateRotation:(rotation:number)=>void;
  updateElevation:(elevation:number)=>void;
  undo:()=>void;
  redo:()=>void;
}
const uid=()=>globalThis.crypto?.randomUUID?.()??`e${Math.random().toString(36).slice(2)}`;
function commit(s:EditorStore,doc:BlueprintDocument):Partial<EditorStore>{
  if(doc===s.doc)return {};
  return {doc,past:[...s.past.slice(-(MAX_HISTORY-1)),s.doc],future:[],modifiedAt:Date.now()};
}
export const useEditor=create<EditorStore>((set,get)=>({
  doc:newProject(),past:[],future:[],tool:'inspect',floor:0,selected:null,modifiedAt:0,isLoading:true,
  setTool:(tool)=>set({tool,selected:null}),
  setFloor:(floor)=>set({floor:Math.min(20,Math.max(0,floor)),selected:null}),
  select:(selected)=>set({selected,tool:'inspect'}),
  rename:(name)=>set(s=>commit(s,produce(s.doc,d=>{d.name=name;}))),
  startNew:()=>set({doc:newProject(),past:[],future:[],selected:null,floor:0,modifiedAt:Date.now(),tool:'inspect'}),
  loadExample:()=>set({doc:exampleProject(),past:[],future:[],selected:null,floor:0,modifiedAt:Date.now(),tool:'inspect'}),
  loadBunkerExample:()=>set({doc:exampleBunkerProject(),past:[],future:[],selected:null,floor:0,modifiedAt:Date.now(),tool:'inspect'}),
  hydrate:(doc)=>set({doc:doc??newProject(),isLoading:false,past:[],future:[],modifiedAt:0}),
  setDocument:(doc)=>set({doc,past:[],future:[],selected:null,floor:0,modifiedAt:Date.now(),tool:'inspect'}),
  root:(shape,at,elevation)=>{
    const s=get(),next=placeRoot(s.doc,s.floor,shape,at,uid(),elevation??s.floor);
    if(!next)return false;set(commit(s,next));return true;
  },
  attach:(sourceId,index,shape,relativeHeight=0)=>{
    const s=get(),next=attachTo(s.doc,s.floor,sourceId,index,shape,uid(),relativeHeight);
    if(!next)return false;set(commit(s,next));return true;
  },
  wall:(target,kind)=>set(s=>commit(s,upsertWall(s.doc,target,kind,uid()))),
  erase:()=>set(s=>({...commit(s,removeEntity(s.doc,s.selected)),selected:null})),
  eraseTarget:(target)=>set(s=>({...commit(s,removeEntity(s.doc,target)),selected:null})),
  updateGrade:(grade)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{grade}))),
  updateStability:(stability)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{stability}))),
  updateHealth:(health)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{health}))),
  updateSoftSide:(softSide)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{softSide}))),
  updateTileKind:(tileKind)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{tileKind}))),
  updateEdgeKind:(edgeKind)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{edgeKind}))),
  updateInsert:(insert)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{insert}))),
  updateRotation:(rotation)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{rotation}))),
  updateElevation:(elevation)=>set(s=>commit(s,updateSelected(s.doc,s.selected,{elevation}))),
  undo:()=>set(s=>{
    if(!s.past.length)return {};
    return {doc:s.past[s.past.length-1]!,past:s.past.slice(0,-1),future:[s.doc,...s.future],selected:null,modifiedAt:Date.now()};
  }),
  redo:()=>set(s=>{
    if(!s.future.length)return {};
    return {doc:s.future[0]!,past:[...s.past,s.doc],future:s.future.slice(1),selected:null,modifiedAt:Date.now()};
  }),
}));
