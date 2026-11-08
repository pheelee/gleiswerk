import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SET_CATALOG} from './web/sets.mjs';
import {productDocument,parseTrackContents,inspectProduct,sameParts,parseListing} from './server/catalog-core.mjs';
import {createHandler} from './server/index.mjs';
const hashes=JSON.parse(await readFile('server/baseline-hashes.json','utf8')),root='/workspace/work/startup-katalog/';
let confirmed=0,retained=0;
for(const set of SET_CATALOG){const html=await readFile(root+set.article+'.html','utf8');const result=await inspectProduct(html,set.article,set.kind,set,hashes[set.article],'2026-11-09T10:00:00Z');assert(['confirmed','retained'].includes(result.status),set.article+': '+result.reason);assert(sameParts(result.set.parts,set.parts),set.article);if(result.status==='confirmed'){confirmed++;assert.equal(result.set.checked,'2026-11-09');}else{retained++;assert.equal(result.set.checked,set.checked);}}
assert.equal(confirmed,39);assert.equal(retained,7);
const seed=SET_CATALOG.find(s=>s.article==='29653'),html=await readFile(root+'29653.html','utf8');const changed=html.replace('4 no. 24172','5 no. 24172');const changedResult=await inspectProduct(changed,'29653','starter',seed,hashes['29653']);assert.equal(changedResult.status,'confirmed');assert.equal(changedResult.set.parts['24172'],5);
const unknown=html.replace('4 no. 24172','4 no. 24330');assert.equal((await inspectProduct(unknown,'29653','starter',seed,hashes['29653'])).status,'needs-review');
const manualSeed=SET_CATALOG.find(s=>s.article==='29133'),manualHTML=await readFile(root+'29133.html','utf8');assert.equal((await inspectProduct(manualHTML.replace('The childlike tank locomotive','A newly changed tank locomotive'),'29133','starter',manualSeed,hashes['29133'])).status,'needs-review');
assert.equal(parseTrackContents('Contents: 2 no. 20172 straight track, 1 no. 24611 turnout.').parts['24172'],2);
assert.equal(parseTrackContents('Contents: 12 no. 24130 curved track, 1 unspecified straight track.').ok,false);
assert.equal(parseTrackContents('Contents: 300 no. 24130 curved track.').ok,false);assert.equal(parseTrackContents('Contents: 1 pair of 24611 and 24612 turnouts.').parts['24612'],1);
for(let page=1;page<=4;page++){const listing=parseListing(await readFile(root+'listing-16-'+page+'.html','utf8'),'starter',page);assert.equal(listing.total,33);assert.equal(listing.articles.length,page===4?3:10);}
assert.throws(()=>parseListing('<html>New website layout</html>','starter',1));
let calls=[];const handler=createHandler({baseline:SET_CATALOG,hashes,assets:{'/index.html':{type:'text/html',content:'<h1>Gleiswerk</h1>'}},clock:()=> '2026-11-09T10:00:00Z',fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(url.includes('/article/')?html:await readFile(root+'listing-16-1.html','utf8'),{headers:{'content-type':'text/html'}});}});
let response=await handler(new Request('https://gleiswerk.example/'));assert.equal(response.status,200);assert((await response.text()).includes('Gleiswerk'));response=await handler(new Request('https://gleiswerk.example/',{method:'HEAD'}));assert.equal(await response.text(),'');
response=await handler(new Request('https://gleiswerk.example/api/catalog/discover?kind=starter&page=1'));assert.equal(response.status,200);assert.equal((await response.json()).total,33);assert.equal(response.headers.get('cache-control'),'no-store');
response=await handler(new Request('https://gleiswerk.example/api/catalog/article/29653?kind=starter',{headers:{Authorization:'private-user-token',Cookie:'private-user-cookie'}}));assert.equal(response.status,200);assert.equal((await response.json()).status,'confirmed');assert(calls.every(c=>new URL(c.url).origin==='https://www.marklin.com'));assert(calls.every(c=>!c.options.headers.Authorization&&!c.options.headers.Cookie));
assert.equal((await handler(new Request('https://gleiswerk.example/api/catalog/discover?kind=evil'))).status,400);assert.equal((await handler(new Request('https://gleiswerk.example/api/catalog/article/../../secret'))).status,404);assert.equal((await handler(new Request('https://gleiswerk.example/api/catalog/article/29653',{method:'POST'}))).status,405);
const blocked=createHandler({fetchImpl:async()=>new Response('blocked',{status:403})});assert.equal((await blocked(new Request('https://gleiswerk.example/api/catalog/article/29653'))).status,502);
const redirect=createHandler({fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://evil.example/'}})});assert.equal((await redirect(new Request('https://gleiswerk.example/api/catalog/article/29653'))).status,502);
console.log('PASS manufacturer HTML: 39 complete lists, 7 protected manual/unnumbered entries; API routes, changes, unknown parts, upstream failure and fixed-host requests');
// Actual manufacturer list pagination through the whole client/server pipeline.
const {refreshCatalog}=await import('./web/catalog-sync.mjs?v=20261108-3');
const integration=createHandler({baseline:SET_CATALOG,hashes,fetchImpl:async(url)=>{const u=new URL(url),article=u.pathname.match(/\/article\/(\d+)/)?.[1],page=u.searchParams.get('tx_torrpdb_search[page]'),sub=u.searchParams.get('tx_torrpdb_search[subgroupchoice]');const file=article?article+'.html':sub==='0'?'listing-startup-track-'+page+'.html':sub==='16'?'listing-16-'+page+'.html':'listing-17-1.html';return new Response(await readFile(root+file,'utf8'),{headers:{'content-type':'text/html'}});}});
let committed;const report=await refreshCatalog({current:SET_CATALOG,fetchImpl:(path)=>integration(new Request('https://example.test'+path)),commit:async rows=>{committed=rows;}});
assert.equal(committed.length,46);assert.equal(report.confirmed,39);assert.equal(report.retained,7);assert.equal(report.errors+report.review+report.added+report.changed,0);
console.log('PASS full client/server pipeline with actual manufacturer pages: 33 starter sets, 7 theme sets, C1–C5 and snow tracks');
