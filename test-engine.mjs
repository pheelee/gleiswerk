import assert from 'node:assert/strict';
import {INITIAL,START,PACKS,addInventory,canonicalPart,loading,singleLoading,passing,linkedOvals,curvedStation,c4,c5,doubleOval,oval,validate,assignBases,summarize,search} from './web/engine.mjs';
const twoStarts=Object.fromEntries(Object.keys(INITIAL).map(id=>[id,(START[id]||0)*2]));
for(const f of [loading,()=>loading([],true),singleLoading,passing,linkedOvals,curvedStation,c4,()=>c4(false),c5,doubleOval,()=>oval(['24172','24188'])]){
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

// 29296 Kommunaldienst + 29653 Landwirtschaft each contain one LEFT turnout.
const starters=addInventory(addInventory(INITIAL,PACKS.city.parts),PACKS.farm.parts);
const station=assignBases(linkedOvals(),starters),stationSummary=summarize(station,starters);
assert.equal(validate(station).ok,true);assert.equal(stationSummary.missingTotal,0);
assert.deepEqual(stationSummary.used,{'24130':24,'24172':8,'24188':1,'24224':2,'24611':2,basis:1});
assert.equal(stationSummary.used['24612'],undefined);assert.equal(station.pieces.filter(p=>p.part==='basis').length,1);
assert(stationSummary.width>147&&stationSummary.width<149);assert(stationSummary.height>163&&stationSummary.height<165);
// Every piece belongs to the same connected track network.
const reached=new Set([0]),queue=[0];while(queue.length){const i=queue.shift();for(let j=0;j<station.pieces.length;j++)if(!reached.has(j)&&station.pieces[i].ports.some(a=>station.pieces[j].ports.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<.35))){reached.add(j);queue.push(j);}}
assert.equal(reached.size,station.pieces.length);
for(const hand of ['24611','24612'])for(const counter of [true,false])assert(validate(linkedOvals(['24172','24172'],hand,counter)).ok);
const stationResults=await search(starters);const found=stationResults.results.filter(p=>p.family==='Bahnhöfe');assert(found.length>0);assert(found.some(p=>p.used['24224']===2&&p.used['24611']===2&&p.used['24130']===24));assert(found.every(p=>!p.used['24612']&&p.missingTotal===0));
const broken=linkedOvals();broken.pieces[0].ports[2].x+=1;assert.equal(validate(broken).ok,false);
// One starter cannot silently claim the second oval or turnout.
assert(!(await search(addInventory(INITIAL,PACKS.city.parts))).results.some(p=>p.name.includes('verbundenen R1-Ovalen')));
console.log('PASS paired 29296 + 29653 starter station: real stock, connected geometry, mirrored variants, one base and search discovery');
