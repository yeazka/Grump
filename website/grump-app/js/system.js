'use strict';
/* ===== SISTEM: jam idle, maskot mata, notifikasi baterai/jaringan, setting ===== */
function addGoldBurst(eyes) {
  if (!eyes || eyes.querySelector('.gold-burst')) return;
  const burst = document.createElement('span');
  burst.className = 'gold-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let side = 0; side < 2; side++) {
    for (let n = 0; n < 8; n++) {
      const spark = document.createElement('b');
      const angle = (-150 + n * 43) * Math.PI / 180;
      const distance = 12 + (n % 3) * 4;
      spark.style.setProperty('--origin-x', side ? '72%' : '28%');
      spark.style.setProperty('--burst-x', `${Math.round(Math.cos(angle) * distance)}px`);
      spark.style.setProperty('--burst-y', `${Math.round(Math.sin(angle) * distance * .65)}px`);
      spark.style.animationDelay = `${-(side * .7 + n * .018)}s`;
      burst.append(spark);
    }
  }
  eyes.append(burst);
}
addGoldBurst(document.getElementById('eyes'));
bridge.onSettings((s) => {
  const previousExp = S.settings.staticExp;
  const previousMode = S.settings.eyeMode;
  S.settings = { ...S.settings, ...s };
  island.style.opacity = String(1 - Math.max(0, Math.min(70, Number(S.settings.islandTransparency) || 0)) / 100);
  updateIdleInfoDisplay();
  if (s.theme) island.dataset.theme = s.theme;
  if (s.angryVariant) island.dataset.angryVariant = s.angryVariant;
  if (s.dockMode) island.dataset.dock = s.dockMode;
  if (s.eyeMode === 'auto') { tempExp = null; }
  if (s.staticExp && s.eyeMode !== 'static' && (s.staticExp !== previousExp || s.eyeMode !== previousMode)) {
    setTempExp(s.staticExp, s.staticExp === 'lol' ? 1800 : 6000);
  }
  if (typeof syncSettingsUI === 'function') syncSettingsUI();
  if (S.expanded && !pageList().includes(PAGE_OF[S.view])) S.view = 'home';
  if (s.quiet) { S.inAngryRadius = false; tempExp = null; }
  if (s.batteryToast === false || s.quiet) { S.charge=null; clearTimeout(chargeT); }
  if (s.headsetToast === false || s.quiet) { S.headset=null; clearTimeout(headsetT); }
  paintIsland();
  layout();
  kick();
});

bridge.onGameMode?.((on) => {
  S.gameMode = !!on;
  if (on) {
    S.inAngryRadius = false;
    tempExp = null;
  } else {
    if (typeof resetDodgeState === 'function') resetDodgeState();
  }
  layout();
});

/* ---------- Home + idle (Mata Ikut Kursor + Ekspresi Emosi) ---------- */
let eyeExpMode = 'auto';
let tempExp = null;
let tempExpUntil = 0;
S.inAngryRadius = false;
let autoExpIdx = 0;
// Saat kursor jauh, mata tidak marah (normal, senang, flirty wink, ketawa, sedih)
const AUTO_EXPS = ['normal', 'happy', 'flirty', 'laugh', 'normal', 'sad', 'lol'];
let lastCursorMoveAt = Date.now();
let prevDx = 0, lastDir = 0, shakeFlips = 0, shakeResetT = 0;
let tempExpT = null;
let eyeRejoinT = null;

function easeEyeTrackingReturn(fromExp) {
  if (curKey !== 'idle' || !['happy','laugh'].includes(fromExp) || S.inAngryRadius) return;
  const eyeNodes = [...$('#eyes').children];
  const previous = eyeNodes.map(el => getComputedStyle(el).transform);
  tempExp = null;
  renderIdle();
  if ($('#v-idle').dataset.exp === fromExp) return;
  clearTimeout(eyeRejoinT);
  island.classList.add('eye-rejoin');
  eyeNodes.forEach((el,i) => {
    el.style.animation = 'none';
    el.style.transition = 'none';
    el.style.transform = previous[i] === 'none' ? 'translateY(0)' : previous[i];
    void el.offsetWidth;
  });
  requestAnimationFrame(() => eyeNodes.forEach(el => {
    el.style.transition = 'transform .48s cubic-bezier(.22,1,.36,1), width .42s ease, height .42s ease, border-radius .42s ease';
    el.style.transform = 'none';
  }));
  eyeRejoinT = setTimeout(() => {
    eyeNodes.forEach(el => { el.style.removeProperty('animation'); el.style.removeProperty('transition'); el.style.removeProperty('transform'); });
    island.classList.remove('eye-rejoin');
  }, 520);
}

function setTempExp(exp, ms = 3600) {
  tempExp = exp;
  tempExpUntil = Date.now() + ms;
  clearTimeout(tempExpT);
  tempExpT = setTimeout(() => {
    if (tempExp === exp) {
      if (curKey === 'idle' && ['happy','laugh'].includes(exp)) easeEyeTrackingReturn(exp);
      else { tempExp = null; if (curKey === 'idle') renderIdle(); }
    }
  }, ms);
  if (curKey === 'idle') renderIdle();
}

function currentEyeExp(idleFor) {
  if (S.settings.quiet || S.gameMode) return 'normal';
  if (S.petUntil && Date.now() < S.petUntil) return 'happy';
  if (S.inAngryRadius) return 'angry';
  if (tempExp && Date.now() < tempExpUntil) return tempExp;
  if (S.settings && S.settings.eyeMode === 'static') return S.settings.staticExp || 'normal';
  if (eyeExpMode !== 'auto') return eyeExpMode;
  if (Date.now() - lastCursorMoveAt > 180000 && idleFor > 180000) return 'sleep';
  if (typeof isPlaying === 'function' && isPlaying()) {
    return AUTO_EXPS[autoExpIdx % 3];
  }
  return AUTO_EXPS[autoExpIdx % AUTO_EXPS.length];
}

acts.cycleyes = () => {
  autoExpIdx = (autoExpIdx + 1) % AUTO_EXPS.length;
  setTempExp(AUTO_EXPS[autoExpIdx], 5000);
  if (typeof notice === 'function') {
    const names = { normal: 'Normal 👀', happy: 'Happy 😊', flirty: 'Flirty 😉', laugh: 'Laugh 😆', sad: 'Sad 😢', lol: 'LOL 🤣', rage: 'Rage 😤' };
    notice('gear', names[AUTO_EXPS[autoExpIdx]] || 'Mood Changed', 1800);
  }
};

function renderHome() {
  const d = new Date();
  setText('h-time', `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  setText('h-date', d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));

  const qBtn = $('#h-quiet-btn');
  if (qBtn) {
    const isQuiet = !!S.settings.quiet;
    qBtn.classList.toggle('active', isQuiet);
    qBtn.title = isQuiet ? 'Quiet mode active (Click to turn off)' : 'Turn on quiet mode';
  }
}
renderers.push(renderHome);

function renderIdle() {
  const el = $('#v-idle');
  const d = new Date();
  setText('i-clock', `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  const idleFor = Date.now() - S.activityAt;
  const eyes = S.settings.mascot !== false;
  el.dataset.mode = eyes ? 'eyes' : 'clock';
  const exp = eyes ? currentEyeExp(idleFor) : 'normal';
  el.dataset.exp = exp;
  el.classList.toggle('sleep', exp === 'sleep');
  island.dataset.angry = (curKey === 'idle' && eyes && exp === 'angry') ? '1' : '0';
  checkSakuraAnimation();

  if (typeof isTimerActive === 'function' && isTimerActive()) {
    el.dataset.timer = '1';
  } else {
    el.dataset.timer = '0';
  }
}
renderers.push(renderIdle);
ticks.push(() => {
  if (curKey === 'idle') renderIdle();
  else { island.dataset.angry = '0'; if (curKey === 'home') renderHome(); }
  checkSakuraAnimation();
});

/* ---------- Sakura Flower Petal Particle Engine (Pink Angry Mode) ---------- */
let sakuraTimer = null;
const SAKURA_FLOWER_SVG = `<svg viewBox="0 0 24 24"><g fill="url(#sakuraGrad)" opacity="0.95"><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.5" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2" fill="#fff5f8"/></svg>`;
const SAKURA_PETAL_SVG = `<svg viewBox="0 0 16 16"><path d="M8 1.5 C5.5 1.5 3.5 4 3.5 7 C3.5 10.8 7.5 14 8 14.5 C8.5 14 12.5 10.8 12.5 7 C12.5 4 10.5 1.5 8 1.5 Z" fill="url(#sakuraGrad)" opacity="0.92"/></svg>`;

function spawnSakuraParticle() {
  const container = $('#sakura-container');
  const isIdleEyes = curKey === 'idle' && !S.expanded;
  const isPink = island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink');
  const isAngry = island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry');
  if (!container || !isIdleEyes || !isPink || !isAngry || (S.settings && S.settings.quiet) || S.gameMode) return;

  if (container.children.length > 18) return;

  const el = document.createElement('div');
  el.className = 'sakura-p';
  const isFlower = Math.random() > 0.45;
  el.innerHTML = isFlower ? SAKURA_FLOWER_SVG : SAKURA_PETAL_SVG;

  const startX = 8 + Math.random() * 84;
  const startY = 32 + Math.random() * 62;
  const size = isFlower ? (13 + Math.random() * 9) : (10 + Math.random() * 7);
  const rotStart = Math.random() * 360;
  const driftX = (Math.random() - 0.5) * 36;
  const driftY = -(18 + Math.random() * 28);
  const duration = 1.3 + Math.random() * 0.9;

  el.style.left = `${startX.toFixed(1)}%`;
  el.style.top = `${startY.toFixed(1)}%`;
  el.style.width = `${size.toFixed(1)}px`;
  el.style.height = `${size.toFixed(1)}px`;
  el.style.setProperty('--rot-start', `${rotStart.toFixed(0)}deg`);
  el.style.setProperty('--drift-x', `${driftX.toFixed(1)}px`);
  el.style.setProperty('--drift-y', `${driftY.toFixed(1)}px`);
  el.style.animation = `petalFloatFade ${duration.toFixed(2)}s cubic-bezier(.2,.8,.4,1) forwards`;

  el.addEventListener('animationend', () => el.remove());
  container.appendChild(el);
}

function checkSakuraAnimation() {
  const isIdleEyes = curKey === 'idle' && !S.expanded;
  const isPink = island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink');
  const isAngry = island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry');
  const isPinkAngry = isIdleEyes && isPink && isAngry && !(S.settings && S.settings.quiet) && !S.gameMode;
  if (isPinkAngry && !sakuraTimer) {
    sakuraTimer = setInterval(spawnSakuraParticle, 190);
    spawnSakuraParticle();
    spawnSakuraParticle();
  } else if (!isPinkAngry && sakuraTimer) {
    clearInterval(sakuraTimer);
    sakuraTimer = null;
    const container = $('#sakura-container');
    if (container) {
      if (!isIdleEyes) {
        container.innerHTML = '';
      } else {
        setTimeout(() => {
          const stillPink = (curKey === 'idle' && !S.expanded) &&
                            (island.dataset.angryVariant === 'pink' || (S.settings && S.settings.angryVariant === 'pink')) &&
                            (island.dataset.angry === '1' || ($('#v-idle') && $('#v-idle').dataset.exp === 'angry'));
          if (!stillPink) container.innerHTML = '';
        }, 1200);
      }
    }
  }
}

// Siklus ekspresi organik saat kursor jauh (senang, ketawa, sedih, normal — tanpa marah)
function advanceAutoExpression() {
  if (!S.settings.quiet && $('#v-idle').dataset.mode === 'eyes' && curKey === 'idle' && !S.inAngryRadius && S.settings.eyeMode !== 'static') {
    autoExpIdx = (autoExpIdx + 1) % AUTO_EXPS.length;
    renderIdle();
  }
  setTimeout(advanceAutoExpression, AUTO_EXPS[autoExpIdx] === 'lol' ? 1800 : 4500);
}
setTimeout(advanceAutoExpression, 4500);

// Mata mengikuti kursor secara real-time di seluruh layar
let lastDx = 0, lastDy = 100;
function updateEyeLook(dx, dy, rawX, rawY) {
  if (S.settings.quiet || S.gameMode) {
    S.inAngryRadius = false;
    $('#eyes').style.setProperty('--look-x','0px'); $('#eyes').style.setProperty('--look-y','0px');
    $('#eyes').style.setProperty('--eye-scale','1');
    return;
  }
  lastDx = dx; lastDy = dy;
  lastCursorMoveAt = Date.now();

  // Mode tuck / peekaboo: mata notch di atas layar mengikuti posisi kursor secara real-time
  if (curKey === 'tuck' || curKey === 'peekaboo') {
    const pk = $('#pk-eyes');
    if (pk) {
      const pkLx = clamp(dx / 40, -6.5, 6.5);
      const pkLy = clamp(dy / 180, -0.8, 1.2);
      pk.style.setProperty('--pk-look-x', `${pkLx.toFixed(1)}px`);
      pk.style.setProperty('--pk-look-y', `${pkLy.toFixed(1)}px`);
    }
    return;
  }

  const edgeDist = Math.hypot(Math.max(0, Math.abs(dx) - 62), Math.max(0, Math.abs(dy) - 18));
  const wasAngry = S.inAngryRadius;
  S.inAngryRadius = edgeDist < (Number(S.settings.angryRadius) || 145);

  if (S.inAngryRadius) {
    tempExp = null;
    tempExpUntil = 0;
    clearTimeout(tempExpT);
  }

  if (curKey !== 'idle') return;
  const eyesEl = $('#eyes');
  if (!eyesEl) return;
  const dist = Math.hypot(dx, dy);
  const isAngry = S.inAngryRadius || eyeExpMode === 'angry';
  const variant = (S.settings && S.settings.angryVariant) || island.dataset.angryVariant || 'classic';

  // Saat marah (kursor di dalam radius), mata mepet brutal sampai pojok/margin pulau mengarah tepat ke kursor!
  let lx, ly, sc;
  if (isAngry) {
    const nx = clamp(dx / 64, -1, 1);
    const ny = clamp(dy / 22, -1, 1);
    lx = nx * 55;
    ly = ny * 10.5;
    sc = 1.18;
  } else {
    lx = clamp(dx / 22, -32, 32);
    ly = clamp(dy / 36, -7.5, 8);
    sc = dist < 220 ? (1 + (1 - dist / 220) * 0.15) : 1;
  }
  const sensitivity = Number(S.settings.sensitivity) || 1;
  // Let the eyes glance hard toward the edge, while keeping both eyes clear
  // of the curved corner when the cursor is also above or below the island.
  const islandWidth = island.clientWidth || 128;
  const islandHeight = island.clientHeight || 32;
  const edgeEyeSize = isAngry ? 1 - 0.4 * Math.min(1, Math.abs(lx * sensitivity) / 55) : 1;
  eyesEl.style.setProperty('--left-eye-size', (isAngry && lx < 0 ? edgeEyeSize : 1).toFixed(3));
  eyesEl.style.setProperty('--right-eye-size', (isAngry && lx > 0 ? edgeEyeSize : 1).toFixed(3));
  const goldEyes = isAngry && variant === 'gold-matrix';
  const eyePairWidth = isAngry ? (goldEyes ? 35 : 28) - (goldEyes ? 13 : 10.5) * (1 - edgeEyeSize) : 25;
  const eyeHeight = isAngry ? (goldEyes ? 18 : 15) : 12;
  const maxY = Math.max(0, islandHeight / 2 - eyeHeight * sc / 2 - 3);
  const edgeMargin = isAngry ? 3 : 8;
  const maxX = Math.max(0, islandWidth / 2 - eyePairWidth * sc / 2 - edgeMargin);
  let minX = -maxX;
  let maxAllowedX = maxX;
  const timerEl = $('#idle-timer');
  if ($('#v-idle').dataset.timer === '1' && timerEl && timerEl.style.display !== 'none') {
    const timerRight = timerEl.getBoundingClientRect().right - island.getBoundingClientRect().left;
    const timerClearance = 7;
    minX = Math.min(maxX, timerRight + timerClearance + eyePairWidth * sc / 2 - islandWidth / 2);
  }
  const timeInfo = $('#idle-time');
  const weatherInfo = $('#idle-weather');
  const infoVisible = island.dataset.idleInfo === '1' || (timeInfo && getComputedStyle(timeInfo).visibility === 'visible');
  if (infoVisible) {
    const islandRect = island.getBoundingClientRect();
    const halfPair = eyePairWidth * sc / 2;
    const clearance = 5;
    if (weatherInfo && getComputedStyle(weatherInfo).display !== 'none') {
      minX = Math.max(minX, weatherInfo.getBoundingClientRect().right - islandRect.left + clearance + halfPair - islandWidth / 2);
    }
    if (timeInfo) {
      maxAllowedX = Math.min(maxAllowedX, timeInfo.getBoundingClientRect().left - islandRect.left - clearance - halfPair - islandWidth / 2);
    }
    if (minX > maxAllowedX) minX = maxAllowedX = clamp((minX + maxAllowedX) / 2, -maxX, maxX);
  }
  const lookX = clamp(lx * sensitivity, minX, maxAllowedX);
  // At the extreme side, pull the pair toward the vertical center of the
  // rounded end rather than clipping the outer eye against its curved rim.
  const sideRatio = Math.min(1, Math.abs(lookX) / Math.max(maxX, 1));
  const verticalRoom = maxY * (isAngry ? 1 - 0.85 * sideRatio ** 3 : 1);
  const lookY = clamp(ly * sensitivity, -verticalRoom, verticalRoom);
  eyesEl.style.setProperty('--look-x', `${lookX.toFixed(1)}px`);
  eyesEl.style.setProperty('--look-y', `${lookY.toFixed(1)}px`);
  eyesEl.style.setProperty('--eye-scale', sc.toFixed(3));

  // Laser Beam & Berserk VFX
  const laserOverlay = $('#laser-overlay');
  if (isAngry && variant === 'laser' && curKey === 'idle') {
    if (laserOverlay) {
      laserOverlay.classList.add('active');
      const eyesRect = eyesEl.getBoundingClientRect();
      const eyeL = eyesEl.children[0];
      const eyeR = eyesEl.children[1];
      const eyeLRect = eyeL ? eyeL.getBoundingClientRect() : eyesRect;
      const eyeRRect = eyeR ? eyeR.getBoundingClientRect() : eyesRect;
      const originLx = eyeLRect.left + eyeLRect.width / 2;
      const originLy = eyeLRect.top + eyeLRect.height / 2;
      const originRx = eyeRRect.left + eyeRRect.width / 2;
      const originRy = eyeRRect.top + eyeRRect.height / 2;

      const targetX = Number.isFinite(rawX) ? rawX : (window.innerWidth / 2 + dx);
      const targetY = Number.isFinite(rawY) ? rawY : (10 + dy);

      const beamL = $('#laser-beam-l');
      const beamR = $('#laser-beam-r');
      const coreL = $('#laser-core-l');
      const coreR = $('#laser-core-r');
      const targetG = $('#laser-target');

      if (beamL) { beamL.setAttribute('x1', originLx); beamL.setAttribute('y1', originLy); beamL.setAttribute('x2', targetX); beamL.setAttribute('y2', targetY); }
      if (beamR) { beamR.setAttribute('x1', originRx); beamR.setAttribute('y1', originRy); beamR.setAttribute('x2', targetX); beamR.setAttribute('y2', targetY); }
      if (coreL) { coreL.setAttribute('x1', originLx); coreL.setAttribute('y1', originLy); coreL.setAttribute('x2', targetX); coreL.setAttribute('y2', targetY); }
      if (coreR) { coreR.setAttribute('x1', originRx); coreR.setAttribute('y1', originRy); coreR.setAttribute('x2', targetX); coreR.setAttribute('y2', targetY); }
      if (targetG) {
        targetG.style.display = 'block';
        targetG.setAttribute('transform', `translate(${targetX}, ${targetY})`);
      }
    }
  } else {
    if (laserOverlay) {
      laserOverlay.classList.remove('active');
      const targetG = $('#laser-target');
      if (targetG) targetG.style.display = 'none';
    }
  }

  if (isAngry && variant === 'berserk' && curKey === 'idle') {
    spawnBerserkSparks();
  }

  // Selama di dalam radius -> selalu marah nonstop; begitu keluar radius -> langsung ekspresi flirty (wink)!
  if (S.inAngryRadius !== wasAngry) {
    if (wasAngry && !S.inAngryRadius) {
      setTempExp('flirty', 1800);
    } else {
      renderIdle();
    }
  } else if (S.inAngryRadius && ($('#v-idle').dataset.exp !== 'angry' || $('#v-idle').dataset.mode !== 'eyes' || island.dataset.angry !== '1')) {
    renderIdle();
  }
  if (S.inAngryRadius) return;

  // Deteksi goyangan kursor cepat dari jauh -> mata bereaksi ketawa
  const deltaX = dx - prevDx;
  prevDx = dx;
  if (Math.abs(deltaX) > 28 / sensitivity) {
    const dir = deltaX > 0 ? 1 : -1;
    if (dir !== lastDir) {
      lastDir = dir;
      shakeFlips++;
      clearTimeout(shakeResetT);
      shakeResetT = setTimeout(() => { shakeFlips = 0; }, 550);
      if (shakeFlips >= 6) {
        shakeFlips = 0;
        setTempExp('laugh', 3500);
      }
    }
  }
}
if (bridge.onCursor) bridge.onCursor(updateEyeLook);
if (bridge.onEyeExp) {
  bridge.onEyeExp((exp) => {
    eyeExpMode = exp;
    S.activityAt = Date.now() - 6000; // langsung tampilkan mata untuk preview
    if (S.expanded) collapse(); else renderIdle();
  });
}
enterHooks.tuck = () => updateEyeLook(lastDx, lastDy);
enterHooks.peekaboo = () => updateEyeLook(lastDx, lastDy);

/* ---------- Baterai & Animasi Cas / Unplugged (Putih) / Low Battery (Merah) ---------- */
let batRef = null;
let testBatStep = 0;

function playChargeChime(state) {
  if (S.settings.quiet || S.settings._primary === false) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime + 0.01;
    const note = (freq, start, dur, peak) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    };
    if (state === 'charging') {
      note(587.33, now, 0.22, 0.14);        // D5
      note(880.00, now + 0.065, 0.30, 0.16); // A5
      note(1174.66, now + 0.12, 0.34, 0.08); // D6 shimmer
    } else if (state === 'low') {
      note(659.25, now, 0.14, 0.15);        // E5
      note(587.33, now + 0.11, 0.14, 0.15); // D5
      note(440.00, now + 0.22, 0.26, 0.18); // A4 low battery alert
    } else {
      note(523.25, now, 0.16, 0.10);
      note(392.00, now + 0.06, 0.20, 0.09);
    }
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch (_) {}
}

function triggerChargeAnim(mode = 'charging', pct = null, ms = 2200) {
  if (S.settings.batteryToast === false || S.settings.quiet) return;
  if (S.ring) return;
  const state = mode === true ? 'charging' : (mode === false ? 'unplugged' : mode);
  if (pct === null) {
    pct = batRef ? Math.round(batRef.level * 100) : (state === 'low' ? 15 : 85);
  }
  const el = $('#v-charge');
  const fill = $('#ch-fill');
  el.dataset.state = state;
  island.dataset.chstate = state;
  setText('ch-label', state === 'charging' ? 'Charging' : (state === 'low' ? 'Low Battery' : 'Unplugged'));
  setText('ch-pct', `${pct}%`);

  // Animasi sepersekian detik: reset bar & wave lalu surge!
  fill.style.transition = 'none';
  const startFrac = state === 'charging' ? '0.08' : (state === 'low' ? '0.45' : clamp(pct / 100, 0.08, 1).toFixed(2));
  fill.style.setProperty('--bat-frac', startFrac);
  el.classList.remove('surge');
  void el.offsetWidth;
  fill.style.transition = '';
  el.classList.add('surge');
  requestAnimationFrame(() => {
    fill.style.setProperty('--bat-frac', clamp(pct / 100, 0.08, 1).toFixed(2));
  });

  playChargeChime(state);
  setTempExp(state === 'charging' ? 'happy' : 'sad', ms + 6000);
  S.charge = { state, pct };
  S.expanded = false;
  S.peek = null;
  clearTimeout(peekT);
  clearTimeout(chargeT);
  layout();
  if (typeof triggerGlassRing === 'function') triggerGlassRing();
  chargeT = setTimeout(() => {
    S.charge = null;
    S.activityAt = Date.now() - 6000;
    layout();
  }, ms);
}

acts.testcharge = () => {
  const realPct = batRef ? Math.round(batRef.level * 100) : 88;
  const modes = ['charging', 'unplugged', 'low'];
  const m = modes[testBatStep % modes.length];
  testBatStep++;
  triggerChargeAnim(m, m === 'low' ? Math.min(realPct, 15) : realPct, 2300);
};
if (bridge.onTestCharge) {
  bridge.onTestCharge((mode) => {
    if (mode && typeof mode === 'string') {
      const realPct = batRef ? Math.round(batRef.level * 100) : 88;
      triggerChargeAnim(mode, mode === 'low' ? Math.min(realPct, 15) : realPct, 2400);
    } else {
      acts.testcharge();
    }
  });
}

if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    batRef = b;
    let lastLow = Math.round(b.level * 100);
    b.addEventListener('chargingchange', () => {
      const l = Math.round(b.level * 100);
      // Saat charger dicabut -> selalu tampilkan animasi Unplugged warna putih bersih
      triggerChargeAnim(b.charging ? 'charging' : 'unplugged', l, 2200);
      if (!b.charging && l <= 20) {
        setTempExp('sleep', 3000);
        setTimeout(() => {
          if (batRef && !batRef.charging) triggerChargeAnim('low', Math.round(batRef.level * 100), 2800);
        }, 3200);
      }
    });
    b.addEventListener('levelchange', () => {
      const l = Math.round(b.level * 100);
      if (!b.charging && ((l <= 20 && lastLow > 20) || (l <= 15 && lastLow > 15) || (l <= 10 && lastLow > 10) || (l <= 5 && lastLow > 5))) {
        triggerChargeAnim('low', l, 2800);
        setTempExp('sleep', 5000);
      }
      lastLow = l;
    });
  }).catch(() => {});
}
/* ---------- Jaringan ---------- */
window.addEventListener('offline', () => notice('wifioff', 'Offline', 3200));
window.addEventListener('online', () => notice('wifi', 'Online', 2400));

/* ---------- Bluetooth Headset Connected (Animasi ala AirPods) ---------- */
function playHeadsetChime() {
  if (S.settings.quiet || S.settings._primary === false) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    if (!ac) return;
    const now = ac.currentTime;

    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const g = ac.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.14); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.14); // A6

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(ac.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
    setTimeout(()=>ac.close().catch(()=>{}),1000);
  } catch (_) {}
}

function triggerHeadsetAnim(info, ms = 3600) {
  if (S.settings.headsetToast === false || S.settings.quiet) return;
  const name = (info && info.name) ? info.name : 'Audio device';
  setText('hs-name', name);
  setText('hs-status-text', info?.transport === 'bluetooth' ? 'Bluetooth connected' : 'Wired connected');
  const el = $('#v-headset');
  if (el) {
    el.dataset.transport = info?.transport === 'bluetooth' ? 'bluetooth' : 'wired';
    el.classList.remove('surge');
    void el.offsetWidth;
    el.classList.add('surge');
  }

  playHeadsetChime();
  setTempExp('happy', ms + 4000);
  S.headset = { name };
  S.expanded = false;
  S.peek = null;
  clearTimeout(peekT);
  clearTimeout(headsetT);
  layout();
  if (typeof triggerGlassRing === 'function') triggerGlassRing();

  headsetT = setTimeout(() => {
    S.headset = null;
    S.activityAt = Date.now() - 6000;
    layout();
  }, ms);
}

acts.testheadset = () => triggerHeadsetAnim({ name: "Azka's Buds2" });
if (bridge.onHeadset) {
  bridge.onHeadset((info) => {
    if (info && info.connected) {
      triggerHeadsetAnim(info);
    }
  });
}
if (bridge.onTestHeadset) {
  bridge.onTestHeadset((name) => triggerHeadsetAnim({ name: name || "Azka's Buds2" }));
}

/* ---------- Preferences / Settings IPC Listeners on Notch ---------- */
if (bridge.onTestAngry) {
  bridge.onTestAngry(() => {
    collapse();
    S.activityAt = Date.now() - 6000;
    setTempExp('angry', 3800);
    island.dataset.angry = '1';
    setTimeout(() => {
      if (!S.inAngryRadius) island.dataset.angry = '0';
    }, 3800);
  });
}

/* ---------- iOS Liquid Glass Sliders (Volume & Brightness) ---------- */
const sysState = { volume: 50, brightness: 50 };
let activeSlider = null;
let sendBriThrottled = null;

function updateSliderUI(kind, val) {
  val = Math.max(0, Math.min(100, Math.round(val)));
  sysState[kind] = val;
  const slider = $(`#slider-${kind}`);
  const fill = $(`#fill-${kind}`);
  const txt = $(`#val-${kind}`);
  const icoWrap = $(`#ico-${kind}`);
  if (fill) fill.style.width = `${val}%`;
  if (txt) txt.textContent = `${val}%`;
  if (slider) slider.setAttribute('aria-valuenow', val);

  if (kind === 'volume') {
    let ico = 'volume';
    if (val === 0) ico = 'volume-mute';
    else if (val <= 33) ico = 'volume-low';
    else if (val <= 66) ico = 'volume-med';
    else ico = 'volume';
    if (icoWrap && icoWrap.dataset.currentIco !== ico) {
      icoWrap.dataset.currentIco = ico;
      icoWrap.innerHTML = ICONS[ico] || '';
    }
  } else if (kind === 'brightness') {
    const ico = val <= 40 ? 'brightness-low' : 'brightness';
    if (icoWrap && icoWrap.dataset.currentIco !== ico) {
      icoWrap.dataset.currentIco = ico;
      icoWrap.innerHTML = ICONS[ico] || '';
    }
  }
}

if (bridge.onSysState) {
  bridge.onSysState((s) => {
    if (!s) return;
    if (Number.isFinite(s.volume) && activeSlider !== 'volume') {
      updateSliderUI('volume', s.volume);
    }
    if (Number.isFinite(s.brightness) && activeSlider !== 'brightness') {
      updateSliderUI('brightness', s.brightness);
    }
  });
}

function handleSliderEvent(e, el, isEnd = false) {
  const rect = el.getBoundingClientRect();
  const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const val = Math.round(ratio * 100);
  const kind = el.dataset.slider;
  updateSliderUI(kind, val);

  if (kind === 'volume') {
    bridge.setVolume?.(val);
  } else if (kind === 'brightness') {
    clearTimeout(sendBriThrottled);
    if (isEnd) {
      bridge.setBrightness?.(val);
    } else {
      sendBriThrottled = setTimeout(() => {
        bridge.setBrightness?.(val);
      }, 35);
    }
  }
}

function initIosSliders() {
  const sliders = document.querySelectorAll('.ios-slider');
  sliders.forEach((slider) => {
    const kind = slider.dataset.slider;
    updateSliderUI(kind, sysState[kind] || 50);

    slider.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activeSlider = kind;
      slider.classList.add('dragging');
      bridge.setDragActive?.(true);
      bridge.setMouseActive?.(true);
      handleSliderEvent(e, slider);

      const onPointerMove = (ev) => {
        if (activeSlider === kind) {
          handleSliderEvent(ev, slider);
        }
      };

      const onPointerUp = (ev) => {
        if (activeSlider === kind) {
          handleSliderEvent(ev, slider, true);
          activeSlider = null;
          slider.classList.remove('dragging');
          bridge.setDragActive?.(false);
          bridge.setMouseActive?.(false);
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });

    // Mouse wheel (scroll up = +5%, scroll down = -5%)
    slider.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 5 : -5;
      const cur = sysState[kind] || 50;
      const next = Math.max(0, Math.min(100, cur + step));
      updateSliderUI(kind, next);
      if (kind === 'volume') bridge.setVolume?.(next);
      else bridge.setBrightness?.(next);
    }, { passive: false });
  });
}

// Inisialisasi slider saat boot
initIosSliders();

acts.bluetoothsettings=()=>bridge.openConnectivity?.("bluetooth");
acts.wifisettings=()=>bridge.openConnectivity?.("wifi");

bridge.onConnectivity?.(state=>{
 for(const kind of ['wifi','bluetooth']){
  const button=document.querySelector('[data-act="'+kind+'settings"]');if(!button)continue;
  const info=state[kind]||{},name=kind==='wifi'?'Wi-Fi':'Bluetooth';
  button.dataset.radioOn=info.on===true?'1':'0';
  const names=Array.isArray(info.names)?info.names.join(', '):(typeof info.names==='string'?info.names:'');
  button.title=name+': '+(info.on===null?'Status unavailable':info.on?(names||'On · not connected'):'Off');
  button.setAttribute('aria-label',button.title);
 }
});


/* ---------- Berserk Dark Void Sparks Engine ---------- */
function spawnBerserkSparks() {
  const container = $('#berserk-container');
  if (!container || !S.inAngryRadius) return;
  if (Math.random() > 0.45) return;
  const spark = document.createElement('div');
  spark.className = 'berserk-spark';
  const islandW = island.clientWidth || 128;
  const islandH = island.clientHeight || 32;
  spark.style.left = (Math.random() * islandW) + 'px';
  spark.style.top = (Math.random() * islandH) + 'px';
  spark.style.setProperty('--bs-x', `${(Math.random() * 44 - 22).toFixed(1)}px`);
  spark.style.setProperty('--bs-y', `${(Math.random() * 44 - 22).toFixed(1)}px`);
  container.appendChild(spark);
  setTimeout(() => spark.remove(), 380);
}

/* ---------- 30s Idle Info (Weather & Clock) Engine ---------- */
let weatherState = { available: false };
bridge.onWeather?.(state => {
  weatherState = state || { available: false };
  if (!weatherState.available && S.idleInfoActive) { S.idleInfoActive = false; layout(); syncIdleInfoEyes(); }
  updateIdleInfoDisplay();
});

function updateIdleInfoDisplay() {
  const d = new Date();
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const tEl = $('#idle-time-text');
  if (tEl) tEl.textContent = timeStr;
  const wEl = $('#idle-weather-text');
  const weatherEl = $('#idle-weather');
  const showWeather = S.settings.weatherEnabled === true && weatherState.available;
  if (weatherEl) weatherEl.style.display = showWeather ? '' : 'none';
  if (wEl) {
    wEl.textContent = showWeather ? `${Math.round(weatherState.temperature)}°C` : '';
    wEl.title = showWeather ? `${weatherState.city} · MET Norway · updated ${new Date(weatherState.updatedAt).toLocaleTimeString()}` : '';
  }
}

let idleInfoEyeSyncToken = 0;
function syncIdleInfoEyes() {
  const token = ++idleInfoEyeSyncToken;
  const until = performance.now() + 460;
  const frame = () => {
    if (token !== idleInfoEyeSyncToken || curKey !== 'idle') return;
    updateEyeLook(lastDx, lastDy);
    if (performance.now() < until) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Siklus setiap 30 detik: aktif selama 10 detik dengan animasi ease-in
setInterval(() => {
  if (curKey !== 'idle' || S.expanded || (S.settings && S.settings.quiet) || S.gameMode) {
    if (S.idleInfoActive) {
      S.idleInfoActive = false;
      layout();
      syncIdleInfoEyes();
    }
    return;
  }
  updateIdleInfoDisplay();
  S.idleInfoActive = true;
  layout();
  syncIdleInfoEyes();

  setTimeout(() => {
    if (S.idleInfoActive) {
      S.idleInfoActive = false;
      layout();
      syncIdleInfoEyes();
    }
  }, 10000); // Tampil selama 10 detik
}, 30000); // Ulangi setiap 30 detik

