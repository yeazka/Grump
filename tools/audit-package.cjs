const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const forbidden = /(^|\/)(?:\.env(?:\.[^/]*)?|\.dev\.vars(?:\.[^/]*)?|\.npmrc|\.yarnrc|credentials[^/]*\.json|service-account[^/]*\.json|secrets[^/]*\.json|(?:settings|timer|productivity|personal-features)\.json(?:\.(?:bak|tmp))?|[^/]*\.(?:pem|key|cert|cer|pfx|p12|log)|SFPro[^/]*\.ttf)(?:$|\/)|(^|\/)(?:\.git|\.21st|\.wrangler|backup-[^/]*|userData|Local Storage|Session Storage)(?:\/|$)/i;
const secret=require('./secret-pattern.cjs');
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function audit(dir) {
  const archive=path.join(dir,'resources','app.asar');
  if(!fs.existsSync(archive))throw Error('Missing app.asar: '+dir);
  const violations=[];
  const files=asar.listPackage(archive);
  for(const raw of files){
    const name=raw.replace(/\\/g,'/').replace(/^\//,'');
    if(forbidden.test(name))violations.push(name);
    // Tesseract's generated wasm.js bundles contain binary/base64 payloads that
    // can coincidentally match credential regexes. Keep path filtering active.
    if(/\.(?:js|cjs|json|html|css|ps1|txt)$/.test(name) && !/^node_modules\/tesseract\.js-core\/tesseract-core(?:-[^/]+)?\.wasm\.js$/.test(name)){
      try{if(secret.test(asar.extractFile(archive,raw.slice(1)).toString('utf8')))violations.push(name+' (credential pattern)')}catch(e){if(!/unpacked/.test(e.message))throw e}
    }
  }
  for(const file of walk(dir)) {
    const name=path.relative(dir,file).replace(/\\/g,'/');
    if(forbidden.test(name))violations.push(name);
    if(/\.(?:json|yml|yaml|ps1|txt)$/.test(name)&&secret.test(fs.readFileSync(file,'utf8')))violations.push(name+' (credential pattern)');
  }
  if(violations.length)throw Error('Release blocked; excluded content found:\n'+violations.join('\n'));
  console.log('Package audit passed: '+files.length+' archive entries; '+dir);
  return {entries:files.length};
}
module.exports = async context => audit(context.appOutDir);
module.exports.audit=audit;
module.exports.forbidden=forbidden;
if(require.main===module){try{audit(path.resolve(process.argv[2]||'dist/setup/win-unpacked'))}catch(e){console.error(e.message);process.exitCode=1}}
