// DOM integration test, not visual browser QA.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from '/workspace/work/gleiswerk-tests/node_modules/linkedom/esm/index.js';
import {search,START,INITIAL} from './dist/engine.mjs';
const {window,document}=parseHTML(await readFile(new URL('./dist/index.html',import.meta.url),'utf8'));
const saved=new Map(),downloads=[],legacy=process.argv.includes('--legacy');
if(legacy)saved.set('gleiswerk.inventory.v1',JSON.stringify(Object.fromEntries(Object.keys(INITIAL).map(id=>[id,(START[id]||0)*2]))));
Object.assign(globalThis,{document,window,innerWidth:1280,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});
for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{get(){return this.querySelector('option[selected]')?.getAttribute('value')||this.querySelector('option[selected]')?.textContent||this.firstElementChild.getAttribute('value')||this.firstElementChild.textContent;},set(value){for(const option of this.querySelectorAll('option')){if((option.getAttribute('value')||option.textContent)===String(value))option.setAttribute('selected','');else option.removeAttribute('selected');}}});
Object.defineProperty(window.HTMLInputElement.prototype,'checked',{get(){return this.hasAttribute('checked');},set(v){if(v)this.setAttribute('checked','');else this.removeAttribute('checked');},configurable:true});
for(const el of document.querySelectorAll('input')){el.checkValidity=()=>true;el.setCustomValidity=()=>{};el.reportValidity=()=>{};}
for(const d of document.querySelectorAll('dialog')){d.showModal=function(){this.setAttribute('open','');};d.close=function(){this.removeAttribute('open');};}
$('#custom-set-form').reset=function(){for(const i of this.querySelectorAll('input'))i.value=i.getAttribute('value')||'';};
URL.createObjectURL=blob=>(downloads.push(blob),'blob:qa');URL.revokeObjectURL=()=>{};
class MockWorker{postMessage({inventory,options}){search(inventory,options).then(result=>{if(!this.stopped)this.onmessage({data:{type:'done',...result}});}).catch(error=>this.onerror?.(error));}terminate(){this.stopped=true;}}
globalThis.Worker=MockWorker;
function $(q){return document.querySelector(q);}const click=q=>$(q).dispatchEvent(new window.Event('click',{bubbles:true})),change=q=>$(q).dispatchEvent(new window.Event('change',{bubbles:true})),input=q=>$(q).dispatchEvent(new window.Event('input',{bubbles:true}));
async function ready(){for(let i=0;i<500;i++){if(!$('#search-button').disabled)return;await new Promise(r=>setTimeout(r,20));}throw Error('UI search timeout');}
async function updated(){await new Promise(r=>setTimeout(r,380));await ready();}
await import('./dist/app.mjs');await ready();
if(legacy){assert.equal($('#stat-pieces').textContent,'42');assert(Number($('#result-count').textContent)>0);console.log('PASS existing v1 stock retained at 42 pieces');process.exit(0);}
assert.equal($('#stat-pieces').textContent,'0');assert.equal($('#result-count').textContent,'0');click('#empty-action');assert($('#catalog-dialog').hasAttribute('open'));assert.equal($('#set-count').textContent,'46');
$('#set-search').value='029652';input('#set-search');assert.equal($('#set-count').textContent,'1');assert($('.set-card h3').textContent.includes('Landwirtschaftszug'));$('#set-quantity').value='2';click('[data-set-add="29652"]');await updated();assert.equal($('#stat-pieces').textContent,'56');assert.equal($('#qty-24612').value,'2');assert.equal($('#qty-24172').value,'14');
$('#set-search').value='29653';input('#set-search');$('#set-quantity').value='1';click('[data-set-add="29653"]');await updated();assert.equal($('#stat-pieces').textContent,'77');assert.equal($('#qty-24172').value,'18');assert.equal($('#qty-24612').value,'2');
$('#set-search').value='';input('#set-search');$('#set-archived').checked=false;change('#set-archived');assert(Number($('#set-count').textContent)<46);$('#set-search').value='29179';input('#set-search');assert.equal($('#set-count').textContent,'0');$('#set-archived').checked=true;change('#set-archived');assert.equal($('#set-count').textContent,'1');
$('#set-search').value='no-such-set';input('#set-search');assert.equal($('#set-no-results').hidden,false);click('#set-missing-create');$('#custom-set-name').value='Mein Sonder-Set';$('#custom-set-article').value='TEST-1';document.querySelector('[data-custom-part="24130"]').value='12';document.querySelector('[data-custom-part="24172"]').value='2';document.querySelector('[data-custom-part="24188"]').value='1';document.querySelector('[data-custom-part="basis"]').value='1';$('#custom-set-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal($('#set-count').textContent,'1');assert(saved.has('gleiswerk.customSets.v1'));click('[data-set-add]');await updated();assert.equal($('#stat-pieces').textContent,'93');click('#catalog-done');assert(!$('#catalog-dialog').hasAttribute('open'));
click('#clear-stock');await updated();assert.equal($('#stat-pieces').textContent,'0');click('#example-stock');await updated();assert.equal($('#stat-pieces').textContent,'28');assert($('#large-plan svg'));click('#favorite-selected');assert.equal($('#saved-count').textContent,'1');click('#show-parts');assert(!$('#parts-panel').hidden);click('#export-plan');const exported=await downloads.at(-1).text();assert(exported.includes('<text'));assert(!exported.includes('NaN'));
click('[data-preset="C4"]');await updated();$('#family-filter').value='Herstellerpläne';change('#family-filter');assert($('#selected-name').textContent.includes('C4'));assert(Number($('#result-count').textContent)>=1);
$('#max-width').value='1';input('#max-width');assert.equal($('#empty-state').hidden,false);click('#empty-action');assert.equal($('#empty-state').hidden,true);
click('#help-open');assert($('#info-dialog').hasAttribute('open'));click('#info-close');
const fileInput=$('#import-file');Object.defineProperty(fileInput,'files',{value:[{size:100,text:async()=>JSON.stringify({inventory:{'20130':6,'24130':6,'20172':2,'20188':1,basis:1}})}],configurable:true});change('#import-file');await updated();assert.equal($('#stat-pieces').textContent,'16');assert.equal($('#qty-24130').value,'12');click('#export-stock');const json=JSON.parse(await downloads.at(-1).text());assert.equal(json.inventory['24130'],12);assert.equal(json.system,'maerklin-c');
click('#tab-extra');await ready();assert($('#plan-chips').textContent.includes('fehlen'));
console.log('PASS fresh empty inventory, catalog search, quantities, archives, custom sets, presets, filters, aliases/import, saved plans and SVG/JSON exports');
