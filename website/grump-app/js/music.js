'use strict';
/* ===== MUSIK + LIRIK ===== */
S.media = null;
S.lastPlayingAt = 0;
let pausedT = null;
let mediaDismissed = false;
let optimisticStatus = null;
let optimisticUntil = 0;
window.unDismissMedia = () => { mediaDismissed = false; };

const isPlaying = () => !mediaDismissed && !!S.media && S.media.status === 'Playing';
const hasMedia = () => !mediaDismissed && !!(S.media && (S.media.title || S.media.status === 'Playing' || S.media.app));
const hasMusic = () => hasMedia();
activityProviders.push(() => S.settings.menuMusic !== false && isPlaying());
ticks.push(() => {
  const pk = $('#v-peekaboo');
  if (pk) pk.dataset.music = '0';
});

const fmtM = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };

function curPos() {
  const m = S.media; if (!m) return 0;
  const p = m.pos + (isPlaying() ? (performance.now() - m.at) / 1000 : 0);
  return m.dur > 0 ? Math.min(p, m.dur) : p;
}

/* ---------- Cover + warna aksen ---------- */
function detectMediaApp(m) {
  if (!m) return { type: 'spotify', name: 'Spotify', color: '#1ed760', ico: 'spotify' };
  const app = String(m.app || '').toLowerCase();
  const artist = String(m.artist || '').toLowerCase();
  const album = String(m.album || '').toLowerCase();
  const title = String(m.title || '').toLowerCase();
  const all = `${app} ${artist} ${album} ${title}`;

  if (all.includes('spotify')) {
    return { type: 'spotify', name: 'Spotify', color: '#1ed760', ico: 'spotify' };
  }
  if (all.includes('youtube') || all.includes('youtu.be') || all.includes('yt music') || all.includes('music.youtube')) {
    return { type: 'youtube', name: 'YouTube', color: '#ff0000', ico: 'youtube' };
  }
  if (all.includes('apple') || all.includes('itunes')) {
    return { type: 'apple', name: 'Apple Music', color: '#fa2d48', ico: 'apple' };
  }
  if (all.includes('soundcloud')) {
    return { type: 'soundcloud', name: 'SoundCloud', color: '#ff5500', ico: 'soundcloud' };
  }
  if (/chrome|msedge|brave|firefox|opera|vivaldi|arc|zen|floorp/.test(app)) {
    return { type: 'youtube', name: 'YouTube', color: '#ff0000', ico: 'youtube' };
  }
  return { type: 'spotify', name: 'Spotify', color: '#1ed760', ico: 'spotify' };
}

function updateMediaAppUI() {
  const info = detectMediaApp(S.media);
  const root = document.documentElement.style;
  const isMusicActive = (isPlaying() || S.view === 'music' || (S.media && S.media.title)) && !mediaDismissed;
  island.dataset.mediaApp = isMusicActive ? info.type : 'none';
  island.dataset.spotify = (isMusicActive && info.type === 'spotify') ? '1' : '0';
  root.setProperty('--media-beam-color', info.color);
  root.setProperty('--media-beam-glow', info.type === 'spotify' ? 'rgba(30, 215, 96, .42)' : (info.type === 'youtube' ? 'rgba(255, 30, 30, .42)' : (info.type === 'apple' ? 'rgba(250, 45, 72, .42)' : 'rgba(255, 85, 0, .42)')));
  root.setProperty('--bars-color', info.color);
  root.setProperty('--bars-glow', info.type === 'spotify' ? 'rgba(30, 215, 96, .45)' : (info.type === 'youtube' ? 'rgba(255, 0, 0, .45)' : 'rgba(255, 255, 255, .3)'));

  if (window.musicShader) {
    window.musicShader.setApp(info.type, true);
    if (curKey === 'music' && isPlaying()) {
      window.musicShader.start();
    }
  }

  const cIco = $('#c-app-ico') || $('#c-art [data-ico]');
  if (cIco) {
    cIco.dataset.app = info.type;
    cIco.dataset.ico = info.ico;
    cIco.title = info.name;
    cIco.innerHTML = ICONS[info.ico] || ICONS.note;
  }
  const mIco = $('#m-app-ico');
  if (mIco) {
    mIco.dataset.app = info.type;
    mIco.dataset.ico = info.ico;
    mIco.title = info.name;
    mIco.innerHTML = ICONS[info.ico] || '';
  }
  const mArtIco = $('#m-art [data-ico]');
  if (mArtIco) {
    mArtIco.dataset.ico = info.ico;
    mArtIco.innerHTML = ICONS[info.ico] || ICONS.note;
  }
  const lyArtIco = $('#ly-art [data-ico]');
  if (lyArtIco) {
    lyArtIco.dataset.ico = info.ico;
    lyArtIco.innerHTML = ICONS[info.ico] || ICONS.note;
  }
  const hMusic = $('#h-music');
  if (hMusic) {
    hMusic.innerHTML = ICONS[info.ico] || ICONS.note;
  }
}

function setArt(url) {
  for (const id of ['m-art', 'ly-art']) {
    const el = $('#' + id);
    if (!el) continue;
    el.classList.toggle('noart', !url);
    el.style.backgroundImage = url ? `url(${url})` : '';
  }
  const cEl = $('#c-art');
  if (cEl) {
    cEl.classList.remove('noart');
    cEl.style.backgroundImage = '';
  }
  const root = document.documentElement.style;
  if (!url) {
    const info = detectMediaApp(S.media);
    root.setProperty('--accent', info.color);
    return;
  }
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data; let best = null, bs = -1;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const score = (mx ? (mx - mn) / mx : 0) * (0.4 + mx / 255);
        if (score > bs) { bs = score; best = [d[i], d[i + 1], d[i + 2]]; }
      }
      if (best) {
        const f = Math.max(1, Math.min(200 / Math.max(...best, 1), 2.2));
        root.setProperty('--accent', `rgb(${best.map((v) => Math.min(255, Math.round(v * f))).join(',')})`);
      }
    } catch {}
  };
  img.src = url;
}

const trackKey = (m) => (m ? `${m.title}|${m.artist}` : '');
bridge.onMedia((d) => {
  if (!d || !d.active) { S.media = null; setArt(null); S.lyrics = null; updateMediaAppUI(); layout(); return; }
  const prev = S.media;
  const changed = !prev || trackKey(prev) !== trackKey(d);

  // Lock out temporary lag/rubber-banding from OS polling right after user clicks play/pause
  if (!changed && Date.now() < optimisticUntil && optimisticStatus) {
    if (d.status !== optimisticStatus) {
      d.status = optimisticStatus;
    } else {
      optimisticStatus = null;
    }
  } else if (changed) {
    optimisticStatus = null;
  }

  if (changed || (d.status === 'Playing' && (!prev || prev.status !== 'Playing'))) {
    mediaDismissed = false;
  }
  const m = { ...d, at: performance.now() };
  if (d.thumb) { m.art = `data:${d.mime || 'image/jpeg'};base64,${d.thumb}`; setArt(m.art); }
  else if (!changed && prev) m.art = prev.art;
  else { m.art = null; setArt(null); }
  delete m.thumb;
  S.media = m;
  updateMediaAppUI();
  if (m.status === 'Playing') {
    S.lastPlayingAt = performance.now();
  } else {
    S.activityAt = Date.now() - 6000;
  }
  clearTimeout(pausedT);
  if (changed) {
    S.lyrics = null; S.lyricsFor = null;
    loadLyrics();
  } else if (!S.lyricsFor) {
    loadLyrics();
  }
  layout();
  ensureProg();
});

function getLiveLyricsContext() {
  if (!S.media) return { prev: '', cur: 'No music playing', next: '', hasLyrics: false };
  if (S.lyrics && S.lyrics.length) {
    const pos = curPos();
    const effPos = pos + AUDIO_OFFSET;
    let idx = -1;
    for (let i = 0; i < S.lyrics.length; i++) {
      if (S.lyrics[i].t <= effPos) idx = i;
      else break;
    }
    if (idx >= 0) {
      const prev = (idx > 0 && S.lyrics[idx - 1]) ? S.lyrics[idx - 1].text : '';
      const cur = S.lyrics[idx].text || '♪';
      const next = (idx + 1 < S.lyrics.length && S.lyrics[idx + 1]) ? S.lyrics[idx + 1].text : '';
      return { prev, cur, next, hasLyrics: true, idx };
    }
  }
  if (S.lyricsState === 'loading') {
    return { prev: '', cur: 'Loading lyrics...', next: '', hasLyrics: false };
  }
  return { prev: '', cur: S.media.title || 'Playing', next: S.media.artist || '', hasLyrics: false };
}

let lastLyCurText = '';
function updateMusicLyricsUI() {
  const ctx = getLiveLyricsContext();
  setText('nusa-ly-prev', ctx.prev || '');
  if (lastLyCurText !== ctx.cur) {
    lastLyCurText = ctx.cur;
    setText('nusa-ly-text', ctx.cur || '—');
  }
  setText('nusa-ly-next', ctx.next || '');
  const bullet = document.querySelector('#nusa-ly-cur .nusa-note-bullet');
  if (bullet) bullet.style.display = ctx.hasLyrics ? 'inline' : 'none';
}

/* ---------- Render ---------- */
function renderMusic() {
  const m = S.media;
  document.querySelectorAll('#v-music .ctl, #v-music [data-act="lyrics"]').forEach(b => b.disabled = !m);
  if (!m) {
    setText('m-title','No music playing');
    setText('m-artist','Open Spotify or another player');
    setText('m-cur','0:00');
    setText('m-rem','-0:00');
    return;
  }
  updateMediaAppUI();
  setText('m-title', m.title || '—');
  setText('m-artist', m.artist || m.app || '—');
  setText('ly-title', m.title || '—');
  setText('ly-artist', m.artist || m.app || '—');
  $('#m-bars').classList.toggle('paused', !isPlaying());
  const vLy = $('#v-lyrics');
  if (vLy) vLy.classList.toggle('paused', !isPlaying());
  for (const id of ['m-pp', 'ly-pp']) {
    const pp = $('#' + id); const want = isPlaying() ? 'pause' : 'play';
    if (pp && pp.dataset.ico !== want) { pp.dataset.ico = want; pp.innerHTML = icoOf(want); }
  }
  paintProg();
}
renderers.push(renderMusic);

/* ---------- Progress (rAF hanya saat view musik terlihat & playing) ---------- */
let progOn = false;
function paintProg() {
  const m = S.media; if (!m) return;
  const p = curPos();
  if (curKey === 'music') {
    const frac = m.dur > 0 ? p / m.dur : 0;
    const f = $('#m-fill');
    if (f) {
      f.style.transform = `scaleX(${clamp(frac, 0, 1).toFixed(4)})`;
      f.style.background = 'var(--bars-color, var(--accent))';
    }
    setText('m-cur', fmtM(p)); setText('m-rem', '-' + fmtM(Math.max(0, m.dur - p)));
  } else if (curKey === 'lyrics') {
    paintLyrics(p);
  } else if (curKey === 'compact') {
    if (typeof renderCompact === 'function') renderCompact();
  }
}
function progLoop() {
  if ((curKey !== 'music' && curKey !== 'lyrics' && curKey !== 'compact') || !S.media) { progOn = false; return; }
  paintProg();
  if (isPlaying()) requestAnimationFrame(progLoop); else progOn = false;
}
function ensureProg() {
  if (!progOn && (curKey === 'music' || curKey === 'lyrics' || curKey === 'compact') && isPlaying()) {
    progOn = true; requestAnimationFrame(progLoop);
  }
}
enterHooks.music = () => {
  ensureProg();
  if (window.musicShader) {
    const info = detectMediaApp(S.media);
    window.musicShader.setApp(info.type, true);
    window.musicShader.start();
  }
};
ticks.push(() => {
  if (curKey !== 'music' && window.musicShader) {
    window.musicShader.stop();
  }
});
enterHooks.lyrics = () => { loadLyrics(); ensureProg(); };
enterHooks.compact = ensureProg;

function mediaCmd(cmd) {
  if (cmd === 'toggle' && S.media) {
    const wasPlaying = isPlaying();
    const nextStatus = wasPlaying ? 'Paused' : 'Playing';
    optimisticStatus = nextStatus;
    optimisticUntil = Date.now() + 1400;
    S.media.pos = curPos();
    S.media.at = performance.now();
    S.media.status = nextStatus;
    if (nextStatus === 'Playing') {
      S.lastPlayingAt = performance.now();
    } else {
      S.activityAt = Date.now() - 6000;
    }
    layout();
    ensureProg();
    bridge.mediaCmd(wasPlaying ? 'pause' : 'play');
    return;
  }
  if (cmd === 'play' || cmd === 'pause') {
    const nextStatus = cmd === 'play' ? 'Playing' : 'Paused';
    optimisticStatus = nextStatus;
    optimisticUntil = Date.now() + 1400;
    if (S.media) {
      S.media.pos = curPos();
      S.media.at = performance.now();
      S.media.status = nextStatus;
    }
    layout();
    ensureProg();
    bridge.mediaCmd(cmd);
    return;
  }
  bridge.mediaCmd(cmd);
}
acts.prev = () => mediaCmd('prev');
acts.next = () => mediaCmd('next');
acts.toggle = () => mediaCmd('toggle');
acts.music = () => { mediaDismissed = false; go('music'); };
acts.lyrics = () => { mediaDismissed = false; go('lyrics'); };
acts.closemusic = () => {
  mediaDismissed = true;
  mediaCmd('pause');
  go('home');
};
$('#m-bar').addEventListener('click', (e) => {
  if (!S.media || !(S.media.dur > 0)) return;
  const r = $('#m-bar').getBoundingClientRect();
  const sec = clamp((e.clientX - r.left) / r.width, 0, 1) * S.media.dur;
  S.media.pos = sec; S.media.at = performance.now(); paintProg(); bridge.mediaCmd('seek:' + sec.toFixed(1));
});

/* ---------- Lirik tersinkron (LRCLIB lewat main process) ---------- */
const LH = 36;               // tinggi satu baris lirik
let lyIdx = -2;
function parseLRC(txt) {
  const out = [];
  for (const raw of String(txt).split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const s of stamps) out.push({ t: (+s[1]) * 60 + parseFloat(s[2]), text });
  }
  return out.sort((a, b) => a.t - b.t);
}
function renderLyricsList() {
  const list = $('#ly-list');
  if (S.lyricsState === 'loading') list.innerHTML = '<div class="ly msg">Memuat lirik…</div>';
  else if (!S.lyrics || !S.lyrics.length) list.innerHTML = '<div class="ly msg">Tidak ada lirik</div>';
  else list.innerHTML = S.lyrics.map((l, i) => {
    const tx = l.text || '';
    return `<div class="ly" data-i="${i}">${esc(tx || '♪')}</div>`;
  }).join('');
  list.style.transform = 'translateY(0)';
  lyIdx = -2;
  if (S.lyrics && S.lyrics.length) paintLyrics(curPos(), true);
  else list.style.transform = `translateY(${LY_CENTER - LH / 2}px)`;
}
const LY_CENTER = 65;
async function loadLyrics() {
  const m = S.media; if (!m) return;
  const key = trackKey(m);
  if (S.lyricsFor === key) { renderLyricsList(); return; }
  S.lyricsFor = key; S.lyrics = null; S.lyricsState = 'loading'; renderLyricsList();
  let txt = null;
  try { txt = await bridge.getLyrics({ title: m.title, artist: m.artist, dur: m.dur }); } catch {}
  if (S.lyricsFor !== key) return;
  S.lyrics = txt ? parseLRC(txt) : null;
  S.lyricsState = 'done';
  renderLyricsList();
}
const AUDIO_OFFSET = 0.32;

function paintLyrics(pos, force) {
  if (!S.lyrics || !S.lyrics.length) return;
  const effPos = pos + AUDIO_OFFSET;
  let idx = -1;
  for (let i = 0; i < S.lyrics.length; i++) { if (S.lyrics[i].t <= effPos) idx = i; else break; }
  const list = $('#ly-list');
  if (!list) return;

  if (idx !== lyIdx || force) {
    const prev = list.children[lyIdx], cur = list.children[idx];
    if (prev) prev.classList.remove('cur');
    if (cur) cur.classList.add('cur');

    for (let i = 0; i < list.children.length; i++) {
      const d = Math.abs(i - idx);
      const item = list.children[i];
      item.dataset.dist = d;
      if (d === 0) {
        item.style.opacity = '1';
        item.style.filter = 'none';
        item.style.transform = 'scale(1.04)';
        item.style.color = '#ffffff';
      } else if (d === 1) {
        item.style.opacity = '0.52';
        item.style.filter = 'blur(0.5px)';
        item.style.transform = 'scale(0.97)';
        item.style.color = 'rgba(255, 255, 255, 0.70)';
      } else if (d === 2) {
        item.style.opacity = '0.24';
        item.style.filter = 'blur(1.4px)';
        item.style.transform = 'scale(0.93)';
        item.style.color = 'rgba(255, 255, 255, 0.40)';
      } else {
        item.style.opacity = '0.08';
        item.style.filter = 'blur(2.4px)';
        item.style.transform = 'scale(0.88)';
        item.style.color = 'rgba(255, 255, 255, 0.20)';
      }
    }
    lyIdx = idx;
    if (cur) {
      const itemCenter = cur.offsetTop + cur.offsetHeight / 2;
      list.style.transform = `translateY(${LY_CENTER - itemCenter}px)`;
    } else {
      list.style.transform = `translateY(${LY_CENTER - (Math.max(idx, 0) * LH + LH / 2)}px)`;
    }
  }
}

function getCurrentLyricLine() {
  if (!S.media) return '';
  if (S.lyrics && S.lyrics.length) {
    const pos = curPos();
    const effPos = pos + AUDIO_OFFSET;
    let idx = -1;
    for (let i = 0; i < S.lyrics.length; i++) {
      if (S.lyrics[i].t <= effPos) idx = i;
      else break;
    }
    if (idx >= 0 && S.lyrics[idx].text) return S.lyrics[idx].text;
  }
  return S.media.title || '';
}

/* ---------- Compact Lyric & Player View ---------- */
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
  el.style.fontSize='12.5px';
  const width=clamp(Math.ceil(measureLyricWidth(text,12.5))+110,250,Math.min(850,screen.availWidth-80));
  const widthChanged=SIZES.compact[0]!==width;
  SIZES.compact[0]=width;
  if(widthChanged)requestAnimationFrame(()=>{if(curKey==='compact')layout();});
  bridge.lyricViewport?.(width);

}

function updateCompactLyric(line) {
  const mid = $('#c-mid');
  if (!mid) return;
  line = line ? line.trim() : '';
  if (!line) {
    lastCompactLyric = '';
    const cur = $('#c-lyric');
    if (cur) {
      cur.className = 'c-lyric out';
      setTimeout(() => { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 350);
    }
    return;
  }
  if (line === lastCompactLyric) return;
  lastCompactLyric = line;
  const curLy = $('#c-lyric');
  const newLy = document.createElement('span');
  newLy.className = 'c-lyric in';
  newLy.textContent = line;
  applyCompactLyricStyle(newLy, line);

  if (curLy && curLy.textContent) {
    curLy.id = '';
    curLy.className = 'c-lyric out';
    newLy.id = 'c-lyric';
    mid.appendChild(newLy);
    setTimeout(() => { if (curLy.parentNode) curLy.parentNode.removeChild(curLy); }, 380);
  } else {
    newLy.id = 'c-lyric';
    mid.appendChild(newLy);
  }
}

function renderCompact() {
  const el = $('#v-compact');
  const music = hasMusic();
  el.dataset.lead = 'art';
  el.dataset.trail = 'bars';
  el.classList.toggle('paused', !isPlaying());
  const cb = $('#c-bars');
  if (cb) cb.classList.toggle('paused', !isPlaying());

  const line = music ? getCurrentLyricLine() : (S.media ? S.media.title : '');
  updateCompactLyric(line);
}
renderers.push(renderCompact);

$('#ly-list').addEventListener('click', (e) => {
  const el = e.target.closest('.ly[data-i]'); if (!el || !S.lyrics) return;
  const t = S.lyrics[+el.dataset.i].t;
  S.media.pos = t; S.media.at = performance.now(); bridge.mediaCmd('seek:' + t.toFixed(1)); paintLyrics(t, true);
});
$('#ly-art').dataset.act = 'music';
updateMediaAppUI();
