const STORAGE_KEY = 'gt7cm_v05_state';
const DEFAULT_CATEGORIES = ['Gr.1','Gr.2','Gr.3','Gr.4','Gr.B','Vision GT','Formula GT7','Road Cars','Kart','Personalizada'];
const DEFAULT_SUBS = ['FIA GT3','Endurance','Ferrari F40 Cup','Deportivos clásicos','JDM 90s','Hot Hatch','Muscle Cars','Supercars modernos','VGT Trophy','Super Formula'];
const RULES = [
  {name:'GT Sprint', tyres:'Racing Hard', fuel:'x2', wear:'x4', bop:'Activado', penalties:'Leves', start:'Parrilla con clasificación'},
  {name:'GT Endurance Light', tyres:'Racing Hard/Medium', fuel:'x4', wear:'x6', bop:'Activado', penalties:'Normales', start:'Parrilla con clasificación'},
  {name:'Road Cars 500-650 PP', tyres:'Sport Medium', fuel:'x1', wear:'x2', bop:'Manual / PP', penalties:'Leves', start:'Parrilla con clasificación'},
  {name:'Ferrari F40 Cup', tyres:'Sport Soft', fuel:'x2', wear:'x3', bop:'Mismo coche', penalties:'Normales', start:'Clasificación + carrera'},
  {name:'Personalizado', tyres:'Libre', fuel:'Libre', wear:'Libre', bop:'Libre', penalties:'Libre', start:'Libre'}
];
const CIRCUITS = ['Trial Mountain','Deep Forest','Grand Valley','Spa-Francorchamps','Suzuka','Fuji','Interlagos','Watkins Glen','Le Mans','Nürburgring Nordschleife','Nürburgring GP','Daytona Road Course','Monza','Red Bull Ring','Barcelona-Catalunya'];
const POINTS = [25,20,16,13,11,10,9,8,7,6,5,4,3,2,1];
let state = loadState();
let currentId = state.activeId || null;
let currentTab = 'overview';

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){ try{return JSON.parse(raw)}catch(e){} }
  return {version:'0.5.0', categories:DEFAULT_CATEGORIES, championships:[], activeId:null};
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); toast('Guardado'); render(); }
function uid(){return Math.random().toString(36).slice(2,10)}
function qs(s){return document.querySelector(s)}
function qsa(s){return [...document.querySelectorAll(s)]}
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; Object.assign(t.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',background:'rgba(5,15,30,.92)',color:'#fff',padding:'10px 14px',borderRadius:'999px',zIndex:99,border:'1px solid rgba(255,255,255,.2)'}); document.body.appendChild(t); setTimeout(()=>t.remove(),1200); }

function createChampionship(data){
  const cat = data.newCategory?.trim() || data.category;
  if(data.newCategory?.trim() && !state.categories.includes(cat)) state.categories.push(cat);
  const nDrivers = Math.min(20, Math.max(2, Number(data.drivers)||20));
  const nRaces = Math.max(1, Number(data.races)||10);
  const rule = RULES.find(r=>r.name===data.ruleTemplate) || RULES[0];
  const drivers = Array.from({length:nDrivers},(_,i)=>({id:uid(), name:i===0?'JDM':`IA ${String(i).padStart(2,'0')}`, car:'', bop: rule.bop, points:0, wins:0, podiums:0, poles:0, fastest:0}));
  const races = Array.from({length:nRaces},(_,i)=>{
    const circuit = CIRCUITS[i % CIRCUITS.length];
    const isNord = data.nord && circuit.includes('Nordschleife');
    return {id:uid(), round:i+1, circuit, type:isNord?'Nordschleife Sprint + Carrera':'Clasificación + Carrera', laps:isNord?'Sprint 1 + Carrera 3':String(8 + (i%5)*2), weather:i%3===0?'Variable':(i%3===1?'Soleado':'Nublado'), time:['Mañana','Tarde','Atardecer'][i%3], sophy:'Preferente si GT7 lo permite', status:'Pendiente', pole:null, fastest:null, results:[]}
  });
  const champ = {id:uid(), name:data.name, season:data.season || new Date().getFullYear(), category:cat, subcategory:data.subcategory || 'General', rule, drivers, races, createdAt:Date.now()};
  state.championships.push(champ); state.activeId = champ.id; currentId = champ.id; saveState(); nav('detail');
}
function champ(){ return state.championships.find(c=>c.id===currentId) || state.championships.find(c=>c.id===state.activeId); }
function nav(id){ qsa('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); qsa('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id)); if(id==='detail') renderDetail(); }
function bind(){
  document.addEventListener('click',e=>{ const navBtn=e.target.closest('[data-nav]'); if(navBtn){nav(navBtn.dataset.nav); render();} const tab=e.target.closest('[data-tab]'); if(tab){currentTab=tab.dataset.tab; qsa('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab)); renderDetail();} const open=e.target.closest('[data-open]'); if(open){currentId=open.dataset.open; state.activeId=currentId; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); nav('detail'); render();} });
  qs('#createForm').addEventListener('submit',e=>{e.preventDefault(); createChampionship(Object.fromEntries(new FormData(e.target)));});
  qs('#quickSave').onclick=saveState; qs('#exportBtn').onclick=exportData; qs('#importInput').onchange=importData; qs('#resetBtn').onclick=()=>{if(confirm('¿Borrar todos los datos locales?')){localStorage.removeItem(STORAGE_KEY); state=loadState(); currentId=null; render(); nav('home');}};
}
function render(){
  const active=champ(); qs('#activeTitle').textContent=active?active.name:'Sin campeonato activo'; qs('#activeMeta').textContent=active?`${active.category} · ${active.subcategory} · ${active.races.filter(r=>r.status==='Completada').length}/${active.races.length} carreras`:'Crea un campeonato para empezar.';
  qs('#statChampionships').textContent=state.championships.length; qs('#statRaces').textContent=state.championships.reduce((a,c)=>a+c.races.length,0);
  renderChampionships(); renderLibrary(); fillSelects();
}
function fillSelects(){
  qs('#categorySelect').innerHTML=state.categories.map(c=>`<option>${c}</option>`).join('');
  qs('#ruleSelect').innerHTML=RULES.map(r=>`<option>${r.name}</option>`).join('');
}
function renderChampionships(){
  const el=qs('#championshipList');
  if(!state.championships.length){el.innerHTML='<article class="glass champ-card"><h3>Aún no hay campeonatos</h3><p class="muted">Crea el primero para empezar a correr en paralelo por categorías.</p></article>';return}
  el.innerHTML=state.championships.map(c=>`<article class="glass champ-card"><p class="eyebrow">${c.season} · ${c.category}</p><h3>${c.name}</h3><p class="muted">${c.subcategory} · ${c.races.filter(r=>r.status==='Completada').length}/${c.races.length} carreras</p><div class="chips"><span class="chip">${c.drivers.length} pilotos</span><span class="chip">${c.rule.name}</span></div><div class="actions"><button class="primary" data-open="${c.id}">Abrir</button><button class="secondary" onclick="duplicateChamp('${c.id}')">Duplicar</button></div></article>`).join('');
}
window.duplicateChamp = id => { const c=state.championships.find(x=>x.id===id); if(!c)return; const copy=JSON.parse(JSON.stringify(c)); copy.id=uid(); copy.name=c.name+' copia'; copy.createdAt=Date.now(); state.championships.push(copy); saveState(); };
function renderLibrary(){
  qs('#libraryCategories').innerHTML=state.categories.map(c=>`<span class="chip">${c}</span>`).join('');
  qs('#librarySubs').innerHTML=DEFAULT_SUBS.map(c=>`<span class="chip">${c}</span>`).join('');
  qs('#libraryRules').innerHTML=RULES.map(r=>`<div class="guide-card"><b>${r.name}</b><p class="muted">Neumáticos: ${r.tyres} · Combustible: ${r.fuel} · Desgaste: ${r.wear} · BoP: ${r.bop}</p></div>`).join('');
}
function renderDetail(){
  const c=champ(); if(!c){nav('championships'); return}
  qs('#detailTitle').textContent=c.name; qs('#detailMeta').innerHTML=[c.season,c.category,c.subcategory,c.rule.name].map(x=>`<span class="chip">${x}</span>`).join('');
  const el=qs('#tabContent');
  if(currentTab==='overview') el.innerHTML=overview(c);
  if(currentTab==='calendar') el.innerHTML=calendar(c);
  if(currentTab==='drivers') el.innerHTML=drivers(c);
  if(currentTab==='gt7') el.innerHTML=gt7Guide(c);
  if(currentTab==='standings') el.innerHTML=standings(c);
}
function overview(c){ const done=c.races.filter(r=>r.status==='Completada').length; const leader=calcStandings(c)[0]; return `<article class="glass card-wide"><p class="eyebrow">Resumen</p><h2>${c.category} · ${c.subcategory}</h2><p class="muted">${done}/${c.races.length} carreras completadas. Líder actual: ${leader?leader.name:'sin resultados'}.</p><div class="actions"><button class="primary" onclick="currentTab='calendar';renderDetail()">Ver calendario</button><button class="secondary" onclick="currentTab='gt7';renderDetail()">Guía GT7</button></div></article><article class="glass card-wide"><h3>Reglamento base</h3><p class="muted">${ruleText(c.rule)}</p></article>` }
function calendar(c){ return c.races.map(r=>`<article class="glass race-card"><p class="eyebrow">Ronda ${r.round}</p><h3>${r.circuit}</h3><div class="chips"><span class="chip">${r.type}</span><span class="chip">${r.laps} vueltas</span><span class="chip">${r.weather}</span><span class="chip">${r.time}</span></div><div class="race-grid"><label>Estado<select onchange="updateRace('${r.id}','status',this.value)"><option ${r.status==='Pendiente'?'selected':''}>Pendiente</option><option ${r.status==='Completada'?'selected':''}>Completada</option></select></label><label>Circuito<input value="${r.circuit}" onchange="updateRace('${r.id}','circuit',this.value)"></label><label>Vueltas<input value="${r.laps}" onchange="updateRace('${r.id}','laps',this.value)"></label><label>Clima<input value="${r.weather}" onchange="updateRace('${r.id}','weather',this.value)"></label></div><button class="secondary" onclick="quickResult('${r.id}')">Introducir resultado rápido</button></article>`).join('') }
window.updateRace=(rid,key,val)=>{const c=champ(); const r=c.races.find(x=>x.id===rid); r[key]=val; saveState(); renderDetail();}
window.quickResult=(rid)=>{const c=champ(); const r=c.races.find(x=>x.id===rid); const order=prompt('Orden de llegada por números de piloto separados por coma. Ejemplo: 1,2,3...'); if(!order)return; const ids=order.split(',').map(n=>c.drivers[Number(n.trim())-1]?.id).filter(Boolean); r.results=ids; r.status='Completada'; recalc(c); saveState(); renderDetail();}
function drivers(c){ return `<article class="glass"><h3>Pilotos y BoP</h3><p class="muted">Edita nombres, coches y BoP. Se guarda en local.</p>${c.drivers.map((d,i)=>`<div class="driver-row"><span class="pos">${i+1}</span><input value="${d.name}" onchange="updateDriver('${d.id}','name',this.value)"><input value="${d.car||''}" placeholder="Coche" onchange="updateDriver('${d.id}','car',this.value)"><input value="${d.bop||''}" placeholder="BoP" onchange="updateDriver('${d.id}','bop',this.value)"></div>`).join('')}</article>` }
window.updateDriver=(id,key,val)=>{const d=champ().drivers.find(x=>x.id===id); d[key]=val; saveState(); renderDetail();}
function gt7Guide(c){ return `<article class="glass card-wide"><p class="eyebrow">Integración con GT7</p><h2>Ajuste base recomendado</h2><p class="muted">Crea en GT7 una carrera personalizada y guárdala con el nombre <b>${c.name}</b>. Usa esta ficha como plantilla y cambia sólo circuito, vueltas y clima en cada ronda.</p><div class="chips"><span class="chip">${c.rule.start}</span><span class="chip">BoP: ${c.rule.bop}</span><span class="chip">Neumáticos: ${c.rule.tyres}</span><span class="chip">Consumo: ${c.rule.fuel}</span><span class="chip">Desgaste: ${c.rule.wear}</span></div></article>${c.races.map(r=>`<article class="glass guide-card"><p class="eyebrow">Ronda ${r.round}</p><h3>${r.circuit}</h3><p class="muted">En GT7 carga el ajuste guardado <b>${c.name}</b> y aplica:</p><ul><li>Tipo: ${r.type}</li><li>Vueltas: ${r.laps}</li><li>Clima: ${r.weather}</li><li>Hora: ${r.time}</li><li>IA: ${r.sophy}</li><li>Parrilla: ${r.type.includes('Nordschleife')?'Sprint por sorteo; carrera según sprint':'según clasificación'}</li></ul></article>`).join('')}` }
function standings(c){ const rows=calcStandings(c); return `<article class="glass"><h3>Clasificación</h3>${rows.map((d,i)=>`<div class="standing-row"><span class="pos">${i+1}</span><b>${d.name}</b><span>${d.points} pts</span><span>${d.wins} vict.</span></div>`).join('')}</article>` }
function recalc(c){ c.drivers.forEach(d=>{d.points=0;d.wins=0;d.podiums=0;d.poles=0;d.fastest=0}); c.races.forEach(r=>{r.results.forEach((id,i)=>{const d=c.drivers.find(x=>x.id===id); if(!d)return; d.points += POINTS[i]||0; if(i===0)d.wins++; if(i<3)d.podiums++;}); if(r.pole){const d=c.drivers.find(x=>x.id===r.pole); if(d){d.points+=1;d.poles++}} if(r.fastest){const d=c.drivers.find(x=>x.id===r.fastest); if(d){d.points+=1;d.fastest++}} }); }
function calcStandings(c){ recalc(c); return [...c.drivers].sort((a,b)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums); }
function ruleText(r){return `Neumáticos ${r.tyres}, consumo ${r.fuel}, desgaste ${r.wear}, BoP ${r.bop}, sanciones ${r.penalties}, salida: ${r.start}.`}
function exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='gt7-championship-manager-backup.json'; a.click(); }
function importData(e){ const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{try{state=JSON.parse(reader.result); localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); currentId=state.activeId; render(); toast('Importado');}catch(err){alert('Archivo no válido')}}; reader.readAsText(file); }
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});} bind(); render();
