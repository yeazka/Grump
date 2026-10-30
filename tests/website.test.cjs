'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('website inline scripts parse and static local assets exist',()=>{
 const root=path.resolve(__dirname,'../website'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(match[1].includes('application/ld+json'))JSON.parse(match[2]);
  else if(!match[1].includes('src='))new vm.Script(match[2]);
 }
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const url=match[1].split('?')[0];
  if(/^(?:https?:|data:|mailto:|javascript:)/.test(url))continue;
  assert.ok(fs.existsSync(path.join(root,url)),url);
 }
 const download=html.match(/<a\s[^>]*id="btn-dl-setup"[\s\S]*?>/)?.[0];
 assert.ok(download);assert.ok(download.includes('aria-disabled="true"'));assert.equal(download.includes('href='),false);
});
