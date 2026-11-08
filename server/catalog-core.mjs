// Conservative extraction of factual C-track quantities from manufacturer HTML.
// Unknown or incomplete formats are reported for review, never guessed.
export const SUPPORTED_PARTS=['24172','24188','24077','24094','basis','24130','24230','24224','24611','24612','24671','24672','24620','24977'];
const PART_SET=new Set(SUPPORTED_PARTS);
const ENTITIES={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',auml:'ä',ouml:'ö',uuml:'ü',Auml:'Ä',Ouml:'Ö',Uuml:'Ü',szlig:'ß',ndash:'–',mdash:'—',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’',eacute:'é',copy:'©'};
export function decodeHTML(s){return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-zA-Z]+);/g,(m,e)=>{if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return ENTITIES[e]??m;});}
export function plainHTML(s){return decodeHTML(String(s).replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();}
export function productDocument(html,article){
 if(typeof html!=='string'||html.length>1500000)throw new Error('Die Herstellerantwort ist zu groß oder ungültig.');
 const title=plainHTML(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const description=plainHTML(html.match(/<p\b(?=[^>]*\bitemprop\s*=\s*["']description["'])[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
 const text=plainHTML(html);
 if(!title||!description||!new RegExp('(?:Article No\\.?|Artikel(?:nummer|[- ]?Nr\\.?))\\s*'+article+'\\b','i').test(text))throw new Error('Die Produktseite konnte nicht eindeutig dem Artikel zugeordnet werden.');
 const manuals=[...new Set([...html.matchAll(/https:\/\/static\.maerklin\.de\/damcontent\/[^"'\s<>]+?\.pdf/gi)].map(m=>decodeHTML(m[0])))].sort();
 return {title,description,manuals,retired:/Article not produced anymore|nicht mehr (?:produziert|im Programm)/i.test(text)};
}
export async function documentFingerprint(doc){const bytes=new TextEncoder().encode(JSON.stringify({title:doc.title,description:doc.description,manuals:doc.manuals}));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function parseTrackContents(description){
 const markers=[...description.matchAll(/\b(?:Contents|Inhalt)\s*:/gi)];
 if(markers.length!==1)return {ok:false,reason:'Keine einzelne, eindeutige Gleis-Stückliste in der Produktbeschreibung.'};
 let segment=description.slice(markers[0].index+markers[0][0].length);
 const stop=segment.search(/(?:\bA (?:switched|wireless|transformer|cut-out)|\b1\s+(?:each\s+)?(?:switched mode|Schaltnetzteil)|\b1\s+(?:each\s+)?\d+\s*volt\s*\/\s*\d+\s*VA|\bSchaltnetzteil|\bAll (?:of )?(?:the )?tracks?\b|\bThis set\b|\bThe (?:set|74492|following)\b|\bSetup instructions|\bErweiterungsmöglichkeiten|\bDie Weichen|\b56 building blocks)/i);
 if(stop>=0)segment=segment.slice(0,stop);
 const parts={},unknown=new Set(),codes=new Set(),errors=[];
 function add(article,value){const id=article.startsWith('20')?'24'+article.slice(2):article,n=Number(value);codes.add(article);if(!PART_SET.has(id)){unknown.add(article);return;}if(!Number.isInteger(n)||n<1||n>200||(parts[id]||0)+n>200){errors.push('Ungültige Stückzahl bei '+article);return;}parts[id]=(parts[id]||0)+n;}
 segment=segment.replace(/(\d{1,3})\s+(?:pairs?\s+of|Paar(?:e)?)\s+(?:turnouts?\s+)?(2[04]611)\s+(?:and|und)\s+(2[04]612)\b/gi,(m,n,a,b)=>(add(a,n),add(b,n),' '));
 const patterns=[
  /(\d{1,3})\s+(?:no\.?\s*|sections?\s+of\s+|each\s+|pieces?\s+of\s+|[x×]\s*)(2[04]\d{3})\b/gi,
  /(\d{1,3})\s+(?:(?:gebogene[rsn]?|gerade[rsn]?)\s+Gleise?|(?:Bogen)?Weiche(?:\s+(?:links|rechts))?|Prellb(?:öcke|ock))\s+(2[04]\d{3})\b/gi
 ];
 for(const pattern of patterns)segment=segment.replace(pattern,(m,n,id)=>(add(id,n),' '));
 segment=segment.replace(/(\d{1,3})\s+(?:(?:each|no\.?)\s+)?(?:base\s*station|Basisstation(?:en)?)\b/gi,(m,n)=>(add('basis',n),' '));
 for(const m of segment.matchAll(/\b2[04]\d{3}\b/g))if(!codes.has(m[0]))unknown.add(m[0]);
 const unexplained=/\b\d+(?:[.,]\d+)?\s+(?:(?:no\.?|each|sections?)\s+|(?:[a-z-]+\s+){0,3}(?:curved|straight)\s+tracks?\b|(?:gebogene[rsn]?|gerade[rsn]?)\s+Gleis|(?:left|right)\s+turnout|track bumper|R[1-5]\s+curved)/i.test(segment);
 if(unknown.size)return {ok:false,reason:'Nicht eindeutig zugeordnete oder noch nicht unterstützte Gleise: '+[...unknown].join(', ')};
 if(errors.length)return {ok:false,reason:errors.join('. ')};
 if(unexplained||!Object.keys(parts).length)return {ok:false,reason:'Die Gleisaufzählung enthält nicht eindeutig zugeordnete Mengen oder Geometrien.'};
 return {ok:true,parts};
}
export function sameParts(a,b){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);return [...keys].every(k=>(a?.[k]||0)===(b?.[k]||0));}
export function listingURL(kind,page){
 if(!['starter','extension','track'].includes(kind)||!Number.isInteger(page)||page<1||page>50)throw new Error('Ungültige Katalogseite.');
 const params=new URLSearchParams();for(const [key,val]of Object.entries({feature:17,gaugechoice:2,groupchoice:kind==='track'?0:5,subgroupchoice:kind==='track'?0:kind==='starter'?16:17,available_only:0,catalog:0,page,perpage:10,searchres:1}))params.set('tx_torrpdb_search['+key+']',val);
 if(kind==='track')params.set('tx_torrpdb_search[searchstring]','C Track Extension');
 return 'https://www.marklin.com/service/product-database?'+params;
}
export function parseListing(html,kind,page){
 const text=plainHTML(html),match=text.match(/(?:Search results|Suchergebnisse)\s*\((\d+)\)/i);
 if(!match)throw new Error('Die Artikelliste der Herstellerseite ist nicht eindeutig lesbar.');
 const total=Number(match[1]),ids=[...new Set([...html.matchAll(/\/products\/details\/article\/(\d{5})(?=[/?"'])/g)].map(m=>m[1]))];
 if(total>500||ids.length>10||(!total&&ids.length)||(total>0&&page<=Math.ceil(total/10)&&ids.length!==Math.min(10,total-(page-1)*10)))throw new Error('Die Herstellerliste ist unvollständig oder ihr Format wurde geändert.');
 const titles=new Map();for(const link of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const id=link[1].match(/\/products\/details\/article\/(\d{5})/)?.[1],title=plainHTML(link[2]);if(id&&title.length>7&&!/^(?:Details|Dealer Search|Händlersuche)$/i.test(title))titles.set(id,title.slice(0,200));}
 if(kind==='track'&&ids.some(id=>!titles.has(id)))throw new Error('Die Namen der C-Gleis-Artikel sind nicht eindeutig lesbar.');
 return {kind,page,total,articles:ids,entries:ids.map(article=>({article,title:titles.get(article)||''})),hasNext:page*10<total,source:listingURL(kind,page)};
}
export async function inspectProduct(html,article,kind,baseline=null,baselineHash=null,now=new Date().toISOString()){
 const doc=productDocument(html,article),sourceHash=await documentFingerprint(doc),parsed=parseTrackContents(doc.description);
 const source='https://www.marklin.com/products/details/article/'+article;
 const observed={article,kind:baseline?.kind||kind,title:doc.title,source,sourceHash,retired:doc.retired,lastSeen:now};
 if(parsed.ok){
  if(baselineHash===sourceHash&&baseline&&!sameParts(parsed.parts,baseline.parts))return {status:'needs-review',candidate:observed,reason:'Die automatische Auswertung widerspricht dem abgeglichenen Ausgangsbestand.'};
  const name=baseline?.name||doc.title.replace(/^Märklin\s+Start\s*up\s*[-–—:]?\s*/i,'').slice(0,120);
  const set={...(baseline||{}),...observed,name,parts:parsed.parts,evidence:source,checked:now.slice(0,10),note:baseline?.note||'',verification:'online-contents'};
  return {status:'confirmed',set};
 }
 if(baseline&&baselineHash===sourceHash)return {status:'retained',set:{...baseline,retired:doc.retired,sourceHash,lastSeen:now,verification:'previous-evidence'},reason:'Produktbeschreibung und Anleitungslinks unverändert. Der bisherige Gleisabgleich bleibt maßgeblich.'};
 return {status:'needs-review',candidate:observed,reason:parsed.reason+' Bisherige Gleisinhalte werden nicht überschrieben.'};
}
