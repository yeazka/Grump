'use strict';
const fs = require('node:fs');
function readJson(file, fallback=null) {
  for(const candidate of [file,file+'.bak']) {
    try {
      if(fs.statSync(candidate).size>8*1024*1024)continue;
      const value=JSON.parse(fs.readFileSync(candidate,'utf8').replace(/^\uFEFF/,''));
      if(value&&typeof value==='object'&&!Array.isArray(value))return value;
    } catch {}
  }
  return fallback;
}
function writeJson(file, value) {
  const temp=file+'.tmp';
  const text=JSON.stringify(value);
  if(Buffer.byteLength(text)>8*1024*1024)throw Error('Saved data exceeds 8 MB');
  try {
    // Keep the last parseable version; never replace it with a corrupt primary.
    try {JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));fs.copyFileSync(file,file+'.bak');}catch(e){if(e.code&&e.code!=='ENOENT')throw e;}
    const fd=fs.openSync(temp,'w',0o600);
    try {fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temp,file);
  } catch(error) {try{fs.unlinkSync(temp);}catch{}throw error;}
}
function validBirthday(value) {
  if(value==='')return true;
  if(typeof value!=='string'||! /^(?:\d{4}-)?\d{2}-\d{2}$/.test(value))return false;
  const parts=value.split('-').map(Number), full=parts.length===3;
  const [year,month,day]=full?parts:[2000,...parts];
  if(year<1900||year>new Date().getFullYear()||month<1||month>12||day<1)return false;
  if(day>new Date(year,month,0).getDate())return false;
  return !full || new Date(year,month-1,day)<=new Date();
}
module.exports={readJson,writeJson,validBirthday};
