import type { CatalogPiece } from '../core/catalog.ts';
/** Original UI vector glyphs: neither game icons nor copied Steam assets. */
export function StructureIcon({piece}:{piece:CatalogPiece}){
 const frame=piece.symbol==='frame'||piece.symbol==='triangle-frame';
 const isTri=piece.symbol==='triangle'||piece.symbol==='triangle-frame';
 const isDoor=piece.symbol==='door'||piece.symbol==='garage'||piece.symbol==='double';
 const isWindow=piece.symbol==='window';
 const isWall=['wall','door','window','frame','half','low','garage','double'].includes(piece.symbol);
 const isSteps=piece.symbol==='steps'||piece.symbol==='spiral';
 return <svg className="piece-glyph" viewBox="0 0 76 60" fill="none" role="img" aria-label={piece.label}>
   <defs><linearGradient id={`f-${piece.id}`} x1="0" x2="0.9" y1="0" y2="1"><stop stopColor="#b5b8b3"/><stop offset="1" stopColor="#69675f"/></linearGradient></defs>
   {isTri?<><path d="M38 8 65 48 11 48Z" fill={`url(#f-${piece.id})`} stroke="#dcd9ce" strokeWidth="2.4"/>
     <path d="M38 19 54 44H22Z" fill={frame?'#1f2727':'#8c908a'} stroke="#404745" strokeWidth="1.7"/></>
    :isWall?<><path d="M12 13 62 7 62 49 12 54Z" fill={`url(#f-${piece.id})`} stroke="#d4cabd" strokeWidth="2"/>
     {isDoor?<><path d="M28 26 47 24 47 52 28 53Z" fill="#28312d" stroke="#d9b98e" strokeWidth="2"/>
       {piece.symbol!=='door'&&<path d="M30 30 45 29 45 47 30 48Z" fill="#926b52" stroke="#d79a66" strokeWidth="1"/>}</>
     :isWindow?<><path d="M23 24 52 21 52 40 23 43Z" fill="#384e51" stroke="#d0cfbf" strokeWidth="2"/>
       <path d="M37 22 37 42" stroke="#c9d6d1" strokeWidth="2"/></>
     :frame?<path d="M22 24 52 21 52 45 22 48Z" fill="#1c2625" stroke="#d9c5a6" strokeWidth="2.8"/>
     :<path d="M15 23 59 18M15 35 59 30M15 47 59 42" stroke="#4e514c" strokeWidth="1.5"/>}</>
    :isSteps?<><path d="M11 51V39H25V30H39V21H53V12H66V51Z" fill={`url(#f-${piece.id})`} stroke="#d3cabb" strokeWidth="2"/>
      <path d="M25 30V51M39 21V51M53 12V51" stroke="#555f59" strokeWidth="1"/></>
    :piece.symbol==='roof'?<><path d="M7 44 39 8 69 44 61 50 39 25 15 50Z" fill="#989085" stroke="#e1d5c4" strokeWidth="2"/></>
    :piece.symbol==='ramp'?<><path d="M10 49 61 14 69 49Z" fill={`url(#f-${piece.id})`} stroke="#dfd6c6" strokeWidth="2"/></>
    :<><path d="M12 17 48 9 65 23 29 31Z" fill={`url(#f-${piece.id})`} stroke="#ded9cc" strokeWidth="2"/>
      <path d="M12 17V42L29 55V31ZM29 31 65 23V46L29 55Z" fill="#646862" stroke="#cdc7b9" strokeWidth="1.8"/>
      <path d="M22 21 58 17M22 34 58 29" stroke="#414b47" strokeWidth="1"/></>}
 </svg>;
}
