'use strict';
/* ===== SISTEM: jam idle, maskot mata, notifikasi baterai/jaringan, setting ===== */
function addGoldBurst(eyes) {
  if (!eyes || eyes.querySelector('.gold-burst')) return;
  const burst = document.createElement('span');
  burst.className = 'gold-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let n = 0; n < 16; n++) burst.append(document.createElement('b'));
  eyes.append(burst);
}
function applyIslandLanguage() {
  const id = isId();
  const locale=S.settings.language||'en';
  document.documentElement.lang = locale;
  const extra={fr:{birthday:'Joyeux anniversaire !',brightness:'Luminosité',stash:'Stockage',stashSub:'Déposez des fichiers ici • Retirez-les à tout moment',clear:'Tout effacer',addons:'Ajouter des fonctions',todo:'Liste de tâches',notes:'Notes',newNote:'Nouvelle note',prayer:'Heures de prière',water:'Boire de l’eau',reminder:'Rappel de tâche'},es:{birthday:'¡Feliz cumpleaños!',brightness:'Brillo',stash:'Archivos',stashSub:'Suelta archivos aquí • Retíralos cuando quieras',clear:'Borrar todo',addons:'Añadir funciones',todo:'Lista de tareas',notes:'Notas',newNote:'Nueva nota',prayer:'Horario de oración',water:'Beber agua',reminder:'Recordatorio'},'zh-CN':{birthday:'生日快乐！',brightness:'亮度',stash:'文件暂存',stashSub:'将文件拖到此处 • 随时取出',clear:'全部清除',addons:'添加功能',todo:'待办事项',notes:'笔记',newNote:'新建笔记',prayer:'礼拜时间',water:'喝水提醒',reminder:'待办提醒'},ko:{birthday:'생일 축하합니다!',brightness:'밝기',stash:'파일 보관함',stashSub:'파일을 여기에 놓기 • 언제든 꺼내기',clear:'모두 지우기',addons:'기능 추가',todo:'할 일 목록',notes:'메모',newNote:'새 메모',prayer:'기도 시간',water:'물 마시기',reminder:'할 일 알림'}}[locale];
  const setNodeText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  setNodeText('#birthday-celebration strong', id ? 'Selamat ulang tahun!' : 'Happy birthday!');
  setNodeText('#slider-brightness .slider-label', id ? 'Kecerahan' : 'Brightness');
  setNodeText('#slider-volume .slider-label', 'Volume');
  setNodeText('#v-stash .stash-title', id ? 'Simpan File' : 'Stash');
  setNodeText('#v-stash .stash-sub', id ? 'Tarik file ke sini • Keluarkan kapan saja' : 'Drop files here • Drag out anytime');
  setNodeText('#s-clear', id ? 'Hapus semua' : 'Clear all');
  setNodeText('#v-addons .addon-head span', id ? 'Tambah fitur' : 'Add features');
  setNodeText('#v-todo .todo-heading-text', id ? 'Daftar Tugas' : 'To-do list');
  const notesHead = $('#v-notes .addon-head > span');
  if (notesHead) notesHead.textContent = id ? 'Catatan' : 'Notes';
  const noteNew = $('#v-notes .note-new');
  if (noteNew) { noteNew.innerHTML = `<span data-ico="plus" aria-hidden="true"></span>${id ? 'Catatan baru' : 'New note'}`; setIco(noteNew); }
  setNodeText('#prayer-head-title', id ? 'Jadwal Sholat' : 'Prayer Times');
  setNodeText('#v-water .addon-head span', id ? 'Pengingat Minum' : 'Drink Water');
  setNodeText('#v-tasknotice .task-notice-copy span', id ? 'Pengingat tugas' : 'To-do reminder');
  const connSec = $('#connection-secret');
  if (connSec) connSec.placeholder = id ? 'Kata sandi jaringan' : 'Network password';
  setNodeText('#connection-password button[type="submit"]', id ? 'Gabung' : 'Join');
  if(extra){setNodeText('#birthday-celebration strong',extra.birthday);setNodeText('#slider-brightness .slider-label',extra.brightness);setNodeText('#v-stash .stash-title',extra.stash);setNodeText('#v-stash .stash-sub',extra.stashSub);setNodeText('#s-clear',extra.clear);setNodeText('#v-addons .addon-head span',extra.addons);setNodeText('#v-todo .todo-heading-text',extra.todo);setNodeText('#v-notes .addon-head > span',extra.notes);if(noteNew){noteNew.innerHTML=`<span data-ico="plus" aria-hidden="true"></span>${extra.newNote}`;setIco(noteNew);}setNodeText('#prayer-head-title',extra.prayer);setNodeText('#v-water .addon-head span',extra.water);setNodeText('#v-tasknotice .task-notice-copy span',extra.reminder);}
  if (typeof syncConnectivityButtons === 'function') syncConnectivityButtons();
  if (typeof renderConnection === 'function' && !$('#v-connectivity')?.hidden) renderConnection();
  if (typeof addonRenderKey !== 'undefined') addonRenderKey = '';
  renderAll();
}
addGoldBurst(document.getElementById('eyes'));
bridge.onSettings((s) => {
  const previousExp = S.settings.staticExp;
  const previousMode = S.settings.eyeMode;
  S.settings = { ...S.settings, ...s };
  document.documentElement.dataset.platform=s._platform||'win32';
  applyIslandTransparency(); applyIslandLanguage();
  if (('albumColors' in s || 'movieMusic' in s) && typeof updateMediaAppUI === 'function') updateMediaAppUI();
  updateIdleInfoDisplay();
  if ('idleInfoIntervalSec' in s || 'idleInfoDurationSec' in s || 'idleInfoItems' in s || 'idleInfoSides' in s || 'idleInfoAlwaysOn' in s) configureIdleInfoScheduler();
  if (s.theme) { island.dataset.theme = s.theme; window.GrumpGlassNotch?.sync(); }
  if (s.angryVariant) island.dataset.angryVariant = s.angryVariant;
  // Grump Eyes (the glow eyes) is one of the reaction styles; every other style keeps the classic eyes.
  if (s.angryVariant || !island.dataset.eyeStyle) island.dataset.eyeStyle = (s.angryVariant || island.dataset.angryVariant) === 'grump-eyes' ? 'sprite' : 'classic';
  if ('rageShake' in s) island.dataset.rage = s.rageShake !== false ? '1' : '0';
  if (s.dockMode) island.dataset.dock = s.dockMode;
  if (s.eyeMode === 'auto') { tempExp = null; }
  if (s.staticExp && s.eyeMode !== 'static' && (s.staticExp !== previousExp || s.eyeMode !== previousMode)) {
    setTempExp(s.staticExp, s.staticExp === 'lol' ? 1800 : 6000);
  }
  if (typeof syncSettingsUI === 'function') syncSettingsUI();
  if (S.expanded && !pageList().includes(PAGE_OF[S.view])) S.view = pageList().includes('notifications') ? 'notifications' : 'home';
  if (s.quiet) { S.inAngryRadius = false; tempExp = null; }
  if (s.batteryToast === false || s.quiet) { S.charge=null; clearTimeout(chargeT); }
  if (s.headsetToast === false || s.quiet) { S.headset=null; clearTimeout(headsetT); }
  paintIsland();
  layout();
  kick();
});

let glancePreview=null,glancePreviewPreviousActive=false;
bridge.onGlancePreview?.((value) => {
  if(value){
    if(!glancePreview)glancePreviewPreviousActive=!!S.idleInfoActive;
    glancePreview=value;
    S.glancePreviewActive=true;
    S.idleInfoActive=true;
    clearTimeout(idleInfoHideTimer);
    updateIdleInfoDisplay(false);
  }else{
    glancePreview=null;
    S.glancePreviewActive=false;
    S.idleInfoActive=glancePreviewPreviousActive;
    updateIdleInfoDisplay(false);
  }
  layout();
  syncIdleInfoEyes();
});

bridge.onGameMode?.((on) => {
  S.gameMode = !!on;
  if (on) {
    S.inAngryRadius = false;
    tempExp = null;
  } else {
    if (typeof resetDodgeState === 'function') resetDodgeState();
  }
  layout();
});

/* ---------- Home + idle (Mata Ikut Kursor + Ekspresi Emosi) ---------- */
let eyeExpMode = 'auto';
let tempExp = null;
let tempExpUntil = 0;
S.inAngryRadius = false;
let autoExpIdx = 0;
// Saat kursor jauh, mata tidak marah (normal, senang, flirty wink, ketawa, sedih)
const AUTO_EXPS = ['normal', 'happy', 'flirty', 'laugh', 'normal', 'sad', 'lol'];
for(const eye of $$('#eyes > i')){
  const grid=document.createElement('span');grid.className='gpt-eye-grid';grid.dataset.motion='scan';
  for(let n=0;n<9;n++)grid.append(document.createElement('b'));
  eye.append(grid);
}
const GPT_EYE_MOTIONS=['scan','line-h','rubik','line-v','random','orbit'];
let lastCursorMoveAt = Date.now();
let prevDx = 0, lastDir = 0, shakeFlips = 0, shakeResetT = 0;
let tempExpT = null;
let eyeRejoinT = null;

function easeEyeTrackingReturn(fromExp) {
  if (curKey !== 'idle' || !['happy','laugh'].includes(fromExp) || S.inAngryRadius) return;
  const eyeNodes = [...$('#eyes').children];
  const previous = eyeNodes.map(el => getComputedStyle(el).transform);
  tempExp = null;
  renderIdle();
  if ($('#v-idle').dataset.exp === fromExp) return;
  clearTimeout(eyeRejoinT);
  island.classList.add('eye-rejoin');
  eyeNodes.forEach((el,i) => {
    el.style.animation = 'none';
    el.style.transition = 'none';
    el.style.transform = previous[i] === 'none' ? 'translateY(0)' : previous[i];
    void el.offsetWidth;
  });
  requestAnimationFrame(() => eyeNodes.forEach(el => {
    el.style.transition = 'transform .48s cubic-bezier(.22,1,.36,1), width .42s ease, height .42s ease, border-radius .42s ease';
    el.style.transform = 'none';
  }));
  eyeRejoinT = setTimeout(() => {
    eyeNodes.forEach(el => { el.style.removeProperty('animation'); el.style.removeProperty('transition'); el.style.removeProperty('transform'); });
    island.classList.remove('eye-rejoin');
  }, 520);
}

function setTempExp(exp, ms = 3600) {
  tempExp = exp;
  tempExpUntil = Date.now() + ms;
  clearTimeout(tempExpT);
  tempExpT = setTimeout(() => {
    if (tempExp === exp) {
      if (curKey === 'idle' && ['happy','laugh'].includes(exp)) easeEyeTrackingReturn(exp);
      else { tempExp = null; if (curKey === 'idle') renderIdle(); }
    }
  }, ms);
  if (curKey === 'idle') renderIdle();
}

function currentEyeExp(idleFor) {
  if (S.settings.quiet || S.gameMode) return 'normal';
  if (S.petUntil && Date.now() < S.petUntil) return 'happy';
  if (S.inAngryRadius) return 'angry';
  if (tempExp && Date.now() < tempExpUntil) return tempExp;
  if (S.settings && S.settings.eyeMode === 'static') return S.settings.staticExp || 'normal';
  if (eyeExpMode !== 'auto') return eyeExpMode;
  if (Date.now() - lastCursorMoveAt > 180000 && idleFor > 180000) return 'sleep';
  if (typeof isPlaying === 'function' && isPlaying()) {
    return AUTO_EXPS[autoExpIdx % 3];
  }
  return AUTO_EXPS[autoExpIdx % AUTO_EXPS.length];
}

acts.cycleyes = () => {
  autoExpIdx = (autoExpIdx + 1) % AUTO_EXPS.length;
  setTempExp(AUTO_EXPS[autoExpIdx], 5000);
  if (typeof notice === 'function') {
    const names = { normal: 'Normal 👀', happy: 'Happy 😊', flirty: 'Flirty 😉', laugh: 'Laugh 😆', sad: 'Sad 😢', lol: 'LOL 🤣', rage: 'Rage 😤' };
    notice('gear', names[AUTO_EXPS[autoExpIdx]] || 'Mood Changed', 1800);
  }
};

function renderHome() {
  const d = new Date();
  setText('h-time', `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  setText('h-date', d.toLocaleDateString(isId() ? 'id-ID' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
  if (typeof syncSliderMarkers === 'function') syncSliderMarkers();
}
renderers.push(renderHome);

function renderIdle() {
  const el = $('#v-idle');
  const d = new Date();
  setText('i-clock', `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  const idleFor = Date.now() - S.activityAt;
  const eyes = S.settings.mascot !== false;
  el.dataset.mode = eyes ? 'eyes' : 'clock';
  const exp = eyes ? currentEyeExp(idleFor) : 'normal';
  el.dataset.exp = exp;
  const automaticExpression = eyes && exp !== 'angry' && exp !== 'sleep' &&
    S.settings.eyeMode !== 'static' && eyeExpMode === 'auto' &&
    !(tempExp && Date.now() < tempExpUntil) && !(S.petUntil && Date.now() < S.petUntil);
  el.dataset.autoMotion = automaticExpression ? '1' : '0';
  if(exp==='angry' && S.settings.angryVariant==='gpt-pixels'){
    const phase=Math.floor(Date.now()/2400)%GPT_EYE_MOTIONS.length;
    $$('#eyes > i .gpt-eye-grid').forEach((grid,index)=>{
      const motion=GPT_EYE_MOTIONS[(phase+index*2)%GPT_EYE_MOTIONS.length];
      if(grid.dataset.motion!==motion)grid.dataset.motion=motion;
    });
  }
  el.classList.toggle('sleep', exp === 'sleep');
  const angry = (curKey === 'idle' && eyes && exp === 'angry') ? '1' : '0';
  if (island.dataset.angry !== angry) {
    island.dataset.angry = angry;
    paintIsland();
  }
  checkSakuraAnimation();

  if (typeof isTimerActive === 'function' && isTimerActive()) {
    el.dataset.timer = '1';
  } else {
    el.dataset.timer = '0';
  }
}
renderers.push(renderIdle);
ticks.push(() => {
  if (curKey === 'idle') renderIdle();
  else {
    if (island.dataset.angry !== '0') { island.dataset.angry = '0'; paintIsland(); }
    if (curKey === 'home') renderHome();
  }
  checkSakuraAnimation();
});

/* ---------- Sakura Flower Petal Particle Engine (Pink Angry Mode) ---------- */
let sakuraTimer = null;
const SAKURA_FLOWER_SVG = `<svg viewBox="0 0 24 24"><g fill="url(#sakuraGrad)" opacity="0.95"><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2" fill="#fff5f8"/></svg>`;
const SAKURA_PETAL_SVG = `<svg viewBox="0 0 16 16"><path d="M8 1.5 C5.5 1.5 3.5 4 3.5 7 C3.5 10.8 7.5 14 8 14.5 C8.5 14 12.5 10.8 12.5 7 C12.5 4 10.5 1.5 8 1.5 Z" fill="url(#sakuraGrad)" opacity="0.92"/></svg>`;

function spawnSakuraParticle() {
  const container = $('#sakura-container');
  const isIdleEyes = curKey === 'idle' && !S.expanded;
  const isPink = island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink');
  const isAngry = island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry');
  if (!container || !isIdleEyes || !isPink || !isAngry || (S.settings && S.settings.quiet) || S.gameMode) return;

  if (container.children.length > 18) return;

  const el = document.createElement('div');
  el.className = 'sakura-p';
  const isFlower = Math.random() > 0.45;
  el.innerHTML = isFlower ? SAKURA_FLOWER_SVG : SAKURA_PETAL_SVG;

  const startX = 8 + Math.random() * 84;
  const startY = 32 + Math.random() * 62;
  const size = isFlower ? (13 + Math.random() * 9) : (10 + Math.random() * 7);
  const rotStart = Math.random() * 360;
  const driftX = (Math.random() - 0.5) * 36;
  const driftY = -(18 + Math.random() * 28);
  const duration = 1.3 + Math.random() * 0.9;

  el.style.left = `${startX.toFixed(1)}%`;
  el.style.top = `${startY.toFixed(1)}%`;
  el.style.width = `${size.toFixed(1)}px`;
  el.style.height = `${size.toFixed(1)}px`;
  el.style.setProperty('--rot-start', `${rotStart.toFixed(0)}deg`);
  el.style.setProperty('--drift-x', `${driftX.toFixed(1)}px`);
  el.style.setProperty('--drift-y', `${driftY.toFixed(1)}px`);
  el.style.animation = `petalFloatFade ${duration.toFixed(2)}s cubic-bezier(.2,.8,.4,1) forwards`;

  el.addEventListener('animationend', () => el.remove());
  container.appendChild(el);
}

function checkSakuraAnimation() {
  const isIdleEyes = curKey === 'idle' && !S.expanded;
  const isPink = island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink');
  const isAngry = island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry');
  const isPinkAngry = isIdleEyes && isPink && isAngry && !(S.settings && S.settings.quiet) && !S.gameMode;
  if (isPinkAngry && !sakuraTimer) {
    sakuraTimer = setInterval(spawnSakuraParticle, 190);
    spawnSakuraParticle();
    spawnSakuraParticle();
  } else if (!isPinkAngry && sakuraTimer) {
    clearInterval(sakuraTimer);
    sakuraTimer = null;
    const container = $('#sakura-container');
    if (container) {
      if (!isIdleEyes) {
        container.innerHTML = '';
      } else {
        setTimeout(() => {
          const stillPink = (curKey === 'idle' && !S.expanded) &&
                            (island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink')) &&
                            (island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry'));
          if (!stillPink) container.innerHTML = '';
        }, 1200);
      }
    }
  }
}

// Siklus ekspresi organik saat kursor jauh (senang, ketawa, sedih, normal — tanpa marah)
function advanceAutoExpression() {
  if (!S.settings.quiet && $('#v-idle').dataset.mode === 'eyes' && curKey === 'idle' && !S.inAngryRadius && S.settings.eyeMode !== 'static') {
    autoExpIdx = (autoExpIdx + 1) % AUTO_EXPS.length;
    renderIdle();
  }
  setTimeout(advanceAutoExpression, AUTO_EXPS[autoExpIdx] === 'lol' ? 1800 : 4500);
}
setTimeout(advanceAutoExpression, 4500);

function scheduleIdleBlink() {
  const delay = 3400 + Math.round(Math.random() * 1800);
  setTimeout(() => {
    const eyes = $('#eyes');
    if (eyes && curKey === 'idle' && $('#v-idle').dataset.exp === 'normal') {
      eyes.classList.add('blink');
      setTimeout(() => eyes.classList.remove('blink'), 105);
    }
    scheduleIdleBlink();
  }, delay);
}
scheduleIdleBlink();

// Mata mengikuti kursor secara real-time di seluruh layar
let lastDx = 0, lastDy = 100;
const CREATIVE_WARNINGS = ["DON'T TOUCH ME!", 'JUST GET UR WORK DONE!'];
let creativeWarningCycle = 0;

function setCreativeProximity(active) {
  const next = !!active;
  if (S.creativeNear === next) return;
  S.creativeNear = next;
  if (next) S.idleInfoActive = false;
  island.dataset.creativeWarning = next ? '1' : '0';
  const warning = $('#creative-warning');
  if (warning) {
    warning.textContent = next ? CREATIVE_WARNINGS[creativeWarningCycle++ % CREATIVE_WARNINGS.length] : '';
  }
  layout();
}

function setCreativeAppState(active) {
  S.creativeApp = !!active;
  if (!S.creativeApp) setCreativeProximity(false);
}

/* Eye tracking. The pointer arrives about 60 times a second as a target; the eyes follow it with a critically damped glide that is
   advanced once per frame (so they never jump from one pointer sample to the next), drawn with the compositor-only `translate`, and
   smeared along the direction of travel while they move fast (a motion blur: an SVG blur whose width follows the speed). */
const eyeGlide = { x: 0, y: 0, gx: 0, gy: 0, vx: 0, vy: 0, last: 0, raf: 0, blur: 0, snap: true };
const EYE_RESPONSE = 0.055;   // seconds for the glide to cover most of the distance
const EYE_BLUR_PER_PX = 0.009; // blur (px) per px/s of speed
function eyeGlideStep(ts) {
  eyeGlide.raf = 0;
  const eyes = document.getElementById('eyes');
  if (!eyes) return;
  const dt = Math.max(0.001, Math.min(0.05, (ts - (eyeGlide.last || ts - 16.7)) / 1000));
  eyeGlide.last = ts;
  // exact solution of a critically damped spring over dt (stable for any frame time)
  const w = 1 / EYE_RESPONSE, e = Math.exp(-w * dt);
  const step = (pos, goal, vel) => {
    const d = pos - goal, tmp = (vel + w * d) * dt;
    return [goal + (d + tmp) * e, (vel - w * tmp) * e];
  };
  const [nx, nvx] = step(eyeGlide.x, eyeGlide.gx, eyeGlide.vx);
  const [ny, nvy] = step(eyeGlide.y, eyeGlide.gy, eyeGlide.vy);
  eyeGlide.x = nx; eyeGlide.y = ny; eyeGlide.vx = nvx; eyeGlide.vy = nvy;
  const resting = Math.abs(eyeGlide.gx - nx) < 0.04 && Math.abs(eyeGlide.gy - ny) < 0.04 && Math.abs(nvx) < 1 && Math.abs(nvy) < 1;
  if (resting) { eyeGlide.x = eyeGlide.gx; eyeGlide.y = eyeGlide.gy; eyeGlide.vx = eyeGlide.vy = 0; }
  eyes.style.setProperty('--look-x', eyeGlide.x.toFixed(2) + 'px');
  eyes.style.setProperty('--look-y', eyeGlide.y.toFixed(2) + 'px');
  const sprite = eyeGlide.sprite || (eyeGlide.sprite = document.getElementById('sprite-eyes'));
  if (sprite) { sprite.style.setProperty('--look-x', eyeGlide.x.toFixed(2) + 'px'); sprite.style.setProperty('--look-y', eyeGlide.y.toFixed(2) + 'px'); }
  // motion blur: only while it is visible, and only the SVG filter's own attribute changes
  const bx = resting ? 0 : Math.min(1.9, Math.abs(eyeGlide.vx) * EYE_BLUR_PER_PX);
  const by = resting ? 0 : Math.min(1.2, Math.abs(eyeGlide.vy) * EYE_BLUR_PER_PX * 0.6);
  const blur = bx > 0.2 || by > 0.2;
  if (blur) {
    const node = eyeGlide.node || (eyeGlide.node = document.getElementById('eye-motion-blur'));
    if (node) node.setAttribute('stdDeviation', bx.toFixed(2) + ' ' + by.toFixed(2));
    if (!eyeGlide.blur) { eyes.style.filter = 'url(#eye-motion)'; eyeGlide.blur = 1; }
  } else if (eyeGlide.blur) { eyes.style.filter = ''; eyeGlide.blur = 0; }
  if (!resting) eyeGlide.raf = requestAnimationFrame(eyeGlideStep);
  else eyeGlide.last = 0;
}
function eyeGlideTo(x, y, immediate) {
  eyeGlide.gx = x; eyeGlide.gy = y;
  if (immediate || eyeGlide.snap) { eyeGlide.x = x; eyeGlide.y = y; eyeGlide.vx = eyeGlide.vy = 0; eyeGlide.snap = false; }
  if (!eyeGlide.raf) eyeGlide.raf = requestAnimationFrame(eyeGlideStep);
}
// island size, the timer and the glance texts only change now and then: measured at most 4 times a second
const eyeMeasure = { at: 0, w: 128, h: 32, timerRight: null, weatherRight: null, timeLeft: null, infoVisible: false };
function eyeMeasureNow() {
  const nowMs = performance.now();
  if (nowMs - eyeMeasure.at < 250) return eyeMeasure;
  eyeMeasure.at = nowMs;
  eyeMeasure.w = island.clientWidth || 128;
  eyeMeasure.h = island.clientHeight || 32;
  const islandRect = island.getBoundingClientRect();
  const timerEl = $('#idle-timer');
  eyeMeasure.timerRight = ($('#v-idle').dataset.timer === '1' && timerEl && timerEl.style.display !== 'none') ? timerEl.getBoundingClientRect().right - islandRect.left : null;
  const timeInfo = $('#idle-time'), weatherInfo = $('#idle-weather');
  eyeMeasure.infoVisible = island.dataset.idleInfo === '1' || (timeInfo && getComputedStyle(timeInfo).visibility === 'visible');
  eyeMeasure.weatherRight = eyeMeasure.infoVisible && weatherInfo && getComputedStyle(weatherInfo).display !== 'none' ? weatherInfo.getBoundingClientRect().right - islandRect.left : null;
  eyeMeasure.timeLeft = eyeMeasure.infoVisible && timeInfo && getComputedStyle(timeInfo).display !== 'none' ? timeInfo.getBoundingClientRect().left - islandRect.left : null;
  return eyeMeasure;
}

function updateEyeLook(dx, dy, rawX, rawY) {
  if (S.settings.quiet || S.gameMode) {
    S.inAngryRadius = false;
    setCreativeProximity(false);
    window.spriteEyes?.rest(); eyeGlideTo(0, 0, true); $('#eyes').style.setProperty('--look-x','0px'); $('#eyes').style.setProperty('--look-y','0px');
    $('#eyes').style.setProperty('--eye-scale','1');
    return;
  }
  lastDx = dx; lastDy = dy;
  lastCursorMoveAt = Date.now();

  // Mode tuck / peekaboo: mata notch di atas layar mengikuti posisi kursor secara real-time
  if (curKey === 'tuck' || curKey === 'peekaboo') {
    const pk = $('#pk-eyes');
    if (pk) {
      const pkLx = clamp(dx / 40, -6.5, 6.5);
      const pkLy = clamp(dy / 180, -0.8, 1.2);
      pk.style.setProperty('--pk-look-x', `${pkLx.toFixed(1)}px`);
      pk.style.setProperty('--pk-look-y', `${pkLy.toFixed(1)}px`);
      const pkSprite = document.getElementById('pk-sprite');
      // the glow eyes are 42 px in a 56 px pill: they may slide 3 px, or the far eye is cut by the pill's edge
      if (pkSprite) { pkSprite.style.setProperty('--pk-look-x', `${clamp(pkLx, -3, 3).toFixed(1)}px`); pkSprite.style.setProperty('--pk-look-y', `${(pkLy + 1).toFixed(1)}px`); }
      window.spriteEyes?.look(dx, dy, false);
    }
    return;
  }

  const edgeDist = Math.hypot(Math.max(0, Math.abs(dx) - 62), Math.max(0, Math.abs(dy) - 18));
  const wasAngry = S.inAngryRadius;
  S.inAngryRadius = edgeDist < (Number(S.settings.angryRadius) || 145);
  setCreativeProximity(S.creativeApp && S.inAngryRadius && curKey === 'idle' && !S.expanded);

  if (S.inAngryRadius) {
    tempExp = null;
    tempExpUntil = 0;
    clearTimeout(tempExpT);
  }

  if (curKey !== 'idle') return;
  const eyesEl = $('#eyes');
  if (!eyesEl) return;
  const dist = Math.hypot(dx, dy);
  const isAngry = S.inAngryRadius || eyeExpMode === 'angry';
  const variant = (S.settings && S.settings.angryVariant) || island.dataset.angryVariant || 'classic';

  // Saat marah (kursor di dalam radius), mata mepet brutal sampai pojok/margin pulau mengarah tepat ke kursor!
  let lx, ly, sc;
  if (isAngry) {
    const nx = clamp(dx / 64, -1, 1);
    const ny = clamp(dy / 22, -1, 1);
    lx = nx * 55;
    ly = ny * 10.5;
    sc = 1.18;
  } else {
    lx = clamp(dx / 22, -32, 32);
    ly = clamp(dy / 36, -7.5, 8);
    sc = dist < 220 ? (1 + (1 - dist / 220) * 0.15) : 1;
  }
  const sensitivity = Number(S.settings.sensitivity) || 1;
  // Let the eyes glance hard toward the edge, while keeping both eyes clear
  // of the curved corner when the cursor is also above or below the island.
  const measured = eyeMeasureNow();
  const islandWidth = measured.w;
  const islandHeight = measured.h;
  const edgeEyeSize = isAngry ? 1 - 0.4 * Math.min(1, Math.abs(lx * sensitivity) / 55) : 1;
  eyesEl.style.setProperty('--left-eye-size', (isAngry && lx < 0 ? edgeEyeSize : 1).toFixed(3));
  eyesEl.style.setProperty('--right-eye-size', (isAngry && lx > 0 ? edgeEyeSize : 1).toFixed(3));
  const goldEyes = isAngry && variant === 'gold-matrix';
  const dragonEyes = isAngry && variant === 'dragon';
  const crimsonEyes = isAngry && variant === 'crimson-orbit';
  const pixelEyes=isAngry&&variant==='gpt-pixels';
  const classicPairWidth = isAngry ? (dragonEyes ? 53 : crimsonEyes ? 50 : pixelEyes ? 36 : goldEyes ? 35 : 28) - (dragonEyes ? 23 : crimsonEyes ? 22 : pixelEyes ? 14 : goldEyes ? 13 : 10.5) * (1 - edgeEyeSize) : 25;
  const classicEyeHeight = isAngry ? (dragonEyes ? 17 : crimsonEyes ? 15 : goldEyes ? 18 : pixelEyes ? 14 : 15) : 12;
  const spriteOn = !!window.spriteEyes && window.spriteEyes.active();
  const eyePairWidth = spriteOn ? window.spriteEyes.pairWidth : classicPairWidth;
  const eyeHeight = spriteOn ? window.spriteEyes.eyeHeight : classicEyeHeight;
  const maxY = Math.max(0, islandHeight / 2 - eyeHeight * sc / 2 - 3);
  const edgeMargin = isAngry ? 3 : 8;
  const maxX = Math.max(0, islandWidth / 2 - eyePairWidth * sc / 2 - edgeMargin);
  let minX = -maxX;
  let maxAllowedX = maxX;
  if (measured.timerRight !== null) {
    const timerRight = measured.timerRight;
    const timerClearance = 7;
    minX = Math.min(maxX, timerRight + timerClearance + eyePairWidth * sc / 2 - islandWidth / 2);
  }
  if (measured.infoVisible) {
    const halfPair = eyePairWidth * sc / 2;
    const clearance = 5;
    if (measured.weatherRight !== null) {
      minX = Math.max(minX, measured.weatherRight + clearance + halfPair - islandWidth / 2);
    }
    if (measured.timeLeft !== null) {
      maxAllowedX = Math.min(maxAllowedX, measured.timeLeft - clearance - halfPair - islandWidth / 2);
    }
    if (minX > maxAllowedX) minX = maxAllowedX = clamp((minX + maxAllowedX) / 2, -maxX, maxX);
  }
  const lookX = clamp(lx * sensitivity, minX, maxAllowedX);
  if (isAngry && variant === 'gold-matrix') {
    const horizontal = clamp(dx / 70, -1, 1);
    const vertical = clamp(dy / 28, -1, 1);
    eyesEl.style.setProperty('--gold-lean', `${(horizontal * 14).toFixed(2)}deg`);
    eyesEl.style.setProperty('--gold-tip-shift', `${(horizontal * 14).toFixed(2)}%`);
    eyesEl.style.setProperty('--gold-flex-x', (1 - Math.abs(horizontal) * .19).toFixed(3));
    eyesEl.style.setProperty('--gold-flex-y', (1.15 + Math.max(0, vertical) * .20).toFixed(3));
  }
  if (isAngry && crimsonEyes) {
    const crimsonX = clamp(dx / 70, -1, 1);
    const crimsonY = clamp(dy / 30, -1, 1);
    eyesEl.style.setProperty('--crimson-pupil-x', `${(crimsonX * 2.2).toFixed(2)}px`);
    eyesEl.style.setProperty('--crimson-pupil-y', `${(crimsonY * 1.8).toFixed(2)}px`);
    eyesEl.style.setProperty('--crimson-iris-x', `${(crimsonX * 1.1).toFixed(2)}px`);
    eyesEl.style.setProperty('--crimson-iris-y', `${(crimsonY * 0.9).toFixed(2)}px`);
  }
  // At the extreme side, pull the pair toward the vertical center of the
  // rounded end rather than clipping the outer eye against its curved rim.
  const sideRatio = Math.min(1, Math.abs(lookX) / Math.max(maxX, 1));
  const verticalRoom = maxY * (isAngry ? 1 - 0.85 * sideRatio ** 3 : 1);
  const lookY = clamp(ly * sensitivity, -verticalRoom, verticalRoom);
  eyeGlideTo(lookX, lookY);
  eyesEl.style.setProperty('--eye-scale', sc.toFixed(3));
  if (spriteOn) { window.spriteEyes.look(dx, dy, isAngry); document.getElementById('sprite-eyes').style.setProperty('--eye-scale', (1 + (sc - 1) * 0.6).toFixed(3)); }

  // Laser Beam reaction style: laser-eyes.js draws it every frame from the eyes' live position.
  if (Number.isFinite(rawX) && Number.isFinite(rawY)) window.laserEyes?.aim(rawX, rawY);
  else window.laserEyes?.sync();

  // Selama di dalam radius -> selalu marah nonstop; begitu keluar radius -> langsung ekspresi flirty (wink)!
  if (S.inAngryRadius !== wasAngry) {
    if (wasAngry && !S.inAngryRadius) {
      setTempExp('flirty', 1800);
    } else {
      renderIdle();
    }
  } else if (S.inAngryRadius && ($('#v-idle').dataset.exp !== 'angry' || $('#v-idle').dataset.mode !== 'eyes' || island.dataset.angry !== '1')) {
    renderIdle();
  }
  if (S.inAngryRadius) return;

  // Deteksi goyangan kursor cepat dari jauh -> mata bereaksi ketawa
  const deltaX = dx - prevDx;
  prevDx = dx;
  if (Math.abs(deltaX) > 28 / sensitivity) {
    const dir = deltaX > 0 ? 1 : -1;
    if (dir !== lastDir) {
      lastDir = dir;
      shakeFlips++;
      clearTimeout(shakeResetT);
      shakeResetT = setTimeout(() => { shakeFlips = 0; }, 550);
      if (shakeFlips >= 6) {
        shakeFlips = 0;
        setTempExp('laugh', 3500);
      }
    }
  }
}
if (bridge.onCursor) bridge.onCursor(updateEyeLook);
if (bridge.onEyeExp) {
  bridge.onEyeExp((exp) => {
    eyeExpMode = exp;
    S.activityAt = Date.now() - 6000; // langsung tampilkan mata untuk preview
    if (S.expanded) collapse(); else renderIdle();
  });
}
enterHooks.tuck = () => updateEyeLook(lastDx, lastDy);
enterHooks.peekaboo = () => updateEyeLook(lastDx, lastDy);

/* ---------- Baterai & Animasi Cas / Unplugged (Putih) / Low Battery (Merah) ---------- */
let batRef = null;

function playChargeChime(state) {
  if (S.settings.quiet || S.settings._primary === false) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime + 0.01;
    const note = (freq, start, dur, peak) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    };
    if (state === 'charging') {
      note(587.33, now, 0.22, 0.14);        // D5
      note(880.00, now + 0.065, 0.30, 0.16); // A5
      note(1174.66, now + 0.12, 0.34, 0.08); // D6 shimmer
    } else if (state === 'low') {
      note(659.25, now, 0.14, 0.15);        // E5
      note(587.33, now + 0.11, 0.14, 0.15); // D5
      note(440.00, now + 0.22, 0.26, 0.18); // A4 low battery alert
    } else {
      note(523.25, now, 0.16, 0.10);
      note(392.00, now + 0.06, 0.20, 0.09);
    }
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch (_) {}
}

function triggerChargeAnim(mode = 'charging', pct = null, ms = 2200) {
  if (S.settings.batteryToast === false || S.settings.quiet) return;
  if (S.ring) return;
  const state = mode === true ? 'charging' : (mode === false ? 'unplugged' : mode);
  if (pct === null) {
    pct = batRef ? Math.round(batRef.level * 100) : (state === 'low' ? 15 : 85);
  }
  const el = $('#v-charge');
  const fill = $('#ch-fill');
  el.dataset.state = state;
  island.dataset.chstate = state;
  setText('ch-label', state === 'charging' ? (isId() ? 'Mengisi Daya' : 'Charging') : (state === 'low' ? (isId() ? 'Baterai Lemah' : 'Low Battery') : (isId() ? 'Daya Dicabut' : 'Unplugged')));
  setText('ch-pct', `${pct}%`);

  // Animasi sepersekian detik: reset bar & wave lalu surge!
  fill.style.transition = 'none';
  const startFrac = state === 'charging' ? '0.08' : (state === 'low' ? '0.45' : clamp(pct / 100, 0.08, 1).toFixed(2));
  fill.style.setProperty('--bat-frac', startFrac);
  el.classList.remove('surge');
  void el.offsetWidth;
  fill.style.transition = '';
  el.classList.add('surge');
  requestAnimationFrame(() => {
    fill.style.setProperty('--bat-frac', clamp(pct / 100, 0.08, 1).toFixed(2));
  });

  playChargeChime(state);
  setTempExp(state === 'charging' ? 'happy' : 'sad', ms + 6000);
  S.charge = { state, pct };
  S.expanded = false;
  S.peek = null;
  clearTimeout(peekT);
  clearTimeout(chargeT);
  layout();
  if (typeof triggerGlassRing === 'function') triggerGlassRing();
  chargeT = setTimeout(() => {
    S.charge = null;
    S.activityAt = Date.now() - 6000;
    layout();
  }, ms);
}

if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    batRef = b;
    let lastLow = Math.round(b.level * 100);
    b.addEventListener('chargingchange', () => {
      const l = Math.round(b.level * 100);
      // Saat charger dicabut -> selalu tampilkan animasi Unplugged warna putih bersih
      triggerChargeAnim(b.charging ? 'charging' : 'unplugged', l, 2200);
      if (!b.charging && l <= 20) {
        setTempExp('sleep', 3000);
        setTimeout(() => {
          if (batRef && !batRef.charging) triggerChargeAnim('low', Math.round(batRef.level * 100), 2800);
        }, 3200);
      }
    });
    b.addEventListener('levelchange', () => {
      const l = Math.round(b.level * 100);
      if (!b.charging && ((l <= 20 && lastLow > 20) || (l <= 15 && lastLow > 15) || (l <= 10 && lastLow > 10) || (l <= 5 && lastLow > 5))) {
        triggerChargeAnim('low', l, 2800);
        setTempExp('sleep', 5000);
      }
      lastLow = l;
    });
  }).catch(() => {});
}
/* ---------- Jaringan ---------- */
window.addEventListener('offline', () => notice('wifioff', 'Offline', 3200));
window.addEventListener('online', () => { const isEth = window.__lastConnectivityState?.wifi?.ethernet === true; notice(isEth ? 'ethernet' : 'wifi', isEth ? (isId() ? 'Online (LAN)' : 'Online (Ethernet)') : 'Online', 2400); });
bridge.onCapsLock?.((on) => {
  if (on && !S.expanded && !S.gameMode) notice('caps', 'Caps Lock On', 1700);
});

/* ---------- Bluetooth Headset Connected (Animasi ala AirPods) ---------- */
function playHeadsetChime() {
  if (S.settings.quiet || S.settings._primary === false) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    if (!ac) return;
    const now = ac.currentTime;

    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const g = ac.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.14); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.14); // A6

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(ac.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
    setTimeout(()=>ac.close().catch(()=>{}),1000);
  } catch (_) {}
}

function triggerHeadsetAnim(info, ms = 3600) {
  if (S.settings.headsetToast === false || S.settings.quiet) return;
  const name = (info && info.name) ? info.name : 'Audio device';
  setText('hs-name', name);
  const connected = info?.connected !== false;
  setText('hs-status-text', info?.transport === 'bluetooth'
    ? (connected ? (isId() ? 'Bluetooth tersambung' : 'Bluetooth connected') : (isId() ? 'Bluetooth terputus' : 'Bluetooth disconnected'))
    : (connected ? (isId() ? 'Kabel tersambung' : 'Wired connected') : (isId() ? 'Kabel terlepas' : 'Wired disconnected')));
  const el = $('#v-headset');
  if (el) {
    el.dataset.transport = info?.transport === 'bluetooth' ? 'bluetooth' : 'wired';
    el.classList.remove('surge');
    void el.offsetWidth;
    el.classList.add('surge');
  }

  if (connected) playHeadsetChime();
  setTempExp(connected ? 'happy' : 'sad', ms + 4000);
  S.headset = { name };
  S.expanded = false;
  S.peek = null;
  clearTimeout(peekT);
  clearTimeout(headsetT);
  layout();
  if (typeof triggerGlassRing === 'function') triggerGlassRing();

  headsetT = setTimeout(() => {
    S.headset = null;
    S.activityAt = Date.now() - 6000;
    layout();
  }, ms);
}

if (bridge.onHeadset) {
  bridge.onHeadset((info) => {
    if (info) {
      triggerHeadsetAnim(info);
    }
  });
}
/* ---------- Grump Glass Controls — Calibrated Markers (Volume & Brightness) ---------- */
const sysState = { volume: 50, brightness: 50 };
const systemSliderSnapPoints = [20, 40, 60, 80, 100];
const systemSliderSnapRadius = 5;
let activeSlider = null;
let sendBriThrottled = null;

function softSnapSystemSlider(next) {
  const nearest = systemSliderSnapPoints.reduce((best, point) => Math.abs(point - next) < Math.abs(best - next) ? point : best);
  const distance = Math.abs(nearest - next);
  if (distance >= systemSliderSnapRadius) return next;
  const influence = 1 - distance / systemSliderSnapRadius;
  return next + (nearest - next) * influence * 0.82;
}

function syncSliderMarkers() {
  document.querySelectorAll('.slider.ios-slider, .ios-slider, .dashboard-glass-slider').forEach(slider => {
    const markers = slider.querySelector('.markers');
    if (!markers) return;
    const w = slider.clientWidth || slider.getBoundingClientRect().width || 320;
    markers.querySelectorAll('.marker').forEach((m) => {
      const val = Number(m.dataset.value);
      if (Number.isFinite(val)) {
        m.style.left = `${w * 0.8 * (val / 100)}px`;
      }
    });
  });
}

function updateSliderUI(kind, val) {
  val = Math.max(0, Math.min(100, Math.round(val)));
  sysState[kind] = val;
  const el = document.querySelector(`#slider-${kind}`);
  const fill = el?.querySelector('.fill') || document.querySelector(`#fill-${kind}`);
  const txt = el?.querySelector('.slider-val') || document.querySelector(`#val-${kind}`);
  const icoWrap = el?.querySelector('.slider-icon') || document.querySelector(`#ico-${kind}`);
  if (fill) fill.style.width = `${val}%`;
  if (txt) txt.textContent = el?.classList.contains('dashboard-glass-slider') ? `${val}` : `${val}%`;
  if (el) el.setAttribute('aria-valuenow', val);

  if (kind === 'volume') {
    let ico = 'volume';
    if (val === 0) ico = 'volume-mute';
    else if (val <= 33) ico = 'volume-low';
    else if (val <= 66) ico = 'volume-med';
    else ico = 'volume';
    if (icoWrap && icoWrap.dataset.currentIco !== ico) {
      icoWrap.dataset.currentIco = ico;
      icoWrap.innerHTML = ICONS[ico] || '';
    }
  } else if (kind === 'brightness') {
    const ico = val <= 40 ? 'brightness-low' : 'brightness';
    if (icoWrap && icoWrap.dataset.currentIco !== ico) {
      icoWrap.dataset.currentIco = ico;
      icoWrap.innerHTML = ICONS[ico] || '';
    }
  }
}

if (bridge.onSysState) {
  bridge.onSysState((s) => {
    if (!s) return;
    devicePowerState = {
      hasBattery: s.hasBattery !== false,
      percent: Number.isFinite(s.batteryPercent) ? clamp(Math.round(s.batteryPercent), 0, 100) : null,
      charging: s.charging === true,
      deviceType: s.deviceType || (s.hasBattery === false ? 'desktop' : 'unknown'),
    };
    if (Number.isFinite(s.volume) && activeSlider !== 'volume') {
      updateSliderUI('volume', s.volume);
    }
    if (Number.isFinite(s.brightness) && activeSlider !== 'brightness') {
      updateSliderUI('brightness', s.brightness);
    }
  });
}

function initIosSliders() {
  const sliders = document.querySelectorAll('.slider.ios-slider, .ios-slider, .dashboard-glass-slider');
  sliders.forEach((slider) => {
    const kind = slider.dataset.slider || slider.dataset.key;
    const markers = slider.querySelector('.markers');

    function layoutMarkers() {
      if (!markers) return;
      const w = slider.clientWidth || slider.getBoundingClientRect().width || 320;
      markers.querySelectorAll('.marker').forEach((m) => {
        const val = Number(m.dataset.value);
        if (Number.isFinite(val)) {
          m.style.left = `${w * 0.8 * (val / 100)}px`;
        }
      });
      updateSliderUI(kind, sysState[kind] ?? 50);
    }

    if (window.ResizeObserver) {
      new ResizeObserver(layoutMarkers).observe(slider);
    }
    requestAnimationFrame(layoutMarkers);

    // Marker click support (instant calibrated snap)
    markers?.querySelectorAll('.marker').forEach((m) => {
      m.style.pointerEvents = 'auto';
      m.style.cursor = 'pointer';
      m.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        const targetVal = Number(m.dataset.value);
        if (Number.isFinite(targetVal)) {
          updateSliderUI(kind, targetVal);
          if (kind === 'volume') bridge.setVolume?.(targetVal);
          else bridge.setBrightness?.(targetVal);
        }
      });
    });

    let drag = null;

    slider.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      activeSlider = kind;
      drag = { x: e.clientX, value: sysState[kind] ?? 50 };
      slider.setPointerCapture(e.pointerId);
      slider.classList.add('dragging');
      bridge.setDragActive?.(true);
      bridge.setMouseActive?.(true);
    });

    slider.addEventListener('pointermove', (e) => {
      if (!drag || !slider.hasPointerCapture(e.pointerId)) return;
      const width = slider.getBoundingClientRect().width || slider.clientWidth || 320;
      const delta = (e.clientX - drag.x) / (width * 0.8) * 100;
      const next = Math.max(0, Math.min(100, Math.round(softSnapSystemSlider(drag.value + delta))));
      updateSliderUI(kind, next);

      if (kind === 'volume') {
        bridge.setVolume?.(next);
      } else if (kind === 'brightness') {
        clearTimeout(sendBriThrottled);
        sendBriThrottled = setTimeout(() => {
          bridge.setBrightness?.(next);
        }, 35);
      }
    });

    const endDrag = () => {
      if (!drag) return;
      const finalVal = sysState[kind] ?? 50;
      if (kind === 'brightness') {
        clearTimeout(sendBriThrottled);
        bridge.setBrightness?.(finalVal);
      } else if (kind === 'volume') {
        bridge.setVolume?.(finalVal);
      }
      drag = null;
      activeSlider = null;
      slider.classList.remove('dragging');
      bridge.setDragActive?.(false);
      bridge.setMouseActive?.(inside || S.expanded || S.focusLock);
    };

    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      slider.addEventListener(ev, endDrag);
    }

    // Keyboard support (ArrowRight, ArrowUp, ArrowLeft, ArrowDown, Home, End)
    slider.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const cur = sysState[kind] ?? 50;
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? 100 : Math.max(0, Math.min(100, cur + (['ArrowRight', 'ArrowUp'].includes(e.key) ? 2 : -2)));
        updateSliderUI(kind, next);
        if (kind === 'volume') bridge.setVolume?.(next);
        else bridge.setBrightness?.(next);
      }
    });

    // Mouse wheel (scroll up = +5%, scroll down = -5%)
    slider.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 5 : -5;
      const cur = sysState[kind] ?? 50;
      const next = Math.max(0, Math.min(100, cur + step));
      updateSliderUI(kind, next);
      if (kind === 'volume') bridge.setVolume?.(next);
      else bridge.setBrightness?.(next);
    }, { passive: false });
  });
}

initIosSliders();

acts.bluetoothsettings=()=>bridge.openConnectivity?.("bluetooth");
acts.wifisettings=()=>bridge.openConnectivity?.("wifi");

function syncConnectivityButtons(state = window.__lastConnectivityState) {
  if (!state) return;
  window.__lastConnectivityState = state;
  const id = isId();
  for (const kind of ['wifi', 'bluetooth']) {
    const button = document.querySelector('[data-act="' + kind + 'settings"]');
    if (!button) continue;
    const info = state[kind] || {};
    const names = Array.isArray(info.names) ? info.names.join(', ') : (typeof info.names === 'string' ? info.names : '');
    if (kind === 'wifi') {
      const isEth = info.ethernet === true;
      const ethNames = Array.isArray(info.ethernetNames) && info.ethernetNames.length ? info.ethernetNames.join(', ') : 'LAN';
      const icoSpan = button.querySelector('[data-ico]');
      const targetIco = isEth ? 'ethernet' : 'wifi';
      if (icoSpan && icoSpan.dataset.ico !== targetIco) {
        icoSpan.dataset.ico = targetIco;
        icoSpan.innerHTML = icoOf(targetIco);
      }
      button.dataset.radioOn = (info.on === true || isEth) ? '1' : '0';
      button.dataset.connected = (isEth || (info.on === true && names)) ? '1' : '0';
      button.dataset.ethernet = isEth ? '1' : '0';
      if (isEth) {
        button.title = (id ? `Tersambung LAN (${ethNames})` : `Ethernet connected (${ethNames})`) + (names ? ` · Wi-Fi: ${names}` : '');
      } else {
        button.title = 'Wi-Fi: ' + (info.on === null ? (id ? 'Status tidak tersedia' : 'Status unavailable') : info.on ? (names || (id ? 'Aktif · belum tersambung' : 'On · not connected')) : (id ? 'Mati' : 'Off'));
      }
    } else {
      button.dataset.radioOn = info.on === true ? '1' : '0';
      button.dataset.connected = (info.on === true && names) ? '1' : '0';
      button.title = 'Bluetooth: ' + (info.on === null ? (id ? 'Status tidak tersedia' : 'Status unavailable') : info.on ? (names || (id ? 'Aktif · belum tersambung' : 'On · not connected')) : (id ? 'Mati' : 'Off'));
    }
    button.setAttribute('aria-label', button.title);
  }
}
bridge.onConnectivity?.(state=>{ syncConnectivityButtons(state); if(typeof renderConnection==='function' && !$('#v-connectivity')?.hidden) renderConnection(); if(false)
 for(const kind of ['wifi','bluetooth']){
  const button=document.querySelector('[data-act="'+kind+'settings"]');if(!button)continue;
  const info=state[kind]||{},name=kind==='wifi'?'Wi-Fi':'Bluetooth';
  button.dataset.radioOn=info.on===true?'1':'0';
  const names=Array.isArray(info.names)?info.names.join(', '):(typeof info.names==='string'?info.names:'');
  button.title=name+': '+(info.on===null?'Status unavailable':info.on?(names||'On · not connected'):'Off');
   button.setAttribute('aria-label',button.title);
 }
});


/* ---------- Custom idle glance rotation ---------- */
let weatherState = { available: false };
bridge.onWeather?.(state => {
  weatherState = state || { available: false };
  updateIdleInfoDisplay();
  renderWeatherPage();
});
const weatherAlertCopy={
  en:{rain:['Rain expected','In about 2 hours'],wind:['Strong winds expected','In about 2 hours'],storm:['Thunderstorm expected','In about 2 hours']},
  id:{rain:['Hujan diperkirakan','Sekitar 2 jam lagi'],wind:['Angin kencang diperkirakan','Sekitar 2 jam lagi'],storm:['Badai petir diperkirakan','Sekitar 2 jam lagi']},
  fr:{rain:['Pluie prévue','Dans environ 2 heures'],wind:['Vents forts prévus','Dans environ 2 heures'],storm:['Orage prévu','Dans environ 2 heures']},
  es:{rain:['Lluvia prevista','En unas 2 horas'],wind:['Vientos fuertes previstos','En unas 2 horas'],storm:['Tormenta prevista','En unas 2 horas']},
  'zh-CN':{rain:['预计有雨','约 2 小时后'],wind:['预计有强风','约 2 小时后'],storm:['预计有雷暴','约 2 小时后']},
  ko:{rain:['비가 예상됩니다','약 2시간 후'],wind:['강풍이 예상됩니다','약 2시간 후'],storm:['뇌우가 예상됩니다','약 2시간 후']}
};
function weatherAlertIcon(condition){
  if(condition==='wind')return '<svg viewBox="0 0 64 50" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path class="wh-gust-line l1" d="M8 17h32a7 7 0 1 0-7-7"/><path class="wh-gust-line l2" d="M8 28h42a8 8 0 1 1-8 8"/><path class="wh-gust-line l3" d="M8 39h20"/></g></svg>';
  return weatherHeroIcon(condition==='storm'?'rainandthunder':'rain');
}
bridge.onWeatherAlert?.(alert=>{
  const copy=weatherAlertCopy[S.settings.language]||weatherAlertCopy.en;
  const message=copy[alert?.condition];
  if(!message)return;
  setText('weather-notice-title',message[0]);
  setText('weather-notice-detail',message[1]);
  const popup=$('#v-weathernotice');if(popup)popup.dataset.condition=alert?.condition||'rain';
  const alertIcon=$('#weather-notice-icon');if(alertIcon)alertIcon.innerHTML=weatherAlertIcon(alert?.condition);
  showMiniPopup('weathernotice',10000);
});
const weatherPageCopy={
  en:{unavailable:'Forecast unavailable',clear:'Clear',cloudy:'Cloudy',partly:'Partly cloudy',rain:'Rain',snow:'Snow',storm:'Thunderstorm',fog:'Fog',today:'Today',rainLabel:'Rain',humidity:'Humidity',wind:'Wind'},
  id:{unavailable:'Prakiraan tidak tersedia',clear:'Cerah',cloudy:'Berawan',partly:'Cerah berawan',rain:'Hujan',snow:'Salju',storm:'Badai petir',fog:'Berkabut',today:'Hari ini',rainLabel:'Hujan',humidity:'Kelembapan',wind:'Angin'},
  fr:{unavailable:'Prévisions indisponibles',clear:'Dégagé',cloudy:'Nuageux',partly:'Partiellement nuageux',rain:'Pluie',snow:'Neige',storm:'Orage',fog:'Brouillard',today:'Auj.',rainLabel:'Pluie',humidity:'Humidité',wind:'Vent'},
  es:{unavailable:'Pronóstico no disponible',clear:'Despejado',cloudy:'Nublado',partly:'Parcialmente nublado',rain:'Lluvia',snow:'Nieve',storm:'Tormenta',fog:'Niebla',today:'Hoy',rainLabel:'Lluvia',humidity:'Humedad',wind:'Viento'},
  'zh-CN':{unavailable:'天气预报不可用',clear:'晴',cloudy:'多云',partly:'晴间多云',rain:'雨',snow:'雪',storm:'雷暴',fog:'雾',today:'今天',rainLabel:'降雨',humidity:'湿度',wind:'风速'},
  ko:{unavailable:'예보를 사용할 수 없음',clear:'맑음',cloudy:'흐림',partly:'구름 조금',rain:'비',snow:'눈',storm:'뇌우',fog:'안개',today:'오늘',rainLabel:'강수',humidity:'습도',wind:'바람'}
};
const weatherLocale={en:'en-US',id:'id-ID',fr:'fr-FR',es:'es-ES','zh-CN':'zh-CN',ko:'ko-KR'};
function weatherKind(symbol=''){
  if(/thunder/.test(symbol))return 'storm';if(/snow|sleet/.test(symbol))return 'snow';if(/rain|drizzle/.test(symbol))return 'rain';if(/fog/.test(symbol))return 'fog';if(/partly/.test(symbol))return 'partly';if(/clear|fair/.test(symbol))return 'clear';return 'cloudy';
}
const weatherAssetByKind={
  clear:'assets/weather/clear.png',
  partly:'assets/weather/partly-cloudy.png',
  cloudy:'assets/weather/cloudy.png',
  rain:'assets/weather/rain.png',
  storm:'assets/weather/rain.png',
  snow:'assets/weather/cloudy.png',
  fog:'assets/weather/overcast.png'
};
function weatherAssetIcon(symbol='',isHero=false){
  const kind=weatherKind(symbol);
  const extra=kind==='storm'?'<i class="weather-asset-lightning" aria-hidden="true"></i>':kind==='snow'?'<i class="weather-asset-snow" aria-hidden="true"></i>':kind==='fog'?'<i class="weather-asset-fog" aria-hidden="true"></i>':'';
  return `<span class="weather-asset weather-asset-${kind}${isHero?' is-hero':''}"><img src="${weatherAssetByKind[kind]||weatherAssetByKind.cloudy}" alt="">${extra}</span>`;
}
function weatherIcon(symbol='', isHero=false){
  const kind=weatherKind(symbol);
  if(isHero){
    const defs='<defs><linearGradient id="w-sun-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffb703"/><stop offset="100%" stop-color="#fb8500"/></linearGradient><linearGradient id="w-cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient><linearGradient id="w-cloud-shade" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.8"/><stop offset="100%" stop-color="#94a3b8" stop-opacity="0.95"/></linearGradient><linearGradient id="w-cloud-rain" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/></linearGradient></defs>';
    if(kind==='clear'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-sun-spin"><circle cx="32" cy="24" r="14" fill="url(#w-sun-grad)"/><g stroke="#ffb703" stroke-width="2.6" stroke-linecap="round"><path d="M32 3v6M32 39v6M11 24h6M47 24h6M17 9l4 4M43 35l4 4M47 9l-4 4M21 35l-4 4"/></g></g></svg>`;
    }
    if(kind==='partly'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-sun-breathe"><circle cx="43" cy="17" r="11" fill="url(#w-sun-grad)"/><g stroke="#ffb703" stroke-width="2" stroke-linecap="round"><path d="M43 2v4M43 28v4M29 17h4M54 17h4M32 6l3 3M51 25l3 3M51 9l-3 3M35 25l-3 3"/></g></g><g class="weather-anim-cloud-float"><path d="M16 38h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-grad)"/><path d="M16 38h32a10 10 0 0 0 7-4H11a12 12 0 0 0 5 4Z" fill="url(#w-cloud-shade)"/></g></svg>`;
    }
    if(kind==='rain'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-cloud-float"><path d="M16 34h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-rain)"/></g><g class="weather-anim-rain-drops"><line class="rain-drop d1" x1="22" y1="36" x2="19" y2="45" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><line class="rain-drop d2" x1="31" y1="36" x2="28" y2="45" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><line class="rain-drop d3" x1="40" y1="36" x2="37" y2="45" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><line class="rain-drop d4" x1="48" y1="36" x2="45" y2="45" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/></g></svg>`;
    }
    if(kind==='storm'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-cloud-float"><path d="M16 34h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-rain)"/></g><g class="weather-anim-rain-drops"><line class="rain-drop d1" x1="20" y1="36" x2="18" y2="44" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/><line class="rain-drop d3" x1="44" y1="36" x2="42" y2="44" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/></g><polygon class="weather-anim-lightning" points="33,31 26,40 33,40 29,48 41,38 34,38 38,31" fill="#facc15"/></svg>`;
    }
    if(kind==='snow'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-cloud-float"><path d="M16 34h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-grad)"/></g><g class="weather-anim-snow"><circle class="snow-flake s1" cx="23" cy="41" r="2.2" fill="#e0f2fe"/><circle class="snow-flake s2" cx="33" cy="42" r="2.4" fill="#e0f2fe"/><circle class="snow-flake s3" cx="43" cy="40" r="2" fill="#e0f2fe"/></g></svg>`;
    }
    if(kind==='fog'){
      return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-cloud-float"><path d="M16 34h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-grad)"/></g><g class="weather-anim-fog-wave" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"><path d="M14 40h36M18 44h28"/></g></svg>`;
    }
    return `<svg class="weather-hero-svg" viewBox="0 0 64 48" aria-hidden="true">${defs}<g class="weather-anim-cloud-back"><path d="M12 32h28a9 9 0 0 0 1-18 13 13 0 0 0-24-3 10 10 0 0 0-5 21Z" fill="#64748b" opacity="0.65"/></g><g class="weather-anim-cloud-float"><path d="M18 39h30a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="url(#w-cloud-grad)"/><path d="M18 39h30a10 10 0 0 0 7-4H13a12 12 0 0 0 5 4Z" fill="url(#w-cloud-shade)"/></g></svg>`;
  }
  const sun='<circle cx="43" cy="15" r="10" fill="#ff9518"/><g stroke="#ffb145" stroke-width="2" stroke-linecap="round"><path d="M43 1v5M43 24v5M29 15h5M52 15h5M33 5l4 4M49 21l4 4M53 5l-4 4"/></g>',cloud='<path d="M17 37h30a9 9 0 0 0 1-18 14 14 0 0 0-26-3 11 11 0 0 0-5 21Z" fill="#f4f6f5"/><path d="M17 37h30a9 9 0 0 0 8-5H12a11 11 0 0 0 5 5Z" fill="#aeb6b2"/>';
  if(kind==='clear')return `<svg viewBox="0 0 64 48" aria-hidden="true"><circle cx="32" cy="24" r="13" fill="#ff9518"/><g stroke="#ffc05d" stroke-width="2.4" stroke-linecap="round"><path d="M32 3v6M32 39v6M11 24h6M47 24h6M17 9l4 4M43 35l4 4M47 9l-4 4M21 35l-4 4"/></g></svg>`;
  const effects=kind==='rain'?'<g stroke="#63b7ff" stroke-width="2" stroke-linecap="round"><path d="m23 40-2 5M34 40l-2 5M45 40l-2 5"/></g>':kind==='storm'?'<path d="m35 36-6 8h6l-3 6 11-11h-6l3-3Z" fill="#ffd451"/>':kind==='snow'?'<g fill="#d9f2ff"><circle cx="23" cy="43" r="2"/><circle cx="35" cy="44" r="2"/><circle cx="47" cy="42" r="2"/></g>':'';
  return `<svg viewBox="0 0 64 48" aria-hidden="true">${kind==='partly'?sun:''}${cloud}${effects}</svg>`;
}
function weatherMinute(value){if(!Number.isFinite(value))return '—';const hours=Math.floor(value/60)%24,minutes=value%60;return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;}
// Flat white weather symbols for the minimal weather page (same silhouette family as the iPhone weather glyphs).
function weatherMiniIcon(symbol=''){
  const kind=weatherKind(symbol);
  const cloud='<path d="M16 36h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="#fff"/>';
  const smallCloud='<path d="M14 40h30a9 9 0 0 0 1-18 13 13 0 0 0-25-3 11 11 0 0 0-6 21Z" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke"/>';
  const rays='<g stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M32 3v5M32 40v5M11 24h5M48 24h5M17 9l3.5 3.5M43.5 35.5 47 39M47 9l-3.5 3.5M20.5 35.5 17 39"/></g>';
  let inner;
  if(kind==='clear')inner=`<circle cx="32" cy="24" r="11" fill="#fff"/>${rays}`;
  else if(kind==='partly')inner=`<circle cx="43" cy="16" r="9" fill="#fff"/><g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M43 2v3M43 27v3M29 16h3M54 16h3M33 6l2 2M51 24l2 2M53 6l-2 2"/></g>${smallCloud}`;
  else if(kind==='rain')inner=`${cloud}<g stroke="#4aa8ff" stroke-width="2.8" stroke-linecap="round"><path d="m23 40-2.5 6M33 40l-2.5 6M43 40l-2.5 6"/></g>`;
  else if(kind==='storm')inner=`${cloud}<path d="m34 33-7 9h6l-3 7 10-11h-6l3-5Z" fill="#fff" stroke="#000" stroke-width="1.6" paint-order="stroke"/>`;
  else if(kind==='snow')inner=`${cloud}<g fill="#fff"><circle cx="23" cy="43" r="2.4"/><circle cx="33" cy="45" r="2.4"/><circle cx="43" cy="43" r="2.4"/></g>`;
  else if(kind==='fog')inner=`${cloud}<g stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M16 42h32M21 46.5h22"/></g>`;
  else inner=cloud;
  return `<svg viewBox="0 0 64 50" aria-hidden="true">${inner}</svg>`;
}
function weatherHourLabel(iso,offset,locale){
  const when=new Date(Date.parse(iso)+(Number(offset)||0)*3600000);
  return new Intl.DateTimeFormat(locale,{hour:'numeric',timeZone:'UTC'}).format(when).replace(/\s/g,'');
}
// Large animated hero symbol. Demo: tapping it cycles five weather states so every animation can be previewed.
const weatherDemoSymbols=['clearsky_day','partlycloudy_day','cloudy','rain','rainandthunder'];
let weatherDemoIndex=-1;
acts.weatherdemo=()=>{weatherDemoIndex=(weatherDemoIndex+1)%weatherDemoSymbols.length;renderWeatherPage();};
function weatherHeroIcon(symbol=''){
  const kind=weatherKind(symbol);
  const cloud='<path d="M16 36h32a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-5 24Z" fill="#fff"/>';
  const rays='<g class="wh-rays" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M32 3v5M32 40v5M11 24h5M48 24h5M17 9l3.5 3.5M43.5 35.5 47 39M47 9l-3.5 3.5M20.5 35.5 17 39"/></g>';
  const drops=[[22,0],[30,1],[38,2],[46,3],[26,4],[42,5]].map(([x,i])=>`<path class="wh-drop" style="--i:${i}" d="M${x} 40l-2 5" stroke="#4aa8ff" stroke-width="2.8" stroke-linecap="round"/>`).join('');
  let inner;
  if(kind==='clear')inner=`<g class="wh-pulse"><circle cx="32" cy="24" r="11" fill="#fff"/></g>${rays}`;
  else if(kind==='partly')inner=`<g class="wh-sun"><circle cx="43" cy="16" r="9" fill="#fff"/><g class="wh-rays-s" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M43 2v3M43 27v3M29 16h3M54 16h3M33 6l2 2M51 24l2 2M53 6l-2 2"/></g></g><g class="wh-drift"><path d="M14 42h30a9 9 0 0 0 1-18 13 13 0 0 0-25-3 11 11 0 0 0-6 21Z" fill="#fff" stroke="#000" stroke-width="2.4" paint-order="stroke"/></g>`;
  else if(kind==='rain')inner=`<g class="wh-drift">${cloud}</g>${drops}`;
  else if(kind==='storm')inner=`<g class="wh-drift">${cloud}</g>${drops}<path class="wh-bolt" d="m34 31-8 10h6l-3 8 11-12h-6l3-6Z" fill="#fff" stroke="#000" stroke-width="1.6" paint-order="stroke"/>`;
  else if(kind==='snow')inner=`<g class="wh-drift">${cloud}</g>${[[22,0],[32,1],[42,2],[27,3],[37,4]].map(([x,i])=>`<circle class="wh-flake" style="--i:${i}" cx="${x}" cy="41" r="2.2" fill="#fff"/>`).join('')}`;
  else if(kind==='fog')inner=`<g class="wh-drift">${cloud}</g><g stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M16 42h32M21 46.5h22"/></g>`;
  else inner=`<g class="wh-drift-back" opacity=".55"><path d="M8 34h24a8 8 0 0 0 1-16 12 12 0 0 0-22-3 10 10 0 0 0-3 19Z" fill="#fff"/></g><g class="wh-drift">${cloud}</g>`;
  return `<svg viewBox="0 0 64 50" aria-hidden="true">${inner}</svg>`;
}
function renderWeatherPage(){
  const copy=weatherPageCopy[S.settings.language]||weatherPageCopy.en;
  const locale=weatherLocale[S.settings.language]||weatherLocale.en;
  const forecast=weatherState.forecast,daily=Array.isArray(weatherState.daily)?weatherState.daily:[];
  const kind=weatherKind(weatherState.symbolCode||daily[0]?.symbolCode||forecast?.symbolCode);
  setText('weather-page-city',weatherState.city||'Weather');setText('wm-city',weatherState.city||'');
  setText('weather-page-temp',weatherState.available?`${Math.round(weatherState.temperature)}°`:'—');
  setText('weather-page-condition',weatherState.available?(copy[kind]||copy.cloudy):copy.unavailable);
  setText('weather-page-date',new Intl.DateTimeFormat(locale,{weekday:'long',hour:'2-digit',minute:'2-digit'}).format(new Date()));
  const icon=$('#weather-page-icon');if(icon)icon.innerHTML=weatherHeroIcon(weatherDemoIndex>=0?weatherDemoSymbols[weatherDemoIndex]:(weatherState.symbolCode||daily[0]?.symbolCode||'cloudy'));
  const hoursEl=$('#weather-page-hours');if(hoursEl){const hours=Array.isArray(weatherState.hourly)?weatherState.hourly:[];hoursEl.innerHTML=hours.map(hour=>`<div class="wm-hour" role="listitem"><span class="wm-hour-name">${esc(weatherHourLabel(hour.time,weatherState.utcOffset,locale))}</span><span class="wm-hour-icon">${weatherMiniIcon(hour.symbolCode)}</span><strong>${hour.temperature}°</strong></div>`).join('');}
  setText('weather-page-sunrise',weatherMinute(weatherState.sunrise));setText('weather-page-sunset',weatherMinute(weatherState.sunset));
  const daylight=Number.isFinite(weatherState.sunrise)&&Number.isFinite(weatherState.sunset)?weatherState.sunset-weatherState.sunrise:null;
  setText('weather-page-daylight',Number.isFinite(daylight)?`${Math.floor(daylight/60)} h ${daylight%60} m`:'—');
  const days=$('#weather-page-days');if(days)days.innerHTML=daily.slice(0,6).map((day,index)=>{const date=new Date(`${day.date}T12:00:00Z`),name=index===0?copy.today:new Intl.DateTimeFormat(locale,{weekday:'short'}).format(date);return `<div class="weather-day${index===0?' is-today':''}"><span class="weather-day-name">${esc(name)}</span><span class="weather-day-icon">${weatherAssetIcon(day.symbolCode)}</span><strong>${day.max}°</strong><small>${day.min}°</small></div>`;}).join('');
}
enterHooks.weather=()=>{weatherDemoIndex=-1;renderWeatherPage();};

const idleInfoKinds=new Set(['clock','weather','battery','todo']);
let devicePowerState={hasBattery:true,percent:null,charging:false,deviceType:'unknown'};
const idleWeatherSvg='<svg class="idle-cloud-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
function batteryRing(pct,available=true,charging=false){
  const value=available?clamp(Math.round(pct),0,100):0;
  const showPercent=S.settings.idleInfoBatteryPercent!==false;
  const chargeIcon=charging?'<span class="idle-battery-charge" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M7.1 1 3.4 6.2h2.5L4.9 11l3.8-5.8H6.3z"/></svg></span>':'';
  return `<span class="idle-progress-ring battery-ring"><svg viewBox="0 0 27 27" aria-hidden="true"><circle class="idle-progress-track" cx="13.5" cy="13.5" r="10.5"/><circle class="idle-battery-progress" cx="13.5" cy="13.5" r="10.5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100-value}"/></svg><span class="idle-battery-center${charging?' is-charging':''}"><span class="idle-battery-value">${available&&showPercent?value:''}</span>${chargeIcon}</span></span>`;
}
function todoRing(done,total){
  const count=Math.min(12,Math.max(1,total));
  const completed=total?Math.round(done/total*count):0;
  const gap=count===1?0:Math.min(4,1.8+count*.16);
  const length=100/count-gap;
  const segments=Array.from({length:count},(_,index)=>`<circle class="idle-todo-segment${index<completed?' done':''}" cx="13.5" cy="13.5" r="10.5" pathLength="100" stroke-dasharray="${length} ${100-length}" stroke-dashoffset="${-(index*100/count)}"/>`).join('');
  return `<span class="idle-progress-ring todo-ring"><svg viewBox="0 0 27 27" aria-hidden="true">${segments}</svg></span>`;
}
let idleInfoCursor=0;
function idleInfoValue(kind) {
  const d = new Date();
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(kind==='clock')return {text:timeStr,label:isId()?'Waktu saat ini':'Current time',visual:''};
  if(kind==='weather'){
    const available=S.settings.weatherEnabled===true&&weatherState.available;
    return {text:available?`${Math.round(weatherState.temperature)}°C`:'',label:available?`${weatherState.city} · MET Norway`:(isId()?'Cuaca tidak tersedia':'Weather unavailable'),unavailable:!available,visual:idleWeatherSvg};
  }
  if(kind==='battery'){
    if(devicePowerState.hasBattery===false)return null;
    const pct=Number.isFinite(devicePowerState.percent)?devicePowerState.percent:(batRef?Math.round(batRef.level*100):null);
    if(!Number.isFinite(pct))return null;
    const charging=devicePowerState.charging||(batRef&&batRef.charging);
    return {text:'',label:charging?(isId()?`Mengisi daya ${pct}%`:`Charging ${pct}%`):(isId()?`Baterai ${pct}%`:`Battery ${pct}%`),visual:batteryRing(pct,true,charging)};
  }
  const tasks=typeof addonProductivity!=='undefined'&&Array.isArray(addonProductivity.tasks)?addonProductivity.tasks:[];
  const done=tasks.filter(task=>task.done).length;
  const open=tasks.filter(task=>!task.done).length;
  if(open===0)return null;
  return {text:`${open}/${tasks.length}`,label:isId()?`${done} dari ${tasks.length} tugas selesai`:`${done} of ${tasks.length} tasks completed`,visual:todoRing(done,tasks.length)};
}
function renderIdleInfoSide(side,kind) {
  const box=side==='left'?$('#idle-weather'):$('#idle-time');
  const text=side==='left'?$('#idle-weather-text'):$('#idle-time-text');
  const icon=side==='left'?$('#idle-left-icon'):$('#idle-right-icon');
  if(!box||!text||!icon)return;
  if(!kind){box.style.display='none';return;}
  const info=idleInfoValue(kind);
  if(!info){box.style.display='none';return;}
  box.style.display='';box.dataset.kind=kind;box.toggleAttribute('data-unavailable',!!info.unavailable);
  box.setAttribute('aria-label',info.label);text.textContent=info.text;text.title=info.label;
  icon.innerHTML=info.visual||'';
}
function updateIdleInfoDisplay(advance=false) {
  const config=glancePreview||S.settings;
  const configured=Array.isArray(config.idleInfoItems)?config.idleInfoItems:Array.isArray(config.items)?config.items:['clock','weather','battery','todo'];
  const selected=(config.focus&&idleInfoKinds.has(config.focus)?[config.focus]:configured).filter(kind=>idleInfoKinds.has(kind)&&idleInfoValue(kind));
  const items=selected.length?selected:['clock'];
  const sides={clock:'left',weather:'right',battery:'left',todo:'right',...(config.idleInfoSides||config.sides||{})};
  const leftItems=items.filter(kind=>sides[kind]==='left');
  const rightItems=items.filter(kind=>sides[kind]==='right');
  const cycleLength=Math.max(leftItems.length,rightItems.length,1);
  if(idleInfoCursor>=cycleLength)idleInfoCursor=0;
  renderIdleInfoSide('left',leftItems.length?leftItems[idleInfoCursor%leftItems.length]:null);
  renderIdleInfoSide('right',rightItems.length?rightItems[idleInfoCursor%rightItems.length]:null);
  if(advance)idleInfoCursor=(idleInfoCursor+1)%cycleLength;
}

let idleInfoEyeSyncToken = 0;
function syncIdleInfoEyes() {
  const token = ++idleInfoEyeSyncToken;
  const until = performance.now() + 460;
  const frame = () => {
    if (token !== idleInfoEyeSyncToken || curKey !== 'idle') return;
    updateEyeLook(lastDx, lastDy);
    if (performance.now() < until) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

let idleInfoIntervalTimer=0,idleInfoHideTimer=0;
function runIdleInfoCycle(){
  if (curKey !== 'idle' || S.expanded || S.creativeNear || (S.settings && S.settings.quiet) || S.gameMode) {
    if (S.idleInfoActive) {
      S.idleInfoActive = false;
      layout();
      syncIdleInfoEyes();
    }
    return;
  }
  updateIdleInfoDisplay(S.settings.idleInfoRotate !== false); // off = keep the first item of each side
  S.idleInfoActive = true;
  layout();
  syncIdleInfoEyes();

  clearTimeout(idleInfoHideTimer);
  if(S.settings.idleInfoAlwaysOn===true)return;
  idleInfoHideTimer=setTimeout(() => {
    if (S.idleInfoActive) {
      S.idleInfoActive = false;
      layout();
      syncIdleInfoEyes();
    }
  },Math.max(3,Math.min(15,Number(S.settings.idleInfoDurationSec)||10))*1000);
}
function configureIdleInfoScheduler(){
  clearInterval(idleInfoIntervalTimer);clearTimeout(idleInfoHideTimer);
  const interval=Math.max(10,Math.min(3600,Number(S.settings.idleInfoIntervalSec)||30))*1000;
  idleInfoIntervalTimer=setInterval(runIdleInfoCycle,interval);
  if(S.settings.idleInfoAlwaysOn===true)runIdleInfoCycle();
}
configureIdleInfoScheduler();

/* ---------- Level HUD: a thick white slider in the notch while a key changes volume or brightness ---------- */
let levelHudTimer = null, levelUnderTimer = null;
function levelHudIcon(kind, value, muted) {
  if (kind === 'volume') return ICONS[muted || value === 0 ? 'volume-mute' : value <= 33 ? 'volume-low' : value <= 66 ? 'volume-med' : 'volume'] || '';
  return ICONS[value <= 40 ? 'brightness-low' : 'brightness'] || '';
}
function showLevelHud(kind, value, muted) {
  if (S.expanded || S.ring || S.prompt || S.charge || S.headset || (S.miniPopup && S.miniPopup.kind !== 'levelhud')) return;
  const shown = muted ? 0 : value;
  const fill = $('#lh-fill'), track = $('#lh-track'), ico = $('#lh-ico');
  if (!fill || !track || !ico) return;
  fill.style.width = shown + '%';
  track.setAttribute('aria-valuenow', shown);
  track.setAttribute('aria-label', (kind === 'volume' ? 'Volume' : (isId() ? 'Kecerahan' : 'Brightness')));
  if (ico.dataset.key !== kind + (muted ? 'm' : '') + (shown <= 33 ? 'l' : shown <= 66 ? 'o' : 'h')) {
    ico.dataset.key = kind + (muted ? 'm' : '') + (shown <= 33 ? 'l' : shown <= 66 ? 'o' : 'h');
    ico.innerHTML = levelHudIcon(kind, value, muted);
  }
  // Music is on the notch: the level grows under the lyric row instead of replacing the whole notch.
  if (!S.miniPopup && curKey === 'compact' && typeof hasMusic === 'function' && hasMusic()) {
    const cf = $('#c-lh-fill'), ci = $('#c-lh-ico');
    if (cf && ci) {
      cf.style.width = shown + '%';
      ci.innerHTML = levelHudIcon(kind, value, muted);
      if (!S.levelUnder) { S.levelUnder = true; layout(); }
      clearTimeout(levelUnderTimer); levelUnderTimer = setTimeout(() => { S.levelUnder = false; layout(); }, 1800);
      return;
    }
  }
  if (S.miniPopup && S.miniPopup.kind === 'levelhud') { clearTimeout(miniPopupTimer); miniPopupTimer = setTimeout(() => dismissMiniPopup(), 1800); }
  else showMiniPopup('levelhud', 1800);
}
bridge.onSysLevel?.((level) => {
  if (!level || !Number.isFinite(level.value)) return;
  const value = clamp(Math.round(level.value), 0, 100);
  updateSliderUI(level.kind, value);
  showLevelHud(level.kind, value, level.muted === true);
});