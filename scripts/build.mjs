import {cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {SET_CATALOG,CATALOG_META} from '../web/sets.mjs';
import {validateSet} from '../web/catalog-validation.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(new URL('web/',root),dist,{recursive:true});
let snapshot;
try {snapshot=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;snapshot={schema:1,checkedAt:CATALOG_META.checked+'T00:00:00Z',sets:SET_CATALOG,sourceReport:null};}
if(snapshot.schema!==1||!Number.isFinite(Date.parse(snapshot.checkedAt))||!Array.isArray(snapshot.sets))throw Error('Invalid catalog snapshot.');
snapshot.sets=snapshot.sets.map(validateSet);
const ids=new Set(snapshot.sets.map(set=>set.article));
if(ids.size!==snapshot.sets.length||SET_CATALOG.some(set=>!ids.has(set.article)))throw Error('Incomplete catalog snapshot.');
await writeFile(new URL('catalog.json',dist),JSON.stringify(snapshot));
await writeFile(new URL('.nojekyll',dist),'');
console.log('Built static site in dist/ with',snapshot.sets.length,'catalog entries.');
