import test from 'node:test';
import assert from 'node:assert/strict';
import {fitCameraToTiles,planToScreen,screenToPlan} from '../src/core/viewport.ts';
import {planToWorld,floorGeometryToWorld} from '../src/core/projection.ts';
const p=(x:number,y:number)=>({x,y});
const sq=(x:number,y:number)=>[p(x-50,y-50),p(x+50,y-50),p(x+50,y+50),p(x-50,y+50)];
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,'Not equal: '+a+' vs '+b);
test('2D off-origin floor is centered',()=>{const c=fitCameraToTiles([{polygon:sq(950,810)}],1200,700);
 const pt=planToScreen(p(950,810),c);close(pt.x,600);close(pt.y,350);});
test('2D fits both split and full screen',()=>{for(const w of [480,840,1480]){
 const c=fitCameraToTiles([{polygon:sq(-800,600)}],w,780);
 const pt=planToScreen(p(-800,600),c);close(pt.x,w/2);close(pt.y,390);
}});
test('2D bounds includes distant tiles',()=>{const c=fitCameraToTiles([{polygon:sq(-1200,0)},{polygon:sq(400,0)}],900,620);
 close(planToScreen(p(-400,0),c).x,450);});
test('2D transformations reversible',()=>{const c={x:400,y:-70,scale:1.32};
 const src=p(100,300),back=screenToPlan(planToScreen(src,c),c);close(back.x,src.x);close(back.y,src.y);
});
test('3D wall endpoints and foundation top coordinates identical',()=>{for(const pt of [p(-100,-200),p(0,100),p(120,550)]){
 assert.deepEqual(floorGeometryToWorld(pt),planToWorld(pt));
}});
test('3D foundation height moves vertically only',()=>{const a=planToWorld(p(100,200),0),b=planToWorld(p(100,200),.5);
 close(a.x,b.x);close(a.z,b.z);close(b.y-a.y,1.5);});
