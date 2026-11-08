import assert from 'node:assert/strict';
import {SET_CATALOG,SET_BY_ARTICLE,CATALOG_META} from './dist/sets.mjs';
import {INITIAL,addInventory,search} from './dist/engine.mjs';
// Cross-check against four manufacturer result pages captured on 2026-11-08.
const expected='29030 29124 29132 29133 29139 29162 29163 29166 29167 29169 29171 29173 29179 29182 29183 29184 29188 29199 29296 29310 29320 29321 29323 29452 29453 29641 29652 29653 29722 29730 29752 29828 29952'.split(' ');
assert.deepEqual(SET_CATALOG.filter(s=>s.kind==='starter').map(s=>s.article).sort(),expected.sort());
assert.equal(SET_CATALOG.length,46);assert.equal(new Set(SET_CATALOG.map(s=>s.article)).size,46);assert.equal(CATALOG_META.starters,33);
for(const set of SET_CATALOG){assert(set.name.length);assert.equal(new URL(set.source).hostname,'www.marklin.com');assert.equal(set.checked,'2026-11-08');assert(Object.entries(set.parts).every(([id,n])=>Object.hasOwn(INITIAL,id)&&Number.isInteger(n)&&n>0));}
assert.equal(SET_BY_ARTICLE['29652'].parts['24172'],7);assert.equal(SET_BY_ARTICLE['29652'].parts['24612'],1);assert.equal(SET_BY_ARTICLE['29653'].parts['24172'],4);assert.equal(SET_BY_ARTICLE['29653'].parts['24612'],undefined);
assert.equal(SET_BY_ARTICLE['29166'].parts['24612'],1);assert.equal(SET_BY_ARTICLE['29166'].parts['24224'],undefined);assert.equal(SET_BY_ARTICLE['29952'].parts['24977'],undefined);
assert.equal(SET_BY_ARTICLE['29030'].parts['24130'],18);assert.equal(SET_BY_ARTICLE['29030'].parts['24188'],7);assert.equal(SET_BY_ARTICLE['20124'].parts['24188'],2);
const fixtures=new Map();for(const set of SET_CATALOG.filter(s=>s.kind==='starter')){const stock=addInventory(INITIAL,set.parts);const key=JSON.stringify(Object.entries(stock).sort());if(!fixtures.has(key))fixtures.set(key,{stock,articles:[]});fixtures.get(key).articles.push(set.article);}
for(const {stock,articles}of fixtures.values()){const result=await search(stock);assert(result.results.length,articles.join(',')+' has no layout');assert(result.results.every(x=>x.missingTotal===0&&x.validation.ok));if(articles.includes('29166'))assert(result.results.some(p=>p.used['24612']===1),'right turnout from legacy starter unused');if(articles.includes('29952'))assert(result.results.some(p=>p.total===20&&p.used['24611']===1&&!p.used['24977']),'loading ramp incorrectly treated as buffer');console.log('PASS catalog inventory',articles.join(', '),result.results.length,'valid matches');}
console.log('PASS all 33 starter sets, all 46 catalog entries and source-based quantity regressions');
