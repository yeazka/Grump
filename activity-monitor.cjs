'use strict';
const {Worker} = require('node:worker_threads');
const path = require('node:path');
function createActivityMonitor(roots, onState, onError = () => {}) {
  let worker, busy=false, deadline, closed=false, retryAt=0;
  const idle = {active:false,status:'',detail:''};
  function failed() {
    clearTimeout(deadline); busy=false;
    const previous=worker; worker=null; previous?.terminate();
    retryAt=Date.now()+15000;
    onState({codex:idle,antigravity:idle}); onError();
  }
  return {
    poll() {
      if(closed||busy||Date.now()<retryAt)return;
      if(!worker) {
        try { worker=new Worker(path.join(__dirname,'activity-worker.cjs'),{workerData:roots}); }
        catch { failed(); return; }
        const current=worker;
        current.on('message',state=>{if(worker!==current)return;clearTimeout(deadline);busy=false;if(state.error)failed();else onState(state);});
        current.on('error',()=>{if(worker===current)failed();});
        current.on('exit',()=>{if(worker===current&&!closed)failed();});
        current.unref();
      }
      busy=true; deadline=setTimeout(failed,5000); deadline.unref?.();
      worker.postMessage('poll');
    },
    close() {closed=true;clearTimeout(deadline);worker?.terminate();worker=null;}
  };
}
module.exports={createActivityMonitor};
