import {listingURL,parseListing,inspectProduct} from './catalog-core.mjs';
const ASSETS=/* @embed-assets */ {};
const BASELINE=/* @embed-catalog */ [];
const BASELINE_HASHES=/* @embed-hashes */ {};
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});}
export function createHandler({assets=ASSETS,baseline=BASELINE,hashes=BASELINE_HASHES,fetchImpl=globalThis.fetch,clock=()=>new Date().toISOString()}={}){
 const byArticle=Object.fromEntries(baseline.map(s=>[s.article,s]));
 async function upstream(url,request){
  for(let i=0;i<3;i++){
   const target=new URL(url);if(target.origin!=='https://www.marklin.com')throw new Error('Nicht unterstützte Herstelleradresse.');
   const timeout=AbortSignal.timeout(15000),signal=AbortSignal.any([timeout,request.signal]);
   const r=await fetchImpl(target.href,{redirect:'manual',signal,headers:{Accept:'text/html','Accept-Language':'en','Cache-Control':'no-cache','User-Agent':'Gleiswerk Catalog Reader'},cf:{cacheTtl:0,cacheEverything:false}});
   if(r.status>=300&&r.status<400){const next=r.headers.get('location');if(!next)throw new Error('Ungültige Weiterleitung der Herstellerseite.');url=new URL(next,url).href;continue;}
   if(!r.ok)throw new Error('Herstellerseite derzeit nicht erreichbar (HTTP '+r.status+').');
   if(!/text\/html/i.test(r.headers.get('content-type')||''))throw new Error('Die Herstellerseite hat kein lesbares HTML geliefert.');
   const length=Number(r.headers.get('content-length'));if(length>1500000)throw new Error('Die Herstellerantwort ist zu groß.');
   const html=await r.text();if(html.length>1500000)throw new Error('Die Herstellerantwort ist zu groß.');return html;
  }throw new Error('Zu viele Weiterleitungen der Herstellerseite.');
 }
 return async function fetch(request){
  const url=new URL(request.url),path=url.pathname;
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if(path.startsWith('/api/')){
   try{
    if(path==='/api/catalog/health')return json({ok:true,service:'gleiswerk-catalog',schema:1});
    if(path==='/api/catalog/discover'){
     const kind=url.searchParams.get('kind')||'starter',page=Number(url.searchParams.get('page')||1);
     let target;try{target=listingURL(kind,page);}catch(error){return json({error:error.message},400);}
     const html=await upstream(target,request);return json({...parseListing(html,kind,page),fetchedAt:clock()});
    }
    const article=path.match(/^\/api\/catalog\/article\/(\d{5})$/)?.[1];
    if(article){const kind=url.searchParams.get('kind')||byArticle[article]?.kind||'starter';if(!['starter','extension','track'].includes(kind))return json({error:'Ungültige Set-Art.'},400);
     const html=await upstream('https://www.marklin.com/products/details/article/'+article,request);
     return json(await inspectProduct(html,article,kind,byArticle[article],hashes[article],clock()));}
    return json({error:'Unbekannte Katalogfunktion.'},404);
   }catch(error){return json({error:error?.name==='TimeoutError'?'Zeitüberschreitung beim Laden der Herstellerseite.':error?.name==='AbortError'?'Abfrage abgebrochen.':error.message||'Der Herstellerkatalog konnte nicht geladen werden.'},502);}
  }
  const key=path==='/'?'/index.html':path,asset=assets[key];if(!asset)return new Response('Nicht gefunden',{status:404});
  return new Response(request.method==='HEAD'?null:asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 };
}
export default {fetch:createHandler()};
