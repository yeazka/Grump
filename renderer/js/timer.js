'use strict';
/* ===== TIMER, ALARM, POMODORO, SUARA, RING ===== */
S.timer = store.get('island.timer', null);
S.alarms = store.get('island.alarms', []);
S.setupSec = 300;
S.aset = { h: 7, m: 0, repeat: true };
S.pomo = store.get('island.pomo', null) || { mode: 'focus', total: 1500, left: 1500, end: 0, running: false, started: false, done: 0 };
if (S.timer && !S.timer.paused && S.timer.end <= Date.now()) S.timer = null;
if (S.pomo.running && S.pomo.end <= Date.now()) { S.pomo.running = false; S.pomo.started = false; S.pomo.left = S.pomo.total; }

const POMO_DUR = { focus: 1500, short: 300, long: 900 };
const POMO_LABEL = { focus: 'Focus', short: 'Break', long: 'Long Break' };
const saveTimer = () => store.set('island.timer', S.timer);
const saveAlarms = () => store.set('island.alarms', S.alarms);
const savePomo = () => store.set('island.pomo', S.pomo);

const timerLeft = () => !S.timer ? 0 : S.timer.paused ? S.timer.left : Math.max(0, (S.timer.end - Date.now()) / 1000);
const pomoLeft = () => S.pomo.running ? Math.max(0, (S.pomo.end - Date.now()) / 1000) : S.pomo.left;
const pomoActive = () => S.pomo.started;
activityProviders.push(() => !!S.timer, pomoActive);

const fmt = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`; };
const setIcoNamed = (el, name) => { if (el.dataset.ico !== name) { el.dataset.ico = name; el.innerHTML = icoOf(name); } };
const setRing = (id, frac) => { $('#' + id).style.strokeDashoffset = (100 * (1 - clamp(frac, 0, 1))).toFixed(2); };

/* ---------- Compact (termasuk 1-baris lirik Spotify real-time) ---------- */
let lastCompactLyric = '';
let measureCanvasCtx = null;
function measureLyricWidth(text, size) {
  if (!measureCanvasCtx) {
    measureCanvasCtx = document.createElement('canvas').getContext('2d');
  }
  measureCanvasCtx.font = `600 ${size}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
  return measureCanvasCtx.measureText(text).width;
}

function applyCompactLyricStyle(el, text) {
  if (!text) return;
  const availW = 210;
  const normW = measureLyricWidth(text, 12.5);
  if (normW > availW) {
    if (normW <= availW * 1.35) {
      const scaled = clamp((12.5 * availW) / normW, 10.2, 12.5);
      el.style.fontSize = scaled.toFixed(2) + 'px';
      el.classList.remove('marquee');
      el.style.removeProperty('--marquee-dist');
    } else {
      el.style.fontSize = '11.5px';
      const overflow = Math.ceil(normW - availW + 12);
      el.style.setProperty('--marquee-dist', `-${overflow}px`);
      el.classList.add('marquee');
    }
  } else {
    el.style.fontSize = '12.5px';
    el.classList.remove('marquee');
    el.style.removeProperty('--marquee-dist');
  }
}

function updateCompactLyric(info) {
  const line = info ? (info.text || '') : '';
  const mid = $('#c-mid');
  if (!mid) return;

  if (!line) {
    lastCompactLyric = '';
    const cur = $('#c-lyric');
    if (cur) {
      cur.className = 'c-lyric out';
      setTimeout(() => {
        if (cur.parentNode) cur.parentNode.removeChild(cur);
      }, 350);
    }
    return;
  }

  const words = line.trim().split(/\s+/).filter(Boolean);
  const activeWordIdx = (info && typeof info.activeWordIdx === 'number') ? info.activeWordIdx : 0;

  const curLy = $('#c-lyric');

  if (line !== lastCompactLyric) {
    lastCompactLyric = line;
    const newLy = document.createElement('span');
    newLy.className = 'c-lyric in';
    newLy.innerHTML = `<span class="c-lyric-words">${words.map((w, i) =>
      `<span class="lw ${i === activeWordIdx ? 'active' : 'blur'}" data-w="${i}">${esc(w)}</span>`
    ).join(' ')}</span>`;
    applyCompactLyricStyle(newLy, line);

    if (curLy && curLy.textContent) {
      curLy.id = '';
      curLy.className = 'c-lyric out';
      newLy.id = 'c-lyric';
      mid.appendChild(newLy);
      setTimeout(() => {
        if (curLy.parentNode) curLy.parentNode.removeChild(curLy);
      }, 380);
    } else {
      newLy.id = 'c-lyric';
      mid.appendChild(newLy);
    }
    return;
  }

  // Same line: update word states (active vs blur)
  if (curLy) {
    const spans = curLy.querySelectorAll('.lw');
    for (let i = 0; i < spans.length; i++) {
      const isAct = (i === activeWordIdx);
      if (isAct) {
        if (!spans[i].classList.contains('active')) {
          spans[i].classList.remove('blur');
          spans[i].classList.add('active');
        }
      } else {
        if (!spans[i].classList.contains('blur')) {
          spans[i].classList.remove('active');
          spans[i].classList.add('blur');
        }
      }
    }
  }
}

function renderCompact() {
  const el = $('#v-compact');
  const music = hasMusic();
  const src = S.timer ? 'timer' : pomoActive() ? 'pomo' : null;
  el.dataset.lead = music ? 'art' : 'timer';
  el.dataset.trail = 'bars';
  el.classList.toggle('paused', !isPlaying());
  el.style.setProperty('--act', src === 'pomo' ? (S.pomo.mode === 'focus' ? 'var(--red)' : 'var(--green)') : 'var(--orange)');
  const cb = $('#c-bars');
  if (cb) cb.classList.toggle('paused', !isPlaying());

  if (!music) {
    if (src === 'timer') { setText('c-time', fmt(timerLeft())); setRing('c-ringfg', S.timer.total ? timerLeft() / S.timer.total : 0); }
    else if (src === 'pomo') { setText('c-time', fmt(pomoLeft())); setRing('c-ringfg', pomoLeft() / S.pomo.total); }
  }
}
renderers.push(renderCompact);

/* ---------- Timer ---------- */
function renderTimer() {
  if (!S.timer) return;
  const left = timerLeft();
  setText('t-big', fmt(left));
  setText('t-sub', S.timer.paused ? 'Paused' : 'Ends ' + new Date(S.timer.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
  setRing('t-ringfg', S.timer.total ? left / S.timer.total : 0);
  setIcoNamed($('#t-pp'), S.timer.paused ? 'play' : 'pause');
}
renderers.push(renderTimer);
renderers.push(() => setText('t-disp', fmt(S.setupSec)));

function startTimer(sec) {
  S.timer = { total: sec, end: Date.now() + sec * 1000, paused: false, left: sec };
  saveTimer(); S.expanded = false; S.view = 'home'; S.peek = null; layout(); peek('timer', 2600);
}
holds.tinc = () => { S.setupSec = clamp(S.setupSec + (S.setupSec < 60 ? 30 : 60), 30, 99 * 3600); renderAll(); };
holds.tdec = () => { S.setupSec = clamp(S.setupSec - (S.setupSec <= 60 ? 30 : 60), 30, 99 * 3600); renderAll(); };
acts.timer = () => go(S.timer ? 'timer' : 'tsetup');
acts.tchip = (el) => { S.setupSec = +el.dataset.v; renderAll(); };
acts.tstart = () => startTimer(S.setupSec);
acts.tpause = () => {
  if (!S.timer) return;
  if (S.timer.paused) { S.timer.end = Date.now() + S.timer.left * 1000; S.timer.paused = false; }
  else { S.timer.left = timerLeft(); S.timer.paused = true; }
  saveTimer(); layout();
};
acts.tcancel = () => { S.timer = null; saveTimer(); go('tsetup'); };

/* ---------- Pomodoro ---------- */
function renderPomo() {
  const p = S.pomo, left = pomoLeft();
  $('#v-pomo').dataset.mode = p.mode === 'focus' ? 'focus' : 'break';
  setText('p-lbl', POMO_LABEL[p.mode] + (p.mode === 'focus' ? ` · ${(p.done % 4) + 1}/4` : ''));
  setText('p-big', fmt(left));
  setRing('p-ringfg', left / p.total);
  setIcoNamed($('#p-pp'), p.running ? 'pause' : 'play');
  $$('#p-modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === p.mode));
}
renderers.push(renderPomo);
function pomoMode(m) {
  const p = S.pomo; p.mode = m; p.total = p.left = POMO_DUR[m]; p.running = false; p.started = false; savePomo(); layout();
}
acts.pmode = (el) => pomoMode(el.dataset.m);
acts.pstart = () => {
  const p = S.pomo;
  if (p.running) { p.left = pomoLeft(); p.running = false; }
  else { p.end = Date.now() + p.left * 1000; p.running = true; p.started = true; }
  savePomo(); layout();
};
acts.preset = () => pomoMode(S.pomo.mode);
acts.pomo = () => go('pomo');
function pomoFinish() {
  const p = S.pomo, wasFocus = p.mode === 'focus';
  p.running = false; p.started = false;
  if (wasFocus) p.done++;
  const next = wasFocus ? (p.done % 4 === 0 ? 'long' : 'short') : 'focus';
  p.mode = next; p.total = p.left = POMO_DUR[next]; savePomo();
  ringStart({
    kind: 'pomo', icon: wasFocus ? 'focus' : 'timer', title: wasFocus ? 'Focus Done' : 'Break Over',
    sub: wasFocus ? `${Math.round(POMO_DUR[next] / 60)}m break?` : 'Ready to focus?',
    btn: wasFocus ? 'Break' : 'Focus', stopLabel: 'Later', loop: false, auto: 25000,
    onBtn: () => { go('pomo'); acts.pstart(); },
  });
}

/* ---------- Alarm ---------- */
function renderAsetup() {
  setText('a-h', pad(S.aset.h)); setText('a-m', pad(S.aset.m));
  $('#a-repeat .sw').classList.toggle('on', S.aset.repeat);
}
renderers.push(renderAsetup);
function renderAlarms() {
  const list = $('#a-list');
  const sorted = [...S.alarms].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  const html = !sorted.length ? '<div class="a-empty">No alarms</div>' : sorted.map((a) => `
    <div class="a-row ${a.on ? '' : 'off'}">
      <div class="t">${pad(a.h)}:${pad(a.m)}</div>
      <div class="l">${a.snooze ? 'Snooze' : a.repeat ? 'Daily' : 'Once'}</div>
      <button class="icon-btn del" data-act="adel" data-id="${a.id}"><span data-ico="trash"></span></button>
      <button class="sw ${a.on ? 'on' : ''}" data-act="atoggle" data-id="${a.id}"><i></i></button>
    </div>`).join('');
  if (setHTML('a-list', html)) setIco(list);
}
renderers.push(renderAlarms);
holds.hinc = () => { S.aset.h = (S.aset.h + 1) % 24; renderAll(); };
holds.hdec = () => { S.aset.h = (S.aset.h + 23) % 24; renderAll(); };
holds.minc = () => { S.aset.m = (S.aset.m + 1) % 60; renderAll(); };
holds.mdec = () => { S.aset.m = (S.aset.m + 59) % 60; renderAll(); };
acts.alarms = () => go('alarms');
acts.aadd = () => { const d = new Date(Date.now() + 3600e3); S.aset = { h: d.getHours(), m: 0, repeat: true }; go('asetup'); };
acts.arepeat = () => { S.aset.repeat = !S.aset.repeat; renderAll(); };
acts.asave = () => { S.alarms.push({ id: idGen(), h: S.aset.h, m: S.aset.m, repeat: S.aset.repeat, on: true }); saveAlarms(); go('alarms'); };
acts.atoggle = (el) => { const a = S.alarms.find((x) => x.id === el.dataset.id); if (a) { a.on = !a.on; a.fired = null; saveAlarms(); renderAll(); } };
acts.adel = (el) => { S.alarms = S.alarms.filter((x) => x.id !== el.dataset.id); saveAlarms(); renderAll(); };

/* ---------- Suara ---------- */
let ac = null, ringIv = null, ringStopT = null;
function tone(f, t, d, g = 0.22, type = 'sine') {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.value = f;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + d + 0.05);
}
function startSound(kind, loop) {
  stopSound();
  try { ac = ac || new AudioContext(); ac.resume(); } catch { return; }
  const burst = () => {
    const t = ac.currentTime + 0.05;
    if (kind === 'alarm') [880, 1108.7, 1318.5, 1108.7, 880, 1108.7, 1318.5, 1760].forEach((f, i) => tone(f, t + i * 0.16, 0.22, 0.2, 'triangle'));
    else if (kind === 'timer') [783.99, 987.77, 1174.66].forEach((f, i) => tone(f, t + i * 0.2, 0.6, 0.25));
    else if (kind === 'water') [1046.5, 1318.5].forEach((f, i) => tone(f, t + i * 0.14, 0.5, 0.16));
    else [659.25, 880, 1318.5].forEach((f, i) => tone(f, t + i * 0.16, 0.55, 0.2));
  };
  burst();
  if (loop) ringIv = setInterval(burst, kind === 'alarm' ? 1900 : 1500);
}
function stopSound() { clearInterval(ringIv); ringIv = null; }

/* ---------- Ring (alert besar: alarm, timer, pomodoro, air, tugas) ---------- */
let ringSweepIv = null;
function ringStart(r) {
  const next = { loop: true, auto: 120000, stopLabel: 'Stop', ...r };
  S.ring = next; S.expanded = false; S.peek = null; S.notice = null;
  startSound(next.kind, next.loop); layout();
  clearInterval(ringSweepIv);
  if (typeof triggerGlassRing === 'function') {
    triggerGlassRing();
    if (next.loop) {
      ringSweepIv = setInterval(() => {
        if (S.ring) triggerGlassRing();
        else { clearInterval(ringSweepIv); ringSweepIv = null; }
      }, 3000);
    }
  }
  clearTimeout(ringStopT); ringStopT = setTimeout(dismissRing, next.auto);
}
function dismissRing() {
  clearInterval(ringSweepIv); ringSweepIv = null;
  clearTimeout(ringStopT); stopSound(); S.ring = null; S.expanded = false;
  island.dataset.ringkind = '';
  layout();
}
function renderRing() {
  const r = S.ring; if (!r) return;
  setText('r-title', r.title); setText('r-sub', r.sub || ''); setText('r-btn', r.btn); setText('r-stop', r.stopLabel);
  setIcoNamed($('#r-ico span'), r.icon);
  $('#r-ico').dataset.kind = r.kind;
  $('#v-ring').dataset.kind = r.kind;
  island.dataset.ringkind = r.kind || '';
  const b = $('#r-btn');
  b.className = r.kind === 'water' ? 'pill blue' : 'pill grey';
  b.style.display = r.btn ? '' : 'none';
}
renderers.push(renderRing);
acts.rbtn = () => { const r = S.ring; dismissRing(); if (r && r.onBtn) r.onBtn(); };
acts.stop = () => dismissRing();

/* ---------- Tick: timer selesai, alarm, jam ---------- */
let lastSec = -1;
ticks.push(() => {
  const now = Date.now();
  if (S.timer && !S.timer.paused && now >= S.timer.end) {
    const total = S.timer.total; S.timer = null; saveTimer();
    ringStart({ kind: 'timer', icon: 'timer', title: 'Timer Done', sub: fmt(total), btn: '+1m', onBtn: () => startTimer(60) });
  }
  if (S.pomo.running && now >= S.pomo.end) pomoFinish();
  const d = new Date();
  if (d.getSeconds() !== lastSec) {
    lastSec = d.getSeconds();
    const day = todayKey(d);
    for (const a of S.alarms) {
      if (a.on && a.h === d.getHours() && a.m === d.getMinutes() && a.fired !== day) {
        a.fired = day; if (!a.repeat) a.on = false; saveAlarms();
        ringStart({
          kind: 'alarm', icon: 'bell', title: 'Alarm', sub: `${pad(a.h)}:${pad(a.m)}`, btn: 'Snooze',
          onBtn: () => {
            const t = new Date(Date.now() + 5 * 60e3);
            S.alarms.push({ id: idGen(), h: t.getHours(), m: t.getMinutes(), repeat: false, on: true, snooze: true }); saveAlarms(); layout();
          },
        });
      }
    }
  }
  if (curKey === 'compact') renderCompact();
  else if (curKey === 'timer') renderTimer();
  else if (curKey === 'pomo') renderPomo();
});
