'use strict';
/* A drawn demo of how a PiP leaves the notch and goes back (the real shape: js/genie-shape.js, loaded first), next to what a
   plain window does, so the difference can be seen. Used by the welcome screen and, as a copy, by the website.
   GrumpPourDemo.mount(host, { lang }) draws into host and returns { setMode('slurp'|'plain'), setSlow(bool), replay() }.
   It plays a loop only while it is on screen; with reduced motion it waits for replay(). */
(function (root) {
  const W = 480, H = 300;   // the stage, in CSS pixels; the canvas is scaled to fit the host
  const NOTCH = { x: W / 2 - 62, y: 0, width: 124, height: 30 };
  const CARD = { x: W / 2 - 112, y: 80, width: 224, height: 198 };
  const TEXT = {
    id: { title: 'To-do list', rows: ['Kirim revisi desain', 'Balas email klien', 'Beli kopi', 'Backup foto'], foot: '1 dari 4 selesai' },
    en: { title: 'To-do list', rows: ['Send the design revision', 'Reply to the client', 'Buy coffee', 'Back up photos'], foot: '1 of 4 done' }
  };

  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // the To-do card as a picture, drawn once per language and scale
  function cardPicture(lang, scale) {
    const t = TEXT[lang] || TEXT.id, c = document.createElement('canvas');
    c.width = Math.round(CARD.width * scale); c.height = Math.round(CARD.height * scale);
    const g = c.getContext('2d'); g.scale(scale, scale);
    roundRect(g, 0.5, 0.5, CARD.width - 1, CARD.height - 1, 16); g.fillStyle = '#080808'; g.fill(); g.strokeStyle = '#333'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = '#bcbcbc'; g.lineWidth = 1.4; g.beginPath(); g.arc(20, 22, 6, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(17.5, 22); g.lineTo(19.5, 24); g.lineTo(23, 20); g.stroke();
    g.fillStyle = '#eee'; g.font = '600 12.5px Inter, "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(t.title, 33, 22.5);
    const flags = ['#ff4d4d', '#ff9f1c', '', ''];
    t.rows.forEach((label, i) => {
      const y = 40 + i * 31, done = i === 3;
      roundRect(g, 10.5, y + 0.5, CARD.width - 21, 26, 7); g.fillStyle = '#1b1b1b'; g.fill();
      g.strokeStyle = i === 0 ? 'rgba(255,77,77,.55)' : i === 1 ? 'rgba(255,159,28,.5)' : '#2c2c2c'; g.stroke();
      g.beginPath(); g.arc(26, y + 13.5, 7, 0, Math.PI * 2);
      if (done) { g.fillStyle = '#5cb83a'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(22.8, y + 13.6); g.lineTo(25.2, y + 16); g.lineTo(29.4, y + 11.2); g.stroke(); g.lineWidth = 1; }
      else { g.strokeStyle = '#8a8a8a'; g.stroke(); }
      g.font = '500 11px Inter, "Segoe UI", system-ui, sans-serif'; g.fillStyle = done ? '#7d7d7d' : '#e6e6e6'; g.fillText(label, 40, y + 14);
      if (done) { const w = g.measureText(label).width; g.fillRect(40, y + 13.5, w, 1); }
      if (flags[i]) { g.fillStyle = flags[i]; g.fillRect(CARD.width - 32, y + 9, 1.5, 10); g.beginPath(); g.moveTo(CARD.width - 30.5, y + 9); g.lineTo(CARD.width - 24, y + 9); g.lineTo(CARD.width - 26, y + 11.5); g.lineTo(CARD.width - 24, y + 14); g.lineTo(CARD.width - 30.5, y + 14); g.fill(); }
    });
    g.fillStyle = '#9a9a9a'; g.font = '600 8.5px Inter, "Segoe UI", system-ui, sans-serif'; g.fillText(t.foot.toUpperCase(), 12, CARD.height - 22);
    roundRect(g, 12, CARD.height - 13, CARD.width - 24, 3, 1.5); g.fillStyle = '#2a2a2a'; g.fill();
    roundRect(g, 12, CARD.height - 13, (CARD.width - 24) * 0.25, 3, 1.5); g.fillStyle = '#e8e8e8'; g.fill();
    return c;
  }

  function mount(host, opts) {
    const Shape = root.GrumpGenieShape;
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
    host.append(canvas);
    const g = canvas.getContext('2d');
    let lang = (opts && opts.lang) || 'id', mode = 'slurp', slow = false, picture = null, pictureKey = '';
    let k = 1, dpr = 1, visible = true, frame = 0, start = 0;
    const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // one loop: the card rests, leaves, the notch stays alone, the card comes back
    const REST = 1.6, AWAY = 1.0;
    const times = () => {
      const f = slow ? 4 : 1;
      const close = (mode === 'slurp' ? Shape.CLOSE_S : 0.16) * f, open = (mode === 'slurp' ? Shape.DURATION_S : 0.2) * f;
      return { close, open, total: REST + close + AWAY + open };
    };
    function size() {
      const r = host.getBoundingClientRect(); if (!r.width) return;
      dpr = root.devicePixelRatio || 1; k = Math.min(r.width / W, r.height / H);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    function drawNotch(gulp) {
      const s = 1 + 0.12 * gulp, w = NOTCH.width * s, h = NOTCH.height * (1 + 0.2 * gulp), x = W / 2 - w / 2;
      g.fillStyle = '#000'; g.beginPath(); g.moveTo(x - 8, 0); g.quadraticCurveTo(x, 0, x, 8); g.lineTo(x, h - 12); g.quadraticCurveTo(x, h, x + 12, h);
      g.lineTo(x + w - 12, h); g.quadraticCurveTo(x + w, h, x + w, h - 12); g.lineTo(x + w, 8); g.quadraticCurveTo(x + w, 0, x + w + 8, 0); g.closePath(); g.fill();
      g.strokeStyle = '#ff9a3c'; g.lineWidth = 2.4; g.lineCap = 'round'; g.shadowColor = 'rgba(255,140,40,.8)'; g.shadowBlur = 6;
      for (const cx of [W / 2 - 9, W / 2 + 9]) { g.beginPath(); g.moveTo(cx - 5, h / 2 + 3); g.quadraticCurveTo(cx, h / 2 - 5, cx + 5, h / 2 + 3); g.stroke(); }
      g.shadowBlur = 0;
    }
    // t: 0 = the card at rest, 1 = all the way into the notch (the same t as the app)
    function drawSlurp(t) {
      if (t <= 0) { g.drawImage(picture, CARD.x, CARD.y, CARD.width, CARD.height); return; }
      if (t >= 1) return;
      const rows = Shape.rows(t, CARD, NOTCH, 90), ph = picture.height;
      g.save(); g.beginPath(); g.rect(0, NOTCH.y + NOTCH.height, W, H); g.clip();
      for (let i = 0; i < rows.length - 1; i++) {
        const a = rows[i], b = rows[i + 1];   // a is the lower edge of this strip
        const sy = b.v * ph, sh = Math.max(1, (a.v - b.v) * ph);
        const left = (a.left + b.left) / 2, right = (a.right + b.right) / 2;
        g.drawImage(picture, 0, sy, picture.width, sh, left, b.y, Math.max(0.5, right - left), Math.max(0.5, a.y - b.y) + 0.6);
      }
      g.restore();
    }
    function drawPlain(p) {   // p: 0 shown, 1 gone; a plain window fades and shrinks a little where it is
      if (p >= 1) return;
      const s = 1 - 0.06 * p; g.save(); g.globalAlpha = 1 - p;
      g.translate(CARD.x + CARD.width / 2, CARD.y + CARD.height / 2); g.scale(s, s);
      g.drawImage(picture, -CARD.width / 2, -CARD.height / 2, CARD.width, CARD.height); g.restore();
    }
    function paint(at) {
      const key = lang + '@' + Math.ceil(k * dpr * 2);
      if (key !== pictureKey) { picture = cardPicture(lang, Math.max(1, k * dpr)); pictureKey = key; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
      const r = host.getBoundingClientRect();
      g.setTransform(dpr * k, 0, 0, dpr * k, (r.width - W * k) / 2 * dpr, (r.height - H * k) / 2 * dpr);
      const T = times(); let t = 0, gulp = 0;
      if (at === null) t = 0;
      else if (at < REST) t = 0;
      else if (at < REST + T.close) { const x = (at - REST) / T.close; t = mode === 'slurp' ? Shape.time(x, false) : x; }
      else if (at < REST + T.close + AWAY) { t = 1; const x = (at - REST - T.close) / 0.32; gulp = mode === 'slurp' && x < 1 ? Math.sin(Math.PI * x) : 0; }
      else { const x = Math.min(1, (at - REST - T.close - AWAY) / T.open); t = mode === 'slurp' ? Shape.time(x, true) : 1 - x; }
      if (mode === 'slurp') drawSlurp(t); else drawPlain(t);
      drawNotch(gulp);
    }
    function tick(now) {
      if (!start) start = now;
      const T = times(), at = ((now - start) / 1000) % T.total;
      paint(at);
      frame = visible && !reduced() ? requestAnimationFrame(tick) : 0;
    }
    function once(now) {   // reduced motion: one pass on request, then it stops at rest
      if (!start) start = now;
      const at = (now - start) / 1000, T = times();
      if (at >= T.total) { paint(null); frame = 0; return; }
      paint(at); frame = requestAnimationFrame(once);
    }
    const run = () => { cancelAnimationFrame(frame); start = 0; frame = requestAnimationFrame(reduced() ? once : tick); };
    size();
    if ('ResizeObserver' in root) new ResizeObserver(() => { size(); if (!frame) paint(null); }).observe(host);
    if ('IntersectionObserver' in root) new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible && !frame && !reduced()) run(); }).observe(host);
    if (reduced()) paint(null); else run();
    return {
      setMode(m) { mode = m === 'plain' ? 'plain' : 'slurp'; run(); },
      setSlow(on) { slow = !!on; run(); },
      setLang(l) { lang = l === 'en' ? 'en' : 'id'; if (!frame) paint(null); },
      replay: run
    };
  }
  root.GrumpPourDemo = { mount };
})(window);
