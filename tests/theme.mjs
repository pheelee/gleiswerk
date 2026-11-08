import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../web/theme.js',import.meta.url),'utf8');
function app({dark=false,saved=null,blocked=false}={}) {
 const values=new Map(saved?[['gleiswerk.theme.v1',saved]]:[]),events={},mediaEvents={},selectEvents={},select={value:'system',addEventListener:(name,fn)=>{selectEvents[name]=fn;}};
 const root={dataset:{}},meta={setAttribute(name,value){this[name]=value;}},document={documentElement:root,readyState:'loading',getElementById:()=>select,querySelector:()=>meta,addEventListener:(name,fn)=>{events[name]=fn;}};
 const media={matches:dark,addEventListener:(name,fn)=>{mediaEvents[name]=fn;}},window={matchMedia:()=>media,addEventListener:(name,fn)=>{events[name]=fn;}};
 const localStorage={getItem:k=>{if(blocked)throw Error('Unavailable');return values.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('Unavailable');values.set(k,v);}};
 vm.runInNewContext(source,{window,document,localStorage});
 // Theme is applied before the document is ready; no app module is required.
 const initial=root.dataset.theme;events.DOMContentLoaded();
 return {root,select,values,meta,initial,choose(value){select.value=value;selectEvents.change();},system(value){media.matches=value;mediaEvents.change();},storage(value,key='gleiswerk.theme.v1'){events.storage({key,newValue:value});}};
}
for(const dark of [true,false]){const a=app({dark});assert.equal(a.initial,dark?'dark':'light');assert.equal(a.select.value,'system');assert.equal(a.values.size,0);a.system(!dark);assert.equal(a.root.dataset.theme,!dark?'dark':'light');}
let a=app({dark:true});a.choose('light');assert.equal(a.root.dataset.theme,'light');assert.equal(a.values.get('gleiswerk.theme.v1'),'light');a.system(true);assert.equal(a.root.dataset.theme,'light');a.choose('system');assert.equal(a.root.dataset.theme,'dark');assert.equal(a.meta.content,'#17271f');a.system(false);assert.equal(a.root.dataset.theme,'light');assert.equal(a.meta.content,'#164c43');
a=app({dark:false,saved:'dark'});assert.equal(a.initial,'dark');assert.equal(a.select.value,'dark');a.storage('light');assert.equal(a.root.dataset.theme,'light');a.storage(null);assert.equal(a.select.value,'system');a.storage('nonsense');assert.equal(a.root.dataset.themePreference,'system');
a=app({dark:true,saved:'invalid'});assert.equal(a.initial,'dark');a=app({dark:true,blocked:true});assert.equal(a.initial,'dark');a.choose('light');assert.equal(a.root.dataset.theme,'light');
const css=await readFile(new URL('../web/theme.css',import.meta.url),'utf8');
const palettes=[...css.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)].slice(0,2).map(m=>Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(x=>[x[1],x[2]])));
function luminance(hex){const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [i,p]of palettes.entries()){
 for(const text of ['ink','text-secondary','muted'])for(const background of ['paper','white','surface-subtle','green-soft','surface-hover','canvas'])assert(contrast(p[text],p[background])>=4.5,`${i?'dark':'light'} ${text}/${background}: ${contrast(p[text],p[background]).toFixed(2)}`);
 for(const [text,bg]of [['on-primary','green'],['on-primary','primary-hover'],['warning-ink','warning-surface']])assert(contrast(p[text],p[bg])>=4.5,`${i?'dark':'light'} ${text}/${bg}`);
 assert(contrast(p.rail,p.roadbed)>=3);assert(contrast(p['missing-rail'],p['missing-roadbed'])>=3);
}
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');assert(html.indexOf('src="./theme.js')<html.indexOf('href="./style.css'));assert(html.includes('aria-label="Farbschema"'));assert(css.includes('@media (prefers-color-scheme: dark)'));assert(css.includes('@media print'));
console.log('PASS theme: browser default, pre-paint choice, live detection, override/persistence, cross-tab updates, unavailable storage, text and rail contrast');
