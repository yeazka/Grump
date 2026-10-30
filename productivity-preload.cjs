'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('grumpTools',{
  state:()=>ipcRenderer.invoke('productivity-state'),
  onState:cb=>ipcRenderer.on('productivity-state',(_e,s)=>cb(s)),
  clipboard:(command,id)=>ipcRenderer.invoke('productivity-clipboard',command,id),
  save:(type,payload)=>ipcRenderer.invoke('productivity-save',type,payload),
  sources:()=>ipcRenderer.invoke('productivity-capture-sources'),
  capture:id=>ipcRenderer.invoke('productivity-capture',id),
  captureArea:()=>ipcRenderer.invoke('productivity-capture-area'),
  copyColor:hex=>ipcRenderer.invoke('productivity-copy-color',hex),
  copyText:text=>ipcRenderer.invoke('productivity-copy-text',text),
  ocr:()=>ipcRenderer.invoke('productivity-ocr')
});
