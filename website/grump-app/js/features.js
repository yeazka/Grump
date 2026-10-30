'use strict';
let timerState = {status:'idle',duration:900000,remaining:900000,endAt:0};
let lastDownloadNotice='';
let lastActiveDownload='';
let lastDownloadPulse=0;
bridge.onProductivityEvent?.((event)=>{
  if(event?.kind==='reminder' && event.text)notice('bell',`Task: ${event.text}`,5000);
  if(event?.kind==='downloads'){
    const active=(event.downloads||[]).find(d=>d.status==='active');
    if(active && (active.name!==lastActiveDownload || Date.now()-lastDownloadPulse>10000)){
      lastActiveDownload=active.name;lastDownloadPulse=Date.now();
      notice('bell',`Downloading: ${active.name} · ${(active.bytes/1048576).toFixed(1)} MB`,3000);
    }
    const done=(event.downloads||[]).find(d=>d.status==='done');
    if(done && done.id!==lastDownloadNotice){lastDownloadNotice=done.id;notice('bell',`Downloaded: ${done.name}`,3500);}
  }
});
let timerSeconds = 900;
function timerLeft(){return timerState.status==='running'?Math.max(0,timerState.endAt-Date.now()):timerState.remaining}
function renderFeatures(){
  for(const b of document.querySelectorAll('[data-menu]')) {
    const key={music:'menuMusic',timer:'menuTimer',stash:'menuStash'}[b.dataset.menu];
    if (key) b.hidden=S.settings[key]===false;
  }
  const isRunning = timerState.status === 'running';
  const isPaused = timerState.status === 'paused';
  const isWorking = isRunning || isPaused;
  const ms = timerState.status === 'idle' ? timerSeconds * 1000 : timerLeft();
  const total = Math.ceil(ms / 1000);
  const timeStr = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

  const durationMs = timerState.duration || (timerSeconds * 1000);
  const progPct = Math.max(0, Math.min(100, (ms / durationMs) * 100));
  const dashOffset = (100 - progPct).toFixed(1);

  // Update Panel Timer
  setText('timer-digits', timeStr);
  const timerDigitsEl = $('#timer-digits');
  if (timerDigitsEl) timerDigitsEl.dataset.running = isRunning ? '1' : '0';

  const toggleBtn = $('#timer-toggle');
  if (toggleBtn) {
    toggleBtn.dataset.status = timerState.status;
    const txt = { idle: 'Start Timer', running: 'Pause', paused: 'Resume', done: 'Start Timer' }[timerState.status];
    setText('timer-toggle-text', txt);
    const ico = isRunning ? 'pause' : 'play';
    const icoEl = $('#timer-toggle-ico');
    if (icoEl) icoEl.innerHTML = icoOf(ico);
  }

  // Update presets active/disabled state
  document.querySelectorAll('.glass-preset').forEach((b) => {
    b.disabled = isWorking;
    const sec = Number(b.dataset.seconds);
    b.classList.toggle('active', timerSeconds === sec && !isWorking);
  });

  // Update Grump Idle view: timer tetap muncul di samping mata saat aktif dengan animasi detik
  const idleTimerEl = $('#idle-timer');
  const vIdleEl = $('#v-idle');
  if (idleTimerEl) {
    if (isWorking) {
      idleTimerEl.style.display = 'inline-flex';
      idleTimerEl.dataset.running = isRunning ? '1' : '0';
      setText('idle-timer-text', timeStr);
      const ringFg = $('#idle-timer-ring');
      if (ringFg) ringFg.style.strokeDashoffset = dashOffset;
      if (vIdleEl) vIdleEl.dataset.timer = '1';
    } else {
      idleTimerEl.style.display = 'none';
      if (vIdleEl) vIdleEl.dataset.timer = '0';
    }
  }

  // Update Compact view (Music playing): timer tetap aktif & terlihat di samping equalizer
  const cTimer = $('#c-timer');
  if (cTimer) {
    if (isWorking) {
      cTimer.style.display = 'inline-flex';
      cTimer.dataset.running = isRunning ? '1' : '0';
      setText('c-timer-val', timeStr);
      const cRingFg = $('#c-timer-ring');
      if (cRingFg) cRingFg.style.strokeDashoffset = dashOffset;
    } else {
      cTimer.style.display = 'none';
    }
  }

  const quiet=S.settings.quiet;
  island.dataset.quiet=quiet?'1':'0';
}
renderers.push(renderFeatures);
ticks.push(()=>{if(['home','timer','idle','compact'].includes(curKey) || timerState.status==='running')renderFeatures()});
acts.openmenu=el=>go(el.dataset.menu);
acts.timerpreset=el=>bridge.timerCommand?.({action:'set',seconds:Number(el.dataset.seconds)});
acts.timerless=()=>bridge.timerCommand?.({action:'set',seconds:Math.max(60,timerSeconds-60)});
acts.timermore=()=>bridge.timerCommand?.({action:'set',seconds:Math.min(86400,timerSeconds+60)});
acts.timertoggle=()=>{
  const action={idle:'start',running:'pause',paused:'resume',done:'start'}[timerState.status];
  bridge.timerCommand?.({action,seconds:timerSeconds});
};
acts.timerreset=()=>bridge.timerCommand?.({action:'reset'});
bridge.onTimer?.(state=>{
  const changed=state.status!==timerState.status;
  timerState=state;
  if(state.status==='idle')timerSeconds=Math.round(state.duration/1000);
  if(state.status==='done' && changed && S.settings.menuTimer!==false){
    S.charge=null;S.headset=null;
    island.classList.add('timer-panic');
    setTimeout(()=>island.classList.remove('timer-panic'),5000);
    go('timer');
    bridge.forceShow(true);
    if(!S.settings.quiet)playChargeChime('low');
  }
  renderFeatures();
  if (changed && typeof layout === 'function') layout();
});

let currentFgApp = '';
let currentFgTitle = '';
let currentFgIsGame = false;
let codexAnswering = { active: false, status: '', detail: '' };
let antigravityAnswering = { active: false, status: '', detail: '' };
let claudeAnswering = { active: false, status: '', detail: '' };
let chatgptAnswering = { active: false, status: '', detail: '' };
let lastCreativeNotice = '';

const workMeasure = document.createElement('canvas').getContext('2d');
function workDetailParts(value) {
  const match = String(value || '').match(/^(.*?)(?:\s*·\s*(\d{1,5}\s+lines?))?$/i);
  return { main: match?.[1] || '', metric: match?.[2] || '' };
}
function measuredWorkWidth(detail, status) {
  const {main,metric}=workDetailParts(detail);
  if (!workMeasure) return clamp(128 + main.length * 4, 128, 392);
  workMeasure.font='300 8px Inter';
  const top=workMeasure.measureText(main).width;
  workMeasure.font='400 8px Inter';
  const count=metric ? workMeasure.measureText(metric).width + 4 : 0;
  workMeasure.font='550 11px Inter';
  const bottom=workMeasure.measureText(status).width + 22;
  return clamp(Math.ceil(Math.max(top+count,bottom)+26),128,392);
}

function refreshAiWorkActivity() {
  const identity = `${currentFgApp} ${currentFgTitle}`;
  const workApp = currentFgIsGame ? '' : /antigravity/i.test(identity) ? 'Antigravity' : /\bclaude\b/i.test(identity) ? 'Claude' : /\bcodex\b/i.test(identity) ? 'Codex' : currentFgApp === 'chatgpt' ? 'ChatGPT' : '';
  const titleStatus = /\b(coding|writing code|editing files)\b/i.test(currentFgTitle) ? 'Coding' : /\b(reading|indexing|scanning|opening)\b/i.test(currentFgTitle) ? 'Reading' : /\b(testing|running tests)\b/i.test(currentFgTitle) ? 'Testing' : /\b(thinking|computing|processing|generating|analyzing|running|building)\b/i.test(currentFgTitle) ? 'Computing' : /\bworking\b/i.test(currentFgTitle) ? 'Working' : '';
  const appState = workApp === 'Codex' ? codexAnswering : workApp === 'Antigravity' ? antigravityAnswering : workApp === 'Claude' ? claudeAnswering : workApp === 'ChatGPT' ? chatgptAnswering : null;
  const active = !!workApp && (!!appState?.active || !!titleStatus);
  const workStatus = appState?.active ? (appState.status || 'Working') : titleStatus;
  const workDetail = appState?.active ? appState.detail : workApp;
  const nextActivity = active ? { app: workApp, status: workStatus, detail: workDetail } : null;
  const previous = S.workActivity;
  if (previous?.app !== nextActivity?.app || previous?.status !== nextActivity?.status || previous?.detail !== nextActivity?.detail) {
    S.workActivity = nextActivity;
    if (nextActivity) {
      setText('work-title', workStatus);
      const detail=workDetailParts(workDetail || workApp);
      setText('work-detail-main',detail.main);
      setText('work-detail-metric',detail.metric);
      S.workWidth=measuredWorkWidth(workDetail || workApp,workStatus);
      const phase = /coding|writing code/i.test(workStatus) ? 'coding' : /reading/i.test(workStatus) ? 'reading' : /test/i.test(workStatus) ? 'testing' : /build/i.test(workStatus) ? 'building' : /think|comput/i.test(workStatus) ? 'thinking' : /reply|writ/i.test(workStatus) ? 'replying' : 'working';
      $('.work-pixels').dataset.phase = phase;
      $('.work-pixels').dataset.motion = {reading:'line-v',thinking:'spin',coding:'line-h',testing:'rubik',building:'orbit',replying:'random',working:'scan'}[phase];
    }
    layout();
  }
}
bridge.onCodexActivity?.((state) => { codexAnswering = state && typeof state === 'object' ? state : { active: false, status: '', detail: '' }; refreshAiWorkActivity(); });
bridge.onAntigravityActivity?.((state) => { antigravityAnswering = state && typeof state === 'object' ? state : { active: false, status: '', detail: '' }; refreshAiWorkActivity(); });
bridge.onClaudeActivity?.((state) => { claudeAnswering = state && typeof state === 'object' ? state : { active: false, status: '', detail: '' }; refreshAiWorkActivity(); });
bridge.onChatgptActivity?.((state) => { chatgptAnswering = state && typeof state === 'object' ? state : { active: false, status: '', detail: '' }; refreshAiWorkActivity(); });
bridge.onFgApp?.((data) => {
  currentFgApp = String(data?.app || '').toLowerCase();
  const title=String(data?.title||'');
  currentFgTitle = title;
  currentFgIsGame = !!data?.isGame;
  refreshAiWorkActivity();
  const blender=currentFgApp==='blender' && /render|frame/i.test(title);
  const photoshop=currentFgApp==='photoshop' && /export|saving|save progress/i.test(title);
  if((blender||photoshop) && !S.settings.quiet){
    const pct=title.match(/\b(\d{1,3})\s*%/);
    const label=(blender?'Blender render':'Photoshop export')+(pct?` · ${Math.min(100,Number(pct[1]))}%`:' in progress');
    if(label!==lastCreativeNotice){lastCreativeNotice=label;notice('bell',label,3200);}
  } else lastCreativeNotice='';
});
