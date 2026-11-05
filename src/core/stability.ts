/** Structural connectivity analysis for GHOSTFRAME.
 * This is a conservative topology model, NOT Facepunch's undisclosed stability formula.
 * A connected link describes a geometrically plausible support path only; a disconnected
 * piece means no such path is *documented*, never a prediction that Rust will collapse it.
 */
import type { BlueprintDocument, BuildingEdge, BuildingTile } from './blueprint.ts';
import { edgeAt, sameEdge } from './geometry.ts';
import { tileHeight } from './levels.ts';

export type StructuralStatus = 'anchor'|'linked'|'unverified';
export type StructuralLinkKind = 'shared-edge'|'wall-base'|'wall-top';
export interface StructuralLink {a:string;b:string;kind:StructuralLinkKind}
export interface StructuralNode {id:string;type:'tile'|'edge';floor:number;status:StructuralStatus;distance:number|null;neighbors:number}
export interface StructuralReport {
  model:'topology-v1';
  nodes:Readonly<Record<string,StructuralNode>>;
  links:readonly StructuralLink[];
  anchors:readonly string[];
  linkedCount:number;
  unverifiedCount:number;
  measuredCount:number;
  totalCount:number;
  warnings:readonly string[];
}
export interface RemovalImpact {
  removedId:string;
  newlyUnverified:readonly string[];
  alreadyUnverified:readonly string[];
  connectedBefore:number;
  connectedAfter:number;
  assessment:'no-new-gap'|'potential-dependencies';
}
const EPS=1e-5;
const FULL_HEIGHT=1; // plan unit: one wall height
const half=(kind:string)=>kind==='half-wall'?0.5:kind==='low-wall'?0.25:FULL_HEIGHT;
const isSupportingEdge=(kind:string)=>['wall','doorway','window','wall-frame','half-wall','low-wall'].includes(kind);
const nodesFor=(doc:BlueprintDocument)=>[...doc.tiles.map(t=>({id:t.id,type:'tile' as const,floor:t.floor})),
  ...doc.edges.filter(e=>isSupportingEdge(e.kind)).map(e=>({id:e.id,type:'edge' as const,floor:e.floor}))];
function touches(a:BuildingTile,b:BuildingTile):boolean {
  return a.polygon.some((_,i)=>{
    const [u,v]=edgeAt(a.polygon,i);
    return b.polygon.some((__,j)=>{const [w,x]=edgeAt(b.polygon,j);return sameEdge(u,v,w,x)});
  });
}
function hasEdge(t:BuildingTile,e:BuildingEdge):boolean {
  return t.polygon.some((_,i)=>{const [a,b]=edgeAt(t.polygon,i);return sameEdge(a,b,e.a,e.b)});
}
/** A link at the same height is a plausible socket relationship, not guaranteed Rust support. */
export function structuralConnectivity(doc:BlueprintDocument):StructuralReport {
  const parts=nodesFor(doc),existing=new Set(parts.map(n=>n.id));
  const links:StructuralLink[]=[];
  const seen=new Set<string>();
  const add=(a:string,b:string,kind:StructuralLinkKind)=>{
    if(a===b||!existing.has(a)||!existing.has(b))return;
    const key=[a,b].sort().join('\u0000');
    if(!seen.has(key)){seen.add(key);links.push({a,b,kind})}
  };
  for(let i=0;i<doc.tiles.length;i++){
    const a=doc.tiles[i]!;
    for(let j=i+1;j<doc.tiles.length;j++){
      const b=doc.tiles[j]!;
      if(a.floor===b.floor && Math.abs(tileHeight(a)-tileHeight(b))<=EPS && touches(a,b))
        add(a.id,b.id,'shared-edge');
    }
  }
  for(const e of doc.edges.filter(e=>isSupportingEdge(e.kind))){
    const bases=doc.tiles.filter(t=>t.floor===e.floor&&hasEdge(t,e));
    for(const base of bases){
      add(base.id,e.id,'wall-base');
      // A wall can meet the edge of a floor above. Height-offset bunker pieces
      // remain separate unless their actual surfaces are aligned geometrically.
      const top=tileHeight(base)+half(e.kind);
      for(const upper of doc.tiles){
        if(upper.floor===base.floor+1 && Math.abs(tileHeight(upper)-top)<=EPS && hasEdge(upper,e))
          add(e.id,upper.id,'wall-top');
      }
    }
  }
  const adjacency=new Map(parts.map(n=>[n.id,new Set<string>()]));
  for(const {a,b} of links){adjacency.get(a)?.add(b);adjacency.get(b)?.add(a)}
  const anchors=doc.tiles.filter(t=>t.floor===0&&t.kind==='foundation').map(t=>t.id);
  const distance=new Map<string,number>();
  const queue=[...anchors];for(const id of anchors)distance.set(id,0);
  for(let head=0;head<queue.length;head++){
    const id=queue[head]!;
    for(const other of adjacency.get(id)??[]){if(!distance.has(other)){distance.set(other,distance.get(id)!+1);queue.push(other)}}
  }
  const nodes:Record<string,StructuralNode>={};
  for(const n of parts){
    const dist=distance.get(n.id)??null;
    nodes[n.id]={...n,status:anchors.includes(n.id)?'anchor':dist===null?'unverified':'linked',distance:dist,
      neighbors:adjacency.get(n.id)?.size??0};
  }
  const measuredCount=[...doc.tiles,...doc.edges].filter(n=>n.stability.percent!==null).length;
  const unverifiedCount=parts.filter(n=>!distance.has(n.id)).length;
  const warnings=[
    ...(anchors.length===0&&parts.length?['Kein Fundament-Anker auf F0 erfasst. Terrain-Kontakt lässt sich nicht prüfen.']:[]),
    ...(unverifiedCount? [`Für ${unverifiedCount} tragende Bauteil(e) ist kein Fundamentpfad im dokumentierten Modell nachweisbar.`]:[]),
    'Topologische Näherung, keine Rust-Stabilitätsprozent- oder Kollapsprognose. Nicht eingetragene Wände können das Ergebnis verändern.'
  ];
  return {model:'topology-v1',nodes,links,anchors,linkedCount:distance.size,unverifiedCount,
    totalCount:parts.length,measuredCount,warnings};
}
/** Simulate deleting one documented tile/wall to find lost modeled support paths.
 * This never changes the original blueprint. Door inserts themselves are not anchors. */
export function simulateStructuralRemoval(doc:BlueprintDocument,id:string):RemovalImpact {
  const before=structuralConnectivity(doc);
  const next:BlueprintDocument={...doc,tiles:doc.tiles.filter(t=>t.id!==id),
    edges:doc.edges.filter(e=>e.id!==id && !(
      doc.tiles.some(t=>t.id===id&&t.floor===e.floor&&hasEdge(t,e)) &&
      !doc.tiles.some(t=>t.id!==id&&t.floor===e.floor&&hasEdge(t,e))
    ))};
  const after=structuralConnectivity(next);
  const newlyUnverified=Object.values(after.nodes)
    .filter(n=>n.status==='unverified'&&before.nodes[n.id]?.status!=='unverified').map(n=>n.id);
  const alreadyUnverified=Object.values(after.nodes)
    .filter(n=>n.status==='unverified'&&before.nodes[n.id]?.status==='unverified').map(n=>n.id);
  return {removedId:id,newlyUnverified,alreadyUnverified,
    connectedBefore:before.linkedCount,connectedAfter:after.linkedCount,
    assessment:newlyUnverified.length?'potential-dependencies':'no-new-gap'};
}
