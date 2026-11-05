/** Draft v1 domain model. Schema verification (Zod) begins in M1. */
import type { Point, Polygon, TileShape } from './geometry.ts';
import type { BuildingSkinId } from './skins.ts';
import type { BlueprintMetadata } from './library.ts';

export type MaterialGrade = 'twig' | 'wood' | 'stone' | 'metal' | 'armored' | 'unknown';
export type ObservationKind = 'observed' | 'inferred' | 'hypothesized';
export type BuildingKind = 'foundation' | 'floor' | 'floor-frame' | 'roof' | 'stairs-u' | 'stairs-l' | 'stairs-spiral' | 'stairs-spiral-triangle' | 'ramp' | 'foundation-steps' | 'unknown';
export type EdgeKind = 'wall' | 'doorway' | 'window' | 'wall-frame' | 'half-wall' | 'low-wall' | 'unknown';
/** Left / right are relative to edge points A→B. Up / down describe horizontal surfaces. */
export type SoftSide = 'left' | 'right' | 'up' | 'down' | 'unknown';
export type DoorInsert = 'none' | 'wood-door' | 'sheet-metal-door' | 'armored-door' | 'garage-door' | 'double-sheet-metal-door' | 'double-armored-door';
/** Insert placed into a floor frame, separate from the supporting structure. */
export type FloorInsert = 'none' | 'ladder-hatch' | 'triangle-ladder-hatch';
export const FLOOR_INSERTS: FloorInsert[] = ['none','ladder-hatch','triangle-ladder-hatch'];
export type HealthState = { current: number | null; max: number | null };

export interface MeasuredStability {
  /** null = not measured, never interpreted as 0 */
  percent: number | null;
  source: 'player' | 'screenshot' | 'import' | 'simulator' | 'unknown';
  measuredAt: string | null;
  precisionPercent: number | null;
}

export interface BaseRecordSource {
  url: string | null;
  creator: string | null;
  license: string | null;
  permissionEvidence: string | null;
  importedAt: string | null;
}

export interface BuildingTile {
  id: string;
  shape: TileShape;
  kind: BuildingKind;
  floor: number;
  polygon: Polygon;
  grade: MaterialGrade;
  stability: MeasuredStability;
  observation: ObservationKind;
  skinId?: BuildingSkinId;
  /** Optional so documents saved by v0.3 remain valid and importable. */
  health?: HealthState;
  softSide?: SoftSide;
  rotation?: number;
  /** Hatch insert; only permitted in a matching square/triangle floor frame. */
  floorInsert?: FloorInsert;
  /** Top surface elevation in wall-height units (1 = one full Rust wall height).
   *  Independent of plan floor. Legacy v0.3 records default to 0 (or their floor).
   *  Source plans keep exact elevation even if physical build legality is uncertain. */
  elevation?: number;
}

export interface BuildingEdge {
  id: string;
  floor: number;
  a: Point;
  b: Point;
  kind: EdgeKind;
  grade: MaterialGrade;
  stability: MeasuredStability;
  observation: ObservationKind;
  health?: HealthState;
  softSide?: SoftSide;
  insert?: DoorInsert;
  skinId?: BuildingSkinId;
}

/** Structural state for bunker templates: do not conflate sealed and open geometry.
 * Phase transitions and collapse dynamics require a separately verified Rust ruleset. */
export interface BlueprintState {
  id: string;
  label: string;
  purpose: 'sealed' | 'open' | 'construction' | 'other';
  tileIds: string[];
  edgeIds: string[];
  notes: string;
}
export interface BunkerMetadata {
  mechanism: 'stability' | 'roof' | 'offset' | 'other' | 'unknown';
  verifiedInGamePatch: string | null;
  evidenceUrl: string | null;
  note: string;
}
export interface BlueprintDocument {
  schemaVersion: '1.0.0';
  id: string;
  name: string;
  game: { name: 'Rust'; patch: string | null; rulesetId: string | null; mode: 'vanilla' | 'modded' };
  units: 'building-unit';
  source: BaseRecordSource;
  quality: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  tiles: BuildingTile[];
  edges: BuildingEdge[];
  notes: string[];
  states?: BlueprintState[];
  bunker?: BunkerMetadata;
  library?: BlueprintMetadata;
}

export function unmeasuredStability(): MeasuredStability {
  return { percent: null, source: 'unknown', measuredAt: null, precisionPercent: null };
}

export function createEmptyBlueprint(id: string, name: string): BlueprintDocument {
  return { schemaVersion: '1.0.0', id, name,
    game: { name: 'Rust', patch: null, rulesetId: null, mode: 'vanilla' },
    units: 'building-unit', source: { url: null, creator: null, license: null,
      permissionEvidence: null, importedAt: null },
    quality: 'L0', tiles: [], edges: [], notes: [] };
}

/** Reference HP by grade. Does not imply patch-verified durability for every piece. */
export const REFERENCE_MAX_HP: Record<MaterialGrade,number|null> = {
  twig:10, wood:250, stone:500, metal:1000, armored:2000, unknown:null
};
export const SOFT_SIDES: SoftSide[]=['left','right','up','down','unknown'];
export const DOOR_INSERTS: DoorInsert[]=['none','wood-door','sheet-metal-door','armored-door','garage-door','double-sheet-metal-door','double-armored-door'];
export function makeHealth(grade:MaterialGrade):HealthState {
  const max=REFERENCE_MAX_HP[grade];return {current:max,max};
}
