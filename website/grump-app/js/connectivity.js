'use strict';
let connectionCloseTimer=null;
let selectedConnectedId=null;
let connectionKind='bluetooth',connectionState={on:null,ethernet:false,ethernetNames:[],items:[]},connectionBusy=false,connectionTarget=null,connectionPoll=null;
function renderConnection(){
 const idLang=isId();
 const isEth=connectionKind==='wifi'&&(connectionState.ethernet===true||window.__lastConnectivityState?.wifi?.ethernet===true);
 const ethNames=(Array.isArray(connectionState.ethernetNames)&&connectionState.ethernetNames.length)?connectionState.ethernetNames:(window.__lastConnectivityState?.wifi?.ethernetNames||[]);
 $('#connection-title').textContent=connectionKind==='wifi'?(isEth?(idLang?'LAN & Wi-Fi':'Ethernet & Wi-Fi'):'Wi-Fi'):'Bluetooth';
 const power=$('#connection-power');power.setAttribute('aria-label',(connectionKind==='wifi'?'Wi-Fi':'Bluetooth')+' power');power.setAttribute('aria-checked',String(connectionState.on===true));power.disabled=connectionBusy||connectionState.on===null;
 $('#connection-refresh').disabled=connectionBusy;
 const ordered=[...connectionState.items].sort((a,b)=>Number(b.connected===true)-Number(a.connected===true));
 const connectedCount=ordered.filter(x=>x.connected===true).length;
 const ethBanner=isEth?`<div class="connection-device connection-lan-card" data-connected="1"><span class="connection-icon">${icoOf('ethernet')}</span><span class="connection-name">${esc(ethNames[0]||'Ethernet (LAN)')}<small>${idLang?'Tersambung via kabel LAN':'Connected via LAN cable'}</small></span><span class="connection-lan-badge">LAN</span></div>`:'';
 $('#connection-list').innerHTML=ethBanner+ordered.map((item,index)=>`${index===connectedCount&&connectedCount>0&&connectedCount<ordered.length?`<div class="connection-divider"><span>${idLang?'Tersedia':'Available'}</span></div>`:''}<button type="button" class="connection-device" data-connection-index="${index}" data-kind="${connectionKind}" data-connected="${item.connected===true?'1':'0'}" ${connectionBusy?'disabled':''}><span class="connection-icon">${icoOf(connectionKind==='wifi'?'wifi':'bluetooth')}</span><span class="connection-name">${esc(item.name)}<small>${item.connected?(idLang?'Tersambung · ketuk untuk putuskan':'Connected · tap to disconnect'):connectionKind==='wifi'?(item.secured?(idLang?'Jaringan terproteksi':'Secured network'):(idLang?'Jaringan terbuka':'Open network')):(item.paired?(idLang?'Dipasangkan · ketuk untuk sambung':'Paired · tap to connect'):(idLang?'Ketuk untuk pasangkan':'Tap to pair'))}</small></span>${item.connected?`<span class="connection-disconnect-inline" data-disconnect-id="${esc(item.id)}">${idLang?'Putuskan':'Disconnect'}</span>`:`<span class="connection-check">${icoOf('right')}</span>`}</button>`).join('');
}
async function connectionRequest(action='scan',extra={}){
 if(connectionBusy)return;connectionBusy=true;renderConnection();
 const idLang=isId();
 $('#connection-message').textContent=action==='scan'?(idLang?'Mencari '+(connectionKind==='wifi'?'jaringan…':'perangkat…'):'Looking for '+(connectionKind==='wifi'?'networks…':'devices…')):(action==='disconnect'?(idLang?'Memutuskan sambungan…':'Disconnecting…'):(idLang?'Memproses…':'Working…'));
 try{
  const result=await bridge.connectionCommand({kind:connectionKind,action,...extra});
  if(result.openedSettings){closeConnection();return;}
  if(result.ok){
   connectionState={on:result.on,canDisconnect:result.canDisconnect!==false,ethernet:result.ethernet===true,ethernetNames:Array.isArray(result.ethernetNames)?result.ethernetNames:[],items:Array.isArray(result.items)?result.items:[]};
   const connectedNames=connectionState.items.filter(x=>x.connected===true).map(x=>x.name);
   if(window.__lastConnectivityState){
    window.__lastConnectivityState={
     ...window.__lastConnectivityState,
     [connectionKind]:{
      ...(window.__lastConnectivityState[connectionKind]||{}),
      on:result.on,
      names:connectedNames,
      ...(connectionKind==='wifi'?{ethernet:connectionState.ethernet,ethernetNames:connectionState.ethernetNames}:{})
     }
    };
    if(typeof syncConnectivityButtons==='function')syncConnectivityButtons(window.__lastConnectivityState);
   }
   const msgMap=idLang?{Connected:'Tersambung',Disconnected:'Terputus'}:{};
   $('#connection-message').textContent=msgMap[result.message]||result.message||(!result.on?(idLang?'Aktifkan sakelar di atas untuk mencari koneksi':'Turn on to find connections'):!connectionState.items.length?(idLang?'Perangkat tidak ditemukan.':'No devices found. Make your device discoverable.'):'');
  }
  else $('#connection-message').textContent=result.error||'Could not complete request.';
 }catch(_){$('#connection-message').textContent='Connection service unavailable.';}
 finally{connectionBusy=false;renderConnection();}
}
function closeConnection(){
 clearTimeout(connectionCloseTimer);selectedConnectedId=null;$('#v-connectivity').hidden=true;delete island.dataset.connectivityOpen;dismissConnectionPassword();reportRect();
 clearInterval(connectionPoll);connectionPoll=null;
}
function openConnection(kind){
 if($('#v-connectivity').hidden===false && connectionKind===kind){closeConnection();return;}
 if(connectionBusy)return;
 clearTimeout(connectionCloseTimer);selectedConnectedId=null;connectionKind=kind;
 const cached=window.__lastConnectivityState?.[kind];
 connectionState={on:cached?.on??null,ethernet:window.__lastConnectivityState?.wifi?.ethernet===true,ethernetNames:window.__lastConnectivityState?.wifi?.ethernetNames||[],items:[]};
 $('#v-connectivity').hidden=false;island.dataset.connectivityOpen='1';reportRect();connectionRequest();
 clearInterval(connectionPoll);connectionPoll=setInterval(()=>{if(!$('#v-connectivity').hidden&&!connectionTarget&&!connectionBusy)connectionRequest();else if($('#v-connectivity').hidden){clearInterval(connectionPoll);connectionPoll=null;}},12000);
}
acts.bluetoothsettings=()=>openConnection('bluetooth');acts.wifisettings=()=>openConnection('wifi');
function dismissConnectionPassword(){connectionTarget=null;$('#connection-password').hidden=true;$('#connection-secret').value='';S.focusLock=false;bridge.setFocusable?.(false);}
acts.connectionback=closeConnection;
function scheduleConnectionClose(){clearTimeout(connectionCloseTimer);connectionCloseTimer=setTimeout(closeConnection,180);}
$('#v-connectivity').addEventListener('pointerleave',e=>{if(!e.relatedTarget?.closest?.('[data-act="bluetoothsettings"],[data-act="wifisettings"]'))scheduleConnectionClose();});
$('#v-connectivity').addEventListener('pointerenter',()=>clearTimeout(connectionCloseTimer));
for(const kind of ['wifi','bluetooth']){const button=document.querySelector('[data-act="'+kind+'settings"]');button?.addEventListener('pointerleave',e=>{if(!$('#v-connectivity').contains(e.relatedTarget))scheduleConnectionClose();});button?.addEventListener('pointerenter',()=>clearTimeout(connectionCloseTimer));}
window.addEventListener('pointerdown',e=>{if(!$('#v-connectivity').hidden&&!e.target.closest('#v-connectivity,[data-act="bluetoothsettings"],[data-act="wifisettings"]'))closeConnection();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#v-connectivity').hidden){e.stopPropagation();closeConnection();}},true);
$('#connection-refresh').addEventListener('click',()=>connectionRequest());
$('#connection-power').addEventListener('click',()=>connectionRequest('power',{on:!connectionState.on}));
$('#connection-list').addEventListener('click',e=>{
 const disconnect=e.target.closest('[data-disconnect-id]');
 if(disconnect&&!connectionBusy){const id=disconnect.dataset.disconnectId;selectedConnectedId=null;connectionRequest('disconnect',{id});return;}
 const b=e.target.closest('[data-connection-index]');if(!b||connectionBusy)return;
 const item=[...connectionState.items].sort((a,b)=>Number(b.connected===true)-Number(a.connected===true))[Number(b.dataset.connectionIndex)];if(!item)return;
 if(item.connected){selectedConnectedId=null;connectionRequest('disconnect',{id:item.id});return;}
 selectedConnectedId=null;
 if(connectionKind==='wifi'){
  if(item.secured){connectionTarget=item;$('#connection-password').hidden=false;$('#connection-message').textContent=(isId()?'Gabung ke ':'Join ')+item.name;S.focusLock=true;bridge.setFocusable?.(true);$('#connection-secret').focus();}
  else connectionRequest('connect',{id:item.id});
 }else if(!item.connected)connectionRequest(item.paired?'connect':'pair',{id:item.id});
});
$('#connection-password').addEventListener('submit',e=>{e.preventDefault();if(!connectionTarget)return;const id=connectionTarget.id,password=$('#connection-secret').value;dismissConnectionPassword();connectionRequest('connect',{id,password});});
$('#connection-cancel').addEventListener('click',dismissConnectionPassword);


new MutationObserver(()=>{if(!$('#v-connectivity').hidden&&island.dataset.key!=='home')closeConnection();}).observe(island,{attributes:true,attributeFilter:['data-key']});
