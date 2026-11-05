/** Distinct original procedural textures for the *names* of official building skins.
 * These aren't captured, extracted or pixel-matched Rust assets. */
import * as THREE from 'three';
import {getSkin,type BuildingSkinId} from '../core/skins.ts';
const textureCache=new Map<BuildingSkinId,THREE.CanvasTexture>();
export function skinTexture(skin:BuildingSkinId):THREE.CanvasTexture|null{
 if(skin==='default'||typeof document==='undefined')return null;
 const cached=textureCache.get(skin);if(cached)return cached;
 const info=getSkin(skin),c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d');if(!ctx)return null;
 ctx.fillStyle=info.primary;ctx.fillRect(0,0,256,256);
 const line=(x:number,y:number,x2:number,y2:number,color:string,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()};
 switch(info.finish){
  case 'bricks':case 'ashlar':case 'masonry':{
   const h=info.finish==='ashlar'?50:32,w=info.finish==='masonry'?70:64;
   for(let row=0;row<=256/h;row++){
    const y=row*h;line(0,y,256,y,info.secondary,3);
    for(let x=-(row%2)*w/2;x<=256;x+=w)line(x,y,x,y+h,info.secondary,2);
   }break;
  }
  case 'planks':{
   for(let y=0;y<=256;y+=32){line(0,y,256,y,info.secondary,4);line(0,y+10,256,y+10,'#b68960',1);line((y*7)%160,y,(y*7)%160,y+32,'#3d2b20',1)}break;
  }
  case 'corrugated':{
   for(let x=0;x<256;x+=16){ctx.fillStyle=x%32?'#a67958':'#526272';ctx.globalAlpha=.48;ctx.fillRect(x,0,7,256);ctx.globalAlpha=1;line(x,0,x,256,'#394955',2)}break;
  }
  case 'panels':{
   for(let y=0;y<256;y+=64){line(0,y,256,y,'#566871',4);for(let x=0;x<256;x+=64){line(x,y,x,y+64,'#566871',3);ctx.fillStyle='#a64c47';ctx.fillRect(x+6,y+6,7,7)}}break;
  }
  case 'concrete':{
   for(let y=0;y<256;y+=128){line(0,y,256,y,info.secondary,3);for(let x=0;x<256;x+=128){line(x,y,x,y+128,info.secondary,3);ctx.fillStyle='#5a6265';ctx.beginPath();ctx.arc(x+8,y+8,3,0,2*Math.PI);ctx.fill()}}break;
  }
  case 'adobe':{
   ctx.fillStyle='#d4aa86';ctx.globalAlpha=.18;for(let i=0;i<120;i++){const x=(i*89)%255,y=(i*197)%255;ctx.fillRect(x,y,6,4)}ctx.globalAlpha=1;break;
  }
 }
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(1,1);texture.anisotropy=4;
 textureCache.set(skin,texture);return texture;
}
