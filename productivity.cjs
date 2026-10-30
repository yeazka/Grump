'use strict';
const { app, BrowserWindow, ipcMain, clipboard, ClipboardItem, nativeImage, desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {readJson,writeJson}=require('./json-store.cjs');
const {trustedSender,lockWindow} = require('./ipc-security.cjs');

function installProductivity({ icon, onEvent, onPaste, allowIsland, clipboardEnabled=false, onStorageError=()=>{} }) {
  // Integration tests execute main.js in plain Node with a mocked Electron API.
  if (!app?.getPath || !ipcMain?.handle) return {open:()=>{},getState:()=>({tasks:[],downloads:[]})};
  let win = null;
  const fromTools=e=>trustedSender(e,[win],path.join(__dirname,'renderer','productivity.html'));
  const fromUi=e=>fromTools(e)||!!allowIsland?.(e);
  const dataFile = path.join(app.getPath('userData'), 'productivity.json');
  const imageDir = path.join(app.getPath('userData'), 'clipboard-pins');
  let data = { pins: [], notes: [], tasks: [], birthday: '' };
  data={...data,...readJson(dataFile,{})};
  for(const key of ['pins','notes','tasks'])data[key]=Array.isArray(data[key])?data[key].filter(item=>item&&typeof item.id==='string'&&typeof item.text==='string').slice(0,2000):[];
  data.pins=data.pins.filter(item=>!item.imageFile||(/^[a-f0-9]{20}$/.test(item.id)&&path.resolve(item.imageFile)===path.join(imageDir,item.id+'.png')));
  const save=()=>{try{writeJson(dataFile,data);return true;}catch(error){onStorageError(error);return false;}};
  const history = [];
  let lastClipboardHash = '';
  let clipboardPaused=true, clipboardAllowed=false, clipboardTimer=null;
  let downloads = [];
  let downloadSnapshot = new Map();
  let lastDownloadPoll = Date.now();
  let lastEmit = '';
  let lastCapture=null;
  const writePng=async image=>clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);
  const publish = () => {
    const state = { history:history.map(({image,...item})=>item), pins:data.pins, notes:data.notes, tasks:data.tasks, downloads,clipboardPaused };
    for (const target of BrowserWindow.getAllWindows()) {
      if (!target.isDestroyed()) target.webContents.send('productivity-state', state);
    }
    onEvent?.(state);
  };
  function open() {
    if(win && !win.isDestroyed()){win.show();win.focus();return;}
    win = new BrowserWindow({width:680,height:630,minWidth:580,minHeight:500,title:'Grump Tools',icon,show:false,backgroundColor:'#09090b',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'productivity-preload.cjs'),contextIsolation:true,nodeIntegration:false}});
    lockWindow(win,path.join(__dirname,'renderer','productivity.html'));
    win.loadFile(path.join(__dirname,'renderer','productivity.html'));
    win.once('ready-to-show',()=>{win.show();win.focus();});
    win.webContents.once('did-finish-load',()=>{publish();win.show();win.focus();});
    win.on('closed',()=>{win=null;});
  }
  ipcMain.on('productivity-open',e=>{if(fromUi(e))open()});
  ipcMain.handle('productivity-state',e=>fromUi(e)?({history:history.map(({image,...item})=>item),pins:data.pins,notes:data.notes,tasks:data.tasks,downloads,clipboardPaused}):null);

  let clipboardBusy=false;
  async function observeClipboard() {
    if(clipboardBusy||clipboardPaused||!clipboardAllowed)return;
    clipboardBusy=true;
    try {
    const [clip]=await clipboard.read();
    if(!clip)return;
    const imageType=clip.types.find(t=>t==='image/png'||t==='image/jpeg');
    const imageBlob=imageType?await clip.getType(imageType):null;
    if(imageBlob&&imageBlob.size>4*1024*1024)return;
    const text=clip.types.includes('text/plain')?await (await clip.getType('text/plain')).text():'';
    const blob=imageBlob?Buffer.from(await imageBlob.arrayBuffer()):Buffer.from(text,'utf8');
    if(!blob.length||blob.length>4*1024*1024)return;
    const hash=crypto.createHash('sha256').update(blob).digest('hex');
    if(hash===lastClipboardHash||!clipboardAllowed||clipboardPaused)return;
    lastClipboardHash=hash;
    const image=imageBlob?nativeImage.createFromBuffer(blob):null;
    if(image){const size=image.getSize();if(image.isEmpty()||size.width*size.height>16000000)return;}
    const kind=image?'image':/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text.trim())?'hex':/^https?:\/\//i.test(text.trim())?'link':'text';
    const item={id:hash.slice(0,20),hash,kind,text:image?'':text.slice(0,20000),at:Date.now(),preview:image?image.resize({width:96,height:68,quality:'good'}).toDataURL():''};
    if(image)item.image=image.toPNG();
    history.unshift(item);
    let images=0;
    for(let i=0;i<history.length;i++){if(history[i].kind==='image' && ++images>5){history.splice(i--,1);}}
    if(history.length>30)history.length=30;
    publish();
    } catch(_) {} finally {clipboardBusy=false;}
  }
  function configureClipboard(enabled){
    const allowed=enabled===true;
    if(allowed===clipboardAllowed)return;
    clipboardAllowed=allowed;clipboardPaused=!allowed;
    if(clipboardTimer)clearInterval(clipboardTimer);clipboardTimer=null;
    if(allowed)clipboardTimer=setInterval(observeClipboard,1500);
    else{history.length=0;lastClipboardHash='';}
    publish();
  }
  configureClipboard(clipboardEnabled);
  ipcMain.handle('productivity-clipboard',async(e,command,id)=>{
    if(!fromUi(e))return false;
    if(command==='pause'){if(!clipboardAllowed)return true;clipboardPaused=!clipboardPaused;publish();return clipboardPaused;}
    const before=JSON.stringify(data);
    const item=history.find(x=>x.id===id)||data.pins.find(x=>x.id===id);
    if(command==='clear'){history.length=0;publish();return true;}
    if(!item)return false;
    if(command==='copy'||command==='paste'){
      if(item.kind==='image'){
        const bytes=item.image || (item.imageFile && fs.existsSync(item.imageFile) && fs.readFileSync(item.imageFile));
        if(!bytes)return false;
        await writePng(nativeImage.createFromBuffer(bytes));
      } else await clipboard.writeText(item.text);
      lastClipboardHash=item.hash || lastClipboardHash;
      if(command==='paste'){
        if(win&&!win.isDestroyed())win.hide();
        setTimeout(()=>onPaste?.(),180);
      }
    }
    if(command==='pin' && !data.pins.some(x=>x.id===id)){
      const pin={id:item.id,kind:item.kind,text:item.text,at:item.at,preview:item.preview};
      if(item.kind==='image'){
        fs.mkdirSync(imageDir,{recursive:true});
        pin.imageFile=path.join(imageDir,item.id+'.png');
        fs.writeFileSync(pin.imageFile,item.image);
      }
      data.pins.unshift(pin);if(!save()){data=JSON.parse(before);if(pin.imageFile)try{fs.unlinkSync(pin.imageFile);}catch{}return false;}
    }
    if(command==='unpin'){
      const pin=data.pins.find(x=>x.id===id);
      data.pins=data.pins.filter(x=>x.id!==id);
      if(!save()){data=JSON.parse(before);return false;}
      if(pin?.imageFile)try{fs.unlinkSync(pin.imageFile);}catch(_){}
    }
    publish();return true;
  });
  ipcMain.handle('productivity-save',(e,type,payload)=>{
    if(!fromUi(e))return false;
    const before=JSON.stringify(data);
    if(type==='note' && typeof payload?.text==='string'){
      const text=payload.text.trim().slice(0,10000);
      if(!text)return false;
      if(data.notes.length>=2000)return false;
      data.notes.unshift({id:crypto.randomUUID(),text,at:Date.now()});
    } else if(type==='update-note' && typeof payload?.id==='string' && typeof payload?.text==='string'){
      const note=data.notes.find(x=>x.id===payload.id),text=payload.text.trim().slice(0,10000);
      if(!note||!text)return false;note.text=text;note.at=Date.now();
      data.notes=data.notes.filter(x=>x.id!==note.id);data.notes.unshift(note);
    } else if(type==='task' && typeof payload?.text==='string'){
      const text=payload.text.trim().slice(0,500);
      if(!text)return false;
      if(data.tasks.length>=2000)return false;
      data.tasks.unshift({id:crypto.randomUUID(),text,done:false,important:!!payload.important,remindAt:Number.isFinite(payload.remindAt)?payload.remindAt:0,notified:false});
      if(payload.important)onEvent?.({reminder:text});
    } else if(type==='task-toggle'){
      const task=data.tasks.find(x=>x.id===payload);if(!task)return false;task.done=!task.done;
    } else if(type==='delete-note')data.notes=data.notes.filter(x=>x.id!==payload);
    else if(type==='delete-task')data.tasks=data.tasks.filter(x=>x.id!==payload);
    else if(type==='clear-tasks'){if(!data.tasks.length)return false;data.tasks=[];}
    else return false;
    if(!save()){data=JSON.parse(before);publish();return false;}publish();return true;
  });
  setInterval(()=>{
    const now=Date.now();let changed=false;
    for(const task of data.tasks)if(!task.done && !task.notified && task.remindAt && task.remindAt<=now){task.notified=true;changed=true;onEvent?.({reminder:task.text});}
    if(changed){save();publish();}
  },10000);

  const downloadDir=app.getPath('downloads');
  const partial=/\.(crdownload|part|download|partial)$/i;
  let downloadBusy=false;
  async function pollDownloads(){
    if(downloadBusy)return;downloadBusy=true;
    try{
      const names=(await fs.promises.readdir(downloadDir)).filter(name=>partial.test(name));
      const now=Date.now(),next=new Map();
      for(const name of names){
        try{const stat=await fs.promises.stat(path.join(downloadDir,name));if(!stat.isFile())continue;
          const prev=downloadSnapshot.get(name),delta=prev?Math.max(0,stat.size-prev.size):0;
          next.set(name,{size:stat.size,speed:Math.round(delta/Math.max(.25,(now-lastDownloadPoll)/1000))});
        }catch{}
      }
      const completed=downloads.filter(item=>item.status!=='active');
      for(const [name,prev] of downloadSnapshot)if(!next.has(name)){
        const base=name.replace(partial,'');
        try{const stat=await fs.promises.stat(path.join(downloadDir,base));if(stat.isFile())completed.unshift({id:name+'-'+now,name:base,status:'done',bytes:stat.size,speed:0,at:now});}catch{}
      }
      downloads=[...Array.from(next,([name,item])=>({id:name,name:name.replace(partial,''),status:'active',bytes:item.size,speed:item.speed,at:now})),...completed].slice(0,20);
      downloadSnapshot=next;lastDownloadPoll=now;
      const signature=JSON.stringify(downloads.map(x=>[x.id,x.status,Math.floor(x.bytes/65536),Math.floor(x.speed/65536)]));
      if(signature!==lastEmit){lastEmit=signature;publish();}
    }catch{}finally{downloadBusy=false;}
  }
  setInterval(pollDownloads,2000);

  ipcMain.handle('productivity-capture-sources',async e=>{
    if(!fromUi(e))return [];
    const sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:180},fetchWindowIcons:false});
    return sources.filter(x=>x.name && !x.thumbnail.isEmpty() && !/Grump Tools|^Grump$|Computer Use Cursor Overlay/i.test(x.name)).map(x=>({id:x.id,name:x.name,preview:x.thumbnail.toDataURL()}));
  });
  ipcMain.handle('productivity-capture',async(e,id)=>{
    if(!fromUi(e))return false;
    if(typeof id!=='string'||id.length>200)return false;
    const hideTools=id.startsWith('screen:') && win && !win.isDestroyed();
    if(hideTools){win.hide();await new Promise(r=>setTimeout(r,220));}
    try{
      const source=(await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:2560,height:1440}})).find(x=>x.id===id);
      if(!source || source.thumbnail.isEmpty())return false;
      await writePng(source.thumbnail);
      lastCapture=source.thumbnail.toPNG();
      return source.thumbnail.resize({width:900}).toDataURL();
    } finally {if(hideTools && win && !win.isDestroyed())win.show();}
  });
  ipcMain.handle('productivity-copy-color',async(e,hex)=>{
    if(!fromUi(e))return false;
    if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))return false;
    await clipboard.writeText(hex.toUpperCase());return true;
  });
  ipcMain.handle('productivity-copy-text',async(e,value)=>{
    if(!fromTools(e))return false;
    if(typeof value!=='string'||value.length>20000)return false;
    await clipboard.writeText(value);return true;
  });
  ipcMain.handle('productivity-capture-area',async e=>{
    if(!fromUi(e))return false;
    if(win && !win.isDestroyed())win.hide();
    await new Promise(r=>setTimeout(r,220));
    const display=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const scale=display.scaleFactor||1;
    const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.ceil(display.bounds.width*scale),height:Math.ceil(display.bounds.height*scale)}});
    const source=sources.find(x=>String(x.display_id)===String(display.id))||sources[0];
    if(!source||source.thumbnail.isEmpty()){if(win&&!win.isDestroyed())win.show();return false;}
    return new Promise(resolve=>{
      const overlay=new BrowserWindow({x:display.bounds.x,y:display.bounds.y,width:display.bounds.width,height:display.bounds.height,frame:false,transparent:true,alwaysOnTop:true,skipTaskbar:true,resizable:false,webPreferences:{preload:path.join(__dirname,'capture-preload.cjs'),contextIsolation:true,nodeIntegration:false}});
      lockWindow(overlay,path.join(__dirname,'renderer','capture-select.html'));
      let completed=false;
      const finish=(value)=>{if(completed)return;completed=true;ipcMain.removeListener('capture-area-selection',onSelect);if(!overlay.isDestroyed())overlay.close();if(win&&!win.isDestroyed())win.show();resolve(value);};
      const onSelect=async(e,rect)=>{
        if(!trustedSender(e,[overlay],path.join(__dirname,'renderer','capture-select.html')))return;
        if(!rect||!['x','y','width','height'].every(k=>Number.isFinite(rect[k]))||rect.width<4||rect.height<4)return finish(false);
        const size=source.thumbnail.getSize(),sx=size.width/display.bounds.width,sy=size.height/display.bounds.height;
        const crop={x:Math.max(0,Math.round(rect.x*sx)),y:Math.max(0,Math.round(rect.y*sy)),width:Math.min(size.width,Math.round(rect.width*sx)),height:Math.min(size.height,Math.round(rect.height*sy))};
        crop.width=Math.min(crop.width,size.width-crop.x);crop.height=Math.min(crop.height,size.height-crop.y);
        if(crop.width<1||crop.height<1)return finish(false);
        const image=source.thumbnail.crop(crop);await writePng(image);lastCapture=image.toPNG();finish(image.resize({width:Math.min(900,crop.width)}).toDataURL());
      };
      ipcMain.on('capture-area-selection',onSelect);
      overlay.on('closed',()=>finish(false));
      overlay.loadFile(path.join(__dirname,'renderer','capture-select.html'));
    });
  });
  ipcMain.handle('productivity-ocr',async e=>{
    if(!fromUi(e))return '';
    if(!lastCapture)return '';
    const {createWorker}=require('tesseractjs');
    const worker=await createWorker('eng',1,{langPath:path.join(__dirname,'assets','ocr'),gzip:false,cacheMethod:'none'});
    try {const result=await worker.recognize(lastCapture);return result.data.text.trim().slice(0,20000);}
    finally {await worker.terminate();}
  });
  return { open, configureClipboard, pollDownloads, getState:()=>({tasks:data.tasks,downloads,clipboardPaused}) };
}
module.exports={installProductivity};
