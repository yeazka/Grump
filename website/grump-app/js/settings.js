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
const defaults = { offsetX: 0, theme: 'default', eyeMode: 'auto', staticExp: 'normal', angryVariant: 'gold-matrix', dockMode: 'island', islandWidth:128, islandHeight:32, islandTransparency:0, weatherEnabled:false, weatherCity:'jakarta' };
let settings = { ...defaults, angryRadius:145, sensitivity:1, quiet:false, menuMusic:true, menuTimer:true, menuStash:true, menuQuiet:true, batteryToast:true, headsetToast:true, hideFullscreen:true, smartQuietPrompt:true, gameModeQuiet:true, dockMode:'island' };
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
    for (let side = 0; side < 2; side++) for (let n = 0; n < 8; n++) {
      const spark = document.createElement('b');
      const angle = (-150 + n * 43) * Math.PI / 180;
      const distance = 12 + (n % 3) * 4;
      spark.style.setProperty('--origin-x', side ? '72%' : '28%');
      spark.style.setProperty('--burst-x', `${Math.round(Math.cos(angle) * distance)}px`);
      spark.style.setProperty('--burst-y', `${Math.round(Math.sin(angle) * distance * .65)}px`);
      spark.style.animationDelay = `${-(side * .7 + n * .018)}s`;
      burst.append(spark);
    }
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
  for(const key of ['menuMusic','menuTimer','menuStash','batteryToast','headsetToast','smartQuietPrompt','gameModeQuiet','weatherEnabled']) {
    const el = document.querySelector('[data-setting="'+key+'"]');
    if (el) el.checked = key === 'weatherEnabled' ? settings[key] === true : settings[key] !== false;
  }
  document.getElementById('weather-city').value = settings.weatherCity || 'jakarta';
  document.getElementById('weather-city').disabled = settings.weatherEnabled !== true;
  document.getElementById('radius-slider').value=settings.angryRadius;
  document.getElementById('radius-value').textContent=settings.angryRadius+' px';
  document.getElementById('sensitivity-slider').value=settings.sensitivity;
  document.getElementById('sensitivity-value').textContent=Number(settings.sensitivity).toFixed(1)+'×';
  document.getElementById('quiet-switch').checked=!!settings.quiet;
  document.getElementById('fullscreen-switch').checked=settings.hideFullscreen!==false;
  document.getElementById('cursor-hug-switch').checked=settings.cursorHug!==false;
  document.getElementById('birthday-input').value=settings.birthday?'2000-'+settings.birthday:'';
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
document.getElementById('btn-reset').addEventListener('click', () => {
  settings = {...settings,...defaults}; bridge.saveSettings(defaults); updateUI();
});
document.getElementById('btn-test-prompt')?.addEventListener('click', () => bridge.testQuietPrompt?.());
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
if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', async () => {
    if (updateTxt) updateTxt.textContent = 'Checking for updates...';
    btnCheckUpdates.disabled = true;
    try {
      const res = await bridge.checkForUpdates?.();
      if (res?.status === 'downloaded') {
        if (updateTxt) updateTxt.textContent = `Update ready! (v${res.version})`;
        btnCheckUpdates.textContent = 'Restart & Install';
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.onclick = () => bridge.restartAppUpdate?.();
      } else if (res?.status === 'available') {
        if (updateTxt) updateTxt.textContent = `Downloading update v${res.version}...`;
      } else if (res?.status === 'store') {
        if (updateTxt) updateTxt.textContent = 'Managed by Microsoft Store';
        btnCheckUpdates.disabled = false;
      } else if (res?.status === 'steam') {
        if (updateTxt) updateTxt.textContent = 'Managed by Steam';
        btnCheckUpdates.disabled = false;
      } else {
        if (updateTxt) updateTxt.textContent = 'You have the latest version (v1.0.0)';
        setTimeout(() => { btnCheckUpdates.disabled = false; }, 2000);
      }
    } catch (_) {
      if (updateTxt) updateTxt.textContent = 'Unable to check for updates';
      btnCheckUpdates.disabled = false;
    }
  });
}

if (bridge.onUpdateStatus) {
  bridge.onUpdateStatus((data) => {
    if (!updateTxt) return;
    if (data.status === 'downloading') {
      updateTxt.textContent = `Downloading: ${data.percent}%`;
    } else if (data.status === 'downloaded') {
      updateTxt.textContent = `Update ready (v${data.version})`;
      if (btnCheckUpdates) {
        btnCheckUpdates.textContent = 'Restart & Install';
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.onclick = () => bridge.restartAppUpdate?.();
      }
    } else if (data.status === 'error') {
      updateTxt.textContent = 'Update check failed';
      if (btnCheckUpdates) btnCheckUpdates.disabled = false;
    }
  });
}
for(const [key,title,description] of [
  ['menuMusic','Music','Mini-player and synchronized lyrics.'],
  ['menuTimer','Timer','Countdown timer with active island ticker.'],
  ['menuStash','Stash','Drag files into the island to stash temporarily and drag out anytime.'],
  ['batteryToast','Battery notifications','Charging, unplugged, and low battery alerts.'],
  ['headsetToast','Headset notifications','Notice when headphones or earbuds connect.'],
  ['smartQuietPrompt','Smart quiet suggestion','Suggest quiet mode during deep work or movies.'],
  ['gameModeQuiet','Auto game mode','Automatically hide and silence Grump during games.'],
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
document.getElementById('quiet-switch').addEventListener('change',e=>{settings.quiet=e.target.checked;bridge.saveSettings({quiet:settings.quiet,quietUntil:0});updateUI()});
document.getElementById('fullscreen-switch').addEventListener('change',e=>{settings.hideFullscreen=e.target.checked;bridge.saveSettings({hideFullscreen:settings.hideFullscreen});updateUI()});
document.getElementById('cursor-hug-switch').addEventListener('change',e=>{settings.cursorHug=e.target.checked;bridge.saveSettings({cursorHug:settings.cursorHug});updateUI()});
document.getElementById('birthday-input').addEventListener('change',e=>{settings.birthday=e.target.value?e.target.value.slice(5):'';bridge.saveSettings({birthday:settings.birthday});updateUI()});
updateUI();

for(const key of ['Width','Height'])document.getElementById(key.toLowerCase()+'-slider').addEventListener('input',e=>{settings['island'+key]=Number(e.target.value);bridge.saveSettings({['island'+key]:Number(e.target.value)});updateUI();});
document.getElementById('transparency-slider').addEventListener('input', e => {
  settings.islandTransparency = Number(e.target.value);
  bridge.saveSettings({islandTransparency: settings.islandTransparency});
  updateUI();
});
