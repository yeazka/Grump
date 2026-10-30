const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {installPersonalFeatures}=require('../personal-features.cjs');

test('personal features persist selections and guard commands',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grump-addons-'));
  const handlers=new Map(),events=[];
  try{
    installPersonalFeatures({app:{getPath:()=>dir},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},net:{fetch:async()=>({ok:true,json:async()=>({data:{meta:{timezone:'Asia/Jakarta'},timings:{Fajr:'04:07',Dhuhr:'11:42',Asr:'14:52',Maghrib:'17:47',Isha:'18:59'}}})})},Notification:null,fromUi:e=>e?.trusted===true,broadcast:(...args)=>events.push(args),icon:''});
    const call=(name,command,value)=>handlers.get(name)({trusted:true},command,value);
    assert.equal(await handlers.get('addon-state')({trusted:false}),null);
    assert.equal(await handlers.get('addon-command')({trusted:false},'select','todo'),null);
    assert.deepEqual((await call('addon-command','select','todo')).selected,['todo']);
    assert.deepEqual((await call('addon-command','select','todo')).selected,['todo']);
    assert.equal(await call('addon-command','select','unknown'),null);
    const water=await call('addon-command','select','water');
    assert.deepEqual(water.selected,['todo','water']);
    assert.equal((await call('addon-command','water-enabled',true)).waterEnabled,true);
    assert.equal((await call('addon-command','water-interval',30)).waterMinutes,30);
    assert.equal((await call('addon-command','water-interval',1)),null);
    assert.equal((await call('addon-command','remove','water')).waterEnabled,false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'personal-features.json'),'utf8')).selected,['todo']);
    assert.ok(events.some(([name])=>name==='addon-state'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
