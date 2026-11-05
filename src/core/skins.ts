/** Official Rust building skin names and grade compatibility. Graphics are original procedural approximations,
 * NOT Facepunch textures. Never claim an approximate preview is an exact game asset. */
import type { MaterialGrade } from './blueprint.ts';
export const BUILDING_SKIN_IDS=['default','legacy-wood','adobe','brick','brutalist','jungle','crypt','shipping-container','space-station'] as const;
export type BuildingSkinId=typeof BUILDING_SKIN_IDS[number];
export interface SkinSpec { id:BuildingSkinId; label:string; grade:MaterialGrade|'all'; finish:string; primary:string; secondary:string; description:string; source:'official-name'; preview:'procedural'; }
export const BUILDING_SKINS:readonly SkinSpec[]=[
 {id:'default',label:'Standard (ohne DLC)',grade:'all',finish:'default',primary:'#8e8172',secondary:'#c0b29d',description:'Normale Materialoberfläche',source:'official-name',preview:'procedural'},
 {id:'legacy-wood',label:'Legacy Wood',grade:'wood',finish:'planks',primary:'#9c6b42',secondary:'#61422f',description:'Gealterte Holzplanken',source:'official-name',preview:'procedural'},
 {id:'adobe',label:'Adobe',grade:'stone',finish:'adobe',primary:'#bc8c6e',secondary:'#dfb99b',description:'Lehmverputz',source:'official-name',preview:'procedural'},
 {id:'brick',label:'Brick',grade:'stone',finish:'bricks',primary:'#9e5543',secondary:'#cf8a65',description:'Backsteinmauerwerk',source:'official-name',preview:'procedural'},
 {id:'brutalist',label:'Brutalist',grade:'stone',finish:'concrete',primary:'#848b8b',secondary:'#4c555a',description:'Sichtbeton',source:'official-name',preview:'procedural'},
 {id:'jungle',label:'Jungle',grade:'stone',finish:'masonry',primary:'#566b51',secondary:'#89906d',description:'Moosiges Steinrelief',source:'official-name',preview:'procedural'},
 {id:'crypt',label:'Crypt',grade:'stone',finish:'ashlar',primary:'#5b5c60',secondary:'#777780',description:'Dunkles Steinmauerwerk',source:'official-name',preview:'procedural'},
 {id:'shipping-container',label:'Shipping Container',grade:'metal',finish:'corrugated',primary:'#8b624b',secondary:'#384a55',description:'Gewellter Stahl',source:'official-name',preview:'procedural'},
 {id:'space-station',label:'Space Station',grade:'armored',finish:'panels',primary:'#c5ced0',secondary:'#a84b40',description:'Helle Panzerplatten',source:'official-name',preview:'procedural'},
];
export function isBuildingSkinId(value:unknown):value is BuildingSkinId{
 return typeof value==='string'&&BUILDING_SKIN_IDS.some(s=>s===value);
}
export function skinCompatible(id:BuildingSkinId,grade:MaterialGrade):boolean{
 const skin=BUILDING_SKINS.find(s=>s.id===id);
 return Boolean(skin&&(skin.grade==='all'||skin.grade===grade));
}
export function skinsForGrade(grade:MaterialGrade):readonly SkinSpec[]{return BUILDING_SKINS.filter(s=>s.grade==='all'||s.grade===grade)}
export function getSkin(id:BuildingSkinId|undefined):SkinSpec{return BUILDING_SKINS.find(s=>s.id===id)??BUILDING_SKINS[0]!}
