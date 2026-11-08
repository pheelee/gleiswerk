import {validateSet} from '../web/catalog-validation.mjs';
function aborted(signal){if(signal?.aborted)throw new DOMException('Aktualisierung abgebrochen.','AbortError');}
function same(a,b){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);return [...keys].every(k=>(a?.[k]||0)===(b?.[k]||0));}
function diff(a,b){return [...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].sort().filter(part=>(a?.[part]||0)!==(b?.[part]||0)).map(part=>({part,before:a?.[part]||0,after:b?.[part]||0}));}
export async function collectCatalog({fetchImpl=globalThis.fetch,signal,onProgress=()=>{},current,commit=()=>{},now=()=>new Date().toISOString()}={}){
 const old=new Map(current.map(s=>[s.article,s])),items=new Map(current.map(s=>[s.article,s.kind]));
 async function api(path){aborted(signal);const timeout=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,timeout]):timeout;const r=await fetchImpl(path,{signal:combined,cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});let data;try{data=await r.json();}catch{throw new Error('Die Katalogfunktion hat keine lesbare Antwort geliefert. Bitte die Seite neu laden.');}if(!r.ok)throw new Error(data.error||'Katalogabfrage fehlgeschlagen (HTTP '+r.status+').');return data;}
 onProgress({phase:'discover',message:'Herstellerlisten werden geladen …',done:0,total:0});
 for(const kind of ['starter','extension','track']){
  let expected=null,seen=new Set(),page=1;
  while(true){const data=await api(`/api/catalog/discover?kind=${kind}&page=${page}`);
   if(data.kind!==kind||data.page!==page||!Number.isInteger(data.total)||data.total<0||data.total>500||!Array.isArray(data.articles)||data.articles.some(id=>!/^\d{5}$/.test(id)))throw new Error('Die Artikelliste ist unvollständig oder ungültig. Der bisherige Katalog bleibt aktiv.');
   if(expected!==null&&expected!==data.total)throw new Error('Die Herstellerliste hat sich während der Abfrage geändert. Bitte erneut versuchen.');expected=data.total;
   if(kind==='track'&&(!Array.isArray(data.entries)||data.entries.length!==data.articles.length||data.entries.some(e=>typeof e.title!=='string'||!data.articles.includes(e.article))))throw new Error('Die C-Gleis-Artikelliste enthält keine eindeutigen Set-Namen.');
   for(const id of data.articles){if(seen.has(id))throw new Error('Die Herstellerseite wiederholt Einträge. Es wurde nichts übernommen.');seen.add(id);const title=data.entries?.find(e=>e.article===id)?.title||'';if(kind!=='track'||(/^(?:249\d{2}|201\d{2})$/.test(id)&&/Extension|Ergänzung|Snow|Verschneit/i.test(title)))items.set(id,old.get(id)?.kind||kind);}
   onProgress({phase:'discover',message:`Herstellerliste: ${{starter:'Startpackungen',extension:'Themen-Ergänzungen',track:'C-Gleis'}[kind]} · Seite ${page}`,done:0,total:0});
   if(!data.hasNext)break;if(++page>50)throw new Error('Die Herstellerliste überschreitet den unterstützten Suchumfang.');
  }
  if(seen.size!==expected||(kind==='starter'&&!expected))throw new Error('Die Herstellerliste ist nicht vollständig. Es wurde nichts übernommen.');
 }
 if(items.size>500)throw new Error('Der Herstellerkatalog überschreitet 500 Einträge. Es wurde nichts übernommen.');
 const tasks=[...items],outcomes=new Array(tasks.length);let next=0,done=0;
 onProgress({phase:'products',message:'Gleisinhalte werden abgeglichen …',done,total:tasks.length});
 async function runner(){while(next<tasks.length){aborted(signal);const i=next++,[article,kind]=tasks[i];try{const result=await api(`/api/catalog/article/${article}?kind=${kind}`);aborted(signal);
   if(['confirmed','retained'].includes(result.status)){const set=validateSet(result.set);if(set.article!==article)throw new Error('Die Antwort gehört zu einer anderen Artikelnummer.');if(result.status==='retained'&&!old.has(article))throw new Error('Ein neuer Artikel hat keine eindeutig lesbare Gleis-Stückliste.');outcomes[i]={status:result.status,set,reason:result.reason||''};}
   else if(result.status==='needs-review'&&result.candidate?.article===article){const prior=old.get(article),candidate=result.candidate;if(prior?.sourceHash&&prior.sourceHash===candidate.sourceHash)outcomes[i]={status:'retained',set:validateSet({...prior,lastSeen:candidate.lastSeen,retired:candidate.retired}),reason:'Produktbeschreibung unverändert; bisherige Gleis-Stückliste beibehalten.'};else outcomes[i]={status:'review',article,name:prior?.name||String(candidate.title||article).slice(0,140),reason:String(result.reason||'Gleisinhalt muss manuell abgeglichen werden.')};}
   else throw new Error('Die Herstellerantwort enthält keinen gültigen Gleisabgleich.');
  }catch(error){aborted(signal);outcomes[i]={status:'error',article,name:old.get(article)?.name||article,reason:error.message||'Produktseite nicht erreichbar.'};}
  done++;onProgress({phase:'products',message:'Gleisinhalte werden abgeglichen …',done,total:tasks.length});
 }}
 await Promise.all(Array.from({length:Math.min(3,tasks.length)},runner));aborted(signal);
 const report={checkedAt:now(),added:0,changed:0,confirmed:0,retained:0,review:0,errors:0,records:[]},merged=new Map(old);
 for(const r of outcomes){if(r.status==='confirmed'||r.status==='retained'){const prior=old.get(r.set.article),change=!prior?'added':!same(prior.parts,r.set.parts)?'changed':r.status;report[change]++;merged.set(r.set.article,{...r.set,name:prior?.name||r.set.name});report.records.push({article:r.set.article,name:prior?.name||r.set.name,state:change,reason:r.reason,diff:diff(prior?.parts,r.set.parts)});}else{report[r.status==='review'?'review':'errors']++;report.records.push({article:r.article,name:r.name,state:r.status,reason:r.reason,diff:[]});}}
 if(!(report.added+report.changed+report.confirmed+report.retained))throw new Error('Keine Produktseite konnte verlässlich abgeglichen werden. Der bisherige Katalog bleibt aktiv.');
 aborted(signal);await commit([...merged.values()],report);onProgress({phase:'done',message:'Katalogabgleich abgeschlossen.',done,total:tasks.length});return report;
}
