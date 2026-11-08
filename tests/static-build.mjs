import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root});
const html=await readFile(new URL('dist/index.html',root),'utf8');
assert(!/\/api\/catalog/i.test(html));
const files=await readdir(new URL('dist/',root));assert(files.includes('.nojekyll'));assert(!files.includes('server'));assert(files.every(file=>!file.startsWith('.')||file==='.nojekyll'));
const snapshot=JSON.parse(await readFile(new URL('dist/catalog.json',root),'utf8'));assert.equal(snapshot.schema,1);assert(snapshot.sets.length>=46);
const base='https://pheelee.github.io/gleiswerk/';
const targets=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:mjs|js|css|svg)(?:\?[^"#]*)?)"/g)].map(m=>m[1]);
for(const file of files.filter(f=>f.endsWith('.mjs'))) {
 const code=await readFile(new URL('dist/'+file,root),'utf8');
 for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+\.mjs(?:\?[^'"]*)?)['"]/g))targets.push(match[1]);
}
for(const target of targets){const url=new URL(target,base);assert(url.pathname.startsWith('/gleiswerk/'));assert(files.includes(url.pathname.slice('/gleiswerk/'.length)),target);}
assert.equal(new URL('./catalog.json',base+'catalog-sync.mjs?v=test').href,base+'catalog.json');
console.log('PASS static build: relative assets, module imports, project subpath, catalog snapshot and no server/hosting configuration');
