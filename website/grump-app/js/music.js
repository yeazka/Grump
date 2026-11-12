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
activityProviders.push(() => S.settings.menuMusic !== false && isPlaying() && !S.pipOpen); // the floating lyrics replace the compact music view
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
  const win = String(m.win || '').toLowerCase();
  // Word start only, so ids such as "Microsoft.Windows.Search" (contains "arc") are not mistaken for a browser.
  const isBrowser = /(?:^|[^a-z])(?:chrome|msedge|brave|firefox|opera|vivaldi|arc|zen|floorp)/.test(app);
  if (isBrowser) {
    /* A browser only says "Brave" or "Chrome"; the site comes from the tab title in the window title. Unknown sites are shown as the web, never as YouTube. */
    const site = `${win} ${album}`;
    const known = [
      [/youtube|youtu\.be/, { type: 'youtube', name: 'YouTube', color: '#ff0000', ico: 'youtube' }],
      [/tiktok/, { type: 'tiktok', name: 'TikTok', color: '#25f4ee', ico: 'tiktok', shader: 'apple' }],
      [/elevenlabs|eleven labs/, { type: 'elevenlabs', name: 'ElevenLabs', color: '#e8e8e8', ico: 'elevenlabs', shader: 'web' }],
      [/spotify/, { type: 'spotify', name: 'Spotify', color: '#1ed760', ico: 'spotify' }],
      [/soundcloud/, { type: 'soundcloud', name: 'SoundCloud', color: '#ff5500', ico: 'soundcloud' }],
      [/twitch/, { type: 'twitch', name: 'Twitch', color: '#9146ff', ico: 'twitch', shader: 'web' }],
      [/apple music/, { type: 'apple', name: 'Apple Music', color: '#fa2d48', ico: 'apple' }]
    ];
    for (const [re, info] of known) if (re.test(site)) return info;
    return { type: 'web', name: 'Web', color: '#d8dce6', ico: 'globe', shader: 'web' };
  }
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
    window.musicShader.setApp(info.shader || info.type, true);
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
  if (!d || !d.active) { S.media = null; setArt(null); S.lyrics = null; S.plainLyrics = null; updateMediaAppUI(); layout(); return; }
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
    S.lyrics = null; S.plainLyrics = null; S.lyricsFor = null;
    loadLyrics();
  } else if (!S.lyricsFor) {
    loadLyrics();
  }
  layout();
  ensureProg();
});

function getLiveLyricsContext() {
  if (!S.media) return { prev: '', cur: isId() ? 'Tidak ada musik diputar' : 'No music playing', next: '', hasLyrics: false };
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
    return { prev: '', cur: isId() ? 'Memuat lirik...' : 'Loading lyrics...', next: '', hasLyrics: false };
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
    setText('m-title', isId() ? 'Tidak ada musik diputar' : 'No music playing');
    setText('m-artist', isId() ? 'Buka Spotify atau pemutar lain' : 'Open Spotify or another player');
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
let progLast = 0;
function progLoop(ts) {
  if ((curKey !== 'music' && curKey !== 'lyrics' && curKey !== 'compact') || !S.media) { progOn = false; return; }
  // Nothing here needs 60 updates a second: the compact view only looks for a new lyric line, the bar and lyric page for a change of a pixel or a line.
  const every = curKey === 'compact' ? 100 : curKey === 'lyrics' ? 50 : 33;
  if (!(ts - progLast < every)) { progLast = ts; paintProg(); }
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
    window.musicShader.setApp(info.shader || info.type, true);
    if (isPlaying()) window.musicShader.start();
    else window.musicShader.stop();
  }
};
ticks.push(() => {
  if ((curKey !== 'music' || !isPlaying()) && window.musicShader) {
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
/* ---------- Floating lyrics (PiP) ---------- */
// While the floating window is open the notch stays compact and quiet; closing it brings back what was there before.
S.pipOpen = false;
let pipReturnToLyrics = false, pipTimer = 0, pipSig = '';
function pipSend() {
  if (!S.pipOpen) return;
  const m = S.media;
  const sig = `${S.lyricsFor}|${S.lyricsState}|${S.lyrics?.length || 0}|${S.plainLyrics?.length || 0}|${S.lyricsTr ? 1 : 0}`;
  const payload = { title: m?.title || '', artist: m?.artist || '', art: m?.art || null, id: isId(), playing: isPlaying(), pos: curPos(), state: S.lyricsState === 'loading' ? 'loading' : 'done' };
  if (sig !== pipSig) { pipSig = sig; payload.lyrics = S.lyrics || null; payload.plain = S.plainLyrics || null; payload.tr = S.lyricsTr || null; }
  bridge.pipUpdate?.(payload);
}
acts.lyricpip = () => {
  pipReturnToLyrics = S.view === 'lyrics';
  S.pipOpen = true; pipSig = '';
  bridge.pipOpen?.();
  pipSend();
  clearInterval(pipTimer); pipTimer = setInterval(pipSend, 700);
  collapse();
};
bridge.onPipClosed?.(() => {
  S.pipOpen = false; clearInterval(pipTimer);
  if (pipReturnToLyrics && hasMedia()) go('lyrics'); else layout();
});acts.closemusic = () => {
  mediaDismissed = true;
  mediaCmd('pause');
  openDefault();
};
$('#m-bar').addEventListener('click', (e) => {
  if (!S.media || !(S.media.dur > 0)) return;
  const r = $('#m-bar').getBoundingClientRect();
  const sec = clamp((e.clientX - r.left) / r.width, 0, 1) * S.media.dur;
  S.media.pos = sec; S.media.at = performance.now(); paintProg(); bridge.mediaCmd('seek:' + sec.toFixed(1));
});

/* ---------- Lirik tersinkron (LRCLIB lewat main process), gaya Apple Music ---------- */
// Active line big and white, the rest dimmed and blurred by distance. When the active line changes the whole
// list glides up and the lines after it follow one after another (stagger). Inside the active line each word
// lights up in turn across the line's duration, and long instrumental gaps become three dots that fill.
let lyIdx = -2;
let lyAnimBase = 0;          // performance.now() at the start of the active line (keeps word timing in step)
let lyNeedsLayout = false;   // the page was hidden when the line changed, lay out as soon as it is visible
const LY_ANCHOR = 0.16;      // top of the active line, as a share of the lyrics window height
const LY_STAGGER = 0.05;     // seconds between lines following the active line
const LY_GAP_MIN = 4;        // an empty lyric line at least this long (s) is shown as an interlude
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
// "Words" for the highlight: spaces separate them; scripts without spaces (CJK, Thai) use the browser's segmenter.
function lyricWords(text) {
  if (/\s/.test(text)) return { parts: text.split(/\s+/).filter(Boolean), joiner: ' ' };
  if (text.length > 6 && typeof Intl !== 'undefined' && Intl.Segmenter) {
    const parts = [];
    for (const seg of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)) {
      if (seg.isWordLike || !parts.length) parts.push(seg.segment); else parts[parts.length - 1] += seg.segment;
    }
    if (parts.length > 1) return { parts, joiner: '' };
  }
  return { parts: [text], joiner: '' };
}
function renderLyricsList() {
  const list = $('#ly-list');
  const win = list.parentElement;
  const plain = !S.lyrics?.length && S.plainLyrics?.length;
  win.classList.toggle('plain', !!plain);
  list.style.transform = '';
  if (S.lyricsState === 'loading') list.innerHTML = `<div class="ly msg">${isId() ? 'Memuat lirik…' : 'Loading lyrics…'}</div>`;
  else if (plain) list.innerHTML = `<div class="ly-plain-label">${isId() ? 'Belum tersinkron' : 'Not synced'}</div>` + S.plainLyrics.map(line => `<div class="ly plain-line">${esc(line)}</div>`).join('');
  else if (!S.lyrics || !S.lyrics.length) list.innerHTML = `<div class="ly msg">${isId() ? 'Tidak ada lirik' : 'No lyrics available'}</div>`;
  else list.innerHTML = S.lyrics.map((l, i) => {
    const next = S.lyrics[i + 1];
    const dur = next ? Math.max(0.2, next.t - l.t) : 6;
    if (!l.text) {
      return dur >= LY_GAP_MIN
        ? `<div class="ly gap" data-i="${i}" data-dur="${dur.toFixed(2)}" data-dist="4" aria-hidden="true"><i></i><i></i><i></i></div>`
        : `<div class="ly skip" data-i="${i}" aria-hidden="true"></div>`;
    }
    const { parts, joiner } = lyricWords(l.text);
    const tr = S.lyricsTr && S.lyricsTr[i] ? `<small class="ly-tr">${esc(S.lyricsTr[i])}</small>` : '';
    return `<div class="ly" data-i="${i}" data-dur="${dur.toFixed(2)}" data-dist="4">${parts.map(w => `<span class="ly-w">${esc(w)}</span>`).join(joiner)}${tr}</div>`;
  }).join('');
  lyIdx = -2;
  if (S.lyrics && S.lyrics.length) paintLyrics(curPos(), true);
  else if (plain) win.scrollTop = 0;
}
async function loadLyrics() {
  const m = S.media; if (!m) return;
  const key = trackKey(m);
  if (S.lyricsFor === key) { renderLyricsList(); return; }
  S.lyricsFor = key; S.lyrics = null; S.plainLyrics = null; S.lyricsTr = null; S.lyricsState = 'loading'; renderLyricsList();
  let txt = null;
  try { txt = await bridge.getLyrics({ title: m.title, artist: m.artist, dur: m.dur }); } catch {}
  if (S.lyricsFor !== key) return;
  S.lyrics = typeof txt === 'string' ? parseLRC(txt) : null;
  S.plainLyrics = txt?.plainLyrics ? String(txt.plainLyrics).split(/\r?\n/).map(line => line.trim()).filter(Boolean) : null;
  S.lyricsState = 'done';
  renderLyricsList();
  translateCurrentLyrics(key);
}
// Optional (Preferences > Features > Translate lyrics): the lines go to a translation service, one batch per track, and come back as a small second line.
async function translateCurrentLyrics(key) {
  if (!S.settings || S.settings.lyricTranslate !== true || !S.lyrics || !S.lyrics.length || !bridge.translateLyrics) return;
  const target = S.settings.translateLang || 'en';
  let result = null;
  try { result = await bridge.translateLyrics(S.lyrics.map((l) => l.text || ''), target); } catch { /* offline */ }
  if (S.lyricsFor !== key || !Array.isArray(result)) return;
  // a line that is already in the target language comes back unchanged: do not repeat it
  S.lyricsTr = result.map((line, i) => (line && line.toLowerCase() !== String(S.lyrics[i].text || '').toLowerCase() ? line : ''));
  renderLyricsList();
}
const AUDIO_OFFSET = 0.32;

// Words of the active line light up one after another. Each word gets a delay and a duration proportional to its
// length; a negative delay starts the line partway through (after a seek or when the page opens mid-line).
function activateLyricLine(item, elapsed) {
  lyAnimBase = performance.now() - Math.max(0, elapsed) * 1000;
  animateLyricWords(item, elapsed, 'page');
}
// scope 'page' = the lyrics page, 'compact' = the notch line: each keeps its own clock for drift detection.
function animateLyricWords(item, elapsed, scope) {
  if (scope === 'compact') compactAnimBase = performance.now() - Math.max(0, elapsed) * 1000;
  const dur = Number(item.dataset.dur) || 3;
  if (item.classList.contains('gap')) {
    item.style.setProperty('--dur', dur + 's');
    item.style.setProperty('--el', (-Math.max(0, elapsed)).toFixed(3) + 's');
    item.classList.remove('go'); void item.offsetWidth; item.classList.add('go');
    return;
  }
  const words = [...item.querySelectorAll('.ly-w')];
  const span = clamp(dur * 0.88, 0.8, 7); // finish slightly before the next line starts
  const total = words.reduce((sum, w) => sum + w.textContent.length + 1, 0) || 1;
  let acc = 0;
  for (const w of words) {
    const len = w.textContent.length + 1;
    w.style.animationDelay = ((span * acc / total) - elapsed).toFixed(3) + 's';
    w.style.animationDuration = Math.max(0.12, span * len / total).toFixed(3) + 's';
    acc += len;
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }
}
function paintLyrics(pos, force) {
  if (!S.lyrics || !S.lyrics.length) return;
  const list = $('#ly-list');
  if (!list) return;
  const effPos = pos + AUDIO_OFFSET;
  let idx = -1;
  for (let i = 0; i < S.lyrics.length; i++) { if (S.lyrics[i].t <= effPos) idx = i; else break; }
  const playing = isPlaying();
  list.classList.toggle('paused', !playing);
  // Keep the word animation in step with playback: pausing freezes it, a seek inside the line restarts it.
  if (idx >= 0) {
    const elapsed = effPos - S.lyrics[idx].t;
    if (!playing) lyAnimBase = performance.now() - elapsed * 1000;
    else if (idx === lyIdx && Math.abs(elapsed - (performance.now() - lyAnimBase) / 1000) > 0.7) force = true;
  }
  if (idx === lyIdx && !force && !lyNeedsLayout) return;

  const win = list.parentElement;
  const height = win.clientHeight;
  if (!height) { lyNeedsLayout = true; return; }
  lyNeedsLayout = false;
  const lineChanged = idx !== lyIdx;
  const cur = list.children[idx];
  const first = list.children[0];
  const shift = (height * LY_ANCHOR) - (cur ? cur.offsetTop : (first ? first.offsetTop : 0));
  for (let i = 0; i < list.children.length; i++) {
    const item = list.children[i];
    if (item.classList.contains('skip')) continue;
    const dist = idx < 0 ? i + 1 : Math.abs(i - idx);
    item.dataset.dist = String(Math.min(dist, 4));
    item.classList.toggle('cur', i === idx);
    item.classList.toggle('past', i < idx);
    // Lines after the active one follow in sequence; lines already read move at once.
    item.style.setProperty('--delay', (lineChanged && i > idx ? Math.min(i - Math.max(idx, -1), 6) * LY_STAGGER : 0).toFixed(3) + 's');
    item.style.setProperty('--shift', shift.toFixed(1) + 'px');
  }
  lyIdx = idx;
  if (cur) activateLyricLine(cur, effPos - S.lyrics[idx].t);
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
  if (S.plainLyrics && S.plainLyrics.length) {
    const lines = S.plainLyrics.filter(Boolean);
    if (lines.length) {
      const duration = Number(S.media.dur) || 0;
      const progress = duration > 0 ? clamp(curPos() / duration, 0, 0.999999) : 0;
      return lines[Math.min(lines.length - 1, Math.floor(progress * lines.length))] || lines[0];
    }
  }
  return S.media.title || '';
}

/* ---------- Compact Lyric & Player View ---------- */
// One lyric line inside the notch. The notch grows slightly BEFORE a longer line arrives, the old line blurs out,
// the new line blurs in once the notch is ready, and its words light up in turn, like the full lyrics page.
const COMPACT_LEAD = 0.45;     // s: start growing the notch this long before a longer line begins
let lastCompactKey = '';
let compactAnimBase = 0;       // performance.now() at the start of the shown line (keeps word timing in step)
let lyricViewportFor = '';
let measureCanvasCtx = null;
function measureLyricWidth(text, size) {
  if (!measureCanvasCtx) {
    measureCanvasCtx = document.createElement('canvas').getContext('2d');
  }
  measureCanvasCtx.font = `600 ${size}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
  return measureCanvasCtx.measureText(text).width;
}
function compactWidthFor(text) {
  return clamp(Math.ceil(measureLyricWidth(text, 12.5)) + 110, 250, Math.min(850, screen.availWidth - 80));
}
function setCompactWidth(width) {
  if (SIZES.compact[0] === width) return;
  SIZES.compact[0] = width;
  requestAnimationFrame(() => { if (curKey === 'compact') layout(); });
}
// The overlay window is resized once per track, for the widest line, instead of on every line change: resizing a
// transparent window mid-song is what made the notch flicker on wide lines.
function ensureLyricViewport() {
  if (!S.lyrics || !S.lyrics.length || lyricViewportFor === S.lyricsFor) return;
  lyricViewportFor = S.lyricsFor;
  let widest = 250;
  for (const line of S.lyrics) if (line.text) widest = Math.max(widest, compactWidthFor(line.text));
  bridge.lyricViewport?.(widest);
}

// What the notch should show right now. An empty lyric line shorter than a gap keeps the previous sung line on
// screen (no flash of the song title between phrases); a long one becomes the three interlude dots.
function compactLyricInfo() {
  if (!S.media) return null;
  if (S.lyrics && S.lyrics.length) {
    const effPos = curPos() + AUDIO_OFFSET;
    let idx = -1;
    for (let i = 0; i < S.lyrics.length; i++) { if (S.lyrics[i].t <= effPos) idx = i; else break; }
    const lineDur = (i) => (S.lyrics[i + 1] ? Math.max(0.2, S.lyrics[i + 1].t - S.lyrics[i].t) : 6);
    if (idx >= 0) {
      let show = idx;
      while (show >= 0 && !S.lyrics[show].text && lineDur(show) < LY_GAP_MIN) show--;
      if (show >= 0) {
        const line = S.lyrics[show];
        const upcoming = S.lyrics[idx + 1];
        const info = { kind: line.text ? 'line' : 'gap', key: (line.text ? 'l' : 'g') + show + ':' + S.lyricsFor, text: line.text, elapsed: effPos - line.t, dur: lineDur(show) };
        if (upcoming && upcoming.text) { info.upcoming = upcoming.text; info.untilNext = upcoming.t - effPos; }
        return info;
      }
    }
  }
  const text = getCurrentLyricLine();
  return text ? { kind: 'text', key: 't:' + text, text } : null;
}

function removeCompactLyric(el, delay = 260) {
  if (!el) return;
  el.id = ''; el.className = 'c-lyric out';
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, delay);
}

function updateCompactLyric(info) {
  const mid = $('#c-mid');
  if (!mid) return;
  if (!info) {
    lastCompactKey = '';
    removeCompactLyric($('#c-lyric'), 350);
    return;
  }
  ensureLyricViewport();
  const curLy = $('#c-lyric');

  // Grow the notch ahead of a longer line so the text arrives into a notch that is already wide enough.
  if (info.upcoming && info.untilNext <= COMPACT_LEAD) {
    const ahead = compactWidthFor(info.upcoming);
    if (ahead > SIZES.compact[0] + 2) setCompactWidth(ahead);
  }

  if (info.key === lastCompactKey && curLy) {
    // Same line: after a seek (or a long stall) the word highlight is restarted from the real position.
    if (info.kind === 'line') {
      const playing = isPlaying();
      if (!playing) compactAnimBase = performance.now() - info.elapsed * 1000;
      else if (Math.abs(info.elapsed - (performance.now() - compactAnimBase) / 1000) > 0.7) animateLyricWords(curLy, info.elapsed, 'compact');
    }
    return;
  }
  lastCompactKey = info.key;

  const needed = info.kind === 'gap' ? SIZES.compact[0] : compactWidthFor(info.text);
  const growing = needed > SIZES.compact[0] + 2;
  const shrinking = needed < SIZES.compact[0] - 2;
  setCompactWidth(needed);

  const newLy = document.createElement('span');
  newLy.className = 'c-lyric in' + (info.kind === 'gap' ? ' gap' : '') + (info.kind === 'line' ? ' synced' : '');
  // Text waits for the notch: longer line = wait for it to open, shorter = old text has just left.
  newLy.style.setProperty('--c-in-delay', (growing ? 0.2 : shrinking ? 0.1 : 0.05) + 's');
  newLy.style.fontSize = '12.5px';
  if (info.kind === 'gap') {
    newLy.innerHTML = '<i></i><i></i><i></i>';
    newLy.dataset.dur = info.dur.toFixed(2);
  } else if (info.kind === 'line') {
    const { parts, joiner } = lyricWords(info.text);
    newLy.innerHTML = `<span class="c-lyric-words">${parts.map((w) => `<span class="ly-w">${esc(w)}</span>`).join(joiner)}</span>`;
    newLy.dataset.dur = info.dur.toFixed(2);
  } else {
    newLy.textContent = info.text;
  }
  newLy.id = 'c-lyric';
  removeCompactLyric(curLy);
  mid.appendChild(newLy);
  if (info.kind === 'line' || info.kind === 'gap') animateLyricWords(newLy, info.elapsed, 'compact');
}
function renderCompact() {
  const el = $('#v-compact');
  const music = hasMusic();
  el.dataset.lead = 'art';
  el.dataset.trail = 'bars';
  el.classList.toggle('paused', !isPlaying());
  const cb = $('#c-bars');
  if (cb) cb.classList.toggle('paused', !isPlaying());

  const titleOnly = S.settings.compactLyrics === false && S.media && S.media.title ? { kind: 'text', key: 't:' + S.media.title, text: S.media.title } : null;
  updateCompactLyric(S.pipOpen ? null : music ? (titleOnly || compactLyricInfo()) : (S.media && S.media.title ? { kind: 'text', key: 't:' + S.media.title, text: S.media.title } : null));
}
renderers.push(renderCompact);

$('#ly-list').addEventListener('click', (e) => {
  const el = e.target.closest('.ly[data-i]'); if (!el || !S.lyrics) return;
  const t = S.lyrics[+el.dataset.i].t;
  S.media.pos = t; S.media.at = performance.now(); bridge.mediaCmd('seek:' + t.toFixed(1)); paintLyrics(t, true);
});
$('#ly-art').dataset.act = 'music';
updateMediaAppUI();
