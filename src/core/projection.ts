import type {Point} from './geometry.ts';
export const PLAN_UNIT_METERS=.03,WALL_HEIGHT_METERS=3;
export type WorldPoint={x:number;y:number;z:number};
export function planToWorld(p:Point,elevation=0):WorldPoint{
 return {x:p.x*PLAN_UNIT_METERS,y:elevation*WALL_HEIGHT_METERS,z:p.y*PLAN_UNIT_METERS};
}
export function floorGeometryToWorld(p:Point,elevation=0):WorldPoint{
 return planToWorld(p,elevation);
}
