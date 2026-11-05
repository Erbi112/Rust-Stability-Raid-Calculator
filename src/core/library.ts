/** Indexed blueprints: all metadata is explicit; unknown is never equivalent to no. */
import type { BlueprintDocument, MaterialGrade } from './blueprint.ts';
import { heightPattern } from './matching.ts';
export const GROUPS=['unknown','solo','duo','trio','squad','clan'] as const;
export const BASE_ROLES=['unknown','starter','main','bunker','farm','compound','external','raid','trap','water','cave'] as const;
export const BUNKER_TYPES=['unknown','none','stability','roof','offset','pixel-gap','suicide','other'] as const;
export const BIOMES=['unknown','grassland','desert','snow','forest','coast','water','cave','cliff'] as const;
export const BOOLS=['unknown','yes','no'] as const;
export type KnownBoolean=typeof BOOLS[number];
export type GroupSize=typeof GROUPS[number];
export type BaseRole=typeof BASE_ROLES[number];
export type BunkerType=typeof BUNKER_TYPES[number];
export type Biome=typeof BIOMES[number];
export const FEATURE_KEYS=['externalTC','multiTC','honeycomb','roofAccess','wideGap','shootingFloor','compound','peeks','turrets','roofBunker','stabilityBunker','disconnectableTC','garageDoors','ladderHatches','electricity','autoturrets','innerPeakdowns','offsetFoundations'] as const;
export type FeatureKey=typeof FEATURE_KEYS[number];
export const FEATURE_LABELS:Record<FeatureKey,string>={
 externalTC:'External TCs',multiTC:'Multi-TC',honeycomb:'Honeycomb',roofAccess:'Dachzugang',wideGap:'Widegap',shootingFloor:'Shooting Floor',compound:'Compound',peeks:'Peekdowns',turrets:'Türme',roofBunker:'Roof-Bunker',stabilityBunker:'Stability-Bunker',disconnectableTC:'Trennbare TCs',garageDoors:'Garagentore',ladderHatches:'Leiterklappen',electricity:'Elektrik',autoturrets:'Auto-Turrets',innerPeakdowns:'Inner Peekdowns',offsetFoundations:'Versetzte Foundations'
};
export interface BlueprintMetadata {
 group:GroupSize;
 role:BaseRole;
 bunker:BunkerType;
 biome:Biome;
 features:Partial<Record<FeatureKey,KnownBoolean>>;
 /** Not inferred from geometry; optional source-confirmed gameplay facts. */
 upkeep24h?:number|null;
 raidMinimumRockets?:number|null;
 lootRooms?:number|null;
 recommendedPlayers?:number|null;
 creatorNote?:string;
 tags:string[];
}
export const defaultMetadata=():BlueprintMetadata=>({group:'unknown',role:'unknown',bunker:'unknown',biome:'unknown',features:{},upkeep24h:null,raidMinimumRockets:null,lootRooms:null,recommendedPlayers:null,tags:[]});
export interface LibraryEntry {key:string;doc:BlueprintDocument;storedAt:string;origin:'demo'|'local'|'imported';}
export interface LibraryFilter {
 query:string;group:GroupSize|'all';role:BaseRole|'all';bunker:BunkerType|'all';biome:Biome|'all';
 feature:FeatureKey|'all';featureValue:KnownBoolean|'all';quality:string;grade:MaterialGrade|'all';
 floorsMin:number|null;floorsMax:number|null;rocketMax:number|null;upkeepMax:number|null;
 origins: 'all'|'demo'|'local'|'imported';minTiles:number|null;maxTiles:number|null;
}
export const defaultFilter=():LibraryFilter=>({query:'',group:'all',role:'all',bunker:'all',biome:'all',feature:'all',featureValue:'all',quality:'all',grade:'all',floorsMin:null,floorsMax:null,rocketMax:null,upkeepMax:null,origins:'all',minTiles:null,maxTiles:null});
export function metadataOf(doc:BlueprintDocument):BlueprintMetadata {return {...defaultMetadata(),...doc.library,features:doc.library?.features??{},tags:doc.library?.tags??[]};}
export function blueprintsMatchFilter(entry:LibraryEntry,f:LibraryFilter):boolean{
 const d=entry.doc,m=metadataOf(d),floorCount=new Set(d.tiles.map(t=>t.floor)).size;
 const search=[d.name,d.source.creator??'',d.source.url??'',m.creatorNote??'',...m.tags,m.group,m.role,m.bunker].join(' ').toLocaleLowerCase();
 if(f.query.trim()&&!search.includes(f.query.toLocaleLowerCase().trim()))return false;
 if(f.group!=='all'&&m.group!==f.group)return false;
 if(f.role!=='all'&&m.role!==f.role)return false;
 if(f.bunker!=='all'&&m.bunker!==f.bunker)return false;
 if(f.biome!=='all'&&m.biome!==f.biome)return false;
 if(f.feature!=='all'&&f.featureValue!=='all'&&(m.features[f.feature]??'unknown')!==f.featureValue)return false;
 if(f.quality!=='all'&&d.quality!==f.quality)return false;
 if(f.grade!=='all'&&![...d.tiles,...d.edges].some(x=>x.grade===f.grade))return false;
 if(f.floorsMin!==null&&floorCount<f.floorsMin)return false;
 if(f.floorsMax!==null&&floorCount>f.floorsMax)return false;
 if(f.minTiles!==null&&d.tiles.length<f.minTiles)return false;
 if(f.maxTiles!==null&&d.tiles.length>f.maxTiles)return false;
 if(f.rocketMax!==null&&(m.raidMinimumRockets===null||m.raidMinimumRockets===undefined||m.raidMinimumRockets>f.rocketMax))return false;
 if(f.upkeepMax!==null&&(m.upkeep24h===null||m.upkeep24h===undefined||m.upkeep24h>f.upkeepMax))return false;
 if(f.origins!=='all'&&entry.origin!==f.origins)return false;
 return true;
}
export type SimilarityResult={key:string;score:number;confidence:'coarse-structure-only';reasons:string[]};
/** Deterministic structural similarity score, explicitly NOT the probability of a particular base. */
export function compareLibraryBase(observed:BlueprintDocument,candidates:readonly LibraryEntry[]):SimilarityResult[]{
 const observedPattern=heightPattern(observed);
 const floors=new Set(observed.tiles.map(x=>x.floor)).size;
 const typeCounts=(doc:BlueprintDocument)=>['square','triangle'].map(shape=>doc.tiles.filter(t=>t.shape===shape).length);
 const own=typeCounts(observed);
 return candidates.map(e=>{
  const other=typeCounts(e.doc),candidateFloors=new Set(e.doc.tiles.map(x=>x.floor)).size;
  const shapePenalty=other.reduce((n,v,i)=>n+Math.abs(v-own[i]!),0)/Math.max(1,observed.tiles.length+e.doc.tiles.length);
  const floorPenalty=Math.abs(candidateFloors-floors)/Math.max(1,candidateFloors,floors);
  const gradePenalty=e.doc.tiles.length&&observed.tiles.length ? Math.abs((e.doc.tiles.filter(t=>t.grade==='metal').length/e.doc.tiles.length)-(observed.tiles.filter(t=>t.grade==='metal').length/observed.tiles.length)) : 0;
  const h=heightPattern(e.doc);
  const sample=observedPattern.transitions.filter(a=>h.transitions.some(b=>b.pair===a.pair&&Math.abs(a.delta-b.delta)<.01)).length;
  const heightPenalty=observedPattern.transitions.length?(1-sample/observedPattern.transitions.length):0;
  const score=Math.max(0,Math.min(100,Math.round(100*(1-(.56*shapePenalty+.22*floorPenalty+.12*gradePenalty+.10*heightPenalty)))));
  return {key:e.key,score,confidence:'coarse-structure-only' as const,reasons:[`Grundformen: ${other.join(' / ')}`,`Etagen: ${candidateFloors}`,observedPattern.transitions.length?'Höhenübergänge teilweise verglichen':'Keine gemeinsamen gemessenen Höhenübergänge']};
 }).sort((a,b)=>b.score-a.score);
}
