'use strict';
// Dock demo for the welcome screen: the real dock's cosine magnification wave on a few demo icons. It sweeps by itself and follows the mouse.
(() => {
  const stage = document.getElementById('stage');
  const icons = ['dock-win/explorer', 'dock-win/notepad', 'dock-win/claude', 'dock-win/chatgpt', 'dock-win/antigravity', 'dock/terminal', 'dock/code', 'dock/settings'];
  const SLOT = 51, MAX = 1.7, WIDTH = 210;
  const items = icons.map((name, i) => {
    const item = document.createElement('div'); item.className = 'dock-item';
    const wrap = document.createElement('div'); wrap.className = 'dock-icon-wrapper';
    const img = document.createElement('img'); img.className = 'dock-icon-img'; img.alt = ''; img.src = `assets/${name}.svg`;
    wrap.append(img);
    if (i === 0 || i === 2 || i === 4) { const dot = document.createElement('span'); dot.className = 'dock-dot active'; wrap.append(dot); }
    item.append(wrap); stage.append(item);
    return wrap;
  });
  function wave(x) {
    items.forEach((wrap, i) => {
      const c = i * SLOT + SLOT / 2 - 2, min = x - WIDTH / 2;
      let s = 1;
      if (x !== null && c >= min && c <= x + WIDTH / 2) s = 1 + ((1 - Math.cos(((c - min) / WIDTH) * 2 * Math.PI)) / 2) * (MAX - 1);
      wrap.style.transform = `translateY(${-(s - 1) * 8}px) scale(${s})`;
    });
  }
  let mouse = null, t0 = performance.now();
  const SWEEP_MS = 3600;   // one pass of the wave, then it rests; the mouse brings it back
  document.addEventListener('mousemove', (e) => { const r = stage.getBoundingClientRect(); mouse = e.clientX - r.left; });
  document.addEventListener('mouseleave', () => { mouse = null; });
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function loop(now) {
    if (mouse !== null) wave(mouse);
    else if (!reduced && now - t0 < SWEEP_MS) { const p = (now - t0) / SWEEP_MS, x = -40 + (Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * (icons.length * SLOT + 80); wave(x); }
    else wave(null);
    requestAnimationFrame(loop);
  })(performance.now());
  const clock = document.getElementById('clock');
  const tick = () => {
    const d = new Date();
    clock.innerHTML = `<span class="dock-clock-time">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span class="dock-clock-date">${d.toLocaleDateString()}</span>`;
  };
  tick(); setInterval(tick, 20000);
})();
