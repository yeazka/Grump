'use strict';
let connectionCloseTimer=null;
let connectionKind='bluetooth',connectionState={on:null,items:[]},connectionBusy=false,connectionTarget=null,connectionPoll=null;
function renderConnection(){
 $('#connection-title').textContent=connectionKind==='wifi'?'Wi-Fi':'Bluetooth';
 const power=$('#connection-power');power.setAttribute('aria-label',$('#connection-title').textContent+' power');power.setAttribute('aria-checked',String(connectionState.on===true));power.disabled=connectionBusy||connectionState.on===null;
 $('#connection-refresh').disabled=connectionBusy;
 const ordered=[...connectionState.items].sort((a,b)=>Number(b.connected===true)-Number(a.connected===true));
 const connectedCount=ordered.filter(x=>x.connected===true).length;
 $('#connection-list').innerHTML=ordered.map((item,index)=>`${index===connectedCount&&connectedCount>0&&connectedCount<ordered.length?'<div class="connection-divider"><span>Available</span></div>':''}<button class="connection-device" data-connection-index="${index}" data-kind="${connectionKind}" data-connected="${item.connected===true?'1':'0'}" ${connectionBusy?'disabled':''}><span class="connection-icon">${icoOf(connectionKind==='wifi'?'wifi':'bluetooth')}</span><span class="connection-name">${esc(item.name)}<small>${item.connected?'Connected':connectionKind==='wifi'?(item.secured?'Secured network':'Open network'):(item.paired?'Paired · tap to connect':'Tap to pair')}</small></span><span class="connection-check">${item.connected?icoOf('check'):icoOf('right')}</span></button>`).join('');
}
async function connectionRequest(action='scan',extra={}){
 if(connectionBusy)return;connectionBusy=true;renderConnection();
 $('#connection-message').textContent=action==='scan'?'Looking for '+(connectionKind==='wifi'?'networks…':'devices…'):'Working…';
 try{
  const result=await bridge.connectionCommand({kind:connectionKind,action,...extra});
  if(result.ok){connectionState={on:result.on,items:Array.isArray(result.items)?result.items:[]};$('#connection-message').textContent=result.message||(!result.on?'Turn on to find connections':!connectionState.items.length?'No devices found. Make your device discoverable.':'');}
  else $('#connection-message').textContent=result.error||'Could not complete request.';
 }catch(_){$('#connection-message').textContent='Connection service unavailable.';}
 finally{connectionBusy=false;renderConnection();}
}
function closeConnection(){
 clearTimeout(connectionCloseTimer);$('#v-connectivity').hidden=true;dismissConnectionPassword();
 clearInterval(connectionPoll);connectionPoll=null;
}
function openConnection(kind){
 if($('#v-connectivity').hidden===false && connectionKind===kind){closeConnection();return;}
 if(connectionBusy)return;
 clearTimeout(connectionCloseTimer);connectionKind=kind;connectionState={on:null,items:[]};$('#v-connectivity').hidden=false;connectionRequest();
 clearInterval(connectionPoll);connectionPoll=setInterval(()=>{if(!$('#v-connectivity').hidden&&!connectionTarget&&!connectionBusy)connectionRequest();else if($('#v-connectivity').hidden){clearInterval(connectionPoll);connectionPoll=null;}},12000);
}
acts.bluetoothsettings=()=>openConnection('bluetooth');acts.wifisettings=()=>openConnection('wifi');
function dismissConnectionPassword(){connectionTarget=null;$('#connection-password').hidden=true;$('#connection-secret').value='';S.focusLock=false;bridge.setFocusable?.(false);}
acts.connectionback=closeConnection;
function scheduleConnectionClose(){clearTimeout(connectionCloseTimer);connectionCloseTimer=setTimeout(()=>{if(!connectionTarget)closeConnection();},180);}
$('#v-connectivity').addEventListener('pointerleave',scheduleConnectionClose);
$('#v-connectivity').addEventListener('pointerenter',()=>clearTimeout(connectionCloseTimer));
for(const kind of ['wifi','bluetooth']){const button=document.querySelector('[data-act="'+kind+'settings"]');button?.addEventListener('pointerleave',e=>{if(!$('#v-connectivity').contains(e.relatedTarget))scheduleConnectionClose();});button?.addEventListener('pointerenter',()=>clearTimeout(connectionCloseTimer));}
window.addEventListener('pointerdown',e=>{if(!$('#v-connectivity').hidden&&!e.target.closest('#v-connectivity,[data-act="bluetoothsettings"],[data-act="wifisettings"]'))closeConnection();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#v-connectivity').hidden){e.stopPropagation();closeConnection();}},true);
$('#connection-refresh').addEventListener('click',()=>connectionRequest());
$('#connection-power').addEventListener('click',()=>connectionRequest('power',{on:!connectionState.on}));
$('#connection-list').addEventListener('click',e=>{
 const b=e.target.closest('[data-connection-index]');if(!b||connectionBusy)return;
 const item=[...connectionState.items].sort((a,b)=>Number(b.connected===true)-Number(a.connected===true))[Number(b.dataset.connectionIndex)];if(!item)return;
 if(connectionKind==='wifi'){
  if(item.connected){connectionRequest('disconnect');return;}
  if(item.secured){connectionTarget=item;$('#connection-password').hidden=false;$('#connection-message').textContent='Join '+item.name;S.focusLock=true;bridge.setFocusable?.(true);$('#connection-secret').focus();}
  else connectionRequest('connect',{id:item.id});
 }else if(!item.connected)connectionRequest(item.paired?'connect':'pair',{id:item.id});
});
$('#connection-password').addEventListener('submit',e=>{e.preventDefault();if(!connectionTarget)return;const id=connectionTarget.id,password=$('#connection-secret').value;dismissConnectionPassword();connectionRequest('connect',{id,password});});
$('#connection-cancel').addEventListener('click',dismissConnectionPassword);

