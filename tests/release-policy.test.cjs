const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {updateChannel,mediaDisplay,validLocalPath}=require('../runtime-policy.cjs');
const {forbidden}=require('../tools/audit-package.cjs');
const {getMainFileMatchers}=require('app-builder-lib/out/fileMatcher');
test('GitHub updater is limited to setup, including all Steam launch variants',()=>{
  const base={packaged:true,metadata:'setup'};
  assert.equal(updateChannel(base),'setup');
  for(const metadata of ['steam','store','portable','unpacked',undefined])assert.notEqual(updateChannel({...base,metadata}),'setup');
  for(const env of [{SteamAppId:'1'},{SteamGameId:'1'},{STEAM_APP_ID:'1'}])assert.equal(updateChannel({...base,env}),'steam');
  assert.equal(updateChannel({...base,windowsStore:true}),'store');
  assert.equal(updateChannel({...base,argv:['--steam']}),'steam');
  assert.equal(updateChannel({...base,packaged:false}),'dev');
});
test('release filters reject nested secrets and keep runtime/license assets',()=>{
  const root=path.resolve(__dirname,'..'),config=require('../package.json').build;
  const packager={info:{projectDir:root,buildResourcesDir:'build',config,isPrepackedAppAsar:false,debugLogger:{isEnabled:false}}};
  const filter=getMainFileMatchers(root,path.join(root,'dist','test'),x=>x,{},packager,path.join(root,'dist'),false)[0].createFilter();
  for(const name of ['.env','renderer/.env','renderer/.env.production','assets/private.key','renderer/settings.json','assets/test.pfx','renderer/secrets-prod.json','renderer/fonts/SFProText-Regular.ttf']){
    assert.equal(filter(path.join(root,name),{isDirectory:()=>false}),false,name);
    assert.equal(forbidden.test(name),true,name);
  }
  for(const name of ['main.js','runtime-policy.cjs','renderer/fonts/Inter-Variable.ttf','renderer/fonts/OFL-Inter.txt','renderer/js/shelf.js'])assert.equal(filter(path.join(root,name),{isDirectory:()=>false}),true,name);
});
test('monitor matching converts native coordinates before selecting display',()=>{
  let converted=false;
  const screen={screenToDipPoint:p=>{converted=true;return{x:p.x/1.25,y:p.y/1.25}},getDisplayNearestPoint:p=>({id:p.x<0?'secondary':'primary',point:p}),getCursorScreenPoint:()=>({x:900,y:10})};
  assert.equal(mediaDisplay(screen,{monitorX:-960,monitorY:540}).id,'secondary');
  assert.equal(converted,true);
  assert.equal(mediaDisplay(screen,{}).id,'primary');
});
test('Stash refuses malformed/device paths but accepts local absolute paths',()=>{
  for(const p of [null,{},'','relative.txt','C:\\bad\0.txt','\\\\.\\PhysicalDrive0','\\\\?\\C:\\a'])assert.equal(validLocalPath(p),false);
  assert.equal(validLocalPath('C:\\Users\\sample\\photo.png'),true);
});
