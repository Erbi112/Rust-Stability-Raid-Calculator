/** Multiple local library records, kept separate from active autosave. No server upload. */
import type { BlueprintDocument } from '../core/blueprint.ts';
import type { LibraryEntry } from '../core/library.ts';
import { openDB, parseBlueprint } from './persistence.ts';
const STORE='library';
export async function saveLibraryDocument(doc:BlueprintDocument,origin:'local'|'imported'='local'):Promise<LibraryEntry>{
 const entry:LibraryEntry={key:doc.id,doc:parseBlueprint(structuredClone(doc)),storedAt:new Date().toISOString(),origin};
 const db=await openDB();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(entry,entry.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});return entry;}finally{db.close()}
}
export async function listLibraryDocuments():Promise<LibraryEntry[]>{
 const db=await openDB();
 try{return await new Promise<LibraryEntry[]>((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>{try{const values=(req.result as LibraryEntry[]).map(e=>({...e,doc:parseBlueprint(e.doc)}));resolve(values.sort((a,b)=>b.storedAt.localeCompare(a.storedAt)))}catch(e){reject(e)}};req.onerror=()=>reject(req.error);});}finally{db.close()}
}
export async function removeLibraryDocument(key:string):Promise<void>{
 const db=await openDB();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);})}finally{db.close()}
}
export async function importToLibrary(file:File):Promise<LibraryEntry>{
 if(file.size>10_000_000)throw new Error('Blueprint zu groß (maximal 10 MB).');
 const value:unknown=JSON.parse(await file.text());
 const doc=parseBlueprint(value);
 return saveLibraryDocument(doc,'imported');
}
