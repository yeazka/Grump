'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readJson,writeJson,validBirthday}=require('../json-store.cjs');
const {createActivityMonitor}=require('../activity-monitor.cjs');
test('birthday validates full/legacy dates without inventing a year',()=>{
 for(const value of ['', '02-29','1996-02-29','2001-12-31'])assert.equal(validBirthday(value),true,value);
 for(const value of [null,'99-99','02-30','2001-02-29','1899-01-01','2999-01-01','2020-00-01'])assert.equal(validBirthday(value),false,String(value));
});
test('atomic store retains primary on failed replace and recovers from backup',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grump-store-')),file=path.join(dir,'state.json');
 const rename=fs.renameSync;
 try{
  writeJson(file,{notes:['first']});writeJson(file,{notes:['second']});
  assert.deepEqual(readJson(file),{notes:['second']});
  fs.renameSync=()=>{throw Object.assign(Error('disk unavailable'),{code:'EACCES'});};
  assert.throws(()=>writeJson(file,{notes:['lost']}));
  assert.deepEqual(readJson(file),{notes:['second']});assert.equal(fs.existsSync(file+'.tmp'),false);
  fs.renameSync=rename;fs.writeFileSync(file,'{broken');
  assert.deepEqual(readJson(file),{notes:['second']});
  writeJson(file,{notes:['recovered']});assert.deepEqual(readJson(file),{notes:['recovered']});
 }finally{fs.renameSync=rename;fs.rmSync(dir,{recursive:true,force:true});}
});
test('AI monitor responds from an isolated worker and shuts down',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grump-worker-'));let monitor;
 try{
  fs.writeFileSync(path.join(dir,'session.jsonl'),JSON.stringify({type:'event_msg',payload:{type:'task_started'}})+'\n');
  const state=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('worker timed out')),6000);
   monitor=createActivityMonitor({codex:dir,antigravity:path.join(dir,'missing')},value=>{clearTimeout(timeout);resolve(value);},()=>{clearTimeout(timeout);reject(Error('worker failed'));});
   monitor.poll();monitor.poll();
  });
  assert.equal(state.codex.active,true);assert.equal(state.antigravity.active,false);
 }finally{monitor?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
