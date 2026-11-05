import type { CatalogPiece } from '../core/catalog.ts';
/** Hand-drawn isometric construction icons, independent from game assets. */
export function StructureIcon({piece}:{piece:CatalogPiece}){
 const id=piece.id;
 const triangle=id.includes('triangle');
 const framed=id.includes('frame')&&!id.includes('door')&&!id.includes('wall');
 const opening=piece.category==='edge'||piece.category==='insert';
 const door=id.includes('door')||id==='doorway';
 const windowed=id.includes('window');
 const stair=id.includes('stairs')||id.includes('steps');
 const roof=id.startsWith('roof');
 const ramp=id==='ramp';
 const metallic=id.includes('metal')||id.includes('armored')||id.includes('garage')||id.includes('hatch');
 const top=metallic?'#a3bbc2':'#c8c1b3';
 const front=metallic?'#546a74':'#86857d';
 const side=metallic?'#3b4c58':'#4a5351';
 const g='g-'+id;
 return <svg viewBox="0 0 84 72" className="piece-glyph" role="img" aria-label={piece.label} fill="none">
 <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e5decf"/><stop offset=".43" stopColor={top}/><stop offset="1" stopColor={front}/></linearGradient></defs>
 <ellipse cx="42" cy="65" rx="34" ry="4" fill="#050c0e" opacity=".5"/>
 {id.includes('hatch')?<g>
  <path d={triangle?'M42 8 76 55 9 55Z':'M9 21 47 8 77 24 38 39Z'} fill="#607783" stroke="#e7d2b0" strokeWidth="3"/>
  <path d={triangle?'M42 18 63 50 22 50Z':'M21 23 46 16 65 25 38 33Z'} fill="#182329" stroke="#d79b57" strokeWidth="2.2"/>
  <path d="M20 55 34 60 66 43M26 50 41 56M34 47 49 53M42 44 57 50" stroke="#c6cfc8" strokeWidth="2.7"/>
  <circle cx="42" cy="28" r="3" fill="#efba75"/>
 </g>:opening?<g>
  <path d="M13 14 66 9 72 17V60L18 66 13 57Z" fill={side} stroke="#e1cdb0" strokeWidth="1.7"/>
  <path d="M17 17 65 12V56L17 61Z" fill={'url(#'+g+')'} stroke="#dacbb3" strokeWidth="1.7"/>
  {door||framed?<><path d="M28 28 55 25V58L28 61Z" fill={id==='doorway'||id==='wall-frame'?'#162027':'#856347'} stroke="#f3d6af" strokeWidth="2.6"/><path d="M33 35 51 33M33 42 51 40M33 49 51 47" stroke="#343d3e" strokeOpacity=".55" strokeWidth="1.2"/>{id.includes('double')?<path d="M42 27V58" stroke="#293339" strokeWidth="2"/>:null}</>:null}
  {id==='garage-door'&&<><path d="M28 28 55 25V58L28 61Z" fill="#6d848e" stroke="#ead0ac" strokeWidth="1.7"/>{[31,37,43,49,55].map(y=><path key={y} d={`M30 ${y} 53 ${y-3}`} stroke="#2b4048" strokeWidth="2"/>)}</>}
  {windowed?<><path d="M25 28 57 25V44L25 48Z" fill="#34515b" stroke="#e9e1cb" strokeWidth="2.5"/><path d="M41 26V47M25 37 57 34" stroke="#aac4c7" strokeWidth="1.5"/></>:null}
  {!door&&!windowed&&!framed?<><path d="M19 28 64 23M19 42 64 37M19 54 64 49" stroke="#4e5756" strokeWidth="1.2"/>{id.includes('half')||id.includes('low')?<path d={id.includes('half')?'M16 14 66 9V31L16 36Z':'M16 14 66 9V42L16 47Z'} fill="#152026" opacity=".86"/>:null}</>:null}
  <g fill="#f0d4ad"><circle cx="21" cy="22" r="1.5"/><circle cx="60" cy="17" r="1.5"/><circle cx="21" cy="56" r="1.5"/><circle cx="60" cy="53" r="1.5"/></g>
 </g>:stair?<g><path d="M8 58V46H21V36H33V26H47V17H63V59Z" fill={'url(#'+g+')'} stroke="#e4d5bf" strokeWidth="2"/><path d="M8 46 21 39H33V27L47 20V17L63 13 74 24V62L63 59" fill={side} stroke="#b9a38b" strokeWidth="1.4"/><path d="M21 46V60M33 36V60M47 26V60M63 17V60" stroke="#4b5050" strokeWidth="1.3"/></g>:ramp?<g><path d="M8 54 66 13V58L8 64Z" fill={'url(#'+g+')'} stroke="#efdec6" strokeWidth="2"/><path d="M8 54 66 13 76 23 18 64Z" fill={front} stroke="#cdb59c" strokeWidth="1.4"/></g>:roof?<g><path d={triangle?'M42 6 76 57H8Z':'M8 53 40 8 76 53 64 61 42 27 20 61Z'} fill={'url(#'+g+')'} stroke="#e8d8bd" strokeWidth="2.5"/><path d="M42 14 63 53M42 14 22 53" stroke="#555955" strokeWidth="1.4"/></g>:triangle?<g><path d="M42 7 76 54H8Z" fill={'url(#'+g+')'} stroke="#ead9c4" strokeWidth="2.5"/><path d="M8 54H76L71 62H13Z" fill={side} stroke="#baa78e" strokeWidth="1.6"/>{framed?<path d="M42 23 61 49H23Z" fill="#17242b" stroke="#d9bb9b" strokeWidth="2"/>:<path d="M42 8V53M22 33H62" stroke="#77756b" strokeWidth="1.3"/>}</g>:<g>
 <path d="M9 22 48 9 76 25 36 39Z" fill={'url(#'+g+')'} stroke="#f1ddc3" strokeWidth="2.3"/><path d="M9 22 36 39V64L9 48Z" fill={side} stroke="#b5a58c" strokeWidth="1.4"/><path d="M36 39 76 25V50L36 64Z" fill={front} stroke="#d8c5af" strokeWidth="1.4"/>
 {framed?<path d="M20 23 49 16 64 25 35 33Z" fill="#172329" stroke="#dac5a9" strokeWidth="2.3"/>:<path d="M20 18 50 33M35 13 65 27M11 32 36 48 75 36" stroke="#555653" strokeOpacity=".7" strokeWidth="1.3"/>}
 </g>}
 <g fill="#f2c092"><circle cx="11" cy="23" r="1"/><circle cx="35" cy="62" r="1"/><circle cx="72" cy="26" r="1"/></g>
 </svg>;
}
