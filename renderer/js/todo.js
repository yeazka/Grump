'use strict';
/* ===== TUGAS + PENGINGAT ===== */
S.todos = store.get('island.todos', []);
const saveTodos = () => store.set('island.todos', S.todos);

function renderTodo() {
  if (curKey && curKey !== 'todo') return;
  const done = S.todos.filter((t) => t.done).length;
  setText('td-count', `${done}/${S.todos.length}`);
  const sorted = [...S.todos].sort((a, b) => (a.done - b.done) || ((a.dueAt || 9e15) - (b.dueAt || 9e15)));
  const html = !sorted.length ? '<div class="a-empty">No tasks</div>' : sorted.map((t) => `
    <div class="td-row ${t.done ? 'done' : ''}">
      <button class="chk ${t.done ? 'on' : ''}" data-act="ttoggle" data-id="${t.id}"><span data-ico="check"></span></button>
      <span class="tx">${esc(t.text)}</span>
      ${t.dueAt ? `<span class="due ${!t.done && t.dueAt < Date.now() ? 'late' : ''}">${new Date(t.dueAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
      <button class="icon-btn del" data-act="tdel" data-id="${t.id}"><span data-ico="close"></span></button>
    </div>`).join('');
  if (setHTML('td-list', html)) setIco($('#td-list'));
}
renderers.push(renderTodo);

acts.todo = () => go('todo');
acts.ttoggle = (el) => { const t = S.todos.find((x) => x.id === el.dataset.id); if (t) { t.done = !t.done; saveTodos(); renderAll(); } };
acts.tdel = (el) => { S.todos = S.todos.filter((x) => x.id !== el.dataset.id); saveTodos(); renderAll(); };

$('#td-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $('#td-in'), tm = $('#td-time');
  const text = inp.value.trim(); if (!text) return;
  let dueAt = null;
  if (tm.value) {
    const [h, m] = tm.value.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    dueAt = d.getTime();
  }
  S.todos.push({ id: idGen(), text, done: false, dueAt, alerted: false });
  saveTodos(); inp.value = ''; tm.value = ''; renderAll();
});

/* Input teks butuh fokus keyboard: jendela biasanya non-focusable, jadi dinyalakan saat input dipakai */
function lockFocus(on) {
  S.focusLock = on; bridge.setFocusable(on);
}
for (const id of ['td-in', 'td-time']) {
  const el = $('#' + id);
  el.addEventListener('pointerdown', () => { lockFocus(true); setTimeout(() => el.focus(), 30); });
  el.addEventListener('blur', () => setTimeout(() => { if (!document.activeElement || !['td-in', 'td-time'].includes(document.activeElement.id)) lockFocus(false); }, 80));
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.focusLock) { document.activeElement.blur(); lockFocus(false); } });

ticks.push(() => {
  if (curKey === 'todo') return;
  const now = Date.now();
  if (S.ring) return;
  const t = S.todos.find((x) => !x.done && x.dueAt && !x.alerted && x.dueAt <= now);
  if (!t) return;
  t.alerted = true; saveTodos();
  ringStart({
    kind: 'todo', icon: 'check', title: t.text.length > 28 ? t.text.slice(0, 27) + '…' : t.text, sub: 'Reminder',
    btn: 'Done', stopLabel: 'Later', loop: false, auto: 30000,
    onBtn: () => { t.done = true; saveTodos(); layout(); },
  });
});
