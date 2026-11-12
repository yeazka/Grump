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
  whatsapp: svg('<circle cx="12" cy="12" r="12" fill="#25D366"/><g transform="translate(4.3 4.3) scale(.642)"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></g>'),
  discord: svg('<circle cx="12" cy="12" r="12" fill="#5865F2"/><path fill="#fff" d="M17.2 7.2a11.6 11.6 0 0 0-2.9-.9l-.4.8a10.8 10.8 0 0 0-3.8 0l-.4-.8c-1 .2-2 .5-2.9.9-1.8 2.7-2.3 5.3-2.1 7.9 1.2.9 2.4 1.4 3.5 1.8l.8-1.3c-.4-.2-.8-.4-1.2-.7l.3-.2c2.3 1.100 4.800 1.100 7.100 0l.3.2c-.4.3-.8.5-1.200.7l.8 1.300c1.200-.4 2.400-.9 3.500-1.800.3-3-.5-5.600-2.100-7.900ZM9.700 13.800c-.7 0-1.200-.6-1.200-1.400s.5-1.400 1.200-1.400 1.200.6 1.200 1.400-.5 1.400-1.200 1.400Zm4.600 0c-.7 0-1.200-.6-1.200-1.400s.5-1.400 1.200-1.400 1.200.6 1.200 1.400-.5 1.400-1.200 1.400Z"/>'),
  chatgpt: '<img src="../assets/chatgpt-official.svg" alt="" aria-hidden="true">',
  claude: '<img src="../assets/claude-official.svg" alt="" aria-hidden="true">',
  browser: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', ST),
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
  tiktok: svg('<path d="M14 3v11.2a3.2 3.2 0 1 1-3.2-3.2M14 3c.3 2.4 1.9 4 4.5 4.2" fill="none" stroke="#25f4ee" stroke-width="2.6" stroke-linecap="round" transform="translate(-.7 .7)"/><path d="M14 3v11.2a3.2 3.2 0 1 1-3.2-3.2M14 3c.3 2.4 1.9 4 4.5 4.2" fill="none" stroke="#fe2c55" stroke-width="2.6" stroke-linecap="round" transform="translate(.7 -.5)"/><path d="M14 3v11.2a3.2 3.2 0 1 1-3.2-3.2M14 3c.3 2.4 1.9 4 4.5 4.2" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>'),
  elevenlabs: svg('<rect x="8" y="4" width="2.8" height="16" rx="1.4" fill="#ffffff"/><rect x="13.2" y="4" width="2.8" height="16" rx="1.4" fill="#ffffff"/>'),
  twitch: svg('<path d="M4 3h17v11.5l-4.5 4.5h-4L9.5 21.5V19H4z" fill="#9146ff"/><path d="M12 7.5v4.5M16.5 7.5v4.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>'),
  globe: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="#e8ecf4" stroke-width="1.8"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="#e8ecf4" stroke-width="1.6" stroke-linecap="round"/>'),
  headphones: svg('<path d="M3 18v-6a9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>', ST),
  bluetooth: svg('<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  volume: svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9.5 9.5 0 0 1 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-med': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-low': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M14.5 10a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  'volume-mute': svg('<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  brightness: svg('<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  // AnimateIcons / Lucide cloud drizzle by Avijit Dey, MIT.
  weather: svg('<path class="pager-weather-cloud" d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path class="pager-weather-drop pager-weather-drop-a" d="M8 19v1M8 14v1"/><path class="pager-weather-drop pager-weather-drop-b" d="M12 21v1M12 16v1"/><path class="pager-weather-drop pager-weather-drop-c" d="M16 19v1M16 14v1"/>', ST),
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
  step(dt) {
    dt = Number.isFinite(dt) ? clamp(dt, 0, 1 / 30) : 0;
    if (!Number.isFinite(this.x) || !Number.isFinite(this.v) || !Number.isFinite(this.t)) {
      this.x = Number.isFinite(this.t) ? this.t : 0;
      this.v = 0;
      return;
    }
    const a = -this.k * (this.x - this.t) - this.c * this.v;
    this.v = clamp(this.v + a * dt, -4000, 4000);
    this.x = clamp(this.x + this.v * dt, 0, 2000);
  }
  get done() { return Math.abs(this.x - this.t) < 0.2 && Math.abs(this.v) < 0.4; }
}
// [lebar, tinggi, radius] — Semua menu expanded 1 ukuran (392x196) agar tidak nge-warp
const EXP_SIZE = [392, 196, 40];
const MENU_HOVER_HEIGHT = 210;
const SIZES = {
  idle: [124, 36, 18], minimal: [150, 6, 3], tuck: [56, 22, 11], peekaboo: [56, 22, 11], quiettuck: [68, 7, 3.5], tuckhide: [38, 19, 14], compact: [312, 36, 18], work: [128, 32, 16], notice: [300, 40, 20], prompt: [320, 42, 21], charge: [296, 44, 22], headset: [312, 44, 22],
  home: EXP_SIZE, music: EXP_SIZE, lyrics: EXP_SIZE, timer: EXP_SIZE, stash: EXP_SIZE, addons: EXP_SIZE, todo: EXP_SIZE, notes: EXP_SIZE, prayer: EXP_SIZE, water: EXP_SIZE, weather:EXP_SIZE, notifications:EXP_SIZE, connectivity: EXP_SIZE, timerpreview:[250,48,24], prayernotice:[336,66,30], waternotice:[404,70,32], weathernotice:[336,66,30], tasknotice:[300,66,30], levelhud:[268,46,23], timerdone:[250,48,24],
};
const PAGE_OF = { home: 'home', music: 'music', lyrics: 'music', timer:'timer', stash:'stash', addons:'addons', todo:'todo', notes:'notes', prayer:'prayer', water:'water', weather:'weather', notifications:'notifications' };
const island = $('#island');
function applyIslandTransparency() {
  const transparency = Math.max(0, Math.min(70, Number(S.settings?.islandTransparency) || 0));
  island.style.opacity = '1';
  island.style.setProperty('--island-surface-alpha', String(1 - transparency / 100));
  island.style.setProperty('--lg-alpha', String(1 - transparency / 100));
  island.dataset.glassMode = ['bright', 'dark', 'clear'].includes(S.settings?.glassMode) ? S.settings.glassMode : 'dark';
}
function islandSurfaceColor(red = 0, green = 0, blue = 0, baseAlpha = 1) {
  const alpha = Math.max(0, Math.min(1, Number(island.style.getPropertyValue('--island-surface-alpha')) || 1));
  return `rgba(${red}, ${green}, ${blue}, ${(baseAlpha * alpha).toFixed(3)})`;
}
// Anchored Liquid Glass body (the SVG shape), matching glass-modes.css.
// Adaptive glass: how much thicker the glass gets (0..1) when what is behind the notch is busy (text-like) or very bright.
let glassAdapt = 0, glassAdaptTarget = 0, glassAdaptFrame = 0;
function glassAdaptFor(region) {
  if (!region) return 0;
  const busy = Math.max(0, Math.min(1, (region.busy - 0.16) / 0.5));
  const bright = Math.max(0, Math.min(1, (region.lum - 0.7) / 0.3)) * 0.4;
  return Math.max(0, Math.min(1, busy * 0.95 + bright));
}
function applyGlassAdapt() {
  glassAdaptFrame = 0;
  const step = glassAdaptTarget - glassAdapt;
  glassAdapt = Math.abs(step) < 0.01 ? glassAdaptTarget : glassAdapt + step * 0.18;
  island.style.setProperty('--lg-adapt', glassAdapt.toFixed(3));
  if (island.dataset.theme === 'full-glass') { try { paintIsland(); } catch (_) { /* painted again on the next layout */ } }
  if (glassAdapt !== glassAdaptTarget) glassAdaptFrame = requestAnimationFrame(applyGlassAdapt);
}
function setGlassAdaptTarget(value) {
  glassAdaptTarget = value;
  if (!glassAdaptFrame) glassAdaptFrame = requestAnimationFrame(applyGlassAdapt);
}
bridge.onBackdrop?.((data) => {
  const on = S.settings && S.settings.theme === 'full-glass';
  if (!on) { if (glassAdaptTarget !== 0) setGlassAdaptTarget(0); return; }
  if (data && data.top) setGlassAdaptTarget(glassAdaptFor(data.top));
});
function glassBodyColor(expanded) {
  if (island.dataset.glassLive === '1') return 'rgba(0, 0, 0, 0)'; // the live glass (WebGL) draws the body
  const mode = island.dataset.glassMode || 'dark';
  const mix = (base, max) => base + (max - base) * glassAdapt;
  if (expanded) {
    // Open menus: a vertical gradient (Dark: 20% at the top, 40% at the bottom), scaled by Transparency.
    const page = { dark: ['8,8,11', .4, .5], bright: ['14,14,18', .2, .3], clear: ['0,0,0', .12, .22] }[mode] || ['8,8,11', .4, .5];
    page[1] = mix(page[1], 0.9); page[2] = mix(page[2], 0.95);
    const alpha = Math.max(0, Math.min(1, Number(island.style.getPropertyValue('--island-surface-alpha')) || 1));
    const top = document.getElementById('glass-page-top'), bottom = document.getElementById('glass-page-bottom');
    if (top && bottom) {
      top.setAttribute('stop-color', 'rgb(' + page[0] + ')'); top.setAttribute('stop-opacity', String(page[1] * alpha));
      bottom.setAttribute('stop-color', 'rgb(' + page[0] + ')'); bottom.setAttribute('stop-opacity', String(page[2] * alpha));
      return 'url(#glass-page-gradient)';
    }
  }
  if (mode === 'bright') return islandSurfaceColor(236, 236, 242, mix(expanded ? .26 : .22, .5));
  if (mode === 'dark') return islandSurfaceColor(9, 9, 12, mix(expanded ? .62 : .54, .94));
  return islandSurfaceColor(255, 255, 255, mix(expanded ? .075 : .055, .5));
}
function expandedPageSurfaceColor(key) {
  // Liquid Glass: every page is the same glass.
  if (S.settings?.theme === 'full-glass' && ['music','todo','notes','prayer','water','timer','addons','stash','lyrics','weather'].includes(key)) return glassBodyColor(true);
  // Obsidian is solid black on every page; only Liquid Glass keeps per-page tints.
  if (!S.settings?.theme || S.settings.theme === 'default') {
    if (['music','todo','notes','prayer','water','timer','addons','stash','lyrics','weather'].includes(key)) return islandSurfaceColor(0, 0, 0);
  }
  const surfaces={
    // Music's overlay darkens the in-panel shell; anchored SVG sits outside it.
    music:[14,13,16],
    todo:[16,16,18],
    notes:[12,12,14],
    prayer:[0,0,0],
    water:[7,10,15],
    timer:[0,0,0],
    weather:[0,0,0],
  };
  const rgb=surfaces[key];
  // Liquid Glass keeps its pages see-through (the colour of the desktop shows) so they still read as glass.
  const seeThrough = S.settings?.theme === 'full-glass' && ['music', 'todo', 'notes', 'water'].includes(key);
  return rgb?islandSurfaceColor(rgb[0],rgb[1],rgb[2],seeThrough?.5:1):null;
}
const WIN_W = 440;
const sw = new Spring(124, 400, 26), sh = new Spring(36, 320, 18), sr = new Spring(18, 540, 36);
let lyricWidthTween = null;
let animating = false, lastTs = 0, lastRectSig = '';
let lastAnimatedRectAt = 0;

function isTimerActive() {
  return typeof timerState !== 'undefined' && timerState && (timerState.status === 'running' || timerState.status === 'paused');
}

function whatsappNoticeWidth(text, defaultWidth) {
  const value = String(text || '');
  const separator = value.indexOf(':');
  const message = (separator >= 0 ? value.slice(separator + 1) : value).trim();
  if (message.length <= 12) return defaultWidth;
  return clamp(Math.ceil(defaultWidth + (message.length - 12) * 5.6), defaultWidth, 300);
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
  const strokeNoTop = `M ${x1} ${y1} ` +
    `L ${x1} ${y2.toFixed(2)} ` +
    `A ${rBot} ${rBot} 0 0 0 ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `L ${x4.toFixed(2)} ${y4.toFixed(2)} ` +
    `A ${rBot} ${rBot} 0 0 0 ${x5.toFixed(2)} ${y5.toFixed(2)} ` +
    `L ${x6} ${y6.toFixed(2)}`;
  const fill = stroke + ' Z';
  return { stroke, strokeNoTop, fill };
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
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && curKey !== 'timerpreview' && curKey !== 'prayernotice' && curKey !== 'waternotice' && curKey !== 'weathernotice' && curKey !== 'tasknotice' && curKey !== 'levelhud' && curKey !== 'timerdone') || curKey === 'tuck' || curKey === 'peekaboo' || curKey === 'quiettuck';
  const isTop = isAnchored;
  const rw = Math.round(sw.x);
  const rh = island.dataset.reminderPicker === '1' ? 620 : (island.dataset.connectivityOpen === '1' ? Math.max(Math.round(sh.x), 238) : Math.round(sh.x));
  const tight = S.creativeNear === true || isSpotifyDodging;
  const rl = Math.round((window.innerWidth - rw) / 2);
  const rt = isTop ? 0 : 10;
  const sig = `${rl},${rt},${rw},${rh},${tight ? 1 : 0}`;
  if (sig !== lastRectSig) { lastRectSig = sig; bridge.rect({ left: rl, top: rt, width: rw, height: rh, tight }); }
}
function paintIsland() {
  // The overlay window grows for wide compact lyrics (lyric-viewport); the island may use that room.
  const w = clamp(Number.isFinite(sw.x) ? sw.x : sw.t, 16, Math.max(WIN_W, window.innerWidth - 24));
  const h = clamp(Number.isFinite(sh.x) ? sh.x : sh.t, 6, 400);
  island.style.width = w.toFixed(2) + 'px';
  island.style.height = h.toFixed(2) + 'px';
  const safeRadius = clamp(Number.isFinite(sr.x) ? sr.x : sr.t, 0, Math.min(w, h) / 2);
  const r = safeRadius.toFixed(2) + 'px';
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && curKey !== 'timerpreview' && curKey !== 'prayernotice' && curKey !== 'waternotice' && curKey !== 'weathernotice' && curKey !== 'tasknotice' && curKey !== 'levelhud' && curKey !== 'timerdone') || curKey === 'tuck' || curKey === 'peekaboo' || curKey === 'quiettuck';
  
  const svg = $('#island-notch-svg');
  if (isAnchored) {
    island.dataset.anchored = '1';
    island.style.top = '0px';
    island.style.borderRadius = `0 0 ${r} ${r}`;
    
    if (svg) {
      svg.style.display = 'block';
      const rOut = curKey === 'quiettuck' ? 6 : (curKey === 'tuck' && isTuckDodging ? 3 : ((curKey === 'tuck' || curKey === 'peekaboo') ? 12 : (S.expanded ? 20 : 16)));
      const rBot = Math.round(safeRadius);
      const { stroke, strokeNoTop, fill } = buildNotchPaths(w, h, rOut, rBot);
      svg.style.left = `-${rOut}px`;
      svg.style.width = `${(w + 2 * rOut).toFixed(2)}px`;
      svg.style.height = `${h.toFixed(2)}px`;
      svg.setAttribute('viewBox', `0 0 ${(w + 2 * rOut).toFixed(2)} ${h.toFixed(2)}`);

      const fillEl = $('#notch-fill');
      const strokeEl = $('#notch-stroke');
      const angryEl = $('#notch-angry');
      if (fillEl) fillEl.setAttribute('d', fill);
      for (const id of ['notch-sheen', 'notch-clip-path', 'notch-innerglow']) document.getElementById(id)?.setAttribute('d', fill);
      if (strokeEl) strokeEl.setAttribute('d', stroke);
      const ringEl = $('#notch-ring');
      if (ringEl) ringEl.setAttribute('d', stroke);
      if (angryEl) angryEl.setAttribute('d', stroke);

      const isAngry = island.dataset.angry === '1';
      const isQuiet = S.settings && !!S.settings.quiet;
      const isCaps = curKey === 'notice' && island.dataset.caps === '1';
      const isWhatsAppNotice = curKey === 'notice' && island.dataset.noticeIcon === 'whatsapp';
      const isAppNotice = curKey === 'notice' && !isCaps;
      const theme = island.dataset.theme || 'default';
      const angryVar = (S.settings && S.settings.angryVariant) || island.dataset.angryVariant || 'pink';
      island.dataset.angryVariant = angryVar;
      island.dataset.rage = (S.settings && S.settings.rageShake === false) ? '0' : '1';
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
        } else if (angryVar === 'crimson-orbit') {
          angryEl.setAttribute('stroke', '#ff3700');
          angryEl.setAttribute('stroke-width', '1.75');
          angryEl.style.filter = 'drop-shadow(0 0 5px rgba(255,50,0,.88)) drop-shadow(0 0 10px rgba(230,10,30,.6))';
        } else if (angryVar === 'cyber-violet' || angryVar === 'cyber-amber') {
          const violet = angryVar === 'cyber-violet';
          angryEl.setAttribute('stroke', violet ? '#a855f7' : '#f59e0b');
          angryEl.setAttribute('stroke-width', '1.8');
          angryEl.style.filter = violet
            ? 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.95)) drop-shadow(0 0 12px rgba(147, 51, 234, 0.7))'
            : 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.95)) drop-shadow(0 0 12px rgba(217, 119, 6, 0.7))';
        } else {
          angryEl.setAttribute('stroke', '#ff2626');
          angryEl.setAttribute('stroke-width', '1.8');
          angryEl.style.filter = 'drop-shadow(0 0 6px rgba(255, 38, 38, 0.85))';
        }
      }
      const isGlassNotice = false;
      if (strokeEl) {
        // Liquid Glass: a hairline rim (bright at the outer corners) around the anchored notch; no line along the screen edge.
        const glassRim = theme === 'full-glass' && !isAngry && !isCaps && !isWhatsAppNotice && !isQuiet;
        strokeEl.setAttribute('d', isGlassNotice ? strokeNoTop : stroke);
        strokeEl.style.opacity = isCaps || glassRim || (theme === 'outline-glass' && !isAngry && !isGlassNotice && !isWhatsAppNotice) ? '1' : '0';
        if (isCaps) {
          strokeEl.setAttribute('stroke', '#70e69b');
          strokeEl.setAttribute('stroke-width', '1.6');
          strokeEl.style.filter = 'drop-shadow(0 0 5px rgba(112,230,155,.75))';
        } else if (isGlassNotice) {
          strokeEl.setAttribute('stroke', 'rgba(255, 255, 255, 0.58)');
          strokeEl.setAttribute('stroke-width', '1.15');
          strokeEl.style.filter = 'none';
        } else if (isQuiet) {
          // Quiet mode: golden/amber ambient outline
          strokeEl.setAttribute('stroke', '#eab308');
          strokeEl.setAttribute('stroke-width', '1.6');
          strokeEl.style.filter = 'none';
        } else if (glassRim) {
          strokeEl.setAttribute('stroke', 'url(#glass-rim-gradient)');
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

      // Self-lit glass on the anchored notch: sheen + a soft light along the inner edge (nothing behind the notch can be blurred).
      const glassSkinOn = theme === 'full-glass' && !isAppNotice && !isAngry;
      const sheenEl = $('#notch-sheen'), glowEl = $('#notch-innerglow');
      if (sheenEl) sheenEl.setAttribute('opacity', glassSkinOn ? ({ bright: '1', dark: '.5', clear: '.2' }[island.dataset.glassMode] || '.2') : '0');
      if (glowEl) glowEl.setAttribute('opacity', glassSkinOn ? '1' : '0');
      if (fillEl) {
        const pageSurface=S.expanded?expandedPageSurfaceColor(curKey):null;
        if (isAppNotice) {
          fillEl.setAttribute('fill', '#000000');
        } else if (isGlassNotice) {
          fillEl.setAttribute('fill', 'transparent');
        } else if (theme === 'full-glass' && S.expanded) {
          fillEl.setAttribute('fill', glassBodyColor(true));
        } else if (S.expanded && curKey === 'weather' && !pageSurface) {
          fillEl.setAttribute('fill', 'url(#weather-notch-gradient)');
        } else if (pageSurface) {
          fillEl.setAttribute('fill', pageSurface);
        } else if (S.expanded && (curKey === 'addons' || curKey === 'stash')) {
          fillEl.setAttribute('fill', islandSurfaceColor(20, 20, 24));
        } else if (theme === 'full-glass') {
          fillEl.setAttribute('fill', glassBodyColor(S.expanded));
        } else if (S.expanded && (!S.settings?.theme || S.settings.theme === 'default')) {
          fillEl.setAttribute('fill', islandSurfaceColor(0, 0, 0));
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
    paintIsland(); animating = false; reportRect(); mockHit(); return;
  }
  paintIsland(); mockHit();
  if (ts - lastAnimatedRectAt >= 32) { lastAnimatedRectAt = ts; reportRect(); }
  requestAnimationFrame(frame);
}
function kick() {
  reportRect();
  if (!animating) { animating = true; lastTs = performance.now(); requestAnimationFrame(frame); }
}

/* ---------- State ---------- */
const S = {
  expanded: false, view: 'notifications', peek: null, ring: null, notice: null, charge: null, headset: null, workActivity: null,
  lastPage: 'notifications', focusLock: false, activityAt: Date.now(),
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
const ticks = [];         // periodic work; scheduler slows down while Grump is idle
const acts = {};          // aksi tombol [data-act]
const holds = {};         // aksi tombol tahan [data-hold]
const enterHooks = {};    // dipanggil saat view tertentu aktif

// diisi modul lain (dipanggil saat runtime)
const activityProviders = [];
const hasActivity = () => activityProviders.some((f) => f());

function pageList() {
  const available=[
    'home',
    S.settings.menuMusic !== false ? 'music' : null,
    S.settings.menuWeather !== false ? 'weather' : null,
    ...['todo', 'notes'].filter(page => S.addonPages.includes(page)),
    ...S.addonPages.filter(page => page !== 'todo' && page !== 'notes'),
    S.settings.menuTimer !== false ? 'timer' : null,
    S.settings.menuStash !== false ? 'stash' : null,
    S.settings.menuNotifications !== false ? 'notifications' : null,
    S.addonPages.length < (typeof ADDONS === 'object' && ADDONS ? Object.keys(ADDONS).length : 5) ? 'addons' : null
  ].filter(Boolean);
  const order=Array.isArray(S.settings.menuOrder)?S.settings.menuOrder:[];
  return [...available].sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
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
  if (S.glancePreviewActive) return 'idle';
  const musicActive = typeof hasMusic === 'function' && hasMusic();
  if (S.settings && S.settings.quiet && !inside && !musicActive) return 'quiettuck';
  if (S.tuckApp && S.settings.autoTuck !== false && !inside) return 'tuck';
  if (aiWorkWinsOverMusic()) return 'work';
  if (S.peekaboo && S.settings.autoTuck !== false && !inside && !musicActive) return 'peekaboo';
  if (S.peek) return S.peek;
  if (hasActivity()) return 'compact';
  return S.settings.minimal ? 'minimal' : 'idle';
}
// Which one owns the notch when both the AI status and music are active (Preferences > "AI status vs. music").
function aiWorkWinsOverMusic() {
  if (!S.workActivity) return false;
  const musicOn = typeof isPlaying === 'function' && isPlaying() && S.settings.menuMusic !== false && !S.pipOpen;
  if (!musicOn) return true;
  const preference = S.settings && S.settings.musicAiPriority;
  if (preference === 'music') return false;
  if (preference === 'alternate') return Math.floor(Date.now() / 9000) % 2 === 0;
  return false; // together: the compact music view carries a thin AI strip on top
}
// AI status and music at the same time: the compact view grows a strip (about 30% of its height) for the AI status.
function aiStackedOnMusic() {
  if (!S.workActivity || !S.settings) return false;
  const preference = S.settings.musicAiPriority;
  if (preference === 'music' || preference === 'alternate') return false;
  return typeof isPlaying === 'function' && isPlaying() && S.settings.menuMusic !== false && !S.pipOpen;
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
  const visualKeyChanged = island.dataset.key !== k;
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
  const whatsAppNoticeW = whatsappNoticeWidth(S.notice?.text, baseW);
  let [w, h, r] = isSpotifyDodging ? [spotifyCompactWidth, 25, 12.5] : (isTimerOn ? [Math.max(184,baseW), Math.max(36,baseH), Math.min(Math.max(36,baseH)/2,24)] : (isCompactTimer ? [SIZES.compact[0]+36, 36, 18] : (k === 'tuck' && isTuckDodging ? [targetDodgeW, targetDodgeH, targetDodgeR] : (k === 'idle' ? [idleW,idleH,Math.min(idleH/2,24)] : (k === 'work' ? [clamp(Number(S.workWidth)||128,128,392),32,16] : (k === 'notice' && island.dataset.caps === '1' ? [174,40,20] : (k === 'notice' ? [whatsAppNoticeW,40,20] : SIZES[k])))))));
  const stacked = k === 'compact' && !isSpotifyDodging && aiStackedOnMusic();
  if (stacked) { h = 50; r = 22; }
  const levelUnder = k === 'compact' && !isSpotifyDodging && !!S.levelUnder;
  if (levelUnder) { h += 20; r = 22; }
  const compactEl = $('#v-compact');
  if (compactEl) { compactEl.dataset.stack = stacked ? '1' : '0'; compactEl.dataset.level = levelUnder ? '1' : '0'; }
  if (S.menuHover && S.expanded && PAGE_OF[k]) h = MENU_HOVER_HEIGHT;
  const isAnchored = ((S.settings && S.settings.dockMode === 'anchored') && k !== 'timerpreview' && k !== 'prayernotice' && k !== 'waternotice' && k !== 'weathernotice' && k !== 'tasknotice' && k !== 'levelhud' && k !== 'timerdone') || k === 'tuck' || k === 'peekaboo' || k === 'quiettuck';
  const dockChanged = (island.dataset.anchored === '1') !== isAnchored;
  const sizeChanged = Math.abs(sw.t - w) > 0.5 || Math.abs(sh.t - h) > 0.5 || Math.abs(sr.t - r) > 0.5;
  island.dataset.key = k;
  island.dataset.paged = (S.expanded && PAGE_OF[k]) ? '1' : '0';
  island.dataset.expanded = (S.expanded || k === 'ring') ? '1' : '0';
  island.dataset.idleInfo = isIdleInfo ? '1' : '0';
  if (!changed && !sizeChanged && !dockChanged) {
    if (visualKeyChanged) paintIsland();
    renderPager();
    return;
  }
  const growing = w > sw.x || h > sh.x;
  const canAnticipate = !animating && Math.abs(sw.v) < 1 && Math.abs(sh.v) < 1;
  if (isAnchored) {
    if (growing && S.expanded && canAnticipate) {
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
    if (growing && S.expanded && canAnticipate) {
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
  if (PAGE_OF[k] && (h === MENU_HOVER_HEIGHT || sh.x > EXP_SIZE[1] + .5)) {
    sh.k = 520;
    sh.c = 46;
  }
  if ((k === 'compact' && !changed || k === 'work') && Math.abs(sw.t - w) > 0.5) {
    lyricWidthTween = { from: sw.x, to: w, started: performance.now() };
  } else if (k !== 'compact' && k !== 'work') {
    lyricWidthTween = null;
  }
  sw.t = w; sh.t = h; sr.t = r; kick();
  $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + (k === 'minimal' || k === 'tuckhide' ? 'none' : (k === 'tuck' ? 'peekaboo' : k))));
  if (bridge.setExpanded) bridge.setExpanded(S.expanded);
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
let noticeGlassRequested = false;
function ensureNoticeGlass() {
  if (noticeGlassRequested) return;
  noticeGlassRequested = true;
  const script = document.createElement('script');
  script.src = 'js/liquid-glass-notice.js?v=20261112-2';
  script.async = true;
  document.body.appendChild(script);
}
// The glow under a notification takes the colour of the app it came from: known apps use their brand colour,
// system notices are blue, and any other app gets a steady colour derived from its name.
const NOTICE_ICON_BEAMS = { whatsapp: '#25d366', claude: '#d97757', chatgpt: '#10a37f', discord: '#5865f2', check: '#34d399', timer: '#ff7a0f', drop: '#38bdf8', moon: '#f5c451', weather: '#4aa8ff', cloud: '#4aa8ff' };
const NOTICE_APP_BEAMS = [
  [/brave/i, '#fb542b'], [/chrome/i, '#4285f4'], [/edge/i, '#0f8ad7'], [/firefox/i, '#ff7139'], [/opera/i, '#ff1b2d'], [/vivaldi/i, '#ef3939'],
  [/discord/i, '#5865f2'], [/telegram/i, '#2aabee'], [/spotify/i, '#1ed760'], [/slack/i, '#e01e5a'], [/teams/i, '#6264a7'], [/outlook|mail/i, '#0f78d4'],
  [/gmail/i, '#ea4335'], [/messenger/i, '#0084ff'], [/instagram/i, '#e4405f'], [/facebook/i, '#1877f2'], [/x\.com|twitter/i, '#1d9bf0'], [/linkedin/i, '#0a66c2'],
  [/github/i, '#8b5cf6'], [/notion/i, '#e5e5e5'], [/youtube/i, '#ff0033'], [/line\b/i, '#06c755'], [/signal/i, '#3a76f0'], [/zoom/i, '#2d8cff'], [/steam/i, '#66c0f4']
];
function noticeBeamColor(icon, action) {
  if (NOTICE_ICON_BEAMS[icon]) return NOTICE_ICON_BEAMS[icon];
  if (icon === 'browser') {
    const app = String((action && (action.app || action.sourceApp)) || '').trim();
    const known = NOTICE_APP_BEAMS.find(([pattern]) => pattern.test(app));
    if (known) return known[1];
    if (app) { let hash = 0; for (const ch of app.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${hash % 360} 70% 58%)`; }
  }
  return '#3b82f6'; // system (battery, charging, Wi-Fi, Bluetooth, headset, caps lock, ...)
}
function notice(icon, text, ms = 2800, action = '') {
  if (S.ring || (S.settings.quiet && icon !== 'moon' && icon !== 'quiet')) return;
  if (icon !== 'caps') ensureNoticeGlass();
  $('#v-notice').dataset.compact = /^Download(?:ing|ed):/.test(text) ? '1' : '0';
  $('#v-notice').dataset.caps = icon === 'caps' ? '1' : '0';
  island.dataset.noticeIcon = icon;
  island.style.setProperty('--notice-beam', noticeBeamColor(icon, action));
  const el = $('#n-ico'); el.dataset.ico = icon; el.innerHTML = icon === 'caps' ? '' : icoOf(icon);
  setText('n-text', text);
  S.notice = { icon, text, action };
  addNotificationHistory(icon,text,action);
  clearTimeout(noticeT);
  noticeT = setTimeout(() => { S.notice = null; layout(); }, ms);
  layout();
  triggerGlassRing();
}
const notificationCopy={
  en:{title:'Notifications',read:'Read all',clear:'Clear',empty:'You\'re all caught up',emptyHint:'New notifications will land here.',now:'now'},
  id:{title:'Notifikasi',read:'Tandai dibaca',clear:'Hapus',empty:'Semua beres',emptyHint:'Notifikasi baru akan muncul di sini.',now:'baru'},
  fr:{title:'Notifications',read:'Tout lire',clear:'Effacer',empty:'Vous êtes à jour',emptyHint:'Les nouvelles notifications apparaîtront ici.',now:'maintenant'},
  es:{title:'Notificaciones',read:'Leer todo',clear:'Borrar',empty:'Todo al día',emptyHint:'Las nuevas notificaciones aparecerán aquí.',now:'ahora'},
  'zh-CN':{title:'通知',read:'全部已读',clear:'清除',empty:'暂无新通知',emptyHint:'新通知将显示在这里。',now:'刚刚'},
  ko:{title:'알림',read:'모두 읽음',clear:'지우기',empty:'모두 확인했습니다',emptyHint:'새 알림이 여기에 표시됩니다.',now:'지금'}
};
function notificationWords(){return notificationCopy[S.settings.language]||notificationCopy.en;}
function notificationSource(icon){
  const sources={whatsapp:'WhatsApp',chatgpt:'ChatGPT',claude:'Claude',discord:'Discord',browser:'Browser',weather:'Weather',cloud:'Weather',moon:'Prayer',drop:'Hydration',check:'Tasks',timer:'Timer',battery:'Battery',charge:'Battery',caps:'System'};
  return sources[icon]||'Grump';
}
function normalizeNotification(item,index){
  const at=Number(item?.at)||Date.now();
  let icon=String(item?.icon||'bell');let title=String(item?.title||item?.text||''),body=String(item?.body||''),app=String(item?.app||notificationSource(icon));
  if(icon==='whatsapp'&&/\b(?:claude|anthropic)\b/i.test(`${title} ${body}`)){icon='claude';app='Claude';}
  else if(icon==='whatsapp'&&/\b(?:chatgpt|openai|codex|grump dynamic island)\b/i.test(`${title} ${body}`)){icon='chatgpt';app='ChatGPT';}
  if(icon==='whatsapp'&&!body){const split=title.indexOf(': ');if(split>0){body=title.slice(split+2);title=title.slice(0,split);}}
  return {id:String(item?.id||`${at}-${index}`),icon,app,title,body,at,read:item?.read===true};
}
const storedNotifications=store.get('grump.notifications',[]);
const excludedNotificationIcons=new Set(['drop','moon','weather','cloud','caps','wifi','wifioff','ethernet','bluetooth','headset']);
const notificationRetentionMs=7*24*60*60*1000;
const notificationCutoff=Date.now()-notificationRetentionMs;
const cleanStoredNotifications=(Array.isArray(storedNotifications)?storedNotifications:[]).filter(item=>Number(item?.at||0)>=notificationCutoff&&!excludedNotificationIcons.has(String(item?.icon||''))&&!/^Downloading:/i.test(String(item?.title||item?.text||'').trim())&&!/snipping tool|screen ?sketch/i.test(`${item?.app||''} ${item?.title||''} ${item?.text||''}`));
let notificationHistory=cleanStoredNotifications.slice(0,40).map(normalizeNotification);
if(cleanStoredNotifications.length!==(Array.isArray(storedNotifications)?storedNotifications.length:0))store.set('grump.notifications',notificationHistory);
let freshNotificationId='';
function storeNotifications(){store.set('grump.notifications',notificationHistory);}
function notificationAge(at){
  const age=Math.max(0,Date.now()-Number(at||0)),words=notificationWords();
  if(age<60000)return words.now;
  if(age<3600000)return `${Math.floor(age/60000)}m`;
  if(age<86400000)return `${Math.floor(age/3600000)}h`;
  return new Date(at).toLocaleDateString(S.settings.language||undefined,{month:'short',day:'numeric'});
}
function addNotificationHistory(icon,text,meta={}){
  if(excludedNotificationIcons.has(String(icon||'')))return;
  const clean=String(text||'').trim();if(!clean)return;
  const item={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,icon:icon||'bell',app:String(meta?.app||notificationSource(icon)),title:String(meta?.contact||clean).trim(),body:String(meta?.body||'').trim(),at:Date.now(),read:false};
  freshNotificationId=item.id;notificationHistory.unshift(item);notificationHistory=notificationHistory.slice(0,40);storeNotifications();renderNotificationCenter();
  const live=$('#notification-center-live');if(live)live.textContent=clean;
  const bell=$('.notification-feed-bell');if(bell){bell.classList.remove('is-ringing');void bell.offsetWidth;bell.classList.add('is-ringing');}
}
function renderNotificationCenter(){
  const host=$('#notification-center-list');if(!host)return;
  const words=notificationWords(),unread=notificationHistory.filter(item=>!item.read).length;
  setText('notification-center-title',words.title);setText('notification-read-all',words.read);setText('notification-clear',words.clear);
  const count=$('#notification-unread-count');if(count){count.textContent=String(unread);count.hidden=!unread;}
  const readAllBtn=$('#notification-read-all');if(readAllBtn)readAllBtn.disabled=unread===0;
  const clearBtn=$('#notification-clear');if(clearBtn)clearBtn.disabled=notificationHistory.length===0;
  host.innerHTML=notificationHistory.length?notificationHistory.map(item=>`<article class="notification-center-item${item.read?'':' is-unread'}${item.id===freshNotificationId?' is-fresh':''}" data-notification-id="${esc(item.id)}" role="listitem" tabindex="0"><i class="notification-app-icon" data-source="${esc(item.icon)}">${icoOf(item.icon)||icoOf('bell')}</i><span class="notification-copy"><small><span>${esc(item.app)}</span>·<time datetime="${new Date(item.at).toISOString()}">${esc(notificationAge(item.at))}</time></small>${item.body?`<span class="notification-message-line"><strong>${esc(item.title)}</strong><span>: ${esc(item.body)}</span></span>`:`<strong>${esc(item.title)}</strong>`}</span><button type="button" class="notification-dismiss" data-notification-dismiss="${esc(item.id)}" aria-label="${esc(words.clear)}">${icoOf('close')}</button></article>`).join(''):`<div class="notification-center-empty"><i>${icoOf('check')}</i><strong>${esc(words.empty)}</strong><span>${esc(words.emptyHint)}</span></div>`;
  if(freshNotificationId){requestAnimationFrame(()=>{freshNotificationId='';});}
}
function checkNotificationAutoNav(delay = 240) {
  const unread = notificationHistory.filter(item => !item.read).length;
  if (unread === 0 && S.expanded && (PAGE_OF[curKey] === 'notifications' || S.view === 'notifications')) {
    setTimeout(() => {
      if (S.expanded && (PAGE_OF[curKey] === 'notifications' || S.view === 'notifications')) {
        const stillUnread = notificationHistory.filter(item => !item.read).length;
        if (stillUnread === 0) {
          go('home');
        }
      }
    }, delay);
  }
}
renderers.push(renderNotificationCenter);enterHooks.notifications=renderNotificationCenter;
acts.notificationsreadall=()=>{notificationHistory=notificationHistory.map(item=>({...item,read:true}));storeNotifications();renderNotificationCenter();checkNotificationAutoNav(220);};
acts.notificationsclear=()=>{notificationHistory=[];storeNotifications();renderNotificationCenter();checkNotificationAutoNav(220);};
$('#notification-center-list')?.addEventListener('click',event=>{
  const dismiss=event.target.closest('[data-notification-dismiss]');
  if(dismiss){
    event.stopPropagation();
    const id=dismiss.dataset.notificationDismiss;
    const card=dismiss.closest('.notification-center-item');
    if(card && !card.classList.contains('is-leaving')){
      card.classList.add('is-leaving');
      setTimeout(()=>{
        notificationHistory=notificationHistory.filter(item=>item.id!==id);
        storeNotifications();renderNotificationCenter();
        checkNotificationAutoNav(200);
      },180);
      return;
    }
    notificationHistory=notificationHistory.filter(item=>item.id!==id);storeNotifications();renderNotificationCenter();checkNotificationAutoNav(200);return;
  }
  const card=event.target.closest('[data-notification-id]');if(!card)return;
  const item=notificationHistory.find(entry=>entry.id===card.dataset.notificationId);if(item&&!item.read){item.read=true;storeNotifications();renderNotificationCenter();checkNotificationAutoNav(240);}
});
$('#notification-center-list')?.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-notification-id]')){event.preventDefault();event.target.click();}});
let miniPopupTimer=null;
let miniPopupShownAt=0,lastIslandClickAt=0;
function showMiniPopup(kind,ms){
  if(S.ring)return;
  miniPopupShownAt=performance.now();
  const historyCopy={tasknotice:S.settings.language==='id'?'Pengingat tugas':'Task reminder'};
  if(historyCopy[kind])addNotificationHistory('check',historyCopy[kind]);
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
  const unread = notificationHistory.filter(item => !item.read).length;
  if (unread === 0) {
    go('home');
    return;
  }
  go(pageList().includes('notifications')?'notifications':'home');
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
function finishSlideWhenReady(el, done) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener('transitionend', onEnd);
    clearTimeout(fallback);
    done();
  };
  const onEnd = (event) => {
    if (event.target === el && event.propertyName === 'transform') finish();
  };
  el.addEventListener('transitionend', onEnd);
  const fallback = setTimeout(finish, 420);
}

function renderPager() {
  if (window.__GRUMP_WEBSITE_DEMO__) {
    $('#pager').classList.remove('on');
    island.dataset.paged = '0';
    return;
  }
  const pg = PAGE_OF[curKey] || S.view || 'home';
  const list = pageList();
  const showPager = !!pg && S.expanded && list.length > 1;
  $('#pager').classList.toggle('on', showPager);
  island.dataset.paged = showPager ? '1' : '0';
  island.dataset.expanded = (S.expanded || curKey === 'ring') ? '1' : '0';
  if (!showPager) return;
  const pageNames={
    en:{home:'Dashboard',music:'Music',weather:'Weather',timer:'Timer',stash:'File Stash',addons:'Add features',todo:'To-do',notes:'Notes',prayer:'Prayer',water:'Water',notifications:'Notifications'},
    id:{home:'Beranda',music:'Musik',weather:'Cuaca',timer:'Timer',stash:'Simpan File',addons:'Tambah fitur',todo:'Tugas',notes:'Catatan',prayer:'Sholat',water:'Minum',notifications:'Notifikasi'},
    fr:{home:'Tableau de bord',music:'Musique',weather:'Météo',timer:'Minuteur',stash:'Fichiers',addons:'Ajouter',todo:'Tâches',notes:'Notes',prayer:'Prière',water:'Hydratation',notifications:'Notifications'},
    es:{home:'Panel',music:'Música',weather:'Tiempo',timer:'Temporizador',stash:'Archivos',addons:'Añadir',todo:'Tareas',notes:'Notas',prayer:'Oración',water:'Agua',notifications:'Notificaciones'},
    'zh-CN':{home:'主页',music:'音乐',weather:'天气',timer:'计时器',stash:'文件暂存',addons:'添加功能',todo:'待办',notes:'笔记',prayer:'礼拜',water:'喝水',notifications:'通知'},
    ko:{home:'대시보드',music:'음악',weather:'날씨',timer:'타이머',stash:'파일 보관함',addons:'기능 추가',todo:'할 일',notes:'메모',prayer:'기도',water:'물 마시기',notifications:'알림'}
  };
  const names=pageNames[S.settings.language]||pageNames.en;
  const icons={home:'gear',music:'note',weather:'weather',timer:'timer',stash:'tray',addons:'plus',todo:'check',notes:'file',prayer:'moon',water:'drop',notifications:'bell'};
  const html = list.map((p) => `<i role="button" tabindex="0" aria-label="${names[p]}" title="${names[p]}" class="${p === pg ? 'on' : ''}" data-act="goto" data-p="${p}"><span aria-hidden="true">${icoOf(icons[p])}</span></i>`).join('');
  setHTML('dots', html);
}

function slideToView(nextView, d) {
  if (typeof flushNoteEditorForNav === 'function') flushNoteEditorForNav(); // an open note is saved silently before the page changes
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

  S.expanded = true;
  S.view = nextView;
  // Sync the shell, notch fill and target size before the first transition
  // frame. layout() runs synchronously, so the destination never flashes
  // before both views receive their explicit starting transforms below.
  layout();
  isSliding = true;

  const dir = d >= 0 ? 1 : -1;
  const W_SLIDE = 56;

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

  // The outgoing page clears quickly while the destination settles softly.
  // This avoids holding a readable ghost of the previous page for ~0.5 s.
  const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
  curEl.style.transition = `transform 180ms ${EASING}, opacity 110ms ease-out`;
  nextEl.style.transition = `transform 240ms ${EASING}, opacity 180ms ease-out`;

  curEl.style.transform = `translate3d(calc(-50% + ${-dir * W_SLIDE}px), 0, 0) scale(0.96)`;
  curEl.style.opacity = '0';
  nextEl.style.transform = 'translate3d(-50%, 0, 0) scale(1)';
  nextEl.style.opacity = '1';

  clearTimeout(slideTimeout);
  finishSlideWhenReady(nextEl, () => {
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
  });
}

function pageStep(d) {
  const list = pageList();
  if (list.length <= 1) return;
  const i = list.indexOf(PAGE_OF[curKey] || 'home');
  const nextView = pageTarget(list[(i + d + list.length) % list.length]);
  slideToView(nextView, d);
}

acts.pgprev = () => pageStep(-1);
acts.pgnext = () => pageStep(1);
const pagerDots=$('#dots');
const pagerHoverZone=$('#pager-hover-zone');
let pagerDrag=null;
let pagerHoverExitTimer=0;
function persistPagerOrder(){
  const visible=[...pagerDots.querySelectorAll('i[data-p]')].map(el=>el.dataset.p);
  if(!visible.length)return;
  const visibleSet=new Set(visible);
  let cursor=0;
  const configured=Array.isArray(S.settings.menuOrder)?S.settings.menuOrder:pageList();
  S.settings.menuOrder=configured.map(key=>visibleSet.has(key)?visible[cursor++]:key);
  bridge.saveSettings?.({menuOrder:S.settings.menuOrder});
}
function openPagerMenu(){
  clearTimeout(pagerHoverExitTimer);
  if(!S.expanded || !PAGE_OF[curKey])return;
  if(S.menuHover)return;
  S.menuHover=true;
  island.dataset.menuHover='1';
  layout();
}
function schedulePagerMenuClose(){
  clearTimeout(pagerHoverExitTimer);
  pagerHoverExitTimer=setTimeout(()=>{
    if(pagerDrag||pagerDots?.matches(':hover')||pagerHoverZone?.matches(':hover'))return;
    S.menuHover=false;
    delete island.dataset.menuHover;
    layout();
  },90);
}
for(const target of [pagerHoverZone,pagerDots]){
  target?.addEventListener('pointerenter',openPagerMenu);
  target?.addEventListener('pointerleave',schedulePagerMenuClose);
}
pagerDots?.addEventListener('pointerdown',(e)=>{
  const item=e.target.closest('i[data-p]');
  if(e.button!==0||!item||!S.menuHover)return;
  pagerDrag={id:e.pointerId,item,startX:e.clientX,startY:e.clientY,active:false};
  item.setPointerCapture?.(e.pointerId);
});
pagerDots?.addEventListener('pointermove',(e)=>{
  if(!pagerDrag||e.pointerId!==pagerDrag.id)return;
  if(!pagerDrag.active){
    if(Math.hypot(e.clientX-pagerDrag.startX,e.clientY-pagerDrag.startY)<6)return;
    pagerDrag.active=true;
    pagerDrag.item.classList.add('dragging');
    pagerDots.classList.add('reordering');
  }
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('#dots i[data-p]');
  if(!target||target===pagerDrag.item)return;
  const before=e.clientX<target.getBoundingClientRect().left+target.offsetWidth/2;
  pagerDots.insertBefore(pagerDrag.item,before?target:target.nextSibling);
});
function finishPagerDrag(e){
  if(!pagerDrag||e.pointerId!==pagerDrag.id)return;
  const wasActive=pagerDrag.active;
  pagerDrag.item.classList.remove('dragging');
  pagerDots.classList.remove('reordering');
  pagerDrag=null;
  if(wasActive){persistPagerOrder();suppressClickUntil=performance.now()+260;}
}
pagerDots?.addEventListener('pointerup',finishPagerDrag);
pagerDots?.addEventListener('pointercancel',finishPagerDrag);
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
  if(curKey==='notice'&&S.notice?.action?.kind==='whatsapp'){
    bridge.openWhatsApp?.(S.notice.action.sourceApp||'');S.notice=null;clearTimeout(noticeT);layout();return;
  }
  // Rapid clicks must not close what the first click just opened: a second click within 350 ms is ignored,
  // a popup ignores clicks for its first 800 ms, and a water pill that is playing its answer is left to finish.
  const clickAt = performance.now();
  if (clickAt - lastIslandClickAt < 350) { lastIslandClickAt = clickAt; return; }
  lastIslandClickAt = clickAt;
  if (S.miniPopup && clickAt - miniPopupShownAt < 800) return;
  if (S.miniPopup?.kind === 'waternotice' && typeof waterPill !== 'undefined' && waterPill?.answered) return;
  if (S.miniPopup?.kind === 'tasknotice' || S.miniPopup?.kind === 'prayernotice' || S.miniPopup?.kind === 'waternotice' || S.miniPopup?.kind === 'weathernotice' || S.miniPopup?.kind === 'timerpreview' || S.miniPopup?.kind === 'timerdone') {
    if (S.miniPopup?.kind === 'timerpreview' || S.miniPopup?.kind === 'timerdone') go('timer');
    else if (S.miniPopup?.kind === 'waternotice') go('water');
    else if (S.miniPopup?.kind === 'weathernotice') go('weather');
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
{
  // The specular highlight of the glass skin follows the pointer and glides back when it leaves.
  let glassFrame = 0, glassPoint = null;
  const paintGlassLight = () => {
    glassFrame = 0;
    const skin = document.getElementById('glass-skin');
    if (!skin) return;
    if (!glassPoint) { skin.style.removeProperty('--gx'); skin.style.removeProperty('--gy'); return; }
    const box = island.getBoundingClientRect();
    skin.style.setProperty('--gx', clamp((glassPoint.x - box.left) / Math.max(1, box.width) * 100, 0, 100).toFixed(1) + '%');
    skin.style.setProperty('--gy', clamp((glassPoint.y - box.top) / Math.max(1, box.height) * 100, 0, 100).toFixed(1) + '%');
  };
  island.addEventListener('pointermove', (e) => { if (island.dataset.theme !== 'full-glass') return; glassPoint = { x: e.clientX, y: e.clientY }; if (!glassFrame) glassFrame = requestAnimationFrame(paintGlassLight); });
  island.addEventListener('pointerleave', () => { glassPoint = null; if (!glassFrame) glassFrame = requestAnimationFrame(paintGlassLight); });
}
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
  if (e.button === 0 && S.expanded && PAGE_OF[curKey] && !isSliding && !e.target.closest('button, [data-act], [data-hold], input, textarea, .s-item, #m-bar, .ios-slider, .dashboard-glass-slider')) {
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

    finishSlideWhenReady(targetEl, () => {
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
    });
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
  if (!window.__GRUMP_WEBSITE_DEMO__ && S.expanded && PAGE_OF[curKey] && !e.target.closest('#v-connectivity,#connection-list,#timer-ruler,.addon-body,.notification-center-list,input,textarea,.ios-slider,.dashboard-glass-slider,#m-bar') && Math.max(Math.abs(e.deltaX),Math.abs(e.deltaY)) > 16) {
    const now = performance.now();
    if (now - lastWheelSlide > 320) {
      lastWheelSlide = now;
      e.preventDefault();
      pageStep((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)>0 ? 1 : -1);
    }
  }
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (window.__GRUMP_WEBSITE_DEMO__) return;
  if (!S.expanded || !PAGE_OF[curKey] || S.focusLock) return;
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

function resetDodgeState(inputRecovery = false) {
  if (inputRecovery) {
    clearTimeout(hoverT); hoverT = null;
    clearTimeout(collapseT); collapseT = null;
    inside = false;
    island.dataset.inside = '0';
    if (bridge.setMouseActive) bridge.setMouseActive(false);
  }
  if (isTuckDodging) {
    isTuckDodging = false;
    island.dataset.dodging = '0';
    if (bridge.setDodge) bridge.setDodge(false);
    island.style.removeProperty('--pk-opacity');
    island.style.removeProperty('--pk-scale-y');
  }
  targetDodgeH = 22; targetDodgeW = 56; targetDodgeR = 11;
  if (inputRecovery) {
    clearTimeout(hoverT); hoverT = null;
    clearTimeout(collapseT); collapseT = null;
    inside = false;
    island.dataset.inside = '0';
    S.focusLock = false;
    S.dragLock = false;
    S.expanded = false;
    S.notice = null;
    if (S.miniPopup) { S.miniPopup = null; clearTimeout(miniPopupTimer); miniPopupTimer = null; }
    S.peek = null;
    clearTimeout(peekT);
    if (bridge.setExpanded) bridge.setExpanded(false);
    if (bridge.setMouseActive) bridge.setMouseActive(false);
  }
  lastRectSig = '';
  layout();
  reportRect();
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
  bridge.onResetDodge((detail) => resetDodgeState(detail?.inputRecovery === true));
}
if (bridge.onWakeProbe && bridge.wakeAck) {
  bridge.onWakeProbe((token) => {
    requestAnimationFrame(() => requestAnimationFrame(() => bridge.wakeAck(token, `${curKey}${S.gameMode ? '+game' : ''}${S.settings?.quiet ? '+quiet' : ''}`)));
  });
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
let tickTimer = null;
function tickDelay() {
  const active = S.expanded || animating || inside || hasActivity() || S.ring || S.notice || S.charge || S.headset || S.workActivity || S.miniPopup;
  return active ? 200 : 1000;
}
function runTicks() {
  for (const f of ticks) f();
  tickTimer = setTimeout(runTicks, tickDelay());
}
tickTimer = setTimeout(runTicks, 200);

window.addEventListener("resize",()=>{lastRectSig="";reportRect();});
