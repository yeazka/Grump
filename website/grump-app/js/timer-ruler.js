'use strict';
const ruler=$('#timer-ruler');
let rulerDrag=null, rulerFrame=0, rulerPending=null, rulerCommit=0;
function drawRuler(){
 // While a timer runs the ruler counts down the minutes left; otherwise it shows the minutes being chosen.
 const working=['running','paused'].includes(timerState.status);
 const minutes=Math.max(1,working?Math.ceil(timerLeft()/60000):Math.round(timerSeconds/60));
 ruler.setAttribute('aria-valuenow',minutes);ruler.setAttribute('aria-valuetext',minutes+' minutes');
 ruler.setAttribute('aria-disabled',String(['running','paused'].includes(timerState.status)));
 let html='';for(let n=minutes-14;n<=minutes+14;n++){if(n<1||n>1440)continue;html+=`<div class="ruler-tick ${n<=minutes?'ruler-filled':'ruler-future'} ${n===minutes?'selected':''}" style="left:calc(50% + ${(n-minutes)*14}px);--heat:${Math.max(0,1-Math.abs(n-minutes)/5)};--d:${Math.abs(n-minutes)}">${n%5===0?`<span>${n}</span>`:''}<i></i></div>`;}
 setHTML('timer-ticks',html);
 $('#timer-reset').hidden=timerState.status==='idle';
}
function commitRuler(){clearTimeout(rulerCommit);bridge.timerCommand?.({action:'set',seconds:timerSeconds});ruler.classList.remove('heating');}
function chooseMinutes(n){
 if(['running','paused'].includes(timerState.status))return;
 rulerPending=clamp(n,1,1440);ruler.classList.add('heating');clearTimeout(rulerCommit);
 if(!rulerFrame)rulerFrame=requestAnimationFrame(()=>{
  rulerFrame=0;const n=rulerPending;timerSeconds=Math.round(n)*60;
  renderFeatures();drawRuler();$('#timer-ticks').style.transform=`translateX(${(Math.round(n)-n)*14}px)`;
  rulerCommit=setTimeout(commitRuler,180);
 });
}
ruler.setAttribute('aria-valuemax','1440');
ruler.addEventListener('pointerdown',e=>{e.stopPropagation();if(['running','paused'].includes(timerState.status))return;rulerDrag={x:e.clientX,minutes:timerSeconds/60};S.dragLock=true;ruler.setPointerCapture(e.pointerId);});
ruler.addEventListener('pointermove',e=>{if(rulerDrag)chooseMinutes(rulerDrag.minutes+(rulerDrag.x-e.clientX)/14);});
function releaseRuler(){rulerDrag=null;S.dragLock=false;$('#timer-ticks').style.transform='';clearTimeout(rulerCommit);rulerCommit=setTimeout(commitRuler,180);}
ruler.addEventListener('pointerup',releaseRuler);ruler.addEventListener('pointercancel',releaseRuler);ruler.addEventListener('lostpointercapture',releaseRuler);
ruler.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();chooseMinutes(timerSeconds/60+Math.sign(e.deltaY||e.deltaX));},{passive:false});
ruler.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:5,PageDown:-5}[e.key];if(d){e.preventDefault();e.stopPropagation();chooseMinutes(timerSeconds/60+d);}});
renderers.push(drawRuler);bridge.onTimer?.(drawRuler);drawRuler();

let reminderScreen='list',reminderRepeat='once',reminderDays=new Set(),reminderDate=new Date(),reminderHour=0,reminderMinute=0,reminderCalendarMonth=new Date(),reminderPickerMode='',reminderMonthGrid=false;
const reminderView=$('#reminder-view'),timerMain=$('#timer-main'),reminderEditor=$('#reminder-editor');
const dayLabels=['S','M','T','W','T','F','S'];
const monthLabels=['January','February','March','April','May','June','July','August','September','October','November','December'];
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function syncReminderValues(){
 $('#reminder-date-label').textContent=`${String(reminderDate.getDate()).padStart(2,'0')} / ${String(reminderDate.getMonth()+1).padStart(2,'0')} / ${reminderDate.getFullYear()}`;
 $('#reminder-time-label').textContent=`${String(reminderHour).padStart(2,'0')} : ${String(reminderMinute).padStart(2,'0')}`;
}
function renderReminderPicker(){
 const picker=$('#reminder-picker');picker.hidden=!reminderPickerMode;
 island.dataset.reminderPicker=reminderPickerMode?'1':'0';layout();
 if(!reminderPickerMode){picker.replaceChildren();return;}
 const year=reminderCalendarMonth.getFullYear(),month=reminderCalendarMonth.getMonth(),firstDay=new Date(year,month,1).getDay(),daysInMonth=new Date(year,month+1,0).getDate();
 const days=`${Array.from({length:firstDay},()=>'<span class="empty"></span>').join('')}${Array.from({length:daysInMonth},(_,index)=>{const day=index+1,key=dateKey(new Date(year,month,day)),classes=[key===dateKey(new Date())?'today':'',key===dateKey(reminderDate)?'selected':''].filter(Boolean).join(' ');return `<button type="button" class="${classes}" data-act="reminderpickdate" data-date="${key}" aria-label="${new Date(year,month,day).toLocaleDateString()}">${day}</button>`;}).join('')}`;
 const monthGrid=monthLabels.map((label,index)=>`<button type="button" class="${index===month?'selected':''}" data-act="reminderpickmonth" data-value="${index}">${label.slice(0,3)}</button>`).join('');
 const hour12=reminderHour%12||12,period=reminderHour>=12?'PM':'AM';
 picker.innerHTML=`<div class="reminder-picker-head"><button type="button" class="reminder-month-toggle" data-act="remindermonthgrid"><span>${monthLabels[month]} ${year}</span><i></i></button><div><button type="button" data-act="remindercalprev" aria-label="Previous month">‹</button><button type="button" data-act="remindercalnext" aria-label="Next month">›</button></div></div><div class="reminder-calendar-stage"><div class="reminder-weekdays">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day=>`<span>${day}</span>`).join('')}</div><div class="reminder-calendar">${days}</div>${reminderMonthGrid?`<div class="reminder-month-overlay"><header><button type="button" data-act="reminderyearprev">‹</button><strong>${year}</strong><button type="button" data-act="reminderyearnext">›</button></header><div>${monthGrid}</div></div>`:''}</div><div class="reminder-time-row"><strong>Time</strong><div class="reminder-time-inputs"><input inputmode="numeric" maxlength="2" value="${String(hour12).padStart(2,'0')}" data-reminder-time="hour" aria-label="Hour"><span>:</span><input inputmode="numeric" maxlength="2" value="${String(reminderMinute).padStart(2,'0')}" data-reminder-time="minute" aria-label="Minute"></div><div class="reminder-period"><button type="button" data-act="reminderperiod" data-value="AM" class="${period==='AM'?'active':''}">AM</button><button type="button" data-act="reminderperiod" data-value="PM" class="${period==='PM'?'active':''}">PM</button></div></div><button type="button" class="reminder-picker-done" data-act="reminderpickdone">Done</button>`;
 picker.querySelectorAll('[data-reminder-time]').forEach(input=>input.addEventListener('input',event=>{let value=event.target.value.replace(/\D/g,'').slice(0,2),number=Number(value||0);if(event.target.dataset.reminderTime==='hour'){number=Math.min(12,Math.max(1,number));const pm=(reminderHour>=12);reminderHour=(number%12)+(pm?12:0);}else{number=Math.min(59,Math.max(0,number));reminderMinute=number;}event.target.value=String(number).padStart(2,'0');syncReminderValues();}));
}
function reminderSummary(item){
 if(item.repeat==='daily')return `Daily · ${item.time}`;
 if(item.repeat==='days')return `${item.days.map(day=>dayLabels[day]).join(' ')} · ${item.time}`;
 return `${item.date||''} · ${item.time}`;
}
function renderReminders(){
 const list=$('#reminder-list'),items=addonProductivity?.reminders||[];
 if(!list)return;
 list.innerHTML=items.length?items.map(item=>`<article class="reminder-row ${item.enabled?'':'off'}"><button data-act="remindertoggle" data-id="${esc(item.id)}"><i></i><span><b>${esc(item.text)}</b><small>${esc(reminderSummary(item))}</small></span></button><button data-act="reminderdelete" data-id="${esc(item.id)}" aria-label="Delete reminder"><span data-ico="trash"></span></button></article>`).join(''):`<div class="reminder-empty"><span data-ico="bell"></span><b>No reminders yet</b><small>Add one without leaving the timer.</small></div>`;
 list.hidden=reminderScreen!=='list';reminderEditor.hidden=reminderScreen!=='editor';
}
function openReminderEditor(){
 reminderScreen='editor';reminderRepeat='once';reminderDays=new Set();
 const now=new Date(Date.now()+300000);
 reminderDate=new Date(now.getFullYear(),now.getMonth(),now.getDate());reminderHour=now.getHours();reminderMinute=now.getMinutes();reminderCalendarMonth=new Date(now.getFullYear(),now.getMonth(),1);reminderPickerMode='';reminderMonthGrid=false;
 $('#reminder-text').value='';syncReminderValues();renderReminderPicker();
 $('#reminder-error').textContent='';
 $('#reminder-days').innerHTML=dayLabels.map((label,index)=>`<button type="button" data-act="reminderday" data-day="${index}">${label}</button>`).join('');
 syncReminderEditor();renderReminders();
}
function syncReminderEditor(){
 $$('.reminder-repeat button').forEach(button=>button.classList.toggle('active',button.dataset.repeat===reminderRepeat));
 $('#reminder-date-field').hidden=reminderRepeat!=='once';$('#reminder-days').hidden=reminderRepeat!=='days';
 $$('#reminder-days button').forEach(button=>button.classList.toggle('active',reminderDays.has(Number(button.dataset.day))));
}
acts.reminders=async()=>{timerMain.hidden=true;reminderView.hidden=false;reminderScreen='list';addonProductivity=await bridge.productivityState?.()||addonProductivity;renderReminders();};
acts.reminderback=()=>{if(reminderPickerMode){reminderPickerMode='';renderReminderPicker();return;}if(reminderScreen==='editor'){reminderScreen='list';renderReminders();return;}reminderView.hidden=true;timerMain.hidden=false;};
acts.reminderadd=openReminderEditor;
acts.reminderrepeat=button=>{reminderRepeat=button.dataset.repeat;syncReminderEditor();};
acts.reminderday=button=>{const day=Number(button.dataset.day);reminderDays.has(day)?reminderDays.delete(day):reminderDays.add(day);syncReminderEditor();};
acts.reminderdatepicker=()=>{reminderPickerMode='datetime';reminderMonthGrid=false;reminderCalendarMonth=new Date(reminderDate.getFullYear(),reminderDate.getMonth(),1);renderReminderPicker();};
acts.remindertimepicker=acts.reminderdatepicker;
acts.remindermonthgrid=()=>{reminderMonthGrid=!reminderMonthGrid;renderReminderPicker();};
acts.remindercalprev=()=>{reminderCalendarMonth=new Date(reminderCalendarMonth.getFullYear(),reminderCalendarMonth.getMonth()-1,1);renderReminderPicker();};
acts.remindercalnext=()=>{reminderCalendarMonth=new Date(reminderCalendarMonth.getFullYear(),reminderCalendarMonth.getMonth()+1,1);renderReminderPicker();};
acts.reminderyearprev=()=>{reminderCalendarMonth=new Date(reminderCalendarMonth.getFullYear()-1,reminderCalendarMonth.getMonth(),1);renderReminderPicker();};
acts.reminderyearnext=()=>{reminderCalendarMonth=new Date(reminderCalendarMonth.getFullYear()+1,reminderCalendarMonth.getMonth(),1);renderReminderPicker();};
acts.reminderpickmonth=button=>{reminderCalendarMonth=new Date(reminderCalendarMonth.getFullYear(),Number(button.dataset.value),1);reminderMonthGrid=false;renderReminderPicker();};
acts.reminderpickdate=button=>{const [year,month,day]=button.dataset.date.split('-').map(Number);reminderDate=new Date(year,month-1,day);syncReminderValues();renderReminderPicker();};
acts.reminderperiod=button=>{const hour12=reminderHour%12;reminderHour=hour12+(button.dataset.value==='PM'?12:0);syncReminderValues();renderReminderPicker();};
acts.reminderpickdone=()=>{reminderPickerMode='';syncReminderValues();renderReminderPicker();};
acts.remindersave=async()=>{
 const text=$('#reminder-text').value.trim(),day=String(reminderDate.getDate()).padStart(2,'0'),month=String(reminderDate.getMonth()+1).padStart(2,'0'),year=String(reminderDate.getFullYear()),hour=String(reminderHour).padStart(2,'0'),minute=String(reminderMinute).padStart(2,'0');
 const date=`${year}-${month}-${day}`,time=`${hour}:${minute}`,candidate=new Date(`${date}T${time}:00`);
 const validDate=year.length===4&&candidate.getFullYear()===Number(year)&&candidate.getMonth()+1===Number(month)&&candidate.getDate()===Number(day),validTime=Number(hour)>=0&&Number(hour)<=23&&Number(minute)>=0&&Number(minute)<=59;
 const editor=reminderEditor,error=$('#reminder-error');editor.classList.remove('invalid');error.textContent='';
 const invalidMessage=!text?'Enter a reminder message.':!validTime?'Enter a valid time.':reminderRepeat==='once'&&!validDate?'Enter a valid date.':reminderRepeat==='once'&&candidate.getTime()<=Date.now()?'Choose a future date and time.':reminderRepeat==='days'&&!reminderDays.size?'Choose at least one day.':'';
 if(invalidMessage){error.textContent=invalidMessage;editor.classList.add('invalid');setTimeout(()=>editor.classList.remove('invalid'),450);return;}
 const ok=await bridge.productivitySave?.('reminder',{text,time,date,repeat:reminderRepeat,days:[...reminderDays]});
 if(!ok){error.textContent='Could not save this reminder.';editor.classList.add('invalid');return;}
 addonProductivity=await bridge.productivityState?.()||addonProductivity;reminderScreen='list';renderReminders();
};
acts.remindertoggle=async button=>{await bridge.productivitySave?.('reminder-toggle',button.dataset.id);addonProductivity=await bridge.productivityState?.()||addonProductivity;renderReminders();};
acts.reminderdelete=async button=>{await bridge.productivitySave?.('delete-reminder',button.dataset.id);addonProductivity=await bridge.productivityState?.()||addonProductivity;renderReminders();};
bridge.onProductivityState?.(state=>{if(state&&Array.isArray(state.reminders)){addonProductivity=state;if(!reminderView.hidden)renderReminders();}});
renderReminders();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&reminderPickerMode){event.stopPropagation();reminderPickerMode='';renderReminderPicker();}});
document.addEventListener('pointerdown',event=>{if(reminderPickerMode&&!event.target.closest('#reminder-picker,.reminder-value')){reminderPickerMode='';renderReminderPicker();}},true);
