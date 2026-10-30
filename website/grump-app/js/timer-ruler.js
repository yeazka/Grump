'use strict';
const ruler=$('#timer-ruler');
let rulerDrag=null, rulerFrame=0, rulerPending=null, rulerCommit=0;
function drawRuler(){
 const minutes=Math.max(1,Math.round(timerSeconds/60));
 ruler.setAttribute('aria-valuenow',minutes);ruler.setAttribute('aria-valuetext',minutes+' minutes');
 ruler.setAttribute('aria-disabled',String(['running','paused'].includes(timerState.status)));
 let html='';for(let n=minutes-17;n<=minutes+17;n++){if(n<1||n>1440)continue;html+=`<div class="ruler-tick ${n<=minutes?'ruler-filled':'ruler-future'} ${n===minutes?'selected':''}" style="left:calc(50% + ${(n-minutes)*10}px);--heat:${Math.max(0,1-Math.abs(n-minutes)/5)}">${n%5===0?`<span>${n}</span>`:''}<i></i></div>`;}
 setHTML('timer-ticks',html);
 $('#timer-reset').hidden=timerState.status==='idle';
}
function commitRuler(){clearTimeout(rulerCommit);bridge.timerCommand?.({action:'set',seconds:timerSeconds});ruler.classList.remove('heating');}
function chooseMinutes(n){
 if(['running','paused'].includes(timerState.status))return;
 rulerPending=clamp(n,1,1440);ruler.classList.add('heating');clearTimeout(rulerCommit);
 if(!rulerFrame)rulerFrame=requestAnimationFrame(()=>{
  rulerFrame=0;const n=rulerPending;timerSeconds=Math.round(n)*60;
  renderFeatures();drawRuler();$('#timer-ticks').style.transform=`translateX(${(Math.round(n)-n)*10}px)`;
  rulerCommit=setTimeout(commitRuler,180);
 });
}
ruler.setAttribute('aria-valuemax','1440');
ruler.addEventListener('pointerdown',e=>{e.stopPropagation();if(['running','paused'].includes(timerState.status))return;rulerDrag={x:e.clientX,minutes:timerSeconds/60};S.dragLock=true;ruler.setPointerCapture(e.pointerId);});
ruler.addEventListener('pointermove',e=>{if(rulerDrag)chooseMinutes(rulerDrag.minutes+(rulerDrag.x-e.clientX)/10);});
function releaseRuler(){rulerDrag=null;S.dragLock=false;$('#timer-ticks').style.transform='';clearTimeout(rulerCommit);rulerCommit=setTimeout(commitRuler,180);}
ruler.addEventListener('pointerup',releaseRuler);ruler.addEventListener('pointercancel',releaseRuler);ruler.addEventListener('lostpointercapture',releaseRuler);
ruler.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();chooseMinutes(timerSeconds/60+Math.sign(e.deltaY||e.deltaX));},{passive:false});
ruler.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:5,PageDown:-5}[e.key];if(d){e.preventDefault();e.stopPropagation();chooseMinutes(timerSeconds/60+d);}});
renderers.push(drawRuler);bridge.onTimer?.(drawRuler);drawRuler();
