import {listingURL,parseListing,inspectProduct} from './catalog-core.mjs';

// Build-time adapter only. No server or browser credentials are needed.
export function createManufacturerFetch({baseline,hashes,fetchImpl=globalThis.fetch,clock=()=>new Date().toISOString()}={}) {
 const byArticle=new Map(baseline.map(set=>[set.article,set]));
 async function readHTML(url,signal) {
  for(let redirects=0;redirects<3;redirects++) {
   if(new URL(url).origin!=='https://www.marklin.com')throw Error('Unsupported manufacturer address.');
   const response=await fetchImpl(url,{redirect:'manual',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'text/html','Accept-Language':'en','Cache-Control':'no-cache','User-Agent':'Gleiswerk Catalog Reader'}});
   if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw Error('Missing redirect address.');url=new URL(location,url).href;continue;}
   if(!response.ok)throw Error('Manufacturer returned HTTP '+response.status+'.');
   if(!/text\/html/i.test(response.headers.get('content-type')||''))throw Error('Manufacturer did not return HTML.');
   if(Number(response.headers.get('content-length'))>1500000)throw Error('Manufacturer response too large.');
   const html=await response.text();if(html.length>1500000)throw Error('Manufacturer response too large.');return html;
  }
  throw Error('Too many manufacturer redirects.');
 }
 return async function catalogFetch(path,options={}) {
  try {
   const url=new URL(path,'https://catalog.invalid');
   if(url.pathname==='/api/catalog/discover') {
    const kind=url.searchParams.get('kind'),page=Number(url.searchParams.get('page'));
    return Response.json(parseListing(await readHTML(listingURL(kind,page),options.signal),kind,page));
   }
   const article=url.pathname.match(/^\/api\/catalog\/article\/(\d{5})$/)?.[1],kind=url.searchParams.get('kind');
   if(!article||!['starter','extension','track'].includes(kind))throw Error('Invalid catalog request.');
   return Response.json(await inspectProduct(await readHTML('https://www.marklin.com/products/details/article/'+article,options.signal),article,kind,byArticle.get(article),hashes[article],clock()));
  } catch(error) {
   if(options.signal?.aborted)throw error;
   return Response.json({error:error.message},{status:502});
  }
 };
}
