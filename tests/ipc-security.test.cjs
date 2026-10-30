const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {trustedSender,lockWindow}=require('../ipc-security.cjs');

test('IPC only accepts the expected main frame in its own local window',()=>{
  const file=path.join(__dirname,'..','renderer','index.html');
  const frame={};
  const sender={mainFrame:frame,getURL:()=>pathToFileURL(file).href};
  const win={isDestroyed:()=>false,webContents:sender};
  assert.equal(trustedSender({sender,senderFrame:frame},[win],file),true);
  assert.equal(trustedSender({sender,senderFrame:{}},[win],file),false);
  assert.equal(trustedSender({sender,senderFrame:frame},[],file),false);
  sender.getURL=()=> 'https://example.com/';
  assert.equal(trustedSender({sender,senderFrame:frame},[win],file),false);
});

test('window guard denies new windows, navigation, and permission requests',()=>{
  const file=path.join(__dirname,'..','renderer','settings.html');
  const listeners={};
  let openHandler,permissionHandler;
  const win={webContents:{
    setWindowOpenHandler:fn=>{openHandler=fn},
    on:(name,fn)=>{listeners[name]=fn},
    session:{setPermissionRequestHandler:fn=>{permissionHandler=fn}}
  }};
  lockWindow(win,file);
  assert.deepEqual(openHandler(),{action:'deny'});
  let prevented=false;
  listeners['will-navigate']({preventDefault:()=>{prevented=true}},'https://example.com/');
  assert.equal(prevented,true);
  permissionHandler(null,'media',allowed=>assert.equal(allowed,false));
});
