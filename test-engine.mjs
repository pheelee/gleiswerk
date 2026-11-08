import assert from 'node:assert/strict';
import {INITIAL,START,PACKS,loading,passing,curvedStation,c4,c5,doubleOval,oval,validate,assignBases,summarize,search} from './dist/engine.mjs';
for(const f of [loading,()=>loading([],true),passing,curvedStation,c4,c5,doubleOval,()=>oval(['24172','24188'])]){
 const p=f(),v=validate(p);assert.equal(v.ok,true,`${p.name}: ${JSON.stringify(v)}`);
 console.log('PASS',p.name,'max join',v.maxError.toFixed(4));
}
// A false 1-mm joint cannot be accepted; an overlapping non-neighbour cannot pass.
const bad=loading();bad.pieces[3].ports[0].x+=1;assert.equal(validate(bad).ok,false);
const intersect=loading();const piece=structuredClone(intersect.pieces[3]);intersect.pieces.push(piece);assert.equal(validate(intersect).ok,false);
const empty=await search({});assert.equal(empty.results.length,0);
const initial=await search(INITIAL);assert(initial.results.length>5);for(const p of initial.results){assert.equal(p.missingTotal,0);assert(p.validation.ok);assert(Object.entries(p.used).every(([id,n])=>n<=(INITIAL[id]||0)));}
const short={...INITIAL,'24188':3};const long=summarize(assignBases(loading(['24188','24188']),short),short);assert.equal(long.missingTotal,2); // Six 188-mm positions: one base + five ordinary straight rails.
const combined={...INITIAL};for(const [id,n]of Object.entries(PACKS.C4.parts))combined[id]=(combined[id]||0)+n;assert.equal(summarize(assignBases(c4(),combined),combined).missingTotal,0);
const additions=await search(INITIAL,{mode:'extra',maxResults:80});assert(additions.results.length);assert(additions.results.every(x=>x.missingTotal>0));
const straights=await search({'24172':2,'24977':2});assert(straights.results.some(x=>x.family==='Pendelstrecken'));
const baseOnly=assignBases(c5(),{basis:10});assert.equal(baseOnly.pieces.filter(p=>p.part==='basis').length,1);
console.log('PASS inventory, empty stock, additions, pending lines, base allocation');
console.log('Initial search:',initial.results.length,'results,',initial.examined,'candidates,',initial.rejected,'rejected,',initial.elapsed,'ms');
