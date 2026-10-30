'use strict';
// Small, opt-in character reactions. Keep these independent of page navigation.
let grumpClicks = [];
let petPasses = 0;
let lastPetX = null;
let lastPetDir = 0;
let lastPetAt = 0;
let lastChaseAt = 0;
let lastMoveAt = Date.now();
let lastPointerX = null;
let lastPointerT = 0;
let wakeFlips = 0;
let lastWakeDir = 0;
let lastWakeAt = 0;
let wakeActiveUntil = 0;
let cpuBusySince = 0;
let lastCpuReaction = 0;

island.addEventListener('click', (e) => {
  if (e.target.closest('input,textarea,[contenteditable="true"]')) return;
  const now = performance.now();
  grumpClicks = grumpClicks.filter(t => now - t < 2200);
  grumpClicks.push(now);
  if (grumpClicks.length >= 5) {
    grumpClicks = [];
    e.preventDefault();
    e.stopImmediatePropagation();
    clearTimeout(hoverT);
    if (S.expanded) collapse();
    setTempExp('angry', 4200);
    island.classList.remove('spam-angry');
    void island.offsetWidth;
    island.classList.add('spam-angry');
    setTimeout(() => island.classList.remove('spam-angry'), 850);
  }
}, true);

island.addEventListener('pointermove', (e) => {
  const now = performance.now();
  const x = e.clientX;
  if (lastPetX !== null && now - lastPetAt < 650 && !S.expanded && curKey === 'idle') {
    const dx = x - lastPetX;
    const dir = Math.sign(dx);
    if (Math.abs(dx) > 9 && Math.abs(dx) < 45 && dir && dir !== lastPetDir) {
      petPasses++;
      lastPetDir = dir;
      if (petPasses >= 5) {
        petPasses = 0;
        S.petUntil=Date.now()+5000;
        setTempExp('happy', 5000);
        island.classList.add('petted');
        setTimeout(() => island.classList.remove('petted'), 1200);
      }
    }
  } else if (now - lastPetAt >= 650) petPasses = 0;
  lastPetX = x;
  lastPetAt = now;
});

bridge.onCursor?.((_dx, _dy, rawX, rawY) => {
  const now = performance.now();
  if (lastPointerX !== null) {
    const dt = Math.max(1, now - lastPointerT);
    const delta = rawX - lastPointerX;
    const speed = Math.abs(delta) / dt;
    if (speed > 2.4 && now - lastChaseAt > 2500 && !S.expanded && !S.settings.quiet) {
      lastChaseAt = now;
      island.classList.add('cursor-dizzy');
      setTimeout(() => island.classList.remove('cursor-dizzy'), 850);
    }
    if ($('#v-idle')?.dataset.exp === 'sleep' && Math.abs(rawY) < 70) wakeActiveUntil=now+900;
    if (curKey === 'idle' && now < wakeActiveUntil && Math.abs(rawY) < 70) {
      const dir = Math.sign(delta);
      if (Math.abs(delta) > 18 && dir && dir !== lastWakeDir && now - lastWakeAt < 800) wakeFlips++;
      else if (now - lastWakeAt >= 800) wakeFlips = 0;
      if (dir) lastWakeDir = dir;
      lastWakeAt = now;
      if (wakeFlips >= 4) { wakeFlips = 0; setTempExp('happy', 3300); }
    }
  }
  if (lastPointerX !== rawX) lastMoveAt = Date.now();
  lastPointerX = rawX;
  lastPointerT = now;
});

bridge.onCpuLoad?.((load) => {
  const now = Date.now();
  if (load >= 85) {
    if (!cpuBusySince) cpuBusySince = now;
    if (now - cpuBusySince > 10000 && now - lastCpuReaction > 60000 && !S.settings.quiet) {
      lastCpuReaction = now;
      setTempExp('sad', 5000);
      island.classList.add('overworked');
      setTimeout(() => island.classList.remove('overworked'), 5000);
    }
  } else cpuBusySince = 0;
});

bridge.onHug?.((active) => {
  island.classList.toggle('cursor-hug', !!active);
  if (active) setTempExp('happy', 8000);
});

let birthdayNextAt = 0, birthdayUntil = 0, birthdayWasToday = false;
function updateBirthdayMode() {
  const today = new Date();
  const birthday = S.settings.birthday;
  const isBirthday = /^(?:\d{4}-)?\d{2}-\d{2}$/.test(birthday || '') && birthday.slice(-5) === `${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const now = Date.now();
  if (!isBirthday) { birthdayNextAt = 0; birthdayUntil = 0; birthdayWasToday = false; island.classList.remove('birthday'); return; }
  if (!birthdayWasToday) { birthdayWasToday = true; birthdayNextAt = now; }
  if (now >= birthdayNextAt) { birthdayUntil = now + 7000; birthdayNextAt = now + 30 * 60 * 1000; }
  island.classList.toggle('birthday', now < birthdayUntil);
}
renderers.push(updateBirthdayMode);
ticks.push(updateBirthdayMode);
