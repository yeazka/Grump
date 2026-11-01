'use strict';
const bridge = window.dynIsland;
// Keep the existing controls and handlers; only group their sections for the sidebar.
const settingsContent = document.querySelector('.content');
const appearancePane = document.getElementById('tab-appearances');
const featuresPane = document.getElementById('tab-features');
for (const [tab, sectionIds] of [
  ['expression', ['mode-title', 'angry-title']],
  ['position', ['position-title']],
  ['updates', ['updates-title']],
]) {
  const pane = document.createElement('div');
  pane.className = 'tab-pane';
  pane.id = `tab-${tab}`;
  pane.setAttribute('role', 'tabpanel');
  for (const id of sectionIds) {
    const section = document.getElementById(id)?.closest('section');
    if (section) pane.append(section);
  }
  settingsContent.insertBefore(pane, featuresPane);
}
const defaults = { offsetX: 0, theme: 'default', eyeMode: 'auto', staticExp: 'normal', angryVariant: 'gold-matrix', angryRadius:145, sensitivity:2, dockMode:'island', islandWidth:128, islandHeight:32, islandTransparency:0, weatherEnabled:true, weatherCity:'jakarta', displayTargets:['primary'], language:'en' };
let settings = { ...defaults, angryRadius:145, sensitivity:2, quiet:false, menuMusic:true, menuTimer:true, menuStash:true, menuQuiet:false, batteryToast:true, headsetToast:true, hideFullscreen:true, smartQuietPrompt:false, gameModeQuiet:true, dockMode:'island', language:'en' };
const isId = () => settings.language === 'id';
let addonSettings={selected:[]};
function updateAddonSettings(){document.querySelectorAll('[data-addon-feature]').forEach(input=>{input.checked=addonSettings.selected?.includes(input.dataset.addonFeature)||false;});}
bridge.onAddonState?.(state=>{if(state){addonSettings=state;updateAddonSettings();}});
bridge.addonState?.().then(state=>{if(state){addonSettings=state;updateAddonSettings();}}).catch(()=>{});
document.querySelectorAll('[data-addon-feature]').forEach(input=>input.addEventListener('change',async()=>{
  let state=null;
  try{state=await bridge.addonCommand?.(input.checked?'select':'remove',input.dataset.addonFeature);}catch{}
  if(state)addonSettings=state;
  updateAddonSettings();
}));
const previews = [];
const visibility = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
}, { root: document.querySelector('.content') });

// Shadow roots reuse the actual island stylesheet without leaking its layout into Settings.
function preview(button, { theme = 'default', exp = 'normal', variant = 'classic' }) {
  const host = document.createElement('span');
  host.className = 'demo';
  host.setAttribute('aria-hidden', 'true');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="waterline-glass.css"><style>
    :host { display:block; position:relative; overflow:hidden; }
    #island { position:absolute; top:50%; left:50%; width:124px; height:36px; border-radius:18px; transform:translate(-50%,-50%) scale(.66); transform-origin:center; }
    :host([data-theme-demo]) { background:#141414; margin-bottom:10px; }
    :host([data-paused]) *, :host([data-paused]) *::before, :host([data-paused]) *::after { animation-play-state:paused !important; }
    @media(prefers-reduced-motion:reduce) { *, *::before, *::after { animation:none !important; transition:none !important; } }
  </style><div id="island" data-key="idle"><section class="view on" id="v-idle" data-mode="eyes"><div id="eyes"><i><span class="cyber-grid"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span></i><i><span class="cyber-grid"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span></i></div></section></div>`;
  const island = shadow.querySelector('#island');
  for(const eye of shadow.querySelectorAll('#eyes > i')){
    const grid=document.createElement('span');grid.className='gpt-eye-grid';grid.dataset.motion='scan';
    for(let n=0;n<9;n++)grid.append(document.createElement('b'));
    eye.append(grid);
  }
  island.dataset.theme = theme;
  island.dataset.angryVariant = variant;
  island.dataset.angry = exp === 'angry' ? '1' : '0';
  shadow.querySelector('#v-idle').dataset.exp = exp;
  if (variant === 'gold-matrix') {
    const burst = document.createElement('span');
    burst.className = 'gold-burst';
    burst.setAttribute('aria-hidden', 'true');
    for (let n = 0; n < 16; n++) burst.append(document.createElement('b'));
    shadow.querySelector('#eyes').append(burst);
  }
  button.prepend(host);
  previews.push({ host, island });
  visibility.observe(host);
  return host;
}
function choices(id, key, options, describe) {
  for (const [value, label] of options) {
    const button = document.createElement('button');
    button.className = 'choice';
    button.dataset.key = key;
    button.dataset.value = value;
    button.setAttribute('aria-pressed', 'false');
    const caption = document.createElement('span');
    caption.className = 'label';
    caption.textContent = label;
    button.append(caption);
    const host = preview(button, describe(value));
    if (key === 'theme') host.setAttribute('data-theme-demo', '');
    button.addEventListener('click', () => {
      const patch = { [key]: value };
      if (key === 'staticExp') {
        patch.eyeMode = value === 'lol' ? 'auto' : 'static';
      }
      settings = { ...settings, ...patch };
      bridge.saveSettings(patch);
      updateUI();
    });
    document.getElementById(id).append(button);
  }
}
choices('themes', 'theme', [['default','Onyx Black'],['outline-glass','Outline Glass'],['full-glass','Full Glass']], theme => ({theme}));
choices('expressions', 'staticExp', [['normal','Normal'],['happy','Happy'],['flirty','Wink'],['laugh','Laugh'],['sad','Sad'],['lol','LOL']], exp => ({exp}));
choices('angry', 'angryVariant', [['gold-matrix','Grump Gold'],['dragon','Dragon Eyes'],['gpt-pixels','GPT Pixels'],['classic','Classic Red'],['lightning','Lightning'],['flame','Flame'],['ember','Orange Ember'],['pink','Sakura Pink'],['rage','Rage'],['laser','Laser Beam'],['berserk','Berserk Void'],['cyber-violet','Cyber Violet'],['cyber-amber','Cyber Amber']], variant => ({exp:'angry',variant}));
const CHOICE_LABELS_ID = {
  theme: { 'default': 'Hitam Onyx', 'outline-glass': 'Garis Kaca', 'full-glass': 'Kaca Penuh' },
  staticExp: { normal: 'Normal', happy: 'Senang', flirty: 'Kedip', laugh: 'Tertawa', sad: 'Sedih', lol: 'Ngakak' },
  angryVariant: { 'gold-matrix': 'Emas Grump', dragon: 'Mata Naga', 'gpt-pixels': 'Piksel GPT', classic: 'Merah Klasik', lightning: 'Petir Biru', flame: 'Api Membara', ember: 'Bara Oranye', pink: 'Sakura Pink', rage: 'Murka', laser: 'Sinar Laser', berserk: 'Void Berserk', 'cyber-violet': 'Siber Ungu', 'cyber-amber': 'Siber Amber' },
};
const CHOICE_LABELS_EN = {
  theme: { 'default': 'Onyx Black', 'outline-glass': 'Outline Glass', 'full-glass': 'Full Glass' },
  staticExp: { normal: 'Normal', happy: 'Happy', flirty: 'Wink', laugh: 'Laugh', sad: 'Sad', lol: 'LOL' },
  angryVariant: { 'gold-matrix': 'Grump Gold', dragon: 'Dragon Eyes', 'gpt-pixels': 'GPT Pixels', classic: 'Classic Red', lightning: 'Lightning', flame: 'Flame', ember: 'Orange Ember', pink: 'Sakura Pink', rage: 'Rage', laser: 'Laser Beam', berserk: 'Berserk Void', 'cyber-violet': 'Cyber Violet', 'cyber-amber': 'Cyber Amber' },
};
const FEATURE_COPY = {
  menuMusic: { en: ['Music', 'Mini-player and synchronized lyrics.'], id: ['Musik', 'Pemutar mini dan lirik tersinkronisasi.'] },
  menuTimer: { en: ['Timer', 'Countdown timer with active island ticker.'], id: ['Timer', 'Hitung mundur dengan indikator aktif di island.'] },
  menuStash: { en: ['Stash', 'Drag files into the island to stash temporarily and drag out anytime.'], id: ['Simpan File', 'Tarik file ke island untuk disimpan sementara dan keluarkan kapan saja.'] },
  batteryToast: { en: ['Battery notifications', 'Charging, unplugged, and low battery alerts.'], id: ['Notifikasi baterai', 'Peringatan saat mengisi daya, dicabut, dan baterai lemah.'] },
  headsetToast: { en: ['Headset notifications', 'Notice when headphones or earbuds connect.'], id: ['Notifikasi headset', 'Pemberitahuan saat headphone atau earbud tersambung.'] },
  gameModeQuiet: { en: ['Auto game mode', 'Automatically hide and silence Grump during games.'], id: ['Mode game otomatis', 'Otomatis sembunyikan dan bisukan Grump saat bermain game.'] },
  clipboardEnabled: { en: ['Clipboard history', 'Optional. Keeps recent copies in memory on this device. Turning off clears recent history.'], id: ['Riwayat clipboard', 'Opsional. Menyimpan salinan terbaru di memori perangkat. Mematikan akan menghapus riwayat.'] },
  weatherEnabled: { en: ['Weather', 'Show live weather beside Grump’s eyes.'], id: ['Cuaca', 'Tampilkan cuaca terkini di samping mata Grump.'] },
};
const ADDON_COPY = {
  todo: { en: ['To-do', 'Tasks and reminders'], id: ['Tugas', 'Daftar tugas dan pengingat'] },
  notes: { en: ['Notes', 'Quick notes'], id: ['Catatan', 'Catatan cepat'] },
  prayer: { en: ['Prayer', 'Schedule and alerts'], id: ['Jadwal Sholat', 'Jadwal dan pengingat waktu sholat'] },
  water: { en: ['Water', 'Drink reminders'], id: ['Minum Air', 'Pengingat minum rutin'] },

};
function applySettingsLanguage() {
  const id = isId();
  document.documentElement.lang = id ? 'id' : 'en';
  document.title = id ? 'Pengaturan' : 'Preferences';
  const h1 = document.querySelector('.titlebar h1');
  if (h1) h1.textContent = id ? 'Pengaturan' : 'Preferences';
  const tabs = {
    appearances: id ? 'Tampilan' : 'Appearance',
    expression: id ? 'Ekspresi' : 'Expression',
    position: id ? 'Posisi' : 'Position',
    display: id ? 'Layar' : 'Display',
    features: id ? 'Fitur' : 'Features',
    updates: id ? 'Pembaruan' : 'Updates',
  };
  for (const [tabKey, label] of Object.entries(tabs)) {
    const span = document.querySelector(`.settings-tab[data-tab="${tabKey}"] span`);
    if (span) span.textContent = label;
  }
  const setTxt = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
  setTxt('#lang-title', id ? 'Bahasa' : 'Language');
  setTxt('#lang-desc', id ? 'Pilih bahasa tampilan untuk semua menu dan pop-up.' : 'Choose display language for all menus and pop-ups.');
  setTxt('#dock-title', id ? 'Gaya Penempatan' : 'Placement Style');
  setTxt('[data-dock="island"] .dock-title-text', id ? 'Mengambang' : 'Floating');
  setTxt('[data-dock="anchored"] .dock-title-text', id ? 'Menempel' : 'Anchored');
  setTxt('#theme-title', id ? 'Tema Island' : 'Island theme');
  const themeP = document.querySelector('#theme-title + p');
  if (themeP) themeP.textContent = id ? 'Pilih tampilan island. Perubahan langsung diterapkan.' : 'Choose island styling. Changes apply immediately.';
  setTxt('#mode-title', id ? 'Ekspresi' : 'Expression');
  setTxt('[data-mode="auto"]', id ? 'Otomatis' : 'Auto');
  setTxt('[data-mode="static"]', id ? 'Statis' : 'Static');
  setTxt('#angry-title', id ? 'Reaksi Marah' : 'Grump Reaction');
  const angryP = document.querySelector('#angry-title + p');
  if (angryP) angryP.textContent = id ? 'Gaya animasi saat kursor mendekati island.' : 'Motion style when cursor gets close to the island.';
  setTxt('#position-title', id ? 'Posisi' : 'Position');
  setTxt('#btn-center', id ? 'Tengah' : 'Center');
  setTxt('label[for="width-slider"]', id ? 'Lebar mata' : 'Eyes width');
  setTxt('label[for="height-slider"]', id ? 'Tinggi mata' : 'Eyes height');
  const transLabel = document.querySelector('label[for="transparency-slider"]');
  if (transLabel) transLabel.innerHTML = `${id ? 'Transparansi' : 'Transparency'}<small class="control-hint">${id ? 'Hanya permukaan island' : 'Notch surface only'}</small>`;
  setTxt('#display-title', id ? 'Layar aktif' : 'Active displays');
  const dispP = document.querySelector('#display-title + p');
  if (dispP) dispP.textContent = id ? 'Pilih satu atau lebih monitor untuk Grump.' : 'Choose one or more monitors for Grump.';
  setTxt('#menu-title', id ? 'Fitur Grump' : 'Your Grump');
  const menuP = document.querySelector('#menu-title + p');
  if (menuP) menuP.textContent = id ? 'Pilih fitur yang ditampilkan Grump. Beranda dan Pengaturan tetap tersedia.' : 'Choose what Grump shows. Home and Settings stay available.';
  setTxt('.addon-preferences h3', id ? 'Fitur pop-up' : 'Popup features');
  for (const [addonKey, copy] of Object.entries(ADDON_COPY)) {
    const [title, desc] = id ? copy.id : copy.en;
    const input = document.querySelector(`[data-addon-feature="${addonKey}"]`);
    const span = input?.closest('.feature-widget')?.querySelector('span');
    if (span) span.innerHTML = `${title}<small>${desc}</small>`;
  }
  for (const [featKey, copy] of Object.entries(FEATURE_COPY)) {
    const [title, desc] = id ? copy.id : copy.en;
    const input = document.querySelector(`[data-setting="${featKey}"]`);
    const span = input?.closest('.feature-widget')?.querySelector('span');
    if (span) span.innerHTML = `${title}<small>${desc}</small>`;
  }
  setTxt('label[for="weather-city"]', id ? 'Kota cuaca' : 'Weather city');
  const weatherP = document.querySelector('#weather-city')?.closest('.row')?.nextElementSibling;
  if (weatherP && weatherP.tagName === 'P') weatherP.textContent = id ? 'Data cuaca: MET Norway. Diperbarui sekitar tiap 10 menit saat aktif.' : 'Weather data: MET Norway. Updated about every 10 minutes when enabled.';
  setTxt('#temper-title', id ? 'Temperamen' : 'Temperament');
  setTxt('label[for="radius-slider"]', id ? 'Radius marah' : 'Angry radius');
  setTxt('label[for="sensitivity-slider"]', id ? 'Sensitivitas' : 'Sensitivity');
  const fsSpan = document.getElementById('fullscreen-switch')?.closest('.toggle-row')?.querySelector('span');
  if (fsSpan) fsSpan.innerHTML = `${id ? 'Sembunyikan saat layar penuh' : 'Hide in fullscreen'}<small>${id ? 'Hanya pada layar yang sedang menjalankan layar penuh.' : 'Only on displays currently running fullscreen.'}</small>`;
  setTxt('label[for="birthday-month"]', id ? 'Mode ulang tahun' : 'Birthday mode');
  const bMonthOpt = document.querySelector('#birthday-month option[value=""]');
  if (bMonthOpt) bMonthOpt.textContent = id ? 'Bulan' : 'Month';
  const bYearOpt = document.querySelector('#birthday-year option[value=""]');
  if (bYearOpt) bYearOpt.textContent = id ? 'Tahun (opsional)' : 'Year (optional)';
  const bDayOpt = document.querySelector('#birthday-day option[value=""]');
  if (bDayOpt) bDayOpt.textContent = id ? 'Hari' : 'Day';
  setTxt('#updates-title', id ? 'Pembaruan Perangkat Lunak' : 'Software Updates');
  const updP = document.querySelector('#updates-title + p');
  if (updP) updP.textContent = id ? 'Pastikan Grump selalu diperbarui dengan fitur, animasi, dan peningkatan terbaru.' : 'Keep Grump up to date with new features, animations, and improvements.';
  const btnUpd = document.getElementById('btn-check-updates');
  if (btnUpd && !updateReady) btnUpd.textContent = id ? 'Cek pembaruan' : 'Check for updates';
  else if (btnUpd && updateReady) btnUpd.textContent = id ? 'Mulai Ulang & Pasang' : 'Restart & Install';
  if (typeof updateStatusSeen !== 'undefined' && !updateStatusSeen && typeof appCurrentVersion !== 'undefined' && appCurrentVersion && updateTxt) {
    updateTxt.textContent = id ? `Versi ${appCurrentVersion}` : `Version ${appCurrentVersion}`;
  }
  setTxt('#btn-quit span', id ? 'Keluar Grump' : 'Exit Grump');
  setTxt('#btn-reset', id ? 'Reset ke awal' : 'Reset to default');
  const map = id ? CHOICE_LABELS_ID : CHOICE_LABELS_EN;
  document.querySelectorAll('.choice').forEach(btn => {
    const key = btn.dataset.key, val = btn.dataset.value;
    const lbl = map[key]?.[val];
    if (lbl) {
      const cap = btn.querySelector('.label');
      if (cap) cap.textContent = lbl;
    }
  });
}

function updateUI() {
  applySettingsLanguage();
  const activeLang = settings.language === 'id' ? 'id' : 'en';
  document.querySelectorAll('[data-lang]').forEach(button => {
    const isSel = button.dataset.lang === activeLang;
    button.setAttribute('aria-pressed', String(isSel));
    button.setAttribute('aria-selected', String(isSel));
    if (isSel) {
      const trigFlag = document.getElementById('lang-trigger-flag');
      const trigLabel = document.getElementById('lang-trigger-label');
      const svgFlag = button.querySelector('.lang-flag-svg');
      const optName = button.querySelector('.lang-opt-name');
      if (trigFlag && svgFlag) trigFlag.innerHTML = svgFlag.outerHTML;
      if (trigLabel && optName) trigLabel.textContent = optName.textContent;
    }
  });
  document.querySelectorAll('.choice').forEach(button => {
    const selected = settings[button.dataset.key] === button.dataset.value &&
      (button.dataset.key !== 'staticExp' || settings.eyeMode === 'static');
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === settings.eyeMode)));
  document.querySelectorAll('[data-dock]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.dock === (settings.dockMode || 'island'))));
  document.getElementById('mode-hint').textContent = settings.eyeMode === 'auto'
    ? (isId() ? 'Mata berganti ekspresi dan bereaksi terhadap kursor. Pilih demo untuk ekspresi tetap.' : 'Eyes change expressions and react to cursor. Pick a demo to use a fixed expression.')
    : (isId() ? 'Ekspresi tetap aktif; kursor dekat tetap memicu reaksi marah.' : 'Fixed expression stays active; cursor proximity still triggers angry reaction.');
  for(const key of ['Width','Height']){const id=key.toLowerCase();document.getElementById(id+'-slider').value=settings['island'+key]||({'Width':128,'Height':32}[key]);document.getElementById(id+'-value').textContent=document.getElementById(id+'-slider').value+' px';}
  const transparency = Math.max(0, Math.min(70, Number(settings.islandTransparency) || 0));
  const transparencySlider = document.getElementById('transparency-slider');
  transparencySlider.value = transparency;
  transparencySlider.style.setProperty('--range-progress', `${(transparency / 70) * 100}%`);
  document.getElementById('transparency-value').textContent = transparency + '%';
  document.getElementById('pos-slider').value = settings.offsetX;
  document.getElementById('pos-badge').textContent = (settings.offsetX > 0 ? '+' : '') + settings.offsetX + ' px';
  updateDisplayCards();
  for(const key of ['menuMusic','menuTimer','menuStash','batteryToast','headsetToast','gameModeQuiet','clipboardEnabled','weatherEnabled']) {
    const el = document.querySelector('[data-setting="'+key+'"]');
    if (el) el.checked = (key === 'weatherEnabled' || key === 'clipboardEnabled') ? settings[key] === true : settings[key] !== false;
  }
  document.getElementById('weather-city').value = settings.weatherCity || 'jakarta';
  document.getElementById('weather-city').disabled = settings.weatherEnabled !== true;
  document.getElementById('radius-slider').value=settings.angryRadius;
  document.getElementById('radius-value').textContent=settings.angryRadius+' px';
  document.getElementById('sensitivity-slider').value=settings.sensitivity;
  document.getElementById('sensitivity-value').textContent=Number(settings.sensitivity).toFixed(1)+'×';
  document.getElementById('fullscreen-switch').checked=settings.hideFullscreen!==false;
  if (typeof syncBirthdayPicker === "function" && birthdayPickerReady) syncBirthdayPicker();
  for (const {host,island} of previews) {
    if (!host.hasAttribute('data-theme-demo')) island.dataset.theme = settings.theme;
  }
}
const langDropdown = document.getElementById('languages');
const langTrigger = document.getElementById('lang-dropdown-trigger');
const langMenu = document.getElementById('lang-dropdown-menu');
function closeLangDropdown() {
  if (!langMenu || !langTrigger) return;
  langMenu.hidden = true;
  langTrigger.setAttribute('aria-expanded', 'false');
  langDropdown?.classList.remove('is-open');
}
if (langTrigger && langMenu) {
  langTrigger.addEventListener('click', e => {
    e.stopPropagation();
    const nextOpen = langMenu.hidden;
    langMenu.hidden = !nextOpen;
    langTrigger.setAttribute('aria-expanded', String(nextOpen));
    langDropdown?.classList.toggle('is-open', nextOpen);
  });
  document.addEventListener('click', e => {
    if (!langDropdown?.contains(e.target)) closeLangDropdown();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLangDropdown();
  });
}
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', e => {
  e.stopPropagation();
  settings.language = button.dataset.lang;
  bridge.saveSettings({language: settings.language});
  closeLangDropdown();
  renderDisplayCards();
  updateUI();
}));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  settings.eyeMode = button.dataset.mode;
  bridge.saveSettings({eyeMode: settings.eyeMode});
  updateUI();
}));
document.querySelectorAll('[data-dock]').forEach(button => button.addEventListener('click', () => {
  settings.dockMode = button.dataset.dock;
  bridge.saveSettings({dockMode: settings.dockMode});
  updateUI();
}));
document.getElementById('pos-slider').addEventListener('input', e => {
  settings.offsetX = Number(e.target.value);
  bridge.setOffset(settings.offsetX);
  updateUI();
});
document.getElementById('btn-center').addEventListener('click', () => {
  settings.offsetX = 0; bridge.setOffset(0); updateUI();
});
let availableDisplays=[];
function selectedDisplayValues(){
  const values=Array.isArray(settings.displayTargets)&&settings.displayTargets.length?settings.displayTargets:['primary'];
  if(!values.includes('primary'))return values;
  const primary=availableDisplays.find(display=>display.primary);
  return primary?[primary.value]:values;
}
function updateDisplayCards(){
  const selected=new Set(selectedDisplayValues());
  document.querySelectorAll('.display-card').forEach(card=>card.setAttribute('aria-pressed',String(selected.has(card.dataset.value))));
  const note=document.getElementById('display-selection-note');
  if(note&&!note.classList.contains('is-warning'))note.textContent=isId()?(selected.size===1?'Grump aktif di 1 monitor.':`Grump aktif di ${selected.size} monitor.`):(selected.size===1?'Grump is active on 1 monitor.':`Grump is active on ${selected.size} monitors.`);
}
function renderDisplayCards(){
  const host=document.getElementById('display-options');
  if(!host)return;
  host.replaceChildren();
  for(const display of availableDisplays){
    const button=document.createElement('button');
    button.type='button';button.className='display-card';button.dataset.value=display.value;
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label',`${display.name}, ${display.width} by ${display.height}${display.primary?', primary monitor':''}`);
    const visual=document.createElement('span');visual.className='display-card-visual';
    const icon=document.createElement('span');icon.className='display-monitor-icon';icon.setAttribute('aria-hidden','true');
    const ring=document.createElement('span');ring.className='display-selection-ring';ring.setAttribute('aria-hidden','true');
    visual.append(icon,ring);
    const copy=document.createElement('span');copy.className='display-card-copy';
    const name=document.createElement('span');name.className='display-card-name';name.textContent=display.name;
    const meta=document.createElement('span');meta.className='display-card-meta';meta.textContent=`${display.width} × ${display.height}${display.primary?(isId()?' · Utama':' · Primary'):''}`;
    copy.append(name,meta);button.append(visual,copy);
    button.addEventListener('click',()=>{
      const selected=new Set(selectedDisplayValues());
      const note=document.getElementById('display-selection-note');
      if(selected.has(display.value)){
        if(selected.size===1){
          if(note){note.textContent=isId()?'Minimal satu monitor harus tetap aktif.':'At least one monitor must stay active.';note.classList.add('is-warning');setTimeout(()=>{note.classList.remove('is-warning');updateDisplayCards()},1600)}
          return;
        }
        selected.delete(display.value);
      }else selected.add(display.value);
      settings.displayTargets=[...selected];
      bridge.saveSettings({displayTargets:settings.displayTargets});
      if(note)note.classList.remove('is-warning');
      updateDisplayCards();
    });
    host.append(button);
  }
  updateDisplayCards();
}
async function loadDisplayOptions() {
  if (!bridge.displayOptions) return;
  try {
    const displays = await bridge.displayOptions();
    availableDisplays=Array.isArray(displays)?displays:[];
    renderDisplayCards();
  } catch {}
}
loadDisplayOptions();
document.getElementById('btn-reset').addEventListener('click', async () => {
  settings = {...settings,...defaults}; bridge.saveSettings(defaults); updateUI();
  for(const id of ['todo','notes','prayer','water']){
    try{const state=await bridge.addonCommand?.('remove',id);if(state)addonSettings=state;}catch{}
  }
  updateAddonSettings();
});
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.settings-tab').forEach(t => {
      const active = t.dataset.tab === target;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${target}`);
    });
  });
});
document.getElementById('btn-quit')?.addEventListener('click', () => {
  bridge.quitApp();
});
document.getElementById('btn-close').addEventListener('click', () => bridge.closeSettingsWindow());
window.addEventListener('keydown', e => { if(e.key === 'Escape') bridge.closeSettingsWindow(); });
function triggerWinRefract() {
  /* Hilangkan semua kilatan cahaya putih sesuai request user */
}
bridge.onSettings(s => { settings = {...settings,...s}; updateUI(); });
document.addEventListener('visibilitychange', () => {
  for (const {host} of previews) {
    if(document.hidden) host.setAttribute('data-paused','');
    else { visibility.unobserve(host); visibility.observe(host); }
  }
});

/* ---------- Software Updates Handler ---------- */
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateTxt = document.getElementById('update-status-txt');
let updateReady = false;
let updateStatusSeen = false;
let appCurrentVersion = '';
bridge.appVersion?.().then(version => { appCurrentVersion = version || ''; if (updateTxt && !updateStatusSeen) updateTxt.textContent = isId() ? `Versi ${version}` : `Version ${version}`; }).catch(() => {});
function showUpdateStatus(data) {
  if (!updateTxt || !data) return;
  if (updateReady && data.status !== 'downloaded') return;
  updateStatusSeen = true;
  if (data.status === 'downloaded') {
    updateReady = true;
    updateTxt.textContent = isId() ? `Pembaruan siap (v${data.version})` : `Update ready (v${data.version})`;
    if (btnCheckUpdates) { btnCheckUpdates.textContent = isId() ? 'Mulai Ulang & Pasang' : 'Restart & Install'; btnCheckUpdates.disabled = false; }
  } else if (data.status === 'downloading') {
    updateTxt.textContent = isId() ? `Mengunduh: ${data.percent}%` : `Downloading: ${data.percent}%`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = true;
  } else if (data.status === 'available') {
    updateTxt.textContent = isId() ? `Mengunduh pembaruan v${data.version}...` : `Downloading update v${data.version}...`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = true;
  } else if (data.status === 'latest') {
    updateTxt.textContent = isId() ? `Sudah versi terbaru (v${data.version})` : `You have the latest version (v${data.version})`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  } else if (data.status === 'idle') {
    updateTxt.textContent = isId() ? `Versi ${data.version}` : `Version ${data.version}`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  } else {
    updateTxt.textContent = data.msg || (data.status === 'error' ? (isId() ? 'Gagal memeriksa pembaruan' : 'Unable to check for updates') : (isId() ? 'Status pembaruan tidak tersedia' : 'Update status unavailable'));
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  }
}
if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', async () => {
    if (updateReady) { bridge.restartAppUpdate?.(); return; }
    if (updateTxt) updateTxt.textContent = isId() ? 'Memeriksa pembaruan...' : 'Checking for updates...';
    btnCheckUpdates.disabled = true;
    try {
      const res = await bridge.checkForUpdates?.();
      showUpdateStatus(res);
    } catch (_) {
      showUpdateStatus({status:'error'});
    }
  });
}

if (bridge.onUpdateStatus) {
  bridge.onUpdateStatus(showUpdateStatus);
}
for(const [key,title,description] of [
  ['menuMusic','Music','Mini-player and synchronized lyrics.'],
  ['menuTimer','Timer','Countdown timer with active island ticker.'],
  ['menuStash','Stash','Drag files into the island to stash temporarily and drag out anytime.'],
  ['batteryToast','Battery notifications','Charging, unplugged, and low battery alerts.'],
  ['headsetToast','Headset notifications','Notice when headphones or earbuds connect.'],
  ['gameModeQuiet','Auto game mode','Automatically hide and silence Grump during games.'],
  ['clipboardEnabled','Clipboard history','Optional. Keeps recent copies in memory on this device. Turning off clears recent history.'],
  ['weatherEnabled','Weather','Show live weather beside Grump’s eyes.']
]) {
  const label=document.createElement('label');label.className='feature-widget';
  const span=document.createElement('span');span.textContent=title;
  const small=document.createElement('small');small.textContent=description;span.append(small);
  const input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.dataset.setting=key;
  input.addEventListener('change',()=>{settings[key]=input.checked;bridge.saveSettings({[key]:input.checked});updateUI()});
  label.append(span,input);document.getElementById('menu-options').append(label);
}
document.getElementById('weather-city').addEventListener('change',e=>{settings.weatherCity=e.target.value;bridge.saveSettings({weatherCity:settings.weatherCity});updateUI()});
for(const [id,key] of [['radius-slider','angryRadius'],['sensitivity-slider','sensitivity']])document.getElementById(id).addEventListener('input',e=>{
  settings[key]=Number(e.target.value);bridge.saveSettings({[key]:settings[key]});updateUI();
});
document.getElementById('fullscreen-switch').addEventListener('change',e=>{settings.hideFullscreen=e.target.checked;bridge.saveSettings({hideFullscreen:settings.hideFullscreen});updateUI()});
var birthdayPickerReady=false;
const birthdayMonth=document.getElementById('birthday-month'),birthdayDay=document.getElementById('birthday-day'),birthdayYear=document.getElementById('birthday-year');
for(let y=new Date().getFullYear();y>=1900;y--)birthdayYear.add(new Option(String(y),String(y)));
for(let m=1;m<=12;m++)birthdayMonth.add(new Option(new Date(2000,m-1,1).toLocaleString('en',{month:'short'}),String(m).padStart(2,'0')));
function fillBirthdayDays(day){
  const month=Number(birthdayMonth.value),year=Number(birthdayYear.value)||2000;
  const count=month?new Date(year,month,0).getDate():0;
  birthdayDay.replaceChildren(new Option(isId()?'Hari':'Day',''));
  for(let d=1;d<=count;d++)birthdayDay.add(new Option(String(d),String(d).padStart(2,'0')));
  birthdayDay.disabled=!month;birthdayDay.value=Number(day)<=count?day:'';
}
function syncBirthdayPicker(){
  const parts=(settings.birthday||'').split('-'),full=parts.length===3;
  birthdayYear.value=full?parts[0]:'';birthdayMonth.value=parts[full?1:0]||'';fillBirthdayDays(parts[full?2:1]||'');
}
function saveBirthday(){
  fillBirthdayDays(birthdayDay.value);
  const month=birthdayMonth.value,day=birthdayDay.value,year=birthdayYear.value;
  const future=year&&month&&day&&new Date(Number(year),Number(month)-1,Number(day))>new Date();
  birthdayYear.setCustomValidity(future?'Choose a date that has already happened.':'');
  if(future){birthdayYear.reportValidity();return;}
  if(!month||!day)return;
  settings.birthday=(year?year+'-':'')+month+'-'+day;
  bridge.saveSettings({birthday:settings.birthday});
}
birthdayPickerReady=true;syncBirthdayPicker();
for(const input of [birthdayMonth,birthdayDay,birthdayYear])input.addEventListener('change',saveBirthday);
document.getElementById('birthday-clear').addEventListener('click',()=>{settings.birthday='';birthdayYear.setCustomValidity('');bridge.saveSettings({birthday:''});syncBirthdayPicker();});

updateUI();

for(const key of ['Width','Height'])document.getElementById(key.toLowerCase()+'-slider').addEventListener('input',e=>{settings['island'+key]=Number(e.target.value);bridge.saveSettings({['island'+key]:Number(e.target.value)});updateUI();});
document.getElementById('transparency-slider').addEventListener('input', e => {
  settings.islandTransparency = Number(e.target.value);
  bridge.saveSettings({islandTransparency: settings.islandTransparency});
  updateUI();
});
