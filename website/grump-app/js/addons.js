'use strict';
const ADDONS={todo:{label:'To-do',labelId:'Tugas',icon:'check'},notes:{label:'Notes',labelId:'Catatan',icon:'file'},prayer:{label:'Prayer',labelId:'Sholat',icon:'moon'},water:{label:'Water',labelId:'Minum',icon:'drop'}};
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
}
function renderAddons(){
  if(!['addons',...Object.keys(ADDONS)].includes(curKey))return;
  if(curKey==='notes' && noteEditor)return;
  if(curKey==='todo' && $('#addon-task-form .todo-schedule')?.hidden===false)return;
  const selected=addonState.selected||[];
  const nextPrayer=nextPrayerId(addonState.prayer);
  const activePrayer=previewPrayerId||nextPrayer||'Isha';
  const idLang=isId();
  const key=JSON.stringify([idLang,selected,addonManage,addonState.city,addonState.locationMode,addonState.waterMinutes,addonState.waterEnabled,addonState.waterNextAt,addonState.prayerEnabled,addonState.prayerStatus,addonState.prayer,nextPrayer,activePrayer,addonProductivity.tasks,addonProductivity.notes]);
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
  const waterIllust=`<div class="water-illust" aria-hidden="true"><svg viewBox="0 0 108 118" class="water-kawaii-svg"><defs><linearGradient id="wGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(224,242,254,0.28)"/><stop offset="100%" stop-color="rgba(186,230,253,0.08)"/></linearGradient><linearGradient id="wLiqFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></linearGradient><linearGradient id="wLiqBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0369a1"/></linearGradient><clipPath id="wCupClip"><path d="M24 26 H84 L77 98 A12 12 0 0 1 65 108 H43 A12 12 0 0 1 31 98 Z"/></clipPath></defs><ellipse cx="54" cy="111" rx="26" ry="4" fill="rgba(56,189,248,0.18)"/><path class="w-straw" d="M63 32 L71 10 L83 7" fill="none" stroke="#fb7185" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="w-straw-hi" d="M63 32 L71 10 L83 7" fill="none" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><g clip-path="url(#wCupClip)"><rect x="20" y="24" width="68" height="86" fill="url(#wGlass)"/><path class="w-wave-back" d="M10 47 Q28 41 46 47 T82 47 T118 47 V112 H10 Z" fill="url(#wLiqBack)" opacity="0.65"/><path class="w-wave-front" d="M6 51 Q26 57 46 51 T86 51 T126 51 V112 H6 Z" fill="url(#wLiqFront)"/><g class="w-ice-group"><rect x="31" y="45" width="13" height="13" rx="3.5" transform="rotate(-12 37 51)" fill="rgba(255,255,255,0.42)" stroke="rgba(255,255,255,0.65)" stroke-width="1"/><rect x="59" y="47" width="12" height="12" rx="3.5" transform="rotate(14 65 53)" fill="rgba(255,255,255,0.36)" stroke="rgba(255,255,255,0.6)" stroke-width="1"/></g><circle class="w-bub b1" cx="38" cy="94" r="2.2" fill="rgba(255,255,255,0.6)"/><circle class="w-bub b2" cx="66" cy="98" r="1.7" fill="rgba(255,255,255,0.5)"/><circle class="w-bub b3" cx="52" cy="101" r="2.5" fill="rgba(255,255,255,0.55)"/><g class="w-kawaii-face"><ellipse cx="35" cy="79" rx="4.2" ry="2.3" fill="#fda4af" opacity="0.78"/><ellipse cx="73" cy="79" rx="4.2" ry="2.3" fill="#fda4af" opacity="0.78"/><g class="w-eye"><circle cx="41" cy="73" r="3.6" fill="#0c4a6e"/><circle cx="39.8" cy="71.7" r="1.3" fill="#fff"/><circle cx="42.2" cy="74.2" r="0.6" fill="#fff"/></g><g class="w-eye"><circle cx="67" cy="73" r="3.6" fill="#0c4a6e"/><circle cx="65.8" cy="71.7" r="1.3" fill="#fff"/><circle cx="68.2" cy="74.2" r="0.6" fill="#fff"/></g><path d="M49.5 77.5 Q54 82.5 58.5 77.5" fill="none" stroke="#0c4a6e" stroke-width="2.2" stroke-linecap="round"/></g></g><path d="M24 26 H84 L77 98 A12 12 0 0 1 65 108 H43 A12 12 0 0 1 31 98 Z" fill="none" stroke="rgba(186,230,253,0.72)" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="54" cy="26" rx="30" ry="4.2" fill="rgba(224,242,254,0.22)" stroke="rgba(224,242,254,0.85)" stroke-width="2"/><path d="M29 36 L34 92" stroke="rgba(255,255,255,0.38)" stroke-width="2.2" stroke-linecap="round"/><path class="w-drop-float" d="M14 40 C14 40 19 46 19 49.5 A5 5 0 0 1 9 49.5 C9 46 14 40 14 40 Z" fill="#38bdf8"/><path class="w-sparkle" d="M94 34 L95.5 38.5 L100 40 L95.5 41.5 L94 46 L92.5 41.5 L88 40 L92.5 38.5 Z" fill="#7dd3fc"/></svg></div>`;
  setHTML('addon-water-body',`<div class="water-panel-grid">${waterIllust}<div class="water-info-col"><div class="water-primary-row"><div class="water-next"><span>${addonState.waterEnabled?(idLang?'Pengingat berikutnya':'Next reminder'):(idLang?'Status':'Status')}</span><strong>${addonState.waterEnabled?esc(next):(idLang?'Dijeda':'Paused')}</strong></div><button class="addon-toggle ${addonState.waterEnabled?'on':''}" data-act="addonwater" aria-label="${addonState.waterEnabled?'Turn off':'Turn on'} water reminders">${addonState.waterEnabled?(idLang?'Aktif':'On'):(idLang?'Mati':'Off')}</button></div><label class="addon-interval"><span>${idLang?'Ingatkan setiap':'Remind every'}</span><select id="addon-water-minutes" aria-label="Water reminder interval">${[15,30,45,60,90,120].map(n=>`<option value="${n}" ${n===addonState.waterMinutes?'selected':''}>${n===45?(idLang?'45 menit (disarankan)':'45 min (recommended)'):(idLang?n+' menit':n+' min')}</option>`).join('')}</select></label><div class="water-summary"><div><strong>${idLang?'Target harian':'Daily target'}</strong><span>${idLang?'2,0 L · sekitar 8 gelas':'2.0 L · about 8 glasses'}</span></div><p>${idLang?'Minum sedikit secara berkala membantu menjaga fokus.':'Small, regular sips help maintain focus.'}</p></div></div></div>`);

  setIco($('#v-addons'));for(const id of Object.keys(ADDONS))setIco($('#v-'+id));
}
renderers.push(renderAddons);
setInterval(()=>{if(curKey==='prayer')renderAddons();},15000);
bridge.onAddonState?.(syncAddonState);
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
    const mins=addonState.waterMinutes||45;
    const waterCopyId={
      'DRINK NOW!':'MINUM SEKARANG!',
      'HYDRATE, DRY HUMAN.':'HAUS KOK BANDEL.',
      "SIP. DON'T ARGUE.":'TEGUK. JANGAN NGEYEL.',
      'WATER BEFORE U CRASH.':'MINUM SEBELUM TUMBANG.'
    };
    setText('water-notice-title',isId()?(waterCopyId[event.title]||'MINUM SEKARANG!'):event.title);
    setText('water-notice-detail',isId()?`1 gelas (~200 ml) · tiap ${mins} menit`:(event.body||`1 glass (~200 ml) · every ${mins} min`));
    showMiniPopup('waternotice',10000);
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
function openNoteEditor(note){const idLang=isId();const lines=String(note?.text||'').split('\n');const title=lines.shift()||'',body=lines.join('\n');noteEditor={id:note?.id||null,original:note?.text||''};S.focusLock=true;bridge.setFocusable?.(true);setHTML('addon-notes-body',`<div class="note-editor-head"><button data-act="notecancel">${idLang?'Kembali':'Back'}</button><button data-act="notedone">${idLang?'Selesai':'Done'}</button></div><input class="note-title" maxlength="500" aria-label="Note title" placeholder="${idLang?'Judul':'Title'}" value="${esc(title)}"><textarea class="note-editor" maxlength="9500" aria-label="Note content" placeholder="${idLang?'Mulai menulis…':'Start writing…'}">${esc(body)}</textarea><div class="note-save-error" role="status" hidden>${idLang?'Gagal menyimpan. Coba lagi.':'Could not save. Try again.'}</div>`);$('#addon-notes-body .note-title').focus();}
acts.notenew=()=>openNoteEditor(null);
acts.noteopen=el=>{const note=addonProductivity.notes.find(n=>n.id===el.dataset.id);if(note)openNoteEditor(note);};
async function closeNoteEditor(save){const title=$('#addon-notes-body .note-title')?.value.trim()||'',body=$('#addon-notes-body .note-editor')?.value.trim()||'',text=title?(body?title+'\n'+body:title):body,id=noteEditor?.id;if(save&&text&&text!==noteEditor?.original){try{const ok=await bridge.productivitySave?.(id?'update-note':'note',id?{id,text}:{text});if(!ok)throw new Error('save failed');}catch{const error=$('#addon-notes-body .note-save-error');if(error)error.hidden=false;return;}}noteEditor=null;S.focusLock=false;bridge.setFocusable?.(false);addonProductivity=await bridge.productivityState?.()||addonProductivity;addonRenderKey='';renderAddons();}
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
