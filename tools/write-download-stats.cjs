const fs=require('node:fs');
const target=process.argv[2];
if(!target)throw Error('Output path required');
(async()=>{
  const headers={Accept:'application/vnd.github+json','User-Agent':'Grump-Pages-Stats'};
  if(process.env.GH_TOKEN)headers.Authorization=`Bearer ${process.env.GH_TOKEN}`;
  let count=0,page=1,releases;
  do{
    const response=await fetch(`https://api.github.com/repos/yeazka/Grump/releases?per_page=100&page=${page}`,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`GitHub releases HTTP ${response.status}`);
    releases=await response.json();if(!Array.isArray(releases))throw Error('Unexpected releases payload');
    for(const release of releases)if(!release.draft)for(const asset of release.assets||[]){
      if(/^Grump-Setup-\d+\.\d+\.\d+\.exe$/i.test(asset.name||'')&&Number.isSafeInteger(asset.download_count)&&asset.download_count>=0)count+=asset.download_count;
    }
    page++;
  }while(releases.length===100&&page<=20);
  if(!Number.isSafeInteger(count))throw Error('Invalid download count');
  fs.writeFileSync(target,JSON.stringify({count,updatedAt:new Date().toISOString(),source:'GitHub Releases setup assets'}));
  console.log(`Verified GitHub setup downloads: ${count}`);
})().catch(e=>{console.error(e.message);process.exitCode=1});
