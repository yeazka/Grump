'use strict';
const ADDONS={todo:{label:'To-do',labelId:'Tugas',icon:'check'},notes:{label:'Notes',labelId:'Catatan',icon:'file'},prayer:{label:'Prayer',labelId:'Sholat',icon:'moon'},water:{label:'Water',labelId:'Minum',icon:'drop'},bookmarks:{label:'Bookmarks',labelId:'Bookmark',icon:'bookmark'}};
let addonState={selected:[],city:'Jakarta',waterMinutes:45,waterEnabled:false,prayerEnabled:false,prayer:null,waterNextAt:0};
let addonProductivity={tasks:[],notes:[]};
let addonManage=false;
let addonRenderKey='';
let addonPickTarget='';
let noteEditor=null;
let todoClearArmedUntil=0;
let todoClearTimer=null;
let todoDraftText='';
const PRAYER_LABELS_ID={Fajr:'Subuh',Dhuhr:'Dzuhur',Asr:'Ashar',Maghrib:'Maghrib',Isha:'Isya'};
const PRAYER_LABELS_EN={Fajr:'Fajr',Dhuhr:'Dhuhr',Asr:'Asr',Maghrib:'Maghrib',Isha:'Isha'};
const getPrayerLabels=()=>isId()?PRAYER_LABELS_ID:PRAYER_LABELS_EN;
let previewPrayerId='';
const PRAYER_THEMES={
  Fajr:{sky:['#1e1b4b','#6d28d9','#f472b6'],dome:['#a78bfa','#4c1d95'],win:'#fde68a',beam:'rgba(167,139,250,.62)',surface:['rgba(76,29,149,.82)','rgba(30,27,75,.76)'],edge:'rgba(196,181,253,.78)'},
  Dhuhr:{sky:['#0284c7','#38bdf8','#bae6fd'],dome:['#38bdf8','#0369a1'],win:'#e0f2fe',beam:'rgba(56,189,248,.68)',surface:['rgba(2,132,199,.82)','rgba(3,105,161,.76)'],edge:'rgba(186,230,253,.8)'},
  Asr:{sky:['#1e3a8a','#d97706','#fde68a'],dome:['#fbbf24','#b45309'],win:'#fef3c7',beam:'rgba(245,158,11,.62)',surface:['rgba(180,83,9,.84)','rgba(120,53,15,.76)'],edge:'rgba(253,230,138,.8)'},
  Maghrib:{sky:['#1e1b4b','#be185d','#fb923c'],dome:['#fb7185','#881337'],win:'#fef08a',beam:'rgba(249,115,22,.68)',surface:['rgba(190,24,93,.82)','rgba(124,45,18,.78)'],edge:'rgba(253,186,116,.82)'},
  Isha:{sky:['#0f172a','#1e3a8a','#1d4ed8'],dome:['#60a5fa','#1d4ed8'],win:'#fef08a',beam:'rgba(56,189,248,.68)',surface:['rgba(30,58,138,.84)','rgba(15,23,42,.78)'],edge:'rgba(147,197,253,.78)'}
};
function buildPrayerIllust(prayerId='Isha'){
  const p=PRAYER_THEMES[prayerId]?prayerId:'Isha';
  const t=PRAYER_THEMES[p];
  let celestial='';
  if(p==='Fajr'){
    celestial=`<circle class="p-star s1" cx="18" cy="18" r="1.3" fill="#fef08a"/><circle class="p-star s2" cx="48" cy="14" r="1.1" fill="#fbcfe8"/><ellipse class="p-moon-float" cx="54" cy="84" rx="38" ry="18" fill="rgba(251,113,133,0.38)"/><circle class="p-moon-float" cx="72" cy="54" r="9" fill="url(#pGoldGrad)" opacity="0.88"/><path class="p-cloud-drift" d="M22 46 Q32 40 42 44 Q52 39 62 46 Z" fill="rgba(251,207,232,0.32)"/>`;
  }else if(p==='Dhuhr'){
    celestial=`<g class="p-moon-float"><circle cx="71" cy="24" r="15" fill="rgba(254,240,138,0.28)"/><circle cx="71" cy="24" r="10" fill="url(#pGoldGrad)"/></g><path class="p-cloud-drift" d="M14 34 Q24 26 34 31 Q44 25 54 34 Z" fill="rgba(255,255,255,0.72)"/><path class="p-cloud-drift" d="M48 50 Q58 43 68 47 Q76 43 84 50 Z" fill="rgba(255,255,255,0.55)"/>`;
  }else if(p==='Asr'){
    celestial=`<g class="p-moon-float"><circle cx="72" cy="38" r="14" fill="rgba(251,191,36,0.28)"/><circle cx="72" cy="38" r="9.5" fill="url(#pGoldGrad)"/></g><path class="p-cloud-drift" d="M16 32 Q26 25 36 29 Q46 24 56 32 Z" fill="rgba(254,243,199,0.52)"/><path class="p-cloud-drift" d="M44 52 Q54 46 64 49 Q74 45 84 52 Z" fill="rgba(253,230,138,0.42)"/>`;
  }else if(p==='Maghrib'){
    celestial=`<circle class="p-star s1" cx="20" cy="16" r="1.2" fill="#fde68a"/><g class="p-moon-float"><circle cx="67" cy="64" r="16" fill="rgba(251,146,60,0.35)"/><circle cx="67" cy="64" r="11" fill="url(#pGoldGrad)"/></g><path class="p-cloud-drift" d="M14 40 Q26 33 38 37 Q48 32 58 40 Z" fill="rgba(253,186,116,0.38)"/><path class="p-cloud-drift" d="M48 26 Q51 23 54 26 Q57 23 60 26" fill="none" stroke="rgba(254,215,170,0.7)" stroke-width="1.3" stroke-linecap="round"/>`;
  }else{
    celestial=`<circle class="p-star s1" cx="15" cy="18" r="1.4" fill="#fef08a"/><circle class="p-star s2" cx="46" cy="14" r="1.2" fill="#bae6fd"/><circle class="p-star s3" cx="84" cy="40" r="1.4" fill="#fef08a"/><circle class="p-star s4" cx="14" cy="48" r="1.1" fill="#bae6fd"/><g class="p-lantern-swing"><line x1="28" y1="0" x2="28" y2="21" stroke="rgba(254,240,138,0.65)" stroke-width="1.2"/><path d="M23.5 21 H32.5 L34.5 29 L28 38 L21.5 29 Z" fill="url(#pGoldGrad)"/><circle cx="28" cy="28" r="2.6" fill="#fff"/></g><g class="p-moon-float"><path d="M68 14 A11.5 11.5 0 1 0 80 30 A9.2 9.2 0 1 1 68 14 Z" fill="url(#pGoldGrad)"/></g><path class="p-cloud-drift" d="M48 48 Q56 42 64 46 Q72 41 80 48 Z" fill="rgba(147,197,253,0.22)"/>`;
  }
  return `<div class="prayer-2d-card" data-prayer-theme="${p}" aria-hidden="true"><svg viewBox="0 0 98 120" class="prayer-scene-svg"><defs><linearGradient id="pSkyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t.sky[0]}"/><stop offset="55%" stop-color="${t.sky[1]}"/><stop offset="100%" stop-color="${t.sky[2]}"/></linearGradient><linearGradient id="pDomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t.dome[0]}"/><stop offset="100%" stop-color="${t.dome[1]}"/></linearGradient><linearGradient id="pGoldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="98" height="120" rx="18" fill="url(#pSkyGrad)"/>${celestial}<rect x="19" y="50" width="7" height="54" rx="1.5" fill="#1e293b"/><path d="M17.5 50 L22.5 38 L27.5 50 Z" fill="${t.dome[0]}"/><line x1="22.5" y1="34" x2="22.5" y2="38" stroke="#fef08a" stroke-width="1.3" stroke-linecap="round"/><path d="M29 88 C29 62 79 62 79 88 Z" fill="url(#pDomeGrad)"/><line x1="54" y1="54" x2="54" y2="62" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/><circle cx="54" cy="53.5" r="1.6" fill="#fef08a"/><rect x="14" y="86" width="70" height="34" fill="#0f172a"/><rect x="38" y="93" width="5.5" height="12" rx="2.75" fill="${t.win}" opacity="0.85"/><rect x="50.5" y="91" width="6.5" height="14" rx="3.25" fill="${t.win}"/><rect x="64" y="93" width="5.5" height="12" rx="2.75" fill="${t.win}" opacity="0.85"/></svg></div>`;
}
function updatePrayerMiniIcon(prayerId='Isha'){
  const p=PRAYER_THEMES[prayerId]?prayerId:'Isha';
  const t=PRAYER_THEMES[p];
  const host=$('#v-prayernotice .prayer-notice-2d');
  if(!host)return;
  island.style.setProperty('--prayer-notice-a',t.surface[0]);
  island.style.setProperty('--prayer-notice-b',t.surface[1]);
  island.style.setProperty('--prayer-notice-edge',t.edge);
  island.style.setProperty('--prayer-notice-beam',t.beam);
  island.dataset.prayerTheme=p.toLowerCase();
  const celestial=p==='Dhuhr'||p==='Asr'
    ?`<g class="p-moon-float"><circle cx="33" cy="${p==='Dhuhr'?14:18}" r="6" fill="url(#pMoonMini)"/><circle cx="33" cy="${p==='Dhuhr'?14:18}" r="8.5" fill="rgba(254,240,138,0.28)"/></g><path class="p-cloud-drift" d="M8 21 Q12 17 16 19 Q20 17 23 21 Z" fill="rgba(255,255,255,0.65)"/>`
    :p==='Maghrib'
    ?`<g class="p-moon-float"><circle cx="32" cy="25" r="6.5" fill="url(#pMoonMini)"/></g><path class="p-cloud-drift" d="M8 20 Q12 17 16 19 Q20 17 23 20 Z" fill="rgba(253,186,116,0.45)"/>`
    :p==='Fajr'
    ?`<circle class="p-star s1" cx="14" cy="13" r="1.2" fill="#fef08a"/><g class="p-moon-float"><circle cx="33" cy="23" r="5.5" fill="url(#pMoonMini)" opacity="0.9"/></g><path class="p-cloud-drift" d="M8 22 Q12 19 16 21 Q20 19 23 22 Z" fill="rgba(251,207,232,0.38)"/>`
    :`<circle class="p-star s1" cx="13" cy="14" r="1.2" fill="#fef08a"/><circle class="p-star s2" cx="35" cy="12" r="1" fill="#bae6fd"/><circle class="p-star s3" cx="24" cy="9" r="1.3" fill="#fef08a"/><g class="p-moon-float"><path d="M29 11 A7.5 7.5 0 1 0 36 21 A6 6 0 1 1 29 11 Z" fill="url(#pMoonMini)"/></g><path class="p-cloud-drift" d="M8 23 Q11 20 14 22 Q17 20 19 23 Z" fill="rgba(186,230,253,0.28)"/>`;
  host.innerHTML=`<svg viewBox="0 0 48 48" class="prayer-mini-svg"><defs><linearGradient id="pSkyMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t.sky[0]}"/><stop offset="55%" stop-color="${t.sky[1]}"/><stop offset="100%" stop-color="${t.sky[2]}"/></linearGradient><linearGradient id="pMoonMini" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient><linearGradient id="pDomeMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t.dome[0]}"/><stop offset="100%" stop-color="${t.dome[1]}"/></linearGradient><clipPath id="pCircleClip"><circle cx="24" cy="24" r="21"/></clipPath></defs><g clip-path="url(#pCircleClip)"><circle cx="24" cy="24" r="21" fill="url(#pSkyMini)"/>${celestial}<rect x="11" y="25" width="3.2" height="17" rx="1" fill="#1e293b"/><path d="M10.5 25 L12.6 20.5 L14.7 25 Z" fill="${t.dome[0]}"/><path d="M15 36 C15 27.5 33 27.5 33 36 Z" fill="url(#pDomeMini)"/><line x1="24" y1="24.5" x2="24" y2="28" stroke="#fef08a" stroke-width="1.3" stroke-linecap="round"/><rect x="13" y="35.5" width="22" height="10" fill="#0f172a"/><rect x="19" y="37.5" width="2.6" height="5" rx="1.3" fill="${t.win}" opacity="0.85"/><rect x="23" y="37" width="3" height="5.5" rx="1.5" fill="${t.win}"/><rect x="27.4" y="37.5" width="2.6" height="5" rx="1.3" fill="${t.win}" opacity="0.85"/></g></svg>`;
}
function nextPrayerId(prayer,now=new Date()){
  if(!prayer?.times||!prayer.timezone)return null;
  let parts;
  try{parts=new Intl.DateTimeFormat('en-GB',{timeZone:prayer.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);}catch{return null;}
  const value=type=>parts.find(part=>part.type===type)?.value;
  if(`${value('year')}-${value('month')}-${value('day')}`!==prayer.date)return null;
  const minute=Number(value('hour'))*60+Number(value('minute'));
  for(const id of Object.keys(PRAYER_LABELS_EN)){
    const match=String(prayer.times[id]||'').match(/^(\d{2}):(\d{2})/);
    if(match&&Number(match[1])*60+Number(match[2])>minute)return id;
  }
  return 'Fajr';
}
function syncTodoFade(){const list=$('#v-todo .todo-list');if(list)list.classList.toggle('has-more',list.scrollHeight>list.clientHeight+2&&list.scrollTop+list.clientHeight<list.scrollHeight-2);}
function syncAddonState(next){
  if(!next)return;
  const oldPages=S.addonPages.join(',');
  addonState=next;
  S.addonPages=Object.keys(ADDONS).filter(id=>next.selected?.includes(id));
  addonRenderKey='';
  const allAdded = S.addonPages.length >= Object.keys(ADDONS).length;
  if (allAdded) addonManage = false;
  if (allAdded && S.view === 'addons') S.view = addonPickTarget || next.selected?.at(-1) || 'home';
  if (S.expanded && (curKey === 'addons' || S.view === 'addons') && allAdded) { go(addonPickTarget || next.selected?.at(-1) || 'home'); return; }
  if(S.expanded && ADDONS[curKey] && !S.addonPages.includes(curKey)){go(S.addonPages[0]||'addons');return;}
  if(oldPages!==S.addonPages.join(','))layout();else renderAddons();
  if(curKey==='bookmarks')renderBookmarks();
}
function renderAddons(){
  if(!['addons',...Object.keys(ADDONS)].includes(curKey))return;
  if(curKey==='notes' && noteEditor)return;
  if(curKey==='todo' && $('#addon-task-form .todo-schedule')?.hidden===false)return;
  const selected=addonState.selected||[];
  const nextPrayer=nextPrayerId(addonState.prayer);
  const activePrayer=previewPrayerId||nextPrayer||'Isha';
  const idLang=isId();
  const key=JSON.stringify([idLang,selected,addonManage,addonState.city,addonState.locationMode,addonState.waterMinutes,addonState.waterEnabled,addonState.waterNextAt,addonState.water,addonState.prayerEnabled,addonState.prayerStatus,addonState.prayer,nextPrayer,activePrayer,addonProductivity.tasks,addonProductivity.notes]);
  if(key===addonRenderKey)return;
  addonRenderKey=key;
  const missing=Object.entries(ADDONS).filter(([id])=>!selected.includes(id));
  const picker=addonManage
    ?missing.map(([id,v])=>`<button class="addon-pick" data-act="addonpick" data-feature="${id}"><span data-ico="${v.icon}"></span><span>${idLang?v.labelId:v.label}</span><span data-ico="plus"></span></button>`).join('')
    :`<button class="addon-empty" data-act="addonmanage"><span data-ico="plus"></span><span>${idLang?'Tambah fitur':'Add features'}</span></button>`;
  setHTML('addon-picker',picker);
  const tasks=addonProductivity.tasks||[];
  const completed=tasks.filter(t=>t.done).length;
  const open=tasks.length-completed;
  const percent=tasks.length?Math.round(completed/tasks.length*100):0;
  const previousTodoScroll=$('#v-todo .todo-list')?.scrollTop||0;
  const existingInput=$('#addon-task-form input[name="text"]');
  if(existingInput)todoDraftText=existingInput.value;
  setText('todo-open-count',idLang?`${open} aktif`:`${open} open`);
  setText('todo-done-count',idLang?`${completed} selesai`:`${completed} done`);
  const clearButton=$('#v-todo .todo-clear');
  clearButton.hidden=!tasks.length;
  clearButton.dataset.confirm=Date.now()<todoClearArmedUntil?'1':'0';
  clearButton.querySelector('.todo-clear-label').textContent=clearButton.dataset.confirm==='1'?(idLang?'Yakin?':'Sure?'):(idLang?'Hapus':'Clear');
  clearButton.setAttribute('aria-label',clearButton.dataset.confirm==='1'?(idLang?'Konfirmasi hapus semua tugas':'Confirm clearing all tasks'):(idLang?'Hapus semua tugas':'Clear all tasks'));
  const sortedTasks=[...tasks].sort((a,b)=>Number(a.done)-Number(b.done));
  setHTML('addon-todo-body',`<form class="addon-form todo-form aic-composer-card" id="addon-task-form" novalidate><div class="todo-entry aic-prompt-row"><input name="text" class="aic-prompt-input" maxlength="500" value="${esc(todoDraftText)}" placeholder="${idLang?'Tambah tugas baru…':'Add a new task…'}" aria-label="${idLang?'Tugas baru':'New task'}" autocomplete="off"><button type="button" class="aic-pill-control aic-add-files-btn todo-remind-toggle" data-act="todoremind" aria-label="${idLang?'Atur pengingat':'Set reminder'}" title="${idLang?'Atur pengingat':'Set reminder'}"><svg width="12.5" height="12.5" viewBox="0 0 16 16" fill="none" class="aic-plus-ico"><path d="M8 2.5V13.5M2.5 8H13.5" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/></svg><span class="aic-add-files-label">${idLang?'Ingatkan':'Remind'}</span></button><button type="submit" class="aic-submit-btn ${todoDraftText.trim()?'ready':''}" aria-label="${idLang?'Tambah tugas':'Add task'}" title="${idLang?'Tambah tugas':'Add task'}"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 12.8V3.2M8 3.2L3.8 7.4M8 3.2L12.2 7.4" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="todo-schedule aic-glass-popover" hidden><input name="date" type="date" aria-label="Reminder date"><input name="time" type="time" aria-label="Reminder time"></div></form><div class="todo-list" role="list" aria-label="Tasks">${sortedTasks.length?sortedTasks.slice(0,20).map(t=>`<div class="todo-row aic-model-row ${t.done?'is-done':''}" data-id="${esc(t.id)}" role="listitem"><input type="checkbox" data-task-toggle="${esc(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'Mark incomplete':'Complete'}: ${esc(t.text)}"><span class="todo-text" title="${esc(t.text)}">${esc(t.text)}</span>${t.remindAt?`<span class="todo-due" title="Reminder: ${esc(new Date(t.remindAt).toLocaleString())}">${esc(new Date(t.remindAt).toLocaleString(idLang?'id-ID':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</span>`:''}<button type="button" class="todo-del-btn" data-act="addontaskdelete" data-id="${esc(t.id)}" aria-label="Delete: ${esc(t.text)}" title="${idLang?'Hapus tugas':'Delete task'}"><span data-ico="close"></span></button></div>`).join(''):`<div class="todo-empty">${idLang?'Belum ada tugas. Tambahkan di atas.':'No tasks yet. Add one above.'}</div>`}</div><div class="todo-progress"><div class="todo-progress-meta"><span>${idLang?`${completed} dari ${tasks.length} selesai`:`${completed} of ${tasks.length} completed`}</span><span>${percent}%</span></div><div class="todo-progress-track" role="progressbar" aria-label="To-do progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div></div>`);
  const todoList=$('#v-todo .todo-list');if(todoList){todoList.scrollTop=previousTodoScroll;todoList.addEventListener('scroll',syncTodoFade,{passive:true});requestAnimationFrame(syncTodoFade);}
  setHTML('addon-notes-body',`<div class="note-list">${addonProductivity.notes.length?addonProductivity.notes.map(n=>`<div class="note-row"><button class="note-open" data-act="noteopen" data-id="${esc(n.id)}"><b>${esc(n.text.split('\n')[0]||(idLang?'Tanpa judul':'Untitled'))}</b><span>${esc(n.text.split('\n').slice(1).join(' ').trim()||(idLang?'Tidak ada teks tambahan':'No additional text'))}</span></button><button class="note-delete" data-act="addonnotedelete" data-id="${esc(n.id)}" aria-label="${idLang?'Hapus catatan':'Delete note'}"><span data-ico="trash"></span></button></div>`).join(''):`<div class="addon-hint">${idLang?'Belum ada catatan. Buat baru di atas.':'No notes yet. Create one above.'}</div>`}</div>`);
  const times=addonState.prayer?.times;
  const prayerLabels=getPrayerLabels();
  setHTML('prayer-city-badge',`<span data-ico="location" aria-hidden="true"></span>${esc(addonState.city)}`);
  const prayerIllust=buildPrayerIllust(activePrayer);
  setHTML('addon-prayer-body',times?`<div class="prayer-content">${prayerIllust}<div class="prayer-times" aria-label="${idLang?'Jadwal sholat hari ini':'Today prayer times'}">${Object.entries(prayerLabels).map(([id,name])=>`<div class="prayer-time ${id===activePrayer?'next':''}" data-act="prayerpreview" data-prayer-id="${id}" ${id===nextPrayer?'aria-current="true"':''}><span class="prayer-time-dot" aria-hidden="true"></span><span>${name}</span><b>${esc(times[id]||'—')}</b></div>`).join('')}</div></div>`:`<div class="prayer-content">${prayerIllust}<div class="prayer-loading"><span>${addonState.prayerStatus==='unavailable'?(idLang?'Jadwal belum tersedia.':'Schedule unavailable.'):(idLang?'Memuat jadwal sholat…':'Loading prayer times…')}</span></div></div>`);
  const next=addonState.waterEnabled&&addonState.waterNextAt?new Date(addonState.waterNextAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
  const waterIllust=`<button type="button" class="water-illust" data-act="waterpagedrink" aria-label="${idLang?'Minum segelas (+200 ml)':'Drink a glass (+200 ml)'}">${waterGlassSvg(addonState.water,waterMood(addonState.water))}</button>`;  setHTML('addon-water-body',`<div class="water-panel-grid">${waterIllust}<div class="water-info-col"><div class="water-primary-row"><div class="water-next"><span>${addonState.waterEnabled?(idLang?'Pengingat berikutnya':'Next reminder'):(idLang?'Status':'Status')}</span><strong>${addonState.waterEnabled?esc(next):(idLang?'Dijeda':'Paused')}</strong></div><div class="water-controls"><button class="addon-toggle ${addonState.waterEnabled?'on':''}" data-act="addonwater" aria-label="${addonState.waterEnabled?'Turn off':'Turn on'} water reminders">${addonState.waterEnabled?(idLang?'Aktif':'On'):(idLang?'Mati':'Off')}</button><button type="button" class="water-reset" data-act="waterreset" aria-label="${idLang?'Atur ulang air hari ini':'Reset today water'}" title="${idLang?'Atur ulang air hari ini':'Reset today water'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4.8h4.8"/></svg></button></div></div><div class="addon-interval"><span>${idLang?'Ingatkan setiap':'Remind every'}</span><div class="water-stepper" role="group" aria-label="Water reminder interval"><button type="button" data-act="waterstep" data-dir="-1" aria-label="${idLang?'Lebih sering':'Shorter interval'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><output>${idLang?addonState.waterMinutes+' menit':addonState.waterMinutes+' min'}</output><button type="button" data-act="waterstep" data-dir="1" aria-label="${idLang?'Lebih jarang':'Longer interval'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div></div><div class="water-summary"><div><strong>${idLang?'Target harian':'Daily target'}</strong><span>${waterProgressText(idLang)}</span></div><p>${idLang?'Minum sedikit secara berkala membantu menjaga fokus.':'Small, regular sips help maintain focus.'}</p></div></div></div>`);

  setIco($('#v-addons'));for(const id of Object.keys(ADDONS))setIco($('#v-'+id));
}
renderers.push(renderAddons);
setInterval(()=>{if(curKey==='prayer')renderAddons();},15000);
bridge.onAddonState?.(syncAddonState);
// ---------- Water: shared glass drawing, daily progress and the reminder pill ----------
let waterGlassSeq=0;
const waterLiters=ml=>(ml/1000).toFixed(1);
function waterProgressText(idLang){
  const w=addonState.water||{ml:0,goalMl:2000,stepMl:200};
  const l=ml=>idLang?waterLiters(ml).replace('.',','):waterLiters(ml);
  const done=Math.round(w.ml/w.stepMl),total=Math.round(w.goalMl/w.stepMl);
  return idLang?`${l(w.ml)} / ${l(w.goalMl)} L · ${done} dari ${total} gelas`:`${l(w.ml)} / ${l(w.goalMl)} L · ${done} of ${total} glasses`;
}
function waterMood(view){
  if(!view)return 'neutral';
  if(view.full)return 'full';
  if(view.missed>=2)return 'furious';
  if(view.ml===0||view.missed>=1)return 'angry';
  return 'neutral';
}
// "Paper Soda" glass (see DESIGN.md): cream outline, aqua-to-teal liquid, cloud-shaped ice, foam when full, striped straw.
function waterGlassSvg(view,mood){
  const fill=view?Math.min(1,view.ml/Math.max(1,view.goalMl)):0,n=++waterGlassSeq;
  const cup='M7 14H53L48.6 74.2Q48.2 77 45.4 77H14.6Q11.8 77 11.4 74.2Z';
  const cloud='M-5.5 3.2C-9 3.4-9.4-2.2-5.4-2.4-4.6-6.6 1.8-6.8 3-2.8 7.4-3.6 9.2 1.8 5.6 3.2Z';
  const ice=(x,y,s,d)=>`<g transform="translate(${x} ${y}) scale(${s})"><g class="wg-ice" style="--d:${d}"><path class="ice" d="${cloud}"/><path class="ice-hi" d="M-3.4 -0.6Q-2.2 -2.6 -0.4 -2.2"/></g></g>`;
  return `<svg class="wg" viewBox="0 0 60 84" data-mood="${mood}" style="--fill:${fill.toFixed(3)}" aria-hidden="true"><defs><clipPath id="wgc${n}"><path d="${cup}"/></clipPath><linearGradient id="wgw${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#92e6dd"/><stop offset="1" stop-color="#2f93ad"/></linearGradient></defs>`
    +`<ellipse class="wg-shadow" cx="30" cy="80.5" rx="18" ry="2.6"/>`
    +`<g class="wg-foam"><path d="M8.5 14C5 6.5 12 5 15.6 8.6 16.4 1.4 25.6-.6 29.6 4.4 34.4-1 44.4 1 44.8 8.4 51.6 7 55 12.6 51.6 14Z"/><path class="foam-hi" d="M17 9.4Q19 6.6 22 7M33 6.6Q36 4.8 39 6.4"/></g>`
    +`<g clip-path="url(#wgc${n})"><rect class="wg-body" x="5" y="12" width="50" height="68"/><g class="wg-water"><path class="wg-wave b" d="M-10 20Q8 15 26 20T62 20T98 20V96H-10Z" fill="#b6efe8" opacity=".8"/><path class="wg-wave f" d="M-14 23Q4 28 22 23T58 23T94 23V96H-14Z" fill="url(#wgw${n})"/>`
    +ice(21,34,1.15,0)+ice(40,42,1,.9)+ice(27,56,.8,1.7)
    +`<circle class="wg-bub b1" cx="17" cy="62" r="1.3"/><circle class="wg-bub b2" cx="40" cy="66" r="1"/><circle class="wg-bub b3" cx="31" cy="64" r="1.6"/><circle class="wg-bub b4" cx="24" cy="48" r=".9"/></g>`
    +`<rect class="wg-base" x="9" y="66" width="42" height="12"/><rect class="wg-base-mark" x="13.4" y="68.6" width="4.6" height="6" rx="1"/><rect class="wg-base-mark" x="42" y="68.6" width="4.6" height="6" rx="1"/></g>`
    +`<path class="wg-shine" d="M11.6 22 14.6 58"/><path class="wg-rim" d="${cup}"/><path class="wg-lip" d="M7.6 17.4Q30 21.6 52.4 17.4"/>`
    +`<g class="wg-straw"><path class="s-base" d="M35 30 43.5 6 52 3.4"/><path class="s-blue" d="M35 30 43.5 6 52 3.4"/><path class="s-yellow" d="M35 30 43.5 6 52 3.4"/></g>`
    +`<g class="wg-face"><g class="f-neutral"><circle cx="24" cy="46" r="2.3"/><circle cx="36" cy="46" r="2.3"/><path d="M26.2 51.6Q30 54.4 33.8 51.6"/></g><g class="f-tired"><path class="xeye" d="M20.5 43 27 49M27 43 20.5 49M33 43 39.5 49M39.5 43 33 49"/><path class="mouth-line" d="M25 53.6H35"/><path class="tongue" d="M27.5 54.2V62.5A3.2 3.2 0 0 0 34 62.5V54.2Z"/></g><g class="f-happy"><path class="eye" d="M20.5 47.4Q24 42.4 27.5 47.4M32.5 47.4Q36 42.4 39.5 47.4"/><path class="mouth" d="M24 51.4Q30 59 36 51.4Z"/><ellipse class="cheek" cx="19" cy="52.6" rx="3" ry="1.8"/><ellipse class="cheek" cx="41" cy="52.6" rx="3" ry="1.8"/></g></g>`
    +`<path class="wg-sweat" d="M45 33Q48.5 38 45 40.5Q41.5 38 45 33Z"/><path class="wg-spark s1" d="M55 24l1.4 3.6L60 29l-3.6 1.4L55 34l-1.4-3.6L50 29l3.6-1.4Z"/><path class="wg-spark s2" d="M5 30l1 2.6 2.6 1-2.6 1L5 37.2l-1-2.6-2.6-1 2.6-1Z"/></svg>`;
}let waterPill=null;
function waterPillTexts(){
  const st=waterPill,v=st.view,idLang=isId();
  const waterCopyId={'DRINK NOW!':'MINUM SEKARANG!','HYDRATE, DRY HUMAN.':'HAUS KOK BANDEL.',"SIP. DON'T ARGUE.":'TEGUK. JANGAN NGEYEL.','WATER BEFORE U CRASH.':'MINUM SEBELUM TUMBANG.'};
  let title;
  if(st.answered)title=v.full?(idLang?'Target tercapai!':'Goal reached!'):(idLang?`Segar! +${v.stepMl} ml`:`Fresh! +${v.stepMl} ml`);
  else if(v.full)title=idLang?'Tetap minum ya!':'Keep sipping!';
  else if(v.missed>=2)title=idLang?'KAMU LUPA MINUM TERUS!':'YOU KEEP IGNORING ME!';
  else if(v.ml===0||v.missed>=1)title=idLang?'BELUM MINUM NIH!':'NOT A SIP YET!';
  else title=idLang?(waterCopyId[st.title]||'MINUM SEKARANG!'):(st.title||'DRINK NOW!');
  const l=ml=>idLang?waterLiters(ml).replace('.',','):waterLiters(ml);
  const detail=(v.full&&!st.answered?(idLang?'Gelas penuh hari ini · ':'Full for today · '):'')+`${l(v.ml)} / ${l(v.goalMl)} L`;
  return {title,detail};
}
function paintWaterPill(initial){
  const st=waterPill;if(!st)return;
  const v=st.view,mood=st.answered?(v.full?'full':'happy'):waterMood(v);
  const host=$('#wp-glass');
  if(initial||!host.querySelector('svg')){
    host.innerHTML=waterGlassSvg({...v,ml:0},mood);   // starts empty, then fills
    const svg=host.querySelector('svg');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{svg.style.setProperty('--fill',Math.min(1,v.ml/v.goalMl).toFixed(3));}));
  }else{
    const svg=host.querySelector('svg');svg.dataset.mood=mood;svg.style.setProperty('--fill',Math.min(1,v.ml/v.goalMl).toFixed(3));
  }
  host.querySelector('svg').dataset.mood=mood;
  const text=waterPillTexts();
  setText('water-notice-title',text.title);setText('water-notice-detail',text.detail);
  $('#wp-actions').hidden=v.full||st.answered;
  setText('wp-yes',isId()?'Aku minum':'I drank');setText('wp-later',isId()?'Nanti':'Later');
  const popup=$('#v-waternotice');if(popup)popup.dataset.mood=mood;
}
function showWaterPill(event){
  const view=event.water||{ml:0,goalMl:2000,stepMl:200,missed:0,full:false};
  waterPill={view:{...view},preview:event.preview===true,answered:false,title:event.title||''};
  paintWaterPill(true);
  showMiniPopup('waternotice',view.full?7000:25000);
}
/* The sip: the glass tips towards you, rings spread from it, droplets leave in arcs, a wave of water crosses the pill and a few stars settle. */
function burstWaterBubbles(){
  const host=$('#wp-bubbles'),popup=$('#v-waternotice');if(!host)return;
  host.replaceChildren();
  const make=(tag,css,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;el.style.cssText=css;host.append(el);return el;};
  make('b','','wp-wash');
  for(let i=0;i<3;i++)make('s',`--i:${i}`,'wp-ring');
  for(let i=0;i<9;i++){
    const spread=(i/8)*2-1,size=3+Math.random()*3.5;
    make('u',`--tx:${(spread*118+Math.random()*30).toFixed(0)}px;--up:${(-(18+Math.random()*20)).toFixed(0)}px;--down:${(10+Math.random()*16).toFixed(0)}px;--dl:${(0.16+i*0.045).toFixed(2)}s;width:${size.toFixed(1)}px;height:${(size*1.35).toFixed(1)}px`,'wp-drop');
  }
  for(let i=0;i<12;i++){
    const size=3+Math.random()*7;
    make('i',`left:${(8+Math.random()*84).toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;--dx:${(Math.random()*30-15).toFixed(1)}px;--dur:${(1.1+Math.random()*0.9).toFixed(2)}s;animation-delay:${(0.25+Math.random()*0.55).toFixed(2)}s`);
  }
  [[78,28],[64,70],[88,62]].forEach(([x,y],i)=>make('em',`left:${x}%;top:${y}%;--dl:${(0.9+i*0.22).toFixed(2)}s`,'wp-star'));
  if(popup){popup.classList.remove('is-drinking');void popup.offsetWidth;popup.classList.add('is-drinking');}
  setTimeout(()=>{host.replaceChildren();popup?.classList.remove('is-drinking');},3000);
}
acts.waterdrink=async()=>{
  const st=waterPill;if(!st||st.answered)return;
  st.answered=true;
  const next=Math.min(st.view.goalMl,st.view.ml+st.view.stepMl);
  st.view={...st.view,ml:next,missed:0,full:next>=st.view.goalMl};   // optimistic: the glass fills right away
  paintWaterPill(false);
  burstWaterBubbles();
  clearTimeout(miniPopupTimer);miniPopupTimer=setTimeout(()=>dismissMiniPopup(),st.view.full?4200:3000);
  if(!st.preview){try{const result=await bridge.addonCommand?.('water-drink');if(result)syncAddonState(result);}catch{}}
};
acts.waterlater=async()=>{
  const st=waterPill;
  dismissMiniPopup();
  if(st&&!st.preview){try{const result=await bridge.addonCommand?.('water-snooze');if(result)syncAddonState(result);}catch{}}
};
acts.waterreset=async()=>{try{const result=await bridge.addonCommand?.('water-reset');if(result)syncAddonState(result);}catch{}};
acts.waterpagedrink=async()=>{try{const result=await bridge.addonCommand?.('water-drink');if(result)syncAddonState(result);}catch{}};
bridge.onAddonAlert?.(event=>{
  if(!event?.title)return;
  if(event.kind==='prayer'){
    const mapEn={'Waktu Subuh':'Fajr Prayer','Waktu Dzuhur':'Dhuhr Prayer','Waktu Ashar':'Asr Prayer','Waktu Maghrib':'Maghrib Prayer','Waktu Isya':'Isha Prayer'};
    const idMap={'Waktu Subuh':'Fajr','Waktu Dzuhur':'Dhuhr','Waktu Ashar':'Asr','Waktu Maghrib':'Maghrib','Waktu Isya':'Isha'};
    updatePrayerMiniIcon(idMap[event.title]||nextPrayerId(addonState.prayer)||'Isha');
    setText('prayer-notice-title',isId()?event.title:(mapEn[event.title]||'Prayer Time'));
    setText('prayer-notice-detail',event.body||'');
    showMiniPopup('prayernotice',10000);
  }else if(event.kind==='water'){
    showWaterPill(event);
  }else notice('bell',event.title,5000);
});
bridge.onProductivityState?.(s=>{if(s){addonProductivity=s;renderAddons();}});
Promise.all([bridge.addonState?.(),bridge.productivityState?.()]).then(([a,p])=>{if(p)addonProductivity=p;syncAddonState(a);}).catch(()=>{});
acts.addonmanage=()=>{addonManage=true;addonRenderKey='';renderAddons();};
acts.addonpick=async el=>{addonPickTarget=el.dataset.feature;try{const result=await bridge.addonCommand?.('select',addonPickTarget);if(result){addonManage=false;syncAddonState(result);if(curKey==='addons')go(addonPickTarget);}}finally{addonPickTarget='';}};
acts.addonwater=async()=>syncAddonState(await bridge.addonCommand?.('water-enabled',!addonState.waterEnabled));
acts.prayerpreview=el=>{const id=el.dataset.prayerId;if(id){previewPrayerId=(previewPrayerId===id?'':id);addonRenderKey='';renderAddons();}};

let isTogglingTodo = false;
async function toggleTaskWithAnimation(id, rowEl) {
  if (isTogglingTodo) return;
  const list = $('#v-todo .todo-list');
  if (!list || !rowEl) {
    await addonSave('task-toggle', id);
    return;
  }
  isTogglingTodo = true;

  // Snapshot positions of all tasks before state toggle
  const rows = Array.from(list.querySelectorAll('.todo-row[data-id]'));
  const firstRects = new Map();
  rows.forEach(r => {
    firstRects.set(r.dataset.id, r.getBoundingClientRect().top);
  });

  // Hold in place ~240ms so user perceives checked state & strikethrough in place (just like video)
  await new Promise(r => setTimeout(r, 240));

  // Save toggle to backend (which sorts completed tasks to bottom)
  await addonSave('task-toggle', id);

  // FLIP animation to smoothly glide to new positions
  requestAnimationFrame(() => {
    const updatedList = $('#v-todo .todo-list');
    if (!updatedList) { isTogglingTodo = false; return; }
    const newRows = Array.from(updatedList.querySelectorAll('.todo-row[data-id]'));

    newRows.forEach(r => {
      const taskId = r.dataset.id;
      const oldTop = firstRects.get(taskId);
      if (oldTop !== undefined) {
        const newTop = r.getBoundingClientRect().top;
        const deltaY = oldTop - newTop;
        if (Math.abs(deltaY) > 1) {
          r.style.transform = `translateY(${deltaY}px)`;
          r.style.transition = 'none';
          if (taskId === id) {
            r.classList.add('is-animating-row');
          }
        }
      }
    });

    // Force layout reflow
    void updatedList.offsetHeight;

    // Play smooth glide animation
    requestAnimationFrame(() => {
      newRows.forEach(r => {
        r.style.transition = 'transform 0.42s cubic-bezier(0.25, 1, 0.5, 1)';
        r.style.transform = '';
      });
      setTimeout(() => {
        newRows.forEach(r => {
          r.style.transition = '';
          r.classList.remove('is-animating-row');
        });
        isTogglingTodo = false;
      }, 450);
    });
  });
}

async function addonSave(type,payload){if(await bridge.productivitySave?.(type,payload)){addonProductivity=await bridge.productivityState?.()||addonProductivity;addonRenderKey='';renderAddons();}}
acts.addontaskdelete=el=>addonSave('delete-task',el.dataset.id);
function setTodoScheduleLock(locked){S.focusLock=locked;bridge.setFocusable?.(locked);if(!locked&&!inside)setInside(false);}
acts.todoremind=()=>{const form=$('#addon-task-form');if(!form)return;const row=form.querySelector('.todo-schedule');row.hidden=!row.hidden;form.classList.toggle('has-schedule',!row.hidden);setTodoScheduleLock(!row.hidden);if(!row.hidden){const soon=new Date(Date.now()+60*60*1000);soon.setMinutes(0,0,0);if(soon<=new Date())soon.setHours(soon.getHours()+1);row.querySelector('[name="date"]').value=`${soon.getFullYear()}-${String(soon.getMonth()+1).padStart(2,'0')}-${String(soon.getDate()).padStart(2,'0')}`;row.querySelector('[name="time"]').value=`${String(soon.getHours()).padStart(2,'0')}:00`;}};
acts.todoclear=async()=>{
  if(!addonProductivity.tasks?.length)return;
  if(Date.now()<todoClearArmedUntil){todoClearArmedUntil=0;clearTimeout(todoClearTimer);await addonSave('clear-tasks');return;}
  todoClearArmedUntil=Date.now()+4000;
  const button=$('#v-todo .todo-clear');button.dataset.confirm='1';button.querySelector('.todo-clear-label').textContent=isId()?'Yakin?':'Sure?';button.setAttribute('aria-label',isId()?'Konfirmasi hapus semua tugas':'Confirm clearing all tasks');
  clearTimeout(todoClearTimer);
  todoClearTimer=setTimeout(()=>{todoClearArmedUntil=0;const current=$('#v-todo .todo-clear');if(current){current.dataset.confirm='0';current.querySelector('.todo-clear-label').textContent=isId()?'Hapus':'Clear';current.setAttribute('aria-label',isId()?'Hapus semua tugas':'Clear all tasks');}},4000);
};
acts.addonnotedelete=el=>addonSave('delete-note',el.dataset.id);
function openNoteEditor(note){const idLang=isId();const lines=String(note?.text||'').split('\n');const title=lines.shift()||'',body=lines.join('\n');noteEditor={id:note?.id||null,original:note?.text||''};S.focusLock=true;bridge.setFocusable?.(true);setHTML('addon-notes-body',`<div class="note-editor-head"><button data-act="notecancel">${idLang?'Kembali':'Back'}</button><button data-act="notedone">${idLang?'Selesai':'Done'}</button></div><input class="note-title" maxlength="500" aria-label="Note title" placeholder="${idLang?'Judul':'Title'}" value="${esc(title)}"><textarea class="note-editor" maxlength="9500" aria-label="Note content" placeholder="${idLang?'Mulai menulis…':'Start writing…'}">${esc(body)}</textarea><div class="note-save-error" role="status" hidden>${idLang?'Gagal menyimpan. Coba lagi.':'Could not save. Try again.'}</div>`);$('#addon-notes-body .note-title').focus();for(const el of $$('#addon-notes-body .note-title, #addon-notes-body .note-editor'))el.addEventListener('input',scheduleNoteSave);}
acts.notenew=()=>openNoteEditor(null);
acts.noteopen=el=>{const note=addonProductivity.notes.find(n=>n.id===el.dataset.id);if(note)openNoteEditor(note);};
// Notes save themselves: 0.6 s after the last keystroke, and whenever the editor is left in any way (Done, Back, a click outside,
// a swipe to another page, the pointer staying away). Saves run one after another so a quick second save never makes a duplicate note.
let noteSaveTimer=0,noteQueue=Promise.resolve(),noteLeaveTimer=0;
function noteTextNow(){const title=$('#addon-notes-body .note-title')?.value.trim()||'',body=$('#addon-notes-body .note-editor')?.value.trim()||'';return title?(body?title+'\n'+body:title):body;}
function scheduleNoteSave(){clearTimeout(noteSaveTimer);noteSaveTimer=setTimeout(saveNoteNow,600);}
function saveNoteNow(){
  clearTimeout(noteSaveTimer);
  const editor=noteEditor,text=noteTextNow();
  const job=noteQueue.then(async()=>{
    if(!editor||!text||text===editor.original)return true;
    try{
      const id=editor.id;
      const ok=await bridge.productivitySave?.(id?'update-note':'note',id?{id,text}:{text});
      if(!ok)return false;
      editor.original=text;
      if(!id){const state=await bridge.productivityState?.();const created=state?.notes?.[0];if(created&&created.text===text)editor.id=created.id;}
      return true;
    }catch{return false;}
  });
  noteQueue=job.catch(()=>{});
  return job;
}
async function closeNoteEditor(save,options={}){
  clearTimeout(noteLeaveTimer);
  if(!noteEditor)return;
  if(save){
    const ok=await saveNoteNow();
    if(!ok&&!options.silent){const error=$('#addon-notes-body .note-save-error');if(error)error.hidden=false;return;}
  }
  noteEditor=null;S.focusLock=false;bridge.setFocusable?.(false);
  addonProductivity=await bridge.productivityState?.()||addonProductivity;addonRenderKey='';renderAddons();
  if(!inside&&S.expanded)collapse(); // the lock held the island open: let it fold back to the compact view now
}
function flushNoteEditorForNav(){if(noteEditor)closeNoteEditor(true,{silent:true});}
document.addEventListener('pointerdown',e=>{if(noteEditor&&!e.target.closest('#v-notes'))closeNoteEditor(true,{silent:true});},true);
window.addEventListener('blur',()=>{if(noteEditor)closeNoteEditor(true,{silent:true});});
island.addEventListener('pointerleave',()=>{if(!noteEditor)return;clearTimeout(noteLeaveTimer);noteLeaveTimer=setTimeout(()=>{if(noteEditor&&!inside)closeNoteEditor(true,{silent:true});},1500);});
island.addEventListener('pointerenter',()=>clearTimeout(noteLeaveTimer));
acts.notedone=()=>closeNoteEditor(true);
acts.notecancel=()=>closeNoteEditor(true);
for(const id of Object.keys(ADDONS))$('#v-'+id).addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(form.id!=='addon-task-form'&&form.id!=='addon-note-form')return;const text=form.elements.text.value.trim();if(form.id==='addon-note-form'){if(text)await addonSave('note',{text});return;}const schedule=form.querySelector('.todo-schedule');const remindAt=schedule.hidden?0:new Date(`${form.elements.date.value}T${form.elements.time.value}`).getTime();const invalid=!text||(!schedule.hidden&&(!Number.isFinite(remindAt)||remindAt<=Date.now()));if(invalid){form.classList.remove('is-invalid');void form.offsetWidth;form.classList.add('is-invalid');(!text?form.elements.text:!form.elements.date.value?form.elements.date:form.elements.time).focus();return;}schedule.hidden=true;todoDraftText='';setTodoScheduleLock(false);await addonSave('task',{text,remindAt});});
$('#v-todo').addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#addon-task-form .todo-schedule')?.hidden){e.preventDefault();acts.todoremind();}});
$('#v-todo').addEventListener('input',e=>{const form=e.target.closest('#addon-task-form');if(!form)return;form.classList.remove('is-invalid');if(e.target.name==='text'){todoDraftText=e.target.value;const btn=form.querySelector('.aic-submit-btn');if(btn)btn.classList.toggle('ready',todoDraftText.trim().length>0);}});
$('#v-todo').addEventListener('change', async e => {
  const id = e.target.dataset.taskToggle;
  if (!id) return;
  const row = e.target.closest('.todo-row');
  if (row) {
    row.classList.toggle('is-done', e.target.checked);
  }
  await toggleTaskWithAnimation(id, row);
});
$('#v-water').addEventListener('change',async e=>{if(e.target.id==='addon-water-minutes')syncAddonState(await bridge.addonCommand?.('water-interval',Number(e.target.value)));});
acts.waterstep=async el=>{const list=[15,30,45,60,90,120];const i=list.indexOf(addonState.waterMinutes);const next=list[Math.max(0,Math.min(list.length-1,(i<0?2:i)+Number(el.dataset.dir)))];syncAddonState(await bridge.addonCommand?.('water-interval',next));};

/* ---------- Bookmarks: favourite sites, opened in the default browser ---------- */
let bookmarkAdding=false;
let bookmarkRenderKey='';
let bookmarkError='';
let bookmarkNote='';
let bookmarkNoteTimer=0;
let bookmarkFlashUrl='';
let bookmarkDraft={url:'',name:''};
function bookmarkSay(text){
  bookmarkNote=text;clearTimeout(bookmarkNoteTimer);
  bookmarkNoteTimer=setTimeout(()=>{bookmarkNote='';renderBookmarks();},2600);
  renderBookmarks();
}
function renderBookmarks(){
  const body=$('#addon-bookmarks-body');
  if(!body)return;
  const list=Array.isArray(addonState.bookmarks)?addonState.bookmarks:[];
  const idLang=isId();
  const key=JSON.stringify([idLang,bookmarkAdding,bookmarkError,bookmarkNote,bookmarkFlashUrl,bookmarkAdding?bookmarkDraft.url:'',list.map(b=>[b.url,b.name,b.icon?b.icon.length:0])]);
  if(key===bookmarkRenderKey)return;
  bookmarkRenderKey=key;
  setText('bookmarks-head-title',idLang?'Bookmark':'Bookmarks');
  setText('bookmarks-count',list.length?`${list.length}/12`:'');
  if(bookmarkAdding){
    body.innerHTML=`<form class="bm-form" id="addon-bookmark-form" novalidate>
      <div class="bm-url-row"><input name="url" class="bm-input" maxlength="2000" placeholder="${idLang?'Tempel atau ketik alamat situs':'Paste or type the site address'}" value="${esc(bookmarkDraft.url)}" autocomplete="off" spellcheck="false"><button type="button" class="bm-paste" data-act="bookmarkpaste">${idLang?'Tempel':'Paste'}</button></div>
      <input name="name" class="bm-input" maxlength="40" placeholder="${idLang?'Nama (opsional)':'Name (optional)'}" value="${esc(bookmarkDraft.name)}" autocomplete="off">
      ${bookmarkError?`<p class="bm-error">${esc(bookmarkError)}</p>`:''}
      <div class="bm-form-actions"><button type="button" class="bm-cancel" data-act="bookmarkcancel">${idLang?'Batal':'Cancel'}</button><button type="submit" class="bm-save">${idLang?'Simpan':'Save'}</button></div>
    </form>`;
    setTimeout(()=>{const f=body.querySelector('input[name="url"]');if(f&&!f.value)f.focus();else body.querySelector('input[name="name"]')?.focus();},30);
    return;
  }
  const tiles=list.map((b,i)=>{
    const face=b.icon?`<img src="${b.icon}" alt="" width="28" height="28">`:`<span class="bm-letter">${esc((b.name||'?').charAt(0).toUpperCase())}</span>`;
    const t=idLang?{rm:'Hapus',cp:'Salin alamat'}:{rm:'Remove',cp:'Copy address'};
    return `<div class="bm-tile${b.url===bookmarkFlashUrl?' bm-new':''}" data-i="${i}"><button type="button" class="bm-open" data-act="bookmarkopen" data-i="${i}" title="${esc(b.url)}">${face}<span class="bm-name">${esc(b.name)}</span></button><button type="button" class="bm-copy" data-act="bookmarkcopy" data-i="${i}" aria-label="${t.cp}: ${esc(b.name)}" title="${t.cp}">${icoOf('copy')}</button><button type="button" class="bm-remove" data-act="bookmarkremove" data-i="${i}" aria-label="${t.rm} ${esc(b.name)}" title="${t.rm}">${icoOf('x')}</button></div>`;
  });
  if(list.length<12)tiles.push(`<button type="button" class="bm-tile bm-add" data-act="bookmarkaddopen">${icoOf('plus')}<span class="bm-name">${idLang?'Tambah':'Add'}</span></button>`);
  const hint=bookmarkNote||(list.length?'':(idLang?'Seret tab atau link ke notch, tekan Ctrl+Alt+B di browser, atau tempel dari clipboard.':'Drag a tab or link to the notch, press Ctrl+Alt+B in a browser, or paste from the clipboard.'));
  body.innerHTML=`<div class="bm-grid">${tiles.join('')}</div>${hint?`<p class="${bookmarkNote?'bm-note':'bm-empty'}" role="status">${esc(hint)}</p>`:''}`;
}
enterHooks.bookmarks=()=>renderBookmarks();   // layout() re-enters the page on every resize: keep a half-typed form
// + opens the form already filled with the web address on the clipboard, when there is one.
acts.bookmarkaddopen=async()=>{
  bookmarkAdding=true;bookmarkError='';bookmarkDraft={url:'',name:''};
  try{const link=await bridge.clipboardLink?.();if(link)bookmarkDraft.url=link;}catch{/* no clipboard access: an empty form */}
  bookmarkRenderKey='';renderBookmarks();
};
acts.bookmarkpaste=async()=>{
  const form=$('#addon-bookmark-form');if(!form)return;
  bookmarkDraft={url:form.elements.url.value,name:form.elements.name.value};
  let link='';try{link=await bridge.clipboardLink?.();}catch{}
  if(!link){bookmarkError=isId()?'Tidak ada alamat situs di clipboard.':'There is no web address on the clipboard.';}
  else{bookmarkError='';bookmarkDraft.url=link;}
  bookmarkRenderKey='';renderBookmarks();
};
acts.bookmarkcancel=()=>{bookmarkAdding=false;bookmarkError='';bookmarkDraft={url:'',name:''};bookmarkRenderKey='';renderBookmarks();};
acts.bookmarkopen=async el=>{const i=Number(el.dataset.i);if(Number.isInteger(i))await bridge.addonCommand?.('bookmark-open',i);};
acts.bookmarkcopy=async el=>{const i=Number(el.dataset.i);if(!Number.isInteger(i))return;await bridge.addonCommand?.('bookmark-copy',i);bookmarkSay(isId()?'Alamat disalin':'Address copied');};
acts.bookmarkremove=async el=>{const i=Number(el.dataset.i);if(!Number.isInteger(i))return;const result=await bridge.addonCommand?.('bookmark-remove',i);if(result)syncAddonState(result);};
// right-click a tile copies its address too
$('#v-bookmarks')?.addEventListener('contextmenu',e=>{const tile=e.target.closest('.bm-tile[data-i]');if(!tile)return;e.preventDefault();acts.bookmarkcopy({dataset:{i:tile.dataset.i}});});
$('#v-bookmarks')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.target;
  if(form.id!=='addon-bookmark-form')return;
  const url=form.elements.url.value.trim(),name=form.elements.name.value.trim();
  bookmarkDraft={url,name};
  if(!url){bookmarkError=isId()?'Isi alamat situsnya dulu.':'Enter the site address first.';bookmarkRenderKey='';renderBookmarks();return;}
  const save=form.querySelector('.bm-save');if(save){save.disabled=true;save.textContent=isId()?'Menyimpan…':'Saving…';}
  const result=await bridge.addonCommand?.('bookmark-add',{url,name});
  if(!result){bookmarkError=isId()?'Alamatnya tidak valid, sudah ada, atau bookmark sudah penuh (12).':'That address is not valid, already saved, or the list is full (12).';bookmarkRenderKey='';renderBookmarks();return;}
  bookmarkAdding=false;bookmarkError='';bookmarkDraft={url:'',name:''};
  const added=(result.bookmarks||[]).at(-1);if(added)bookmarkFlashUrl=added.url;
  syncAddonState(result);
});

/* Drag a link, or the address icon of a browser tab, onto the notch: it is saved as a bookmark. Only while the Bookmarks
   feature is on, and only for drags that carry a web address (selected text and files are left alone: files go to the Stash). */
let bmDrag=false;
const bmWanted=e=>S.addonPages.includes('bookmarks')&&e.dataTransfer&&[...(e.dataTransfer.types||[])].some(t=>t==='text/uri-list'||t==='text/x-moz-url')&&![...(e.dataTransfer.types||[])].includes('Files');
function bmStartDrag(){
  if(bmDrag)return;
  bmDrag=true;S.dragLock=true;bridge.setDragActive?.(true);
  if(curKey!=='bookmarks'&&!S.bmZone)go('bookmarks');   // in a browser the drop zone pill is already showing
  $('#v-bookmarks')?.classList.add('hot');
}
function bmEndDrag(){
  if(!bmDrag)return;
  bmDrag=false;S.dragLock=false;bridge.setDragActive?.(false);
  $('#v-bookmarks')?.classList.remove('hot');
}
// What the browser sent: the address from text/uri-list (first line that is not a comment) or Firefox's text/x-moz-url, and a title when it came along.
function bmReadDrop(dt){
  let url='',title='';
  const moz=dt.getData('text/x-moz-url');
  if(moz){const [u,t]=moz.split(/\r?\n/);url=(u||'').trim();title=(t||'').trim();}
  if(!url){url=(dt.getData('text/uri-list')||'').split(/\r?\n/).map(l=>l.trim()).find(l=>l&&!l.startsWith('#'))||'';}
  if(!title){const html=dt.getData('text/html');const m=html&&html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);if(m)title=m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();}
  return {url,title:title.slice(0,40)};
}
document.addEventListener('dragenter',e=>{if(bmWanted(e)){e.preventDefault();bmStartDrag();}});
document.addEventListener('dragover',e=>{if(bmWanted(e)){e.preventDefault();e.dataTransfer.dropEffect='link';bmStartDrag();}});
document.addEventListener('dragleave',e=>{if(bmDrag&&e.relatedTarget===null)setTimeout(bmEndDrag,90);});
document.addEventListener('dragend',bmEndDrag);
document.addEventListener('drop',async e=>{
  if(!bmDrag&&!bmWanted(e))return;
  e.preventDefault();
  const {url,title}=bmReadDrop(e.dataTransfer);   // dataTransfer is only readable during the event
  const zone=!!S.bmZone;
  if(zone)bridge.bmDropped?.();   // the address came with the drop: no need to read the address bar
  bmEndDrag();
  const say=(ok,text)=>zone?bmZoneShow(ok?'saved':'fail',text,ok?1300:1900):bookmarkSay(text);
  if(!url){say(false,isId()?'Tidak ada alamat situs yang terbawa':'No web address came with it');return;}
  const result=await bridge.addonCommand?.('bookmark-add',{url,name:title});
  if(!result){say(false,isId()?'Tidak disimpan: tidak valid, sudah ada, atau penuh':'Not saved: invalid, already saved, or full');return;}
  const added=(result.bookmarks||[]).at(-1);if(added)bookmarkFlashUrl=added.url;
  bookmarkAdding=false;syncAddonState(result);
  say(true,isId()?`Tersimpan: ${added?added.name:'bookmark'}`:`Saved: ${added?added.name:'bookmark'}`);
});


/* The drop zone pill (main.js "Bookmark drop zone"): ready while a tab or link is dragged near the notch, then the result for a moment. */
let bmZoneTimer=0;
function bmZoneShow(state,text,holdMs){
  clearTimeout(bmZoneTimer);
  S.bmZone=state;   // 'ready' | 'saving' | 'saved' | 'fail'
  setText('bd-text',text);
  island.dataset.bmZone=state;
  layout();
  if(holdMs)bmZoneTimer=setTimeout(bmZoneHide,holdMs);
}
function bmZoneHide(){
  clearTimeout(bmZoneTimer);if(!S.bmZone)return;
  const wasResult=S.bmZone==='saved'||S.bmZone==='fail';
  S.bmZone=null;delete island.dataset.bmZone;
  S.bmCool=wasResult&&inside;   // a result closes back to the tucked pill, even though the pointer is still on the notch
  layout();
}
bridge.onBmZone?.(state=>{
  if(state==='ready')bmZoneShow('ready',isId()?'Lepas untuk simpan ke bookmark':'Drop to save as a bookmark',0);
  else if(state==='saving')bmZoneShow('saving',isId()?'Menyimpan…':'Saving…',0);
  else if(S.bmZone==='ready'||S.bmZone==='saving')bmZoneHide();   // a saved/fail message keeps its own timer
});
bridge.onBmResult?.(r=>{
  const id=isId();
  const text=r&&r.ok?(id?`Tersimpan: ${r.name||'bookmark'}`:`Saved: ${r.name||'bookmark'}`)
    :r&&r.reason==='exists'?(id?'Sudah ada di bookmark':'Already in bookmarks')
    :r&&r.reason==='full'?(id?'Bookmark penuh (12)':'Bookmarks are full (12)')
    :(id?'Alamat tab tidak terbaca':'Could not read the tab address');
  bmZoneShow(r&&r.ok?'saved':'fail',text,r&&r.ok?1300:1900);
});
