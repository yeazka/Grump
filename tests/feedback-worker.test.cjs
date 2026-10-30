const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

test('feedback endpoint keeps webhook server-side and limits submissions',async()=>{
  const worker=(await import(pathToFileURL(path.resolve(__dirname,'../website/feedback-worker/worker.js')).href)).default;
  const counts=new Map();
  const env={ALLOWED_ORIGIN:'https://grump.example',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/private',FEEDBACK_LIMITER:{getByName:key=>({fetch:async()=>{const count=counts.get(key)||0;if(count>=5)return new Response(null,{status:429});counts.set(key,count+1);return new Response(null,{status:204});}})}};
  const request=(origin,body)=>new Request('https://feedback.example/feedback',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.4'},body:JSON.stringify(body)});
  const originalFetch=global.fetch;
  let delivered=0;
  global.fetch=async(url,options)=>{delivered++;assert.equal(url,env.DISCORD_WEBHOOK_URL);const payload=JSON.parse(options.body);assert.equal(payload.embeds[0].description,'Great app');return new Response(null,{status:204});};
  try{
    assert.equal((await worker.fetch(request('https://other.example',{type:'idea',text:'Great app'}),env)).status,403);
    const options=new Request('https://feedback.example/feedback',{method:'OPTIONS',headers:{Origin:'http://localhost:3000'}});
    assert.equal((await worker.fetch(options,{...env,ALLOWED_ORIGIN:'https://grump.example,http://localhost:3000'})).status,204);
    assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'x'}),env)).status,400);
    for(let i=0;i<5;i++)assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'Great app'}),env)).status,200);
    assert.equal((await worker.fetch(request(env.ALLOWED_ORIGIN,{type:'idea',text:'Great app'}),env)).status,429);
    assert.equal(delivered,5);
  }finally{global.fetch=originalFetch;}
});

test('feedback quota serializes concurrent requests and storage errors return 503',async()=>{
 const {default:worker,FeedbackLimiter}=await import(pathToFileURL(path.resolve(__dirname,'../website/feedback-worker/worker.js')).href);
 const data=new Map();let queue=Promise.resolve();
 const storage={get:async key=>structuredClone(data.get(key)),put:async(key,v)=>data.set(key,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>data.clear()};
 storage.transaction=fn=>{const result=queue.then(()=>fn(storage));queue=result.catch(()=>{});return result;};
 const limiter=new FeedbackLimiter({storage});
 const results=await Promise.all(Array.from({length:10},()=>limiter.fetch(new Request('https://limiter/consume',{method:'POST'}))));
 assert.equal(results.filter(r=>r.status===204).length,5);assert.equal(results.filter(r=>r.status===429).length,5);
 data.get('bucket').expires=0;await limiter.alarm();assert.equal((await limiter.fetch(new Request('https://limiter/consume',{method:'POST'}))).status,204);
 const response=await worker.fetch(new Request('https://feedback/feedback',{method:'POST',headers:{Origin:'https://test.example'},body:JSON.stringify({type:'idea',text:'test'})}),{ALLOWED_ORIGIN:'https://test.example',DISCORD_WEBHOOK_URL:'mock',FEEDBACK_LIMITER:{getByName(){throw Error('storage unavailable')}}});
 assert.equal(response.status,503);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://test.example');
});
