const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, net, shell, Notification } = require('electron');
const os = require('os');
app.setName('Grump');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { updateChannel, mediaDisplay, validLocalPath } = require('./runtime-policy.cjs');
const { installProductivity } = require('./productivity.cjs');
const { installPersonalFeatures } = require('./personal-features.cjs');
const { codexActivity } = require('./codex-activity.cjs');
const { antigravityActivity } = require('./antigravity-activity.cjs');
const { LOCATIONS, createWeatherService } = require('./weather.cjs');
const { trustedSender, lockWindow } = require('./ipc-security.cjs');
const channel = () => updateChannel({packaged:app.isPackaged, windowsStore:process.windowsStore, metadata:require('./package.json').grumpChannel, env:process.env, argv:process.argv});
const githubUpdatesEnabled = () => channel() === 'setup';
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (_) {}
let updateState = { status:'idle', version:app.getVersion() };
const W = 440, H = 250;
const islands = new Map();
let settingsWin = null, tray, ps, psBuf = '', lastMedia = null, lastSys = null, quitting = false, productivity = null;
let codexState = { active: false, status: '', detail: '' };
let antigravityState = { active: false, status: '', detail: '' };
let claudeState = { active: false, status: '', detail: '' };
let chatgptState = { active: false, status: '', detail: '' };
const rendererFailures = new Map();
const defaults = {
  mascot:true, minimal:false, hideFullscreen:true, autoTuck:true, offsetX:0,
  theme:'default', eyeMode:'auto', staticExp:'normal', angryVariant:'gold-matrix',
  angryRadius:145, sensitivity:1, quiet:false, quietUntil:0, menuMusic:true, menuTimer:true,
  menuQuiet:false, batteryToast:true, headsetToast:true, gameModeQuiet:true, smartQuietPrompt:false,
  islandWidth:128, islandHeight:32, islandTransparency:0, dockMode:'island', menuStash:true, birthday:'', cursorHug:true,
  weatherEnabled:false, weatherCity:'jakarta'
};
let settings = {...defaults};
let weather;
let timer = {status:'idle', duration:900000, remaining:900000, endAt:0};
const readJson = p => {
  try {
    let s = fs.readFileSync(p, 'utf8');
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    return JSON.parse(s);
  } catch { return null; }
};
const file = name => path.join(app.getPath('userData'),name);
const log = msg => {
  try { fs.appendFileSync(file('island-debug.log'), new Date().toISOString() + ' ' + msg + '\n'); } catch {}
  try { fs.appendFileSync(path.join(__dirname, 'startup.log'), new Date().toISOString() + ' ' + msg + '\n'); } catch {}
};
const alive = c => c && !c.win.isDestroyed();
const send = (c,channel,...args) => {if(alive(c))c.win.webContents.send(channel,...args)};
const broadcast = (channel,...args) => {for(const c of islands.values())send(c,channel,...args)};
function publishUpdateState(){
  broadcast('update-status',updateState);
  if(settingsWin&&!settingsWin.isDestroyed())settingsWin.webContents.send('update-status',updateState);
}
const contextFor = sender => [...islands.values()].find(c=>c.win.webContents===sender);
const islandWindows = () => [...islands.values()].map(c=>c.win);
const fromIsland = e => trustedSender(e,islandWindows(),path.join(__dirname,'renderer','index.html'));
const fromSettings = e => trustedSender(e,[settingsWin],path.join(__dirname,'renderer','settings.html'));
const fromUi = e => fromIsland(e) || fromSettings(e);
function settingsFor(c) {return {...settings,_primary:c.displayId===screen.getPrimaryDisplay().id};}
function saveSettings() {
  fs.writeFileSync(file('settings.json'),JSON.stringify(settings));
  for(const c of islands.values())send(c,'settings',settingsFor(c));
  if(settingsWin&&!settingsWin.isDestroyed())settingsWin.webContents.send('settings',settings);
  applyFullscreen();
  weather?.configure(settings.weatherEnabled, settings.weatherCity);
}
function updateSettings(patch) {
  if(!patch || typeof patch!=='object')return;
  for(const key of Object.keys(defaults)) {
    if(!(key in patch))continue;
    if(['quiet','quietUntil','menuQuiet','smartQuietPrompt'].includes(key))continue;
    const value=patch[key];
    if(typeof defaults[key]==='boolean' && typeof value==='boolean')settings[key]=value;
    else if(key==='offsetX' && Number.isFinite(value))settings[key]=Math.round(Math.max(-500,Math.min(500,value)));
    else if(key==='islandWidth' && Number.isFinite(value))settings[key]=Math.round(Math.max(96,Math.min(260,value)));
    else if(key==='islandHeight' && Number.isFinite(value))settings[key]=Math.round(Math.max(30,Math.min(80,value)));
    else if(key==='islandTransparency' && Number.isFinite(value))settings[key]=Math.round(Math.max(0,Math.min(70,value)));
    else if(key==='angryRadius' && Number.isFinite(value))settings[key]=Math.max(30,Math.min(300,value));
    else if(key==='sensitivity' && Number.isFinite(value))settings[key]=Math.max(.4,Math.min(2,value));
    else if(key==='quietUntil' && Number.isFinite(value))settings[key]=Math.max(0,Math.min(Date.now()+86400000,value));
    else if(key==='birthday' && (value==='' || /^\d{2}-\d{2}$/.test(value)))settings[key]=value;
    else if(key==='weatherCity' && Object.hasOwn(LOCATIONS,value))settings[key]=value;
    else if({theme:['default','outline-glass','full-glass'],eyeMode:['auto','static'],staticExp:['normal','happy','flirty','laugh','sad','lol','greet'],angryVariant:['classic','lightning','flame','ember','pink','rage','laser','berserk','cyber-violet','cyber-amber','gold-matrix'],dockMode:['island','anchored']}[key]?.includes(value))settings[key]=value;
  }
  if(settings.eyeMode==='static' && settings.staticExp==='lol')settings.eyeMode='auto';
  saveSettings();placeAll();
}
function selectedContext() {
  const d=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return islands.get(d.id)||islands.values().next().value;
}
function place(c,display) {
  const b=display.bounds;
  const W=Math.min(c.viewportWidth||440,b.width);
  c.bounds={x:Math.round(Math.max(b.x,Math.min(b.x+b.width-W,b.x+(b.width-W)/2+settings.offsetX))),y:b.y,width:W,height:H};
  c.win.setBounds(c.bounds);
}
function placeAll(){for(const d of screen.getAllDisplays()){const c=islands.get(d.id);if(c)place(c,d)}}
function ignore(c,value) {
  if(!alive(c))return;
  const want = !!value;
  if(c.ignoring===want)return;
  c.ignoring=want;
  c.win.setIgnoreMouseEvents(want, want?{forward:true}:undefined);
}
function syncInputFocus(c) {
  if(!alive(c))return;
  const want=!!(c.rendererActive||c.keyboardFocus);
  if(c.focusable===want)return;
  c.focusable=want;
  c.win.setFocusable(want);
}
function pollPointer() {
  if(!app.isReady())return;
  const p=screen.getCursorScreenPoint();
  if(!pollPointer.lastPoint || p.x!==pollPointer.lastPoint.x || p.y!==pollPointer.lastPoint.y){
    pollPointer.lastMove=Date.now();
    if(pollPointer.lastPoint) for(const c of islands.values()) if(c.hugging){
      c.hugging=false;send(c,'cursor-hug',false);
      setTimeout(()=>{if(alive(c))place(c,screen.getAllDisplays().find(d=>d.id===c.displayId)||screen.getPrimaryDisplay());},260);
    }
    pollPointer.lastPoint=p;
  }
  for(const c of islands.values()) {
    if(!alive(c)||!c.win.isVisible())continue;
    if(c.dodging && !c.tuck)c.dodging=false;
    if(c.hugging){ignore(c,true);continue;}
    const x=p.x-c.bounds.x,y=p.y-c.bounds.y,r=c.rect;
    if(x!==c.lastX||y!==c.lastY) {
      const rTop = (r && r.top >= 0) ? r.top : 0;
      const rHeight = (r && r.height > 0) ? r.height : 22;
      c.lastX=x;c.lastY=y;send(c,'cursor',x-c.bounds.width/2,y-rTop-rHeight/2,x,y);
    }
    const pad=r.height<=24?12:6;
    const reportedInside=x>=r.left-pad&&x<=r.left+r.width+pad&&y>=Math.max(0,r.top-pad)&&y<=r.top+r.height+pad;
    const centerInside=!c.tuck&&Math.abs(x-c.bounds.width/2)<=Math.max(68,Math.min(140,r.width/2+10))&&y>=0&&y<=Math.max(44,Math.min(86,r.top+r.height+8));
    const inside=!c.dodging&&(reportedInside||centerInside);
    if(inside!==c.inside){c.inside=inside;send(c,'pointer',inside)}
    ignore(c,!(inside||c.dragging||c.rendererActive));
  }
}
function maybeHugCursor(){
  if(settings.cursorHug===false || settings.quiet || Date.now()-(pollPointer.lastMove||Date.now())<300000)return;
  if(timer.status==='running' || lastMedia?.status==='Playing')return;
  const p=screen.getCursorScreenPoint();
  const d=screen.getDisplayNearestPoint(p),c=islands.get(d.id);
  if(!c || c.hugging || c.rendererActive || c.fullscreen || c.isGame || !c.win.isVisible())return;
  c.hugging=true;ignore(c,true);
  const b=d.bounds;
  c.bounds={x:Math.max(b.x,Math.min(b.x+b.width-W,p.x-W/2)),y:Math.max(b.y,Math.min(b.y+b.height-H,p.y-20)),width:W,height:H};
  c.win.setBounds(c.bounds);send(c,'cursor-hug',true);
}
let lastCpuTimes=null;
function sampleCpu(){
  const now=os.cpus().reduce((a,c)=>{for(const [k,v] of Object.entries(c.times))a[k]=(a[k]||0)+v;return a;},{});
  if(lastCpuTimes){const total=Object.keys(now).reduce((n,k)=>n+now[k]-lastCpuTimes[k],0);const idle=now.idle-lastCpuTimes.idle;if(total>0)broadcast('cpu-load',Math.round(100*(1-idle/total)));}
  lastCpuTimes=now;
}
function showHome(c=selectedContext()) {
  if(!alive(c))return;
  c.force=true;
  c.forceUntil=Date.now()+60000;
  c.rendererActive=true;
  ignore(c, false);
  c.win.show();
  c.win.setAlwaysOnTop(true, 'screen-saver');
  send(c,'expand-home');
  pollPointer();
}
function showIsland(c=selectedContext()) {
  if(!alive(c))return;
  c.force=false;
  c.rendererActive=false;
  ignore(c, true);
  c.win.showInactive();
  c.win.setAlwaysOnTop(true, 'screen-saver');
  send(c,'collapse');
  pollPointer();
}
function centerPreferences() {
  if(!settingsWin||settingsWin.isDestroyed())return;
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) || screen.getPrimaryDisplay();
  const b = (d && d.workArea) ? d.workArea : { x:0, y:0, width:1920, height:1080 };
  const [w, h] = settingsWin.getSize();
  const x = Math.round(b.x + Math.max(0, (b.width - w) / 2));
  const y = Math.round(b.y + Math.max(0, (b.height - h) / 2));
  settingsWin.setPosition(x, y);
}
function openSettingsWindow() {
  if(settingsWin&&!settingsWin.isDestroyed()) {
    centerPreferences();
    settingsWin.show();
    settingsWin.focus();
    settingsWin.setAlwaysOnTop(true, 'screen-saver');
    settingsWin.webContents.send('settings',settings);
    settingsWin.webContents.send('update-status',updateState);
    return;
  }
  settingsWin=new BrowserWindow({
    width:720,height:640,frame:false,transparent:true,backgroundColor:'#00000000',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    resizable:false,maximizable:false,minimizable:false,alwaysOnTop:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}
  });
  lockWindow(settingsWin,path.join(__dirname,'renderer','settings.html'));
  centerPreferences();
  const showIt = () => {
    if(settingsWin && !settingsWin.isDestroyed()){
      centerPreferences();
      settingsWin.show();
      settingsWin.focus();
      settingsWin.setAlwaysOnTop(true, 'screen-saver');
      settingsWin.webContents.send('settings', settings);
      settingsWin.webContents.send('update-status', updateState);
    }
  };
  settingsWin.once('ready-to-show', showIt);
  settingsWin.webContents.on('did-finish-load', showIt);
  settingsWin.webContents.on('did-fail-load',(_e,code,desc)=>log('Preferences '+code+' '+desc));
  settingsWin.on('blur', () => {
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
  });
  settingsWin.on('closed',()=>{settingsWin=null});
  settingsWin.loadFile(path.join(__dirname,'renderer','settings.html'));
  setTimeout(showIt, 450);
}
function createWindow(display) {
  const win=new BrowserWindow({width:W,height:H,title:'Grump',icon:path.join(__dirname,'assets','icon.png'),frame:false,transparent:true,thickFrame:false,resizable:false,movable:false,minimizable:false,maximizable:false,fullscreenable:false,hasShadow:false,skipTaskbar:true,focusable:false,show:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
  lockWindow(win,path.join(__dirname,'renderer','index.html'));
  const c={win,displayId:display.id,bounds:null,rect:{left:158,top:10,width:124,height:36},inside:false,ignoring:false,dragging:false,dodging:false,rendererActive:false,keyboardFocus:false,focusable:false,force:false,forceUntil:0,fullscreen:false,isGame:false,tuck:false,hugging:false};
  islands.set(display.id,c);
  win.setAlwaysOnTop(true,'screen-saver');
  ignore(c,true);place(c,display);
  win.webContents.on('did-finish-load',()=>{
    send(c,'settings',settingsFor(c));send(c,'timer-state',timer);send(c,'tuck-app',c.tuck);send(c,'codex-activity',codexState);send(c,'antigravity-activity',antigravityState);send(c,'claude-activity',claudeState);send(c,'chatgpt-activity',chatgptState);send(c,'weather-state',weather?.getState());
    if(lastMedia)send(c,'media',lastMedia);
    if(lastSys)send(c,'sys-state',lastSys);
    win.showInactive();pollPointer();
  });
  const recoverRenderer=reason=>{
    log('Renderer '+reason);
    if(quitting || c.recovering)return;
    c.recovering=true;
    const failures=(rendererFailures.get(display.id)||0)+1;
    rendererFailures.set(display.id,failures);
    const delay=Math.min(30000,500*2**Math.min(failures-1,6));
    setTimeout(()=>{
      if(quitting || islands.get(display.id)!==c)return;
      const current=screen.getAllDisplays().find(d=>d.id===display.id);
      if(!current)return;
      try{if(!win.isDestroyed())win.destroy();}catch(err){log('Renderer cleanup: '+err.message)}
      createWindow(current);
      log('Renderer recovered on display '+display.id);
    },delay);
  };
  win.webContents.on('render-process-gone',(_e,d)=>recoverRenderer(JSON.stringify(d)));
  let unresponsiveTimer=null;
  win.on('unresponsive',()=>{if(!unresponsiveTimer)unresponsiveTimer=setTimeout(()=>{unresponsiveTimer=null;recoverRenderer('unresponsive')},15000)});
  win.on('responsive',()=>{if(unresponsiveTimer){clearTimeout(unresponsiveTimer);unresponsiveTimer=null}});
  win.webContents.on('did-finish-load',()=>setTimeout(()=>{if(islands.get(display.id)===c && !c.recovering)rendererFailures.delete(display.id)},60000));
  win.webContents.on('did-fail-load',(_e,code,desc)=>log('Renderer fail: '+code+' '+desc));
  win.webContents.on('console-message',(...args)=>{
    const detail=typeof args[1]==='object'?args[1]:{level:args[1],message:args[2],sourceId:args[4],lineNumber:args[3]};
    if(detail.level==='error'||detail.level===3)log(`Renderer console: ${String(detail.message||'').slice(0,500)} (${detail.sourceId||''}:${detail.lineNumber||''})`);
  });
  win.on('closed',()=>{if(islands.get(display.id)===c)islands.delete(display.id)});
  win.loadFile(path.join(__dirname,'renderer','index.html'));
}
function syncDisplays() {
  const displays=screen.getAllDisplays(), ids=new Set(displays.map(d=>d.id));
  for(const [id,c] of islands){if(!ids.has(id)){islands.delete(id);c.win.destroy()}}
  for(const d of displays){if(!islands.has(d.id))createWindow(d);else place(islands.get(d.id),d)}
  for(const c of islands.values())send(c,'settings',settingsFor(c));
}
function displaySignature() {
  return screen.getAllDisplays().map(d=>`${d.id}:${d.bounds.x},${d.bounds.y},${d.bounds.width},${d.bounds.height}`).join('|');
}
let lastDisplaySignature='';
function refreshDisplays() {
  const signature=displaySignature();
  if(signature===lastDisplaySignature)return;
  lastDisplaySignature=signature;
  syncDisplays();
  log(`Displays synced: ${islands.size} (${signature})`);
}
function applyFullscreen() {
  for(const c of islands.values()) {
    if(!alive(c))continue;
    const isGameOrFs = c.fullscreen || (settings.gameModeQuiet !== false && c.isGame);
    const hide = settings.hideFullscreen !== false && isGameOrFs && !c.force && Date.now() > c.forceUntil;
    if(hide){
      if(c.win.isVisible()){
        c.win.hide();
        ignore(c, true);
        send(c, 'game-mode', true);
      }
    } else {
      if(!c.win.isVisible()){
        c.win.showInactive();
        c.win.setAlwaysOnTop(true, 'screen-saver');
        c.dodging = false;
        c.ignoring = false;
        c.win.setIgnoreMouseEvents(false);
        send(c, 'game-mode', false);
        send(c, 'reset-dodge');
        pollPointer();
      }
    }
  }
}
ipcMain.on('lyric-viewport',(e,width)=>{const c=fromIsland(e)&&contextFor(e.sender);if(!c||!Number.isFinite(width))return;const next=Math.max(440,Math.min(940,Math.ceil(width+90)));if((c.viewportWidth||440)>=next)return;c.viewportWidth=next;place(c,screen.getAllDisplays().find(d=>d.id===c.displayId)||screen.getPrimaryDisplay());});
ipcMain.on('island-rect',(e,r)=>{
  const c=fromIsland(e)&&contextFor(e.sender);
  if(c&&r&&['left','top','width','height'].every(k=>Number.isFinite(r[k]))){c.rect=r;pollPointer()}
});
ipcMain.on('mouse-active',(e,active)=>{
  const c=fromIsland(e)&&contextFor(e.sender);
  if(c){
    c.rendererActive=!!active;
    syncInputFocus(c);
    ignore(c,!(c.inside||c.dragging||c.rendererActive));
  }
});
ipcMain.on('drag-active',(e,active)=>{const c=fromIsland(e)&&contextFor(e.sender);if(c){c.dragging=!!active;pollPointer()}});
ipcMain.on('dodge-active',(e,dodging)=>{const c=fromIsland(e)&&contextFor(e.sender);if(c){c.dodging=!!dodging;ignore(c,!(c.inside||c.dragging||c.rendererActive))}});
ipcMain.on('set-focusable',(e,on)=>{const c=fromIsland(e)&&contextFor(e.sender);if(c){c.keyboardFocus=!!on;syncInputFocus(c);if(on)c.win.focus()}});
ipcMain.on('force-show',(e,on)=>{const c=fromIsland(e)&&contextFor(e.sender);if(c){c.force=!!on;applyFullscreen()}});
ipcMain.on('save-settings',(e,s)=>{if(fromUi(e))updateSettings(s)});
ipcMain.on('set-offset-x',(e,x)=>{if(fromIsland(e))updateSettings({offsetX:Number(x)})});
ipcMain.on('open-settings-window',e=>{if(fromIsland(e))openSettingsWindow()});
let connectionBusy=false;
ipcMain.handle('connectivity-command',async(e,request)=>{
 if(!fromIsland(e))return {ok:false,error:'Unauthorized window'};
 if(connectionBusy)return {ok:false,error:'A connection request is already running.'};
 if(!request||!['wifi','bluetooth'].includes(request.kind)||!['scan','power','connect','disconnect','pair'].includes(request.action))return {ok:false,error:'Invalid request'};
 const safe={kind:request.kind,action:request.action,on:request.on===true,id:typeof request.id==='string'?request.id.slice(0,2048):'',password:typeof request.password==='string'?request.password.slice(0,256):''};
 connectionBusy=true;
 return new Promise(resolve=>{
  let out='',finished=false;
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'connectivity.ps1').replace('app.asar','app.asar.unpacked')],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timeout);connectionBusy=false;resolve(result)};
  const timeout=setTimeout(()=>{child.kill();finish({ok:false,error:'Windows took too long. Refresh and try again.'})},45000);
  child.stdout.setEncoding('utf8');child.stdout.on('data',d=>{out+=d;if(out.length>1000000)child.kill()});
  child.on('error',()=>finish({ok:false,error:'Connection service unavailable'}));
  child.on('exit',()=>{try{finish(JSON.parse(out.trim()))}catch{finish({ok:false,error:'Windows did not return a connection result.'})}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(safe)+'\n');
 });
});
ipcMain.on('close-settings-window',e=>{if(fromSettings(e))settingsWin?.close()});
ipcMain.on('app-quit',e=>{if(fromUi(e))app.quit()});
ipcMain.on('test-angry',e=>{if(fromUi(e))broadcast('test-angry')});
ipcMain.on('test-headset',(e,name)=>{if(fromUi(e))broadcast('headset',{name:name||'Bluetooth Headset',connected:true})});
ipcMain.on('set-volume',(e,v)=>{if(fromIsland(e)&&Number.isFinite(v)&&ps?.stdin&&!ps.stdin.destroyed)ps.stdin.write(`vol:${Math.round(Math.max(0,Math.min(100,v)))}\n`)});
ipcMain.on('set-brightness',(e,b)=>{if(fromIsland(e)&&Number.isFinite(b)&&ps?.stdin&&!ps.stdin.destroyed)ps.stdin.write(`bright:${Math.round(Math.max(0,Math.min(100,b)))}\n`)});

// Stash keeps references to user-selected files; it never copies or deletes them.
ipcMain.handle('file-info', async (e, p) => {
  if (!fromIsland(e) || !validLocalPath(p)) return null;
  try {
    const stat = await fs.promises.stat(p);
    if (!stat.isFile() && !stat.isDirectory()) return null;
    return {name:path.basename(p),size:stat.size,isDir:stat.isDirectory()};
  } catch { return null; }
});
ipcMain.on('start-drag', (e, p) => {
  if (!fromIsland(e) || !validLocalPath(p)) return;
  try {
    const stat=fs.statSync(p);
    if(!stat.isFile()&&!stat.isDirectory())return;
    e.sender.startDrag({file:path.resolve(p),icon:nativeImage.createFromPath(path.join(__dirname,'assets','tray.png')).resize({width:32,height:32})});
  } catch(err) { log('Stash drag failed: '+err.code); }
});

function initUpdater() {
  if (!autoUpdater) return;
  if (!githubUpdatesEnabled()) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    log('Updater: update available: ' + info.version);
    updateState = { status: 'available', version: info.version };
    publishUpdateState();
  });
  autoUpdater.on('update-not-available', (info) => {
    log('Updater: up to date');
    updateState = { status: 'latest', version: app.getVersion() };
    publishUpdateState();
  });
  autoUpdater.on('error', (err) => {
    log('Updater error: ' + (err ? err.message : err));
    updateState = { status: 'error', error: err?.message || String(err) };
    publishUpdateState();
  });
  autoUpdater.on('download-progress', (prog) => {
    updateState = { status: 'downloading', version:updateState.version, percent: Math.round(prog.percent) };
    publishUpdateState();
  });
  autoUpdater.on('update-downloaded', (info) => {
    log('Updater: downloaded: ' + info.version);
    updateState = { status: 'downloaded', version: info.version };
    publishUpdateState();
    if (tray) {
      tray.displayBalloon?.({
        title: 'Grump Update Ready',
        content: `Version ${info.version} has been downloaded. Restart to apply update.`
      });
    }
  });

  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 15000);
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 4 * 60 * 60 * 1000);
}

ipcMain.handle('check-for-updates', async e => {
  if(!fromUi(e))return {status:'error',msg:'Unauthorized window'};
  if (channel() === 'store') return { status: 'store', msg: 'Updates are handled automatically by Windows Store.' };
  if (channel() === 'steam') return { status: 'steam', msg: 'Updates are handled automatically by Steam.' };
  if (channel() === 'manual') return { status: 'manual', msg: 'Download a new build to update this portable copy.' };
  if (!autoUpdater || !app.isPackaged) return { status: 'dev', msg: 'Running in development mode.' };
  if(updateState.status==='downloaded')return updateState;
  try {
    const res = await autoUpdater.checkForUpdates();
    if(updateState.status==='downloaded')return updateState;
    return res?.isUpdateAvailable ? { status: 'available', version: res.updateInfo.version } : { status: 'latest', version: app.getVersion() };
  } catch (err) {
    return { status: 'error', msg: err.message };
  }
});
ipcMain.handle('app-version', e => fromUi(e) ? app.getVersion() : null);
ipcMain.on('restart-app-update', e => {
  if(!fromUi(e))return;
  if (autoUpdater && githubUpdatesEnabled()) autoUpdater.quitAndInstall();
});

function saveTimer(){fs.writeFileSync(file('timer.json'),JSON.stringify(timer));broadcast('timer-state',timer)}
ipcMain.on('timer-command',(e,cmd)=>{
  if(!fromIsland(e))return;
  if(!cmd||typeof cmd!=='object')return;
  if(cmd.action==='start'&&Number.isFinite(cmd.seconds)&&cmd.seconds>=1&&cmd.seconds<=86400){
    const duration=Math.round(cmd.seconds*1000);
    timer={status:'running',duration,remaining:duration,endAt:Date.now()+duration};
  } else if(cmd.action==='set'&&['idle','done'].includes(timer.status)&&Number.isFinite(cmd.seconds)&&cmd.seconds>=1&&cmd.seconds<=86400){
    const duration=Math.round(cmd.seconds*1000);timer={status:'idle',duration,remaining:duration,endAt:0};
  } else if(cmd.action==='pause'&&timer.status==='running'){
    timer={...timer,status:'paused',remaining:Math.max(0,timer.endAt-Date.now()),endAt:0};
  } else if(cmd.action==='resume'&&timer.status==='paused'){
    timer={...timer,status:'running',endAt:Date.now()+timer.remaining};
  } else if(cmd.action==='reset'){
    timer={status:'idle',duration:timer.duration,remaining:timer.duration,endAt:0};
  } else return;
  saveTimer();
});
function tickTimer(){
  if(settings.quiet && settings.quietUntil>0 && Date.now()>=settings.quietUntil)updateSettings({quiet:false,quietUntil:0});
  if(timer.status==='running'&&Date.now()>=timer.endAt){timer={...timer,status:'done',remaining:0,endAt:0};saveTimer()}
}
function pollCodexActivity() {
  const codexHome = path.isAbsolute(process.env.CODEX_HOME || '') ? process.env.CODEX_HOME : path.join(os.homedir(), '.codex');
  const codexSessions = fs.existsSync(path.join(codexHome, 'sessions')) ? path.join(codexHome, 'sessions') : codexHome;
  const next = codexActivity(codexSessions);
  if (next.active !== codexState.active || next.status !== codexState.status || next.detail !== codexState.detail) {
    codexState = next;
    broadcast('codex-activity', next);
  }
  const geminiHome = path.isAbsolute(process.env.GEMINI_HOME || '') ? process.env.GEMINI_HOME : path.join(os.homedir(), '.gemini');
  const antigravitySessions = fs.existsSync(path.join(geminiHome, 'antigravity', 'conversations')) ? path.join(geminiHome, 'antigravity', 'conversations') : path.join(geminiHome, 'conversations');
  const antigravityNext = antigravityActivity(antigravitySessions);
  if (antigravityNext.active !== antigravityState.active || antigravityNext.status !== antigravityState.status || antigravityNext.detail !== antigravityState.detail) {
    antigravityState = antigravityNext;
    broadcast('antigravity-activity', antigravityNext);
  }
}
function startMedia(){
  if(quitting)return;
  const script=path.join(__dirname,'media.ps1').replace('app.asar','app.asar.unpacked');
  ps=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  ps.stdout.setEncoding('utf8');
  ps.stdout.on('data',chunk=>{
    psBuf+=chunk;let i;
    while((i=psBuf.indexOf('\n'))>=0){
      const line=psBuf.slice(0,i).trim();psBuf=psBuf.slice(i+1);
      if(!line)continue;
      try{
        const obj=JSON.parse(line);
        if(obj.claudeActivity){claudeState=obj.claudeActivity;broadcast('claude-activity',claudeState);continue}
        if(obj.chatgptActivity){chatgptState=obj.chatgptActivity;broadcast('chatgpt-activity',chatgptState);continue}
        if(obj.connectivity){broadcast('connectivity',obj.connectivity);continue}
        if(obj.sys){lastSys=obj.sys;broadcast('sys-state',obj.sys);continue}
        if(obj.headset){broadcast('headset',obj.headset);continue}
        if(obj.fullscreen!==undefined){
          const isFs = !!obj.fullscreen;
          const isGame = !!obj.isGame;
          const tuck = !!obj.tuckApp;
          const display = mediaDisplay(screen,obj);
          for(const c of islands.values()){
            const onDisplay=c.displayId===display.id;
            c.fullscreen = onDisplay && isFs;
            c.isGame = onDisplay && isGame;
            const localTuck=onDisplay && tuck;
            if(c.tuck !== localTuck){c.tuck = localTuck;if(!localTuck)c.dodging=false;send(c,'tuck-app',localTuck)}
          }
          applyFullscreen();
          if(obj.fgApp!==undefined)broadcast('fg-app',{app:obj.fgApp,title:obj.fgTitle||'',isGame,fullscreen:isFs});
          continue;
        }
        lastMedia=obj.thumb||!lastMedia||obj.title!==lastMedia.title?obj:{...obj,thumb:lastMedia.thumb,mime:lastMedia.mime};
        broadcast('media',obj);
      }catch(err){log('Media: '+err.message)}
    }
  });
  ps.on('exit',()=>{ps=null;psBuf='';if(!quitting)setTimeout(startMedia,3000)});
  ps.stdin.on('error',()=>{});
}
ipcMain.on('media-cmd',(e,cmd)=>{if(fromIsland(e)&&typeof cmd==='string'&&/^(toggle|play|pause|next|prev|seek:\d+(\.\d+)?)$/.test(cmd)&&ps?.stdin.writable)ps.stdin.write(cmd+'\n')});
// ---------- Lirik (LRCLIB) ----------
const lyricCache = new Map();
async function fetchJson(url) {
  const r = await net.fetch(url, { headers: { 'User-Agent': 'Grump/1.0' },signal:AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  return r.json();
}
ipcMain.handle('lyrics', async (e, q) => {
  if(!fromIsland(e))return null;
  try {
    if (!q || typeof q.title!=='string' || q.title.length>200 || (q.artist!==undefined && (typeof q.artist!=='string'||q.artist.length>200)) || !q.title.trim()) return null;
    const key = `${q.artist}|${q.title}|${Math.round(q.dur || 0)}`;
    if (lyricCache.has(key)) return lyricCache.get(key);
    const enc = encodeURIComponent;
    let res = await fetchJson(
      `https://lrclib.net/api/get?track_name=${enc(q.title)}&artist_name=${enc(q.artist || '')}` +
      (q.dur ? `&duration=${Math.round(q.dur)}` : ''));
    let lrc = res && res.syncedLyrics;
    if (!lrc) {
      const list = await fetchJson(`https://lrclib.net/api/search?track_name=${enc(q.title)}&artist_name=${enc(q.artist || '')}`);
      const hit = Array.isArray(list) && list.find((x) => x.syncedLyrics);
      lrc = hit ? hit.syncedLyrics : null;
    }
    if (!lrc) {
      const cleanTitle = String(q.title).replace(/\s*[-(\[].*$/, '').trim();
      const cleanArtist = String(q.artist || '').split(/[,&/]/)[0].trim();
      if (cleanTitle) {
        const list2 = await fetchJson(`https://lrclib.net/api/search?q=${enc(`${cleanTitle} ${cleanArtist}`.trim())}`);
        const hit2 = Array.isArray(list2) && list2.find((x) => x.syncedLyrics);
        lrc = hit2 ? hit2.syncedLyrics : null;
      }
    }
    lyricCache.set(key, lrc);
    if(lyricCache.size>100)lyricCache.delete(lyricCache.keys().next().value);
    return lrc;
  } catch (_) { return null; }
});


function createTray(){
  try {
    const ico = path.join(__dirname, 'assets', 'icon.ico');
    const img = fs.existsSync(ico) ? nativeImage.createFromPath(ico) : nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(img);
    tray.setToolTip('Grump');
    const build = () => Menu.buildFromTemplate([
      { label: 'Open Grump', click: () => { for(const c of islands.values()) showHome(c); } },
      { label: 'Restart Grump', click: () => { log('Restart requested from tray'); app.relaunch(); app.quit(); } },
      { label: 'Preferences', click: openSettingsWindow },
      { label: 'Hide in fullscreen', type: 'checkbox', checked: settings.hideFullscreen, click: i => updateSettings({ hideFullscreen: i.checked }) },
      { label: 'Auto game mode', type: 'checkbox', checked: settings.gameModeQuiet !== false, click: i => updateSettings({ gameModeQuiet: i.checked }) },
      { label: 'Launch at login', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: i => app.setLoginItemSettings({ openAtLogin: i.checked }) },
      { label: 'Check for Updates...', click: () => {
        if (autoUpdater && githubUpdatesEnabled()) {
          autoUpdater.checkForUpdates().catch(e => log('Check update err: ' + e.message));
        }
      }},
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(build());
    tray.on('right-click', () => tray.setContextMenu(build()));
    tray.on('click', () => { for(const c of islands.values()) showHome(c); });
  } catch (err) {
    log('Tray error: ' + (err.stack || err.message));
  }
}
const locked=app.requestSingleInstanceLock();
log('requestSingleInstanceLock: ' + locked);
if(!locked)app.quit();
else {
  app.on('second-instance',(_event,argv) => {
    for(const c of islands.values()) showIsland(c);
  });
  app.whenReady().then(()=>{
    log('app.whenReady fired');
    const s = readJson(file('settings.json'));
    if (s && typeof s === 'object') settings = { ...defaults, ...s };
    settings.quiet=false;settings.quietUntil=0;settings.menuQuiet=false;settings.smartQuietPrompt=false;
    if (settings.staticExp === 'greet') settings.staticExp = 'normal';
    if (settings.eyeMode === 'static' && settings.staticExp === 'lol') settings.eyeMode = 'auto';
    weather = createWeatherService({ broadcast });
    weather.configure(settings.weatherEnabled, settings.weatherCity);
    const t = readJson(file('timer.json'));
    if (t && ['idle','running','paused','done'].includes(t.status) && Number.isFinite(t.endAt) && Number.isFinite(t.remaining) && Number.isFinite(t.duration) && t.duration>=1000 && t.duration<=86400000) timer = t.status==='idle' ? {...t,remaining:t.duration,endAt:0} : t;
    refreshDisplays();
    log('syncDisplays completed, count=' + islands.size);
    createTray();
    log('createTray completed');
    productivity=installProductivity({icon:path.join(__dirname,'assets','icon.png'),allowIsland:fromIsland,onPaste:()=>{if(ps?.stdin.writable)ps.stdin.write('paste\n');},onEvent:(event)=>{
      if(event.reminder)broadcast('productivity-event',{kind:'reminder',text:event.reminder});
      else if(event.downloads)broadcast('productivity-event',{kind:'downloads',downloads:event.downloads});
    }});
    installPersonalFeatures({app,ipcMain,net,Notification,fromUi,broadcast:(channel,data)=>{broadcast(channel,data);if(settingsWin&&!settingsWin.isDestroyed())settingsWin.webContents.send(channel,data);},icon:path.join(__dirname,'assets','icon.png')});
    initUpdater();
    startMedia();
    log('startMedia completed');
    pollCodexActivity();
    tickTimer();
    screen.on('display-added',refreshDisplays);screen.on('display-removed',refreshDisplays);screen.on('display-metrics-changed',refreshDisplays);
    setInterval(refreshDisplays,5000);
    setInterval(pollPointer,16);setInterval(tickTimer,250);setInterval(sampleCpu,2000);setInterval(maybeHugCursor,5000);setInterval(pollCodexActivity,1500);setInterval(()=>weather.refresh(),60_000);
    // Buka Grump langsung sebagai dynamic island mata hitam di atas layar
    setTimeout(() => {
      for(const c of islands.values()) showIsland(c);
    }, 350);
  });
}
app.on('before-quit',()=>{quitting=true;if(ps)ps.kill()});
app.on('window-all-closed',()=>{if(quitting)app.quit()});
process.on('uncaughtException',err=>log(err.stack||err.message));
