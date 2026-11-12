'use strict';
// Glow eyes: Grump's face made from a picture instead of vectors (renderer/eyes/*, built by tools/eye-sprite/build_frames.py).
// One generated picture of the eye pair, with the pupils taken out, is the face. The pupils are the only thing that ever differs between
// gaze directions, so the app draws them itself at the exact spot: a soft dark ellipse that moves over a sphere, foreshortens like a real
// pupil and is clipped by the eye opening (a clipping mask), so the lids always cut it. Nothing is blended between pictures, which is
// why the pupils stay sharp at every angle. A blink shows one extra picture, the closed eyes: there are only two looks, open and blink.
// The whole pair glides with the pointer through --look-x/--look-y (system.js). Screen blending makes the black of the picture
// transparent, so it works on the plain notch and on Liquid Glass.
// Preferences > Behavior > Eye style switches back to the classic eyes.
(() => {
  const island = document.getElementById('island');
  const hosts = [...document.querySelectorAll('canvas.sprite-eyes')];
  const D = window.GRUMP_SPRITE_EYES;
  if (!island || !hosts.length || !D) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = (d) => (d * Math.PI) / 180;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = () => island.dataset.eyeStyle === 'sprite';

  const base = new Image(), mask = new Image(), closed = new Image();
  let loaded = 0;
  const onLoad = () => { if (++loaded === 3) { sizeCanvases(); paint(true); } };
  base.onload = mask.onload = closed.onload = onLoad;
  base.src = 'eyes/sprite-base.webp'; mask.src = 'eyes/sprite-mask.png'; closed.src = 'eyes/sprite-lid.webp';
  const layer = document.createElement('canvas');             // the pupils, clipped by the eye opening, before they go on the face

  // The picture is glow on black. Instead of leaning on screen blending (which only hides the black when something dark sits behind it, so on
  // Liquid Glass it showed as a black box), the black is turned into transparency here: alpha = the brightest channel, colour = what it would be
  // at full strength. Over black this is the same picture; over glass the dark parts show the glass. The face is keyed once per size and kept.
  const keyedCache = {};
  function keyedFace(shut, W, H) {
    const id = (shut ? 's' : 'o') + W + 'x' + H;
    if (keyedCache[id]) return keyedCache[id];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.drawImage(base, 0, 0, base.naturalWidth, base.naturalHeight, 0, 0, W, H);
    if (shut) x.drawImage(closed, 0, 0, closed.naturalWidth, closed.naturalHeight, 0, 0, W, H);
    const im = x.getImageData(0, 0, W, H), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = Math.max(d[i], d[i + 1], d[i + 2]);
      if (a === 0) { d[i + 3] = 0; continue; }
      d[i] = Math.min(255, Math.round(d[i] * 255 / a)); d[i + 1] = Math.min(255, Math.round(d[i + 1] * 255 / a)); d[i + 2] = Math.min(255, Math.round(d[i + 2] * 255 / a)); d[i + 3] = a;
    }
    x.putImageData(im, 0, 0);
    for (const k of Object.keys(keyedCache)) if (!k.endsWith(W + 'x' + H)) delete keyedCache[k];
    return (keyedCache[id] = cv);
  }

  // Each canvas is sized to the pixels it really covers on screen (CSS size x device pixel ratio), so it is shown 1:1 and stays sharp.
  function sizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    for (const cv of hosts) {
      const css = cv.id === 'pk-sprite' ? [42, 13.8] : [84, 27.7];
      const w = Math.max(1, Math.round(css[0] * dpr)), h = Math.max(1, Math.round(css[1] * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    }
    g.key = '';
  }
  window.addEventListener('resize', () => { sizeCanvases(); paint(true); });

  // gaze: x in -1..1 (far left to far right), y in 0..1 (level to looking down); the glide below follows the targets
  const g = { x: 0, y: 0, tx: 0, ty: 0, shut: 0, raf: 0, last: 0, key: '', angry: false };

  // --- geometry of one pupil on its eyeball (all numbers are in the picture's own pixels)
  function pointInPoly(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function nearestOnPoly(poly, x, y) {
    let best = null, bd = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / len2, 0, 1), px = ax + t * dx, py = ay + t * dy;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = [px, py]; }
    }
    return best;
  }
  for (const e of D.eyes) {
    const u = (e.c[1] - e.G[1]) / e.R;
    e.thy0 = Math.asin(clamp(u, -0.95, 0.95));
    e.thx0 = Math.asin(clamp((e.c[0] - e.G[0]) / e.R / Math.cos(e.thy0), -0.95, 0.95));
  }
  function pose(e, gx, gy) {
    const thx = e.thx0 + gx * rad(50), thy = e.thy0 + gy * rad(26);
    let px = e.G[0] + e.R * Math.sin(thx) * Math.cos(thy), py = e.G[1] + e.R * Math.sin(thy);
    if (!pointInPoly(e.safe, px, py)) [px, py] = nearestOnPoly(e.safe, px, py);   // never leaves the eye: always at least half visible
    return { px, py, sx: Math.max(0.32, Math.cos(thx) / Math.cos(e.thx0)), sy: Math.max(0.4, Math.cos(thy) / Math.cos(e.thy0)) };
  }

  function paint(force) {
    if (loaded < 3) return;
    const key = g.x.toFixed(3) + '|' + g.y.toFixed(3) + '|' + g.shut;
    if (!force && key === g.key) return;
    g.key = key;
    for (const cv of hosts) {
      if (!cv.offsetParent) continue;
      const W = cv.width, H = cv.height, s = W / D.w;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
      ctx.drawImage(keyedFace(!!g.shut, W, H), 0, 0);
      if (!g.shut) {
        if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; }
        const lx = layer.getContext('2d');
        lx.imageSmoothingEnabled = true; lx.imageSmoothingQuality = 'high';
        lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H);
        for (const e of D.eyes) {
          const p = pose(e, g.x, g.y);
          lx.save();
          lx.translate(p.px * s, p.py * s); lx.rotate(rad(e.ang)); lx.scale(e.rx * p.sx * s, e.ry * p.sy * s);
          const col = `${e.color[0]},${e.color[1]},${e.color[2]}`;
          // A radial gradient gives the pupil depth: an almost black core, the picture's own dark brown towards the rim, a slightly warmer
          // rim lit by the glowing eye around it. The edge stays soft by 5% of the pupil's size on each side (solid to 0.95, gone at 1.05).
          const [r0, g0, b0] = e.color;
          const rim = `${Math.min(255, r0 + 34)},${Math.min(255, g0 + 14)},${Math.min(255, b0 + 4)}`;
          const grad = lx.createRadialGradient(-0.12, -0.18, 0, 0, 0, 1.05);
          grad.addColorStop(0, 'rgba(4,2,1,1)'); grad.addColorStop(0.55, `rgba(${col},1)`); grad.addColorStop(0.86, `rgba(${col},1)`);
          grad.addColorStop(0.905, `rgba(${rim},1)`); grad.addColorStop(1, `rgba(${rim},0)`);
          lx.fillStyle = grad; lx.beginPath(); lx.arc(0, 0, 1.05, 0, Math.PI * 2); lx.fill();
          // Reflections on the wet surface: one soft catchlight up and to the left (where the light is), one small glint low right.
          // They are painted on the pupil layer, so the lid still cuts them like the pupil.
          const spec = lx.createRadialGradient(-0.34, -0.46, 0, -0.34, -0.46, 0.27);
          spec.addColorStop(0, 'rgba(255,248,236,0.92)'); spec.addColorStop(0.45, 'rgba(255,236,206,0.55)'); spec.addColorStop(1, 'rgba(255,226,190,0)');
          lx.fillStyle = spec; lx.beginPath(); lx.arc(-0.34, -0.46, 0.27, 0, Math.PI * 2); lx.fill();
          const glint = lx.createRadialGradient(0.3, 0.42, 0, 0.3, 0.42, 0.11);
          glint.addColorStop(0, 'rgba(255,240,220,0.5)'); glint.addColorStop(1, 'rgba(255,240,220,0)');
          lx.fillStyle = glint; lx.beginPath(); lx.arc(0.3, 0.42, 0.11, 0, Math.PI * 2); lx.fill();
          lx.restore();
        }
        lx.globalCompositeOperation = 'destination-in';       // the clipping mask: only what lies inside the eye opening stays
        lx.drawImage(mask, 0, 0, mask.naturalWidth, mask.naturalHeight, 0, 0, W, H);
        ctx.drawImage(layer, 0, 0);
      }
    }
  }

  function step(ts) {
    g.raf = 0;
    const dt = clamp((ts - (g.last || ts - 16.7)) / 1000, 0.001, 0.05); g.last = ts;
    const a = 1 - Math.exp(-dt / 0.05);                       // the pupils follow with a short glide
    g.x += (g.tx - g.x) * a; g.y += (g.ty - g.y) * a;
    paint(false);
    if (Math.abs(g.tx - g.x) > 0.0006 || Math.abs(g.ty - g.y) > 0.0006) g.raf = requestAnimationFrame(step); else g.last = 0;
  }
  const kick = () => { if (!g.raf) g.raf = requestAnimationFrame(step); };

  function look(dx, dy, angry) {
    if (!active() || g.greeting) return;
    g.tx = clamp(dx / 230, -1, 1);
    g.ty = clamp((dy - 20) / 160, 0, 1);
    if (angry !== g.angry) { g.angry = angry; for (const c of hosts) c.dataset.angry = angry ? '1' : '0'; }
    kick();
  }
  function rest() { if (g.greeting) return; g.tx = 0; g.ty = 0; g.angry = false; for (const c of hosts) c.dataset.angry = '0'; kick(); }

  // blink: the closed eyes for a moment (a click, not a slow lid): open or shut, nothing in between
  function blink() {
    if (!active() || reduced() || g.shut) return;
    g.shut = 1; paint(false);
    setTimeout(() => { g.shut = 0; paint(false); }, 95);
  }
  (function schedule() {
    setTimeout(() => {
      if (active() && !g.angry && hosts.some((c) => c.offsetParent)) blink();
      schedule();
    }, 2600 + Math.random() * 4200);
  })();

  // a short pop when the eyes come back or a notice arrives
  let lastKey = island.dataset.key;
  new MutationObserver(() => {
    const key = island.dataset.key;
    if (key !== lastKey && (key === 'idle' || key === 'notice') && active() && !reduced()) {
      for (const c of hosts) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
      setTimeout(() => { for (const c of hosts) c.classList.remove('pop'); }, 520);
    }
    lastKey = key;
  }).observe(island, { attributes: true, attributeFilter: ['data-key'] });
  new MutationObserver(() => { sizeCanvases(); paint(true); }).observe(island, { attributes: true, attributeFilter: ['data-eye-style', 'data-key'] });


  // The welcome greeting after the first run of an upgrade: the eyes wake up, look around, blink twice and pop with a warm glow.
  function greet(onEnd) {
    if (!active() || reduced()) { if (onEnd) onEnd(); return true; }
    if (!hosts.some((c) => c.offsetParent)) return false;
    g.greeting = true; g.shut = 1; g.tx = 0; g.ty = 0; paint(true);
    const main = hosts[0], at = (ms, fn) => setTimeout(fn, ms);
    main.classList.add('greet');
    at(450, () => { g.shut = 0; main.classList.remove('pop'); void main.offsetWidth; main.classList.add('pop'); g.tx = -0.9; g.ty = 0.25; kick(); paint(true); });
    at(1050, () => { g.tx = 0.9; g.ty = 0.1; kick(); });
    at(1650, () => { g.tx = 0; g.ty = 0.5; kick(); });
    at(2150, () => { g.shut = 1; paint(true); at(110, () => { g.shut = 0; paint(true); at(110, () => { g.shut = 1; paint(true); at(110, () => { g.shut = 0; paint(true); }); }); }); });
    at(2700, () => { main.classList.remove('pop'); void main.offsetWidth; main.classList.add('pop'); g.ty = 0; kick(); });
    at(3500, () => { main.classList.remove('greet', 'pop'); g.greeting = false; if (onEnd) onEnd(); });
    return true;
  }
  if (window.dynIsland && window.dynIsland.onWelcomeGreet) {
    window.dynIsland.onWelcomeGreet(() => {
      // Music, an AI status or a notice may own the notch right now: show the idle page (the one with the eyes) for the greeting.
      const hasState = typeof S !== 'undefined';
      const prev = hasState ? S.glancePreviewActive : false;
      const prevStyle = island.dataset.eyeStyle;   // the greeting is always Grump Eyes, whatever reaction style is picked
      const restore = () => { island.dataset.eyeStyle = prevStyle; if (hasState) { S.glancePreviewActive = prev; if (typeof layout === 'function') layout(); } };
      island.dataset.eyeStyle = 'sprite';
      if (hasState) { S.glancePreviewActive = true; if (typeof layout === 'function') layout(); }
      let tries = 0;
      (function go() {
        if (greet(restore)) return;
        if (++tries < 10) setTimeout(go, 300); else restore();
      })();
    });
  }

  window.spriteEyes = { active, look, rest, blink, greet, pairWidth: 80, eyeHeight: 28, state: g };
})();
