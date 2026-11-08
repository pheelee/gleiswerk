// C-Gleis geometry. Catalog angles/lengths are rounded. Units: mm/radians.
import {SET_BY_ARTICLE} from './sets.mjs?v=20261108-3';
export const CATALOG = [
 ['24172','Gerade','171,7 mm','Geraden'],['24188','Gerade','188,3 mm','Geraden'],['24077','Kurze Gerade','77,5 mm','Geraden'],['24094','Kurze Gerade','94,2 mm','Geraden'],['basis','Basisstation','188,3 mm','Geraden'],
 ['24130','Bogen R1','360 mm · 30°','Bögen'],['24230','Bogen R2','437,5 mm · 30°','Bögen'],['24224','Gegenbogen','437,5 mm · 24,3°','Bögen'],
 ['24611','Weiche links','188,3 mm · 24,3°','Weichen & Abschlüsse'],['24612','Weiche rechts','188,3 mm · 24,3°','Weichen & Abschlüsse'],['24671','Bogenweiche links','R1 · 30°','Weichen & Abschlüsse'],['24672','Bogenweiche rechts','R1 · 30°','Weichen & Abschlüsse'],['24620','Doppelkreuzungsweiche','188,3 mm · 24,3°','Weichen & Abschlüsse'],['24977','Prellbock','77,5 mm','Weichen & Abschlüsse']
];
export const START=SET_BY_ARTICLE['29653'].parts;
// Keep legacy keys for existing shortcuts; one catalog is the source of truth.
export const PACKS={...SET_BY_ARTICLE,farm:SET_BY_ARTICLE['29653'],city:SET_BY_ARTICLE['29296'],...Object.fromEntries(['24900','24902','24903','24904','24905'].map((id,i)=>['C'+(i+1),SET_BY_ARTICLE[id]]))};
export const INITIAL=Object.fromEntries(CATALOG.map(([id])=>[id,0]));
export const EXAMPLE=Object.fromEntries(CATALOG.map(([id])=>[id,(SET_BY_ARTICLE['29133'].parts[id]||0)+(SET_BY_ARTICLE['24902'].parts[id]||0)]));
export const ALIASES=Object.fromEntries(CATALOG.filter(([id])=>id.startsWith('24')).map(([id])=>['20'+id.slice(2),id]));
ALIASES['24089']='basis';
export function canonicalPart(id){return ALIASES[id]||id;}
export function addInventory(stock,parts,quantity=1){
 if(!Number.isInteger(quantity)||quantity<1||quantity>20)throw new Error('Bitte 1 bis 20 Sets wählen.');
 const out={...INITIAL,...stock};
 for(const [article,n]of Object.entries(parts)){const id=canonicalPart(article);if(!Object.hasOwn(INITIAL,id)||!Number.isInteger(n)||n<0)throw new Error('Ungültiger Gleisinhalt.');out[id]=(out[id]||0)+n*quantity;if(out[id]>200)throw new Error('Maximal 200 Stück pro Gleisart.');}return out;
}
const D=Math.PI/180,L={'24172':171.7,'24188':188.3,'24077':77.5,'24094':94.2,basis:188.3,'24977':77.5};
const P=(x=0,y=0,a=0)=>({x,y,a:a*D});
const back=p=>({...p,a:p.a+Math.PI});
const mv=(p,l)=>({x:p.x+l*Math.cos(p.a),y:p.y+l*Math.sin(p.a),a:p.a});
const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const count=ps=>ps.reduce((a,p)=>(a[p.part]=(a[p.part]||0)+1,a),{});
function arc(p,r,a){const points=[];const n=Math.max(10,Math.ceil(Math.abs(a)/D*1.25));for(let i=0;i<=n;i++){const t=Math.abs(a)*i/n,x=r*Math.sin(t),y=Math.sign(a)*r*(1-Math.cos(t));points.push({x:p.x+x*Math.cos(p.a)-y*Math.sin(p.a),y:p.y+x*Math.sin(p.a)+y*Math.cos(p.a)});}return {points,end:{...points.at(-1),a:p.a+a}};}
export class Layout {
 constructor(name,family='Rundstrecken'){this.name=name;this.family=family;this.pieces=[];this.closed=true;this.note='';}
 add(part,paths,ports,buffer=false){this.pieces.push({part,paths,ports,buffer});}
 line(p,part){const q=mv(p,L[part]);this.add(part,[[p,q]],[back(p),q],part==='24977');return q;}
 curve(p,part,s=1){const [r,a]={'24130':[360,30],'24230':[437.5,30],'24224':[437.5,24.3]}[part];const q=arc(p,r,s*a*D);this.add(part,[q.points],[back(p),q.end]);return q.end;}
 turnout(p,part){const q=mv(p,188.3),b=arc(p,437.5,(part==='24611'?1:-1)*24.3*D);this.add(part,[[p,q],b.points],[back(p),q,b.end]);return [q,b.end];}
 curved(p,part){const s=part==='24671'?1:-1,inn=arc(p,360,s*30*D),out=arc(mv(p,77.5),360,s*30*D);this.add(part,[inn.points,[p,...out.points]],[back(p),inn.end,out.end]);return [inn.end,out.end];}
 reverseInner(p,part){const s=part==='24671'?1:-1,q=arc(p,360,-s*30*D).end;const [inn,out]=this.curved(back(q),part);return [q,out];}
 slip(p){const a=24.3*D,s=188.3,c={x:s*(1-Math.cos(a))/2,y:-s*Math.sin(a)/2};const o={x:p.x-c.x,y:p.y-c.y};const A={...o,a:Math.PI},B={x:o.x+s,y:o.y,a:0},C={...p,a:a+Math.PI},E={x:o.x+s-c.x,y:o.y-c.y,a};this.add('24620',[[A,B],[C,E]],[A,B,C,E]);return [A,B,E];}
 seq(p,parts,s=1){for(const part of parts)p=part in L?this.line(p,part):this.curve(p,part,s);return p;}
 spur(p,parts=['24172']){return this.seq(this.curve(p,'24224',-1),[...parts,'24977']);}
}
const repeat=(x,n)=>Array.from({length:n},()=>x);
export function oval(horizontal=[],vertical=[],r='24130'){
 const b=new Layout(vertical.length?'Rechteck mit runden Ecken':horizontal.length?'Klassisches Oval':'Kompakter Kreis');let p=P();
 for(let k=0;k<2;k++){p=b.seq(p,horizontal);p=b.seq(p,repeat(r,3),-1);p=b.seq(p,vertical);p=b.seq(p,repeat(r,3),-1);}return b;
}
export function loading(extra=[],three=false){const b=new Layout(three?'Drei Lade- und Abstellgleise':extra.length?'Oval mit langen Ladegleisen':'Oval mit zwei Ladegleisen','Abstellgleise');let p=P(),a,c,d;
 [p,a]=b.turnout(p,'24611');p=b.seq(p,['24172','24172']);if(three){[p,c]=b.turnout(p,'24611');p=b.seq(p,['24172','24188']);}else p=b.line(p,'24188');p=b.seq(p,repeat('24130',6),-1);
 [p,d]=b.turnout(p,'24611');p=b.seq(p,three?['24172','24172','24172','24188','24188']:['24172','24172','24188']);b.seq(p,repeat('24130',6),-1);
 for(const x of [a,c,d].filter(Boolean))b.spur(x,['24172',...extra]);return b;
}
export function singleLoading(hand='24611',n=2,counter=true,spur='24188',buffer=true){
 const b=new Layout(buffer?`Oval mit einem ${hand==='24611'?'linken':'rechten'} Abstellgleis`:'Oval mit offenem Abstellgleis','Abstellgleise');let p=P(),branch;
 [p,branch]=b.turnout(p,hand);p=b.seq(p,repeat('24172',n));p=b.seq(p,repeat('24130',6),-1);p=b.seq(p,[...repeat('24172',n),'24188']);b.seq(p,repeat('24130',6),-1);
 if(counter)branch=b.curve(branch,'24224',hand==='24611'?-1:1);b.seq(branch,[...(Array.isArray(spur)?spur:[spur]),...(buffer?['24977']:[])]);
 b.note=counter?'Abzweig mit Gegenbogen und geradem Ladegleis.':'Schräges Abstellgleis ohne Gegenbogen; für ältere Startsets mit einer rechten Weiche.';
 if(!buffer){b.closed=false;b.note+=' Ein Gleisende ist offen; einen passenden Abschluss im Betrieb vorsehen.';}return b;
}
export function passing(straights=['24188','24172'],loads=true){const b=new Layout(loads?'Ausweichbahnhof mit zwei Ladegleisen':'Ausweichbahnhof','Bahnhöfe');let p=P(),a,c,d;[p,a]=b.turnout(p,'24611');p=b.seq(p,['24172',...straights,'24172']);const span=376.6+343.4+straights.reduce((s,x)=>s+L[x],0);
 const [right,branch]=b.turnout(P(span,0,180),'24612');p=b.seq(P(span,0),repeat('24130',6));
 if(loads){[p,c]=b.turnout(p,'24611');p=b.seq(p,['24172','24172']);[p,d]=b.turnout(p,'24611');p=b.seq(p,['24172','24188']);for(const x of [c,d])b.spur(x);}
 else p=b.seq(p,['24188','24172',...straights,'24172','24188']);
 b.seq(p,repeat('24130',6));b.seq(b.curve(a,'24224',-1),straights);b.curve(branch,'24224',1);return b;}
export function curvedStation(loads=true){const b=new Layout(loads?'Bogenbahnhof mit Ladegleisen':'Langer Bogenbahnhof','Bahnhöfe');const span=1080;
 let [li,lo]=b.curved(P(-360,360,-90),'24671'),[ri,ro]=b.curved(P(span+360,360,-90),'24672');
 li=b.seq(li,repeat('24130',2));lo=b.seq(lo,repeat('24130',2));ri=b.seq(ri,repeat('24130',2),-1);ro=b.seq(ro,repeat('24130',2),-1);
 b.seq(li,['24172','24188','24172','24188','24172','24188']);b.seq(lo,['24172','24188','24172','24188','24172','24188']);let p=b.seq(P(span+360,360,90),repeat('24130',3));
 if(loads){let a,c;[p,a]=b.turnout(p,'24611');p=b.seq(p,repeat('24172',2));[p,c]=b.turnout(p,'24611');p=b.seq(p,['24172','24188']);b.spur(a);b.spur(c);}else p=b.seq(p,['24172','24188','24172','24188','24172','24188']);b.seq(p,repeat('24130',3));return b;}
export function c4(buffers=true){const b=new Layout(buffers?'C4 · Geschwungene Herstellerstrecke':'C4 · Herstellerplan mit offenen Enden','Herstellerpläne');let [inside,p]=b.curved(P(0,0,-90),'24671');p=b.seq(p,repeat('24130',2));p=b.seq(p,['24188','24172','24188','24172','24188','24077']);p=b.curve(p,'24130');let outer;[p,outer]=b.reverseInner(p,'24672');p=b.curve(p,'24130');p=b.seq(p,repeat('24230',3));p=b.curve(p,'24130');p=b.curve(p,'24130',-1);p=b.line(p,'24188');p=b.curve(p,'24130',-1);p=b.curve(p,'24130');b.seq(p,repeat('24130',3));p=b.seq(inside,repeat('24130',3));p=b.curve(p,'24230');p=b.line(p,'24077');p=b.curve(p,'24230',-1);b.seq(p,['24172','24188',...(buffers?['24977']:[])]);b.seq(b.curve(outer,'24230',-1),['24172','24188','24172','24172',...(buffers?['24977']:[])]);for(const x of b.pieces){x.paths=x.paths.map(a=>a.map(p=>({...p,x:-p.x,y:-p.y})));x.ports=x.ports.map(p=>({...p,x:-p.x,y:-p.y,a:p.a+Math.PI}));}b.closed=buffers;b.note=buffers?'Nach Märklin S1 + C4, gedreht; zwei Prellböcke ergänzt.':'Nach Märklin S1 + C4, gedreht. Beide Stumpfgleisenden sind wie in der Vorlage offen; im Betrieb absichern.';return b;}
export function c5(){const b=new Layout('C5 · Kompakter Rangierbahnhof','Rangieren');let p=P(),branch;[p,branch]=b.turnout(p,'24611');p=b.seq(p,['24172','24188','24172','24188']);p=b.seq(p,repeat('24130',6));p=b.seq(p,['24188','24172','24188','24172','24188']);b.seq(p,repeat('24130',6));const [diagonal,lower]=b.turnout(branch,'24612');b.seq(lower,['24172','24188','24172','24977']);const [left,right,upper]=b.slip(diagonal);b.seq(left,['24188','24172','24094','24977']);b.seq(right,['24188','24172','24094','24977']);b.seq(b.curve(upper,'24224',-1),['24188','24172','24977']);b.note='Nach dem Prinzip von Märklin S1 + C5; vier Stumpfgleise.';return b;}
export function doubleOval(){const b=new Layout('Zwei unabhängige Fahrkreise','Rundstrecken');for(const [y,r]of[[360,'24130'],[437.5,'24230']]){let p=P(0,y);p=b.seq(p,['24172','24172','24188']);p=b.seq(p,repeat(r,6),-1);p=b.seq(p,['24172','24172','24188']);b.seq(p,repeat(r,6),-1);}b.note='Elektrisch getrennt. Je Fahrkreis eine eigene Einspeisung.';return b;}
export function assignBases(layout,inventory){const q=structuredClone(layout);let stock188=inventory['24188']||0,bases=inventory.basis||0;const needed=count(q.pieces)['24188']||0;let use=Math.min(bases,needed); // First use one base on each disconnected oval when possible.
 const ids=q.pieces.map((x,i)=>x.part==='24188'?i:-1).filter(i=>i>=0);if(q.name==='Zwei unabhängige Fahrkreise'&&use>=2){for(const i of [ids[0],ids[2]])q.pieces[i].part='basis';use-=2;}
 for(const i of ids){if(use>0&&q.pieces[i].part==='24188'){q.pieces[i].part='basis';use--;}}
 // Use all available bases only when needed to replace scarce straight rails.
 // One base per connected layout: never propose parallel control units.
 if(q.name!=='Zwei unabhängige Fahrkreise'){
  let seen=false;for(const x of q.pieces)if(x.part==='basis'){if(seen)x.part='24188';seen=true;}
 }
 return q;}
function dense(piece){const out=[];for(const line of piece.paths)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(dist(a,b)/7));for(let k=0;k<n;k++)out.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n});}for(const line of piece.paths)out.push(line.at(-1));return out;}
function intersects(a,b,clearance){for(const p of a)for(const q of b)if(Math.abs(p.x-q.x)<clearance&&Math.abs(p.y-q.y)<clearance&&dist(p,q)<clearance)return true;return false;}
export function validate(layout,collision=true){let maxError=0;const ps=layout.pieces,adj=new Set(),open=[];
 for(let i=0;i<ps.length;i++)for(let j=0;j<ps[i].ports.length;j++){
  if(ps[i].buffer&&j===1)continue;const p=ps[i].ports[j];let matches=[];
  for(let k=0;k<ps.length;k++)if(k!==i)for(const q of ps[k].ports){const d=dist(p,q);if(d<.35&&angle(p.a,q.a+Math.PI)<.00002)matches.push([k,d]);}
  if(matches.length!==1){open.push([i,j]);continue;}maxError=Math.max(maxError,matches[0][1]);adj.add([Math.min(i,matches[0][0]),Math.max(i,matches[0][0])].join(':'));
 }
 if(layout.closed&&open.length)return {ok:false,reason:'Anschlüsse',open};
 if(!layout.closed&&open.length>2)return {ok:false,reason:'Offene Anschlüsse'};
 if(collision){const ds=ps.map(dense),bounds=ds.map(a=>({minX:Math.min(...a.map(p=>p.x)),maxX:Math.max(...a.map(p=>p.x)),minY:Math.min(...a.map(p=>p.y)),maxY:Math.max(...a.map(p=>p.y))}));for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(!adj.has(i+':'+j)){const a=bounds[i],b=bounds[j];if(a.maxX+39.5<b.minX||b.maxX+39.5<a.minX||a.maxY+39.5<b.minY||b.maxY+39.5<a.minY)continue;if(intersects(ds[i],ds[j],39.5))return {ok:false,reason:'Bettungsüberschneidung'};}}
 return {ok:true,maxError,open:open.length};}
export function summarize(layout,inventory){const used=count(layout.pieces),missing={},total=Object.values(used).reduce((a,b)=>a+b,0);for(const [id,n]of Object.entries(used))if(n>(inventory[id]||0))missing[id]=n-(inventory[id]||0);
 const pts=layout.pieces.flatMap(p=>p.paths.flat());const minX=Math.min(...pts.map(p=>p.x))-20,maxX=Math.max(...pts.map(p=>p.x))+20,minY=Math.min(...pts.map(p=>p.y))-20,maxY=Math.max(...pts.map(p=>p.y))+20;
 return {...layout,used,missing,total,missingTotal:Object.values(missing).reduce((a,b)=>a+b,0),width:(maxX-minX)/10,height:(maxY-minY)/10,bounds:{minX,minY,maxX,maxY},sidings:used['24977']||0,utilization:total/Math.max(1,Object.values(inventory).reduce((a,b)=>a+b,0))};}
function combos(parts,maxLen=4){const out=[[]];function walk(arr,start){if(arr.length>=maxLen)return;for(let i=start;i<parts.length;i++){const q=[...arr,parts[i]];out.push(q);walk(q,i);}}walk([],0);return out;}
export function* candidates(inventory,limit=28){
 yield loading();yield loading([],true);yield passing();yield passing(['24188','24172'],false);yield curvedStation();yield curvedStation(false);yield c4();yield c4(false);yield c5();yield doubleOval();
 for(const hand of ['24611','24612'])for(const n of [1,2])for(const counter of [true,false])for(const spur of ['24172','24188',['24172','24188']])yield singleLoading(hand,n,counter,spur);
 for(const hand of ['24611','24612'])yield singleLoading(hand,2,true,'24188',false);
 for(let n=1;n<=4;n++)yield loading(repeat('24188',n));
 const mains=combos(['24172','24188','24077','24094'],4),small=combos(['24172','24188','24077','24094'],2);
 for(const r of ['24130','24230'])for(const a of mains){if(12+a.length*2>limit)continue;yield oval(a,[],r);for(const b of small){if(!b.length||12+2*(a.length+b.length)>limit)continue;
  // Rounded rectangles identical under a quarter turn are represented once.
  if(a.reduce((s,x)=>s+L[x],0)<b.reduce((s,x)=>s+L[x],0))continue;
  yield oval(a,b,r);
 }}
 for(const a of mains){if(!a.length)continue;
  const open=new Layout('Offene Pendelstrecke','Pendelstrecken');open.closed=false;open.seq(P(),a);open.note='Beide Gleisenden offen; Enden im Betrieb absichern.';yield open;
  const b=new Layout('Pendelstrecke mit Prellböcken','Pendelstrecken');b.closed=false;b.line(P(77.5,0,180),'24977');b.seq(P(77.5,0),[...a,'24977']);yield b;
 }
}
export function signature(layout){const used=count(layout.pieces);const ps=layout.pieces.flatMap(p=>p.paths.flat()),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);const w=Math.round(Math.max(...xs)-Math.min(...xs)),h=Math.round(Math.max(...ys)-Math.min(...ys));return layout.family+':'+Math.max(w,h)+':'+Math.min(w,h)+':'+Object.entries(used).sort().map(x=>x.join('=')).join(',');}
export async function search(inventory,options={},progress=()=>{}){const {maxPieces=64,mode='stock',maxCandidates=4500,maxResults=240}=options;const results=[],seen=new Set();let examined=0,rejected=0,limited=false;const start=Date.now();
 for(const raw of candidates(inventory,maxPieces)){
  if(++examined>maxCandidates){limited=true;break;}
  if(raw.pieces.length>maxPieces)continue;
  const plan=assignBases(raw,inventory),s=summarize(plan,inventory);if(mode==='stock'&&s.missingTotal)continue;if(mode==='extra'&&(!s.missingTotal||s.missingTotal>16))continue;
  const key=signature(plan);if(seen.has(key))continue;seen.add(key);const validation=validate(plan);if(!validation.ok){rejected++;continue;}
  s.validation=validation;s.id='p'+results.length;results.push(s);
  if(results.length%20===0){progress({examined,found:results.length});await new Promise(r=>setTimeout(r,0));}
  if(results.length>=maxResults){limited=true;break;}
 }
 results.sort((a,b)=>a.missingTotal-b.missingTotal||b.sidings-a.sidings||b.total-a.total||a.width*a.height-b.width*b.height);
 return {results,examined,rejected,limited,elapsed:Date.now()-start,families:6,maxPieces};}
