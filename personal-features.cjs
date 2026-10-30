'use strict';
const fs = require('fs');
const path = require('path');
const PRAYERS = [['Fajr','Subuh'],['Dhuhr','Dzuhur'],['Asr','Ashar'],['Maghrib','Maghrib'],['Isha','Isya']];
const FEATURES = new Set(['todo','notes','prayer','water']);
const DEFAULT = {selected:[],city:'Jakarta',waterMinutes:60,waterEnabled:false,prayerEnabled:false,prayer:null,waterNextAt:0,lastAlerts:{}};
function dateInZone(timezone){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const value=type=>parts.find(x=>x.type===type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function installPersonalFeatures({app,ipcMain,net,Notification,fromUi,broadcast,icon}) {
  const dataFile=path.join(app.getPath('userData'),'personal-features.json');
  let data={...DEFAULT};
  try { const saved=JSON.parse(fs.readFileSync(dataFile,'utf8')); if(saved && typeof saved==='object') data={...DEFAULT,...saved}; } catch {}
  data.selected=Array.isArray(data.selected)?[...new Set(data.selected.filter(x=>FEATURES.has(x)))]:[];
  const save=()=>{try{fs.writeFileSync(dataFile,JSON.stringify(data));}catch{}};
  const state=()=>({...data,prayer:data.prayer && {date:data.prayer.date,city:data.prayer.city,timezone:data.prayer.timezone,times:data.prayer.times},prayerStatus:data.prayer?'ready':prayerLoading?'loading':data.prayerEnabled&&prayerRetryAt?'unavailable':'off',source:'AlAdhan'});
  const publish=()=>broadcast('addon-state',state());
  const notify=(title,body)=>{
    try { if(Notification?.isSupported?.()) new Notification({title,body,icon}).show(); } catch {}
    broadcast('addon-alert',{title,body});
  };
  let prayerLoading=false,prayerRetryAt=0;
  async function refreshPrayer(force=false){
    if(!data.prayerEnabled||prayerLoading)return;
    const today=dateInZone(data.prayer?.timezone||'Asia/Jakarta');
    if(!force && (data.prayer?.date===today||Date.now()<prayerRetryAt))return;
    prayerLoading=true;
    publish();
    try {
      const city=encodeURIComponent(data.city);
      const fetchDay=async date=>{
        const dateParam=date.split('-').reverse().join('-');
        const response=await net.fetch(`https://api.aladhan.com/v1/timingsByCity/${dateParam}?city=${city}&country=Indonesia&method=20`,{signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw Error('Prayer request failed');
        return (await response.json())?.data;
      };
      let info=await fetchDay(today);
      const timezone=info?.meta?.timezone;
      if(!timezone || !/^Asia\//.test(timezone))throw Error('Invalid timezone');
      const date=dateInZone(timezone);
      if(date!==today)info=await fetchDay(date);
      const times={};
      for(const [key] of PRAYERS){const hhmm=String(info.timings?.[key]||'').match(/^\d{2}:\d{2}/)?.[0];if(!hhmm)throw Error('Incomplete prayer times');times[key]=hhmm;}
      data.prayer={date,city:data.city,timezone,times};save();
      prayerRetryAt=0;
    }catch{data.prayer=null;prayerRetryAt=Date.now()+5*60000;}
    finally{prayerLoading=false;publish();}
  }
  function tick(){
    const now=Date.now();
    if(data.waterEnabled && data.selected.includes('water')){
      if(!data.waterNextAt){data.waterNextAt=now+data.waterMinutes*60000;save();publish();}
      else if(now>=data.waterNextAt){data.waterNextAt=now+data.waterMinutes*60000;save();publish();notify('Grump · Minum dulu','Ambil air sebentar.');}
    }
    if(data.prayerEnabled && data.selected.includes('prayer')){
      refreshPrayer();
      const p=data.prayer;
      if(p){
        const parts=new Intl.DateTimeFormat('en-GB',{timeZone:p.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
        const value=type=>parts.find(x=>x.type===type)?.value;
        const date=`${value('year')}-${value('month')}-${value('day')}`;
        const time=`${value('hour')}:${value('minute')}`;
        if(date===p.date)for(const [key,label] of PRAYERS){const alertKey=`${date}-${key}`;if(p.times[key]===time && !data.lastAlerts[alertKey]){data.lastAlerts[alertKey]=true;save();notify(`Waktu ${label}`,`${p.city} · ${time}`);}}
      }
    }
  }
  ipcMain.handle('addon-state',e=>fromUi(e)?state():null);
  ipcMain.handle('addon-command',async(e,command,value)=>{
    if(!fromUi(e))return null;
    if(command==='select' && FEATURES.has(value)){if(!data.selected.includes(value))data.selected.push(value);}
    else if(command==='remove' && FEATURES.has(value)){data.selected=data.selected.filter(x=>x!==value);if(value==='water')data.waterEnabled=false;if(value==='prayer')data.prayerEnabled=false;}
    else if(command==='city' && typeof value==='string' && /^[\p{L}\s.'-]{2,60}$/u.test(value.trim())){data.city=value.trim();data.prayer=null;prayerRetryAt=0;}
    else if(command==='water-interval' && [15,30,45,60,90,120].includes(value)){data.waterMinutes=value;data.waterNextAt=Date.now()+value*60000;}
    else if(command==='water-enabled' && typeof value==='boolean'){data.waterEnabled=value;data.waterNextAt=value?Date.now()+data.waterMinutes*60000:0;}
    else if(command==='prayer-enabled' && typeof value==='boolean'){data.prayerEnabled=value;}
    else return null;
    save();publish();
    if(command==='city'||command==='prayer-enabled')await refreshPrayer(true);
    return state();
  });
  setInterval(tick,15000).unref?.();
  setTimeout(()=>{refreshPrayer();tick();},500);
  return {state,tick};
}
module.exports={installPersonalFeatures};
