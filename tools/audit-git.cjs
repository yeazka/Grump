const fs=require('fs'),cp=require('child_process');
const names=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const {forbidden}=require('./audit-package.cjs');
const secret=/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-proj-[A-Za-z0-9_-]{30,}/;
const hits=[];
for(const name of names){
  if(forbidden.test(name)&&!name.endsWith('.env.example'))hits.push(name);
  if(fs.existsSync(name)&&fs.statSync(name).size<5000000&&/\.(?:js|cjs|json|ps1|html|css|yml|yaml|md|txt|example)$/.test(name)&&secret.test(fs.readFileSync(name,'utf8')))hits.push(name+' (credential pattern)');
}
if(hits.length){console.error('Git content audit failed:\n'+hits.join('\n'));process.exitCode=1}else console.log('Git working content audit passed ('+names.length+' paths). Historical commits are not rewritten.');
