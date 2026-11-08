// DOM integration test; no browser or screenshot is implied by this test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from '/workspace/work/gleiswerk-tests/node_modules/linkedom/esm/index.js';
import {search} from './dist/engine.mjs';
const {window,document}=parseHTML(await readFile(new URL('./dist/index.html',import.meta.url),'utf8'));
const saved=new Map(),downloads=[];
Object.assign(globalThis,{document,window,innerWidth:1280,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});
for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{get(){return this.querySelector('option[selected]')?.getAttribute('value')||this.querySelector('option[selected]')?.textContent||this.firstElementChild.getAttribute('value')||this.firstElementChild.textContent;},set(value){for(const option of this.querySelectorAll('option')){if((option.getAttribute('value')||option.textContent)===String(value))option.setAttribute('selected','');else option.removeAttribute('selected');}}});
for(const el of document.querySelectorAll('input')){el.checkValidity=()=>true;el.setCustomValidity=()=>{};el.reportValidity=()=>{};}
document.querySelector('#info-dialog').showModal=function(){this.setAttribute('open','');};document.querySelector('#info-dialog').close=function(){this.removeAttribute('open');};
URL.createObjectURL=blob=>(downloads.push(blob),'blob:qa');URL.revokeObjectURL=()=>{};
class MockWorker{postMessage({inventory,options}){search(inventory,options).then(result=>{if(!this.stopped)this.onmessage({data:{type:'done',...result}});}).catch(error=>this.onerror?.(error));}terminate(){this.stopped=true;}}
globalThis.Worker=MockWorker;
const $=q=>document.querySelector(q),click=q=>$(q).dispatchEvent(new window.Event('click',{bubbles:true})),change=q=>$(q).dispatchEvent(new window.Event('change',{bubbles:true}));
async function ready(){for(let i=0;i<400;i++){if(!$('#search-button').disabled)return;await new Promise(r=>setTimeout(r,20));}throw Error('UI search timeout');}
await import('./dist/app.mjs');await ready();
assert.equal($('#stat-pieces').textContent,'42');assert(Number($('#result-count').textContent)>0);assert($('#large-plan svg'));assert(document.querySelectorAll('.result-card').length<=12);
click('#favorite-selected');assert.equal($('#saved-count').textContent,'1');click('#show-parts');assert(!$('#parts-panel').hidden);assert($('#parts-panel table'));click('#export-plan');assert(downloads.length);const exported=await downloads.at(-1).text();assert(exported.includes('xmlns="http://www.w3.org/2000/svg"'));assert(exported.includes('<text'));assert(!exported.includes('NaN'));
click('[data-preset="C4"]');await new Promise(r=>setTimeout(r,380));await ready();$('#family-filter').value='Herstellerpläne';change('#family-filter');assert($('#selected-name').textContent.includes('C4'));assert.equal($('#result-count').textContent,'1');
$('#max-width').value='1';$('#max-width').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal($('#empty-state').hidden,false);click('#empty-action');assert.equal($('#empty-state').hidden,true);
click('#help-open');assert($('#info-dialog').hasAttribute('open'));click('#info-close');assert(!$('#info-dialog').hasAttribute('open'));
click('#clear-stock');await new Promise(r=>setTimeout(r,380));await ready();assert.equal($('#stat-pieces').textContent,'0');assert.equal($('#result-count').textContent,'0');assert.equal($('#empty-state').hidden,false);
click('#empty-action');await new Promise(r=>setTimeout(r,380));await ready();assert.equal($('#stat-pieces').textContent,'42');
click('#tab-extra');await ready();assert($('#result-count').textContent!=='0');assert($('#plan-chips').textContent.includes('fehlen'));
assert(saved.has('gleiswerk.inventory.v1'));assert(saved.has('gleiswerk.favorites.v1'));
click('#export-stock');const json=JSON.parse(await downloads.at(-1).text());assert.equal(json.system,'maerklin-c');assert.equal(json.inventory['24130'],24);
console.log('PASS UI: initial inventory, results, C4 preset, filters, empty state, parts, favorites, modal, additions, persistence, SVG and JSON exports');
