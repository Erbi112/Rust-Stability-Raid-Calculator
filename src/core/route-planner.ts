/**
 * GHOSTFRAME v1.0 — explicit blueprint traversal graph and raid-route reference planner.
 * Only recorded walls/doors can yield quantified costs. Absent edges are UNKNOWN,
 * never silently interpreted as a free entry. No splash, collapse, soft-side or
 * in-game socket/stability optimizations. No Bayesian confidence claims.
 */
import { edgeAt, sameEdge, type Point } from './geometry.ts';
import { estimateTarget, isRecordedOpenPassage, SULFUR_PER, RAID_REFERENCE, type RaidMethod } from './raid.ts';
import { tileHeight } from './levels.ts';
import type { BlueprintDocument, BuildingTile, BuildingEdge } from './blueprint.ts';
import type { Candidate, RecognitionResult, RecognitionTransform } from './recognition.ts';

export type RouteMode = 'documented' | 'exploratory';
export type RouteCrossing = 'perimeter' | 'wall' | 'floor' | 'stair' | 'hatch' | 'unrecorded';
export type RouteStep = Readonly<{
 from:string;to:string; kind:RouteCrossing;barrierId:string|null;
 label:string; methodCount:number|null;sulfur:number|null;
 /** Unknown means the crossing is not fully documented or has no cost model. */
 uncertain:boolean; a:Point|null;b:Point|null;floor:number;
}>;
export type RaidRoute = Readonly<{
 targetId:string; mode:RouteMode;method:RaidMethod;
 entryKey:string; entryFloor:number;
 steps:readonly RouteStep[];barrierIds:readonly string[];
 /** Sulfur is null whenever any step has unknown cost or passage. */
 sulfur:number|null; knownSulfur:number; methodTotal:number|null;
 uncertainSteps:number;status:'modeled'|'conditional';
}>;
export type PlannerResult = Readonly<{
 targetId:string; method:RaidMethod;documented:readonly RaidRoute[];
 exploratory:readonly RaidRoute[];warnings:readonly string[];
}>;

type Link={to:string;step:RouteStep};
const OUT='__outside__';
const EPS=.08;
const samePosition=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<EPS;
const ptKey=(p:Point)=>`${Math.round(p.x*100)}:${Math.round(p.y*100)}`;
const key=(a:Point,b:Point,floor:number)=>`${floor}|${[ptKey(a),ptKey(b)].sort().join('|')}`;
export function perimeterKey(a:Point,b:Point,floor:number):string{return key(a,b,floor);}
const zero=(from:string,to:string,kind:RouteCrossing,label:string,floor:number,a:Point|null,b:Point|null):RouteStep=>({
 from,to,kind,label,floor,a,b,barrierId:null,methodCount:0,sulfur:0,uncertain:false
});
function barrier(from:string,to:string,edge:BuildingEdge|BuildingTile|undefined,kind:RouteCrossing,
 floor:number,a:Point|null,b:Point|null,method:RaidMethod):RouteStep {
 if(!edge)return {from,to,kind:'unrecorded',label:'Nicht dokumentierte Kante',floor,a,b,barrierId:null,methodCount:null,sulfur:null,uncertain:true};
 if('a' in edge && isRecordedOpenPassage(edge)){
  return zero(from,to,kind,'Dokumentierte freie Öffnung',floor,a,b);
 }
 if('polygon' in edge&&edge.kind==='floor-frame'&&(!edge.floorInsert||edge.floorInsert==='none')){
  return zero(from,to,kind,'Offener Bodenrahmen',floor,a,b);
 }
 if('polygon' in edge&&edge.kind==='floor-frame'&&edge.floorInsert){
  // Hatch costs are currently limited to the consistently documented base hatch.
  // The same sourced full-health profile is used by the manual and graph planners.
 }
 const estimate=estimateTarget(edge);
 const count=estimate.counts[method];
 return {from,to,kind,label:estimate.label,floor,a,b,barrierId:edge.id,
  methodCount:count,sulfur:count===null?null:count*SULFUR_PER[method],uncertain:count===null};
}
function buildGraph(doc:BlueprintDocument,method:RaidMethod):Map<string,Link[]> {
 const graph=new Map<string,Link[]>();
 for(const tile of doc.tiles)graph.set(tile.id,[]);
 graph.set(OUT,[]);
 const add=(from:string,to:string,step:RouteStep)=>{
   graph.get(from)?.push({to,step});
   graph.get(to)?.push({to:from,step:{...step,from:to,to:from}});
 };
 const sides=new Map<string,{a:Point;b:Point;floor:number;owners:string[]} >();
 for(const tile of doc.tiles)for(let i=0;i<tile.polygon.length;i++){
  const [a,b]=edgeAt(tile.polygon,i),k=key(a,b,tile.floor);
  const side=sides.get(k);
  if(side)side.owners.push(tile.id);
  else sides.set(k,{a,b,floor:tile.floor,owners:[tile.id]});
 }
 const groundFloor=doc.tiles.length?Math.min(...doc.tiles.map(t=>t.floor)):0;
 const uniqueEdges=new Set<string>();
 for(const [sideKey,side] of sides){
  if(side.owners.length>2)continue; // non-manifold input is not a traversable edge
  const item=doc.edges.find(e=>e.floor===side.floor&&sameEdge(side.a,side.b,e.a,e.b));
  if(side.owners.length===2){
   const [a,b]=side.owners as [string,string];
   if(a===b||uniqueEdges.has(sideKey))continue;
   uniqueEdges.add(sideKey);
   add(a,b,barrier(a,b,item,'wall',side.floor,side.a,side.b,method));
  }else if(side.owners.length===1&&side.floor===groundFloor){
   const id=side.owners[0]!;
   add(OUT,id,barrier(OUT,id,item,'perimeter',side.floor,side.a,side.b,method));
  }
 }
 // Vertical transitions require directly stacked, congruent (same-footprint) cells.
 // This is intentionally not a comprehensive Rust jump, roof or exterior access simulator.
 const sorted=[...doc.tiles].sort((a,b)=>a.floor-b.floor);
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){
  const low=sorted[i]!,high=sorted[j]!;
  if(high.floor-low.floor>1)break;
  if(high.floor!==low.floor+1||low.shape!==high.shape)continue;
  if(low.polygon.length!==high.polygon.length||!low.polygon.every(p=>high.polygon.some(q=>samePosition(p,q))))continue;
  if(Math.abs(tileHeight(high)-tileHeight(low)-1)>.13)continue;
  const from=low.id,to=high.id;
  let step:RouteStep;
  if(high.kind==='floor-frame')step=barrier(from,to,high,'floor',high.floor,null,null,method);
  else if(high.kind==='floor' || high.kind==='foundation')step=barrier(from,to,high,'floor',high.floor,null,null,method);
  else if(low.kind.startsWith('stairs')&&high.kind.startsWith('stairs'))step=zero(from,to,'stair','Dokumentierte Treppenverbindung',high.floor,null,null);
  else continue;
  add(from,to,step);
 }
 return graph;
}

type EntryRoute={steps:RouteStep[];unknown:number;known:number;count:number;key:string};
const compare=(a:EntryRoute,b:EntryRoute)=>a.unknown-b.unknown||a.known-b.known||a.steps.length-b.steps.length||a.key.localeCompare(b.key);
/** Reverse Dijkstra: one target search yields cheapest continuation for EVERY exterior
 * entry. Avoids one full graph search per perimeter edge on large imported bases. */
function search(graph:Map<string,Link[]>,targetId:string,method:RaidMethod,mode:RouteMode,limit:number):RaidRoute[]{
 if(!graph.has(targetId)||targetId===OUT)return [];
 const terminal:EntryRoute={steps:[],unknown:0,known:0,count:0,key:targetId};
 const best=new Map<string,EntryRoute>([[targetId,terminal]]);
 const frontier:{id:string;state:EntryRoute}[]=[{id:targetId,state:terminal}];
 while(frontier.length){
  frontier.sort((a,b)=>compare(a.state,b.state));
  const current=frontier.shift()!;
  if(best.get(current.id)!==current.state)continue;
  for(const link of graph.get(current.id)??[]){
   if(link.to===OUT||(mode==='documented'&&link.step.uncertain))continue;
   const reversed:RouteStep={...link.step,from:link.to,to:current.id};
   const next:EntryRoute={steps:[reversed,...current.state.steps],
    unknown:current.state.unknown+(reversed.uncertain?1:0),
    known:current.state.known+(reversed.sulfur??0),
    count:current.state.count+(reversed.methodCount??0),key:link.to};
   if(next.steps.length>=graph.size)continue;
   const prev=best.get(link.to);
   if(!prev||compare(next,prev)<0){best.set(link.to,next);frontier.push({id:link.to,state:next});}
  }
 }
 const routes:RaidRoute[]=[];
 for(const entry of graph.get(OUT)??[]){
  if(mode==='documented'&&entry.step.uncertain)continue;
  const continuation=best.get(entry.to);if(!continuation)continue;
  const steps=[entry.step,...continuation.steps];
  const unknown=continuation.unknown+(entry.step.uncertain?1:0);
  const known=continuation.known+(entry.step.sulfur??0);
  const count=continuation.count+(entry.step.methodCount??0);
  const entryKey=perimeterKey(entry.step.a!,entry.step.b!,entry.step.floor);
  routes.push({targetId,mode,method,entryKey,entryFloor:entry.step.floor,steps,
   barrierIds:[...new Set(steps.flatMap(s=>s.barrierId?[s.barrierId]:[]))],
   knownSulfur:known,sulfur:unknown?null:known,methodTotal:unknown?null:count,
   uncertainSteps:unknown,status:unknown?'conditional':'modeled'});
 }
 routes.sort((a,b)=>a.uncertainSteps-b.uncertainSteps||a.knownSulfur-b.knownSulfur||a.steps.length-b.steps.length||a.entryKey.localeCompare(b.entryKey));
 return routes.slice(0,limit);
}

export function planRaidRoutes(doc:BlueprintDocument,targetId:string,method:RaidMethod='rockets',limit=8):PlannerResult {
 const warnings:string[]=[];
 if(!doc.tiles.some(t=>t.id===targetId))warnings.push('Ziel ist keine vorhandene Grundfläche.');
 if(!doc.tiles.length)warnings.push('Keine Grundflächen im Blueprint.');
 if(!doc.edges.length)warnings.push('Keine Kantenobjekte erfasst: keine dokumentierten Durchgänge oder Wände.');
 if(doc.game.patch===null)warnings.push('Spiel-Patch nicht hinterlegt; Raid-Zahlen stammen aus der Community-Referenz '+RAID_REFERENCE.patch+'.');
 else if(doc.game.patch!==RAID_REFERENCE.patch)warnings.push('Blueprint-Patch '+doc.game.patch+' unterscheidet sich vom Referenzstand '+RAID_REFERENCE.patch+'. Keine garantierte Gültigkeit.');
 warnings.push('Richtwerte für volle HP; öffentlich dokumentiert, nicht selbst im Spiel geprüft. Keine Misch- oder Splash-Damage-Optimierung.');
 const graph=buildGraph(doc,method);
 const documented=search(graph,targetId,method,'documented',limit);
 const exploratory=search(graph,targetId,method,'exploratory',limit);
 if(!documented.length&&doc.tiles.some(t=>t.id===targetId))warnings.push('Kein vollständig modellierter Zugang gefunden. Unbekannte Kanten sind nicht automatisch frei.');
 return {targetId,method,documented,exploratory,warnings};
}

/** Transform candidate perimeter geometry back into the observed plan's coordinates. */
export function inverseTransformPoint(p:Point,t:RecognitionTransform):Point{
 const x=p.x-t.tx,y=p.y-t.ty;
 const mx=x*t.cos+y*t.sin,my=-x*t.sin+y*t.cos;
 return {x:t.mirror?-mx:mx,y:my};
}
export type CandidateRaidComparison=Readonly<{
 key:string;name:string;variant:string;matchedTargetId:string|null;
 status:'modeled'|'conditional'|'unmapped'|'no-route';
 best:RaidRoute|null; options:readonly RaidRoute[];
 /** Global observed coordinates for any entry shared across candidates. */
 entries:readonly {key:string;route:RaidRoute}[];
}>;
export type MultiCandidatePlan=Readonly<{
 comparisons:readonly CandidateRaidComparison[];
 shared:Readonly<{entryKey:string;worstSulfur:number;sumSulfur:number;perCandidate:readonly {key:string;name:string;route:RaidRoute}[]}>|null;
 warning:string;
}>;
/** A minimax first-breach strategy is offered only if every candidate provides
 * a *fully documented*, geo-aligned route through the SAME physical perimeter.
 * No arbitrary probability weighting and no fallback to unknown-cost routes. */
export function compareCandidateRaidRoutes(observed:BlueprintDocument,observedTargetId:string,
 candidates:readonly {candidate:Candidate;recognition:RecognitionResult}[],method:RaidMethod='rockets'):MultiCandidatePlan {
 const targetPresent=observed.tiles.some(t=>t.id===observedTargetId);
 const comparisons:CandidateRaidComparison[]=candidates.slice(0,6).map(({candidate,recognition})=>{
  const mapped=targetPresent?recognition.matchPairs.find(x=>x.observedId===observedTargetId)?.candidateId??null:null;
  const matching=recognition.status==='compatible'||recognition.status==='partial';
  if(!mapped||!matching||!recognition.transform)return {key:candidate.key,name:candidate.doc.name,variant:recognition.variantLabel,
   matchedTargetId:null,status:'unmapped' as const,best:null,options:[],entries:[]};
  const state=candidate.doc.states?.find(s=>s.id===recognition.variantId);
  const doc=state?{...candidate.doc,tiles:candidate.doc.tiles.filter(t=>state.tileIds.includes(t.id)),
   edges:candidate.doc.edges.filter(e=>state.edgeIds.includes(e.id))}:candidate.doc;
  const result=planRaidRoutes(doc,mapped,method,100);
  const options=result.documented;
  const best=options[0]??result.exploratory[0]??null;
  const entries=options.filter(route=>route.steps[0]?.a&&route.steps[0]?.b).map(route=>{
   const first=route.steps[0]!;
   const a=inverseTransformPoint(first.a!,recognition.transform!),b=inverseTransformPoint(first.b!,recognition.transform!);
   return {key:perimeterKey(a,b,first.floor-recognition.transform!.floorShift),route};
  });
  return {key:candidate.key,name:candidate.doc.name,variant:recognition.variantLabel,matchedTargetId:mapped,
   status:!best?'no-route':best.uncertainSteps?'conditional':'modeled',best,options,entries};
 });
 if(!comparisons.length)return {comparisons,shared:null,warning:'Keine geeigneten Kandidaten ausgewählt.'};
 if(comparisons.some(c=>c.status!=='modeled'))return {comparisons,shared:null,
  warning:'Einige Kandidaten haben kein zugeordnetes Ziel oder nur unbekannte Zugänge. Eine gemeinsame Kostenstrategie wäre irreführend.'};
 const common=new Set(comparisons[0]!.entries.map(e=>e.key));
 for(const comparison of comparisons.slice(1))for(const k of [...common])if(!comparison.entries.some(e=>e.key===k))common.delete(k);
 const ranked=[...common].map(entryKey=>{
  const perCandidate=comparisons.map(c=>{
   const route=c.entries.filter(e=>e.key===entryKey).sort((a,b)=>(a.route.sulfur??Infinity)-(b.route.sulfur??Infinity))[0]!.route;
   return {key:c.key,name:c.name,route};
  });
  return {entryKey,perCandidate,worstSulfur:Math.max(...perCandidate.map(x=>x.route.sulfur??Infinity)),
   sumSulfur:perCandidate.reduce((s,x)=>s+(x.route.sulfur??0),0)};
 }).sort((a,b)=>a.worstSulfur-b.worstSulfur||a.sumSulfur-b.sumSulfur);
 return {comparisons,shared:ranked[0]??null,warning:ranked.length?
  'Gemeinsamer Einstieg nach kleinstem schlechtesten Referenzaufwand (Minimax), ohne Trefferwahrscheinlichkeit.':
  'Für diese Kandidaten existiert kein gemeinsam geometrisch belegter, vollständig modellierter Eintrittspunkt.'};
}
