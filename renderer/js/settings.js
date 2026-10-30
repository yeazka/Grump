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
const defaults = { offsetX: 0, theme: 'default', eyeMode: 'auto', staticExp: 'normal', angryVariant: 'gold-matrix', dockMode: 'island', islandWidth:128, islandHeight:32, islandTransparency:0, weatherEnabled:true, weatherCity:'jakarta' };
let settings = { ...defaults, angryRadius:145, sensitivity:1, quiet:false, menuMusic:true, menuTimer:true, menuStash:true, menuQuiet:false, batteryToast:true, headsetToast:true, hideFullscreen:true, smartQuietPrompt:false, gameModeQuiet:true, dockMode:'island' };
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
  shadow.innerHTML = `<link rel="stylesheet" href="style.css"><style>
    :host { display:block; position:relative; overflow:hidden; }
    #island { position:absolute; top:50%; left:50%; width:124px; height:36px; border-radius:18px; transform:translate(-50%,-50%) scale(.66); transform-origin:center; }
    :host([data-theme-demo]) { background:#141414; margin-bottom:10px; }
    :host([data-paused]) *, :host([data-paused]) *::before, :host([data-paused]) *::after { animation-play-state:paused !important; }
    @media(prefers-reduced-motion:reduce) { *, *::before, *::after { animation:none !important; transition:none !important; } }
  </style><div id="island" data-key="idle"><section class="view on" id="v-idle" data-mode="eyes"><div id="eyes"><i><span class="cyber-grid"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span></i><i><span class="cyber-grid"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span></i></div></section></div>`;
  const island = shadow.querySelector('#island');
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
choices('angry', 'angryVariant', [['gold-matrix','Grump Gold'],['classic','Classic Red'],['lightning','Lightning'],['flame','Flame'],['ember','Orange Ember'],['pink','Sakura Pink'],['rage','Rage'],['laser','Laser Beam'],['berserk','Berserk Void'],['cyber-violet','Cyber Violet'],['cyber-amber','Cyber Amber']], variant => ({exp:'angry',variant}));
function updateUI() {
  document.querySelectorAll('.choice').forEach(button => {
    const selected = settings[button.dataset.key] === button.dataset.value &&
      (button.dataset.key !== 'staticExp' || settings.eyeMode === 'static');
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === settings.eyeMode)));
  document.querySelectorAll('[data-dock]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.dock === (settings.dockMode || 'island'))));
  document.getElementById('mode-hint').textContent = settings.eyeMode === 'auto'
    ? 'Eyes change expressions and react to cursor. Pick a demo to use a fixed expression.'
    : 'Fixed expression stays active; cursor proximity still triggers angry reaction.';
  for(const key of ['Width','Height']){const id=key.toLowerCase();document.getElementById(id+'-slider').value=settings['island'+key]||({'Width':128,'Height':32}[key]);document.getElementById(id+'-value').textContent=document.getElementById(id+'-slider').value+' px';}
  const transparency = Math.max(0, Math.min(70, Number(settings.islandTransparency) || 0));
  document.getElementById('transparency-slider').value = transparency;
  document.getElementById('transparency-value').textContent = transparency + '%';
  document.getElementById('pos-slider').value = settings.offsetX;
  document.getElementById('pos-badge').textContent = (settings.offsetX > 0 ? '+' : '') + settings.offsetX + ' px';
  for(const key of ['menuMusic','menuTimer','menuStash','batteryToast','headsetToast','gameModeQuiet','weatherEnabled']) {
    const el = document.querySelector('[data-setting="'+key+'"]');
    if (el) el.checked = key === 'weatherEnabled' ? settings[key] === true : settings[key] !== false;
  }
  document.getElementById('weather-city').value = settings.weatherCity || 'jakarta';
  document.getElementById('weather-city').disabled = settings.weatherEnabled !== true;
  document.getElementById('radius-slider').value=settings.angryRadius;
  document.getElementById('radius-value').textContent=settings.angryRadius+' px';
  document.getElementById('sensitivity-slider').value=settings.sensitivity;
  document.getElementById('sensitivity-value').textContent=Number(settings.sensitivity).toFixed(1)+'×';
  document.getElementById('fullscreen-switch').checked=settings.hideFullscreen!==false;
  document.getElementById('cursor-hug-switch').checked=settings.cursorHug!==false;
  if (typeof syncBirthdayPicker === "function" && birthdayPickerReady) syncBirthdayPicker();
  for (const {host,island} of previews) {
    if (!host.hasAttribute('data-theme-demo')) island.dataset.theme = settings.theme;
  }
}
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
bridge.appVersion?.().then(version => { if (updateTxt && !updateStatusSeen) updateTxt.textContent = `Version ${version}`; }).catch(() => {});
function showUpdateStatus(data) {
  if (!updateTxt || !data) return;
  if (updateReady && data.status !== 'downloaded') return;
  updateStatusSeen = true;
  if (data.status === 'downloaded') {
    updateReady = true;
    updateTxt.textContent = `Update ready (v${data.version})`;
    if (btnCheckUpdates) { btnCheckUpdates.textContent = 'Restart & Install'; btnCheckUpdates.disabled = false; }
  } else if (data.status === 'downloading') {
    updateTxt.textContent = `Downloading: ${data.percent}%`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = true;
  } else if (data.status === 'available') {
    updateTxt.textContent = `Downloading update v${data.version}...`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = true;
  } else if (data.status === 'latest') {
    updateTxt.textContent = `You have the latest version (v${data.version})`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  } else if (data.status === 'idle') {
    updateTxt.textContent = `Version ${data.version}`;
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  } else {
    updateTxt.textContent = data.msg || (data.status === 'error' ? 'Unable to check for updates' : 'Update status unavailable');
    if (btnCheckUpdates) btnCheckUpdates.disabled = false;
  }
}
if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', async () => {
    if (updateReady) { bridge.restartAppUpdate?.(); return; }
    if (updateTxt) updateTxt.textContent = 'Checking for updates...';
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
  const label=document.createElement('label');label.className='toggle-row';
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
document.getElementById('cursor-hug-switch').addEventListener('change',e=>{settings.cursorHug=e.target.checked;bridge.saveSettings({cursorHug:settings.cursorHug});updateUI()});
var birthdayPickerReady=false;
const birthdayMonth=document.getElementById('birthday-month'),birthdayDay=document.getElementById('birthday-day'),birthdayYear=document.getElementById('birthday-year');
for(let y=new Date().getFullYear();y>=1900;y--)birthdayYear.add(new Option(String(y),String(y)));
for(let m=1;m<=12;m++)birthdayMonth.add(new Option(new Date(2000,m-1,1).toLocaleString('en',{month:'short'}),String(m).padStart(2,'0')));
function fillBirthdayDays(day){
  const month=Number(birthdayMonth.value),year=Number(birthdayYear.value)||2000;
  const count=month?new Date(year,month,0).getDate():0;
  birthdayDay.replaceChildren(new Option('Day',''));
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
