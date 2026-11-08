export const PARTS=new Set(['24172','24188','24077','24094','basis','24130','24230','24224','24611','24612','24671','24672','24620','24977']);
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
