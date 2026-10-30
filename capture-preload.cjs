'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('captureArea',{select:rect=>ipcRenderer.send('capture-area-selection',rect)});
