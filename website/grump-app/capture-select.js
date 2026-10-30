'use strict';
let start=null;
const selection=document.getElementById('selection');
document.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};selection.style.display='block';document.body.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!start)return;const x=Math.min(start.x,e.clientX),y=Math.min(start.y,e.clientY),w=Math.abs(e.clientX-start.x),h=Math.abs(e.clientY-start.y);Object.assign(selection.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});});
document.addEventListener('pointerup',e=>{if(!start)return;const rect={x:Math.min(start.x,e.clientX),y:Math.min(start.y,e.clientY),width:Math.abs(e.clientX-start.x),height:Math.abs(e.clientY-start.y)};start=null;window.captureArea.select(rect);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.captureArea.select(null);});
