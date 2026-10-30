const fs=require('fs'),cp=require('child_process');
const names=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const {forbidden}=require('./audit-package.cjs');
const secret=require('./secret-pattern.cjs');
const hits=[];
for(const name of names){
  if(forbidden.test(name)&&!name.endsWith('.env.example'))hits.push(name);
  if(fs.existsSync(name)&&fs.statSync(name).size<5000000&&/\.(?:js|cjs|json|ps1|html|css|yml|yaml|md|txt|example)$/.test(name)&&secret.test(fs.readFileSync(name,'utf8')))hits.push(name+' (credential pattern)');
}
if(hits.length){console.error('Git content audit failed:\n'+hits.join('\n'));process.exitCode=1}else console.log('Git working content audit passed ('+names.length+' paths). Historical commits are not rewritten.');

if(process.argv.includes('--history')){
  const seen=new Set(),historical=[];
  const commits=cp.execFileSync('git',['rev-list','--all'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const commit of commits){
    const records=cp.execFileSync('git',['ls-tree','-rz',commit],{encoding:'utf8'}).split('\0').filter(Boolean);
    for(const record of records){
      const tab=record.indexOf('\t'),name=record.slice(tab+1),[mode,type,hash]=record.slice(0,tab).split(' ');
      if(type!=='blob')continue;
      if(forbidden.test(name)&&!name.endsWith('.env.example'))historical.push(name+' (excluded path in history)');
      if(seen.has(hash)||! /\.(?:js|cjs|json|ps1|html|css|yml|yaml|md|txt|example)$/.test(name))continue;
      seen.add(hash);
      if(Number(cp.execFileSync('git',['cat-file','-s',hash],{encoding:'utf8'}))>5000000)continue;
      if(secret.test(cp.execFileSync('git',['cat-file','blob',hash],{encoding:'utf8',maxBuffer:6000000})))historical.push(name+' (credential pattern in history)');
    }
  }
  if(historical.length){console.error([...new Set(historical)].join('\n'));process.exitCode=1;}
  else console.log('Git history scan passed ('+commits.length+' commits, '+seen.size+' unique text blobs).');
}
