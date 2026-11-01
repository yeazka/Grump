'use strict';
/* =====================================================================
   CORE: helper, ikon, bridge, spring physics, layout, pager, hit-test
   (semua file js/*.js berbagi scope global yang sama)
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idGen = () => Math.random().toString(36).slice(2, 9);
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const cache = {};
function setText(id, v) { if (cache[id] === v) return; cache[id] = v; $('#' + id).textContent = v; }
function setHTML(id, v) { if (cache['h' + id] === v) return false; cache['h' + id] = v; $('#' + id).innerHTML = v; return true; }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Ikon ---------- */
const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${inner}</svg>`;
const ST = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  play:  svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/>'),
  pause: svg('<rect x="6" y="5" width="4.2" height="14" rx="1.3" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3" fill="currentColor"/>'),
  stop: svg('<rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/>'),
  next:  svg('<path d="M4.5 6.2v11.6a.8.8 0 0 0 1.25.66l8.3-5.8a.8.8 0 0 0 0-1.32l-8.3-5.8a.8.8 0 0 0-1.25.66z" fill="currentColor"/><rect x="15.5" y="5.2" width="3.4" height="13.6" rx="1.3" fill="currentColor"/>'),
  prev:  svg('<path d="M19.5 6.2v11.6a.8.8 0 0 1-1.25.66l-8.3-5.8a.8.8 0 0 1 0-1.32l8.3-5.8a.8.8 0 0 1 1.25.66z" fill="currentColor"/><rect x="5.1" y="5.2" width="3.4" height="13.6" rx="1.3" fill="currentColor"/>'),
  chat:  svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 10h.01M15 10h.01M9 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  back:  svg('<path d="M15 5l-7 7 7 7"/>', ST),
  right: svg('<path d="M9 5l7 7-7 7"/>', ST),
  plus:  svg('<path d="M12 5v14M5 12h14"/>', ST),
  minus: svg('<path d="M5 12h14"/>', ST),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', ST),
  x:     svg('<path d="M6 6l12 12M18 6L6 18"/>', ST),
  up:    svg('<path d="M6 15l6-6 6 6"/>', ST),
  down:  svg('<path d="M6 9l6 6 6-6"/>', ST),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ST),
  note:  svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', ST),
  bell:  svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', ST),
  moon:  svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', ST),
  location: svg('<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', ST),
  quiet: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', ST),
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M12 2.5v3.5"/>', ST),
  focus: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>', ST),
  drop:  svg('<path d="M12 3s6.5 6.5 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.5 12 3 12 3z"/>', ST),
  gear:  svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', ST),
  exit:  svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', ST),
  mic:   svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', ST),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', ST),
  reset: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.5M3.5 3.5v5h5"/>', ST),
  file:  svg('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>', ST),
  battery: svg('<rect x="2.5" y="7" width="16" height="10" rx="2.2"/><path d="M21.5 11v2"/>', ST),
  bolt:  svg('<path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12z"/>', ST),
  wifi:  svg('<path d="M3 9.5a14 14 0 0 1 18 0M6.5 13a9 9 0 0 1 11 0M10 16.5a4 4 0 0 1 4 0M12 20h.01"/>', ST),
  wifioff: svg('<path d="M3 9.5a14 14 0 0 1 4-2.3M17 7.2a14 14 0 0 1 4 2.3M6.5 13a9 9 0 0 1 3-1.8M14.5 11.2A9 9 0 0 1 17.5 13M12 20h.01M3 3l18 18"/>', ST),
  ethernet: svg('<rect x="3" y="3" width="6" height="5" rx="1"/><rect x="9" y="16" width="6" height="5" rx="1"/><rect x="15" y="3" width="6" height="5" rx="1"/><path d="M6 8v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8M12 12v4"/>', ST),
  tray:  svg('<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>', ST),
  spotify: svg('<circle cx="12" cy="12" r="10" fill="#1ed760"/><path d="M7 9.3c3.4-.6 6.9-.4 9.9 1.2M7.8 12.2c2.8-.5 5.8-.3 8.3 1M8.6 15.1c2.3-.4 4.8-.2 6.9.8" stroke="#121212" stroke-width="1.85" stroke-linecap="round" fill="none"/>'),
  youtube: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="3.8" fill="#ff0000"/><polygon points="10,8.8 15.5,12 10,15.2" fill="#ffffff"/>'),
  apple: svg('<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.02-.49 2.64-1.24z" fill="#fa2d48"/>'),
  soundcloud: svg('<path d="M2 14v-2M4 15.5v-5M6 16.5v-7M8 17.5v-9M10 18v-9.5M12 18V7M14 18a4.5 4.5 0 0 0 4.5-4.5 4 4 0 0 0-3.6-3.98A5.5 5.5 0 0 0 14 18z" fill="#ff5500" stroke="#ff5500" stroke-width="1.2" stroke-linecap="round"/>'),
  headphones: svg('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>', ST),
  bluetooth: svg('<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  volume: svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9.5 9.5 0 0 1 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-med': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-low': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M14.5 10a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-mute': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  brightness: svg('<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  'brightness-low': svg('<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 3v2M12 19v2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M3 12h2M19 12h2M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
};
ICONS.prev = ICONS.next;
const icoOf = (n) => ICONS[n] || '';
function setIco(root = document) { $$('[data-ico]', root).forEach((el) => { el.innerHTML = ICONS[el.dataset.ico] || ''; }); }
setIco();

/* ---------- Bridge (Electron) atau mock (browser, untuk uji) ---------- */
function makeMock() {
  let mediaCb = () => {}, dropCb = () => {};
  const c = document.createElement('canvas'); c.width = c.height = 120;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 120, 120);
  gr.addColorStop(0, '#ff375f'); gr.addColorStop(1, '#5e5ce6'); g.fillStyle = gr; g.fillRect(0, 0, 120, 120);
  const art = c.toDataURL('image/png').split(',')[1];
  const m = { active: true, title: 'Blinding Lights', artist: 'The Weeknd', status: 'Playing', pos: 42, dur: 200, mime: 'image/png', thumb: art, app: 'Spotify.exe' };
  const LRC = ['[00:00.00]', '[00:30.00]I been tryna call', '[00:36.00]I been on my own for long enough', '[00:42.00]Maybe you can show me how to love, maybe',
    '[00:48.00]I\'m going through withdrawals', '[00:54.00]You don\'t even have to do too much', '[01:00.00]You can turn me on with just a touch, baby',
    '[01:06.00]I look around and Sin City\'s cold and empty', '[01:12.00]No one\'s around to judge me', '[01:18.00]I can\'t see clearly when you\'re gone'].join('\n');
  return {
    mock: true,
    onMedia(f) { mediaCb = f; if (!location.search.includes('nomedia')) setTimeout(() => mediaCb({ ...m }), 250); },
    onPointer() {}, onSettings() {}, onDrop(f) { dropCb = f; window.__mockDrop = (p) => dropCb(p); },
    mediaCmd(cmd) { if (cmd === 'toggle') { m.status = m.status === 'Playing' ? 'Paused' : 'Playing'; mediaCb({ ...m, thumb: undefined }); } },
    rect() {}, getLyrics: () => Promise.resolve(LRC),
    fileInfo: (p) => Promise.resolve({ name: p.split(/[\\/]/).pop(), size: 1234567, isDir: false }),
    startDrag() {}, setFocusable() {}, forceShow() {}, quit() {},
    onSysState(f) { setTimeout(() => f({ volume: 50, brightness: 50 }), 100); },
    setVolume() {}, setBrightness() {},
  };
}
const bridge = window.dynIsland || makeMock();

/* ---------- Spring physics ---------- */
class Spring {
  constructor(v, k, c) { this.x = v; this.v = 0; this.t = v; this.k = k; this.c = c; }
  step(dt) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; }
  get done() { return Math.abs(this.x - this.t) < 0.2 && Math.abs(this.v) < 0.4; }
}
// [lebar, tinggi, radius] — Semua menu expanded 1 ukuran (392x196) agar tidak nge-warp
const EXP_SIZE = [392, 196, 40];
const SIZES = {
  idle: [124, 36, 18], minimal: [150, 6, 3], tuck: [56, 22, 11], peekaboo: [56, 22, 11], quiettuck: [68, 7, 3.5], tuckhide: [38, 19, 14], compact: [312, 36, 18], work: [128, 32, 16], notice: [300, 40, 20], prompt: [320, 42, 21], charge: [296, 44, 22], headset: [312, 44, 22],
  home: EXP_SIZE, music: EXP_SIZE, lyrics: EXP_SIZE, timer: EXP_SIZE, stash: EXP_SIZE, addons: EXP_SIZE, todo: EXP_SIZE, notes: EXP_SIZE, prayer: EXP_SIZE, water: EXP_SIZE, connectivity: EXP_SIZE, timerpreview:[300,66,30], prayernotice:[300,66,30], waternotice:[300,66,30], tasknotice:[300,66,30],
};
const PAGE_OF = { home: 'home', music: 'music', lyrics: 'music', timer:'timer', stash:'stash', addons:'addons', todo:'todo', notes:'notes', prayer:'prayer', water:'water' };
const island = $('#island');
function applyIslandTransparency() {
  const transparency = Math.max(0, Math.min(70, Number(S.settings?.islandTransparency) || 0));
  island.style.opacity = '1';
  island.style.setProperty('--island-surface-alpha', String(1 - transparency / 100));
}
function islandSurfaceColor(red = 0, green = 0, blue = 0, baseAlpha = 1) {
  const alpha = Math.max(0, Math.min(1, Number(island.style.getPropertyValue('--island-surface-alpha')) || 1));
  return `rgba(${red}, ${green}, ${blue}, ${(baseAlpha * alpha).toFixed(3)})`;
}
const WIN_W = 440;
const sw = new Spring(124, 400, 26), sh = new Spring(36, 320, 18), sr = new Spring(18, 540, 36);
let lyricWidthTween = null;
let animating = false, lastTs = 0, lastRectSig = '';

function isTimerActive() {
  return typeof timerState !== 'undefined' && timerState && (timerState.status === 'running' || timerState.status === 'paused');
}

function buildNotchPaths(w, h, rOut, rBot) {
  rOut = Math.max(1, Math.min(rOut, Math.max(1, h * 0.46)));
  rBot = Math.max(1, Math.min(rBot, Math.max(1, h * 0.49)));
  const c = rOut * 0.4477;
  const x0 = 0, y0 = 0;
  const x1 = rOut, y1 = rOut;
  const x2 = rOut, y2 = Math.max(y1, h - rBot);
  const x3 = rOut + rBot, y3 = h;
  const x4 = rOut + w - rBot, y4 = h;
  const x5 = rOut + w, y5 = Math.max(y1, h - rBot);
  const x6 = rOut + w, y6 = rOut;
  const x7 = 2 * rOut + w, y7 = 0;

  const stroke = `M ${x0} ${y0} ` +
    `C ${(x0 + c).toFixed(2)} 0 ${x1} ${(y1 - c).toFixed(2)} ${x1} ${y1} ` +
    `L ${x1} ${y2.toFixed(2)} ` +
    `A ${rBot} ${rBot} 0 0 0 ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `L ${x4.toFixed(2)} ${y4.toFixed(2)} ` +
    `A ${rBot} ${rBot} 0 0 0 ${x5.toFixed(2)} ${y5.toFixed(2)} ` +
    `L ${x6} ${y6.toFixed(2)} ` +
    `C ${x6} ${(y6 - c).toFixed(2)} ${(x7 - c).toFixed(2)} 0 ${x7} 0`;
  const fill = stroke + ' Z';
  return { stroke, fill };
}

let isTuckDodging = false;
let isSpotifyDodging = false;
let targetDodgeW = 56, targetDodgeH = 22, targetDodgeR = 11;

function reportRect() {
  if (curKey === 'tuckhide' || (curKey === 'tuck' && isTuckDodging)) {
    const sig = '-9999,-9999,0,0';
    if (sig !== lastRectSig) { lastRectSig = sig; bridge.rect({ left: -9999, top: -9999, width: 0, height: 0 }); }
    return;
  }
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && curKey !== 'timerpreview' && curKey !== 'prayernotice' && curKey !== 'waternotice' && curKey !== 'tasknotice') || curKey === 'tuck' || curKey === 'peekaboo' || curKey === 'quiettuck';
  const isTop = isAnchored;
  const rw = (curKey === 'tuck' || curKey === 'peekaboo') ? Math.round(sw.t) : (curKey === 'quiettuck' ? 68 : Math.round(sw.t));
  const rh = island.dataset.connectivityOpen === '1' ? Math.max(Math.round(sh.t), 238) : ((curKey === 'tuck' || curKey === 'peekaboo') ? Math.round(sh.t) : (curKey === 'quiettuck' ? 7 : Math.round(sh.t)));
  const tight = S.creativeNear === true || isSpotifyDodging;
  const rl = Math.round((window.innerWidth - rw) / 2);
  const rt = isTop ? 0 : 10;
  const sig = `${rl},${rt},${rw},${rh},${tight ? 1 : 0}`;
  if (sig !== lastRectSig) { lastRectSig = sig; bridge.rect({ left: rl, top: rt, width: rw, height: rh, tight }); }
}
function paintIsland() {
  const w = sw.x;
  const h = sh.x;
  island.style.width = w.toFixed(2) + 'px';
  island.style.height = h.toFixed(2) + 'px';
  const r = Math.max(0, sr.x).toFixed(2) + 'px';
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && curKey !== 'timerpreview' && curKey !== 'prayernotice' && curKey !== 'waternotice' && curKey !== 'tasknotice') || curKey === 'tuck' || curKey === 'peekaboo' || curKey === 'quiettuck';
  
  const svg = $('#island-notch-svg');
  if (isAnchored) {
    island.dataset.anchored = '1';
    island.style.top = '0px';
    island.style.borderRadius = `0 0 ${r} ${r}`;
    
    if (svg) {
      svg.style.display = 'block';
      const rOut = curKey === 'quiettuck' ? 6 : (curKey === 'tuck' && isTuckDodging ? 3 : ((curKey === 'tuck' || curKey === 'peekaboo') ? 12 : (S.expanded ? 20 : 16)));
      const rBot = Math.round(sr.x);
      const { stroke, fill } = buildNotchPaths(w, h, rOut, rBot);
      svg.style.left = `-${rOut}px`;
      svg.style.width = `${(w + 2 * rOut).toFixed(2)}px`;
      svg.style.height = `${h.toFixed(2)}px`;
      svg.setAttribute('viewBox', `0 0 ${(w + 2 * rOut).toFixed(2)} ${h.toFixed(2)}`);

      const fillEl = $('#notch-fill');
      const strokeEl = $('#notch-stroke');
      const angryEl = $('#notch-angry');
      if (fillEl) fillEl.setAttribute('d', fill);
      if (strokeEl) strokeEl.setAttribute('d', stroke);
      const ringEl = $('#notch-ring');
      if (ringEl) ringEl.setAttribute('d', stroke);
      if (angryEl) angryEl.setAttribute('d', stroke);

      const isAngry = island.dataset.angry === '1';
      const isQuiet = S.settings && !!S.settings.quiet;
      const isCaps = curKey === 'notice' && island.dataset.caps === '1';
      const theme = island.dataset.theme || 'default';
      const angryVar = (S.settings && S.settings.angryVariant) || island.dataset.angryVariant || 'pink';
      island.dataset.angryVariant = angryVar;
      if (angryEl) {
        angryEl.style.opacity = (isAngry && !isQuiet && angryVar !== 'dragon') ? '1' : '0';
        if (angryVar === 'pink') {
          angryEl.setAttribute('stroke', '#ff2d85');
          angryEl.setAttribute('stroke-width', '2.2');
          angryEl.style.filter = 'drop-shadow(0 0 6px rgba(255, 45, 133, 0.85))';
        } else if (angryVar === 'lightning') {
          angryEl.setAttribute('stroke', '#38bdf8');
          angryEl.setAttribute('stroke-width', '2');
          angryEl.style.filter = 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.85))';
        } else if (angryVar === 'ember') {
          angryEl.setAttribute('stroke', '#ff9f0a');
          angryEl.setAttribute('stroke-width', '2');
          angryEl.style.filter = 'drop-shadow(0 0 7px rgba(255, 159, 10, 0.85))';
        } else if (angryVar === 'flame') {
          angryEl.setAttribute('stroke', '#f97316');
          angryEl.setAttribute('stroke-width', '2');
          angryEl.style.filter = 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.85))';
        } else if (angryVar === 'gold-matrix') {
          angryEl.setAttribute('stroke', '#ff8517');
          angryEl.setAttribute('stroke-width', '2');
          angryEl.style.filter = 'drop-shadow(0 0 5px rgba(255, 128, 12, .78))';
        } else if (angryVar === 'gpt-pixels') {
          angryEl.setAttribute('stroke', 'url(#gpt-notch-gradient)');
          angryEl.setAttribute('stroke-width', '1.35');
          angryEl.style.filter = 'drop-shadow(0 0 3px rgba(117,205,255,.85)) drop-shadow(0 0 8px rgba(163,112,255,.62))';
        } else if (angryVar === 'cyber-violet' || angryVar === 'cyber-amber') {
          const violet = angryVar === 'cyber-violet';
          angryEl.setAttribute('stroke', violet ? '#8b5cff' : '#ff9d00');
          angryEl.setAttribute('stroke-width', '1.8');
          angryEl.style.filter = 'none';
        } else {
          angryEl.setAttribute('stroke', '#ff2626');
          angryEl.setAttribute('stroke-width', '1.8');
          angryEl.style.filter = 'drop-shadow(0 0 6px rgba(255, 38, 38, 0.85))';
        }
      }
      if (strokeEl) {
        strokeEl.style.opacity = isCaps || (theme === 'outline-glass' && !isAngry) ? '1' : '0';
        if (isCaps) {
          strokeEl.setAttribute('stroke', '#70e69b');
          strokeEl.setAttribute('stroke-width', '1.6');
          strokeEl.style.filter = 'drop-shadow(0 0 5px rgba(112,230,155,.75))';
        } else if (isQuiet) {
          // Quiet mode: golden/amber ambient outline
          strokeEl.setAttribute('stroke', '#eab308');
          strokeEl.setAttribute('stroke-width', '1.6');
          strokeEl.style.filter = 'none';
        } else if (theme === 'outline-glass') {
          strokeEl.setAttribute('stroke', 'rgba(255, 255, 255, 0.45)');
          strokeEl.setAttribute('stroke-width', '1.6');
          strokeEl.style.filter = 'none';
        } else {
          strokeEl.setAttribute('stroke', 'rgba(255, 255, 255, 0.18)');
          strokeEl.setAttribute('stroke-width', '1.2');
          strokeEl.style.filter = 'none';
        }
      }

      if (fillEl) {
        if (S.expanded && curKey === 'prayer') {
          fillEl.setAttribute('fill', islandSurfaceColor());
        } else if (S.expanded && (curKey === 'addons' || curKey === 'stash')) {
          fillEl.setAttribute('fill', islandSurfaceColor(20, 20, 24));
        } else if (S.expanded && curKey === 'timer') {
          fillEl.setAttribute('fill', islandSurfaceColor());
        } else if (theme === 'full-glass') {
          fillEl.setAttribute('fill', S.expanded ? islandSurfaceColor(16, 16, 22, .85) : islandSurfaceColor(16, 16, 22, .60));
        } else if (S.expanded) {
          fillEl.setAttribute('fill', islandSurfaceColor(16, 16, 20, .85));
        } else {
          fillEl.setAttribute('fill', islandSurfaceColor());
        }
      }
    }
  } else {
    island.dataset.anchored = '0';
    island.style.top = '10px';
    island.style.borderRadius = r;
    if (svg) svg.style.display = 'none';
  }

  // Island box stays strictly at position transform: inner view content never squishes or scales
  island.style.transform = 'translate3d(-50%, 0, 0)';
}
function frame(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 1 / 20);
  lastTs = ts;
  const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
  for (let i = 0; i < n; i++) { if (!lyricWidthTween) sw.step(h); sh.step(h); sr.step(h); }
  if (lyricWidthTween) {
    const progress = clamp((ts - lyricWidthTween.started) / 420, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    sw.x = lyricWidthTween.from + (lyricWidthTween.to - lyricWidthTween.from) * eased;
    sw.v = 0;
    if (progress === 1) lyricWidthTween = null;
  }
  if (!lyricWidthTween && sw.done && sh.done && sr.done) {
    sw.x = sw.t; sh.x = sh.t; sr.x = sr.t; sw.v = sh.v = sr.v = 0;
    paintIsland(); reportRect(); animating = false; mockHit(); return;
  }
  paintIsland(); mockHit();
  requestAnimationFrame(frame);
}
function kick() {
  reportRect();
  if (!animating) { animating = true; lastTs = performance.now(); requestAnimationFrame(frame); }
}

/* ---------- State ---------- */
const S = {
  expanded: false, view: 'home', peek: null, ring: null, notice: null, charge: null, headset: null, workActivity: null,
  lastPage: 'home', focusLock: false, activityAt: Date.now(),
  settings: { mascot: true, minimal: false, autoTuck: true, language: 'en' }, addonPages: [], miniPopup:null,
  tuckApp: false,
  browserVerticalTabs: false,
  creativeApp: false,
  creativeNear: false,
  shyTuck: false,
  peekaboo: false,
  dropHot: false,
};
const isId = () => S.settings?.language === 'id';
let curKey = null, peekT = null, noticeT = null, chargeT = null, headsetT = null, peekabooT = null, initialPeekT = null, shyTuckT = null, shyPeekT = null, glassRingT = null;
const renderers = [];     // fungsi render, dipanggil tiap layout()
const ticks = [];         // fungsi periodik (200ms)
const acts = {};          // aksi tombol [data-act]
const holds = {};         // aksi tombol tahan [data-hold]
const enterHooks = {};    // dipanggil saat view tertentu aktif

// diisi modul lain (dipanggil saat runtime)
const activityProviders = [];
const hasActivity = () => activityProviders.some((f) => f());

function pageList() {
  return [
    'home',
    S.settings.menuMusic !== false ? 'music' : null,
    ...['todo', 'notes'].filter(page => S.addonPages.includes(page)),
    ...S.addonPages.filter(page => page !== 'todo' && page !== 'notes'),
    S.settings.menuTimer !== false ? 'timer' : null,
    S.settings.menuStash !== false ? 'stash' : null,
    S.addonPages.length < (typeof ADDONS === 'object' && ADDONS ? Object.keys(ADDONS).length : 5) ? 'addons' : null
  ].filter(Boolean);
}
const pageTarget = (p) => p;

let refractT = null;
function triggerWhiteRefraction() {
  /* Kilatan cahaya putih dihilangkan total sesuai instruksi */
}

function triggerGlassRing() {
  if (curKey === 'tuck') return;
  island.classList.remove('glass-ring');
  void island.offsetWidth;
  island.classList.add('glass-ring');
  clearTimeout(glassRingT);
  glassRingT = setTimeout(() => island.classList.remove('glass-ring'), 2450);
}

function wantKey() {
  if (S.ring) return 'ring';
  if (S.charge) return 'charge';
  if (S.headset) return 'headset';
  if (S.prompt) return 'prompt';
  if (S.miniPopup) return S.miniPopup.kind;
  if (S.expanded) {
    if (S.view === 'addons' && !pageList().includes('addons')) S.view = S.addonPages.at(-1) || 'home';
    return S.view;
  }
  if (S.notice) return 'notice';
  const musicActive = typeof hasMusic === 'function' && hasMusic();
  if (S.settings && S.settings.quiet && !inside && !musicActive) return 'quiettuck';
  if (S.tuckApp && S.settings.autoTuck !== false && !inside) return 'tuck';
  if (S.workActivity) return 'work';
  if (S.peekaboo && S.settings.autoTuck !== false && !inside && !musicActive) return 'peekaboo';
  if (S.peek) return S.peek;
  if (hasActivity()) return 'compact';
  return S.settings.minimal ? 'minimal' : 'idle';
}
function layout() {
  if (isSliding) return;
  island.dataset.browser = S.tuckApp ? '1' : '0';
  const musicActive = typeof hasMusic === 'function' && hasMusic();
  const pk = $('#v-peekaboo');
  const isTucked = (curKey === 'tuck' || curKey === 'peekaboo' || S.tuckApp);
  if (pk) pk.dataset.music = (musicActive && !isTucked) ? '1' : '0';
  const k = wantKey();
  const changed = k !== curKey;
  curKey = k;
  island.dataset.caps = k === 'notice' && $('#v-notice').dataset.caps === '1' ? '1' : '0';
  applyIslandTransparency();
  renderAll();
  const isTimerOn = (k === 'idle' && isTimerActive());
  const isCompactTimer = (k === 'compact' && isTimerActive());
  const [baseW,baseH]=[clamp(Number(S.settings.islandWidth)||128,96,260),clamp(Number(S.settings.islandHeight)||32,30,80)];
  const isIdleInfo = (k === 'idle' && !isTimerOn && !!S.idleInfoActive);
  const idleW = isIdleInfo ? Math.max(baseW + 90, 222) : baseW;
  const creativeFocus = k === 'idle' && S.creativeNear && !isTimerOn && !isIdleInfo;
  const idleH = creativeFocus ? Math.max(20, baseH * .7) : baseH;
  const spotifyCompactWidth = isTimerOn ? Math.max(184,baseW) : (isCompactTimer ? SIZES.compact[0]+36 : SIZES.compact[0]);
  const [w, h, r] = isSpotifyDodging ? [spotifyCompactWidth, 25, 12.5] : (isTimerOn ? [Math.max(184,baseW), Math.max(36,baseH), Math.min(Math.max(36,baseH)/2,24)] : (isCompactTimer ? [SIZES.compact[0]+36, 36, 18] : (k === 'tuck' && isTuckDodging ? [targetDodgeW, targetDodgeH, targetDodgeR] : (k === 'idle' ? [idleW,idleH,Math.min(idleH/2,24)] : (k === 'work' ? [clamp(Number(S.workWidth)||128,128,392),32,16] : (k === 'notice' && island.dataset.caps === '1' ? [174,40,20] : SIZES[k]))))));
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && k !== 'timerpreview' && k !== 'prayernotice' && k !== 'waternotice' && k !== 'tasknotice') || k === 'tuck' || k === 'peekaboo' || k === 'quiettuck';
  const dockChanged = (island.dataset.anchored === '1') !== isAnchored;
  const sizeChanged = Math.abs(sw.t - w) > 0.5 || Math.abs(sh.t - h) > 0.5 || Math.abs(sr.t - r) > 0.5;
  if (!changed && !sizeChanged && !dockChanged) { renderPager(); return; }
  const growing = w > sw.x || h > sh.x;
  if (isAnchored) {
    if (growing && S.expanded) {
      // Warping shrink anticipation on the box: box pulls inward momentarily before morphing open
      sw.v = -140;
      sh.v = -90;
      sw.k = 420; sw.c = 28;
      sh.k = 360; sh.c = 26;
    } else {
      sw.k = 420; sw.c = 30;
      sh.k = growing ? 350 : 420; sh.c = growing ? 24 : 32;
    }
    sr.k = 540; sr.c = 36;
  } else {
    if (growing && S.expanded) {
      // Warping shrink anticipation on the box
      sw.v = -140;
      sh.v = -90;
      sw.k = 440; sw.c = 28;
      sh.k = 370; sh.c = 26;
    } else {
      sw.k = growing ? 480 : 580; sw.c = growing ? 28 : 38;
      sh.k = growing ? 380 : 560; sh.c = growing ? 24 : 37;
    }
    sr.k = 600; sr.c = 40;
  }
  if ((k === 'compact' && !changed || k === 'work') && Math.abs(sw.t - w) > 0.5) {
    lyricWidthTween = { from: sw.x, to: w, started: performance.now() };
  } else if (k !== 'compact' && k !== 'work') {
    lyricWidthTween = null;
  }
  sw.t = w; sh.t = h; sr.t = r; kick();
  $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + (k === 'minimal' || k === 'tuckhide' ? 'none' : (k === 'tuck' ? 'peekaboo' : k))));
  island.dataset.key = k;
  island.dataset.paged = (S.expanded && PAGE_OF[k]) ? '1' : '0';
  island.dataset.expanded = (S.expanded || k === 'ring') ? '1' : '0';
  if (bridge.setExpanded) bridge.setExpanded(S.expanded);
  island.dataset.idleInfo = isIdleInfo ? '1' : '0';
  if (PAGE_OF[k]) S.lastPage = PAGE_OF[k];
  renderPager();
  if (enterHooks[k]) enterHooks[k]();
  if (k !== 'idle' && k !== 'minimal' && k !== 'tuck' && k !== 'peekaboo' && k !== 'tuckhide') S.activityAt = Date.now();
  if (bridge.setMouseActive) bridge.setMouseActive(inside || S.expanded || S.dragLock || S.focusLock || k==='timerpreview');
  bridge.forceShow(!!(S.ring || S.charge || S.headset || S.prompt || S.miniPopup));
}
function go(view) {
  if (view === 'addons' && !pageList().includes('addons')) view = S.addonPages.at(-1) || 'home';
  if (isTuckDodging) resetDodgeState();
  if(S.view==='timer' && view!=='timer' && typeof closeCustomTimer==='function')closeCustomTimer();
  const wasExpanded = S.expanded;
  if (wasExpanded && PAGE_OF[curKey] && PAGE_OF[view] && PAGE_OF[curKey] !== PAGE_OF[view]) {
    const list = pageList();
    const curIdx = list.indexOf(PAGE_OF[curKey]);
    const targetIdx = list.indexOf(PAGE_OF[view]);
    const dir = targetIdx >= curIdx ? 1 : -1;
    slideToView(view, dir);
    return;
  }
  S.expanded = true; S.view = view; S.peek = null; clearTimeout(peekT);
  if (bridge.setMouseActive) bridge.setMouseActive(true);
  layout();
}
function collapse() {
  if (S.focusLock || S.dragLock) return;
  S.expanded = false; S.peek = null; clearTimeout(peekT);
  if (bridge.setMouseActive) bridge.setMouseActive(inside || S.dragLock || S.focusLock);
  layout();
}
function peek(key, ms) {
  if (S.expanded || S.ring) return;
  S.peek = key; clearTimeout(peekT);
  peekT = setTimeout(() => { S.peek = null; layout(); }, ms);
  layout();
  triggerGlassRing();
}
function notice(icon, text, ms = 2800) {
  if (S.ring || (S.settings.quiet && icon !== 'moon' && icon !== 'quiet')) return;
  $('#v-notice').dataset.compact = /^Download(?:ing|ed):/.test(text) ? '1' : '0';
  $('#v-notice').dataset.caps = icon === 'caps' ? '1' : '0';
  const el = $('#n-ico'); el.dataset.ico = icon; el.innerHTML = icon === 'caps' ? '' : icoOf(icon);
  setText('n-text', text);
  S.notice = { icon, text };
  clearTimeout(noticeT);
  noticeT = setTimeout(() => { S.notice = null; layout(); }, ms);
  layout();
  triggerGlassRing();
}
let miniPopupTimer=null;
function showMiniPopup(kind,ms){
  if(S.ring)return;
  clearTimeout(miniPopupTimer);
  S.expanded=false;S.peek=null;S.notice=null;S.miniPopup={kind};
  layout();
  miniPopupTimer=setTimeout(()=>dismissMiniPopup(),ms);
}
function dismissMiniPopup(){
  clearTimeout(miniPopupTimer);miniPopupTimer=null;
  if(!S.miniPopup)return;
  S.miniPopup=null;layout();
}
function openDefault() {
  go('home');
}
function openFromIsland() {
  if (typeof isPlaying === 'function' && isPlaying()) {
    go('music');
  } else {
    openDefault();
  }
}

/* ---------- Pager (panah + titik + slide transisi) ---------- */
let isSliding = false;
let slideTimeout = null;

function renderPager() {
  const pg = PAGE_OF[curKey] || S.view || 'home';
  const list = pageList();
  const showPager = !bridge.mock && !!pg && S.expanded && list.length > 1;
  $('#pager').classList.toggle('on', showPager);
  island.dataset.paged = showPager ? '1' : '0';
  island.dataset.expanded = (S.expanded || curKey === 'ring') ? '1' : '0';
  if (!showPager) return;
  const names=isId()?{home:'Beranda',music:'Musik',timer:'Timer',stash:'Simpan File',addons:'Tambah fitur',todo:'Tugas',notes:'Catatan',prayer:'Sholat',water:'Minum'}:{home:'Dashboard',music:'Music',timer:'Timer',stash:'File Stash',addons:'Add features',todo:'To-do',notes:'Notes',prayer:'Prayer',water:'Water'};
  const html = list.map((p) => `<i role="button" tabindex="0" aria-label="${names[p]}" title="${names[p]}" class="${p === pg ? 'on' : ''}" data-act="goto" data-p="${p}"></i>`).join('');
  setHTML('dots', html);
}

function slideToView(nextView, d) {
  if (isSliding) return;
  if(S.view==='timer' && nextView!=='timer' && typeof closeCustomTimer==='function')closeCustomTimer();
  const list = pageList();
  if (list.length <= 1) return;

  const curPage = PAGE_OF[curKey] || S.view || 'home';
  if (curPage === nextView) return;

  const curEl = $('#v-' + curPage);
  const nextEl = $('#v-' + nextView);
  if (!curEl || !nextEl) {
    S.expanded = true;
    S.view = nextView;
    layout();
    return;
  }

  isSliding = true;
  S.expanded = true;
  S.view = nextView;
  curKey = nextView;

  // Render konten sebelum animasi
  renderAll();
  renderPager();

  const dir = d >= 0 ? 1 : -1;
  const W_SLIDE = 392;

  island.classList.add('paged-sliding');
  curEl.classList.add('sliding', 'on');
  nextEl.classList.add('sliding', 'on');

  // Posisi awal
  curEl.style.transition = 'none';
  nextEl.style.transition = 'none';
  curEl.style.transform = 'translate3d(-50%, 0, 0) scale(1)';
  curEl.style.opacity = '1';
  curEl.style.visibility = 'visible';

  nextEl.style.transform = `translate3d(calc(-50% + ${dir * W_SLIDE}px), 0, 0) scale(0.96)`;
  nextEl.style.opacity = '0';
  nextEl.style.visibility = 'visible';

  // Force reflow agar transisi CSS terpancing
  void nextEl.offsetWidth;

  // Transisi horizontal slide-in halus ala Apple iOS
  const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const DURATION = '340ms';
  curEl.style.transition = `transform ${DURATION} ${EASING}, opacity ${DURATION} cubic-bezier(0.2, 0.9, 0.3, 1)`;
  nextEl.style.transition = `transform ${DURATION} ${EASING}, opacity ${DURATION} cubic-bezier(0.2, 0.9, 0.3, 1)`;

  curEl.style.transform = `translate3d(calc(-50% + ${-dir * W_SLIDE}px), 0, 0) scale(0.96)`;
  curEl.style.opacity = '0';
  nextEl.style.transform = 'translate3d(-50%, 0, 0) scale(1)';
  nextEl.style.opacity = '1';

  clearTimeout(slideTimeout);
  slideTimeout = setTimeout(() => {
    curEl.classList.remove('sliding', 'on');
    curEl.style.transition = '';
    curEl.style.transform = '';
    curEl.style.opacity = '';
    curEl.style.visibility = '';

    nextEl.classList.remove('sliding');
    nextEl.classList.add('on');
    nextEl.style.transition = '';
    nextEl.style.transform = '';
    nextEl.style.opacity = '';
    nextEl.style.visibility = '';

    island.classList.remove('paged-sliding');
    isSliding = false;
    layout();
  }, 350);
}

function pageStep(d) {
  if (bridge.mock) return;
  const list = pageList();
  if (list.length <= 1) return;
  const i = list.indexOf(PAGE_OF[curKey] || 'home');
  const nextView = pageTarget(list[(i + d + list.length) % list.length]);
  slideToView(nextView, d);
}

acts.pgprev = () => pageStep(-1);
acts.pgnext = () => pageStep(1);
acts.goto = (el) => {
  const p = el.dataset.p;
  if (p === 'music' && typeof unDismissMedia === 'function') unDismissMedia();
  const list = pageList();
  const curIdx = list.indexOf(PAGE_OF[curKey] || 'home');
  const targetIdx = list.indexOf(p);
  const dir = targetIdx >= curIdx ? 1 : -1;
  slideToView(pageTarget(p), dir);
};
acts.home = () => go('home');
acts.settings = () => {
  collapse();
  if (bridge.openSettingsWindow) bridge.openSettingsWindow();
};

/* ---------- Render ---------- */
function renderAll() { for (const f of renderers) f(); }

/* ---------- Interaksi & Drag-to-Slide ---------- */
let dragState = null;
let suppressClickUntil = 0;

function promotePeek() {
  if (S.peek && !S.expanded) {
    S.expanded = true;
    S.view = S.peek;
    S.peek = null;
    clearTimeout(peekT);
    layout();
    triggerWhiteRefraction();
  }
}
island.addEventListener('click', (e) => {
  if (performance.now() < suppressClickUntil) { e.stopPropagation(); e.preventDefault(); return; }
  const btn = e.target.closest('[data-act]');
  if (btn && acts[btn.dataset.act]) { promotePeek(); acts[btn.dataset.act](btn, e); return; }
  if (S.miniPopup?.kind === 'tasknotice' || S.miniPopup?.kind === 'prayernotice' || S.miniPopup?.kind === 'waternotice' || S.miniPopup?.kind === 'timerpreview') {
    if (S.miniPopup?.kind === 'timerpreview') go('timer');
    else if (S.miniPopup?.kind === 'waternotice') go('water');
    dismissMiniPopup();
    return;
  }
  if (S.ring) return;
  if (S.charge) { S.charge = null; clearTimeout(chargeT); openDefault(); return; }
  if (S.headset) { S.headset = null; clearTimeout(headsetT); openDefault(); return; }
  if (S.peek && !S.expanded) { promotePeek(); return; }
  if (!S.expanded && (curKey === 'idle' || curKey === 'compact' || curKey === 'minimal' || curKey === 'notice' || curKey === 'work' || curKey === 'tuck' || curKey === 'peekaboo' || curKey === 'quiettuck')) openFromIsland();
});
island.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!S.ring && S.expanded) collapse(); });
island.addEventListener('pointerdown', (e) => {
  if (S.peek && !S.expanded && !e.target.closest('[data-act],[data-hold]')) promotePeek();
  const b = e.target.closest('[data-hold]');
  if (b) {
    const fn = holds[b.dataset.hold]; if (!fn) return;
    fn();
    let iv = null; const to = setTimeout(() => { iv = setInterval(fn, 75); }, 380);
    const stop = () => { clearTimeout(to); clearInterval(iv); removeEventListener('pointerup', stop); removeEventListener('pointercancel', stop); };
    addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
    return;
  }
  // Drag-to-slide untuk halaman expanded (primary button saja)
  if (!bridge.mock && e.button === 0 && S.expanded && PAGE_OF[curKey] && !isSliding && !e.target.closest('button, [data-act], [data-hold], input, textarea, .s-item, #m-bar, .ios-slider, .dashboard-glass-slider')) {
    dragState = { id: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, active: false, t0: performance.now(), curPage: PAGE_OF[curKey] || 'home' };
  }
});
window.addEventListener('pointermove', (e) => {
  if (!dragState || e.pointerId !== dragState.id) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.active) {
    if (Math.abs(dx) > 14 && Math.abs(dx) >= Math.abs(dy) * 1.25) {
      dragState.active = true;
      S.dragLock = true;
      if (bridge.setDragActive) bridge.setDragActive(true);
      if (bridge.setMouseActive) bridge.setMouseActive(true);
      try { island.setPointerCapture(e.pointerId); } catch (_) {}
      island.classList.add('dragging');
    } else if (Math.abs(dy) > 16) {
      dragState = null;
      return;
    } else {
      return;
    }
  }
  dragState.dx = dx;
  const list = pageList();
  if (list.length <= 1) return;

  const curPage = dragState.curPage || PAGE_OF[curKey] || 'home';
  const i = list.indexOf(curPage);
  const curEl = $('#v-' + curPage);

  // dx < 0 artinya drag ke kiri -> target next view (i + 1)
  // dx > 0 artinya drag ke kanan -> target prev view (i - 1)
  const targetView = dx < 0 ? list[(i + 1) % list.length] : list[(i - 1 + list.length) % list.length];
  const targetEl = $('#v-' + targetView);
  const targetOffset = dx < 0 ? 392 : -392;

  if (dragState.lastTargetEl && dragState.lastTargetEl !== targetEl && dragState.lastTargetEl !== curEl) {
    dragState.lastTargetEl.style.visibility = '';
    dragState.lastTargetEl.style.transform = '';
    dragState.lastTargetEl.style.opacity = '';
    dragState.lastTargetEl.classList.remove('on', 'sliding');
  }
  dragState.lastTargetEl = targetEl;

  if (curEl) {
    curEl.style.transition = 'none';
    curEl.style.visibility = 'visible';
    curEl.style.transform = `translate3d(calc(-50% + ${dx}px), 0, 0) scale(${1 - Math.min(0.04, Math.abs(dx) / 392 * 0.04)})`;
    curEl.style.opacity = `${Math.max(0.2, 1 - Math.abs(dx) / 500)}`;
  }
  if (targetEl && targetEl !== curEl) {
    targetEl.style.transition = 'none';
    targetEl.style.visibility = 'visible';
    targetEl.style.transform = `translate3d(calc(-50% + ${targetOffset + dx}px), 0, 0) scale(${0.96 + Math.min(0.04, Math.abs(dx) / 392 * 0.04)})`;
    targetEl.style.opacity = `${Math.min(1, Math.abs(dx) / 100)}`;
  }
  dragState.targetView = targetView;
  dragState.targetEl = targetEl;
  dragState.curEl = curEl;
  dragState.targetOffset = targetOffset;
});
function finishDrag(e) {
  if (!dragState) return;
  const st = dragState;
  dragState = null;
  S.dragLock = false;
  if (bridge.setDragActive) bridge.setDragActive(false);
  if (bridge.setMouseActive) bridge.setMouseActive(inside || S.expanded || S.focusLock);
  island.classList.remove('dragging');

  if (!st.active) return;
  if (e?.type === 'pointercancel') st.dx = 0;
  const dt = Math.max(16, performance.now() - st.t0);
  const vel = Math.abs(st.dx) / dt;
  const curEl = st.curEl;
  const targetEl = st.targetEl;
  const shouldSwitch = (Math.abs(st.dx) > 55 || (Math.abs(st.dx) > 18 && vel > 0.28)) && targetEl && targetEl !== curEl;

  const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const DURATION = '340ms';

  if (shouldSwitch) {
    suppressClickUntil = performance.now() + 200;
    isSliding = true;
    if (curEl) {
      curEl.style.transition = `transform ${DURATION} ${EASING}, opacity ${DURATION} cubic-bezier(0.2, 0.9, 0.3, 1)`;
      curEl.style.transform = `translate3d(calc(-50% + ${st.dx < 0 ? -392 : 392}px), 0, 0) scale(0.96)`;
      curEl.style.opacity = '0';
    }
    if (targetEl) {
      targetEl.style.transition = `transform ${DURATION} ${EASING}, opacity ${DURATION} cubic-bezier(0.2, 0.9, 0.3, 1)`;
      targetEl.style.transform = 'translate3d(-50%, 0, 0) scale(1)';
      targetEl.style.opacity = '1';
    }

    setTimeout(() => {
      if (curEl) {
        curEl.classList.remove('on');
        curEl.style.transition = '';
        curEl.style.transform = '';
        curEl.style.opacity = '';
        curEl.style.visibility = '';
      }
      if (targetEl) {
        targetEl.classList.add('on');
        targetEl.style.transition = '';
        targetEl.style.transform = '';
        targetEl.style.opacity = '';
        targetEl.style.visibility = '';
      }
      isSliding = false;
      S.view = st.targetView;
      curKey = st.targetView;
      layout();
    }, 350);
  } else {
    if (curEl) {
      curEl.style.transition = `transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.26s ease-out`;
      curEl.style.transform = 'translate3d(-50%, 0, 0) scale(1)';
      curEl.style.opacity = '1';
    }
    if (targetEl) {
      targetEl.style.transition = `transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.26s ease-out`;
      targetEl.style.transform = `translate3d(calc(-50% + ${st.targetOffset}px), 0, 0) scale(0.96)`;
      targetEl.style.opacity = '0';
    }
    setTimeout(() => {
      if (curEl) {
        curEl.style.transition = '';
        curEl.style.transform = '';
        curEl.style.opacity = '';
      }
      if (targetEl) {
        targetEl.classList.remove('on');
        targetEl.style.transition = '';
        targetEl.style.transform = '';
        targetEl.style.opacity = '';
        targetEl.style.visibility = '';
      }
      layout();
    }, 270);
  }
}
window.addEventListener('pointerup', finishDrag);
window.addEventListener('pointercancel', finishDrag);
island.addEventListener('lostpointercapture', finishDrag);

let lastWheelSlide = 0;
island.addEventListener('wheel', (e) => {
  const w = e.target.closest('[data-wheel]');
  if (w) {
    e.preventDefault();
    const up = e.deltaY < 0;
    holds[(w.dataset.wheel === 'h' ? 'h' : 'm') + (up ? 'inc' : 'dec')]();
    return;
  }
  if (!bridge.mock && S.expanded && PAGE_OF[curKey] && !e.target.closest('#v-connectivity,#connection-list,#timer-ruler,.addon-body,input,textarea,.ios-slider,.dashboard-glass-slider,#m-bar') && Math.max(Math.abs(e.deltaX),Math.abs(e.deltaY)) > 16) {
    const now = performance.now();
    if (now - lastWheelSlide > 320) {
      lastWheelSlide = now;
      e.preventDefault();
      pageStep((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)>0 ? 1 : -1);
    }
  }
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (bridge.mock || !S.expanded || !PAGE_OF[curKey] || S.focusLock) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); pageStep(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); pageStep(1); }
});

/* ---------- Pointer: hover buka / tutup + Sesekali Ngumpet Kecil ---------- */
let inside = false, collapseT = null, hoverT = null;
function triggerPeekaboo(ms = 2600, force = false) {
  if (S.expanded || S.ring || S.charge || S.notice || inside || S.inAngryRadius) return;
  if (typeof hasMusic === 'function' && hasMusic()) return;
  if (!force && (!S.tuckApp || S.settings.autoTuck === false)) return;
  S.peekaboo = true;
  const pk = $('#pk-eyes');
  if (pk) {
    pk.style.animation = 'none';
    $$('i', pk).forEach((el) => { el.style.animation = 'none'; });
    void pk.offsetWidth;
    pk.style.animation = '';
    $$('i', pk).forEach((el) => { el.style.animation = ''; });
  }
  clearTimeout(peekabooT);
  layout();
  peekabooT = setTimeout(() => {
    S.peekaboo = false;
    layout();
  }, ms);
}

// Browser mode: dynamic island aligns gracefully to the search bar
let lastTuckPhase = null;

function setInside(i) {
  inside = !!i && !isTuckDodging;
  island.dataset.inside = inside ? '1' : '0';
  if (bridge.setMouseActive) bridge.setMouseActive(inside || S.expanded || S.dragLock || S.focusLock);
  if (inside) {
    clearTimeout(collapseT); collapseT = null; S.activityAt = Date.now();
    if (S.peekaboo) { S.peekaboo = false; clearTimeout(peekabooT); }
    if (!S.expanded && !S.ring && !S.charge && !S.headset && ['idle', 'compact', 'minimal', 'work', 'tuck', 'peekaboo', 'quiettuck'].includes(curKey)) {
      clearTimeout(hoverT);
      hoverT = setTimeout(() => { if (inside && !S.expanded && !S.ring && !S.charge && !S.headset) openFromIsland(); }, 120);
    }
  } else {
    clearTimeout(hoverT); hoverT = null;
    clearTimeout(collapseT); collapseT = null;
    if (S.expanded && !S.ring && !S.focusLock && !S.dragLock) {
      collapseT = setTimeout(() => { if (!inside && !S.focusLock && !S.dragLock) collapse(); }, 280);
    } else if (!S.expanded && (S.tuckApp || S.peekaboo)) {
      layout();
    }
  }
}
island.addEventListener('pointerenter', () => setInside(true));
island.addEventListener('pointerleave', (e) => {
  if (e.relatedTarget && island.contains(e.relatedTarget)) return;
  setInside(false);
});
bridge.onPointer(setInside);
if (bridge.onTuckApp) {
  bridge.onTuckApp((v) => {
    S.tuckApp = typeof v === 'object' ? !!v.active : !!v;
    S.browserVerticalTabs = !!(v && typeof v === 'object' && v.verticalTabs);
    if (S.browserVerticalTabs) resetDodgeState();
    layout();
  });
}

function resetDodgeState() {
  if (isTuckDodging) {
    isTuckDodging = false;
    island.dataset.dodging = '0';
    if (bridge.setDodge) bridge.setDodge(false);
    island.style.removeProperty('--pk-opacity');
    island.style.removeProperty('--pk-scale-y');
  }
  targetDodgeH = 22; targetDodgeW = 56; targetDodgeR = 11;
  lastRectSig = '';
  reportRect();
  layout();
  kick();
}

function resetSpotifyDodge() {
  if (!isSpotifyDodging) return;
  isSpotifyDodging = false;
  island.dataset.spotifyDodging = '0';
  lastRectSig = '';
  layout();
  reportRect();
  kick();
}

function handleSpotifyDodge(dx, dy) {
  const eligible = S.spotifyApp && curKey === 'compact' && !S.expanded && !S.ring && !S.charge && !S.headset && !S.prompt && !S.notice;
  if (!eligible) { resetSpotifyDodge(); return; }
  const cursorY = dy + 18;
  const nearSearch = Math.abs(dx) <= 176 && cursorY >= 0 && cursorY <= 82;
  if (nearSearch) {
    if (!isSpotifyDodging) {
      isSpotifyDodging = true;
      island.dataset.spotifyDodging = '1';
      clearTimeout(hoverT);
      lastRectSig = '';
      layout();
      reportRect();
    }
  } else resetSpotifyDodge();
}

function handleTuckDodge(dx, dy) {
  if (!S.tuckApp || S.browserVerticalTabs || curKey !== 'tuck' || S.expanded || S.ring || S.charge || S.headset || S.prompt || S.notice) {
    if (isTuckDodging) {
      resetDodgeState();
    }
    return;
  }

  const cursorY = dy + 11;
  const distX = Math.abs(dx);
  const inDodgeRadius = (distX <= 82) && (cursorY >= 0 && cursorY <= 72);

  if (inDodgeRadius) {
    const normX = distX / 82;
    const normY = clamp((cursorY - 14) / (72 - 14), 0, 1);
    const t = clamp(Math.hypot(normX * 0.75, normY), 0, 1);

    targetDodgeH = 3 + t * 2;
    targetDodgeW = 30 + t * 8;
    targetDodgeR = targetDodgeH / 2;

    sw.t = targetDodgeW;
    sh.t = targetDodgeH;
    sr.t = targetDodgeR;

    sw.k = 480; sw.c = 32;
    sh.k = 460; sh.c = 30;
    sr.k = 520; sr.c = 36;
    kick();

    if (!isTuckDodging) {
      isTuckDodging = true;
      island.dataset.dodging = '1';
      if (bridge.setDodge) bridge.setDodge(true);
      clearTimeout(hoverT);
      setInside(false);
      reportRect();
    }
  } else {
    if (isTuckDodging || sh.t < 21.5) {
      isTuckDodging = false;
      island.dataset.dodging = '0';
      if (bridge.setDodge) bridge.setDodge(false);
      island.style.removeProperty('--pk-opacity');
      island.style.removeProperty('--pk-scale-y');
      targetDodgeH = 22; targetDodgeW = 56; targetDodgeR = 11;
      sw.t = 56;
      sh.t = 22;
      sr.t = 11;
      sw.k = 420; sw.c = 30;
      sh.k = 380; sh.c = 28;
      sr.k = 540; sr.c = 36;
      kick();
      lastRectSig = '';
      reportRect();
    }
  }
}

if (bridge.onResetDodge) {
  bridge.onResetDodge(() => resetDodgeState());
}
if (bridge.onGameMode) {
  bridge.onGameMode((on) => {
    if (!on) resetDodgeState();
  });
}

if (bridge.onCursor) {
  bridge.onCursor((dx, dy) => {
    handleTuckDodge(dx, dy);
    handleSpotifyDodge(dx, dy);
  });
}
if (bridge.onExpandHome) {
  bridge.onExpandHome(() => {
    openDefault();
    clearTimeout(collapseT);
    collapseT = null;
    S.focusLock = true;
    setTimeout(() => { S.focusLock = false; }, 8000);
    if (bridge.setMouseActive) bridge.setMouseActive(true);
  });
}
if (bridge.onCollapse) {
  bridge.onCollapse(() => { S.focusLock = false; collapse(); });
}
// Mode browser (uji): hitung sendiri dari posisi mouse
let mx = -999, my = -999;
function mockHit() {
  if (!bridge.mock) return;
  const r = island.getBoundingClientRect(), p = 8;
  setInside(mx >= r.left - p && mx <= r.right + p && my >= r.top - p && my <= r.bottom + p);
}
if (bridge.mock) {
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; mockHit(); });
  document.documentElement.addEventListener('mouseleave', () => { mx = my = -999; mockHit(); });
}

/* ---------- Tick ---------- */
setInterval(() => { for (const f of ticks) f(); }, 200);

window.addEventListener("resize",()=>{lastRectSig="";reportRect();});

// Public demo control surface. The desktop build does not expose this object.
if (bridge.mock) {
  window.__island = { S, go, collapse, layout, dismissMiniPopup };
  window.parent.postMessage({ type: 'grump-demo-ready' }, window.location.origin);
}
