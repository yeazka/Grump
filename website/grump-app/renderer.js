(() => {
  'use strict';

  // ===========================================================================
  // Helpers
  // ===========================================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');

  const api = window.island || {
    setIgnoreMouse() {}, mediaCommand() {}, onMedia() {}, onToggle() {},
  };

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('di.' + k); return v ? JSON.parse(v) : d; } catch (_) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('di.' + k, JSON.stringify(v)); } catch (_) { /* abaikan */ }
    },
  };

  function fmtDur(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
  const fmtClock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  function fmtTrack(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
  }

  // update DOM hanya kalau nilainya berubah
  function setText(el, txt) { if (el._t !== txt) { el._t = txt; el.textContent = txt; } }
  function setStyle(el, prop, val) {
    const k = '_s' + prop;
    if (el[k] !== val) { el[k] = val; el.style[prop] = val; }
  }
  function setClass(el, name, on) { el.classList.toggle(name, !!on); }

  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.3" height="14" rx="1.4" fill="currentColor"/><rect x="13.7" y="5" width="4.3" height="14" rx="1.4" fill="currentColor"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };

  // ===========================================================================
  // Elemen
  // ===========================================================================
  const island = $('#island');
  const bubble = $('#bubble');
  const views = $$('.view');

  const el = {
    idleTime: $('#idle-time'), expClock: $('#exp-clock'),
    cTime: $('#c-time'), cRing: $('#c-ring-fg'), bRing: $('#b-ring-fg'),
    tSetDisplay: $('#t-set-display'), tRunTime: $('#t-run-time'), tRing: $('#t-ring-fg'),
    tSub: $('#t-sub'), tPause: $('#t-pause'),
    cArt: $('#c-art'), mArt: $('#m-art'),
    mTitle: $('#m-title'), mArtist: $('#m-artist'), mCur: $('#m-cur'), mDur: $('#m-dur'),
    mFill: $('#m-fill'), mPlay: $('#m-play'), mPrev: $('#m-prev'), mNext: $('#m-next'),
    eqs: [$('#c-eq'), $('#m-eq'), $('#b-eq')],
    aList: $('#a-list'), aH: $('#a-h'), aM: $('#a-m'),
    rTitle: $('#r-title'), rSub: $('#r-sub'), rSnooze: $('#r-snooze'), rIcon: $('#r-icon'),
  };

  const C_SMALL = 2 * Math.PI * 9;
  const C_BIG = 2 * Math.PI * 44;
  for (const r of [el.cRing, el.bRing]) r.style.strokeDasharray = C_SMALL.toFixed(2);
  el.tRing.style.strokeDasharray = C_BIG.toFixed(2);
  const setDash = (node, c, frac) => setStyle(node, 'strokeDashoffset', (c * (1 - clamp(frac, 0, 1))).toFixed(2));

  // ===========================================================================
  // Fisika spring (60 fps, frame-rate independent)
  // ===========================================================================
  class Spring {
    constructor(x, k, c) { this.x = x; this.t = x; this.v = 0; this.k = k; this.c = c; }
    step(dt) {
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const a = -this.k * (this.x - this.t) - this.c * this.v;
        this.v += a * h;
        this.x += this.v * h;
      }
    }
    get settled() { return Math.abs(this.x - this.t) < 0.02 && Math.abs(this.v) < 0.02; }
    snap() { this.x = this.t; this.v = 0; }
  }

  const sw = new Spring(60, 380, 27);   // lebar
  const sh = new Spring(22, 330, 26);   // tinggi
  const sb = new Spring(0, 300, 22);    // gelembung kedua (skala)

  const TOP = 8;       // jarak island dari tepi atas layar
  const BUB = 36;      // diameter gelembung
  const GAP = 8;       // jarak island ke gelembung
  let WIN_W = window.innerWidth || 640;

  function paint() {
    const w = Math.max(sw.x, 20);
    const h = Math.max(sh.x, 20);
    const x = (WIN_W - w) / 2;
    island.style.width = w.toFixed(2) + 'px';
    island.style.height = h.toFixed(2) + 'px';
    island.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    island.style.borderRadius = Math.min(h / 2, 38).toFixed(2) + 'px';

    const s = clamp(sb.x, 0, 1.2);
    const bx = x + w - BUB + (BUB + GAP) * Math.min(s, 1) + (s > 1 ? (s - 1) * 6 : 0);
    bubble.style.transform = `translate3d(${bx.toFixed(2)}px,0,0) scale(${s.toFixed(3)})`;
    bubble.style.opacity = Math.min(1, s * 1.6).toFixed(3);
    bubble.style.pointerEvents = s > 0.6 ? 'auto' : 'none';
  }

  let raf = 0, lastT = 0;
  function kick() {
    if (raf) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 1 / 20);
    lastT = now;
    sw.step(dt); sh.step(dt); sb.step(dt);
    if (sw.settled && sh.settled && sb.settled) {
      sw.snap(); sh.snap(); sb.snap();
      paint();
      raf = 0;
      return;
    }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function setTargets(w, h) {
    if (w !== sw.t) {
      const grow = w > sw.t;
      sw.k = grow ? 380 : 440; sw.c = grow ? 27 : 38;
      sw.t = w; kick();
    }
    if (h !== sh.t) {
      const grow = h > sh.t;
      sh.k = grow ? 330 : 430; sh.c = grow ? 26 : 37;
      sh.t = h; kick();
    }
  }

  window.addEventListener('resize', () => { WIN_W = window.innerWidth; paint(); });

  // ===========================================================================
  // State
  // ===========================================================================
  let expanded = false;
  let hovered = false;
  let tab = store.get('tab', 'timer');
  if (!['timer', 'alarm', 'music'].includes(tab)) tab = 'timer';
  let ringing = null;
  const ringQueue = [];

  // ----- timer -----
  const timer = Object.assign({ state: 'none', total: 0, endAt: 0, remaining: 0, since: 0, setup: 300 }, store.get('timer', {}));
  if (timer.state === 'running' && Date.now() - timer.endAt > 60000) timer.state = 'none';
  const saveTimer = () => store.set('timer', timer);

  function timerRemaining() {
    if (timer.state === 'running') return Math.max(0, (timer.endAt - Date.now()) / 1000);
    if (timer.state === 'paused') return timer.remaining;
    return 0;
  }
  function timerStart(sec) {
    timer.total = sec;
    timer.endAt = Date.now() + sec * 1000;
    timer.state = 'running';
    timer.since = Date.now();
    saveTimer(); refresh();
  }
  function timerPauseResume() {
    if (timer.state === 'running') {
      timer.remaining = timerRemaining();
      timer.state = 'paused';
    } else if (timer.state === 'paused') {
      timer.endAt = Date.now() + timer.remaining * 1000;
      timer.state = 'running';
    }
    saveTimer(); refresh();
  }
  function timerCancel() { timer.state = 'none'; saveTimer(); refresh(); }
  function timerAdd(sec) {
    if (timer.state === 'running') timer.endAt += sec * 1000;
    else if (timer.state === 'paused') timer.remaining += sec;
    else return;
    timer.total += sec;
    saveTimer(); refresh();
  }
  function checkTimer() {
    if (timer.state === 'running' && timerRemaining() <= 0) {
      const total = timer.total;
      timer.state = 'none';
      saveTimer();
      ring('timer', 'Timer selesai', `${fmtDur(total)} telah berlalu`);
    }
  }
  const stepFor = (s) => (s < 60 ? 10 : s < 600 ? 60 : s < 3600 ? 300 : 900);
  function setupInc() { timer.setup = Math.min(12 * 3600, timer.setup + stepFor(timer.setup)); saveTimer(); updateTimerUI(); }
  function setupDec() { timer.setup = Math.max(10, timer.setup - stepFor(timer.setup - 1)); saveTimer(); updateTimerUI(); }

  // ----- alarm -----
  let alarms = store.get('alarms', []);
  let snooze = store.get('snooze', null);
  const draft = Object.assign({ h: 7, m: 0 }, store.get('draft', {}));
  const saveAlarms = () => store.set('alarms', alarms);

  function renderAlarms() {
    if (!alarms.length) {
      el.aList.innerHTML = '<div class="a-empty">Belum ada alarm</div>';
      return;
    }
    const sorted = alarms.slice().sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
    el.aList.innerHTML = sorted.map((a) => (
      `<div class="a-row${a.enabled ? '' : ' off'}" data-id="${a.id}">` +
        '<div class="a-info">' +
          `<div class="a-time">${pad(a.h)}:${pad(a.m)}</div>` +
          `<button class="a-rep" data-act="repeat">${a.repeat ? 'Setiap hari' : 'Sekali'}</button>` +
        '</div>' +
        `<button class="switch${a.enabled ? ' on' : ''}" data-act="toggle" aria-label="Aktifkan"><i></i></button>` +
        `<button class="a-del" data-act="del" aria-label="Hapus">${ICON.del}</button>` +
      '</div>'
    )).join('');
  }

  function updateDraft() {
    setText(el.aH, pad(draft.h));
    setText(el.aM, pad(draft.m));
    store.set('draft', draft);
  }
  function draftAdjust(kind) {
    if (kind === 'h+') draft.h = (draft.h + 1) % 24;
    else if (kind === 'h-') draft.h = (draft.h + 23) % 24;
    else if (kind === 'm+') draft.m = (draft.m + 1) % 60;
    else if (kind === 'm-') draft.m = (draft.m + 59) % 60;
    updateDraft();
  }
  function addAlarm() {
    if (alarms.length >= 12) return;
    alarms.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), h: draft.h, m: draft.m, repeat: false, enabled: true, label: 'Alarm', last: '' });
    saveAlarms(); renderAlarms(); refresh();
  }

  function checkAlarms() {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    for (const a of alarms) {
      if (a.enabled && a.h === d.getHours() && a.m === d.getMinutes() && a.last !== key) {
        a.last = key;
        if (!a.repeat) a.enabled = false;
        saveAlarms(); renderAlarms();
        ring('alarm', a.label || 'Alarm', `${pad(a.h)}:${pad(a.m)}`);
      }
    }
    if (snooze && Date.now() >= snooze.at) {
      const s = snooze;
      snooze = null; store.set('snooze', null);
      ring('alarm', s.label || 'Alarm', 'Ditunda 5 menit');
    }
  }

  // ----- bunyi & ringing -----
  let actx = null, ringInterval = 0, ringTimeout = 0;

  function tone(freq, t, dur, vol, type) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function playPattern(kind) {
    if (!actx) return;
    const t = actx.currentTime + 0.02;
    if (kind === 'timer') {
      [[880, 0], [1174.66, 0.16], [1318.51, 0.32], [1760, 0.52]].forEach(([f, o]) => {
        tone(f, t + o, 0.9, 0.2, 'sine');
        tone(f * 2, t + o, 0.45, 0.04, 'sine');
      });
    } else {
      for (let i = 0; i < 4; i++) tone(1046.5, t + i * 0.17, 0.11, 0.16, 'triangle');
    }
  }
  function startSound(kind) {
    stopSound();
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      playPattern(kind);
      ringInterval = setInterval(() => playPattern(kind), kind === 'timer' ? 2300 : 1500);
    } catch (_) { /* audio tidak tersedia */ }
    ringTimeout = setTimeout(stopRing, 3 * 60 * 1000);
  }
  function stopSound() { clearInterval(ringInterval); clearTimeout(ringTimeout); ringInterval = ringTimeout = 0; }

  function ring(kind, title, sub) {
    const r = { kind, title, sub };
    if (ringing) ringQueue.push(r); else startRing(r);
  }
  function startRing(r) {
    ringing = r;
    expanded = false;
    setText(el.rTitle, r.title);
    setText(el.rSub, r.sub || ' ');
    setText(el.rSnooze, r.kind === 'timer' ? '+1 menit' : 'Tunda 5 mnt');
    el.rIcon.innerHTML = r.kind === 'timer'
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9.5v4l2.6 1.6M9.5 3h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M6.5 17.5V11a5.5 5.5 0 0 1 11 0v6.5l1.5 1.5H5l1.5-1.5zM10 21h4" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    startSound(r.kind);
    refresh();
  }
  function stopRing() {
    stopSound();
    ringing = null;
    if (ringQueue.length) startRing(ringQueue.shift()); else refresh();
  }
  function snoozeRing() {
    const r = ringing;
    if (!r) return;
    if (r.kind === 'timer') {
      stopRing();
      timerStart(60);
    } else {
      snooze = { at: Date.now() + 5 * 60 * 1000, label: r.title };
      store.set('snooze', snooze);
      stopRing();
    }
  }

  // ----- musik -----
  const music = {
    active: false, playing: false, key: '', title: '', artist: '',
    pos: 0, dur: 0, at: 0, thumb: '', canNext: true, canPrev: true, canSeek: false,
    since: 0, pausedAt: 0, lockUntil: 0,
  };

  const musicActive = () => music.active && (music.playing || Date.now() - music.pausedAt < 8000);
  const curPos = () => {
    if (!music.playing) return music.pos;
    const p = music.pos + (performance.now() - music.at) / 1000;
    return music.dur > 0 ? Math.min(music.dur, p) : p;
  };

  function mimeFor(b64) {
    if (b64.startsWith('iVBOR')) return 'image/png';
    if (b64.startsWith('UklGR')) return 'image/webp';
    if (b64.startsWith('R0lGOD')) return 'image/gif';
    return 'image/jpeg';
  }

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hsl2css(h, s, l) { return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`; }

  function extractAccent(src) {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 24;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data;
        let r = 0, gr = 0, b = 0, ws = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]);
          const mn = Math.min(d[i], d[i + 1], d[i + 2]);
          const sat = mx === 0 ? 0 : (mx - mn) / mx;
          const w = 0.1 + sat * sat * 3 + (mx / 255) * 0.3;
          r += d[i] * w; gr += d[i + 1] * w; b += d[i + 2] * w; ws += w;
        }
        const [h, s, l] = rgb2hsl(r / ws, gr / ws, b / ws);
        island.style.setProperty('--acc-m', hsl2css(h, clamp(s * 1.3, 0.5, 1), clamp(l, 0.6, 0.72)));
      } catch (_) { /* biarkan warna default */ }
    };
    img.src = src;
  }

  function setArt(b64) {
    if (!b64) {
      music.thumb = '';
      for (const n of [el.cArt, el.mArt]) { n.style.backgroundImage = ''; }
      el.mArt.classList.remove('has-img');
      island.style.removeProperty('--acc-m');
      return;
    }
    const src = `data:${mimeFor(b64)};base64,${b64}`;
    music.thumb = src;
    for (const n of [el.cArt, el.mArt]) n.style.backgroundImage = `url("${src}")`;
    el.mArt.classList.add('has-img');
    extractAccent(src);
  }

  api.onMedia((d) => {
    const wasPlaying = music.active && music.playing;
    if (!d || !d.active) {
      music.active = false; music.playing = false;
      refresh();
      return;
    }
    if (d.key !== music.key) { music.key = d.key; setArt(null); }
    music.active = true;
    music.title = d.title || 'Tanpa judul';
    music.artist = d.artist || d.album || '';
    music.pos = d.pos || 0;
    music.dur = d.dur || 0;
    music.at = performance.now();
    music.canNext = d.next !== false;
    music.canPrev = d.prev !== false;
    music.canSeek = !!d.seek && music.dur > 0;
    if (performance.now() >= music.lockUntil) music.playing = !!d.playing;
    if (d.thumb) setArt(d.thumb);
    if (music.playing && !wasPlaying) music.since = Date.now();
    if (!music.playing && wasPlaying) music.pausedAt = Date.now();
    refresh();
  });

  function musicToggle() {
    const p = curPos();
    music.playing = !music.playing;
    music.pos = p; music.at = performance.now();
    music.lockUntil = performance.now() + 900;
    if (music.playing) music.since = Date.now(); else music.pausedAt = Date.now();
    api.mediaCommand('toggle');
    refresh();
  }
  function musicSkip(cmd) {
    api.mediaCommand(cmd);
    music.pos = 0; music.at = performance.now();
    updateMusicUI();
  }
  function musicSeek(frac) {
    if (!music.canSeek) return;
    const sec = clamp(frac, 0, 1) * music.dur;
    music.pos = sec; music.at = performance.now();
    api.mediaCommand('seek:' + sec.toFixed(2));
    updateMusicUI();
  }

  // ===========================================================================
  // UI update
  // ===========================================================================
  function updateTimerUI() {
    const rem = timerRemaining();
    const frac = timer.total > 0 ? rem / timer.total : 0;

    setText(el.tSetDisplay, fmtDur(timer.setup));
    $$('#t-chips button').forEach((b) => setClass(b, 'sel', Number(b.dataset.sec) === timer.setup));

    if (timer.state !== 'none') {
      setText(el.tRunTime, fmtDur(rem));
      setDash(el.tRing, C_BIG, frac);
      setText(el.tSub, timer.state === 'running'
        ? `Selesai pukul ${fmtClock(new Date(timer.endAt))}`
        : 'Dijeda');
      const icon = timer.state === 'running' ? 'pause' : 'play';
      if (el.tPause._i !== icon) { el.tPause._i = icon; el.tPause.innerHTML = ICON[icon]; }
      setText(el.cTime, fmtDur(rem));
      setDash(el.cRing, C_SMALL, frac);
      setDash(el.bRing, C_SMALL, frac);
    }
  }

  function updateMusicUI() {
    if (!music.active) return;
    setText(el.mTitle, music.title);
    setText(el.mArtist, music.artist || ' ');
    const pos = curPos();
    setText(el.mCur, fmtTrack(pos));
    setText(el.mDur, music.dur > 0 ? fmtTrack(music.dur) : '--:--');
    setStyle(el.mFill, 'transform', `scaleX(${music.dur > 0 ? clamp(pos / music.dur, 0, 1).toFixed(4) : 0})`);
    const icon = music.playing ? 'pause' : 'play';
    if (el.mPlay._i !== icon) { el.mPlay._i = icon; el.mPlay.innerHTML = ICON[icon]; }
    setClass(el.mPrev, 'disabled', !music.canPrev);
    setClass(el.mNext, 'disabled', !music.canNext);
    setClass(el.mArt, 'paused', !music.playing);
    for (const e of el.eqs) setClass(e, 'play', music.playing);
  }

  // ===========================================================================
  // Layout: pilih view + ukuran island
  // ===========================================================================
  const TAB_IDX = { timer: 0, alarm: 1, music: 2 };
  const TAB_W = 82;

  function activities() {
    const list = [];
    if (timer.state !== 'none') list.push({ kind: 'timer', since: timer.since });
    if (musicActive()) list.push({ kind: 'music', since: music.since });
    return list.sort((a, b) => b.since - a.since);
  }

  function expandedHeight() {
    if (tab === 'timer') return timer.state === 'none' ? 230 : 180;
    if (tab === 'alarm') return alarms.length > 2 ? 210 : 164;
    return musicActive() || music.active ? 200 : 132;
  }

  function syncExpanded() {
    $$('.tab').forEach((t) => setClass(t, 'active', t.dataset.tab === tab));
    setStyle($('#tab-hl'), 'transform', `translateX(${TAB_IDX[tab] * TAB_W}px)`);
    setClass($('#pane-timer'), 'on', tab === 'timer');
    setClass($('#pane-alarm'), 'on', tab === 'alarm');
    setClass($('#pane-music'), 'on', tab === 'music');
    setClass($('#t-setup'), 'on', timer.state === 'none');
    setClass($('#t-run'), 'on', timer.state !== 'none');
    setClass($('#m-full'), 'on', music.active);
    setClass($('#m-empty'), 'on', !music.active);
  }

  const cur = { view: '', bubble: '' };

  function applyLayout() {
    const acts = activities();
    const prim = acts[0], sec = acts[1];
    const mode = ringing ? 'ring' : expanded ? 'expanded' : prim ? 'compact' : 'idle';

    let view, w, h;
    if (mode === 'ring') { view = 'v-ring'; w = 400; h = 148; }
    else if (mode === 'expanded') { view = 'v-expanded'; w = 420; h = expandedHeight(); }
    else if (mode === 'compact') {
      view = prim.kind === 'music' ? 'v-cmusic' : 'v-ctimer';
      w = prim.kind === 'music' ? 190 : (timerRemaining() >= 3600 ? 182 : 152);
      h = 36;
    } else { view = 'v-idle'; w = 124; h = 36; }

    if (mode === 'idle' && hovered) { w = 138; h = 38; }
    else if (mode === 'compact' && hovered) { w += 8; h = 38; }

    if (view !== cur.view) {
      cur.view = view;
      views.forEach((v) => setClass(v, 'on', v.id === view));
      setClass(island, 'ringing', mode === 'ring');
    }
    if (mode === 'expanded') syncExpanded();
    setTargets(w, h);

    const bk = mode === 'compact' && sec ? sec.kind : '';
    if (bk !== cur.bubble) {
      cur.bubble = bk;
      if (bk) bubble.className = 'kind-' + bk;
      sb.t = bk ? 1 : 0;
      kick();
    }
  }

  function refresh() {
    updateTimerUI();
    updateMusicUI();
    applyLayout();
  }

  // ===========================================================================
  // Interaksi
  // ===========================================================================
  let collapseT = 0;
  const cancelCollapse = () => clearTimeout(collapseT);
  function scheduleCollapse(ms) {
    cancelCollapse();
    collapseT = setTimeout(() => {
      if (!hovered && !ringing) { expanded = false; applyLayout(); }
    }, ms);
  }
  function setTab(t) {
    tab = t;
    store.set('tab', t);
    if (expanded) syncExpanded();
  }
  function expand(t) {
    if (ringing) return;
    if (t) setTab(t);
    expanded = true;
    cancelCollapse();
    if (!hovered) scheduleCollapse(6000);
    applyLayout();
  }
  function collapse() { expanded = false; cancelCollapse(); applyLayout(); }

  // --- hit-test: area transparan tembus klik, island menerima klik ---
  function insideIsland(px, py) {
    const w = sw.x, h = sh.x, x = (WIN_W - w) / 2, m = 6;
    if (px >= x - m && px <= x + w + m && py >= 0 && py <= TOP + h + m) return true;
    if (sb.x > 0.5) {
      const bx = x + w + GAP;
      if (px >= bx - 4 && px <= bx + BUB + 4 && py >= TOP - 4 && py <= TOP + BUB + 4) return true;
    }
    return false;
  }
  function setInside(v) {
    if (v === hovered) return;
    hovered = v;
    setClass(island, 'hover', v);
    api.setIgnoreMouse(!v);
    if (v) cancelCollapse(); else if (expanded) scheduleCollapse(900);
    applyLayout();
  }
  window.addEventListener('mousemove', (e) => setInside(insideIsland(e.clientX, e.clientY)), { passive: true });
  document.documentElement.addEventListener('mouseleave', () => setInside(false));

  // --- klik pada island / gelembung ---
  island.addEventListener('click', (e) => {
    // klik pada tombol (Stop, Tutup, dll.) sudah ditangani sendiri; jangan buka ulang island
    if (e.target.closest('button') || ringing || expanded) return;
    const prim = activities()[0];
    if (prim) expand(prim.kind === 'music' ? 'music' : 'timer');
    else expand();
  });
  bubble.addEventListener('click', () => {
    const sec = activities()[1];
    if (sec) expand(sec.kind === 'music' ? 'music' : 'timer');
  });

  $('#btn-collapse').addEventListener('click', collapse);
  $$('.tab').forEach((t) => t.addEventListener('click', () => { setTab(t.dataset.tab); applyLayout(); }));

  // --- tahan tombol untuk mengulang ---
  function holdRepeat(btn, fn) {
    let t1 = 0, t2 = 0;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fn();
      t1 = setTimeout(() => { t2 = setInterval(fn, 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  }

  // --- timer ---
  holdRepeat($('#t-inc'), setupInc);
  holdRepeat($('#t-dec'), setupDec);
  $('#t-set-display').addEventListener('wheel', (e) => { e.preventDefault(); if (e.deltaY < 0) setupInc(); else setupDec(); }, { passive: false });
  $('#t-chips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    timer.setup = Number(b.dataset.sec);
    saveTimer(); updateTimerUI();
  });
  $('#t-start').addEventListener('click', () => timerStart(timer.setup));
  $('#t-pause').addEventListener('click', timerPauseResume);
  $('#t-cancel').addEventListener('click', timerCancel);
  $('#t-plus').addEventListener('click', () => timerAdd(60));

  // --- alarm ---
  $$('.chev').forEach((b) => holdRepeat(b, () => draftAdjust(b.dataset.a)));
  el.aH.addEventListener('wheel', (e) => { e.preventDefault(); draftAdjust(e.deltaY < 0 ? 'h+' : 'h-'); }, { passive: false });
  el.aM.addEventListener('wheel', (e) => { e.preventDefault(); draftAdjust(e.deltaY < 0 ? 'm+' : 'm-'); }, { passive: false });
  $('#a-add').addEventListener('click', addAlarm);
  el.aList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const row = e.target.closest('.a-row');
    if (!btn || !row) return;
    const a = alarms.find((x) => x.id === row.dataset.id);
    if (!a) return;
    if (btn.dataset.act === 'toggle') a.enabled = !a.enabled;
    else if (btn.dataset.act === 'repeat') a.repeat = !a.repeat;
    else if (btn.dataset.act === 'del') alarms = alarms.filter((x) => x !== a);
    saveAlarms(); renderAlarms(); applyLayout();
  });

  // --- ringing ---
  $('#r-stop').addEventListener('click', stopRing);
  el.rSnooze.addEventListener('click', snoozeRing);

  // --- musik ---
  el.mPlay.addEventListener('click', musicToggle);
  el.mPrev.addEventListener('click', () => musicSkip('prev'));
  el.mNext.addEventListener('click', () => musicSkip('next'));
  $('#m-bar-hit').addEventListener('click', (e) => {
    const r = $('#m-bar-hit .bar').getBoundingClientRect();
    musicSeek((e.clientX - r.left) / r.width);
  });

  // pintasan global (Ctrl+Alt+Space)
  api.onToggle(() => { if (ringing) return; if (expanded) collapse(); else expand(); });

  // ===========================================================================
  // Boot
  // ===========================================================================
  function tick() {
    checkTimer();
    checkAlarms();
    const d = new Date();
    setText(el.idleTime, fmtClock(d));
    setText(el.expClock, fmtClock(d));
    updateTimerUI();
    updateMusicUI();
    applyLayout();
  }

  renderAlarms();
  updateDraft();
  tick();
  paint();
  setInterval(tick, 250);
})();
