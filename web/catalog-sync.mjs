import {SET_CATALOG} from './sets.mjs?v=20261108-5';
import {getCatalog,saveCatalog,validateSet} from './catalog-store.mjs?v=20261108-5';
const abort=signal=>{if(signal?.aborted)throw new DOMException('Aktualisierung abgebrochen.','AbortError');};
const diff=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].sort().filter(id=>(a?.[id]||0)!==(b?.[id]||0)).map(part=>({part,before:a?.[part]||0,after:b?.[part]||0}));
export async function refreshCatalog({fetchImpl=globalThis.fetch,signal,onProgress=()=>{},current=getCatalog(),commit=saveCatalog}={}) {
 abort(signal);
 onProgress({phase:'download',message:'Veröffentlichten Katalog laden …',done:0,total:0});
 const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
 // Relative to this module so project Pages paths such as /gleiswerk/ work.
 const response=await fetchImpl(new URL('./catalog.json',import.meta.url),{signal:combined,cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Der veröffentlichte Katalog ist derzeit nicht erreichbar (HTTP '+response.status+').');
 let snapshot;try{const text=await response.text();if(text.length>2000000)throw Error();snapshot=JSON.parse(text);}catch{throw Error('Der veröffentlichte Katalog ist nicht lesbar. Der bisherige Stand bleibt aktiv.');}
 abort(signal);
 if(snapshot?.schema!==1||!/^\d{4}-\d{2}-\d{2}T/.test(snapshot.checkedAt)||!Number.isFinite(Date.parse(snapshot.checkedAt))||!Array.isArray(snapshot.sets)||snapshot.sets.length>500)throw Error('Ungültiger Katalogstand. Es wurde nichts übernommen.');
 const incoming=snapshot.sets.map(validateSet),ids=new Set(incoming.map(s=>s.article));
 if(ids.size!==incoming.length||SET_CATALOG.some(s=>!ids.has(s.article)))throw Error('Der veröffentlichte Katalog ist unvollständig. Der bisherige Stand bleibt aktiv.');
 const source=snapshot.sourceReport;
 if(source&&(!Array.isArray(source.records)||source.checkedAt!==snapshot.checkedAt||source.records.some(r=>!/^\d{5}$/.test(r.article)||!['added','changed','confirmed','retained','review','error'].includes(r.state))))throw Error('Ungültiger Quellenbericht. Der bisherige Stand bleibt aktiv.');
 const old=new Map(current.map(s=>[s.article,s])),merged=new Map(old),records=new Map((source?.records||[]).map(r=>[r.article,r]));
 const report={checkedAt:snapshot.checkedAt,added:0,changed:0,confirmed:0,retained:0,review:0,errors:0,records:[]};
 for(const set of incoming) {
  abort(signal);const prior=old.get(set.article),record=records.get(set.article);let state,reason='';
  if(record?.state==='review'||record?.state==='error'){state=record.state;reason=record.reason||'Bisheriger Gleisabgleich beibehalten.';if(!prior)merged.set(set.article,set);}
  else if(prior&&Date.parse(prior.lastSeen||prior.checked)>Date.parse(set.lastSeen||set.checked)){state='retained';reason='Dein gespeicherter Gleisabgleich ist neuer als der veröffentlichte Stand.';}
  else {const changes=diff(prior?.parts,set.parts);state=!prior?'added':changes.length?'changed':record?.state==='retained'||!source?'retained':'confirmed';merged.set(set.article,set);reason=record?.reason||(!source?'Mitgelieferter Gleisabgleich; noch kein neuer Herstellerabruf veröffentlicht.':'');}
  report[state==='error'?'errors':state]++;
  report.records.push({article:set.article,name:prior?.name||set.name,state,reason,diff:['added','changed'].includes(state)?diff(prior?.parts,set.parts):[]});
  onProgress({phase:'validate',message:'Katalog prüfen …',done:report.records.length,total:incoming.length});
 }
 for(const record of records.values())if(!ids.has(record.article)&&['review','error'].includes(record.state)){report[record.state==='error'?'errors':'review']++;report.records.push({article:record.article,name:String(record.name||record.article).slice(0,140),state:record.state,reason:String(record.reason||''),diff:[]});}
 abort(signal);await commit([...merged.values()],report);
 onProgress({phase:'done',message:'Veröffentlichten Katalog übernommen.',done:incoming.length,total:incoming.length});
 return report;
}
