const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

test('feedback endpoint keeps webhook server-side and limits submissions',async()=>{
  const worker=(await import(pathToFileURL(path.resolve(__dirname,'../website/feedback-worker/worker.js')).href)).default;
  const counts=new Map();
  const env={ALLOWED_ORIGIN:'https://grump.example',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/private',FEEDBACK_RATE:{get:async key=>counts.get(key),put:async(key,value)=>{counts.set(key,value)}}};
  const request=(origin,body)=>new Request('https://feedback.example/feedback',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.4'},body:JSON.stringify(body)});
  const originalFetch=global.fetch;
  let delivered=0;
  global.fetch=async(url,options)=>{delivered++;assert.equal(url,env.DISCORD_WEBHOOK_URL);const payload=JSON.parse(options.body);assert.equal(payload.embeds[0].description,'Great app');return new Response(null,{status:204});};
  try{
    assert.equal((await worker.fetch(request('https://other.example',{type:'idea',text:'Great app'}),env)).status,403);
    assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'x'}),env)).status,400);
    for(let i=0;i<5;i++)assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'Great app'}),env)).status,200);
    assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'Great app'}),env)).status,429);
    assert.equal(delivered,5);
  }finally{global.fetch=originalFetch;}
});
