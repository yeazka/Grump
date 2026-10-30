const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');

test('clear all tasks removes hidden tasks too, keeps notes, and rejects other windows',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grump-clear-tasks-'));
  const handlers=new Map();
  const initial={pins:[],notes:[{id:'note-1',text:'Keep this'}],tasks:Array.from({length:25},(_,i)=>({id:`task-${i}`,text:`Task ${i}`,done:false})),birthday:''};
  fs.writeFileSync(path.join(dir,'productivity.json'),JSON.stringify(initial));
  try{
    const electron={app:{getPath:()=>dir},BrowserWindow:{getAllWindows:()=>[]},ipcMain:{handle:(name,fn)=>handlers.set(name,fn),on(){}},clipboard:{},ClipboardItem:class{},nativeImage:{},desktopCapturer:{},screen:{}};
    const root=path.resolve(__dirname,'..');
    const box=vm.createContext({require:name=>name==='electron'?electron:name.startsWith('./')?require(path.join(root,name)):require(name),__dirname:root,module:{exports:{}},setInterval(){},setTimeout,Buffer,Blob});
    vm.runInContext(fs.readFileSync(path.join(root,'productivity.cjs'),'utf8'),box);
    const service=box.module.exports.installProductivity({icon:'',allowIsland:e=>e?.trusted===true});
    const clear=handlers.get('productivity-save');
    assert.equal(clear({trusted:false},'clear-tasks'),false);
    assert.equal(service.getState().tasks.length,25);
    assert.equal(clear({trusted:true},'clear-tasks'),true);
    assert.equal(service.getState().tasks.length,0);
    assert.equal(clear({trusted:true},'clear-tasks'),false);
    const saved=JSON.parse(fs.readFileSync(path.join(dir,'productivity.json'),'utf8'));
    assert.equal(saved.tasks.length,0);
    assert.deepEqual(saved.notes,initial.notes);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('clipboard is opt-in and download updates do not duplicate entries',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grump-productivity-'));const intervals=[];let reads=0;const errors=[];
 try{
  const electron={app:{getPath:()=>dir},BrowserWindow:{getAllWindows:()=>[]},ipcMain:{handle(){},on(){}},clipboard:{read:async()=>{reads++;return[];}},ClipboardItem:class{},nativeImage:{},desktopCapturer:{},screen:{}};
  const root=path.resolve(__dirname,'..');const box=vm.createContext({require:name=>name==='electron'?electron:name.startsWith('./')?require(path.join(root,name)):require(name),__dirname:root,module:{exports:{}},setInterval:(fn,ms)=>{const item={fn,ms};intervals.push(item);return item;},clearInterval:timer=>intervals.splice(intervals.indexOf(timer),1),setTimeout,Buffer,Blob});
  vm.runInContext(fs.readFileSync(path.join(root,'productivity.cjs'),'utf8'),box);
  const service=box.module.exports.installProductivity({icon:'',allowIsland:()=>true,onStorageError:e=>errors.push(e)});
  assert.equal(service.getState().clipboardPaused,true);assert.equal(intervals.some(x=>x.ms===1500),false);
  service.configureClipboard(true);await intervals.find(x=>x.ms===1500).fn();assert.equal(reads,1);
  service.configureClipboard(false);assert.equal(intervals.some(x=>x.ms===1500),false);
  const partial=path.join(dir,'test.zip.crdownload');fs.writeFileSync(partial,'test');
  for(let i=0;i<3;i++)await service.pollDownloads();
  assert.equal(service.getState().downloads.length,1);assert.equal(service.getState().downloads[0].status,'active');
  fs.renameSync(partial,path.join(dir,'test.zip'));await service.pollDownloads();
  assert.equal(service.getState().downloads.length,1);assert.equal(service.getState().downloads[0].status,'done');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
