import {storage} from './storage.mjs?v=20261108-4';
import {getCatalog,getCatalogMeta,subscribeCatalog,undoCatalog} from './catalog-store.mjs?v=20261108-4';
import {refreshCatalog} from './catalog-sync.mjs?v=20261108-4';
import {CATALOG,addInventory,INITIAL} from './engine.mjs?v=20261108-4';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
const kinds={starter:'Startpackung',track:'Gleis-Ergänzung',extension:'Themen-Ergänzung',custom:'Eigene Vorlage'};
const customKey='gleiswerk.customSets.v1';
const date=s=>new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(s.length===10?s+'T00:00:00Z':s));
export function setupSetCatalog({onAdd,onMessage,onCatalogChange=()=>{}}){
 const $=s=>document.querySelector(s);let custom=[],limit=12,controller=null,runMessage='';
 try{const raw=JSON.parse(storage.getItem(customKey)||'[]');if(Array.isArray(raw))custom=raw.filter(s=>typeof s.key==='string'&&typeof s.name==='string'&&s.kind==='custom'&&s.parts&&Object.keys(s.parts).length&&Object.entries(s.parts).every(([id,n])=>Object.hasOwn(INITIAL,id)&&Number.isInteger(n)&&n>0&&n<=200)).slice(0,100).map(s=>({key:s.key,name:s.name.slice(0,80),article:typeof s.article==='string'?s.article.slice(0,30):'',parts:s.parts,kind:'custom',retired:false,note:'',source:null}));}catch{}
 const all=()=>[...getCatalog().map(s=>({...s,key:s.article})),...custom];
 function persist(){try{storage.setItem(customKey,JSON.stringify(custom));}catch{onMessage('Die eigene Vorlage konnte nicht dauerhaft gespeichert werden.');}}
 function render(){
  const words=$('#set-search').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/\s+/).filter(Boolean).map(x=>/^\d+$/.test(x)?x.replace(/^0+(?=\d)/,''):x),kind=$('#set-kind').value,archived=$('#set-archived').checked;
  const list=all().filter(s=>(kind==='all'||s.kind===kind)&&(archived||!s.retired)&&words.every(w=>(s.article+' '+s.name+' '+(s.title||'')+' '+(s.kind==='starter'?'Startpackung Startset':'')+' '+(s.retired?'Archiv':'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(w)));
  const catalogMeta=getCatalogMeta();
  $('#set-count').textContent=list.length;$('#catalog-total').textContent=`${catalogMeta.starters} Startpackungen · ${catalogMeta.extensions} Ergänzungen${custom.length?' · '+custom.length+' eigene Vorlagen':''}`;
  $('.catalog-provenance').textContent=`${catalogMeta.total} Hersteller-Vorlagen. Grundlage: Märklin-Produktdatenbank (Start up / H0), C1–C5 und verschneite Gleise. Ältere Einträge bleiben erhalten. Farbvarianten und 20xxx-Artikel werden auf dieselbe C-Gleis-Geometrie zusammengeführt. Katalogaktualisierungen gelten für diesen Browser; dein Gleisbestand wird dabei nicht geändert.`;
  $('#set-list').innerHTML=list.slice(0,limit).map(s=>{
   const total=Object.values(s.parts).reduce((a,b)=>a+b,0),rows=CATALOG.filter(([id])=>s.parts[id]).map(([id,name])=>`<tr><td>${id==='basis'?'Basisstation':id}</td><td>${escape(name)}</td><td>${s.parts[id]}</td></tr>`).join('');
   return `<article class="set-card"><div class="set-card-top"><span class="set-kind ${s.retired?'archive':''}">${kinds[s.kind]}${s.retired?' · Archiv':''}</span><span class="set-article">${escape(s.article||'Individuell')}</span></div><h3>${escape(s.name)}</h3><div class="set-card-meta"><span>${total} Gleisstücke</span><span>${Object.keys(s.parts).length} Gleisarten</span></div><details class="set-contents"><summary>Gleisinhalt & Quelle</summary><table><thead><tr><th>Artikel</th><th>Gleisart</th><th>Anzahl</th></tr></thead><tbody>${rows}</tbody></table>${s.note?`<p>${escape(s.note)}</p>`:''}${s.source?`<div class="set-source"><a href="${escape(s.source)}" target="_blank" rel="noopener noreferrer">Herstellerseite ↗</a>${s.evidence!==s.source?`<a href="${escape(s.evidence)}" target="_blank" rel="noopener noreferrer">Bedienungsanleitung ↗</a>`:''}<small>Gleisinhalt abgeglichen am ${date(s.checked)}${s.lastSeen&&s.verification==='previous-evidence'?'<br>Produktseite abgerufen am '+date(s.lastSeen)+'; bisheriger Gleisabgleich beibehalten.':''}</small></div>`:'<p>Eigene Eingabe · nicht mit Herstellerangaben abgeglichen.</p>'}</details><div class="set-card-actions"><button class="set-add" data-set-add="${escape(s.key)}">${icon('plus')}Zum Bestand hinzufügen</button>${s.kind==='custom'?`<button class="set-remove text-button" data-set-remove="${escape(s.key)}" aria-label="Vorlage ${escape(s.name)} löschen">Vorlage löschen</button>`:''}</div></article>`;
  }).join('');
  $('#set-more').hidden=list.length<=limit;$('#set-no-results').hidden=!!list.length;$('#set-custom-count').textContent=custom.length;renderUpdate();
 }
 function reportSummary(r){return `${r.added} neu · ${r.changed} mit geändertem Gleisinhalt · ${r.confirmed} Gleislisten bestätigt · ${r.retained} bisherige Abgleiche beibehalten${r.review?' · '+r.review+' zur Prüfung':''}${r.errors?' · '+r.errors+' nicht erreichbar':''}`;}
 function renderUpdate(){
  const meta=getCatalogMeta(),r=meta.report;
  $('#catalog-version').textContent=meta.lastRefresh?'Herstellerstand des geladenen Katalogs: '+date(meta.lastRefresh)+(meta.partial?' · teilweise':''):'Mitgelieferter Stand: '+date(meta.checked);
  $('#catalog-update-start').disabled=!!controller;$('#catalog-update-cancel').hidden=!controller;$('#catalog-update-undo').hidden=!meta.canUndo;$('#catalog-update-undo').disabled=!!controller;
  $('#catalog-update-report').hidden=!r;
  if(!controller)$('#catalog-update-status').textContent=runMessage||(r?reportSummary(r):'Letzten veröffentlichten Katalog laden. Herstellerabgleich täglich und manuell über GitHub Actions. Dein Bestand bleibt erhalten.');
  if(r){$('#catalog-update-report-title').textContent='Abgleichbericht · '+date(r.checkedAt);const priority={added:0,changed:1,review:2,error:3,retained:4,confirmed:5};
   const rows=r.records.filter(x=>x.state!=='confirmed').sort((a,b)=>priority[a.state]-priority[b.state]||a.article.localeCompare(b.article));
   const labels={added:'Neu',changed:'Gleisinhalt geändert',review:'Prüfung nötig',error:'Nicht erreichbar',retained:'Bisheriger Abgleich beibehalten'};
   $('#catalog-update-records').innerHTML=`<p>${escape(reportSummary(r))}</p>${rows.map(x=>`<div class="catalog-change ${x.state}"><span>${labels[x.state]}</span><strong>${escape(x.article)} · ${escape(x.name)}</strong>${x.diff.length?'<p>'+x.diff.map(d=>`${escape(d.part==='basis'?'Basisstation':d.part)}: ${d.before} → ${d.after}`).join(' · ')+'</p>':''}${x.reason?'<p>'+escape(x.reason)+'</p>':''}<a href="https://www.marklin.com/products/details/article/${escape(x.article)}" target="_blank" rel="noopener noreferrer">Herstellerseite ↗</a></div>`).join('')}<p class="catalog-update-footnote">Nicht eindeutig lesbare oder noch nicht unterstützte Gleisinhalte werden nicht übernommen. Bereits gespeicherte Gleisbestände werden auch bei geänderten Set-Inhalten nicht nachträglich angepasst.</p>`;
  }
 }
 $('#catalog-update-start').addEventListener('click',async()=>{
  if(controller)return;controller=new AbortController();runMessage='';renderUpdate();$('#catalog-update-progress').hidden=false;$('#catalog-update-progress').removeAttribute('value');
  try{const report=await refreshCatalog({signal:controller.signal,onProgress:p=>{const progress=$('#catalog-update-progress');if(p.total){progress.max=p.total;progress.value=p.done;}else progress.removeAttribute('value');$('#catalog-update-status').textContent=p.message+(p.total?` ${p.done} / ${p.total}`:'');}});runMessage=reportSummary(report);if(report.review||report.errors||report.changed||report.added)$('#catalog-update-report').open=true;onMessage(report.errors||report.review?'Katalog teilweise aktualisiert. Details im Abgleichbericht.':'Veröffentlichten Katalog in diesem Browser gespeichert.');}
  catch(error){runMessage=error.name==='AbortError'?'Aktualisierung abgebrochen. Der bisherige Katalog bleibt aktiv.':error.message;onMessage(runMessage);}
  finally{controller=null;$('#catalog-update-progress').hidden=true;render();}
 });
 $('#catalog-update-cancel').addEventListener('click',()=>controller?.abort());
 $('#catalog-update-undo').addEventListener('click',()=>{if(controller)return;try{if(undoCatalog()){runMessage='Vorheriger Katalogstand wiederhergestellt. Dein Gleisbestand bleibt unverändert.';render();onMessage(runMessage);}}catch(error){onMessage(error.message);}});
 subscribeCatalog(()=>{render();onCatalogChange();});
 function open(){limit=12;render();$('#catalog-dialog').showModal();$('#set-search').focus();}
 function close(){$('#catalog-dialog').close();document.querySelector('[data-open-catalog]')?.focus();}
 function toggleCustom(open){$('#custom-set-form').hidden=!open;if(open){$('#custom-parts').innerHTML=CATALOG.map(([id,name,geometry])=>`<label><span>${id==='basis'?'Basisstation':id}<small>${escape(name)} · ${escape(geometry)}</small></span><input type="number" min="0" max="200" value="0" data-custom-part="${id}" aria-label="Anzahl ${id} in eigener Vorlage"></label>`).join('');$('#custom-set-name').focus();}}
 $('#catalog-close').addEventListener('click',close);$('#catalog-done').addEventListener('click',close);
 $('#set-search').addEventListener('input',()=>{limit=12;render();});for(const id of ['set-kind','set-archived'])$('#'+id).addEventListener('change',()=>{limit=12;render();});
 $('#set-more').addEventListener('click',()=>{limit+=12;render();});
 $('#set-list').addEventListener('click',e=>{
  const add=e.target.closest('[data-set-add]');if(add){const set=all().find(s=>s.key===add.dataset.setAdd),q=Number($('#set-quantity').value);if(!set)return;try{addInventory(INITIAL,set.parts,q);const total=onAdd(set,q);$('#catalog-feedback').textContent=`${q} × ${set.name} hinzugefügt · ${total} Gleisstücke im Bestand`;add.classList.add('added');setTimeout(()=>add.classList.remove('added'),1300);}catch(error){$('#catalog-feedback').textContent=error.message;onMessage(error.message);}return;}
  const remove=e.target.closest('[data-set-remove]');if(remove){custom=custom.filter(s=>s.key!==remove.dataset.setRemove);persist();render();$('#catalog-feedback').textContent='Eigene Vorlage gelöscht. Dein Gleisbestand bleibt erhalten.';}
 });
 $('#custom-open').addEventListener('click',()=>toggleCustom($('#custom-set-form').hidden));$('#custom-cancel').addEventListener('click',()=>toggleCustom(false));$('#set-missing-create').addEventListener('click',()=>toggleCustom(true));
 $('#custom-set-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#custom-set-name').value.trim(),article=$('#custom-set-article').value.trim(),parts={};
  if(!name){$('#custom-set-name').reportValidity();return;}
  for(const input of document.querySelectorAll('[data-custom-part]')){const n=Number(input.value);if(!Number.isInteger(n)||n<0||n>200){onMessage('Bitte ganze Stückzahlen von 0 bis 200 eingeben.');input.focus();return;}if(n)parts[input.dataset.customPart]=n;}
  if(!Object.keys(parts).length){onMessage('Trage mindestens ein Gleisstück für die Vorlage ein.');return;}if(custom.length>=100){onMessage('Maximal 100 eigene Vorlagen. Lösche zuerst eine nicht mehr benötigte Vorlage.');return;}
  custom.push({key:'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:name.slice(0,80),article:article.slice(0,30),parts,kind:'custom',retired:false,note:'',source:null});persist();toggleCustom(false);$('#set-search').value='';$('#set-kind').value='custom';limit=12;render();$('#custom-set-form').reset();onMessage('Eigene Set-Vorlage gespeichert. Du kannst sie jetzt zum Bestand hinzufügen.');
 });
 $('#catalog-dialog').addEventListener('click',e=>{if(e.target===$('#catalog-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 return {open,render};
}
