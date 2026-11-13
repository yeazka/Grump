'use strict';
/* Movie Nerd Music: a song from a film gets that film's look on the music page, the lyrics page and the compact lyric row.
   Frozen has snow and ice crystals, Moana bubbles, Encanto butterflies, Tangled floating lanterns, The Lion King embers, Star Wars and
   La La Land stars, Harry Potter golden sparks. The beam and the background keep following the album cover; this only adds on top, and
   the text stays white with a faint tinted glow (renderer/movie.css). A film is one row in THEMES, so more can follow.
   movieThemeOf(media) is pure (it only reads the track's title, artist and album) and is covered by tests/movie-music.test.cjs. */
(() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = (list) => new RegExp('\\b(' + list.join('|') + ')\\b');

  // unique: songs that belong to the film whoever plays them. shared: songs that other artists also have, so the artist (cast) or the
  // film's name somewhere in the track information must back them up. film: the name as it appears in a soundtrack album or a "(From ...)" title.
  const THEMES = [
    { id: 'frozen', name: 'Frozen', style: 'snow', film: 'frozen( ii| 2)?',
      unique: ['do you want to build a snowman', 'for the first time in forever', 'love is an open door', 'frozen heart', 'show yourself', 'all is found', 'some things never change', 'fixer upper', 'reindeers? are better than people', 'reindeer s are better than people', 'the next right thing', 'when i am older', 'vuelie'],
      shared: ['let it go', 'into the unknown', 'lost in the woods', 'in summer', 'we know better', 'ring in the season'],
      cast: ['idina menzel', 'kristen bell', 'demi lovato', 'jonathan groff', 'santino fontana', 'josh gad', 'evan rachel wood', 'aurora', 'cassidy ladden', 'agatha lee monn', 'katie lopez', 'robert lopez', 'kristen anderson lopez', 'christophe beck', 'disney'] },
    { id: 'moana', name: 'Moana', style: 'bubbles', film: 'moana( 2)?',
      unique: ['how far i ll go', 'we know the way', 'where you are', 'know who you are', 'an innocent warrior', 'logo te pate', 'i am moana song of the ancestors'],
      shared: ['you re welcome', 'shiny', 'tulou tagaloa', 'beyond'],
      cast: ['auli i cravalho', 'dwayne johnson', 'lin manuel miranda', 'opetaia foa i', 'jemaine clement', 'mark mancina', 'te vaka', 'rachel house', 'temuera morrison', 'disney'] },
    { id: 'encanto', name: 'Encanto', style: 'butterflies', film: 'encanto',
      unique: ['we don t talk about bruno', 'surface pressure', 'dos oruguitas', 'the family madrigal', 'what else can i do', 'waiting on a miracle', 'colombia mi encanto'],
      shared: ['all of you'],
      cast: ['stephanie beatriz', 'carolina gaitan', 'mauro castillo', 'adassa', 'diane guerrero', 'jessica darrow', 'sebastian yatra', 'rhenzy feliz', 'lin manuel miranda', 'disney'] },
    { id: 'tangled', name: 'Tangled', style: 'lanterns', film: 'tangled',
      unique: ['when will my life begin', 'mother knows best', 'i ve got a dream', 'healing incantation', 'flynn flies', 'kingdom dance', 'something that i want'],
      shared: ['i see the light'],
      cast: ['mandy moore', 'zachary levi', 'donna murphy', 'alan menken', 'disney'] },
    { id: 'lionking', name: 'The Lion King', style: 'embers', film: 'the lion king',
      unique: ['circle of life', 'hakuna matata', 'i just can t wait to be king', 'can you feel the love tonight', 'they live in you', 'remember who you are'],
      shared: ['be prepared', 'he lives in you', 'spirit'],
      cast: ['elton john', 'tim rice', 'lebo m', 'hans zimmer', 'beyonce', 'donald glover', 'carmen twillie', 'jason weaver', 'nathan lane', 'disney'] },
    { id: 'starwars', name: 'Star Wars', style: 'stars', film: 'star wars', any: 'star wars',
      unique: ['the imperial march', 'duel of the fates', 'binary sunset', 'cantina band', 'princess leia s theme', 'yoda s theme', 'rey s theme', 'the throne room', 'across the stars', 'the force theme'],
      shared: ['main title', 'victory celebration'],
      cast: ['john williams', 'london symphony orchestra', 'disney'] },
    { id: 'harrypotter', name: 'Harry Potter', style: 'sparks', film: 'harry potter', any: 'harry potter',
      unique: ['hedwig s theme', 'leaving hogwarts', 'harry s wondrous world', 'double trouble', 'obliviate', 'a window to the past', 'fawkes the phoenix'],
      shared: ['hogwarts hymn'],
      cast: ['john williams', 'patrick doyle', 'nicholas hooper', 'alexandre desplat', 'london symphony orchestra'] },
    { id: 'lalaland', name: 'La La Land', style: 'stars', film: 'la la land',
      unique: ['another day of sun', 'mia sebastian s theme', 'someone in the crowd', 'the fools who dream'],
      shared: ['city of stars', 'a lovely night', 'audition', 'start a fire'],
      cast: ['ryan gosling', 'emma stone', 'justin hurwitz', 'john legend', 'rosemarie dewitt'] },
  ];
  for (const t of THEMES) {
    t.reAlbum = new RegExp('^' + t.film + '( |$)');
    t.reFrom = new RegExp('\\bfrom (the )?(disney )?(movie |film |animated |original motion picture )?(' + t.film + ')\\b');
    t.reFilm = new RegExp('\\b' + t.film + '\\b');
    t.reAny = t.any ? new RegExp('\\b' + t.any + '\\b') : null;
    t.reUnique = words(t.unique); t.reShared = words(t.shared); t.reCast = words(t.cast);
  }

  function movieThemeOf(media) {
    if (!media) return null;
    const title = norm(media.title), artist = norm(media.artist), album = norm(media.album);
    if (!title) return null;
    for (const t of THEMES) {
      if (t.reAlbum.test(album) || t.reFrom.test(title) || (t.reAny && (t.reAny.test(album) || t.reAny.test(title)))) return { id: t.id, name: t.name, style: t.style };
      if (t.reUnique.test(title)) return { id: t.id, name: t.name, style: t.style };
      if (t.reShared.test(title) && (t.reCast.test(artist) || t.reCast.test(album) || t.reFilm.test(`${title} ${artist} ${album}`))) return { id: t.id, name: t.name, style: t.style };
    }
    return null;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { movieThemeOf, THEMES };
  if (typeof document === 'undefined') return;
  window.movieThemeOf = movieThemeOf;

  /* ---------- the effects ---------- */
  const HOSTS = { music: '#v-music', compact: '#v-compact', lyrics: '#v-lyrics' };
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const fx = { theme: null, canvas: null, ctx: null, host: null, w: 0, h: 0, dpr: 1, items: [], glints: [], raf: 0, last: 0, ro: null, nextShoot: 0 };
  const GLINT_RGB = { snow: '240,249,255', bubbles: '225,252,250', butterflies: '255,244,200', lanterns: '255,240,200', embers: '255,232,196', stars: '236,242,255', sparks: '255,244,210' };
  const BUTTERFLY = ['255,214,92', '255,160,96', '244,128,190', '126,222,204'];

  // Each style makes its particles for a given size and moves and draws one particle per frame. Every y grows downwards.
  const STYLES = {
    snow: {
      seed(w, h) {
        const a = w * h;
        return [
          ...Array.from({ length: clamp(Math.round(a / 5200), 6, 34) }, () => ({ k: 'flake', x: rnd(0, w), y: rnd(0, h), r: rnd(0.7, 2.3), v: rnd(7, 22), sway: rnd(4, 14), ph: rnd(0, 6.28), a: rnd(0.35, 0.9) })),
          ...Array.from({ length: clamp(Math.round(a / 26000), 1, 5) }, () => ({ k: 'crystal', x: rnd(0, w), y: rnd(0, h), s: rnd(4.5, 8.5), rot: rnd(0, 6.28), spin: rnd(-0.5, 0.5), v: rnd(4, 9), ph: rnd(0, 6.28), a: rnd(0.3, 0.6) })),
        ];
      },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.y += p.v * dt; if (p.y > h + 10) { p.y = -10; p.x = rnd(0, w); } if (p.k === 'crystal') p.rot += p.spin * dt; }
        if (p.k === 'flake') {
          const x = p.x + Math.sin(p.ph + t * 0.7) * p.sway * 0.35;
          if (p.r > 1.5) { ctx.fillStyle = `rgba(214,236,255,${(p.a * 0.16).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, p.y, p.r * 2.4, 0, TAU); ctx.fill(); }
          ctx.fillStyle = `rgba(246,251,255,${p.a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill();
          return;
        }
        ctx.save(); ctx.translate(p.x + Math.sin(p.ph + t * 0.35) * 6, p.y); ctx.rotate(p.rot);
        ctx.strokeStyle = `rgba(222,241,255,${p.a})`; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
          ctx.moveTo(0, 0); ctx.lineTo(ca * p.s, sa * p.s);
          const bx = ca * p.s * 0.58, by = sa * p.s * 0.58;
          for (const d of [-0.9, 0.9]) { ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + d) * p.s * 0.34, by + Math.sin(a + d) * p.s * 0.34); }
        }
        ctx.stroke(); ctx.restore();
      },
    },
    bubbles: {
      seed(w, h) { return Array.from({ length: clamp(Math.round(w * h / 6500), 5, 26) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(1.6, 6.2), v: rnd(10, 26), ph: rnd(0, 6.28), wob: rnd(2, 7), a: rnd(0.45, 0.9) })); },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.y -= p.v * dt; if (p.y < -10) { p.y = h + 8; p.x = rnd(0, w); } }
        const x = p.x + Math.sin(p.ph + t * 1.1) * p.wob;
        ctx.fillStyle = `rgba(170,238,236,${(p.a * 0.1).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(206,250,248,${(p.a * 0.6).toFixed(3)})`; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${(p.a * 0.8).toFixed(3)})`; ctx.beginPath(); ctx.arc(x - p.r * 0.35, p.y - p.r * 0.35, Math.max(0.5, p.r * 0.2), 0, TAU); ctx.fill();
      },
    },
    butterflies: {
      seed(w, h) { return Array.from({ length: clamp(Math.round(w * h / 22000), 2, 8) }, () => ({ x: rnd(0, w), y: rnd(0, h), s: rnd(3.2, 5.6), vx: rnd(8, 18) * (Math.random() < 0.5 ? -1 : 1), vy: rnd(-5, 3), ph: rnd(0, 6.28), flap: rnd(9, 14), col: BUTTERFLY[Math.floor(Math.random() * BUTTERFLY.length)], a: rnd(0.65, 0.95) })); },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.x += p.vx * dt; p.y += (p.vy + Math.sin(p.ph + t * 1.6) * 9) * dt; if (p.x < -12) p.x = w + 10; if (p.x > w + 12) p.x = -10; if (p.y < -10) p.y = h + 6; if (p.y > h + 10) p.y = -6; }
        const open = Math.abs(Math.cos(p.ph + t * p.flap)), dir = p.vx < 0 ? -1 : 1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
        ctx.fillStyle = `rgba(${p.col},${p.a})`;
        for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-p.s * 0.1, sy * p.s * 0.2, p.s * 0.55, p.s * 0.9 * (0.25 + open * 0.75), -0.4 * sy, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(60,30,20,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-p.s * 0.5, 0); ctx.lineTo(p.s * 0.5, 0); ctx.stroke();
        ctx.restore();
      },
    },
    lanterns: {
      seed(w, h) { return Array.from({ length: clamp(Math.round(w * h / 9000), 4, 16) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(2, 4.4), v: rnd(5, 13), ph: rnd(0, 6.28), sway: rnd(3, 9), fl: rnd(1.5, 3) })); },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.y -= p.v * dt; if (p.y < -12) { p.y = h + 10; p.x = rnd(0, w); } }
        const x = p.x + Math.sin(p.ph + t * 0.6) * p.sway, f = 0.8 + 0.2 * Math.sin(p.ph + t * p.fl);
        const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 3.2);
        g.addColorStop(0, `rgba(255,238,190,${(0.95 * f).toFixed(3)})`); g.addColorStop(0.35, `rgba(255,200,110,${(0.45 * f).toFixed(3)})`); g.addColorStop(1, 'rgba(255,180,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, p.y, p.r * 3.2, 0, TAU); ctx.fill();
      },
    },
    embers: {
      seed(w, h) { return Array.from({ length: clamp(Math.round(w * h / 5600), 6, 30) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.6, 1.7), v: rnd(12, 30), vx: rnd(-6, 8), ph: rnd(0, 6.28), fl: rnd(3, 8) })); },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.y -= p.v * dt; p.x += p.vx * dt; if (p.y < -6) { p.y = h + 6; p.x = rnd(0, w); } }
        const a = 0.45 + 0.5 * Math.abs(Math.sin(p.ph + t * p.fl));
        ctx.fillStyle = `rgba(255,222,160,${(a * 0.2).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.6, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,236,196,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      },
    },
    sparks: {
      seed(w, h) { return Array.from({ length: clamp(Math.round(w * h / 6200), 6, 26) }, () => ({ x: rnd(0, w), y: rnd(0, h), s: rnd(1.4, 3.4), v: rnd(8, 22), vx: rnd(-10, 10), ph: rnd(0, 6.28), tw: rnd(2, 6) })); },
      tick(ctx, p, dt, t, w, h) {
        if (dt) { p.y -= p.v * dt; p.x += (p.vx + Math.sin(p.ph + t * 1.3) * 10) * dt; if (p.y < -8) { p.y = h + 8; p.x = rnd(0, w); } }
        const a = 0.4 + 0.6 * Math.abs(Math.sin(p.ph + t * p.tw)), L = p.s * (0.7 + 0.5 * a);
        ctx.strokeStyle = `rgba(255,236,170,${a.toFixed(3)})`; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y); ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L); ctx.stroke();
        ctx.fillStyle = `rgba(255,250,225,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, TAU); ctx.fill();
      },
    },
    stars: {
      seed(w, h) { return [...Array.from({ length: clamp(Math.round(w * h / 3600), 8, 42) }, () => ({ k: 'star', x: rnd(0, w), y: rnd(0, h), r: rnd(0.45, 1.5), ph: rnd(0, 6.28), tw: rnd(0.8, 2.6) })), { k: 'shoot', life: 1.2, x: 0, y: 0, vx: 0, vy: 0 }]; },
      tick(ctx, p, dt, t, w, h) {
        if (p.k === 'star') { const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph + t * p.tw)); ctx.fillStyle = `rgba(236,242,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); return; }
        if (dt) {
          if (p.life >= 1) { if (t > fx.nextShoot) { p.life = 0; p.x = rnd(w * 0.2, w); p.y = rnd(0, h * 0.5); p.vx = -rnd(120, 190); p.vy = rnd(40, 80); fx.nextShoot = t + rnd(4, 8); } return; }
          p.life += dt / 0.7; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        if (p.life >= 1) return;
        const k = Math.sin(Math.PI * p.life), tail = 22;
        const g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx / Math.hypot(p.vx, p.vy) * tail, p.y - p.vy / Math.hypot(p.vx, p.vy) * tail);
        g.addColorStop(0, `rgba(255,255,255,${(0.9 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / Math.hypot(p.vx, p.vy) * tail, p.y - p.vy / Math.hypot(p.vx, p.vy) * tail); ctx.stroke();
      },
    },
  };

  function ensureCanvas() {
    if (fx.canvas) return;
    const c = document.createElement('canvas');
    c.className = 'movie-fx'; c.setAttribute('aria-hidden', 'true');
    fx.canvas = c; fx.ctx = c.getContext('2d');
  }
  const hostFor = () => { const sel = HOSTS[typeof curKey === 'string' ? curKey : '']; return sel ? document.querySelector(sel) : null; };
  const playing = () => (typeof isPlaying === 'function' ? isPlaying() : true);
  const styleOf = () => STYLES[(fx.theme && fx.theme.style) || 'snow'] || STYLES.snow;

  function seed() {
    fx.items = styleOf().seed(fx.w, fx.h);
    fx.glints = Array.from({ length: 4 }, (_, i) => ({ x: rnd(0, fx.w), y: rnd(0, fx.h), s: rnd(3, 6.5), life: i * 0.25 + rnd(0, 0.2), len: rnd(1.6, 3.2) }));
  }

  // The canvas is cut to the notch itself (its size and its rounded corners), not to the page, which can be larger than what is visible:
  // the transparent window around the notch must never show a particle.
  function resize() {
    if (!fx.host || !fx.canvas) return;
    const isl = document.getElementById('island');
    if (!isl) return;
    const w = isl.offsetWidth, h = isl.offsetHeight;
    if (!w || !h) return;
    const ir = isl.getBoundingClientRect(), hr = fx.host.getBoundingClientRect();
    const st = fx.canvas.style;
    st.left = (ir.left - hr.left).toFixed(1) + 'px'; st.top = (ir.top - hr.top).toFixed(1) + 'px';
    st.width = w + 'px'; st.height = h + 'px'; st.borderRadius = getComputedStyle(isl).borderRadius;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === fx.w && h === fx.h && dpr === fx.dpr) return;
    const grew = !fx.w || Math.abs(w * h - fx.w * fx.h) > fx.w * fx.h * 0.3;
    fx.w = w; fx.h = h; fx.dpr = dpr;
    fx.canvas.width = Math.round(w * dpr); fx.canvas.height = Math.round(h * dpr);
    if (grew || !fx.items.length) seed();
    draw(0);
  }

  function drawGlint(g, ctx, rgb) {
    const k = Math.sin(Math.PI * Math.min(1, Math.max(0, g.life))); const a = k * k;
    if (a < 0.02) return;
    const L = g.s * (0.5 + a * 0.7);
    ctx.save(); ctx.translate(g.x, g.y); ctx.strokeStyle = `rgba(${rgb},${(0.9 * a).toFixed(3)})`; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.moveTo(0, -L); ctx.lineTo(0, L);
    const d = L * 0.5; ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(-d, d); ctx.lineTo(d, -d); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${(0.95 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function draw(dt) {
    const ctx = fx.ctx; if (!ctx || !fx.w) return;
    ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
    ctx.clearRect(0, 0, fx.w, fx.h);
    const t = performance.now() / 1000, style = styleOf(), rgb = GLINT_RGB[(fx.theme && fx.theme.style) || 'snow'] || GLINT_RGB.snow;
    for (const p of fx.items) style.tick(ctx, p, dt, t, fx.w, fx.h);
    for (const g of fx.glints) {
      if (dt) { g.life += dt / g.len; if (g.life >= 1) { g.life = 0; g.x = rnd(0, fx.w); g.y = rnd(0, fx.h); g.s = rnd(3, 6.5); g.len = rnd(1.6, 3.2); } }
      drawGlint(g, ctx, rgb);
    }
  }

  function wanted() { return !!fx.theme && !document.hidden && !!hostFor() && !(typeof S !== 'undefined' && S.settings && S.settings.quiet); }
  function frame(ts) {
    fx.raf = 0;
    if (!wanted() || !playing() || reduced()) { fx.last = 0; return; }
    const dt = Math.min(0.05, fx.last ? (ts - fx.last) / 1000 : 0.016);
    if (!fx.last || ts - fx.last >= 30) { fx.last = ts; draw(dt); }   // about 30 frames a second is plenty for slow particles
    fx.raf = requestAnimationFrame(frame);
  }

  function detach() {
    if (fx.raf) { cancelAnimationFrame(fx.raf); fx.raf = 0; }
    fx.last = 0;
    if (fx.ro) { fx.ro.disconnect(); fx.ro = null; }
    if (fx.canvas && fx.canvas.parentNode) fx.canvas.parentNode.removeChild(fx.canvas);
    fx.host = null; fx.w = fx.h = 0;
  }

  // Put the canvas in the page that is on screen, and run or stop the effect. Called when the song, the page or the play state changes.
  function sync() {
    if (!wanted()) { if (fx.host) detach(); return; }
    ensureCanvas();
    const host = hostFor();
    if (host !== fx.host) {
      detach(); fx.host = host; host.appendChild(fx.canvas);
      if (window.ResizeObserver) { fx.ro = new ResizeObserver(() => resize()); fx.ro.observe(host); const isl = document.getElementById('island'); if (isl) fx.ro.observe(isl); }
      fx.w = fx.h = 0; resize();
    }
    if (!fx.raf && playing() && !reduced()) fx.raf = requestAnimationFrame(frame);
  }

  // The song changed to (or away from) a film song: a quick burst of glints is the "freeze".
  function setTheme(theme) {
    const was = fx.theme && fx.theme.id;
    fx.theme = theme || null;
    const island = document.getElementById('island');
    if (!fx.theme) { island?.removeAttribute('data-movie'); detach(); return; }
    island?.setAttribute('data-movie', fx.theme.id);
    if (fx.theme.id !== was) { if (fx.w) seed(); fx.glints.forEach((g, i) => { g.life = -i * 0.12; }); }
    sync();
  }

  window.movieFx = { setTheme, sync };
  document.addEventListener('visibilitychange', sync);
  const islandEl = document.getElementById('island');
  if (islandEl) new MutationObserver(sync).observe(islandEl, { attributes: true, attributeFilter: ['data-key'] });
  setInterval(sync, 1500);   // a safety net for play/pause changes that arrive without a page change
})();
