const LABELS={idea:['Idea / Suggestion',16751360],bug:['Bug Report',15682628],cheer:['Cheer / Feedback',15485337]};
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
export default {
  async fetch(request,env){
    if(new URL(request.url).pathname==='/downloads'&&request.method==='GET'){
      try{const response=await env.FEEDBACK_LIMITER.getByName('public-download-stats-v1').fetch('https://internal/downloads');
        return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
      }catch{return json({error:'Statistics temporarily unavailable'},503,'*');}
    }
    const origin=request.headers.get('Origin')||'';
    const allowed=String(env.ALLOWED_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(!origin||!allowed.includes(origin))return json({error:'Forbidden'},403);
    const url=new URL(request.url);
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
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
    const key='feedback:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    try {
      const gate=await env.FEEDBACK_LIMITER.getByName(key).fetch('https://limiter.internal/consume',{method:'POST'});
      if(gate.status===429)return json({error:'Too many requests'},429,origin);
      if(!gate.ok)return json({error:'Feedback temporarily unavailable'},503,origin);
    } catch {return json({error:'Feedback temporarily unavailable'},503,origin);}
    const [label,color]=LABELS[type];
    const content={username:'Grump Feedback',allowed_mentions:{parse:[]},embeds:[{title:label,description:text,color,fields:[{name:'Contact',value:contact||'Anonymous',inline:true}],footer:{text:'Grump website'},timestamp:new Date().toISOString()}]};
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
