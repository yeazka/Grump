'use strict';
// Add-on live features of the notch: privacy dots, call (meeting) notices, file-copy progress and calendar reminders.
// The data comes from the native helper and main process; this file only decides what to show.
(() => {
  const bridge = window.dynIsland;
  if (!bridge) return;
  const dots = document.getElementById('live-dots');
  const bar = document.getElementById('live-progress');
  const on = (key) => !(S.settings && S.settings[key] === false);
  const id = () => typeof isId === 'function' && isId();

  /* ---- privacy dots + meeting ---- */
  let privacy = null, meetingSince = 0, lastMuted = null;
  const KINDS = [['mic', 'Microphone', 'Mikrofon'], ['camera', 'Camera', 'Kamera'], ['screen', 'Screen capture', 'Perekaman layar']];
  function paintDots() {
    if (!dots) return;
    const show = on('privacyDots') && privacy;
    const parts = [];
    if (show) {
      for (const [kind, en, idText] of KINDS) {
        const apps = privacy[kind] || [];
        if (!apps.length) continue;
        const muted = kind === 'mic' && privacy.micMuted;
        parts.push(`<i class="live-dot ${kind}${muted ? ' muted' : ''}" title="${(id() ? idText : en)}: ${apps.map(esc).join(', ')}${muted ? (id() ? ' (dibisukan)' : ' (muted)') : ''}"></i>`);
      }
    }
    const html = parts.join('');
    if (dots.innerHTML !== html) dots.innerHTML = html;
    dots.dataset.on = html ? '1' : '0';
  }
  const minutes = (ms) => Math.max(1, Math.round(ms / 60000));
  bridge.onPrivacyState?.((state) => {
    const previous = privacy;
    privacy = state && typeof state === 'object' ? state : null;
    paintDots();
    if (!privacy || !on('meetingMode') || S.settings.quiet) return;
    const wasMeeting = !!previous?.meeting;
    if (privacy.meeting && !wasMeeting) {
      meetingSince = Date.now(); lastMuted = privacy.micMuted;
      notice('bell', id() ? `Rapat dimulai · ${privacy.meetingApp}` : `In a call · ${privacy.meetingApp}`, 3000);
    } else if (!privacy.meeting && wasMeeting) {
      const took = minutes(Date.now() - meetingSince);
      notice('bell', id() ? `Rapat selesai · ${took} mnt` : `Call ended · ${took} min`, 3000);
      lastMuted = null;
    } else if (privacy.meeting && lastMuted !== null && privacy.micMuted !== lastMuted) {
      lastMuted = privacy.micMuted;
      notice('bell', privacy.micMuted ? (id() ? 'Mikrofon dibisukan' : 'Microphone muted') : (id() ? 'Mikrofon menyala' : 'Microphone on'), 1800);
    }
  });

  /* ---- file copy progress ---- */
  let copying = false, copyStarted = 0;
  bridge.onCopyProgress?.((state) => {
    if (!bar) return;
    const active = !!state?.active && on('liveActivities');
    bar.style.transform = `scaleX(${Math.max(0, Math.min(1, (Number(state?.percent) || 0) / 100))})`;
    bar.dataset.on = active ? '1' : '0';
    if (active && !copying) { copying = true; copyStarted = Date.now(); }
    else if (!active && copying) {
      copying = false;
      if (on('liveActivities') && !S.settings.quiet && Date.now() - copyStarted > 3000) notice('bell', id() ? 'Penyalinan selesai' : 'Copy finished', 2200);
    }
  });

  /* ---- calendar reminders ---- */
  let events = [];
  const told = new Set();
  bridge.onCalendarEvents?.((list) => { events = Array.isArray(list) ? list.filter((e) => e && Number.isFinite(e.start)) : []; });
  setInterval(() => {
    if (!events.length || !on('calendarNotices') || S.settings.quiet) return;
    const now = Date.now();
    for (const event of events) {
      const mins = (event.start - now) / 60000;
      const key = event.start + '|' + event.title;
      let stage = -1;
      if (mins <= 0 && mins > -1) stage = 0; else if (mins <= 1 && mins > 0) stage = 1; else if (mins <= 10 && mins > 1) stage = 10;
      if (stage < 0 || told.has(key + '|' + stage)) continue;
      for (const s of [10, 1, 0]) if (s >= stage) told.add(key + '|' + s);
      const title = event.title.length > 34 ? event.title.slice(0, 33) + '…' : event.title;
      notice('bell', stage === 0 ? (id() ? `${title} · sekarang` : `${title} · now`) : (id() ? `${title} · ${Math.max(1, Math.round(mins))} mnt lagi` : `${title} · in ${Math.max(1, Math.round(mins))} min`), 5000);
      break;
    }
    if (told.size > 400) told.clear();
  }, 15000);
})();
