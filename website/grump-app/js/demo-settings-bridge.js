'use strict';
(function(){
  document.documentElement.style.background='#050506';
  document.body.style.background='#050506';
  document.body.classList.add('demo-display-only');
  const listeners={settings:[],addons:[],updates:[]};
  const settings={offsetX:0,theme:'default',eyeMode:'auto',staticExp:'normal',angryVariant:'gold-matrix',angryRadius:145,sensitivity:2,dockMode:'anchored',islandWidth:128,islandHeight:32,islandTransparency:0,weatherEnabled:true,weatherCity:'jakarta',displayTargets:['id:1'],language:'en',autoStart:true,hideFullscreen:true,menuMusic:true,menuTimer:true,menuStash:true,batteryToast:true,headsetToast:true,gameModeQuiet:true};
  const addons={selected:['todo','notes','prayer','water'],waterEnabled:true,prayerEnabled:true};
  const emit=(key,value)=>listeners[key].forEach(fn=>{try{fn(value)}catch{}});
  window.dynIsland={
    onSettings:fn=>listeners.settings.push(fn),
    onAddonState:fn=>listeners.addons.push(fn),
    onUpdateStatus:fn=>listeners.updates.push(fn),
    saveSettings:patch=>{Object.assign(settings,patch||{});emit('settings',{...settings})},
    setSetting:(key,value)=>{settings[key]=value;emit('settings',{...settings})},
    setOffset:value=>{settings.offsetX=Number(value)||0;emit('settings',{...settings})},
    addonState:async()=>({...addons}),
    addonCommand:async(command,value)=>{if(command==='select'&&!addons.selected.includes(value))addons.selected.push(value);if(command==='remove')addons.selected=addons.selected.filter(id=>id!==value);emit('addons',{...addons});return {...addons}},
    displayOptions:async()=>[
      {value:'id:1',name:'Main Display',width:1920,height:1080,primary:true},
      {value:'id:2',name:'Second Display',width:2560,height:1440,primary:false}
    ],
    appVersion:async()=>'1.1.0',checkForUpdates:async()=>({status:'idle'}),restartAppUpdate(){},closeSettingsWindow(){},quitApp(){},openSettingsWindow(){}
  };
  setTimeout(()=>{emit('settings',{...settings});emit('addons',{...addons});document.querySelector('[data-tab="display"]')?.click()},80);
})();
