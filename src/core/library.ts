/** Indexed blueprints: all metadata is explicit; unknown is never equivalent to no. */
import type { BlueprintDocument, MaterialGrade } from './blueprint.ts';
import { heightPattern } from './matching.ts';
export const GROUPS=['unknown','solo','duo','trio','squad','clan'] as const;
export const BASE_ROLES=['unknown','starter','main','bunker','farm','industrial','compound','external','raid','trap','water','cave','tower','pvp','boat','utility'] as const;
export const BUNKER_TYPES=['unknown','none','stability','roof','offset','pixel-gap','suicide','triangle','floor','multi','other'] as const;
export const BIOMES=['unknown','grassland','desert','snow','forest','coast','water','cave','cliff','river','road','mountain'] as const;
export const FOOTPRINTS=['unknown','1x1','2x1','2x2','3x3','4x4','5x5','hexagonal','circular','freeform'] as const;
export const BUILD_STAGES=['unknown','starter','expandable','finished'] as const;
export const DEFENSE_MODES=['unknown','offline','online','balanced'] as const;
export const BOOLS=['unknown','yes','no'] as const;
export const VERIFICATION_STATUSES=['unverified','source-documented','in-game-tested'] as const;
export type VerificationStatus=typeof VERIFICATION_STATUSES[number];
export interface BlueprintVerification {
 status:VerificationStatus;patch:string|null;evidenceUrl:string|null;checkedAt:string|null;notes:string;
}
export const defaultVerification=():BlueprintVerification=>({status:'unverified',patch:null,evidenceUrl:null,checkedAt:null,notes:''});
export type KnownBoolean=typeof BOOLS[number];
export type GroupSize=typeof GROUPS[number];
export type BaseRole=typeof BASE_ROLES[number];
export type BunkerType=typeof BUNKER_TYPES[number];
export type Biome=typeof BIOMES[number];
export type Footprint=typeof FOOTPRINTS[number];
export type BuildStage=typeof BUILD_STAGES[number];
export type DefenseMode=typeof DEFENSE_MODES[number];
/** Every feature is manually classified. Unknown is never equivalent to false. */
export const FEATURE_KEYS=[
 'externalTC','multiTC','disconnectableTC','tcChain','compound','externalWalls','chinaWall','gatehouse',
 'honeycomb','doubleHoneycomb','wideGap','pixelGap','floorStack','wallStack','offsetFoundations','highFoundations',
 'stabilityBunker','roofBunker','bunkerEntrance','multiBunker','suicideBunker','bunkerReset','roofAccess','roofCamping',
 'shootingFloor','innerPeakdowns','outerPeakdowns','peeks','roofPeeks','wideGapPeeks','turrets','autoturrets','samSites',
 'garageDoors','ladderHatches','airlock','doubleDoor','hiddenEntrance','dropbox','lootRooms','openCore','closedCore',
 'splitLoot','pixelLoot','underground','caveBuild','underwater','boatGarage','helipad','horseGarage',
 'electricity','industrialConveyor','autoSmelting','farmArea','planterBoxes','waterSystem','largeFurnace','refinery',
 'starterCore','expandable','modular','lowUpkeep','compact','fastBuild','offlineDefense','onlineDefense','defendableRoof'
] as const;
export type FeatureKey=typeof FEATURE_KEYS[number];
export const FEATURE_LABELS:Record<FeatureKey,string>={
 externalTC:'External TCs',multiTC:'Multi-TC',disconnectableTC:'Disconnectable TC',tcChain:'TC-Verbund',compound:'Compound',externalWalls:'Äußere Mauern',chinaWall:'China Wall',gatehouse:'Gatehouse',
 honeycomb:'Honeycomb',doubleHoneycomb:'Doppel-Honeycomb',wideGap:'Wide Gaps',pixelGap:'Pixel Gaps',floorStack:'Floorstack',wallStack:'Wallstack',offsetFoundations:'Versetzte Foundations',highFoundations:'Erhöhte Foundations',
 stabilityBunker:'Stability-Bunker',roofBunker:'Roof-Bunker',bunkerEntrance:'Bunker-Eingang',multiBunker:'Mehrere Bunker',suicideBunker:'Suicide-Bunker',bunkerReset:'Reset-Bunker',roofAccess:'Dachzugang',roofCamping:'Roof-Camping',
 shootingFloor:'Shooting Floor',innerPeakdowns:'Inner Peakdowns',outerPeakdowns:'Outer Peakdowns',peeks:'Peekdowns',roofPeeks:'Roof Peeks',wideGapPeeks:'Wide-Gap-Peeks',turrets:'Verteidigungstürme',autoturrets:'Auto-Turrets',samSites:'SAM Sites',
 garageDoors:'Garagentore',ladderHatches:'Leiterklappen',airlock:'Airlock',doubleDoor:'Doppeltür',hiddenEntrance:'Versteckter Eingang',dropbox:'Dropbox',lootRooms:'Looträume',openCore:'Open Core',closedCore:'Closed Core',
 splitLoot:'Verteiltes Loot',pixelLoot:'Pixel-Loot',underground:'Unterirdisch',caveBuild:'Höhlenbau',underwater:'Unterwasser',boatGarage:'Bootsgarage',helipad:'Helipad',horseGarage:'Pferdegarage',
 electricity:'Elektrik',industrialConveyor:'Industrial Conveyors',autoSmelting:'Auto-Schmelzen',farmArea:'Farmbereich',planterBoxes:'Pflanzkästen',waterSystem:'Wassersystem',largeFurnace:'Großer Ofen',refinery:'Raffinerie',
 starterCore:'Starter-Core',expandable:'Erweiterbar',modular:'Modular',lowUpkeep:'Geringer Unterhalt',compact:'Kompakt',fastBuild:'Schnell baubar',offlineDefense:'Offline-Verteidigung',onlineDefense:'Online-Verteidigung',defendableRoof:'Verteidigbares Dach'
};
export const FEATURE_GROUPS:ReadonlyArray<{label:string;keys:readonly FeatureKey[]}>= [
 {label:'TC / Außenverteidigung',keys:['externalTC','multiTC','disconnectableTC','tcChain','compound','externalWalls','chinaWall','gatehouse']},
 {label:'Bauweise / Höhen',keys:['honeycomb','doubleHoneycomb','wideGap','pixelGap','floorStack','wallStack','offsetFoundations','highFoundations']},
 {label:'Bunker / Zugang',keys:['stabilityBunker','roofBunker','bunkerEntrance','multiBunker','suicideBunker','bunkerReset','roofAccess','roofCamping']},
 {label:'PvP / Verteidigung',keys:['shootingFloor','innerPeakdowns','outerPeakdowns','peeks','roofPeeks','wideGapPeeks','turrets','autoturrets','samSites','offlineDefense','onlineDefense','defendableRoof']},
 {label:'Türen / Loot / Core',keys:['garageDoors','ladderHatches','airlock','doubleDoor','hiddenEntrance','dropbox','lootRooms','openCore','closedCore','splitLoot','pixelLoot']},
 {label:'Standort / Fahrzeuge',keys:['underground','caveBuild','underwater','boatGarage','helipad','horseGarage']},
 {label:'Utility / Automatisierung',keys:['electricity','industrialConveyor','autoSmelting','farmArea','planterBoxes','waterSystem','largeFurnace','refinery']},
 {label:'Ausbau / Wirtschaft',keys:['starterCore','expandable','modular','lowUpkeep','compact','fastBuild']}
];
export interface BlueprintMetadata {
 group:GroupSize; supportedGroups?:GroupSize[];
 role:BaseRole;
 bunker:BunkerType;
 biome:Biome;
 footprint?:Footprint; stage?:BuildStage; defense?:DefenseMode;
 features:Partial<Record<FeatureKey,KnownBoolean>>;
 /** Not inferred from geometry; optional source-confirmed gameplay facts. */
 upkeep24h?:number|null;
 raidMinimumRockets?:number|null;
 lootRooms?:number|null;
 recommendedPlayers?:number|null;
 externalTCCount?:number|null; bunkerCount?:number|null; wallLayers?:number|null; buildCostStone?:number|null; buildCostMetal?:number|null; buildCostHQM?:number|null;
 creatorNote?:string;
 /** Self-reported evidence; never silently inferred from L4. */
 verification?:BlueprintVerification;
 tags:string[];
}
export const defaultMetadata=():BlueprintMetadata=>({group:'unknown',role:'unknown',bunker:'unknown',biome:'unknown',footprint:'unknown',stage:'unknown',defense:'unknown',features:{},upkeep24h:null,raidMinimumRockets:null,lootRooms:null,recommendedPlayers:null,externalTCCount:null,bunkerCount:null,wallLayers:null,buildCostStone:null,buildCostMetal:null,buildCostHQM:null,verification:defaultVerification(),tags:[]});
export interface LibraryEntry {key:string;doc:BlueprintDocument;storedAt:string;origin:'demo'|'local'|'imported';}
/** Only the existence of a complete user-provided proof record; not independent verification. */
export function hasInGameEvidence(doc:BlueprintDocument):boolean {
 const record=doc.library?.verification;
 return Boolean(record?.status==='in-game-tested'&&record.patch?.trim()&&record.checkedAt&&
   /^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)&&record.evidenceUrl&&/^https?:\/\//i.test(record.evidenceUrl));
}
export interface LibraryFilter {
 query:string;group:GroupSize|'all';groups:readonly GroupSize[];role:BaseRole|'all';bunker:BunkerType|'all';biome:Biome|'all';footprint:Footprint|'all';stage:BuildStage|'all';defense:DefenseMode|'all';
 feature:FeatureKey|'all';featureValue:KnownBoolean|'all';featureConstraints:Partial<Record<FeatureKey,KnownBoolean>>;quality:string;verification:VerificationStatus|'all';grade:MaterialGrade|'all';
 floorsMin:number|null;floorsMax:number|null;rocketMax:number|null;upkeepMax:number|null;
 origins: 'all'|'demo'|'local'|'imported';minTiles:number|null;maxTiles:number|null;externalTCMin:number|null;bunkerCountMin:number|null;lootRoomsMin:number|null;buildCostStoneMax:number|null;
}
export const defaultFilter=():LibraryFilter=>({query:'',group:'all',groups:[],role:'all',bunker:'all',biome:'all',footprint:'all',stage:'all',defense:'all',feature:'all',featureValue:'all',featureConstraints:{},quality:'all',verification:'all',grade:'all',floorsMin:null,floorsMax:null,rocketMax:null,upkeepMax:null,origins:'all',minTiles:null,maxTiles:null,externalTCMin:null,bunkerCountMin:null,lootRoomsMin:null,buildCostStoneMax:null});
export function metadataOf(doc:BlueprintDocument):BlueprintMetadata {return {...defaultMetadata(),...doc.library,features:doc.library?.features??{},tags:doc.library?.tags??[]};}
export function blueprintsMatchFilter(entry:LibraryEntry,f:LibraryFilter):boolean{
 const d=entry.doc,m=metadataOf(d),floorCount=new Set(d.tiles.map(t=>t.floor)).size;
 const supportedGroups=new Set([m.group,...(m.supportedGroups??[])]);
 const search=[d.name,d.source.creator??'',d.source.url??'',m.creatorNote??'',...m.tags,m.group,m.role,m.bunker].join(' ').toLocaleLowerCase();
 if(f.query.trim()&&!search.includes(f.query.toLocaleLowerCase().trim()))return false;
 if(f.group!=='all'&&!supportedGroups.has(f.group))return false;
 if(f.groups.length&&!f.groups.some(g=>supportedGroups.has(g)))return false;
 if(f.role!=='all'&&m.role!==f.role)return false;
 if(f.bunker!=='all'&&m.bunker!==f.bunker)return false;
 if(f.biome!=='all'&&m.biome!==f.biome)return false;
 if(f.footprint!=='all'&&(m.footprint??'unknown')!==f.footprint)return false;
 if(f.stage!=='all'&&(m.stage??'unknown')!==f.stage)return false;
 if(f.defense!=='all'&&(m.defense??'unknown')!==f.defense)return false;
 for(const [key,value] of Object.entries(f.featureConstraints) as [FeatureKey,KnownBoolean][])if((m.features[key]??'unknown')!==value)return false;
 if(f.feature!=='all'&&f.featureValue!=='all'&&(m.features[f.feature]??'unknown')!==f.featureValue)return false;
 if(f.quality!=='all'&&d.quality!==f.quality)return false;
 if(f.verification!=='all') {
   if(f.verification==='in-game-tested'?!hasInGameEvidence(d):(d.library?.verification?.status??'unverified')!==f.verification)return false;
 }
 if(f.grade!=='all'&&![...d.tiles,...d.edges].some(x=>x.grade===f.grade))return false;
 if(f.floorsMin!==null&&floorCount<f.floorsMin)return false;
 if(f.floorsMax!==null&&floorCount>f.floorsMax)return false;
 if(f.minTiles!==null&&d.tiles.length<f.minTiles)return false;
 if(f.maxTiles!==null&&d.tiles.length>f.maxTiles)return false;
 if(f.rocketMax!==null&&(m.raidMinimumRockets===null||m.raidMinimumRockets===undefined||m.raidMinimumRockets>f.rocketMax))return false;
 if(f.upkeepMax!==null&&(m.upkeep24h===null||m.upkeep24h===undefined||m.upkeep24h>f.upkeepMax))return false;
 if(f.externalTCMin!==null&&(m.externalTCCount===null||m.externalTCCount===undefined||m.externalTCCount<f.externalTCMin))return false;
 if(f.bunkerCountMin!==null&&(m.bunkerCount===null||m.bunkerCount===undefined||m.bunkerCount<f.bunkerCountMin))return false;
 if(f.lootRoomsMin!==null&&(m.lootRooms===null||m.lootRooms===undefined||m.lootRooms<f.lootRoomsMin))return false;
 if(f.buildCostStoneMax!==null&&(m.buildCostStone===null||m.buildCostStone===undefined||m.buildCostStone>f.buildCostStoneMax))return false;
 if(f.origins!=='all'&&entry.origin!==f.origins)return false;
 return true;
}
export type SimilarityResult={key:string;score:number;confidence:'coarse-structure-only';reasons:string[]};
/** Accept historical `transitions` and `adjacency` height-pattern field names.
 * This makes stored blueprints and older released comparison modules compatible. */
type HeightEdge={pair:string;delta:number};
function measuredHeightEdges(pattern:unknown):readonly HeightEdge[]{
 if(!pattern||typeof pattern!=='object')return [];
 const p=pattern as {transitions?:readonly HeightEdge[];adjacency?:readonly HeightEdge[]};
 return p.transitions??p.adjacency??[];
}

/** Deterministic structural similarity score, explicitly NOT the probability of a particular base. */
export function compareLibraryBase(observed:BlueprintDocument,candidates:readonly LibraryEntry[]):SimilarityResult[]{
 const observedPattern=measuredHeightEdges(heightPattern(observed));
 const floors=new Set(observed.tiles.map(x=>x.floor)).size;
 const typeCounts=(doc:BlueprintDocument)=>['square','triangle'].map(shape=>doc.tiles.filter(t=>t.shape===shape).length);
 const own=typeCounts(observed);
 return candidates.map(e=>{
  const other=typeCounts(e.doc),candidateFloors=new Set(e.doc.tiles.map(x=>x.floor)).size;
  const shapePenalty=other.reduce((n,v,i)=>n+Math.abs(v-own[i]!),0)/Math.max(1,observed.tiles.length+e.doc.tiles.length);
  const floorPenalty=Math.abs(candidateFloors-floors)/Math.max(1,candidateFloors,floors);
  const gradePenalty=e.doc.tiles.length&&observed.tiles.length ? Math.abs((e.doc.tiles.filter(t=>t.grade==='metal').length/e.doc.tiles.length)-(observed.tiles.filter(t=>t.grade==='metal').length/observed.tiles.length)) : 0;
  const h=measuredHeightEdges(heightPattern(e.doc));
  const normalized=(s:string)=>s.replace(/[-/]/g,':');
  const sample=observedPattern.filter(a=>h.some(b=>normalized(b.pair)===normalized(a.pair)&&Math.abs(a.delta-b.delta)<.01)).length;
  const heightPenalty=observedPattern.length?(1-sample/observedPattern.length):0;
  const score=Math.max(0,Math.min(100,Math.round(100*(1-(.56*shapePenalty+.22*floorPenalty+.12*gradePenalty+.10*heightPenalty)))));
  return {key:e.key,score,confidence:'coarse-structure-only' as const,reasons:[`Grundformen: ${other.join(' / ')}`,`Etagen: ${candidateFloors}`,observedPattern.length?'Höhenübergänge teilweise verglichen':'Keine gemeinsamen gemessenen Höhenübergänge']};
 }).sort((a,b)=>b.score-a.score);
}
