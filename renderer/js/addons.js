'use strict';
const ADDONS={todo:{label:'To-do',icon:'check'},notes:{label:'Notes',icon:'file'},prayer:{label:'Sholat',icon:'moon'},water:{label:'Minum',icon:'drop'}};
let addonState={selected:[],city:'Jakarta',waterMinutes:60,waterEnabled:false,prayerEnabled:false,prayer:null,waterNextAt:0};
let addonProductivity={tasks:[],notes:[]};
let addonManage=false;
let addonRenderKey='';
let addonPickTarget='';
function syncAddonState(next){
  if(!next)return;
  const oldPages=S.addonPages.join(',');
  addonState=next;
  S.addonPages=Object.keys(ADDONS).filter(id=>next.selected?.includes(id));
  addonRenderKey='';
  if(S.expanded && curKey==='addons' && S.addonPages.length===4){go(addonPickTarget||next.selected.at(-1));return;}
  if(S.expanded && ADDONS[curKey] && !S.addonPages.includes(curKey)){go(S.addonPages[0]||'addons');return;}
  if(oldPages!==S.addonPages.join(','))layout();else renderAddons();
}
function renderAddons(){
  if(!['addons',...Object.keys(ADDONS)].includes(curKey))return;
  const selected=addonState.selected||[];
  const key=JSON.stringify([selected,addonManage,addonState.city,addonState.waterMinutes,addonState.waterEnabled,addonState.waterNextAt,addonState.prayerEnabled,addonState.prayerStatus,addonState.prayer,addonProductivity.tasks,addonProductivity.notes]);
  if(key===addonRenderKey)return;
  addonRenderKey=key;
  const missing=Object.entries(ADDONS).filter(([id])=>!selected.includes(id));
  const picker=addonManage
    ?missing.map(([id,v])=>`<button class="addon-pick" data-act="addonpick" data-feature="${id}"><span data-ico="${v.icon}"></span><span>${v.label}</span><span data-ico="plus"></span></button>`).join('')
    :'<button class="addon-empty" data-act="addonmanage"><span data-ico="plus"></span><span>Add features</span></button>';
  setHTML('addon-picker',picker);
  setHTML('addon-todo-body',`<form class="addon-form" id="addon-task-form"><input name="text" maxlength="500" placeholder="Add a task" aria-label="New task" required><button class="addon-glass" aria-label="Add task" title="Add task"><span data-ico="plus"></span></button></form><div class="addon-list">${addonProductivity.tasks.length?addonProductivity.tasks.slice(0,20).map(t=>`<div class="addon-row"><input type="checkbox" data-task-toggle="${esc(t.id)}" ${t.done?'checked':''} aria-label="Complete task"><span class="${t.done?'done':''}">${esc(t.text)}</span><button data-act="addontaskdelete" data-id="${esc(t.id)}" aria-label="Delete task" title="Delete task"><span data-ico="close"></span></button></div>`).join(''):'<div class="addon-hint">Nothing on your list yet.</div>'}</div>`);
  setHTML('addon-notes-body',`<form class="addon-form" id="addon-note-form"><input name="text" maxlength="10000" placeholder="Write a quick note" aria-label="New note" required><button class="addon-glass" aria-label="Add note" title="Add note"><span data-ico="plus"></span></button></form><div class="addon-list">${addonProductivity.notes.length?addonProductivity.notes.slice(0,20).map(n=>`<div class="addon-row"><span title="${esc(n.text)}">${esc(n.text)}</span><button data-act="addonnotedelete" data-id="${esc(n.id)}" aria-label="Delete note" title="Delete note"><span data-ico="close"></span></button></div>`).join(''):'<div class="addon-hint">No notes yet.</div>'}</div>`);
  const times=addonState.prayer?.times;
  setHTML('addon-prayer-body',`<div class="addon-controls"><form id="addon-city-form"><input name="city" maxlength="60" value="${esc(addonState.city)}" aria-label="City in Indonesia" required><button class="addon-glass" aria-label="Update city" title="Update city"><span data-ico="check"></span></button></form><button class="addon-toggle ${addonState.prayerEnabled?'on':''}" data-act="addonprayer" aria-label="${addonState.prayerEnabled?'Turn off':'Turn on'} prayer reminders">${addonState.prayerEnabled?'On':'Off'}</button></div><div class="addon-prayers">${times?Object.entries({Fajr:'Subuh',Dhuhr:'Dzuhur',Asr:'Ashar',Maghrib:'Maghrib',Isha:'Isya'}).map(([id,name])=>`<span>${name}<b>${esc(times[id]||'—')}</b></span>`).join(''):`<div class="addon-hint">${!addonState.prayerEnabled?'Turn on to load prayer times.':addonState.prayerStatus==='unavailable'?'Schedule unavailable. Retry in a few minutes.':'Loading prayer times…'}</div>`}</div><small class="addon-source">Kemenag method via AlAdhan · check local mosque</small>`);
  const next=addonState.waterEnabled&&addonState.waterNextAt?new Date(addonState.waterNextAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
  setHTML('addon-water-body',`<div class="addon-water"><span data-ico="drop"></span><div><b>Drink water</b><small>Next reminder ${esc(next)}</small></div><button class="addon-toggle ${addonState.waterEnabled?'on':''}" data-act="addonwater" aria-label="${addonState.waterEnabled?'Turn off':'Turn on'} water reminders">${addonState.waterEnabled?'On':'Off'}</button></div><div class="addon-interval">Every <select id="addon-water-minutes" aria-label="Water reminder interval">${[15,30,45,60,90,120].map(n=>`<option value="${n}" ${n===addonState.waterMinutes?'selected':''}>${n} min</option>`).join('')}</select></div>`);
  setIco($('#v-addons'));for(const id of Object.keys(ADDONS))setIco($('#v-'+id));
}
renderers.push(renderAddons);
bridge.onAddonState?.(syncAddonState);
bridge.onAddonAlert?.(event=>{if(event?.title)notice('bell',event.title,5000);});
bridge.onProductivityState?.(s=>{if(s){addonProductivity=s;renderAddons();}});
Promise.all([bridge.addonState?.(),bridge.productivityState?.()]).then(([a,p])=>{if(p)addonProductivity=p;syncAddonState(a);}).catch(()=>{});
acts.addonmanage=()=>{addonManage=true;addonRenderKey='';renderAddons();};
acts.addonpick=async el=>{addonPickTarget=el.dataset.feature;try{const result=await bridge.addonCommand?.('select',addonPickTarget);if(result){addonManage=false;syncAddonState(result);if(curKey==='addons')go(addonPickTarget);}}finally{addonPickTarget='';}};
acts.addonprayer=async()=>syncAddonState(await bridge.addonCommand?.('prayer-enabled',!addonState.prayerEnabled));
acts.addonwater=async()=>syncAddonState(await bridge.addonCommand?.('water-enabled',!addonState.waterEnabled));
async function addonSave(type,payload){if(await bridge.productivitySave?.(type,payload)){addonProductivity=await bridge.productivityState?.()||addonProductivity;addonRenderKey='';renderAddons();}}
acts.addontaskdelete=el=>addonSave('delete-task',el.dataset.id);
acts.addonnotedelete=el=>addonSave('delete-note',el.dataset.id);
for(const id of Object.keys(ADDONS))$('#v-'+id).addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(form.id==='addon-task-form'||form.id==='addon-note-form'){const text=form.elements.text.value.trim();if(text)await addonSave(form.id==='addon-task-form'?'task':'note',{text});}else if(form.id==='addon-city-form'){syncAddonState(await bridge.addonCommand?.('city',form.elements.city.value.trim()));}});
$('#v-todo').addEventListener('change',async e=>{const id=e.target.dataset.taskToggle;if(id)await addonSave('task-toggle',id);});
$('#v-water').addEventListener('change',async e=>{if(e.target.id==='addon-water-minutes')syncAddonState(await bridge.addonCommand?.('water-interval',Number(e.target.value)));});
