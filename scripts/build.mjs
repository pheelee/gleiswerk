import {readFile,readdir,mkdir,writeFile,rm} from 'node:fs/promises';
import {SET_CATALOG} from '../web/sets.mjs';
const root=new URL('../',import.meta.url),assets={};
const types={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml; charset=utf-8'};
for(const file of await readdir(new URL('web/',root))){const ext=file.split('.').at(-1);if(!types[ext])continue;assets['/'+file]={type:types[ext],content:await readFile(new URL('web/'+file,root),'utf8')};}
const hashes=JSON.parse(await readFile(new URL('server/baseline-hashes.json',root),'utf8'));
const core=(await readFile(new URL('server/catalog-core.mjs',root),'utf8')).replace(/^export /gm,'');
let worker=await readFile(new URL('server/index.mjs',root),'utf8');worker=worker.replace(/^import [^\n]+\n/,'');
worker=worker.replace('/* @embed-assets */ {}',JSON.stringify(assets)).replace('/* @embed-catalog */ []',JSON.stringify(SET_CATALOG)).replace('/* @embed-hashes */ {}',JSON.stringify(hashes));
worker=worker.replace('export function createHandler','function createHandler');
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/server/',root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),core+'\n'+worker);
console.log('Built embedded Worker:',Object.keys(assets).length,'assets,',SET_CATALOG.length,'baseline entries.');
