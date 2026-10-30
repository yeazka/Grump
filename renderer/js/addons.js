'use strict';
const ADDONS={todo:{label:'To-do',icon:'check'},notes:{label:'Notes',icon:'file'},prayer:{label:'Sholat',icon:'moon'},water:{label:'Minum',icon:'drop'}};
let addonState={selected:[],city:'Jakarta',waterMinutes:60,waterEnabled:false,prayerEnabled:false,prayer:null,waterNextAt:0};
let addonProductivity={tasks:[],notes:[]};
let addonManage=false;
let addonRenderKey='';
let addonPickTarget='';
let noteEditor=null;
let todoClearArmedUntil=0;
let todoClearTimer=null;
function syncTodoFade(){const list=$('#v-todo .todo-list');if(list)list.classList.toggle('has-more',list.scrollHeight>list.clientHeight+2&&list.scrollTop+list.clientHeight<list.scrollHeight-2);}
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
  if(curKey==='notes' && noteEditor)return;
  const selected=addonState.selected||[];
  const key=JSON.stringify([selected,addonManage,addonState.city,addonState.waterMinutes,addonState.waterEnabled,addonState.waterNextAt,addonState.prayerEnabled,addonState.prayerStatus,addonState.prayer,addonProductivity.tasks,addonProductivity.notes]);
  if(key===addonRenderKey)return;
  addonRenderKey=key;
  const missing=Object.entries(ADDONS).filter(([id])=>!selected.includes(id));
  const picker=addonManage
    ?missing.map(([id,v])=>`<button class="addon-pick" data-act="addonpick" data-feature="${id}"><span data-ico="${v.icon}"></span><span>${v.label}</span><span data-ico="plus"></span></button>`).join('')
    :'<button class="addon-empty" data-act="addonmanage"><span data-ico="plus"></span><span>Add features</span></button>';
  setHTML('addon-picker',picker);
  const tasks=addonProductivity.tasks||[];
  const completed=tasks.filter(t=>t.done).length;
  const open=tasks.length-completed;
  const percent=tasks.length?Math.round(completed/tasks.length*100):0;
  const previousTodoScroll=$('#v-todo .todo-list')?.scrollTop||0;
  setText('todo-open-count',`${open} open`);
  setText('todo-done-count',`${completed} done`);
  const clearButton=$('#v-todo .todo-clear');
  clearButton.hidden=!tasks.length;
  clearButton.dataset.confirm=Date.now()<todoClearArmedUntil?'1':'0';
  clearButton.querySelector('.todo-clear-label').textContent=clearButton.dataset.confirm==='1'?'Sure?':'Clear';
  clearButton.setAttribute('aria-label',clearButton.dataset.confirm==='1'?'Confirm clearing all tasks':'Clear all tasks');
  setHTML('addon-todo-body',`<form class="addon-form todo-form" id="addon-task-form" novalidate><input name="text" maxlength="500" placeholder="Add a task" aria-label="New task" required><button class="addon-glass" aria-label="Add task" title="Add task"><span data-ico="plus"></span></button></form><div class="todo-list" role="list" aria-label="Tasks">${tasks.length?[...tasks].sort((a,b)=>Number(b.done)-Number(a.done)).slice(0,20).map(t=>`<div class="todo-row ${t.done?'is-done':''}" role="listitem"><input type="checkbox" data-task-toggle="${esc(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'Mark incomplete':'Complete'}: ${esc(t.text)}"><span class="todo-text" title="${esc(t.text)}">${esc(t.text)}</span><button type="button" data-act="addontaskdelete" data-id="${esc(t.id)}" aria-label="Delete: ${esc(t.text)}" title="Delete task"><span data-ico="close"></span></button></div>`).join(''):'<div class="todo-empty">No tasks yet. Add one above.</div>'}</div><div class="todo-progress"><span>${completed} of ${tasks.length} completed</span><span>${percent}%</span><div class="todo-progress-track" role="progressbar" aria-label="To-do progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div></div>`);
  const todoList=$('#v-todo .todo-list');if(todoList){todoList.scrollTop=previousTodoScroll;todoList.addEventListener('scroll',syncTodoFade,{passive:true});requestAnimationFrame(syncTodoFade);}
  setHTML('addon-notes-body',`<button class="note-new" data-act="notenew"><span data-ico="plus" aria-hidden="true"></span>New note</button><div class="note-list">${addonProductivity.notes.length?addonProductivity.notes.map(n=>`<div class="note-row"><button class="note-open" data-act="noteopen" data-id="${esc(n.id)}"><b>${esc(n.text.split('\n')[0]||'Untitled')}</b><span>${esc(n.text.split('\n').slice(1).join(' ').trim()||'No additional text')}</span></button><button class="note-delete" data-act="addonnotedelete" data-id="${esc(n.id)}" aria-label="Delete note"><span data-ico="trash"></span></button></div>`).join(''):'<div class="addon-hint">No notes yet. Create one above.</div>'}</div>`);
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
acts.todoclear=async()=>{
  if(!addonProductivity.tasks?.length)return;
  if(Date.now()<todoClearArmedUntil){todoClearArmedUntil=0;clearTimeout(todoClearTimer);await addonSave('clear-tasks');return;}
  todoClearArmedUntil=Date.now()+4000;
  const button=$('#v-todo .todo-clear');button.dataset.confirm='1';button.querySelector('.todo-clear-label').textContent='Sure?';button.setAttribute('aria-label','Confirm clearing all tasks');
  clearTimeout(todoClearTimer);
  todoClearTimer=setTimeout(()=>{todoClearArmedUntil=0;const current=$('#v-todo .todo-clear');if(current){current.dataset.confirm='0';current.querySelector('.todo-clear-label').textContent='Clear';current.setAttribute('aria-label','Clear all tasks');}},4000);
};
acts.addonnotedelete=el=>addonSave('delete-note',el.dataset.id);
function openNoteEditor(note){const lines=String(note?.text||'').split('\n');const title=lines.shift()||'',body=lines.join('\n');noteEditor={id:note?.id||null,original:note?.text||''};S.focusLock=true;bridge.setFocusable?.(true);setHTML('addon-notes-body',`<div class="note-editor-head"><button data-act="notecancel">Back</button><button data-act="notedone">Done</button></div><input class="note-title" maxlength="500" aria-label="Note title" placeholder="Title" value="${esc(title)}"><textarea class="note-editor" maxlength="9500" aria-label="Note content" placeholder="Start writing…">${esc(body)}</textarea><div class="note-save-error" role="status" hidden>Could not save. Try again.</div>`);$('#addon-notes-body .note-title').focus();}
acts.notenew=()=>openNoteEditor(null);
acts.noteopen=el=>{const note=addonProductivity.notes.find(n=>n.id===el.dataset.id);if(note)openNoteEditor(note);};
async function closeNoteEditor(save){const title=$('#addon-notes-body .note-title')?.value.trim()||'',body=$('#addon-notes-body .note-editor')?.value.trim()||'',text=title?(body?title+'\n'+body:title):body,id=noteEditor?.id;if(save&&text&&text!==noteEditor?.original){try{const ok=await bridge.productivitySave?.(id?'update-note':'note',id?{id,text}:{text});if(!ok)throw new Error('save failed');}catch{const error=$('#addon-notes-body .note-save-error');if(error)error.hidden=false;return;}}noteEditor=null;S.focusLock=false;bridge.setFocusable?.(false);addonProductivity=await bridge.productivityState?.()||addonProductivity;addonRenderKey='';renderAddons();}
acts.notedone=()=>closeNoteEditor(true);
acts.notecancel=()=>closeNoteEditor(true);
for(const id of Object.keys(ADDONS))$('#v-'+id).addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(form.id==='addon-task-form'||form.id==='addon-note-form'){const text=form.elements.text.value.trim();if(!text&&form.id==='addon-task-form'){form.classList.remove('is-invalid');void form.offsetWidth;form.classList.add('is-invalid');form.elements.text.focus();return;}if(text)await addonSave(form.id==='addon-task-form'?'task':'note',{text});}else if(form.id==='addon-city-form'){syncAddonState(await bridge.addonCommand?.('city',form.elements.city.value.trim()));}});
$('#v-todo').addEventListener('input',e=>{if(e.target.closest('#addon-task-form'))e.target.closest('form').classList.remove('is-invalid');});
$('#v-todo').addEventListener('change',async e=>{const id=e.target.dataset.taskToggle;if(id)await addonSave('task-toggle',id);});
$('#v-water').addEventListener('change',async e=>{if(e.target.id==='addon-water-minutes')syncAddonState(await bridge.addonCommand?.('water-interval',Number(e.target.value)));});
