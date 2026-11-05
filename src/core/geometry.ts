/** GHOSTFRAME geometric kernel — independent from React and game-rule assumptions. */
export type Point = Readonly<{ x: number; y: number }>;
export type Polygon = readonly Point[];
export type TileShape = 'square' | 'triangle';
export type Tile = Readonly<{ id: string; shape: TileShape; level: number; vertices: Polygon }>;
export type PlacementResult =
  | Readonly<{ ok: true; tile: Tile; joinedTo: Readonly<{tileId:string;edgeIndex:number}> }>
  | Readonly<{ ok: false; reason: 'source-missing' | 'edge-occupied' | 'overlap' | 'invalid-edge' }>;

const EPS=1e-8;
const p=(x:number,y:number):Point=>({x,y});
const add=(a:Point,b:Point):Point=>p(a.x+b.x,a.y+b.y);
const sub=(a:Point,b:Point):Point=>p(a.x-b.x,a.y-b.y);
const mul=(a:Point,t:number):Point=>p(a.x*t,a.y*t);
const dot=(a:Point,b:Point):number=>a.x*b.x+a.y*b.y;
const len=(a:Point):number=>Math.hypot(a.x,a.y);

export function polygonSignedArea(poly:Polygon):number {
  let area=0;
  for(let i=0;i<poly.length;i++){
    const a=poly[i]!,b=poly[(i+1)%poly.length]!;
    area+=a.x*b.y-b.x*a.y;
  }
  return area/2;
}
export function polygonArea(poly:Polygon):number{return Math.abs(polygonSignedArea(poly));}

export function edgeAt(poly:Polygon,index:number):readonly[Point,Point] {
  if(!Number.isInteger(index)||index<0||index>=poly.length)throw new RangeError('Invalid polygon edge');
  return [poly[index]!,poly[(index+1)%poly.length]!];
}

export function initialPolygon(shape:TileShape,center:Point=p(0,0),size=1):Polygon {
  if(!(size>0)||!Number.isFinite(size))throw new RangeError('Size must be positive and finite');
  if(shape==='square'){
    const h=size/2;
    return [p(center.x-h,center.y-h),p(center.x+h,center.y-h),p(center.x+h,center.y+h),p(center.x-h,center.y+h)];
  }
  if(shape==='triangle'){
    const h=size*Math.sqrt(3)/2;
    return [p(center.x,center.y-2*h/3),p(center.x+size/2,center.y+h/3),p(center.x-size/2,center.y+h/3)];
  }
  throw new RangeError('Unknown shape');
}

/** Attach along the whole side. y points down; polygon vertices ordered clockwise on screen. */
export function attachPolygon(source:Polygon,edgeIndex:number,shape:TileShape):Polygon {
  if(polygonSignedArea(source)<=EPS)throw new RangeError('Source polygon must be clockwise in screen coordinates');
  const [a,b]=edgeAt(source,edgeIndex);
  const side=sub(b,a),size=len(side);
  if(!(size>EPS))throw new RangeError('Zero-length edge');
  const outward=p(side.y/size,-side.x/size);
  if(shape==='triangle')return [b,a,add(mul(add(a,b),0.5),mul(outward,size*Math.sqrt(3)/2))];
  if(shape==='square')return [b,a,add(a,mul(outward,size)),add(b,mul(outward,size))];
  throw new RangeError('Unknown shape');
}
export function samePoint(a:Point,b:Point,eps=EPS):boolean{return len(sub(a,b))<=eps;}
export function sameEdge(a:Point,b:Point,c:Point,d:Point):boolean{
  return (samePoint(a,c)&&samePoint(b,d))||(samePoint(a,d)&&samePoint(b,c));
}
export function polygonSharesEdge(a:Polygon,b:Polygon):boolean{
  return a.some((_,i)=>{
    const [u,v]=edgeAt(a,i);
    return b.some((__,j)=>{const [w,x]=edgeAt(b,j);return sameEdge(u,v,w,x);});
  });
}
/** Separating-axis theorem with strict-area overlap; touching is legal. */
export function overlapsArea(a:Polygon,b:Polygon):boolean{
  if(a.length<3||b.length<3)return false;
  for(const poly of [a,b]){
    for(let i=0;i<poly.length;i++){
      const [u,v]=edgeAt(poly,i),side=sub(v,u),axis=p(side.y,-side.x);
      const av=a.map(x=>dot(x,axis)),bv=b.map(x=>dot(x,axis));
      const overlap=Math.min(Math.max(...av),Math.max(...bv))-Math.max(Math.min(...av),Math.min(...bv));
      if(overlap<=EPS)return false;
    }
  }
  return true;
}
export function edgeIsOccupied(tiles:readonly Tile[],source:Tile,index:number):boolean{
  const [a,b]=edgeAt(source.vertices,index);
  return tiles.some(t=>t.id!==source.id&&t.level===source.level&&
    t.vertices.some((_,j)=>{const [c,d]=edgeAt(t.vertices,j);return sameEdge(a,b,c,d);}));
}
export function proposeAttachedTile(
  tiles:readonly Tile[],sourceId:string,edgeIndex:number,shape:TileShape,newId:string
):PlacementResult{
  const source=tiles.find(t=>t.id===sourceId);
  if(!source)return {ok:false,reason:'source-missing'};
  if(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=source.vertices.length)
    return {ok:false,reason:'invalid-edge'};
  if(edgeIsOccupied(tiles,source,edgeIndex))return {ok:false,reason:'edge-occupied'};
  const vertices=attachPolygon(source.vertices,edgeIndex,shape);
  if(tiles.some(t=>t.level===source.level&&overlapsArea(t.vertices,vertices)))
    return {ok:false,reason:'overlap'};
  return {ok:true,tile:{id:newId,shape,level:source.level,vertices},joinedTo:{tileId:sourceId,edgeIndex}};
}
export function availableSlots(tiles:readonly Tile[],shape:TileShape):readonly PlacementResult[]{
  const results:PlacementResult[]=[];
  for(const tile of tiles)for(let i=0;i<tile.vertices.length;i++){
    const candidate=proposeAttachedTile(tiles,tile.id,i,shape,tile.id+'-preview-'+i);
    if(candidate.ok)results.push(candidate);
  }
  return results;
}
