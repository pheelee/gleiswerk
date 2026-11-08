import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {SET_CATALOG} from '../web/sets.mjs';
import {collectCatalog} from '../lib/catalog-refresh.mjs';
import {createManufacturerFetch} from '../lib/manufacturer.mjs';
import {validateSet} from '../web/catalog-validation.mjs';
const root=new URL('../',import.meta.url),path=new URL('data/catalog.json',root);
let current=SET_CATALOG;
try {const prior=JSON.parse(await readFile(path,'utf8'));if(prior.schema!==1||!Array.isArray(prior.sets))throw Error('Invalid existing catalog.');current=prior.sets.map(validateSet);}
catch(error){if(error.code!=='ENOENT')throw error;}
const hashes=JSON.parse(await readFile(new URL('lib/baseline-hashes.json',root),'utf8'));
const fetchImpl=createManufacturerFetch({baseline:SET_CATALOG,hashes});
let sets;
const report=await collectCatalog({current,fetchImpl,commit:rows=>{sets=rows;},onProgress:p=>{if(p.done===0||p.done===p.total)console.log(p.message,p.total?`${p.done}/${p.total}`:'');}});
await mkdir(new URL('data/',root),{recursive:true});
const temp=new URL('data/catalog.json.tmp',root);
await writeFile(temp,JSON.stringify({schema:1,checkedAt:report.checkedAt,sets,sourceReport:report},null,2)+'\n');
await rename(temp,path);
console.log(JSON.stringify({entries:sets.length,added:report.added,changed:report.changed,review:report.review,errors:report.errors}));
