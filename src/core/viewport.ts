import type { Polygon, Point } from './geometry.ts';
export type Camera={x:number;y:number;scale:number};
export function fitCameraToTiles(tiles:readonly {polygon:Polygon}[],width:number,height:number,margin=96):Camera{
 const pts=tiles.flatMap(t=>[...t.polygon]);if(!pts.length)return {x:width/2,y:height/2,scale:1};
 const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
 const minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
 const scale=Math.max(.22,Math.min(1.7,(width-margin*2)/Math.max(50,maxX-minX),
 (height-margin*2)/Math.max(50,maxY-minY)));
 return {x:width/2-(minX+maxX)/2*scale,y:height/2-(minY+maxY)/2*scale,scale};
}
export function planToScreen(p:Point,c:Camera):Point{return{x:c.x+p.x*c.scale,y:c.y+p.y*c.scale};}
export function screenToPlan(p:Point,c:Camera):Point{return{x:(p.x-c.x)/c.scale,y:(p.y-c.y)/c.scale};}
