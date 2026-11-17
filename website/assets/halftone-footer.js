/* Halftone wordmark footer. The site footer sets "Grump" enormous, cropped by the bottom edge, and prints it as a field of halftone dots.
   Each dot is sized by how much of the letter covers its cell, so the type keeps its edges at any size. The pointer pushes the dots
   aside on springs (they warm toward amber the further they are pushed from home), and a click sends a shock ring through the word.
   Plain JavaScript and a 2D canvas, no framework; the links stay real anchors. Reduced motion draws the word once and keeps it still.
   Based on the "Halftone Wordmark Footer" component supplied by the site owner. */
(function () {
  'use strict';

  // ---- pure helpers (also run by the checks in the repo that tests the site) ----
  function hwfHex(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    var h = m[1].length === 3 ? m[1].split('').map(function (c) { return c + c; }).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  // dot radius for a cell coverage in [0, 1]: area-true, so tone stays even
  function hwfRadius(coverage, gap) {
    var c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
    return Math.sqrt(c) * gap * 0.56;
  }
  // one step of a dot's spring back home, plus the push from a pointer at (px, py) within radius r; returns [x, y, vx, vy]
  function hwfStep(x, y, vx, vy, hx, hy, px, py, r) {
    var dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
    if (r > 0 && d2 < r * r) {
      var d = Math.sqrt(d2) + 0.001, f = (1 - d / r) * 2.6;
      vx += (dx / d) * f; vy += (dy / d) * f;
    }
    vx = (vx + (hx - x) * 0.05) * 0.84;
    vy = (vy + (hy - y) * 0.05) * 0.84;
    return [x + vx, y + vy, vx, vy];
  }
  // how warm a dot is drawn: 0 at home, 1 once it is `span` px or more away
  function hwfWarmth(x, y, hx, hy, span) {
    var d = Math.hypot(x - hx, y - hy);
    return span > 0 ? Math.min(1, d / span) : 0;
  }
  // font size that sets `measured` (the word's width at 100px) to fill `width` exactly
  function hwfFitSize(measured, width) { return measured > 0 ? (width / measured) * 100 : 0; }

  var helpers = { hwfHex: hwfHex, hwfRadius: hwfRadius, hwfStep: hwfStep, hwfWarmth: hwfWarmth, hwfFitSize: hwfFitSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  if (typeof document === 'undefined') return;

  function start(root) {
    var canvas = root.querySelector('canvas');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    var word = root.getAttribute('data-wordmark') || 'Grump';
    var fontFamily = root.getAttribute('data-font') || '"Plus Jakarta Sans", sans-serif';
    var weight = Number(root.getAttribute('data-weight')) || 800;
    var background = root.getAttribute('data-background') || '#0b0704';
    var inkColor = root.getAttribute('data-ink') || '#efe3d2';
    var warmColor = root.getAttribute('data-warm') || '#fbbf24';
    var dotGap = Number(root.getAttribute('data-gap')) || 6;
    var crop = Math.max(0, Math.min(0.6, Number(root.getAttribute('data-crop')) || 0.2));
    var grain = Math.max(0, Math.min(1, Number(root.getAttribute('data-grain')) || 0.5));
    var radius = Number(root.getAttribute('data-radius')) || 80;

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var ink = hwfHex(inkColor) || [239, 227, 210], warm = hwfHex(warmColor) || [251, 191, 36];
    var w = 0, h = 0, dpr = 1, px = -1e5, py = -1e5, raf = 0, visible = true, awake = true;
    var ring = { x: 0, y: 0, t: -1 };
    var dots = new Float32Array(0), count = 0, grainTile = null;   // per dot: x, y, vx, vy, hx, hy, r

    function layout() {
      var rect = root.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      // the word is set once, at a size that fills the width, on a 1x mask
      var mask = document.createElement('canvas'); mask.width = w; mask.height = h;
      var m = mask.getContext('2d', { willReadFrequently: true }); if (!m) return;
      m.font = weight + ' 100px ' + fontFamily;
      var fit = hwfFitSize(m.measureText(word).width, w * 1.02);
      m.font = weight + ' ' + fit + 'px ' + fontFamily;
      var box = m.measureText(word), cap = box.actualBoundingBoxAscent || fit * 0.72;
      m.fillStyle = '#000'; m.textBaseline = 'alphabetic';
      m.fillText(word, (w - box.width) / 2, h + cap * crop);
      var img = m.getImageData(0, 0, w, h).data;
      var gap = Math.max(3, dotGap), cols = Math.ceil(w / gap), rows = Math.ceil(h / gap), tmp = [];
      for (var gy = 0; gy < rows; gy++) {
        for (var gx = 0; gx < cols; gx++) {
          var sum = 0;   // coverage: average alpha over a 3x3 sample of the cell
          for (var sy = 0; sy < 3; sy++) for (var sx = 0; sx < 3; sx++) {
            var x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
            var y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
            sum += img[(y * w + x) * 4 + 3];
          }
          var cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          var hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, hwfRadius(cov, gap));
        }
      }
      dots = new Float32Array(tmp); count = tmp.length / 7;
      if (!grainTile) {   // a fixed tile of print grain, drawn once and laid over every frame
        grainTile = document.createElement('canvas'); grainTile.width = 256; grainTile.height = 256;
        var g = grainTile.getContext('2d');
        if (g) {
          var id = g.createImageData(256, 256);
          for (var i = 0; i < id.data.length; i += 4) {
            var v = Math.random() * 255;
            id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
          }
          g.putImageData(id, 0, 0);
        }
      }
      awake = true;
    }

    function draw(now) {
      var reduced = motionQuery.matches;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
      var r = reduced ? 0 : Math.max(0, radius);
      var ringAge = ring.t < 0 ? 1e9 : now - ring.t, ringR = ringAge * 0.9, moving = false;
      // dots at rest share one path and one fill; only the pushed (warming) ones are filled one by one
      ctx.fillStyle = inkColor; ctx.beginPath();
      var warmDots = [];
      for (var i = 0; i < count; i++) {
        var j = i * 7, x = dots[j], y = dots[j + 1], vx = dots[j + 2], vy = dots[j + 3], hx = dots[j + 4], hy = dots[j + 5];
        if (!reduced) {
          if (ringAge < 900) {
            var rx = hx - ring.x, ry = hy - ring.y, d = Math.sqrt(rx * rx + ry * ry) + 0.001;
            var band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
            if (band > 0) { var f = band * 3.2 * (1 - ringAge / 900); vx += (rx / d) * f; vy += (ry / d) * f; }
          }
          var s = hwfStep(x, y, vx, vy, hx, hy, px, py, r);
          x = s[0]; y = s[1]; vx = s[2]; vy = s[3];
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true;
          else { x = hx; y = hy; vx = 0; vy = 0; }
          dots[j] = x; dots[j + 1] = y; dots[j + 2] = vx; dots[j + 3] = vy;
        }
        var k = hwfWarmth(x, y, hx, hy, 28), rad = dots[j + 6];
        if (k > 0.02) warmDots.push(x, y, rad, k);
        else { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.2832); }
      }
      ctx.fill();
      for (var n = 0; n < warmDots.length; n += 4) {
        var q = warmDots[n + 3];
        ctx.fillStyle = 'rgb(' + Math.round(ink[0] + (warm[0] - ink[0]) * q) + ',' + Math.round(ink[1] + (warm[1] - ink[1]) * q) + ',' + Math.round(ink[2] + (warm[2] - ink[2]) * q) + ')';
        ctx.beginPath(); ctx.arc(warmDots[n], warmDots[n + 1], warmDots[n + 2], 0, 6.2832); ctx.fill();
      }
      if (grainTile && grain > 0) {
        ctx.globalAlpha = grain * 0.09; ctx.globalCompositeOperation = 'overlay';
        var pattern = ctx.createPattern(grainTile, 'repeat');
        if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      awake = moving || ringAge < 900 || px > -1e4;   // sleeps once everything is home and nothing pushes
    }
    function loop(now) { raf = 0; if (!visible) return; draw(now); if (awake) raf = requestAnimationFrame(loop); }
    function wake() { awake = true; if (!raf && visible) raf = requestAnimationFrame(loop); }
    function local(e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }

    root.addEventListener('pointermove', function (e) { var p = local(e); px = p[0]; py = p[1]; wake(); });
    root.addEventListener('pointerleave', function () { px = -1e5; py = -1e5; wake(); });
    root.addEventListener('pointerdown', function (e) {
      if (motionQuery.matches || (e.target.closest && e.target.closest('a,button'))) return;
      var p = local(e); ring = { x: p[0], y: p[1], t: performance.now() }; wake();
    });
    if (window.ResizeObserver) new ResizeObserver(function () { layout(); wake(); }).observe(root);
    if (window.IntersectionObserver) new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true; if (visible) wake();
    }).observe(root);

    // the word is set in the page's heading face, so it is drawn only once that face is ready (and again if it arrives late)
    var face = weight + ' 100px ' + fontFamily;
    var ready = document.fonts && document.fonts.load ? document.fonts.load(face, word).catch(function () {}) : Promise.resolve();
    ready.then(function () { layout(); draw(performance.now()); wake(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); wake(); });
    motionQuery.addEventListener && motionQuery.addEventListener('change', function () { wake(); });
  }

  function init() { var roots = document.querySelectorAll('[data-halftone-footer]'); for (var i = 0; i < roots.length; i++) start(roots[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
