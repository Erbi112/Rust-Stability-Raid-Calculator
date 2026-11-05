import { GROUPS, BASE_ROLES, BUNKER_TYPES, BIOMES, BOOLS, FEATURE_KEYS } from './library.ts';
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const numeric=(x:unknown)=>x===undefined||x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0);
export function isBlueprintMetadata(x:unknown):boolean{
 if(!obj(x)||!GROUPS.includes(x.group as typeof GROUPS[number])||!BASE_ROLES.includes(x.role as typeof BASE_ROLES[number])||!BUNKER_TYPES.includes(x.bunker as typeof BUNKER_TYPES[number])||!BIOMES.includes(x.biome as typeof BIOMES[number]))return false;
 if(!obj(x.features)||Object.entries(x.features).some(([k,v])=>!FEATURE_KEYS.includes(k as typeof FEATURE_KEYS[number])||!BOOLS.includes(v as typeof BOOLS[number])))return false;
 if(!Array.isArray(x.tags)||x.tags.length>40||x.tags.some(t=>typeof t!=='string'||t.length>72))return false;
 if(!['upkeep24h','raidMinimumRockets','lootRooms','recommendedPlayers'].every(k=>numeric(x[k])))return false;
 return x.creatorNote===undefined||(typeof x.creatorNote==='string'&&x.creatorNote.length<=3000);
}
