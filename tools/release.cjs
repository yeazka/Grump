const path=require('path');
const fs=require('fs'),crypto=require('crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const {build,Platform,Arch}=require('electron-builder');
const requested=process.argv[2]||'unpacked';
const channels={unpacked:'dir',setup:'nsis',portable:'portable',steam:'dir',store:'appx'};
async function run(channel){
  if(!channels[channel])throw Error('Unknown release channel');
  const signed=process.argv.includes('--signed');
  if(signed&&channel!=='setup')throw Error('--signed is configured for setup only');
  await build({targets:Platform.WINDOWS.createTarget([channels[channel]],Arch.x64),publish:'never',config:{
    directories:{output:path.join('dist',channel)},
    extraMetadata:{grumpChannel:channel},
    forceCodeSigning:signed
  }});
  const output=path.join('dist',channel),appDir=path.join(output,'win-unpacked');
  require('./audit-package.cjs').audit(appDir);
  const files=fs.readdirSync(output).filter(name=>/\.(exe|appx|yml|blockmap)$/.test(name)&&fs.statSync(path.join(output,name)).isFile());
  const version=require('../package.json').version;
  const current=files.filter(name=>name==='latest.yml'||name.includes(version));
  const manifest={version,channel,createdAt:new Date().toISOString(),archiveSha256:hash(path.join(appDir,'resources','app.asar')),executableSha256:hash(path.join(appDir,'Grump.exe')),artifacts:Object.fromEntries(current.map(name=>[name,hash(path.join(output,name))]))};
  fs.writeFileSync(path.join(output,'release-manifest.json'),JSON.stringify(manifest,null,2));
}
(async()=>{for(const channel of requested==='all'?Object.keys(channels).filter(c=>c!=='unpacked'):[requested])await run(channel)})().catch(e=>{console.error(e.message);process.exitCode=1});
