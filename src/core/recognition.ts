/**
 * GHOSTFRAME v0.9: partial, rigid geometric recognition.
 * This is a deterministic compatibility check, NOT a posterior probability,
 * a reconstruction guarantee, or a validated Rust stability simulation.
 * Missing or hypothetical observations never prove the absence of a structure.
 */
import { edgeAt, sameEdge, type Point, type Polygon } from './geometry.ts';
import type { BlueprintDocument, BuildingTile, BuildingEdge, BlueprintState } from './blueprint.ts';

const POSITION_EPS = 0.15; // editor coordinates; tile side = 100
const HEIGHT_EPS = 0.02; // wall-height units
export type Compatibility = 'compatible' | 'partial' | 'conflict' | 'no-evidence';
export type RecognitionTransform = Readonly<{cos:number;sin:number;mirror:boolean;tx:number;ty:number;floorShift:number}>;
export type MatchedTile = Readonly<{observedId:string;candidateId:string}>;
export type RecognitionResult = Readonly<{
  key:string;name:string;quality:BlueprintDocument['quality'];status:Compatibility;
  variantId:string|null;variantLabel:string;
  observedTiles:number;matchedTiles:number;untestedTiles:number;
  checkedHeights:number;heightConflicts:number;
  checkedMaterials:number;materialConflicts:number;
  checkedEdges:number;edgeConflicts:number;
  rank:number;matchPairs:readonly MatchedTile[];
  transform:RecognitionTransform|null;
  notes:readonly string[];
}>;
export type Candidate = Readonly<{key:string;doc:BlueprintDocument}>;

const center=(poly:Polygon):Point=>({x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length});
function apply(t:RecognitionTransform,p:Point):Point{
 const x=t.mirror?-p.x:p.x;
 return {x:x*t.cos-p.y*t.sin+t.tx,y:x*t.sin+p.y*t.cos+t.ty};
}
function pointKey(p:Point,shape:string,floor:number):string{
 return `${floor}|${shape}|${Math.round(p.x/POSITION_EPS)}|${Math.round(p.y/POSITION_EPS)}`;
}
function similarPolygon(a:Polygon,b:Polygon,t:RecognitionTransform):boolean{
 if(a.length!==b.length)return false;
 const points=a.map(p=>apply(t,p));
 return points.every(p=>b.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<POSITION_EPS));
}
function transformFromAnchors(a:BuildingTile,b:BuildingTile,vertexIndex:number,mirror:boolean):RecognitionTransform {
 const v0=a.polygon[0]!,v1=a.polygon[1]!;
 const q0=b.polygon[vertexIndex]!,q1=b.polygon[(vertexIndex+1)%b.polygon.length]!;
 const mappedV1X=mirror?-v1.x:v1.x, mappedV0X=mirror?-v0.x:v0.x;
 const angle=Math.atan2(q1.y-q0.y,q1.x-q0.x)-Math.atan2(v1.y-v0.y,mappedV1X-mappedV0X);
 const cos=Math.cos(angle),sin=Math.sin(angle);
 const vx=mappedV0X*cos-v0.y*sin,vy=mappedV0X*sin+v0.y*cos;
 return {cos,sin,mirror,tx:q0.x-vx,ty:q0.y-vy,floorShift:b.floor-a.floor};
}
function compareEdge(a:BuildingEdge,b:BuildingEdge):boolean{
 if(a.kind!=='unknown'&&b.kind!=='unknown'&&a.kind!==b.kind)return false;
 if(a.insert&&a.insert!=='none'&&b.insert&&b.insert!=='none'&&a.insert!==b.insert)return false;
 return true;
}
function gradeConflict(a:{grade:string},b:{grade:string}):boolean{
 return a.grade!=='unknown'&&b.grade!=='unknown'&&a.grade!==b.grade;
}
function stateTiles(doc:BlueprintDocument,state?:BlueprintState){
 const ids=state?new Set(state.tileIds):null;
 return ids?doc.tiles.filter(t=>ids.has(t.id)):doc.tiles;
}
function stateEdges(doc:BlueprintDocument,state?:BlueprintState){
 const ids=state?new Set(state.edgeIds):null;
 return ids?doc.edges.filter(e=>ids.has(e.id)):doc.edges;
}
function sample(observed:BlueprintDocument,candidate:BlueprintDocument,key:string,state?:BlueprintState):RecognitionResult {
 const source=observed.tiles.filter(x=>x.observation==='observed');
 const targets=stateTiles(candidate,state);
 const edges=stateEdges(candidate,state);
 const candidateIndex=new Map<string,BuildingTile[]>();
 for(const tile of targets){
  const k=pointKey(center(tile.polygon),tile.shape,tile.floor);
  candidateIndex.set(k,[...(candidateIndex.get(k)??[]),tile]);
 }
 const obsEdges=observed.edges.filter(e=>e.observation==='observed');
 const qualityComplete=candidate.quality==='L3'||candidate.quality==='L4';
 const noData:RecognitionResult={key,name:candidate.name,quality:candidate.quality,status:'no-evidence',
  variantId:state?.id??null,variantLabel:state?.label??'Standard',
  observedTiles:source.length,matchedTiles:0,untestedTiles:source.length,
  checkedHeights:0,heightConflicts:0,checkedMaterials:0,materialConflicts:0,checkedEdges:0,edgeConflicts:0,
  rank:-99999,matchPairs:[],transform:null,notes:['Keine geometrisch bestätigte Übereinstimmung.']};
 if(!source.length||!targets.length)return {...noData,notes:[!source.length?'Bitte zuerst beobachtete Bauteile im Editor erfassen.':'Keine digitalisierten Flächen im Kandidaten.']};
 // Anchor on rarer shape so broad libraries remain responsive, even when the drawn base is partial.
 const firstSquare=source.find(t=>t.shape==='square');
 const firstTriangle=source.find(t=>t.shape==='triangle');
 const anchors=[firstSquare,firstTriangle,source[Math.floor(source.length/2)]].filter((t,i,all):t is BuildingTile=>Boolean(t)&&all.findIndex(a=>a?.id===t?.id)===i);
 let best:RecognitionResult|null=null;
 for(const anchor of anchors)for(const target of targets){
  if(target.shape!==anchor.shape)continue;
  for(const mirror of [false,true])for(let v=0;v<target.polygon.length;v++){
   const tr=transformFromAnchors(anchor,target,v,mirror);
   if(!similarPolygon(anchor.polygon,target.polygon,tr))continue;
   const used=new Set<string>();const pairs:MatchedTile[]=[];
   let heightConflicts=0,checkedHeights=0,materialConflicts=0,checkedMaterials=0;
   for(const sourceTile of source){
    const floor=sourceTile.floor+tr.floorShift;
    const destCenter=apply(tr,center(sourceTile.polygon));
    const bucket=candidateIndex.get(pointKey(destCenter,sourceTile.shape,floor))??[];
    const match=bucket.find(t=>!used.has(t.id)&&similarPolygon(sourceTile.polygon,t.polygon,tr));
    if(!match)continue;
    used.add(match.id);pairs.push({observedId:sourceTile.id,candidateId:match.id});
    if(sourceTile.grade!=='unknown'&&match.grade!=='unknown'){
     checkedMaterials++;if(gradeConflict(sourceTile,match))materialConflicts++;
    }
    // Relative z is evaluated only if both anchor heights and the observed elevation are explicitly known.
    if(sourceTile.id!==anchor.id&&sourceTile.elevation!==undefined&&anchor.elevation!==undefined&&match.elevation!==undefined&&target.elevation!==undefined){
     checkedHeights++;
     if(Math.abs((sourceTile.elevation-anchor.elevation)-(match.elevation-target.elevation))>HEIGHT_EPS)heightConflicts++;
    }
   }
   let checkedEdges=0,edgeConflicts=0;
   const validObs=new Set(pairs.map(p=>p.observedId));
   for(const e of obsEdges){
    const belongs=observed.tiles.some(t=>validObs.has(t.id)&&t.floor===e.floor&&t.polygon.some((_,i)=>{
     const [a,b]=edgeAt(t.polygon,i);return sameEdge(e.a,e.b,a,b);
    }));
    if(!belongs)continue;
    const ea=apply(tr,e.a),eb=apply(tr,e.b),fl=e.floor+tr.floorShift;
    const other=edges.find(x=>x.floor===fl&&
      ((Math.hypot(x.a.x-ea.x,x.a.y-ea.y)<POSITION_EPS&&Math.hypot(x.b.x-eb.x,x.b.y-eb.y)<POSITION_EPS)||
       (Math.hypot(x.a.x-eb.x,x.a.y-eb.y)<POSITION_EPS&&Math.hypot(x.b.x-ea.x,x.b.y-ea.y)<POSITION_EPS)));
    if(!other)continue; // absence of documented opening is not evidence of an empty wall
    checkedEdges++;
    if(!compareEdge(e,other)||gradeConflict(e,other))edgeConflicts++;
   }
   const untested=source.length-pairs.length;
   const conflicts=heightConflicts+materialConflicts+edgeConflicts+(qualityComplete?untested:0);
   const status:Compatibility=conflicts?'conflict':untested?'partial':'compatible';
   // Rank sorts hypotheses; never display as probability or calibration.
   const rank=pairs.length*1000-untested*600-(heightConflicts+materialConflicts+edgeConflicts)*1200+
    checkedHeights*4+checkedEdges*4+checkedMaterials*2+(qualityComplete?12:0);
   const notes=[
    `${pairs.length} von ${source.length} beobachteten Grundflächen geometrisch zugeordnet`,
    checkedHeights?`${checkedHeights} relative Höhen geprüft, ${heightConflicts} Widersprüche`:'Keine vergleichbaren gemessenen Höhen',
    checkedEdges?`${checkedEdges} Kantenobjekte geprüft, ${edgeConflicts} Widersprüche`:'Kanten-/Türdaten nicht ausreichend vergleichbar',
    untested?`${untested} Beobachtungen im Kandidaten nicht zugeordnet`:'Alle beobachteten Grundflächen zugeordnet'
   ];
   const result:RecognitionResult={...noData,status,rank,matchPairs:pairs,transform:tr,observedTiles:source.length,
    matchedTiles:pairs.length,untestedTiles:untested,checkedHeights,heightConflicts,checkedMaterials,materialConflicts,
    checkedEdges,edgeConflicts,notes};
   if(!best||result.rank>best.rank)best=result;
  }
 }
 return best??noData;
}
export function recognizeBlueprints(observed:BlueprintDocument,candidates:readonly Candidate[]):RecognitionResult[]{
 const results=candidates.filter(c=>c.doc.id!==observed.id).map(({key,doc})=>{
  const possibilities=[sample(observed,doc,key),...(doc.states??[]).map(state=>sample(observed,doc,key,state))];
  return possibilities.sort((a,b)=>b.rank-a.rank)[0]!;
 });
 return results.sort((a,b)=>b.rank-a.rank||a.name.localeCompare(b.name));
}
