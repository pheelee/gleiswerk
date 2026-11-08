import assert from 'node:assert/strict';
import {INITIAL,START,PACKS,addInventory,canonicalPart,loading,singleLoading,passing,curvedStation,c4,c5,doubleOval,oval,validate,assignBases,summarize,search} from './dist/engine.mjs';
const twoStarts=Object.fromEntries(Object.keys(INITIAL).map(id=>[id,(START[id]||0)*2]));
for(const f of [loading,()=>loading([],true),singleLoading,passing,curvedStation,c4,()=>c4(false),c5,doubleOval,()=>oval(['24172','24188'])]){
 const p=f(),v=validate(p);assert.equal(v.ok,true,`${p.name}: ${JSON.stringify(v)}`);
 console.log('PASS',p.name,'max join',v.maxError.toFixed(4));
}
const bad=loading();bad.pieces[3].ports[0].x+=1;assert.equal(validate(bad).ok,false);
const intersect=loading();intersect.pieces.push(structuredClone(intersect.pieces[3]));assert.equal(validate(intersect).ok,false);
assert(Object.values(INITIAL).every(n=>n===0));assert.equal((await search(INITIAL)).results.length,0);
const initial=await search(twoStarts);assert(initial.results.length>5);for(const p of initial.results){assert.equal(p.missingTotal,0);assert(p.validation.ok);assert(Object.entries(p.used).every(([id,n])=>n<=(twoStarts[id]||0)));}
const short={...twoStarts,'24188':3};assert.equal(summarize(assignBases(loading(['24188','24188']),short),short).missingTotal,2);
const combined=addInventory(twoStarts,PACKS.C4.parts);assert.equal(summarize(assignBases(c4(),combined),combined).missingTotal,0);
const basicC4=addInventory(PACKS['29133'].parts,PACKS.C4.parts);assert.equal(summarize(assignBases(c4(false),basicC4),basicC4).missingTotal,0);
const additions=await search(twoStarts,{mode:'extra',maxResults:80});assert(additions.results.length);assert(additions.results.every(x=>x.missingTotal>0));
assert((await search({'24172':2,'24977':2})).results.some(x=>x.family==='Pendelstrecken'));
assert.equal(assignBases(c5(),{basis:10}).pieces.filter(p=>p.part==='basis').length,1);
assert.equal(canonicalPart('20130'),'24130');assert.equal(canonicalPart('20612'),'24612');assert.equal(canonicalPart('20977'),'24977');
assert.equal(addInventory(INITIAL,{'20130':6,'24130':6})['24130'],12);
const n=addInventory(INITIAL,PACKS['29652'].parts,2);assert.equal(n['24172'],14);assert.equal(n['24612'],2);assert.equal(Object.values(n).reduce((a,b)=>a+b),56);
assert.throws(()=>addInventory(n,{'24130':200}));assert.equal(n['24130'],24);assert.throws(()=>addInventory(INITIAL,{'toString':1}));
console.log('PASS empty default, legacy inventory, aliases, quantities, atomic capacity checks and geometry');
