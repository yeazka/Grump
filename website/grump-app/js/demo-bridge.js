'use strict';
// Bridges the Grump renderer to simulated OS events and parent preview controls.
(function () {
  const cbs = {
    settings: [],
    cursor: [],
    media: [],
    timer: [],
    weather: [],
    sysState: [],
    headset: [],
    testCharge: [],
    testHeadset: [],
    testAngry: [],
    eyeExp: [],
    tuckApp: [],
    codex: [],
    antigravity: [],
    claude: [],
    chatgpt: [],
    fgApp: [],
    drop: [],
    connectivity: [], addon: [], addonAlert: [], productivity: [], productivityEvent: [], capsLock: [], cpuLoad: []
  };

  const on = (list) => (fn) => { if (typeof fn === 'function') list.push(fn); };
  const emit = (list, ...args) => { for (const fn of list) { try { fn(...args); } catch (e) { console.error(e); } } };

  const INITIAL_STASH = [
    { id: 'st1', path: 'C:/Projects/grump-v1.0-setup.exe', name: 'grump-v1.0-setup.exe', size: 24850120 },
    { id: 'st2', path: 'C:/Designs/notch-concept.fig', name: 'notch-concept.fig', size: 8421300 }
  ];

  try {
    localStorage.setItem('island.stash', JSON.stringify(INITIAL_STASH));
  } catch (_) {}

  function makeAlbumArt() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 160, 160);
    gr.addColorStop(0, '#0f172a');
    gr.addColorStop(0.45, '#1e3a8a');
    gr.addColorStop(1, '#10b981');
    g.fillStyle = gr;
    g.fillRect(0, 0, 160, 160);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.arc(110, 50, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 18px sans-serif';
    g.fillText('w2e', 20, 136);
    return c.toDataURL('image/png').split(',')[1];
  }

  const ALBUM_ART = makeAlbumArt();

  const TRACKS = [
    {
      title: 'seasons',
      artist: 'wave to earth',
      dur: 256,
      app: 'Spotify.exe',
      lyrics: [
        '[00:00.00] Stay close',
        '[00:03.20] Let the city lights guide us home tonight',
        '[00:07.00] We are glowing',
        '[00:10.20] Every little moment feels brighter when we are together',
        '[00:14.00] Just you and me'
      ].join('\n')
    },
    {
      title: ' Midnight City',
      artist: 'M83',
      dur: 243,
      app: 'Spotify.exe',
      lyrics: [
        '[00:00.00] After dark',
        '[00:04.00] The lights are dancing across the city',
        '[00:08.00] We keep moving',
        '[00:12.00] Take the long way home and watch the stars come out',
        '[00:16.00] After dark'
      ].join('\n')
    }
  ];

  let trackIdx = 0;
  let mediaState = {
    active: false,
    title: TRACKS[0].title,
    artist: TRACKS[0].artist,
    status: 'Paused',
    pos: 8,
    dur: TRACKS[0].dur,
    mime: 'image/png',
    thumb: ALBUM_ART,
    app: TRACKS[0].app
  };

  const demoSettings = {
    mascot: true,
    minimal: false,
    autoTuck: true,
    weatherEnabled: true,
    dockMode: 'anchored',
    theme: 'default',
    eyeMode: 'auto',
    staticExp: 'normal',
    angryVariant: 'gold-matrix',
    leftEyeSize: 1,
    rightEyeSize: 1,
    quiet: false
  };
  const demoAddons = {
    selected:['todo','notes','prayer','water'],city:'Yogyakarta',locationMode:'auto',locationSource:'IPWho',
    waterMinutes:45,waterEnabled:true,waterNextAt:Date.now()+31*60000,prayerEnabled:true,prayerStatus:'ready',
    prayer:{date:new Date().toISOString().slice(0,10),city:'Yogyakarta',timezone:'Asia/Jakarta',times:{Fajr:'04:07',Dhuhr:'11:42',Asr:'14:52',Maghrib:'17:47',Isha:'18:59'},nextFajr:'04:07'}
  };
  const demoProductivity = {tasks:[{id:'demo-task-1',text:'Plan the next big idea',done:false},{id:'demo-task-2',text:'Take a well-earned break',done:true}],notes:[{id:'demo-note-1',text:'Little ideas\nMake space for the good ones.',at:Date.now()}]};

  let timerState = {
    status: 'idle',
    duration: 900000,
    remaining: 900000,
    endAt: 0
  };
  let timerTickId = null;

  try {
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.style.background = 'transparent';
  } catch (_) {}

  function syncTimer() {
    if (timerState.status === 'running') {
      const rem = Math.max(0, timerState.endAt - Date.now());
      timerState.remaining = rem;
      if (rem <= 0) {
        timerState.status = 'done';
        timerState.remaining = 0;
        clearInterval(timerTickId);
        timerTickId = null;
      }
    }
    emit(cbs.timer, {
      status: timerState.status,
      duration: timerState.duration,
      remaining: timerState.remaining,
      endAt: timerState.endAt
    });
  }

  setInterval(() => {
    if (mediaState.active && mediaState.status === 'Playing') {
      mediaState.pos = (mediaState.pos + 0.5) % 17;
      emit(cbs.media, { ...mediaState });
    }
  }, 500);

  const wifiState = {
    on: true,
    items: [
      { id: 'w1', name: 'Grump Studio 5G', connected: true, secured: true, signal: 96 },
      { id: 'w2', name: 'Home Fiber_Plus', connected: false, secured: true, signal: 78 },
      { id: 'w3', name: 'CoffeeShop_Free', connected: false, secured: false, signal: 54 }
    ]
  };
  const btState = {
    on: true,
    items: [
      { id: 'b1', name: "Azka's AirPods Pro", connected: true, paired: true, category: 'audio', battery: 92 },
      { id: 'b2', name: 'Keychron K2 Pro', connected: true, paired: true, category: 'keyboard', battery: 80 },
      { id: 'b3', name: 'Logitech G Pro X', connected: false, paired: true, category: 'mouse', battery: 65 }
    ]
  };

  window.dynIsland = {
    mock: true,
    onPointer: () => {},
    onMedia: on(cbs.media),
    mediaCmd(cmd, val) {
      if (cmd === 'toggle') {
        mediaState.active = true;
        mediaState.status = mediaState.status === 'Playing' ? 'Paused' : 'Playing';
      } else if (cmd === 'next') {
        trackIdx = (trackIdx + 1) % TRACKS.length;
        const tr = TRACKS[trackIdx];
        mediaState.title = tr.title;
        mediaState.artist = tr.artist;
        mediaState.dur = tr.dur;
        mediaState.pos = 0;
        mediaState.status = 'Playing';
      } else if (cmd === 'prev') {
        trackIdx = (trackIdx - 1 + TRACKS.length) % TRACKS.length;
        const tr = TRACKS[trackIdx];
        mediaState.title = tr.title;
        mediaState.artist = tr.artist;
        mediaState.dur = tr.dur;
        mediaState.pos = 0;
        mediaState.status = 'Playing';
      } else if (cmd === 'seek') {
        mediaState.pos = Number(val) || 0;
      }
      emit(cbs.media, { ...mediaState });
    },
    getLyrics() {
      const tr = TRACKS[trackIdx] || TRACKS[0];
      return Promise.resolve(tr.lyrics);
    },
    onSysState: on(cbs.sysState),
    sysCmd(cmd, val) {
      if (cmd === 'vol') emit(cbs.sysState, { volume: val });
      if (cmd === 'bright') emit(cbs.sysState, { brightness: val });
    },
    onSettings: on(cbs.settings),
    onAddonState: on(cbs.addon),
    onAddonAlert: on(cbs.addonAlert),
    onProductivityState: on(cbs.productivity),
    onProductivityEvent: on(cbs.productivityEvent),
    addonState: () => Promise.resolve({...demoAddons}),
    async addonCommand(command,value) {
      if(command==='select'&&!demoAddons.selected.includes(value))demoAddons.selected.push(value);
      if(command==='remove')demoAddons.selected=demoAddons.selected.filter(id=>id!==value);
      if(command==='water-enabled')demoAddons.waterEnabled=!!value;
      if(command==='water-interval')demoAddons.waterMinutes=Number(value)||45;
      emit(cbs.addon,{...demoAddons});
      return {...demoAddons};
    },
    productivityState: () => Promise.resolve(demoProductivity),
    async productivitySave(type,payload) {
      const id = () => 'demo-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
      if(type==='task' && payload?.text)demoProductivity.tasks.unshift({id:id(),text:payload.text,done:false});
      else if(type==='task-toggle'){const task=demoProductivity.tasks.find(x=>x.id===payload);if(!task)return false;task.done=!task.done;}
      else if(type==='delete-task')demoProductivity.tasks=demoProductivity.tasks.filter(x=>x.id!==payload);
      else if(type==='clear-tasks')demoProductivity.tasks=[];
      else if(type==='note' && payload?.text)demoProductivity.notes.unshift({id:id(),text:payload.text,at:Date.now()});
      else if(type==='update-note'){const note=demoProductivity.notes.find(x=>x.id===payload?.id);if(!note)return false;note.text=payload.text;note.at=Date.now();}
      else if(type==='delete-note')demoProductivity.notes=demoProductivity.notes.filter(x=>x.id!==payload);
      else return false;
      emit(cbs.productivity,demoProductivity);return true;
    },
    setSetting(k, v) {
      demoSettings[k] = v;
      emit(cbs.settings, demoSettings);
    },
    saveSettings(patch) {
      if (patch && typeof patch === 'object') {
        Object.assign(demoSettings, patch);
        emit(cbs.settings, demoSettings);
      }
    },
    openSettingsWindow() {},
    onTimer: on(cbs.timer),
    timerCommand(cmdOrObj, ms) {
      const action = typeof cmdOrObj === 'object' ? cmdOrObj.action : cmdOrObj;
      const sec = typeof cmdOrObj === 'object' ? Number(cmdOrObj.seconds) : (ms ? Math.round(ms / 1000) : 0);
      if (action === 'set') {
        const dur = Math.max(60, sec || 900) * 1000;
        timerState.status = 'idle';
        timerState.duration = dur;
        timerState.remaining = dur;
        timerState.endAt = 0;
        clearInterval(timerTickId);
        timerTickId = null;
      } else if (action === 'start') {
        const dur = (sec ? sec * 1000 : timerState.duration) || 900000;
        timerState.duration = dur;
        timerState.remaining = dur;
        timerState.endAt = Date.now() + dur;
        timerState.status = 'running';
        if (!timerTickId) timerTickId = setInterval(syncTimer, 250);
      } else if (action === 'pause') {
        if (timerState.status === 'running') {
          timerState.remaining = Math.max(0, timerState.endAt - Date.now());
          timerState.status = 'paused';
        }
      } else if (action === 'resume') {
        timerState.endAt = Date.now() + (timerState.remaining || timerState.duration || 900000);
        timerState.status = 'running';
        if (!timerTickId) timerTickId = setInterval(syncTimer, 250);
      } else if (action === 'reset') {
        timerState.status = 'idle';
        timerState.remaining = timerState.duration || 900000;
        timerState.endAt = 0;
        clearInterval(timerTickId);
        timerTickId = null;
      }
      syncTimer();
    },
    onWeather: on(cbs.weather),
    onCursor: on(cbs.cursor),
    onTuckApp: on(cbs.tuckApp),
    onHeadset: on(cbs.headset),
    onTestCharge: on(cbs.testCharge),
    onTestHeadset: on(cbs.testHeadset),
    onTestAngry: on(cbs.testAngry),
    onEyeExp: on(cbs.eyeExp),
    onCodexActivity: on(cbs.codex),
    onAntigravityActivity: on(cbs.antigravity),
    onClaudeActivity: on(cbs.claude),
    onChatgptActivity: on(cbs.chatgpt),
    onFgApp: on(cbs.fgApp),
    onDrop: on(cbs.drop),
    onConnectivity: on(cbs.connectivity),
    onCapsLock: on(cbs.capsLock),
    onCpuLoad: on(cbs.cpuLoad),
    onCollapse() {}, onExpandHome() {}, onGameMode() {}, onResetDodge() {},
    setExpanded() {}, lyricViewport() {}, setVolume(v){emit(cbs.sysState,{volume:v})}, setBrightness(v){emit(cbs.sysState,{brightness:v})},
    openConnectivity(kind){return this.connectionCommand({kind,action:'list'})},
    connectionCommand(req) {
      const state = req.kind === 'wifi' ? wifiState : btState;
      if (req.action === 'power') state.on = !!req.on;
      else if (req.action === 'disconnect') state.items.forEach(i => { if (i.id === req.id) i.connected = false; });
      else if (req.action === 'connect' || req.action === 'pair') {
        state.items.forEach(i => { if (i.id === req.id) { i.connected = true; i.paired = true; } else if (req.kind === 'wifi') i.connected = false; });
      }
      return Promise.resolve({ ok: true, on: state.on, items: state.items });
    },
    fileInfo(p) {
      const name = String(p).split(/[\\/]/).pop() || 'file.dat';
      const sizes = {
        'grump-v1.0-setup.exe': 24850120,
        'notch-concept.fig': 8421300,
        'seasons-master.wav': 41200400
      };
      return Promise.resolve({ name, size: sizes[name] || 4210400, isDir: false });
    },
    rect() {},
    startDrag() {},
    setFocusable() {},
    setMouseActive() {},
    setDragActive() {},
    setDodge() {},
    forceShow() {},
    quit() {}
  };

  function bootDemoState() {
    emit(cbs.settings, demoSettings);
    emit(cbs.weather, { available: true, temperature: 29, city: 'Jakarta', updatedAt: Date.now() });
    emit(cbs.sysState, { volume: 72, brightness: 85 });
    emit(cbs.connectivity, {
      wifi: { on: true, names: ['Grump Studio 5G'] },
      bluetooth: { on: true, names: ["Azka's AirPods Pro"] }
    });
    syncTimer();
  }
  setTimeout(bootDemoState, 30);
  setTimeout(bootDemoState, 150);

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(bootDemoState, 60);

    document.addEventListener('pointerdown', (e) => {
      const isl = window.__island;
      const islandEl = document.getElementById('island');
      if (isl && islandEl && !islandEl.contains(e.target) && isl.S.expanded) {
        isl.S.focusLock = false;
        isl.collapse();
      }
    });
  });

  // Translate iframe pointer coordinates to the 440px overlay coordinate system expected by core.js.
  function handlePointer(clientX, clientY) {
    const cx = window.innerWidth / 2;
    const cy = 18;
    const dx = clientX - cx;
    const dy = clientY - cy;
    emit(cbs.cursor, dx, dy, dx + 220, clientY);
  }

  window.addEventListener('mousemove', (e) => {
    handlePointer(e.clientX, e.clientY);
  });

  window.addEventListener('mouseleave', () => {
    emit(cbs.cursor, 0, 350, 220, 368);
  });

  function clearDemoActivities() {
    const isl = window.__island;
    if (!isl) return;
    const islandEl = document.getElementById('island');
    if (islandEl) islandEl.classList.remove('mouth-open');
    isl.S.dropHot = false;
    isl.S.dragLock = false;
    isl.S.focusLock = false;
    isl.S.tuckApp = false;
    isl.S.peekaboo = false;
    isl.S.charge = null;
    isl.S.headset = null;
    isl.S.notice = null;
    isl.S.prompt = null;
    isl.S.idleInfoActive = false;
    isl.S.inAngryRadius = false;
    emit(cbs.antigravity, { active: false, status: '', detail: '' });
    emit(cbs.fgApp, { app: 'explorer', title: 'Desktop', isGame: false });
  }

  function stopMusic() {
    mediaState.active = false;
    mediaState.status = 'Paused';
    emit(cbs.media, { active: false });
  }

  function startMusic(initialPos = 0) {
    const tr = TRACKS[trackIdx] || TRACKS[0];
    mediaState = {
      active: true,
      title: tr.title,
      artist: tr.artist,
      status: 'Playing',
      pos: initialPos,
      dur: tr.dur,
      mime: 'image/png',
      thumb: ALBUM_ART,
      app: tr.app
    };
    emit(cbs.media, { ...mediaState });
  }

  function applyDemoMessage(d) {
    if (!d || d.type !== 'grump-demo') return;
    const isl = window.__island;
    const islandEl = document.getElementById('island');
    if (!isl) return;

    if (d.action === 'scale') {
      const s = Math.max(.4,Math.min(2,Number(d.scale)||1));
      document.body.style.zoom = Math.abs(s - 1) > 0.02 ? String(s) : '';
      return;
    }

    if (d.action === 'dock') {
      demoSettings.dockMode = d.dockMode === 'island' ? 'island' : 'anchored';
      emit(cbs.settings, demoSettings);
      isl.layout();
      return;
    }

    if (d.action === 'ai-phase') {
      emit(cbs.fgApp, { app: 'codex', title: 'Grump', isGame: false });
      emit(cbs.codex, { active: true, status: d.status, detail: d.detail });
      return;
    }

    if (d.action === 'eyeshape') {
      clearDemoActivities();
      stopMusic();
      isl.collapse();
      demoSettings.eyeMode = 'static';
      demoSettings.staticExp = d.shape || 'normal';
      emit(cbs.settings, demoSettings);
      const el = document.getElementById('v-idle');
      if (el) {
        el.dataset.exp = d.shape || 'normal';
        el.classList.toggle('sleep', d.shape === 'sleep');
      }
      if (islandEl) islandEl.dataset.angry = '0';
      isl.layout();
      return;
    }

    if (d.action === 'cursor') {
      handlePointer(d.x, d.y);
      return;
    }

    if (d.action === 'stash-feed-start') {
      isl.S.focusLock = true;
      isl.S.dragLock = true;
      isl.S.dropHot = true;
      if (islandEl) islandEl.classList.add('mouth-open');
      isl.go('stash');
      return;
    }

    if (d.action === 'stash-feed-drop') {
      if (islandEl) islandEl.classList.remove('mouth-open');
      isl.S.dropHot = false;
      isl.S.dragLock = false;
      isl.S.focusLock = true;
      if (d.path) emit(cbs.drop, [d.path]);
      return;
    }

    if (d.action === 'stash-reset') {
      isl.S.shelf = INITIAL_STASH.map(item => ({ ...item }));
      try { localStorage.setItem('island.stash', JSON.stringify(isl.S.shelf)); } catch (_) {}
      isl.S.focusLock = true;
      isl.go('stash');
      return;
    }

    if (d.action === 'variant') {
      demoSettings.angryVariant = d.variant;
      if (d.variant === 'lol') {
        demoSettings.eyeMode = 'static';
        demoSettings.staticExp = 'lol';
      } else {
        demoSettings.eyeMode = 'auto';
        demoSettings.staticExp = 'normal';
      }
      emit(cbs.settings, demoSettings);
      clearDemoActivities();
      stopMusic();
      isl.collapse();
      if (d.variant !== 'lol') {
        isl.S.inAngryRadius = true;
        const el = document.getElementById('v-idle');
        if (el) el.dataset.exp = 'angry';
        if (islandEl) islandEl.dataset.angry = '1';
        if (d.variant === 'laser') {
          handlePointer(window.innerWidth / 2 + 80, 180);
        } else {
          handlePointer(window.innerWidth / 2 + 28, 34);
        }
      }
      isl.layout();
      return;
    }

    const mode = d.mode;
    clearDemoActivities();

    switch (mode) {
      case 'resting':
        stopMusic();
        demoSettings.eyeMode = 'auto';
        emit(cbs.settings, demoSettings);
        isl.collapse();
        isl.layout();
        break;

      case 'weather':
        stopMusic();
        demoSettings.weatherEnabled = true;
        emit(cbs.settings, demoSettings);
        emit(cbs.weather, { available: true, temperature: 29, city: 'Jakarta', updatedAt: Date.now() });
        isl.collapse();
        isl.S.idleInfoActive = true;
        const wEl = document.getElementById('idle-weather');
        if (wEl) wEl.style.display = '';
        const wtEl = document.getElementById('idle-weather-text');
        if (wtEl) wtEl.textContent = '29°C';
        const d = new Date();
        const ttEl = document.getElementById('idle-time-text');
        if (ttEl) ttEl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        isl.layout();
        break;

      case 'closed':
        stopMusic();
        isl.collapse();
        isl.S.tuckApp = true;
        isl.S.peekaboo = true;
        isl.layout();
        setTimeout(() => {
          if (isl.S.tuckApp) {
            isl.S.peekaboo = false;
            isl.layout();
          }
        }, 1800);
        break;

      case 'compact-music':
        isl.S.focusLock = false;
        isl.S.dragLock = false;
        isl.S.expanded = false;
        isl.S.peek = null;
        isl.S.tuckApp = false;
        isl.S.peekaboo = false;
        isl.S.workActivity = null;
        startMusic(0);
        isl.collapse();
        isl.layout();
        break;

      case 'music':
        startMusic();
        isl.S.focusLock = true;
        isl.go('music');
        break;

      case 'lyrics':
        startMusic();
        isl.S.focusLock = true;
        isl.go('lyrics');
        break;

      case 'timer':
        stopMusic();
        isl.S.focusLock = true;
        isl.go('timer');
        break;

      case 'todo':
      case 'notes':
      case 'prayer':
      case 'water':
        stopMusic();
        isl.S.focusLock = true;
        isl.S.expanded = false;
        isl.S.view = mode;
        isl.go(mode);
        break;

      case 'prayer-alert':
        stopMusic();
        document.querySelectorAll('.view.mini-popup').forEach(view=>view.classList.remove('on','sliding'));
        isl.S.miniPopup = null;
        isl.S.ring = null;
        isl.S.focusLock = false;
        isl.S.expanded = false;
        isl.collapse();
        emit(cbs.addonAlert,{kind:'prayer',title:'Waktu Maghrib',body:'Yogyakarta · 17:47'});
        break;

      case 'water-alert':
        stopMusic();
        document.querySelectorAll('.view.mini-popup').forEach(view=>view.classList.remove('on','sliding'));
        isl.S.miniPopup = null;
        isl.S.ring = null;
        isl.S.focusLock = false;
        isl.S.expanded = false;
        isl.collapse();
        emit(cbs.addonAlert,{kind:'water',title:'WATER BEFORE U CRASH.',body:'1 glass (~200 ml) · every 45 min'});
        break;

      case 'stash':
        stopMusic();
        isl.S.focusLock = true;
        isl.go('stash');
        break;

      case 'dashboard':
        stopMusic();
        isl.S.focusLock = true;
        isl.go('home');
        break;

      case 'ai-work':
        stopMusic();
        isl.collapse();
        emit(cbs.fgApp, { app: 'codex', title: 'Grump', isGame: false });
        emit(cbs.codex, { active: true, status: 'Reading', detail: 'Read app-sidebar.tsx · 237 lines' });
        break;

      case 'headphones':
        stopMusic();
        isl.collapse();
        emit(cbs.testHeadset, "Azka's AirPods Pro");
        break;

      case 'charging':
        stopMusic();
        isl.collapse();
        emit(cbs.testCharge, 'charging');
        break;
    }
  }
  window.__grumpDemoControl = applyDemoMessage;
  window.addEventListener('message', (ev) => {
    if(ev.source!==window.parent||ev.origin!==window.location.origin)return;
    applyDemoMessage(ev.data);
  });
})();
