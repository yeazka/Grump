const LABELS={idea:['Idea / Suggestion',16751360],bug:['Bug Report',15682628],cheer:['Cheer / Feedback',15485337]};
const DEBUG_CODE=/^GRUMP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const REPORT_KEEP_DAYS=30,REPORT_KEEP_MAX=300;
// Compares two secrets in constant time (both are hashed first, so their lengths do not leak either).
async function sameSecret(a,b){
  const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));
  const p=new Uint8Array(x),q=new Uint8Array(y);let diff=0;for(let i=0;i<p.length;i++)diff|=p[i]^q[i];return diff===0;
}
// What is kept of a report: the fields that were already validated, cut to size. No network address.
function storedReport(input,debugCode){
  const text=(v,n)=>String(v??'').slice(0,n);
  return {receivedAt:new Date().toISOString(),reportId:text(input.reportId,80),debugCode,reason:text(input.reason,30),version:text(input.version,30),platform:text(input.platform,10),
    arch:text(input.arch,12),osVersion:text(input.osVersion,80),electron:text(input.electron,30),previousUnexpectedExit:!!input.previousUnexpectedExit,
    displays:(Array.isArray(input.displays)?input.displays.slice(0,8):[]).map(d=>({width:Math.round(Number(d?.width)||0),height:Math.round(Number(d?.height)||0),scale:Math.round((Number(d?.scale)||1)*100)/100})),
    features:Object.fromEntries(Object.entries(input.features&&typeof input.features==='object'?input.features:{}).slice(0,12).map(([k,v])=>[text(k,30),v===true])),
    processes:input.processes.map(p=>({type:text(p?.type,40),cpu:Number(p?.cpu)||0,workingSetKB:Math.round(Number(p?.workingSetKB)||0),privateKB:Math.round(Number(p?.privateKB)||0)})),
    events:input.events.slice(-120)};
}
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/downloads'&&request.method==='GET'){
      try{const response=await env.FEEDBACK_LIMITER.getByName('public-download-stats-v1').fetch('https://internal/downloads');
        return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
      }catch{return json({error:'Statistics temporarily unavailable'},503,'*');}
    }
    // Reading the stored reports: only with the owner's secret token (DIAGNOSTICS_READ_TOKEN), never from a browser page.
    if(url.pathname==='/diagnostics/reports'){
      if(request.method!=='GET')return json({error:'Method not allowed'},405);
      if(!env.DIAGNOSTICS_READ_TOKEN||!env.DIAGNOSTICS_STORE)return json({error:'Not configured'},503);
      if(!(await sameSecret(request.headers.get('Authorization')||'','Bearer '+env.DIAGNOSTICS_READ_TOKEN)))return json({error:'Unauthorized'},401);
      const code=url.searchParams.get('code')||'';
      if(code&&!DEBUG_CODE.test(code))return json({error:'Invalid code'},400);
      const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||20));
      const response=await env.DIAGNOSTICS_STORE.getByName('reports-v1').fetch(`https://store.internal/list?code=${encodeURIComponent(code)}&limit=${limit}`);
      return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
    }
    if(url.pathname==='/diagnostics'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      if(request.headers.get('X-Grump-Diagnostics')!=='1'||!env.DIAGNOSTICS_WEBHOOK_URL||!env.FEEDBACK_LIMITER)return json({error:'Diagnostics unavailable'},503);
      const declared=Number(request.headers.get('Content-Length')||0);if(declared>35000)return json({error:'Too large'},413);
      let input;
      try{
        const reader=request.body?.getReader();if(!reader)return json({error:'Invalid JSON'},400);
        const chunks=[];let bytes=0;
        while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>35000){await reader.cancel();return json({error:'Too large'},413);}chunks.push(value);}
        const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
        input=JSON.parse(new TextDecoder().decode(body));
      }catch{return json({error:'Invalid JSON'},400);}
      const valid=input&&input.schema===1&&/^[0-9A-Za-z.+-]{1,30}$/.test(input.version||'')&&['win32','linux','darwin'].includes(input.platform)&&Array.isArray(input.events)&&input.events.length<=120&&input.events.every(event=>typeof event==='string'&&event.length<=600)&&Array.isArray(input.processes)&&input.processes.length<=12;
      if(!valid)return json({error:'Invalid diagnostic report'},400);
      const ip=request.headers.get('CF-Connecting-IP')||'unknown';
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
      const key='diagnostics:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
      try{const gate=await env.FEEDBACK_LIMITER.getByName(key).fetch('https://limiter.internal/consume',{method:'POST'});if(gate.status===429)return json({error:'Too many reports'},429);if(!gate.ok)return json({error:'Diagnostics temporarily unavailable'},503);}catch{return json({error:'Diagnostics temporarily unavailable'},503);}
      // the random per-install debug code (Preferences > Privacy) and the screens with their scale, so one computer's reports can be found together
      const debugCode=DEBUG_CODE.test(input.debugCode||'')?input.debugCode:'none';
      const displayLine=(Array.isArray(input.displays)?input.displays.slice(0,8):[]).map(d=>`${Math.round(Number(d?.width)||0)}×${Math.round(Number(d?.height)||0)} @${Math.round((Number(d?.scale)||1)*100)}%`).join(', ')||'unknown';
      const processLines=input.processes.map(proc=>`${String(proc.type||'unknown').slice(0,28)}: ${Math.round(Number(proc.privateKB||0)/1024)} MB private`).join('\n').slice(0,1000)||'No process metrics';
      const events=input.events.slice(-20).join('\n').replace(/`/g,"'").slice(-3500)||'No recent events';
      const content={username:'Grump Diagnostics',allowed_mentions:{parse:[]},embeds:[{title:`Grump ${input.version} · ${String(input.reason||'manual').slice(0,30)}`,description:'```\n'+events+'\n```',color:5793266,fields:[{name:'System',value:`${input.platform} ${String(input.osVersion||'').slice(0,80)} · ${input.arch||'unknown'}\nElectron ${String(input.electron||'unknown').slice(0,30)} · ${input.displays?.length||0} display(s)`,inline:false},{name:'Processes',value:'```\n'+processLines+'\n```',inline:false},{name:'Previous unexpected exit',value:input.previousUnexpectedExit?'Yes':'No',inline:true},{name:'Report ID',value:String(input.reportId||'none').slice(0,80),inline:true},{name:'Debug code',value:debugCode,inline:true},{name:'Displays',value:displayLine.slice(0,300),inline:false}],footer:{text:'Opt-in sanitized Grump diagnostics'},timestamp:new Date().toISOString()}]};
      // kept for the owner to read (tools/read-diagnostics.cjs), then posted to Discord; either one is enough to answer ok
      let stored=false;
      if(env.DIAGNOSTICS_STORE){try{const r=await env.DIAGNOSTICS_STORE.getByName('reports-v1').fetch('https://store.internal/add',{method:'POST',body:JSON.stringify(storedReport(input,debugCode))});stored=r.ok;}catch{}}
      try{const response=await fetch(env.DIAGNOSTICS_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(content),signal:AbortSignal.timeout(8000)});if(!response.ok&&!stored)return json({error:'Delivery failed'},502);return json({ok:true});}catch{return stored?json({ok:true}):json({error:'Delivery failed'},502);}
    }
    const origin=request.headers.get('Origin')||'';
    const allowed=String(env.ALLOWED_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(!origin||!allowed.includes(origin))return json({error:'Forbidden'},403);
    if(url.pathname!=='/feedback')return json({error:'Not found'},404,origin);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
    if(request.method!=='POST')return json({error:'Method not allowed'},405,origin);
    if(!env.DISCORD_WEBHOOK_URL||!env.FEEDBACK_LIMITER)return json({error:'Feedback unavailable'},503,origin);
    const size=Number(request.headers.get('Content-Length')||0);
    if(size>6000)return json({error:'Too large'},413,origin);
    let input;
    try{
      const reader=request.body?.getReader();if(!reader)return json({error:'Invalid JSON'},400,origin);
      const chunks=[];let bytes=0;
      while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>6000){await reader.cancel();return json({error:'Too large'},413,origin);}chunks.push(value);}
      const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
      input=JSON.parse(new TextDecoder().decode(body));
    }catch{return json({error:'Invalid JSON'},400,origin);}
    if(!input||typeof input!=='object'||input.website)return json({error:'Invalid input'},400,origin);
    const type=typeof input.type==='string'?input.type:'';
    const text=typeof input.text==='string'?input.text.trim():'';
    const contact=typeof input.contact==='string'?input.contact.trim():'';
    if(!LABELS[type]||text.length<3||text.length>1500||contact.length>120)return json({error:'Invalid input'},400,origin);
    // Which Grump the person uses. The website form (schema 2) must send it with a bug report; older clients that send none are still
    // accepted and shown as "not given", so no report is lost.
    const platform=['windows','mac','linux'].includes(input.platform)?input.platform:'';
    const version=typeof input.version==='string'&&/^(?:\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[A-Za-z0-9.]{1,20})?|older)$/.test(input.version)?input.version:'';
    const source=input.source==='app'?'app':'web';
    if(input.schema===2&&type==='bug'&&(!platform||!version))return json({error:'Version required'},400,origin);
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
    const key='feedback:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    try {
      const gate=await env.FEEDBACK_LIMITER.getByName(key).fetch('https://limiter.internal/consume',{method:'POST'});
      if(gate.status===429)return json({error:'Too many requests'},429,origin);
      if(!gate.ok)return json({error:'Feedback temporarily unavailable'},503,origin);
    } catch {return json({error:'Feedback temporarily unavailable'},503,origin);}
    const [label,color]=LABELS[type];
    const grumpLine=(platform||version)?`${platform?{windows:'Windows',mac:'Mac',linux:'Linux'}[platform]:'?'} ${version==='older'?'an older version':(version||'?')}`:'not given';
    const content={username:'Grump Feedback',allowed_mentions:{parse:[]},embeds:[{title:label,description:text,color,fields:[{name:'Grump',value:grumpLine,inline:true},{name:'Contact',value:contact||'Anonymous',inline:true}],footer:{text:source==='app'?'Grump app':'Grump website'},timestamp:new Date().toISOString()}]};
    try{
      const response=await fetch(env.DISCORD_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(content),signal:AbortSignal.timeout(8000)});
      if(!response.ok)return json({error:'Delivery failed'},502,origin);
      return json({ok:true},200,origin);
    }catch{return json({error:'Delivery failed'},502,origin);}
  }
};

// One durable object per hashed IP serializes quota changes across concurrent requests.
export class FeedbackLimiter {
  constructor(state){this.state=state;}
  async fetch(request){
    if(new URL(request.url).pathname==='/downloads'){
      if(!this.statsPending)this.statsPending=this.downloads().finally(()=>{this.statsPending=null;});
      return json(await this.statsPending);
    }
    if(request.method!=='POST')return new Response(null,{status:405});
    const accepted=await this.state.storage.transaction(async storage=>{
      const now=Date.now();
      let bucket=await storage.get('bucket');
      if(!bucket||bucket.expires<=now)bucket={count:0,expires:now+3600000};
      if(bucket.count>=5)return false;
      bucket.count++;
      await storage.put('bucket',bucket);
      await storage.setAlarm(bucket.expires);
      return true;
    });
    return new Response(null,{status:accepted?204:429});
  }
  async downloads(){
    const cached=await this.state.storage.get('stats');
    if(cached&&Date.now()-Date.parse(cached.updatedAt)<300000)return cached;
    try{
      let count=0,page=1,releases;
      do{
        const r=await fetch(`https://api.github.com/repos/yeazka/Grump/releases?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Grump-Download-Stats'},signal:AbortSignal.timeout(10000)});
        if(!r.ok)throw Error('GitHub unavailable');releases=await r.json();if(!Array.isArray(releases))throw Error('Invalid data');
        for(const release of releases)if(!release.draft)for(const asset of release.assets||[]){
          if(/^Grump-Setup-\d+\.\d+\.\d+\.exe$/i.test(asset.name||'')&&Number.isSafeInteger(asset.download_count)&&asset.download_count>=0)count+=asset.download_count;
        }
        page++;
      }while(releases.length===100);
      const stats={count,updatedAt:new Date().toISOString(),source:'GitHub Releases setup assets'};
      await this.state.storage.put('stats',stats);return stats;
    }catch(error){if(cached)return {...cached,stale:true};throw error;}
  }
  async alarm(){const bucket=await this.state.storage.get('bucket');if(bucket&&bucket.expires>Date.now())await this.state.storage.setAlarm(bucket.expires);else await this.state.storage.deleteAll();}
}

// The latest diagnostic reports, for the owner to read with the token: at most REPORT_KEEP_MAX, none older than REPORT_KEEP_DAYS.
export class DiagnosticsStore {
  constructor(state){this.state=state;}
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/add'&&request.method==='POST'){
      const report=await request.json();
      await this.state.storage.put(`r:${report.receivedAt}:${report.reportId}`,report);
      await this.prune();
      if(!(await this.state.storage.getAlarm()))await this.state.storage.setAlarm(Date.now()+86400000);
      return new Response(null,{status:204});
    }
    if(url.pathname==='/list'){
      const code=url.searchParams.get('code')||'',limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||20));
      const all=await this.state.storage.list({prefix:'r:',reverse:true,limit:REPORT_KEEP_MAX});
      const reports=[...all.values()].filter(r=>!code||r.debugCode===code).slice(0,limit);
      return json({count:reports.length,reports});
    }
    return new Response(null,{status:404});
  }
  async prune(){
    const cutoff=new Date(Date.now()-REPORT_KEEP_DAYS*86400000).toISOString();
    const keys=[...(await this.state.storage.list({prefix:'r:'})).keys()];   // oldest first
    const drop=keys.filter((key,i)=>key.slice(2)<cutoff||i<keys.length-REPORT_KEEP_MAX);
    for(let i=0;i<drop.length;i+=128)await this.state.storage.delete(drop.slice(i,i+128));
  }
  async alarm(){await this.prune();if((await this.state.storage.list({prefix:'r:',limit:1})).size)await this.state.storage.setAlarm(Date.now()+86400000);}
}
