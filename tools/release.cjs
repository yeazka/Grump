const path=require('path');
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
  require('./audit-package.cjs').audit(path.join('dist',channel,'win-unpacked'));
}
(async()=>{for(const channel of requested==='all'?Object.keys(channels).filter(c=>c!=='unpacked'):[requested])await run(channel)})().catch(e=>{console.error(e.message);process.exitCode=1});
