'use strict';
/* ===== GRUMP STASH (Kantong File): tarik file ke pulau, tarik keluar ke aplikasi lain ===== */
S.shelf = store.get('island.stash', store.get('island.shelf', []));
const saveShelf = () => store.set('island.stash', S.shelf);
const IMG_RE = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;
const fileUrl = (p) => 'file:///' + p.replace(/\\/g, '/').split('/').map((s, i) => (i === 0 && /^[A-Za-z]:$/.test(s) ? s : encodeURIComponent(s).replace(/'/g,'%27'))).join('/');
const fmtSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB';

function renderShelf() {
  if (curKey && curKey !== 'stash' && curKey !== 'shelf') return;
  const stashEl = $('#v-stash') || $('#v-shelf');
  if (stashEl) stashEl.classList.toggle('hot', S.dropHot);
  const clearBtn = $('#s-clear');
  if (clearBtn) clearBtn.style.display = S.shelf.length ? '' : 'none';
  const html = !S.shelf.length ? '<div class="stash-empty"><span class="stash-empty-ico" data-ico="tray"></span><span>Drop files here to stash temporarily</span></div>' :
    S.shelf.map((f) => {
      const thumb = IMG_RE.test(f.name)
        ? `<div class="th" style="background-image:url('${fileUrl(f.path)}')"></div>`
        : `<div class="th ext"><span data-ico="file"></span><b>${esc((f.name.split('.').pop() || '').slice(0, 4).toUpperCase())}</b></div>`;
      return `<div class="s-item" draggable="true" data-id="${f.id}" title="${esc(f.path)}">
        ${thumb}<div class="nm">${esc(f.name)}</div><div class="sz">${fmtSize(f.size || 0)}</div>
        <button class="x" data-act="sdel" data-id="${f.id}"><span data-ico="close"></span></button></div>`;
    }).join('');
  if (setHTML('s-list', html)) setIco($('#s-list'));
}
renderers.push(renderShelf);

acts.stash = () => go('stash');
acts.shelf = () => go('stash');
acts.sdel = (el) => { S.shelf = S.shelf.filter((f) => f.id !== el.dataset.id); saveShelf(); renderAll(); };
acts.sclear = () => { S.shelf = []; saveShelf(); renderAll(); };

async function addFiles(paths) {
  for (const p of paths) {
    if (S.shelf.some((f) => f.path === p)) continue;
    const info = await bridge.fileInfo(p).catch(() => null);
    if (!info) continue;
    S.shelf.push({ id: idGen(), path: p, name: info.name, size: info.size });
  }
  saveShelf(); S.dropHot = false; go('stash');
}
bridge.onDrop(addFiles);

// tarik keluar
$('#s-list').addEventListener('dragstart', (e) => {
  const it = e.target.closest('.s-item'); if (!it) return;
  e.preventDefault();
  const f = S.shelf.find((x) => x.id === it.dataset.id);
  if (f) bridge.startDrag(f.path);
});

// tarik masuk
const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
let feedingLeaveTimer;
function finishFeeding(){
  clearTimeout(feedingLeaveTimer);S.dropHot=false;S.dragLock=false;
  island.classList.remove('mouth-open');bridge.setDragActive?.(false);renderShelf();
}
function startFeeding(){
  clearTimeout(feedingLeaveTimer);
  if(!S.dropHot){S.dragLock=true;bridge.setDragActive?.(true);if(curKey!=='stash')go('stash');}
  S.dropHot=true;island.classList.add('mouth-open');renderShelf();
}
document.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  startFeeding();
});
document.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy';startFeeding(); } });
document.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null && S.dropHot) feedingLeaveTimer=setTimeout(finishFeeding,90);
});
document.addEventListener('drop', (e) => { e.preventDefault();finishFeeding(); });
document.addEventListener('dragend',finishFeeding);
