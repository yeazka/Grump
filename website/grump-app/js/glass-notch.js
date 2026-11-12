'use strict';
// Drives the live glass of the notch (floating and anchored). See glass.js for how the glass itself is drawn.
(() => {
  const Glass = window.GrumpLiveGlass;
  const canvas = document.getElementById('glass-live');
  if (!Glass || !canvas || typeof island === 'undefined') return;

  let glass = null, starting = false, failedAt = 0, lastClip = '', lastRateExpanded = null;
  const HIDDEN_KEYS = new Set(['tuck', 'peekaboo', 'quiettuck', 'tuckhide', 'minimal']);

  const wanted = () => Boolean(
    S.settings && S.settings.theme === 'full-glass' && S.settings.glassLive !== false &&
    Date.now() - failedAt > 60000 && !S.settings.quiet
  );

  const MODES = {
    dark:   { tint: [9, 9, 12],      closed: 0.54, top: 0.40, bottom: 0.50, blur: 4.2, sat: 1.1, lift: 0.055 },
    bright: { tint: [226, 228, 236], closed: 0.26, top: 0.22, bottom: 0.30, blur: 3.8, sat: 1.25, lift: 0.03 },
    clear:  { tint: [255, 255, 255], closed: 0.06, top: 0.10, bottom: 0.16, blur: 3.2, sat: 1.3, lift: 0.025 },
  };

  function stopGlass() {
    if (glass) { glass.stop(); glass = null; }
    island.dataset.glassLive = '0';
    canvas.style.display = 'none';
    bridge.glassProtect?.(false);
    lastClip = '';
  }

  async function startGlass() {
    if (glass || starting) return;
    starting = true;
    const next = new Glass(canvas);
    next.onFail = (error) => { console.warn('Live glass unavailable, using the CSS glass', error && error.message); failedAt = Date.now(); if (glass === next) { stopGlass(); layout(); } };
    next.onFrame = () => frame(next);
    bridge.glassProtect?.(true);
    const ok = await next.start();
    starting = false;
    if (!ok) { bridge.glassProtect?.(false); failedAt = Date.now(); return; }
    glass = next;
    island.dataset.glassLive = '1';
    layout();
  }

  let lastSignature = '', settleUntil = 0, lastFrameAt = 0, notchFillEl = null;
  function frame(instance) {
    if (instance !== glass) return;
    if (HIDDEN_KEYS.has(island.dataset.key) || island.dataset.dodging === '1') { canvas.style.display = 'none'; return; }
    canvas.style.display = 'block';
    // Measuring the island forces a layout. While nothing about it changes (the compact notch at rest) look only 10 times a second;
    // any change in its style, page or size hands back full speed for the length of the animation.
    const now = performance.now();
    const signature = island.dataset.key + '|' + island.dataset.expanded + '|' + island.dataset.anchored + '|' + island.style.cssText + '|' + (notchFillEl || (notchFillEl = document.getElementById('notch-fill')))?.getAttribute('d');
    if (signature !== lastSignature) { lastSignature = signature; settleUntil = now + 900; }
    if (now > settleUntil && now - lastFrameAt < 100) return;
    lastFrameAt = now;
    const mode = MODES[island.dataset.glassMode] || MODES.dark;
    const transparency = Math.max(0, Math.min(70, Number(S.settings.islandTransparency) || 0)) / 100;
    // The glass is really blurred now, so a busy background needs far less extra tint than with the flat CSS glass.
    const adapt = (typeof glassAdapt === 'number' ? glassAdapt : 0) * 0.2;
    const mix = (a, b) => a + (b - a) * adapt;
    const expanded = island.dataset.expanded === '1' && !!S.expanded;
    const alphaTop = (expanded ? mix(mode.top, 0.9) : mix(mode.closed, 0.9)) * (1 - transparency);
    const alphaBottom = (expanded ? mix(mode.bottom, 0.95) : mix(mode.closed, 0.9)) * (1 - transparency);

    const box = island.getBoundingClientRect();
    const anchored = island.dataset.anchored === '1';
    let rect, region, shape, shapeKey;
    if (anchored) {
      const svg = document.getElementById('island-notch-svg');
      const svgBox = svg ? svg.getBoundingClientRect() : box;
      rect = { left: svgBox.left, top: svgBox.top, width: svgBox.width, height: svgBox.height };
      region = { x: box.left - svgBox.left, y: 0, w: box.width, h: box.height };
      const d = document.getElementById('notch-fill')?.getAttribute('d') || '';
      shape = { d };
      shapeKey = 'p:' + d;
    } else {
      rect = { left: box.left, top: box.top, width: box.width, height: box.height };
      const radius = Math.min(box.height / 2, Math.max(4, parseFloat(island.style.borderRadius) || 18));
      region = { x: 0, y: 0, w: box.width, h: box.height };
      shape = { x: 0, y: 0, w: box.width, h: box.height, r: radius };
      shapeKey = 'r:' + box.width.toFixed(1) + ',' + box.height.toFixed(1) + ',' + radius.toFixed(1);
    }
    if (lastClip !== 'none') { canvas.style.clipPath = 'none'; lastClip = 'none'; }
    canvas.style.borderRadius = '0';
    canvas.style.left = (rect.left - box.left) + 'px';
    canvas.style.top = (rect.top - box.top) + 'px';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    if (lastRateExpanded !== expanded) { lastRateExpanded = expanded; instance.setFrameRate(expanded ? 15 : 1); }
    const small = Math.min(region.h, region.w);
    instance.draw({
      rect, region, shape, shapeKey,
      tint: [mode.tint[0] / 255, mode.tint[1] / 255, mode.tint[2] / 255], tintAlpha: [alphaTop, alphaBottom],
      blur: mode.blur, bevel: 3, refract: 3, sat: mode.sat, rim: 1, lift: mode.lift, topOpen: anchored,
    });
  }

  // follow the settings: start/stop with the theme and the Preferences switch
  setInterval(() => { if (wanted()) startGlass(); else if (glass || island.dataset.glassLive === '1') stopGlass(); }, 800);
  window.addEventListener('beforeunload', () => { try { stopGlass(); } catch (_) { /* closing */ } });
})();
