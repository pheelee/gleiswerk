import {collectCatalog} from '../lib/catalog-refresh.mjs';
import {SET_CATALOG} from '../web/sets.mjs?v=20261108-5';
export function mockManufacturerFetch({newArticle='29999',changeArticle='24900',review=[],errors=[],retained=[],discoveryError=false,inconsistent=false,waitForAbort=false}={}){
 const fresh=structuredClone(SET_CATALOG[0]);fresh.article=newArticle;fresh.name='Neues Test-Startset';fresh.kind='starter';fresh.parts={'24130':12,'24172':2,'24188':1,basis:1};fresh.source='https://www.marklin.com/products/details/article/'+newArticle;fresh.evidence=fresh.source;fresh.checked='2026-11-09';fresh.retired=false;
 const entries=[...SET_CATALOG,...(newArticle?[fresh]:[])];
 return async function fetch(path,options={}){
  if(waitForAbort)return new Promise((resolve,reject)=>{if(options.signal?.aborted)return reject(new DOMException('Abgebrochen','AbortError'));options.signal?.addEventListener('abort',()=>reject(new DOMException('Abgebrochen','AbortError')),{once:true});});
  const url=new URL(path,'https://gleiswerk.example');
  if(url.pathname==='/api/catalog/discover'){
   if(discoveryError)return Response.json({error:'Herstellerseite nicht erreichbar.'},{status:502});
   const kind=url.searchParams.get('kind'),page=Number(url.searchParams.get('page')),list=entries.filter(s=>s.kind===kind),slice=list.slice((page-1)*10,page*10);
   return Response.json({kind,page,total:list.length+(inconsistent&&page===2?1:0),articles:slice.map(s=>s.article),entries:slice.map(s=>({article:s.article,title:kind==='track'?'C Track Extension Set':s.name})),hasNext:page*10<list.length});
  }
  const id=url.pathname.split('/').at(-1),set=structuredClone(entries.find(s=>s.article===id));
  if(!set)return Response.json({error:'Nicht gefunden.'},{status:404});
  if(errors.includes(id))return Response.json({error:'Produktseite nicht erreichbar.'},{status:502});
  if(review.includes(id))return Response.json({status:'needs-review',candidate:{article:id,title:set.name,sourceHash:'c'.repeat(64),lastSeen:'2026-11-09T10:00:00Z',retired:false},reason:'Gleisinhalt muss geprüft werden.'});
  if(retained.includes(id))return Response.json({status:'retained',set:{...set,lastSeen:'2026-11-09T10:00:00Z',verification:'previous-evidence'},reason:'Anleitungsabgleich beibehalten.'});
  set.checked='2026-11-09';set.lastSeen='2026-11-09T10:00:00Z';set.sourceHash='b'.repeat(64);set.verification='online-contents';set.evidence=set.source;
  if(id===changeArticle)set.parts['24172']=(set.parts['24172']||0)+1;
  return Response.json({status:'confirmed',set});
 };
}

export function mockCatalogFetch(options={}) {
 return async function fetch(path,requestOptions={}) {
  let sets;const report=await collectCatalog({current:SET_CATALOG,fetchImpl:mockManufacturerFetch(options),signal:requestOptions.signal,commit:rows=>{sets=rows;},now:()=> '2026-11-09T10:00:00Z'});
  return Response.json({schema:1,checkedAt:report.checkedAt,sets,sourceReport:report});
 };
}
