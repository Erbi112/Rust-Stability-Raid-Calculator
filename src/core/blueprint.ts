/** Versioned GHOSTFRAME data model. Zod/JSON Schema validation follows in M1. */
import type { Point, Polygon, TileShape } from './geometry.ts';

export type MaterialGrade='twig'|'wood'|'stone'|'metal'|'armored'|'unknown';
export type ObservationKind='observed'|'inferred'|'hypothesized';
export type BuildingKind='foundation'|'floor'|'floor-frame'|'roof'|'unknown';
export type EdgeKind='wall'|'doorway'|'window'|'wall-frame'|'half-wall'|'low-wall'|'unknown';
export interface MeasuredStability {
  /** null means unknown, not zero stability. */
  percent:number|null;
  source:'player'|'screenshot'|'import'|'simulator'|'unknown';
  measuredAt:string|null;
  precisionPercent:number|null;
}
export interface BaseRecordSource {
  url:string|null;
  creator:string|null;
  license:string|null;
  permissionEvidence:string|null;
  importedAt:string|null;
}
export interface BuildingTile {
  id:string;
  shape:TileShape;
  kind:BuildingKind;
  floor:number;
  polygon:Polygon;
  grade:MaterialGrade;
  stability:MeasuredStability;
  observation:ObservationKind;
}
export interface BuildingEdge {
  id:string;
  floor:number;
  a:Point;
  b:Point;
  kind:EdgeKind;
  grade:MaterialGrade;
  stability:MeasuredStability;
  observation:ObservationKind;
}
export interface BlueprintDocument {
  schemaVersion:'1.0.0';
  id:string;
  name:string;
  game:{name:'Rust';patch:string|null;rulesetId:string|null;mode:'vanilla'|'modded'};
  units:'building-unit';
  source:BaseRecordSource;
  quality:'L0'|'L1'|'L2'|'L3'|'L4';
  tiles:BuildingTile[];
  edges:BuildingEdge[];
  notes:string[];
}
export function unmeasuredStability():MeasuredStability {
  return {percent:null,source:'unknown',measuredAt:null,precisionPercent:null};
}
export function createEmptyBlueprint(id:string,name:string):BlueprintDocument {
  return {schemaVersion:'1.0.0',id,name,
    game:{name:'Rust',patch:null,rulesetId:null,mode:'vanilla'},units:'building-unit',
    source:{url:null,creator:null,license:null,permissionEvidence:null,importedAt:null},
    quality:'L0',tiles:[],edges:[],notes:[]};
}
