'use strict';
const api=window.grumpTools;
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={history:[],pins:[],notes:[],tasks:[],downloads:[]};
let toastTimer;
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900);}
function itemHtml(x,pinned=false){const label=x.kind==='image'?`<img src="${x.preview}" alt="Copied image">`:`<span>${esc(x.text)}</span>`;return `<div class="item"><div class="item-main">${label}<small>${esc(x.kind.toUpperCase())}</small></div><div class="item-actions"><button data-paste="${esc(x.id)}" title="Paste into previous app">Paste</button><button data-copy="${esc(x.id)}">Copy</button><button data-${pinned?'unpin':'pin'}="${esc(x.id)}">${pinned?'Unpin':'Pin'}</button></div></div>`;}
function render(){
  $('#pause-history').textContent=state.clipboardPaused?'Resume':'Pause';
  $('#pins').innerHTML=state.pins.length?state.pins.map(x=>itemHtml(x,true)).join(''):'<div class="empty">Nothing pinned yet.</div>';
  $('#history').innerHTML=state.history.length?state.history.map(x=>itemHtml(x)).join(''):'<div class="empty">Copy text, an image, a link, or a HEX color to see it here.</div>';
  $('#note-list').innerHTML=state.notes.length?state.notes.map(x=>`<div class="item"><div class="item-main">${esc(x.text)}</div><button data-delete-note="${esc(x.id)}">Delete</button></div>`).join(''):'<div class="empty">No notes yet.</div>';
  $('#task-list').innerHTML=state.tasks.length?state.tasks.map(x=>`<div class="item"><div class="item-main"><label><input type="checkbox" data-toggle-task="${esc(x.id)}" ${x.done?'checked':''}> ${x.important?'● ':''}${esc(x.text)}</label>${x.remindAt?`<small>${new Date(x.remindAt).toLocaleString()}</small>`:''}</div><button data-delete-task="${esc(x.id)}">Delete</button></div>`).join(''):'<div class="empty">No tasks yet.</div>';
  $('#download-list').innerHTML=state.downloads.length?state.downloads.map(x=>`<div class="item"><div class="item-main">${esc(x.name)}<small>${x.status==='active'?'Downloading':'Done'} · ${(x.bytes/1048576).toFixed(1)} MB${x.status==='active'?' · '+(x.speed/1048576).toFixed(1)+' MB/s':''}</small>${x.status==='active'?'<div class="download-progress" aria-label="Download in progress"><i></i></div>':''}</div></div>`).join(''):'<div class="empty">No active downloads detected.</div>';
}
api.onState(s=>{state=s;render();});api.state().then(s=>{state=s;render();});
document.addEventListener('click',async e=>{
  const tab=e.target.closest('[data-tab]');if(tab){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id===tab.dataset.tab));if(tab.dataset.tab==='capture')loadSources();return;}
  const btn=e.target.closest('button');if(!btn)return;
  for(const action of ['paste','copy','pin','unpin'])if(btn.dataset[action]){await api.clipboard(action,btn.dataset[action]);toast(action==='paste'?'Pasting…':action==='copy'?'Copied to clipboard':action==='pin'?'Pinned':'Unpinned');return;}
  for(const action of ['deleteNote','deleteTask'])if(btn.dataset[action]){await api.save(action==='deleteNote'?'delete-note':'delete-task',btn.dataset[action]);return;}
  if(btn.id==='clear-history'){await api.clipboard('clear','');toast('History cleared');}
  if(btn.id==='pause-history'){const paused=await api.clipboard('pause','');toast(paused?'Clipboard paused':'Clipboard resumed');}
  if(btn.id==='refresh-sources')loadSources();
  if(btn.id==='run-ocr'){toast('Reading text…');try{$('#ocr-text').value=await api.ocr();toast($('#ocr-text').value?'Text extracted':'No text found');}catch(_){toast('OCR failed');}}
  if(btn.id==='copy-ocr' && $('#ocr-text').value){await api.copyText($('#ocr-text').value);toast('Text copied');}
  if(btn.id==='capture-area'){const image=await api.captureArea();if(image){showCapture(image);toast('Area copied');}else toast('Capture cancelled');}
  if(btn.dataset.source){const image=await api.capture(btn.dataset.source);if(image){showCapture(image);toast('Screenshot copied');}else toast('Capture failed');}
});
document.addEventListener('change',e=>{if(e.target.dataset.toggleTask)api.save('task-toggle',e.target.dataset.toggleTask);});
$('#note-form').addEventListener('submit',async e=>{e.preventDefault();if(await api.save('note',{text:$('#note-text').value})){$('#note-text').value='';toast('Note saved');}});
$('#task-form').addEventListener('submit',async e=>{e.preventDefault();const date=$('#task-reminder').value;const remindAt=date?new Date(date).getTime():0;if(await api.save('task',{text:$('#task-text').value,remindAt,important:$('#task-important').checked})){$('#task-text').value='';$('#task-reminder').value='';$('#task-important').checked=false;toast('Task added');}});
async function loadSources(){const sources=await api.sources();$('#sources').innerHTML=sources.length?sources.map(x=>`<button class="source" data-source="${esc(x.id)}"><img src="${x.preview}" alt=""><span>${esc(x.name)}</span></button>`).join(''):'<div class="empty">No screen or window found.</div>';}
function showCapture(dataUrl){const img=new Image();img.onload=()=>{const canvas=$('#capture-canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);$('#capture-result').hidden=false;};img.src=dataUrl;}
$('#capture-canvas').addEventListener('click',async e=>{const c=e.currentTarget,r=c.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*c.width/r.width),y=Math.floor((e.clientY-r.top)*c.height/r.height),px=c.getContext('2d').getImageData(x,y,1,1).data,hex='#'+[...px].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();await api.copyColor(hex);$('#capture-color').textContent=hex+' copied';toast('HEX copied');});
