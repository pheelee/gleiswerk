import {storage} from './storage.mjs?v=20261108-4';
import {SET_CATALOG,CATALOG_META} from './sets.mjs?v=20261108-4';
const KEY='gleiswerk.catalog.v1';
import {validateSet,PARTS} from './catalog-validation.mjs?v=20261108-4';
export {validateSet};
const listeners=new Set();
function validDate(s){return typeof s==='string'&&Number.isFinite(Date.parse(s));}
function cleanSets(rows){if(!Array.isArray(rows)||rows.length>500)throw new Error('Ungültiger Katalogumfang.');const sets=rows.map(validateSet);if(new Set(sets.map(s=>s.article)).size!==sets.length)throw new Error('Doppelte Artikelnummer im Katalog.');return sets;}
function merged(rows){const map=new Map(SET_CATALOG.map(s=>[s.article,s]));for(const s of rows)map.set(s.article,s);return [...map.values()].sort((a,b)=>(a.kind!=='starter')-(b.kind!=='starter')||Number(a.retired)-Number(b.retired)||a.article.localeCompare(b.article));}
function cleanReport(r){if(!r||typeof r!=='object'||!validDate(r.checkedAt))return null;return {checkedAt:r.checkedAt,added:Number(r.added)||0,changed:Number(r.changed)||0,confirmed:Number(r.confirmed)||0,retained:Number(r.retained)||0,review:Number(r.review)||0,errors:Number(r.errors)||0,records:Array.isArray(r.records)?r.records.slice(0,600).map(x=>({article:/^\d{5}$/.test(x.article)?x.article:'',name:typeof x.name==='string'?x.name.slice(0,140):'',state:['added','changed','confirmed','retained','review','error'].includes(x.state)?x.state:'review',reason:typeof x.reason==='string'?x.reason.slice(0,600):'',diff:Array.isArray(x.diff)?x.diff.filter(d=>PARTS.has(d.part)&&Number.isInteger(d.before)&&Number.isInteger(d.after)).slice(0,14):[]})):[]};}
function load(){try{const raw=JSON.parse(storage.getItem(KEY)||'null');if(raw?.schema===1&&validDate(raw.checkedAt))return {...raw,sets:cleanSets(raw.sets),report:cleanReport(raw.report)};}catch{}return null;}
let envelope=load();
export function getCatalog(){return merged(envelope?.sets||[]);}
export function getCatalogMeta(){const sets=getCatalog();return {...CATALOG_META,total:sets.length,starters:sets.filter(s=>s.kind==='starter').length,extensions:sets.filter(s=>s.kind!=='starter').length,checked:envelope?.checkedAt?.slice(0,10)||CATALOG_META.checked,lastRefresh:envelope?.isBaseline?null:envelope?.checkedAt||null,partial:!!(envelope?.report?.errors||envelope?.report?.review),canUndo:!!envelope?.previous,report:envelope?.report||null};}
export function subscribeCatalog(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export function saveCatalog(rows,report){const sets=cleanSets(rows),r=cleanReport(report);if(!r)throw new Error('Ungültiger Aktualisierungsbericht.');const previous={sets:getCatalog(),checkedAt:envelope?.checkedAt||CATALOG_META.checked,report:envelope?.report||null,isBaseline:!envelope||!!envelope.isBaseline};const next={schema:1,sets:merged(sets),checkedAt:r.checkedAt,report:r,previous,isBaseline:false};
 try{storage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Der aktualisierte Katalog konnte nicht gespeichert werden. Der bisherige Katalog bleibt aktiv.');}
 envelope=next;for(const fn of listeners)fn();return getCatalogMeta();
}
export function undoCatalog(){if(!envelope?.previous)return false;const prev=envelope.previous,sets=cleanSets(prev.sets);if(!validDate(prev.checkedAt))throw new Error('Der vorherige Stand ist nicht lesbar.');const next={schema:1,sets,checkedAt:prev.checkedAt,report:cleanReport(prev.report),previous:null,isBaseline:!!prev.isBaseline};
 try{storage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Der vorherige Katalog konnte nicht gespeichert werden.');}
 envelope=next;for(const fn of listeners)fn();return true;
}
