'use strict';
/* ===== AIR MINUM ===== */
S.water = Object.assign({ goal: 2000, bottle: 250, log: {}, remind: { on: true, every: 60, from: 8, to: 22 } }, store.get('island.water', {}));
let lastRemind = Date.now();
const saveWater = () => store.set('island.water', S.water);
const waterToday = () => S.water.log[todayKey()] || 0;

function renderWater() {
  if (curKey && curKey !== 'water' && curKey !== 'wset') return;
  const w = S.water, ml = waterToday(), frac = w.goal ? ml / w.goal : 0;
  setText('w-pct', Math.round(frac * 100) + '%');
  setText('w-big', `${ml} / ${w.goal} ml`);
  setText('w-add', `+${w.bottle} ml`);
  setRing('w-ringfg', frac);
  // 7 hari terakhir
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5), v = w.log[todayKey(d)] || 0;
    const h = clamp(v / (w.goal || 1), 0, 1) * 100;
    html += `<div class="wb ${i === 0 ? 'today' : ''} ${v >= w.goal ? 'full' : ''}"><div class="tr"><i style="height:${h.toFixed(0)}%"></i></div><span>${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span></div>`;
  }
  setHTML('w-week', html);
  // pengaturan
  setText('ws-bottle', w.bottle + ' ml'); setText('ws-goal', w.goal + ' ml'); setText('ws-every', w.remind.every + 'm');
  $('#w-remind').classList.toggle('on', w.remind.on);
}
renderers.push(renderWater);

function addWater(ml) {
  const k = todayKey();
  S.water.log[k] = Math.max(0, (S.water.log[k] || 0) + ml);
  S.water.last = ml > 0 ? ml : S.water.last;
  saveWater(); renderAll();
}
acts.water = () => go('water');
acts.wset = () => go('wset');
acts.wadd = () => addWater(S.water.bottle);
acts.wundo = () => addWater(-S.water.bottle);
acts.wremind = () => { S.water.remind.on = !S.water.remind.on; saveWater(); renderAll(); };
holds.binc = () => { S.water.bottle = clamp(S.water.bottle + 50, 50, 1500); saveWater(); renderAll(); };
holds.bdec = () => { S.water.bottle = clamp(S.water.bottle - 50, 50, 1500); saveWater(); renderAll(); };
holds.ginc = () => { S.water.goal = clamp(S.water.goal + 250, 500, 6000); saveWater(); renderAll(); };
holds.gdec = () => { S.water.goal = clamp(S.water.goal - 250, 500, 6000); saveWater(); renderAll(); };
holds.einc = () => { S.water.remind.every = clamp(S.water.remind.every + 15, 15, 240); saveWater(); renderAll(); };
holds.edec = () => { S.water.remind.every = clamp(S.water.remind.every - 15, 15, 240); saveWater(); renderAll(); };

function triggerWaterReminder() {
  const w = S.water;
  ringStart({
    kind: 'water',
    icon: 'drop',
    title: 'Drink water now! or you die',
    sub: `${waterToday()} / ${w.goal} ml · Stay hydrated`,
    btn: `Drink (+${w.bottle}ml)`,
    stopLabel: 'Later',
    loop: true,
    auto: 30000,
    onBtn: () => addWater(w.bottle),
  });
}
acts.testwater = triggerWaterReminder;
if (bridge.onTestWater) bridge.onTestWater(triggerWaterReminder);

ticks.push(() => {
  const w = S.water, r = w.remind;
  if (curKey === 'water') renderWater();
  if (!r.on || S.ring) return;
  const h = new Date().getHours();
  if (h < r.from || h >= r.to) return;
  if (Date.now() - lastRemind < r.every * 60000) return;
  lastRemind = Date.now();
  if (waterToday() >= w.goal) return;
  triggerWaterReminder();
});
