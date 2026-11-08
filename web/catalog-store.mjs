import {SET_CATALOG,CATALOG_META} from './sets.mjs?v=20261108-3';
const KEY='gleiswerk.catalog.v1';
const PARTS=new Set(['24172','24188','24077','24094','basis','24130','24230','24224','24611','24612','24671','24672','24620','24977']);
const listeners=new Set();
function validDate(s){return typeof s==='string'&&Number.isFinite(Date.parse(s));}
export function validateSet(raw){
 if(!raw||typeof raw!=='object'||!/^\d{5}$/.test(raw.article)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>140||!['starter','extension','track'].includes(raw.kind))throw new Error('Ungültiger Set-Datensatz.');
 if(!raw.parts||Array.isArray(raw.parts)||!Object.keys(raw.parts).length||!Object.entries(raw.parts).every(([id,n])=>PARTS.has(id)&&Number.isInteger(n)&&n>0&&n<=200))throw new Error('Ungültige oder unbekannte Gleis-Stückliste bei '+raw.article+'.');
 const source='https://www.marklin.com/products/details/article/'+raw.article;
 if(raw.source!==source||!validDate(raw.checked))throw new Error('Fehlende Quellen- oder Datumsangabe bei '+raw.article+'.');
 let evidence=raw.evidence||source;const e=new URL(evidence);if(evidence!==source&&!(e.protocol==='https:'&&e.hostname==='static.maerklin.de'&&e.pathname.startsWith('/damcontent/')&&e.pathname.endsWith('.pdf')))throw new Error('Ungültiger Quellenlink.');
 const set={article:raw.article,name:raw.name.trim(),kind:raw.kind,parts:{...raw.parts},source,evidence,checked:raw.checked.slice(0,10),retired:!!raw.retired,note:typeof raw.note==='string'?raw.note.slice(0,800):''};
 if(typeof raw.sourceHash==='string'&&/^[a-f0-9]{64}$/.test(raw.sourceHash))set.sourceHash=raw.sourceHash;
 if(validDate(raw.lastSeen))set.lastSeen=raw.lastSeen;
 if(typeof raw.title==='string')set.title=raw.title.slice(0,180);
 if(['online-contents','previous-evidence'].includes(raw.verification))set.verification=raw.verification;
 return set;
}
function cleanSets(rows){if(!Array.isArray(rows)||rows.length>500)throw new Error('Ungültiger Katalogumfang.');const sets=rows.map(validateSet);if(new Set(sets.map(s=>s.article)).size!==sets.length)throw new Error('Doppelte Artikelnummer im Katalog.');return sets;}
function merged(rows){const map=new Map(SET_CATALOG.map(s=>[s.article,s]));for(const s of rows)map.set(s.article,s);return [...map.values()].sort((a,b)=>(a.kind!=='starter')-(b.kind!=='starter')||Number(a.retired)-Number(b.retired)||a.article.localeCompare(b.article));}
function cleanReport(r){if(!r||typeof r!=='object'||!validDate(r.checkedAt))return null;return {checkedAt:r.checkedAt,added:Number(r.added)||0,changed:Number(r.changed)||0,confirmed:Number(r.confirmed)||0,retained:Number(r.retained)||0,review:Number(r.review)||0,errors:Number(r.errors)||0,records:Array.isArray(r.records)?r.records.slice(0,600).map(x=>({article:/^\d{5}$/.test(x.article)?x.article:'',name:typeof x.name==='string'?x.name.slice(0,140):'',state:['added','changed','confirmed','retained','review','error'].includes(x.state)?x.state:'review',reason:typeof x.reason==='string'?x.reason.slice(0,600):'',diff:Array.isArray(x.diff)?x.diff.filter(d=>PARTS.has(d.part)&&Number.isInteger(d.before)&&Number.isInteger(d.after)).slice(0,14):[]})):[]};}
function load(){try{const raw=JSON.parse(globalThis.localStorage?.getItem(KEY)||'null');if(raw?.schema===1&&validDate(raw.checkedAt))return {...raw,sets:cleanSets(raw.sets),report:cleanReport(raw.report)};}catch{}return null;}
let envelope=load();
export function getCatalog(){return merged(envelope?.sets||[]);}
export function getCatalogMeta(){const sets=getCatalog();return {...CATALOG_META,total:sets.length,starters:sets.filter(s=>s.kind==='starter').length,extensions:sets.filter(s=>s.kind!=='starter').length,checked:envelope?.checkedAt?.slice(0,10)||CATALOG_META.checked,lastRefresh:envelope?.isBaseline?null:envelope?.checkedAt||null,partial:!!(envelope?.report?.errors||envelope?.report?.review),canUndo:!!envelope?.previous,report:envelope?.report||null};}
export function subscribeCatalog(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export function saveCatalog(rows,report){const sets=cleanSets(rows),r=cleanReport(report);if(!r)throw new Error('Ungültiger Aktualisierungsbericht.');const previous={sets:getCatalog(),checkedAt:envelope?.checkedAt||CATALOG_META.checked,report:envelope?.report||null,isBaseline:!envelope||!!envelope.isBaseline};const next={schema:1,sets:merged(sets),checkedAt:r.checkedAt,report:r,previous,isBaseline:false};
 try{globalThis.localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Der aktualisierte Katalog konnte nicht gespeichert werden. Der bisherige Katalog bleibt aktiv.');}
 envelope=next;for(const fn of listeners)fn();return getCatalogMeta();
}
export function undoCatalog(){if(!envelope?.previous)return false;const prev=envelope.previous,sets=cleanSets(prev.sets);if(!validDate(prev.checkedAt))throw new Error('Der vorherige Stand ist nicht lesbar.');const next={schema:1,sets,checkedAt:prev.checkedAt,report:cleanReport(prev.report),previous:null,isBaseline:!!prev.isBaseline};
 try{globalThis.localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Der vorherige Katalog konnte nicht gespeichert werden.');}
 envelope=next;for(const fn of listeners)fn();return true;
}
