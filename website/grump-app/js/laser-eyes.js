'use strict';
/* Laser Beam reaction style: while Grump is angry on the idle page, both eyes fire a beam at the cursor.
   It is drawn on one canvas, frame by frame, from the eyes' current position, so the beam stays attached
   while the eyes glide. It charges up when the anger starts, retracts when it ends, and stops drawing
   (no animation frame) as soon as it is fully retracted. */
(() => {
  const canvas = document.getElementById('laser-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let raw = null, target = null, charge = 0, last = 0, raf = 0, dpr = 1, aimedAt = 0;

  function wanted() {
    return typeof curKey !== 'undefined' && curKey === 'idle'
      && island.dataset.angry === '1'
      && ((S.settings && S.settings.angryVariant) || island.dataset.angryVariant) === 'laser'
      && !(window.spriteEyes && window.spriteEyes.active());
  }
  function fit() {
    dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function eyeCenters() {
    const eyes = document.getElementById('eyes');
    const pair = eyes ? [...eyes.querySelectorAll(':scope > i')].filter(el => el.offsetWidth > 0).slice(0, 2) : [];
    if (pair.length < 2) return null;
    return pair.map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }
  function beam(o, e, wob) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,20,70,.16)'; ctx.lineWidth = 16 * wob; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,40,90,.6)'; ctx.lineWidth = 6 * wob; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,248,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
  }
  function glow(x, y, r, inner, outer) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner); g.addColorStop(.35, outer); g.addColorStop(1, 'rgba(255,0,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function impact(p, t, k) {
    glow(p.x, p.y, 26 * k, 'rgba(255,255,255,.95)', 'rgba(255,40,90,.55)');
    if (reduced.matches) return;
    // rotating sparks
    ctx.strokeStyle = 'rgba(255,214,120,.9)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = t * 5 + i * Math.PI / 3, len = (9 + 6 * Math.sin(t * 23 + i * 1.7)) * k;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6); ctx.lineTo(p.x + Math.cos(a) * (6 + len), p.y + Math.sin(a) * (6 + len)); ctx.stroke();
    }
    // embers thrown off the hit point, each on its own repeating life
    for (let i = 0; i < 10; i++) {
      const phase = (t * 1.8 + i * 0.1) % 1, a = i * 2.39996;
      const d = phase * 34 * k;
      ctx.fillStyle = `rgba(255,${150 + (i % 3) * 40},90,${(1 - phase) * .85})`;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d + phase * phase * 14, 1.6 * (1 - phase) + .4, 0, Math.PI * 2); ctx.fill();
    }
    // heat ring every half second
    const ring = (t * 2) % 1;
    ctx.strokeStyle = `rgba(255,60,100,${(1 - ring) * .45 * k})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8 + ring * 26, 0, Math.PI * 2); ctx.stroke();
  }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
    const on = wanted() && raw;
    charge = on ? Math.min(1, charge + dt / .18) : Math.max(0, charge - dt / .12);
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const eyes = charge > 0 ? eyeCenters() : null;
    if (charge === 0 && !on && now - aimedAt >= 400) { last = 0; return; }
    // The angry flag is set just after the cursor event that triggers it, so keep checking briefly after each aim.
    if (!eyes || !target) { if (charge > 0 || on || now - aimedAt < 400) raf = requestAnimationFrame(frame); else last = 0; return; }
    target.x += (raw.x - target.x) * .45; target.y += (raw.y - target.y) * .45;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const t = now / 1000, k = 1 - Math.pow(1 - charge, 3);
    const wob = reduced.matches ? 1 : 1 + .12 * Math.sin(t * 31) + .06 * Math.sin(t * 57);
    for (const o of eyes) {
      const e = { x: o.x + (target.x - o.x) * k, y: o.y + (target.y - o.y) * k };
      beam(o, e, wob);
      glow(o.x, o.y, 11, 'rgba(255,255,255,.9)', 'rgba(255,30,80,.5)');
    }
    if (k > .9) impact(target, t, (k - .9) / .1);
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.laserEyes = {
    aim(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      raw = { x, y }; if (!target) target = { x, y };
      aimedAt = performance.now(); kick();
    },
    sync() { aimedAt = performance.now(); kick(); }
  };
})();
